import React, { useMemo } from 'react';
import { Animal, SelectionIndexConfig } from '../types';
import { X, User, Heart, ShieldAlert, Sparkles, TrendingUp, AlertTriangle, Scale, Award } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';

interface ProgenyModalProps {
  sire: Animal;
  dam: Animal;
  animals: Animal[];
  indexConfig: SelectionIndexConfig;
  evaluationEstimates: { [trait: string]: { [id: string]: { dep: number; acc: number } } };
  fOffspringProj: number;
  riskStatus: 'safe' | 'warning' | 'high_risk';
  msiScore: number;
  indexProj: number;
  onClose: () => void;
}

const TRAITS_METADATA: Record<string, { label: string; unit: string; desc: string }> = {
  pesoNascimento: { label: 'Peso ao Nascimento', unit: 'kg', desc: 'Indica o potencial genético para o peso do bezerro ao nascer. Valores moderados evitam distocias (partos difíceis).' },
  pesoDesmame: { label: 'Peso ao Desmame', unit: 'kg', desc: 'Reflete o crescimento pré-desmame do bezerro. Altamente influenciado pelo potencial de crescimento aditivo.' },
  pesoSobreano: { label: 'Peso ao Sobreano', unit: 'kg', desc: 'Mede o potencial de ganho de peso pós-desmame aos 18 meses, refletindo a velocidade de acabamento.' },
  gmd: { label: 'Ganho Médio Diário', unit: 'g/dia', desc: 'Capacidade de conversão alimentar e ganho de peso diário em regime de confinamento ou pasto.' },
  pe: { label: 'Perímetro Escrotal', unit: 'cm', desc: 'Indicador direto de precocidade sexual e fertilidade, tanto no reprodutor quanto em suas filhas.' },
  aol: { label: 'Área de Olho de Lombo', unit: 'cm²', desc: 'Indicador de rendimento de carcaça e quantidade de carne nobre na carcaça do animal.' },
  egs: { label: 'Espessura de Gordura Subcutânea', unit: 'mm', desc: 'Indica a facilidade de acabamento e deposição de gordura, essencial para a qualidade da carcaça.' },
  marmoreio: { label: 'Marmoreio', unit: '%', desc: 'Gordura intramuscular que confere suculência, maciez e sabor gourmet à carne.' },
  cpm_C: { label: 'Conformação de Carcaça', unit: 'pts', desc: 'Avaliação visual da estrutura muscular, arqueamento de costelas e harmonia esquelética.' }
};

