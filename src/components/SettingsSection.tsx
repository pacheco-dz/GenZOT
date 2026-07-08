/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Animal, Species, Sex } from '../types';
import { Sliders, Save, Database, History, RefreshCw, CheckCircle, AlertTriangle, FileUp, Download, FileSpreadsheet, Upload, HelpCircle, Target } from 'lucide-react';
import * as XLSX from 'xlsx';

interface SettingsSectionProps {
  animals: Animal[];
  onRestoreAnimals: (animals: Animal[]) => void;
  onResetAllData: () => void;
}

export default function SettingsSection({ animals, onRestoreAnimals, onResetAllData }: SettingsSectionProps) {
  // Backup configurations
  const [backupFrequency, setBackupFrequency] = useState<string>(() => {
    return localStorage.getItem('geno_backup_freq') || '1'; // defaults to 1 day
  });

  const [cullingPercent, setCullingPercent] = useState<number>(() => {
    return Number(localStorage.getItem('geno_culling_percent')) || 20;
  });

  const [lastBackupTime, setLastBackupTime] = useState<string>(() => {
    return localStorage.getItem('geno_last_backup_time') || 'Ainda não realizado';
  });

  const [backupLog, setBackupLog] = useState<Array<{ id: string; timestamp: string; count: number; type: 'auto' | 'manual' }>>(() => {
    try {
      const stored = localStorage.getItem('geno_backup_log');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [sucessMsg, setSucessMsg] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('geno_backup_freq', backupFrequency);
  }, [backupFrequency]);

  useEffect(() => {
    localStorage.setItem('geno_culling_percent', String(cullingPercent));
  }, [cullingPercent]);

  // Handle Manual/Triggered Backup
  const runBackupProcess = (type: 'auto' | 'manual') => {
    try {
      const backupData = {
        app: 'GenZOT',
        version: '3.0',
        timestamp: new Date().toISOString(),
        animalsCount: animals.length,
        data: animals
      };

      // 1. Download json file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `genzot_backup_${type}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 2. Save snapshot log in state/localStorage
      const nowStr = new Date().toLocaleString('pt-BR');
      const newLogItem = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: nowStr,
        count: animals.length,
        type
      };

      const updatedLogs = [newLogItem, ...backupLog].slice(0, 10); // Keep last 10 logs
      setBackupLog(updatedLogs);
      localStorage.setItem('geno_backup_log', JSON.stringify(updatedLogs));

      setLastBackupTime(nowStr);
      localStorage.setItem('geno_last_backup_time', nowStr);

      setSucessMsg(`Backup ${type === 'manual' ? 'manual' : 'automático'} gerado e baixado com sucesso!`);
      setTimeout(() => setSucessMsg(null), 5000);
    } catch (err: any) {
      alert('Falha ao gerar arquivo de backup: ' + err?.message);
    }
  };

  // Restores DB from a JSON backup file
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if ((parsed.app !== 'GeneCorte' && parsed.app !== 'GenZOT' && parsed.app !== 'GenZOT') || !Array.isArray(parsed.data)) {
          alert('Arquivo inválido: o cabeçalho não coincide com um backup legítimo do GenZOT / GenZOT / GeneCorte.');
          return;
        }

        if (window.confirm(`Você está prestes a restaurar ${parsed.data.length} registros de animais. Isso substituirá os registros atuais do rebanho. Deseja prosseguir?`)) {
          onRestoreAnimals(parsed.data);
          
          const nowStr = new Date().toLocaleString('pt-BR');
          setLastBackupTime(nowStr);
          localStorage.setItem('geno_last_backup_time', nowStr);
          
          alert('Banco de dados restaurado com sucesso!');
        }
      } catch (err: any) {
        alert('Falha ao parsear arquivo JSON de backup: ' + err?.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper method to download a beautifully constructed reference Excel template
  const handleDownloadTemplateXlsx = () => {
    const headers = [
      'ID', 'Nome', 'Especie', 'Sexo', 'Data_Nascimento', 'Rebanho', 
      'Manejo', 'ID_Pai', 'ID_Mae', 'Raca1', 'Pct1', 'Raca2', 'Pct2', 'Raca3', 'Pct3',
      'Peso_Nascimento', 'Peso_Desmame', 'Peso_Sobreano', 'Perimetro_Escrotal',
      'Area_Olho_Lombo', 'Espessura_Gordura_Subcutanea', 'Score_C_E', 'Score_P_P', 'Score_M_M'
    ];

    const sampleData = [
      {
        'ID': 'BOV-E01',
        'Nome': 'GenoTouro Alfa',
        'Especie': 'bovino',
        'Sexo': 'M',
        'Data_Nascimento': '2024-02-10',
        'Rebanho': 'Fazenda_Pampa',
        'Manejo': 'Pasto',
        'ID_Pai': 'BOV-F01',
        'ID_Mae': 'BOV-M01',
        'Raca1': 'Nelore',
        'Pct1': 100,
        'Raca2': '',
        'Pct2': 0,
        'Raca3': '',
        'Pct3': 0,
        'Peso_Nascimento': 32.5,
        'Peso_Desmame': 210,
        'Peso_Sobreano': 380,
        'Perimetro_Escrotal': 34,
        'Area_Olho_Lombo': 75.2,
        'Espessura_Gordura_Subcutanea': 4.5,
        'Score_C_E': 4,
        'Score_P_P': 4,
        'Score_M_M': 3
      },
      {
        'ID': 'BOV-E02',
        'Nome': 'GenoNovilha Beta',
        'Especie': 'bovino',
        'Sexo': 'F',
        'Data_Nascimento': '2024-03-15',
        'Rebanho': 'Fazenda_Pampa',
        'Manejo': 'Pasto',
        'ID_Pai': 'BOV-F02',
        'ID_Mae': 'BOV-M02',
        'Raca1': 'Angus',
        'Pct1': 100,
        'Raca2': '',
        'Pct2': 0,
        'Raca3': '',
        'Pct3': 0,
        'Peso_Nascimento': 30.2,
        'Peso_Desmame': 195.5,
        'Peso_Sobreano': 340.0,
        'Perimetro_Escrotal': '',
        'Area_Olho_Lombo': 68.5,
        'Espessura_Gordura_Subcutanea': 5.2,
        'Score_C_E': 3,
        'Score_P_P': 4,
        'Score_M_M': 4
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Plantel');
    XLSX.writeFile(workbook, 'genzot_template_referencia.xlsx');
  };

  // Helper method to upload and parse Excel (.xlsx) data to restore/merge animal database
  const handleUploadXlsx = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        if (rows.length === 0) {
          alert('Nenhum dado encontrado na planilha.');
          return;
        }

        let importedCount = 0;
        let errorMessages: string[] = [];
        const parsedAnimalsList: Animal[] = [];

        rows.forEach((row: any, idx: number) => {
          const rowNum = idx + 2;
          const rawId = row['ID'] || row['id'];
          if (!rawId) {
            errorMessages.push(`Linha ${rowNum}: ID ausente.`);
            return;
          }

          const cleanId = String(rawId).trim().toUpperCase();

          const name = String(row['Nome'] || row['nome'] || `Animal ${cleanId}`).trim();
          const species = 'bovino';

          const sex = String(row['Sexo'] || row['sexo'] || 'M').toUpperCase().trim();
          if (sex !== 'M' && sex !== 'F') {
            errorMessages.push(`Linha ${rowNum}: Sexo inválido ('${sex}'). Deve ser 'M' ou 'F'.`);
            return;
          }

          const birthDate = String(row['Data_Nascimento'] || row['data_nascimento'] || '2024-01-01').trim();
          const birthYear = parseInt(birthDate.substring(0, 4)) || 2024;

          const rebanho = String(row['Rebanho'] || row['rebanho'] || 'Fazenda_Pampa').trim();
          const manejo = String(row['Manejo'] || row['manejo'] || 'Pasto').trim();

          const sireId = row['ID_Pai'] || row['id_pai'] ? String(row['ID_Pai'] || row['id_pai']).trim().toUpperCase() : null;
          const damId = row['ID_Mae'] || row['id_mae'] ? String(row['ID_Mae'] || row['id_mae']).trim().toUpperCase() : null;

          // Extract breed composition
          const breedComp: Record<string, number> = {};
          const raca1 = String(row['Raca1'] || row['raca1'] || '').trim();
          const pct1 = parseFloat(row['Pct1'] || row['pct1']) || 100;
          const raca2 = String(row['Raca2'] || row['raca2'] || '').trim();
          const pct2 = parseFloat(row['Pct2'] || row['pct2']) || 0;
          const raca3 = String(row['Raca3'] || row['raca3'] || '').trim();
          const pct3 = parseFloat(row['Pct3'] || row['pct3']) || 0;

          const b1 = raca1;
          const b2 = raca2;
          const b3 = raca3;
          let p1 = pct1;
          let p2 = b2 ? pct2 : 0;
          let p3 = b3 ? pct3 : 0;

          if (b1) {
            const totalPct = p1 + p2 + p3;
            if (totalPct > 0) {
              breedComp[b1] = p1 / totalPct;
              if (b2 && p2 > 0) breedComp[b2] = p2 / totalPct;
              if (b3 && p3 > 0) breedComp[b3] = p3 / totalPct;
            } else {
              breedComp[b1] = 1.0;
            }
          } else {
            breedComp['Nelore'] = 1.0;
          }

          // Parse phenotypes
          const phenotypes: any = {
            scores: {
              score1: parseInt(row['Score_C_E'] || row['score_c_e']) || 3,
              score2: parseInt(row['Score_P_P'] || row['score_p_p']) || 3,
              score3: parseInt(row['Score_M_M'] || row['score_m_m']) || 3
            }
          };

          const pn = row['Peso_Nascimento'] || row['peso_nascimento'];
          const pd = row['Peso_Desmame'] || row['peso_desmame'];
          const ps = row['Peso_Sobreano'] || row['peso_sobreano'];
          const pe = row['Perimetro_Escrotal'] || row['perimetro_escrotal'];
          const aol = row['Area_Olho_Lombo'] || row['area_olho_lombo'];
          const egs = row['Espessura_Gordura_Subcutanea'] || row['espessura_gordura_subcutanea'];

          // Fix the field properties to ensure compatibility with both short keys and proper zootenical model-matched keys
          if (pn !== undefined && pn !== '') {
            phenotypes.pn = parseFloat(pn);
            phenotypes.pesoNascimento = parseFloat(pn);
          }
          if (pd !== undefined && pd !== '') {
            phenotypes.pd = parseFloat(pd);
            phenotypes.pesoDesmame = parseFloat(pd);
          }
          if (ps !== undefined && ps !== '') {
            phenotypes.ps = parseFloat(ps);
            phenotypes.pesoSobreano = parseFloat(ps);
          }
          if (pe !== undefined && pe !== '') {
            phenotypes.pe = parseFloat(pe);
          }
          if (aol !== undefined && aol !== '') {
            phenotypes.aol = parseFloat(aol);
          }
          if (egs !== undefined && egs !== '') {
            phenotypes.egs = parseFloat(egs);
          }

          const car = row['CAR'] || row['car'];
          const temperamento = row['Temperamento'] || row['temperamento'];
          const resistencia = row['Resistencia_Carrapato'] || row['resistencia_carrapato'];
          const stayability = row['Stayability'] || row['stayability'];

          if (car !== undefined && car !== '') {
            phenotypes.car = parseFloat(car);
          }
          if (temperamento !== undefined && temperamento !== '') {
            phenotypes.temperamento = parseInt(temperamento);
          }
          if (resistencia !== undefined && resistencia !== '') {
            phenotypes.resistenciaCarrapato = parseInt(resistencia);
          }
          if (stayability !== undefined && stayability !== '') {
            phenotypes.stayability = parseFloat(stayability);
          }

          // Add species-specific CPM/EPMUR scores for the UI display
          phenotypes.epmur_E = phenotypes.scores.score1;
          phenotypes.epmur_P = phenotypes.scores.score2;
          phenotypes.epmur_M = phenotypes.scores.score3;
          phenotypes.epmur_U = 3;
          phenotypes.epmur_R = 4;

          // Compute daily average gain (GMD) if possible
          if (phenotypes.pesoSobreano && phenotypes.pesoDesmame) {
            phenotypes.gmd = Math.round(((phenotypes.pesoSobreano - phenotypes.pesoDesmame) / 160) * 1000);
          }

          parsedAnimalsList.push({
            id: cleanId,
            name,
            species: species as Species,
            sex: sex as Sex,
            birthDate,
            birthYear,
            sireId,
            damId,
            breedComp,
            rebanho,
            manejo,
            phenotypes
          });
          importedCount++;
        });

        if (errorMessages.length > 0) {
          alert(`Erros ocorridos no processamento da planilha:\n\n` + errorMessages.slice(0, 10).join('\n'));
          return;
        }

        if (parsedAnimalsList.length === 0) {
          alert('Nenhum animal válido foi importado de sua planilha.');
          return;
        }

        const mergeChoice = window.confirm(
          `Foram lidos com sucesso ${parsedAnimalsList.length} animais da sua planilha Excel.\n\n` +
          `Deseja SUBSTITUIR o plantel atual de animais por esses dados?\n\n` +
          `• Clique em "OK" para SUBSTITUIR todos os seus animais atuais.\n` +
          `• Clique em "Cancelar" para MESCLAR com os animais atuais (mantendo dados antigos e atualizando/adicionando novos).`
        );

        let finalHerdList: Animal[] = [];
        if (mergeChoice) {
          finalHerdList = parsedAnimalsList;
        } else {
          const currentMap = new Map<string, Animal>();
          animals.forEach(a => currentMap.set(a.id, a));
          parsedAnimalsList.forEach(a => currentMap.set(a.id, a));
          finalHerdList = Array.from(currentMap.values());
        }

        onRestoreAnimals(finalHerdList);

        const nowStr = new Date().toLocaleString('pt-BR');
        setLastBackupTime(nowStr);
        localStorage.setItem('geno_last_backup_time', nowStr);
        setSucessMsg(`Banco de dados importado de planilha Excel com sucesso! Plantel atual: ${finalHerdList.length} animais.`);

      } catch (err: any) {
        alert('Erro ao processar arquivo Excel (.xlsx): ' + err?.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6" id="settings-panel">
      
      {/* Title & Headline */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-600" />
          Configurações do Sistema & Backup
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Gerencie as diretrizes de integridade de dados, agendamento de backups automáticos e manutenção preventiva do rebanho.
        </p>
      </div>

      {sucessMsg && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold animate-fade-in shadow-xs">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{sucessMsg}</span>
        </div>
      )}

      {/* Grid of config sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Automatic Backup Rules */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
          <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-500" />
            Configuração de Backup Automático
          </h3>
          <p className="text-xs text-slate-500 leading-normal">
            Escolha a frequência ideal para que o GenZOT execute a verificação cron ou salvamento de segurança. O backup será baixado como arquivo estruturado em formato JSON de forma transparente.
          </p>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">Frequência Programada:</label>
            <select
              value={backupFrequency}
              onChange={(e) => setBackupFrequency(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-md p-2 bg-white focus:outline-indigo-500 text-slate-800"
            >
              <option value="off">Desativado (Sem backup agendado)</option>
              <option value="1">A cada 1 dia (Altamente recomendado)</option>
              <option value="2">A cada 2 dias</option>
              <option value="3">A cada 3 dias</option>
              <option value="5">A cada 5 dias</option>
              <option value="7">A cada 7 dias (Semanal)</option>
              <option value="15">A cada 15 dias (Quinzenal)</option>
            </select>
            
            {backupFrequency !== 'off' && (
              <p className="text-[11px] text-emerald-600 font-medium leading-tight">
                * O sistema verificará se decorreram {backupFrequency} {backupFrequency === '1' ? 'dia' : 'dias'} desde o último backup ao iniciar.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => runBackupProcess('manual')}
              className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Executar Backup Manual (.json)
            </button>

            <label className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition shadow-xs cursor-pointer text-center">
              <FileUp className="w-3.5 h-3.5" />
              <span>Restaurar de arquivo .json</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </label>
          </div>

          <div className="bg-white/70 p-3 rounded-lg border border-slate-200/50 text-[11px] font-mono text-slate-600 leading-normal">
            <div><span className="font-bold text-slate-800">Último backup:</span> {lastBackupTime}</div>
            <div className="mt-1"><span className="font-bold text-slate-800">Total atual:</span> {animals.length} animais registrados no rebanho</div>
          </div>
        </div>

        {/* History Log Panel */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
          <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
            <History className="w-4 h-4 text-emerald-500" />
            Histórico Recente de Salvamento
          </h3>
          <p className="text-xs text-slate-500 leading-normal">
            Histórico das últimas operações de exportação e integridade executadas neste navegador.
          </p>

          <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
            {backupLog.map((log) => (
              <div key={log.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[10px] text-slate-400">ID: #{log.id}</span>
                  <span className="font-bold text-slate-850">{log.timestamp}</span>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${log.type === 'manual' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {log.type === 'manual' ? 'MANUAL' : 'AUTO-PROGRAMADO'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{log.count} Animais</span>
                </div>
              </div>
            ))}

            {backupLog.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                Nenhum backup registrado no histórico deste navegador.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200/60">
            <button
              onClick={onResetAllData}
              className="w-full flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-500 animate-spin" />
              Limpar Rebanho & Redefinir para Padrão de Fábrica
            </button>
          </div>
        </div>

        {/* Configuração de Ações e Ordens de Manejo em Lote */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4 lg:col-span-2" id="culling-rules-config">
          <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
            <Target className="w-4 h-4 text-rose-500" />
            Parâmetros de Descarte & Ordens de Manejo em Lote
          </h3>
          <p className="text-xs text-slate-500 leading-normal">
            Ajuste a intensidade de seleção para a apartação e descarte no curral. Os animais classificados no percentil inferior (Bottom %) serão direcionados automaticamente para as planilhas de manejo prático de campo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Seletor do Limiar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  Limite de Descarte Técnico (Bottom %)
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal mb-2">
                  Selecione a porcentagem do rebanho de menor índice zootécnico que deseja separar para descarte estratégico ou abate comercial.
                </p>
              </div>
              <div className="space-y-2">
                <select
                  value={cullingPercent}
                  onChange={(e) => setCullingPercent(Number(e.target.value))}
                  className="w-full text-xs font-bold border border-slate-200 rounded-md p-2 bg-slate-50 focus:outline-rose-500 text-rose-700 cursor-pointer"
                >
                  <option value={5}>Bottom 5% (Descarte ultra-seletivo)</option>
                  <option value={10}>Bottom 10% (Descarte rigoroso)</option>
                  <option value={15}>Bottom 15% (Recomendado para plantéis medianos)</option>
                  <option value={20}>Bottom 20% (Padrão Comercial recomendado)</option>
                  <option value={25}>Bottom 25% (Aceleração genética agressiva)</option>
                  <option value={30}>Bottom 30% (Renovação massiva do plantel)</option>
                  <option value={35}>Bottom 35% (Seleção extrema de matrizes)</option>
                  <option value={40}>Bottom 40% (Eliminação de baixa performance)</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  * Alterar este valor afetará instantaneamente as marcações de "Descarte" e as ordens de apartação no curral geradas na Análise Genética.
                </p>
              </div>
            </div>

            {/* Detalhamento dos Critérios de Manejo */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 md:col-span-2 space-y-3.5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                Ações de Manejo Ativas para o Lote de Descarte (Bottom {cullingPercent}%)
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px]">
                <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg space-y-1">
                  <span className="font-bold text-rose-800 uppercase tracking-wide">1. Abate Comercial</span>
                  <p className="text-slate-600 leading-normal text-[9px]">
                    Destinado a animais com menor musculatura e menor ganho de peso. Interrompe custos de pastagem e manutenção.
                  </p>
                </div>

                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                  <span className="font-bold text-amber-800 uppercase tracking-wide">2. Castração Campo</span>
                  <p className="text-slate-600 leading-normal text-[9px]">
                    Evita reprodução indesejada de machos inteiros de baixo mérito genético e acelera deposição precoce de gordura (EGS).
                  </p>
                </div>

                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg space-y-1">
                  <span className="font-bold text-indigo-800 uppercase tracking-wide">3. Venda / Leilão</span>
                  <p className="text-slate-600 leading-normal text-[9px]">
                    Recomendado para fêmeas improdutivas ou matrizes de baixas DEPs maternas. Converte em capital de reinvestimento rápido.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Excel Backup and Templates Panel */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4 lg:col-span-2">
          <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Backup, Importação & Referência via Planilha Excel (.xlsx)
          </h3>
          <p className="text-xs text-slate-500 leading-normal">
            Faça download do arquivo de modelo padrão (.xlsx) para preenchimento estruturado em campo ou envie sua planilha preenchida para restaurar ou mesclar dados com o rebanho ativo.
          </p>

          <div className="flex flex-col md:flex-row gap-4 pt-2">
            <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Download className="w-3.5 h-3.5 text-indigo-600 animate-bounce" />
                  Passo 1: Baixar Planilha de Referência
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Baixe nossa planilha base parametrizada com todas as colunas de cabeçalho obrigatórias (ID, Nome, Espécie, Sexo, Linhagem de Pedigree e Campos Fenotípicos) e amostras zootécnicas para você preencher sem erros.
                </p>
              </div>
              <button
                onClick={handleDownloadTemplateXlsx}
                className="w-full flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold py-2 rounded-lg text-xs transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                Baixar Modelo de Planilha (.xlsx)
              </button>
            </div>

            <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  Passo 2: Importar / Restaurar Rebanho
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Selecione sua planilha .xlsx preenchida. O GenZOT fará o parsing automatizado e permitirá que você escolha entre <strong>substituir todo o plantel</strong> ou <strong>mesclar com novos dados</strong> de forma transparente.
                </p>
              </div>
              
              <label className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition cursor-pointer text-center shadow-xs">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Selecionar e Importar Planilha (.xlsx)</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleUploadXlsx}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

      </div>

      {/* Helpful Warning Footer banner */}
      <div className="bg-amber-50/75 border border-amber-200/80 rounded-xl p-4 flex gap-3 text-amber-900">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold">Nota de Segurança e Resiliência:</p>
          <p className="leading-normal">
            O GenZOT utiliza armazenamento local persistente criptográfico integrado ao navegador. Para garantir que os dados de coleta de dados nunca se percam por limpezas acidentais do navegador (cookies ou cache), programe o backup com frequência de <strong>1 dia</strong> ou exporte e salve arquivos .json externamente com regularidade.
          </p>
        </div>
      </div>
      
    </div>
  );
}