export default function ProgenyModal({
  sire,
  dam,
  animals,
  indexConfig,
  evaluationEstimates,
  fOffspringProj,
  riskStatus,
  msiScore,
  indexProj,
  onClose
}: ProgenyModalProps) {

  // Fetch ancestry for the mini-pedigree of the calf
  const findParentInfo = (id: string) => {
    if (!id || id === '0') return 'Desconhecido';
    const match = animals.find(a => a.id === id);
    return match ? `${match.name || match.id} (${Object.keys(match.breedComp).join('/')})` : `Reg: ${id}`;
  };

  const damSire = dam.sireId ? findParentInfo(dam.sireId) : 'Desconhecido';
  const damDam = dam.damId ? findParentInfo(dam.damId) : 'Desconhecido';
  const sireSire = sire.sireId ? findParentInfo(sire.sireId) : 'Desconhecido';
  const sireDam = sire.damId ? findParentInfo(sire.damId) : 'Desconhecido';

  // Compute expected breed composition for offspring
  const offspringBreedComp = useMemo(() => {
    const comp: Record<string, number> = {};
    Object.entries(dam.breedComp).forEach(([b, f]) => comp[b] = (comp[b] || 0) + f * 0.5);
    Object.entries(sire.breedComp).forEach(([b, f]) => comp[b] = (comp[b] || 0) + f * 0.5);
    return comp;
  }, [dam, sire]);

  const breedCompStr = Object.entries(offspringBreedComp)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([b, f]) => `${b} ${((f as number) * 100).toFixed(0)}%`)
    .join(' / ');

  // Traits analysis
  const weights: Record<string, number> = {
    pesoDesmame: indexConfig.weight_pesoDesmame,
    pesoSobreano: indexConfig.weight_pesoSobreano,
    pe: indexConfig.weight_pe,
    aol: indexConfig.weight_aol,
    egs: indexConfig.weight_egs
  };

  const traitsToDisplay = Object.keys(weights).filter(w => weights[w] !== 0);

  const progenyTraits = useMemo(() => {
    return traitsToDisplay.map(key => {
      const sireEst = evaluationEstimates[key]?.[sire.id] || { dep: 0, acc: 0 };
      const damEst = evaluationEstimates[key]?.[dam.id] || { dep: 0, acc: 0 };
      const expectedDep = (sireEst.dep + damEst.dep) / 2;
      const avgAcc = (sireEst.acc + damEst.acc) / 2;
      
      const meta = TRAITS_METADATA[key] || { label: key, unit: '', desc: '' };
      
      return {
        key,
        label: meta.label,
        unit: meta.unit,
        desc: meta.desc,
        sireDep: sireEst.dep,
        damDep: damEst.dep,
        expectedDep,
        avgAcc
      };
    });
  }, [traitsToDisplay, sire, dam, evaluationEstimates]);

  // Radar Data
  const radarData = useMemo(() => {
    const traitScales: Record<string, number> = {
      pesoDesmame: 10, pesoSobreano: 15, pe: 2, aol: 4, egs: 1.5, gmd: 150, marmoreio: 1.5, pesoNascimento: 2.5, cpm_C: 2
    };

    const normalizeDep = (dep: number, name: string) => {
      const scale = traitScales[name] || 10;
      const normalized = ((dep + scale) / (2 * scale)) * 100;
      return Math.max(0, Math.min(100, normalized));
    };

    return progenyTraits.map(t => ({
      subject: t.label,
      Matriz: normalizeDep(t.damDep, t.key),
      Reprodutor: normalizeDep(t.sireDep, t.key),
      Cria: normalizeDep(t.expectedDep, t.key),
      sireVal: t.sireDep,
      damVal: t.damDep,
      progenyVal: t.expectedDep,
      unit: t.unit
    }));
  }, [progenyTraits]);

  // Risk visual parameters
  let riskBg = "bg-emerald-50 border-emerald-200 text-emerald-950";
  let riskText = "Excelente (Acasalamento Recomendado)";
  let riskPill = "bg-emerald-600";
  let riskDesc = "Genealogias limpas com coeficiente de consanguinidade basal. Máxima expressividade do vigor híbrido e viabilidade biológica.";

  if (riskStatus === 'high_risk') {
    riskBg = "bg-rose-50 border-rose-200 text-rose-950";
    riskText = "Crítico (Risco de Endogamia)";
    riskPill = "bg-rose-600";
    riskDesc = "Coeficiente F acima do limiar de segurança de 6.25%. Alto risco de aparecimento de genes recessivos deletérios e perda de fôlego reprodutivo (depressão por endogamia).";
  } else if (riskStatus === 'warning') {
    riskBg = "bg-amber-50 border-amber-200 text-amber-950";
    riskText = "Moderado (Monitoramento Ativo)";
    riskPill = "bg-amber-500";
    riskDesc = "Coeficiente F entre 3.1% e 6.25%. Cruzamento aceitável se as DEPs de compensação forem excepcionais, mas requer acompanhamento técnico rigoroso.";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold tracking-tight">Ficha de Progênie Projetada: Simulação de Cruzamento</h2>
              <p className="text-[10px] text-slate-300">Projeção matemática das qualidades hereditárias da futura cria baseada no acasalamento selecionado.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          
          {/* Top Panel: Parents overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Matriz (Mãe) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full flex items-center justify-center translate-x-3 -translate-y-3">
                <span className="text-[10px] font-black text-orange-600 rotate-45 translate-x-1.5 -translate-y-1">MATRIZ</span>
              </div>
              <span className="text-[9px] uppercase font-black text-orange-500 tracking-wider">Linhagem Materna</span>
              <h3 className="font-bold text-slate-900 text-sm font-mono mt-1">{dam.id}</h3>
              <p className="text-xs text-slate-500 font-semibold">{dam.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="text-slate-400 block font-medium">Composição:</span>
                  <span className="font-bold text-slate-700 truncate block">{Object.keys(dam.breedComp).join('/')}</span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="text-slate-400 block font-medium">Lote:</span>
                  <span className="font-bold text-slate-700 block">{dam.manejo || 'Sem Lote'}</span>
                </div>
              </div>
            </div>

            {/* Reprodutor (Pai) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full flex items-center justify-center translate-x-3 -translate-y-3">
                <span className="text-[10px] font-black text-purple-600 rotate-45 translate-x-1.5 -translate-y-1">TOURO</span>
              </div>
              <span className="text-[9px] uppercase font-black text-purple-500 tracking-wider">Linhagem Paterna</span>
              <h3 className="font-bold text-slate-900 text-sm font-mono mt-1">{sire.id}</h3>
              <p className="text-xs text-slate-500 font-semibold">{sire.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="text-slate-400 block font-medium">Composição:</span>
                  <span className="font-bold text-slate-700 truncate block">{Object.keys(sire.breedComp).join('/')}</span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="text-slate-400 block font-medium">Origem:</span>
                  <span className="font-bold text-slate-700 block truncate">{sire.rebanho || 'Importado'}</span>
                </div>
              </div>
            </div>

            {/* Progenie Score Summary */}
            <div className="bg-indigo-900 text-white p-4 rounded-xl border border-indigo-950 shadow-md relative overflow-hidden flex flex-col justify-between">
              <div className="absolute bottom-0 right-0 opacity-10 translate-x-4 translate-y-4">
                <Award className="w-28 h-28" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-black text-indigo-200 tracking-wider">Resultado da Simulação</span>
                <h3 className="text-xs font-black text-indigo-100 mt-1">PRODUTO ESTIMADO</h3>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono leading-none">{indexProj.toFixed(1)}</span>
                  <span className="text-[10px] text-indigo-200 font-bold">Índice Bioeconômico</span>
                </div>
              </div>
              <div className="text-[10px] text-indigo-200 mt-3 border-t border-white/10 pt-2 flex justify-between items-center">
                <span>Score de Acasalamento:</span>
                <span className="font-mono font-black bg-white/10 text-white px-2 py-0.5 rounded border border-white/20">{msiScore} pts</span>
              </div>
            </div>

          </div>

          {/* Genetic & Consanguinity Risk Panel */}
          <div className={`p-4 rounded-xl border ${riskBg} shadow-3xs flex flex-col md:flex-row items-start md:items-center gap-4`}>
            <div className={`p-2.5 rounded-lg text-white ${riskPill} shrink-0`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-xs">Coeficiente de Consanguinidade da Cria (F_Cria):</span>
                <span className={`font-mono font-black text-xs px-2 py-0.5 rounded border ${riskStatus === 'high_risk' ? 'bg-rose-100 text-rose-800 border-rose-300' : riskStatus === 'warning' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                  {fOffspringProj}%
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">({riskText})</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-700">{riskDesc}</p>
            </div>
          </div>

          {/* Core Body: Pedigree and Radar plots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Pedigree Tree of the Future Calf */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <User className="w-4 h-4 text-slate-600" /> Pedigree Projetado (3 Gerações)
                </h4>
                <p className="text-[10px] text-slate-500 mb-4">Verifique a genealogia combinada para atestar a diversidade genética do acasalamento.</p>
              </div>

              {/* Pedigree visual layout */}
              <div className="space-y-3 my-auto">
                <div className="flex items-center">
                  <div className="w-1/3 bg-indigo-50 border border-indigo-150 p-2 rounded-lg text-center font-bold text-[10px] text-indigo-900 font-mono shadow-sm">
                    FUTURO BEZERRO
                    <span className="block font-sans text-[8px] text-slate-500 font-normal mt-0.5">{breedCompStr}</span>
                  </div>
                  
                  <div className="w-8 h-0.5 bg-slate-300 relative"></div>
                  
                  <div className="w-2/3 space-y-4">
                    {/* Pai */}
                    <div className="flex items-center">
                      <div className="w-1/2 bg-purple-50 border border-purple-200 p-1.5 rounded-lg text-center font-bold text-[9px] text-purple-900 truncate" title={sire.name}>
                        PAI: {sire.name || sire.id}
                      </div>
                      <div className="w-4 h-0.5 bg-slate-300"></div>
                      <div className="w-1/2 space-y-1">
                        <div className="bg-slate-50 border border-slate-200 p-1 rounded text-[8px] text-slate-600 truncate" title={sireSire}>
                          Avô: {sireSire}
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-1 rounded text-[8px] text-slate-600 truncate" title={sireDam}>
                          Avó: {sireDam}
                        </div>
                      </div>
                    </div>

                    {/* Mãe */}
                    <div className="flex items-center">
                      <div className="w-1/2 bg-orange-50 border border-orange-200 p-1.5 rounded-lg text-center font-bold text-[9px] text-orange-900 truncate" title={dam.name}>
                        MÃE: {dam.name || dam.id}
                      </div>
                      <div className="w-4 h-0.5 bg-slate-300"></div>
                      <div className="w-1/2 space-y-1">
                        <div className="bg-slate-50 border border-slate-200 p-1 rounded text-[8px] text-slate-600 truncate" title={damSire}>
                          Avô: {damSire}
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-1 rounded text-[8px] text-slate-600 truncate" title={damDam}>
                          Avó: {damDam}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informative advice */}
              <div className="mt-4 bg-slate-50 p-2.5 rounded-lg text-[9px] text-slate-500 leading-tight border border-slate-150">
                <strong>Análise Genômica:</strong> O vigor híbrido é desencadeado quando combinamos linhagens com baixa proximidade de parentesco. Este acasalamento projeta um índice de heterozigose de <span className="font-bold text-slate-800 font-mono">{( (1 - Object.entries(offspringBreedComp).reduce((sum, [_, val]) => sum + (val as number)*(val as number), 0)) * 100).toFixed(0)}%</span>.
              </div>
            </div>

            {/* Radar Comparison Plot */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs flex flex-col">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Perfil de Equilíbrio das DEPs
              </h4>
              <p className="text-[10px] text-slate-500 mb-3">Linha verde mostra as características normalizadas que serão herdadas pelo produto.</p>
              
              <div className="h-[240px] w-full my-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#334155', fontSize: 9, fontWeight: 'bold' }} />
                    <Radar name="Matriz (Laranja)" dataKey="Matriz" stroke="#ea580c" strokeWidth={2.5} fill="#ffedd5" fillOpacity={0.15} strokeDasharray="4 3"/>
                    <Radar name="Touro (Roxo)" dataKey="Reprodutor" stroke="#a855f7" fill="#f3e8ff" fillOpacity={0.1} strokeDasharray="3 3" />
                    <Radar name="Cria Projetada (Verde)" dataKey="Cria" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
                    <Legend wrapperStyle={{ fontSize: '9px', marginTop: '10px' }} />
                    <RechartsTooltip wrapperStyle={{ fontSize: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* DEP Projection Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Scale className="w-4 h-4 text-indigo-600" /> Tabela de Predição de Mérito Genético (DEPs)
            </h4>
            
            <div className="overflow-x-auto border border-slate-150 rounded-lg">
              <table className="min-w-full text-left text-xs text-slate-750">
                <thead className="bg-slate-100 text-[9.5px] uppercase font-black text-slate-650 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Característica</th>
                    <th className="py-2 px-3 text-center">DEP Matriz</th>
                    <th className="py-2 px-3 text-center">DEP Touro</th>
                    <th className="py-2 px-3 text-center bg-emerald-50 text-emerald-950 font-extrabold">DEP Cria Esperada</th>
                    <th className="py-2 px-3 text-center">Acurácia Esperada</th>
                    <th className="py-2 px-3">Explicação Zootécnica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-medium">
                  {progenyTraits.map(t => (
                    <tr key={t.key} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-slate-800">{t.label} <span className="text-[10px] text-slate-400 font-mono">({t.unit})</span></td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">{t.damDep > 0 ? '+' : ''}{t.damDep.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">{t.sireDep > 0 ? '+' : ''}{t.sireDep.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center bg-emerald-50/50 text-emerald-900 font-mono font-extrabold border-x border-emerald-100">{t.expectedDep > 0 ? '+' : ''}{t.expectedDep.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono text-indigo-800 font-bold">{(t.avgAcc * 100).toFixed(0)}%</td>
                      <td className="py-2 px-3 text-[10px] text-slate-500 leading-normal max-w-xs">{t.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-3">
          <span className="text-[10px] text-slate-500 text-center sm:text-left">
            Modelo matemático baseado no Teorema de Transmissão Independente de Alelos e nas equações clássicas de acasalamento zootécnico (Lush, 1945).
          </span>
          <button 
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2 rounded-xl text-xs transition duration-150"
          >
            Fechar Diagnóstico
          </button>
        </div>

      </div>
    </div>
  );
}
