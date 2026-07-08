import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, Filter, Download, Printer, Search, TrendingUp, Percent, Dna, 
  Layers, CheckSquare, Square, FileText, Info, Award, UserCheck 
} from 'lucide-react';
import { Animal, SelectionIndexConfig, Species } from '../types';
import { calculateSelectionIndex } from '../utils/math';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  animals: Animal[];
  indexConfig: SelectionIndexConfig;
  evaluationEstimates: { [trait: string]: { [id: string]: { dep: number; acc: number } } };
  currentSpecies: Species;
}

export default function ReportModal({
  isOpen,
  onClose,
  animals,
  indexConfig,
  evaluationEstimates,
  currentSpecies
}: ReportModalProps) {
  if (!isOpen) return null;

  // Search and Filter states
  const [speciesFilter, setSpeciesFilter] = useState<'bovino' | 'all'>(currentSpecies);
  const [sexFilter, setSexFilter] = useState<'M' | 'F' | 'all'>('all');
  const [generationFilter, setGenerationFilter] = useState<'all' | 'founders' | 'descendants'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dynamic collections based on actual data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    animals.forEach(a => {
      if (a.birthYear) years.add(a.birthYear);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [animals]);

  const availableHerds = useMemo(() => {
    const herds = new Set<string>();
    animals.forEach(a => {
      if (a.rebanho) herds.add(a.rebanho);
    });
    return Array.from(herds).sort();
  }, [animals]);

  const availableBreeds = useMemo(() => {
    const breeds = new Set<string>();
    animals.forEach(a => {
      Object.keys(a.breedComp || {}).forEach(bName => breeds.add(bName));
    });
    return Array.from(breeds).sort();
  }, [animals]);

  const [yearFilter, setYearFilter] = useState<string>('all');
  const [herdFilter, setHerdFilter] = useState<string>('all');
  const [breedFilter, setBreedFilter] = useState<string>('all');
  const [inbreedingFilter, setInbreedingFilter] = useState<string>('all');
  const [rankFilter, setRankFilter] = useState<string>('all');

  // Column Visibility Toggles
  const [columns, setColumns] = useState({
    id: true,
    name: true,
    species: true,
    sex: true,
    birthDate: true,
    rebanho: true,
    manejo: true,
    breedComp: true,
    inbreeding: true,
    heterozygosity: true,
    depDesmame: true,
    accDesmame: false,
    depSobreano: true,
    accSobreano: false,
    depPE: true,
    accPE: false,
    depAOL: true,
    accAOL: false,
    depEGS: true,
    accEGS: false,
    index: true
  });

  // Toggle helper
  const toggleColumn = (key: keyof typeof columns) => {
    setColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to fetch DEP of animal
  const getDEP = (animalId: string, trait: string): number => {
    return evaluationEstimates[trait]?.[animalId]?.dep ?? 0;
  };

  const getAcc = (animalId: string, trait: string): number => {
    return evaluationEstimates[trait]?.[animalId]?.acc ?? 0;
  };

  // Compute Selection Index scores for all animals first
  const animalsWithScores = useMemo(() => {
    return animals.map(a => {
      const score = calculateSelectionIndex(a, indexConfig, evaluationEstimates);
      return {
        ...a,
        selectionIndexScore: score
      };
    });
  }, [animals, indexConfig, evaluationEstimates]);

  // Calculate full population average for Rank Filtering
  const avgIndexScore = useMemo(() => {
    if (animalsWithScores.length === 0) return 100;
    const sum = animalsWithScores.reduce((acc, a) => acc + a.selectionIndexScore, 0);
    return sum / animalsWithScores.length;
  }, [animalsWithScores]);

  // Sorting threshold for Top Percentiles
  const percentileThresholds = useMemo(() => {
    const sortedScores = [...animalsWithScores]
      .map(a => a.selectionIndexScore)
      .sort((a, b) => b - a);
    
    if (sortedScores.length === 0) return { top10: 100, top25: 100, top50: 100 };
    
    const getAtPercentile = (p: number) => {
      const idx = Math.floor(sortedScores.length * p);
      return sortedScores[Math.min(idx, sortedScores.length - 1)];
    };

    return {
      top10: getAtPercentile(0.10),
      top25: getAtPercentile(0.25),
      top50: getAtPercentile(0.50)
    };
  }, [animalsWithScores]);

  // Filtered Animals selection
  const filteredAnimals = useMemo(() => {
    return animalsWithScores.filter(a => {
      // 1. Species Filter
      if (speciesFilter !== 'all' && a.species !== speciesFilter) return false;

      // 2. Sex Filter
      if (sexFilter !== 'all' && a.sex !== sexFilter) return false;

      // 3. Generation / Founders Check
      if (generationFilter === 'founders') {
        const hasSire = a.sireId && a.sireId !== '0' && a.sireId !== '';
        const hasDam = a.damId && a.damId !== '0' && a.damId !== '';
        if (hasSire || hasDam) return false;
      } else if (generationFilter === 'descendants') {
        const hasSire = a.sireId && a.sireId !== '0' && a.sireId !== '';
        const hasDam = a.damId && a.damId !== '0' && a.damId !== '';
        if (!hasSire && !hasDam) return false;
      }

      // 4. Year Filter
      if (yearFilter !== 'all' && a.birthYear.toString() !== yearFilter) return false;

      // 5. Herd Filter
      if (herdFilter !== 'all' && a.rebanho !== herdFilter) return false;

      // 6. Breed Filter
      if (breedFilter !== 'all') {
        const share = a.breedComp?.[breedFilter] || 0;
        if (share === 0) return false;
      }

      // 7. Inbreeding Filter
      const fValue = a.f_inbreeding || 0;
      if (inbreedingFilter === 'zero' && fValue > 0) return false;
      if (inbreedingFilter === 'inbred' && fValue === 0) return false;
      if (inbreedingFilter === 'moderate' && fValue < 0.03125) return false;
      if (inbreedingFilter === 'high' && fValue < 0.0625) return false;
      if (inbreedingFilter === 'critical' && fValue < 0.125) return false;

      // 8. Rank Selection Index Filter
      const indexScore = a.selectionIndexScore;
      if (rankFilter === 'top10' && indexScore < percentileThresholds.top10) return false;
      if (rankFilter === 'top25' && indexScore < percentileThresholds.top25) return false;
      if (rankFilter === 'top50' && indexScore < percentileThresholds.top50) return false;
      if (rankFilter === 'below_avg' && indexScore >= avgIndexScore) return false;

      // 9. Free text search query (ID or Name or Management Group)
      if (searchQuery.trim() !== '') {
        const search = searchQuery.toLowerCase();
        const matchesId = a.id.toLowerCase().includes(search);
        const matchesName = a.name.toLowerCase().includes(search);
        const matchesManejo = a.manejo.toLowerCase().includes(search);
        const matchesRebanho = a.rebanho.toLowerCase().includes(search);
        if (!matchesId && !matchesName && !matchesManejo && !matchesRebanho) return false;
      }

      return true;
    });
  }, [
    animalsWithScores, speciesFilter, sexFilter, generationFilter, 
    yearFilter, herdFilter, breedFilter, inbreedingFilter, rankFilter, 
    searchQuery, percentileThresholds, avgIndexScore
  ]);

  // Dynamic Statistics of the current selection
  const statistics = useMemo(() => {
    const total = filteredAnimals.length;
    if (total === 0) {
      return {
        total: 0,
        avgF: 0,
        avgH: 0,
        avgIndex: 100,
        avgDepDesmame: 0,
        avgDepSobreano: 0,
        avgDepPE: 0,
        avgDepAOL: 0,
        avgDepEGS: 0,
        malePercent: 0,
        femalePercent: 0
      };
    }

    let sumF = 0;
    let sumH = 0;
    let sumIndex = 0;
    let sumDepDesmame = 0;
    let sumDepSobreano = 0;
    let sumDepPE = 0;
    let sumDepAOL = 0;
    let sumDepEGS = 0;
    let malesCount = 0;

    filteredAnimals.forEach(a => {
      sumF += a.f_inbreeding || 0;
      sumH += a.heterozygosity || 0;
      sumIndex += a.selectionIndexScore;
      sumDepDesmame += getDEP(a.id, 'pesoDesmame');
      sumDepSobreano += getDEP(a.id, 'pesoSobreano');
      sumDepPE += getDEP(a.id, 'pe');
      sumDepAOL += getDEP(a.id, 'aol');
      sumDepEGS += getDEP(a.id, 'egs');
      if (a.sex === 'M') malesCount++;
    });

    return {
      total,
      avgF: (sumF / total) * 100,
      avgH: (sumH / total) * 100,
      avgIndex: sumIndex / total,
      avgDepDesmame: sumDepDesmame / total,
      avgDepSobreano: sumDepSobreano / total,
      avgDepPE: sumDepPE / total,
      avgDepAOL: sumDepAOL / total,
      avgDepEGS: sumDepEGS / total,
      malePercent: (malesCount / total) * 100,
      femalePercent: ((total - malesCount) / total) * 100
    };
  }, [filteredAnimals]);

  // Export dynamically to EXCEL using XLSX
  const exportToExcel = () => {
    if (filteredAnimals.length === 0) {
      alert("Nenhum animal filtrado para exportar!");
      return;
    }

    const wsData = filteredAnimals.map(a => {
      const breedsString = Object.entries(a.breedComp || {})
        .map(([b, w]) => `${b}: ${(Number(w) * 100).toFixed(0)}%`)
        .join(', ');

      // Build spreadsheet columns respecting active configuration
      const record: Record<string, any> = {};
      if (columns.id) record['ID / Registro'] = a.id;
      if (columns.name) record['Nome Oficial'] = a.name;
      if (columns.species) record['Espécie'] = 'Bovino';
      if (columns.sex) record['Sexo'] = a.sex === 'M' ? 'Macho' : 'Fêmea';
      if (columns.birthDate) record['Nascimento'] = a.birthDate;
      if (columns.rebanho) record['Rebanho/Fazenda'] = a.rebanho;
      if (columns.manejo) record['Manejo'] = a.manejo;
      if (columns.breedComp) record['Composição de Raça'] = breedsString;
      if (columns.inbreeding) record['Consanguinidade - F (%)'] = Number(((a.f_inbreeding || 0) * 100).toFixed(2));
      if (columns.heterozygosity) record['Heterozigose - H (%)'] = Number(((a.heterozygosity || 0) * 100).toFixed(2));
      
      // DEPs as numbers
      if (columns.depDesmame) {
        record['DEP Peso Desmame (kg)'] = Number(getDEP(a.id, 'pesoDesmame').toFixed(3));
      }
      if (columns.accDesmame) {
        record['Acurácia Peso Desmame (%)'] = Number((getAcc(a.id, 'pesoDesmame') * 100).toFixed(0));
      }
      if (columns.depSobreano) {
        record['DEP Peso Sobreano (kg)'] = Number(getDEP(a.id, 'pesoSobreano').toFixed(3));
      }
      if (columns.accSobreano) {
        record['Acurácia Peso Sobreano (%)'] = Number((getAcc(a.id, 'pesoSobreano') * 100).toFixed(0));
      }
      if (columns.depPE) {
        record['DEP C. Escrotal - PE (cm)'] = Number(getDEP(a.id, 'pe').toFixed(3));
      }
      if (columns.accPE) {
        record['Acurácia PE (%)'] = Number((getAcc(a.id, 'pe') * 100).toFixed(0));
      }
      if (columns.depAOL) {
        record['DEP Área Olho Lombo - AOL (cm²)'] = Number(getDEP(a.id, 'aol').toFixed(3));
      }
      if (columns.accAOL) {
        record['Acurácia AOL (%)'] = Number((getAcc(a.id, 'aol') * 100).toFixed(0));
      }
      if (columns.depEGS) {
        record['DEP Espessura Gordura - EGS (mm)'] = Number(getDEP(a.id, 'egs').toFixed(3));
      }
      if (columns.accEGS) {
        record['Acurácia EGS (%)'] = Number((getAcc(a.id, 'egs') * 100).toFixed(0));
      }
      if (columns.index) record['Índice Hazel'] = Number(a.selectionIndexScore.toFixed(2));

      return record;
    });

    const worksheet = XLSX.utils.json_to_sheet(wsData);
    
    // Set headers design slightly cleaner
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'GenZOT Avaliação');
    
    // Export file
    const stamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
    XLSX.writeFile(workbook, `Relatorio_Melhoramento_GenZOT_${stamp}.xlsx`);
  };

  // Trigger high-fidelity PDF/Print generation using native window API
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor, permita popups para gerar e imprimir o PDF!");
      return;
    }

    const title = `Relatório Técnico de Melhoramento Genético - GenZOT`;
    const stamp = new Date().toLocaleString('pt-BR');
    
    // Build tables and rows dynamically
    const headersHTML = `
      <tr>
        ${columns.id ? '<th style="text-align: left; padding: 6px; border-bottom: 2px solid #334155;">ID</th>' : ''}
        ${columns.name ? '<th style="text-align: left; padding: 6px; border-bottom: 2px solid #334155;">Nome</th>' : ''}
        ${columns.species ? '<th style="text-align: left; padding: 6px; border-bottom: 2px solid #334155;">Espécie</th>' : ''}
        ${columns.sex ? '<th style="text-align: left; padding: 6px; border-bottom: 2px solid #334155;">Sexo</th>' : ''}
        ${columns.birthDate ? '<th style="text-align: left; padding: 6px; border-bottom: 2px solid #334155;">Nasc.</th>' : ''}
        ${columns.rebanho ? '<th style="text-align: left; padding: 6px; border-bottom: 2px solid #334155;">Rebanho</th>' : ''}
        ${columns.manejo ? '<th style="text-align: left; padding: 6px; border-bottom: 2px solid #334155;">Manejo</th>' : ''}
        ${columns.breedComp ? '<th style="text-align: left; padding: 6px; border-bottom: 2px solid #334155;">Raças</th>' : ''}
        ${columns.inbreeding ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">F (%)</th>' : ''}
        ${columns.heterozygosity ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">H (%)</th>' : ''}
        ${columns.depDesmame ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">DEP Desmame</th>' : ''}
        ${columns.accDesmame ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">Acur. Desmame</th>' : ''}
        ${columns.depSobreano ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">DEP Sobreano</th>' : ''}
        ${columns.accSobreano ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">Acur. Sobreano</th>' : ''}
        ${columns.depPE ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">DEP PE (cm)</th>' : ''}
        ${columns.accPE ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">Acur. PE</th>' : ''}
        ${columns.depAOL ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">DEP AOL (cm²)</th>' : ''}
        ${columns.accAOL ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">Acur. AOL</th>' : ''}
        ${columns.depEGS ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">DEP EGS (mm)</th>' : ''}
        ${columns.accEGS ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155;">Acur. EGS</th>' : ''}
        ${columns.index ? '<th style="text-align: right; padding: 6px; border-bottom: 2px solid #334155; font-weight: bold; background-color: #f1f5f9;">Índice</th>' : ''}
      </tr>
    `;

    const rowsHTML = filteredAnimals.map(a => {
      const breedsString = Object.entries(a.breedComp || {})
        .map(([b, w]) => `${b}: ${(Number(w) * 100).toFixed(0)}%`)
        .join(', ');

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
          ${columns.id ? `<td style="padding: 5px; font-family: monospace;">${a.id}</td>` : ''}
          ${columns.name ? `<td style="padding: 5px; font-weight: 500;">${a.name}</td>` : ''}
          ${columns.species ? `<td style="padding: 5px;">Bovino</td>` : ''}
          ${columns.sex ? `<td style="padding: 5px;">${a.sex === 'M' ? 'Macho' : 'Fêmea'}</td>` : ''}
          ${columns.birthDate ? `<td style="padding: 5px;">${a.birthDate}</td>` : ''}
          ${columns.rebanho ? `<td style="padding: 5px;">${a.rebanho}</td>` : ''}
          ${columns.manejo ? `<td style="padding: 5px; font-family: monospace;">${a.manejo}</td>` : ''}
          ${columns.breedComp ? `<td style="padding: 5px; font-size: 9px; color: #475569;">${breedsString}</td>` : ''}
          ${columns.inbreeding ? `<td style="padding: 5px; text-align: right; color: ${a.f_inbreeding && a.f_inbreeding > 0.0625 ? '#ef4444; font-weight: bold;' : '#000'}">${((a.f_inbreeding || 0) * 100).toFixed(2)}%</td>` : ''}
          ${columns.heterozygosity ? `<td style="padding: 5px; text-align: right; color: #16a34a;">${((a.heterozygosity || 0) * 100).toFixed(2)}%</td>` : ''}
          ${columns.depDesmame ? `<td style="padding: 5px; text-align: right;">${getDEP(a.id, 'pesoDesmame').toFixed(3)}</td>` : ''}
          ${columns.accDesmame ? `<td style="padding: 5px; text-align: right; color: #475569;">${Math.round(getAcc(a.id, 'pesoDesmame')*100)}%</td>` : ''}
          ${columns.depSobreano ? `<td style="padding: 5px; text-align: right;">${getDEP(a.id, 'pesoSobreano').toFixed(3)}</td>` : ''}
          ${columns.accSobreano ? `<td style="padding: 5px; text-align: right; color: #475569;">${Math.round(getAcc(a.id, 'pesoSobreano')*100)}%</td>` : ''}
          ${columns.depPE ? `<td style="padding: 5px; text-align: right;">${getDEP(a.id, 'pe').toFixed(3)}</td>` : ''}
          ${columns.accPE ? `<td style="padding: 5px; text-align: right; color: #475569;">${Math.round(getAcc(a.id, 'pe')*100)}%</td>` : ''}
          ${columns.depAOL ? `<td style="padding: 5px; text-align: right;">${getDEP(a.id, 'aol').toFixed(3)}</td>` : ''}
          ${columns.accAOL ? `<td style="padding: 5px; text-align: right; color: #475569;">${Math.round(getAcc(a.id, 'aol')*100)}%</td>` : ''}
          ${columns.depEGS ? `<td style="padding: 5px; text-align: right;">${getDEP(a.id, 'egs').toFixed(3)}</td>` : ''}
          ${columns.accEGS ? `<td style="padding: 5px; text-align: right; color: #475569;">${Math.round(getAcc(a.id, 'egs')*100)}%</td>` : ''}
          ${columns.index ? `<td style="padding: 5px; text-align: right; font-weight: bold; background-color: #f8fafc;">${a.selectionIndexScore.toFixed(2)}</td>` : ''}
        </tr>
      `;
    }).join('');

    const formattedIndexConfig = `
      P. Desmame: ${indexConfig.weight_pesoDesmame}x | 
      P. Sobreano: ${indexConfig.weight_pesoSobreano}x | 
      PE: ${indexConfig.weight_pe}x | 
      AOL: ${indexConfig.weight_aol}x | 
      EGS: ${indexConfig.weight_egs}x
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.4;
            }
            .header-table {
              width: 100%;
              border-bottom: 3px double #334155;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .logo-text {
              font-size: 24px;
              font-weight: 800;
              color: #f59e0b; /* Golden primary */
              margin: 0;
              letter-spacing: -0.5px;
            }
            .subtitle {
              font-size: 11px;
              color: #475569;
              margin: 3px 0 0 0;
            }
            .report-title {
              text-align: center;
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
              margin: 25px 0 15px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 12px;
              border-radius: 6px;
              font-size: 11px;
              margin-bottom: 20px;
            }
            .stat-badge-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 25px;
            }
            .stat-badge {
              border: 1px solid #cbd5e1;
              padding: 8px;
              border-radius: 4px;
              text-align: center;
            }
            .stat-badge .value {
              font-size: 14px;
              font-weight: 700;
              color: #1e3a8a;
            }
            .stat-badge .label {
              font-size: 9px;
              text-transform: uppercase;
              color: #64748b;
              margin-top: 2px;
            }
            table.data-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            table.data-table th {
              background-color: #f8fafc;
              color: #1e293b;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
            }
            table.data-table tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .footer-signals {
              margin-top: 50px;
              page-break-inside: avoid;
              display: flex;
              justify-content: space-around;
              padding-top: 30px;
              border-top: 1px solid #cbd5e1;
            }
            .sig-box {
              text-align: center;
              font-size: 11px;
              width: 250px;
            }
            .sig-line {
              border-top: 1px solid #334155;
              margin-bottom: 6px;
              width: 105px;
              margin: 0 auto 6px auto;
            }
            @media print {
              body { margin: 20px; }
              @page { size: A4 landscape; margin: 1.2cm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <!-- Print head header -->
          <table class="header-table">
            <tr>
              <td>
                <h1 class="logo-text">Gen<span style="color: #f59e0b;">ZOT</span></h1>
                <p class="subtitle">Ciência Acadêmica a Serviço da Zootecnia</p>
              </td>
              <td style="text-align: right; font-size: 11px; color: #475569; vertical-align: bottom;">
                <strong>Universidade Federal de Santa Maria (UFSM)</strong><br />
                Predição Genética sob MME de Henderson • Emitido em: ${stamp}
              </td>
            </tr>
          </table>

          <h2 class="report-title">RELATÓRIO ZOOTÉCNICO DE AVALIAÇÃO E SELEÇÃO</h2>

          <!-- Filters description -->
          <div class="meta-grid">
            <div>
              <strong>Configuração de Filtros Aplicados:</strong><br />
              • Espécie: Bovinos de corte<br />
              • Sexo: ${sexFilter === 'all' ? 'Ambos' : sexFilter === 'M' ? 'Machos' : 'Fêmeas'}<br />
              • Rebanho Original: ${herdFilter === 'all' ? 'Todos os rebanhos cadastrados' : herdFilter}<br />
              • Grau de Sangue: ${breedFilter === 'all' ? 'Sem restrição racial' : 'Composição contendo raça ' + breedFilter}
            </div>
            <div>
              <strong>Critérios de Seleção & Parâmetros:</strong><br />
              • Pesos do Índice Hazel (1943): <span style="font-family: monospace;">${formattedIndexConfig}</span><br />
              • Filtro de Consanguinidade: ${inbreedingFilter === 'all' ? 'Livre' : inbreedingFilter === 'zero' ? 'F = 0% (Isentos de Endogamia)' : 'Filtro avançado de homozigose acanalada'}<br />
              • Nível de Enquadramento: ${rankFilter === 'all' ? 'População Completa' : rankFilter === 'top10' ? 'Top 10% do Rebanho' : rankFilter === 'top25' ? 'Top 25% do Rebanho' : 'Top 50%'}
            </div>
          </div>

          <!-- Summary values -->
          <div class="stat-badge-grid">
            <div class="stat-badge">
              <div class="value">${statistics.total}</div>
              <div class="label">Animais Listados</div>
            </div>
            <div class="stat-badge">
              <div class="value">${statistics.avgF.toFixed(3)}%</div>
              <div class="label">Média F (Endogamia)</div>
            </div>
            <div class="stat-badge">
              <div class="value">${statistics.avgH.toFixed(2)}%</div>
              <div class="label">Média H (Heterozigose)</div>
            </div>
            <div class="stat-badge">
              <div class="value" style="color: #ea580c;">${statistics.avgIndex.toFixed(2)}</div>
              <div class="label">Média Índice de Seleção</div>
            </div>
          </div>

          <!-- Main table of data -->
          <table class="data-table">
            <thead>
              ${headersHTML}
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>

          <!-- Footer Signature block -->
          <div class="footer-signals">
            <div class="sig-box">
              <div style="height: 48px;"></div>
              <div class="sig-line"></div>
              <strong>Prof. Paulo Pacheco</strong><br />
              Coordenador de Zootecnia Aplicada
            </div>
            <div class="sig-box">
              <div style="height: 48px;"></div>
              <div class="sig-line"></div>
              <strong>Profa. Thaise Melo</strong><br />
              Melhoramento Genético Animal / UFSM
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-lg">
              <FileText className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Centro de Relatórios Avançados e Seleção</h2>
              <p className="text-[10px] text-slate-400 font-medium">Exportações científicas de DEPs, Valores Genéticos, Heterozigose e Endogamia • Gen<span className="text-amber-500 font-semibold">ZOT</span></p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 bg-slate-50">
          
          {/* Left panel: Filters & Column selections */}
          <div className="w-full lg:w-80 shrink-0 space-y-5">
            
            {/* Filters Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                Filtros Populacionais
              </h3>



              {/* Sex Filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Sexo</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['all', 'M', 'F'] as const).map(sx => (
                    <button
                      key={sx}
                      onClick={() => setSexFilter(sx)}
                      className={`py-1 px-2 text-[10px] rounded-md font-medium border transition-all cursor-pointer ${
                        sexFilter === sx
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sx === 'all' ? 'Ambos' : sx === 'M' ? 'Macho' : 'Fêmea'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generation filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Origem / Categoria</label>
                <select
                  value={generationFilter}
                  onChange={(e) => setGenerationFilter(e.target.value as any)}
                  className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md text-slate-700 outline-none focus:border-indigo-500 transition-all font-medium"
                >
                  <option value="all">Todas as Categoria</option>
                  <option value="founders">Fundadores (Sem Genealogia Inicial)</option>
                  <option value="descendants">Descendentes (Com Geração Calculada)</option>
                </select>
              </div>

              {/* Safra ou Ano de nascimento */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Ano de Nascimento / Safra</label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md text-slate-700 outline-none focus:border-indigo-500 transition-all font-medium"
                >
                  <option value="all">Todas as Safras</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Original Herd Selector */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Rebanho / Fazenda</label>
                <select
                  value={herdFilter}
                  onChange={(e) => setHerdFilter(e.target.value)}
                  className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md text-slate-700 outline-none focus:border-indigo-500 transition-all font-medium"
                >
                  <option value="all">Todos os Rebanhos</option>
                  {availableHerds.map(herd => (
                    <option key={herd} value={herd}>{herd}</option>
                  ))}
                </select>
              </div>

              {/* Inbreeding filter coefficient */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Coeficiente Consanguinidade (F)</label>
                <select
                  value={inbreedingFilter}
                  onChange={(e) => setInbreedingFilter(e.target.value)}
                  className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md text-slate-700 outline-none focus:border-indigo-500 transition-all font-medium"
                >
                  <option value="all">Qualquer taxa de F</option>
                  <option value="zero">F = 0% (Nenhum acasalamento aparentado)</option>
                  <option value="inbred">F &gt; 0% (Endogâmicos)</option>
                  <option value="moderate">F &ge; 3.12% (Início de limitação reprodutiva)</option>
                  <option value="high">F &ge; 6.25% (Atenção para depressão produtiva)</option>
                  <option value="critical">F &ge; 12.50% (Crítico - Acasalamentos diretos)</option>
                </select>
              </div>

              {/* Rank Filter Selection Index */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Percentil / Rank de Seleção</label>
                <select
                  value={rankFilter}
                  onChange={(e) => setRankFilter(e.target.value)}
                  className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md text-slate-700 outline-none focus:border-indigo-500 transition-all font-medium"
                >
                  <option value="all">Todos os Animais</option>
                  <option value="top10">Top 10% Melhores Índices</option>
                  <option value="top25">Top 25% Melhores Índices</option>
                  <option value="top50">Top 50% Melhores Índices</option>
                  <option value="below_avg">Abaixo da Média Populacional</option>
                </select>
              </div>

              {/* Specific Breed Composition Selector */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Filtro de Raça Ativa</label>
                <select
                  value={breedFilter}
                  onChange={(e) => setBreedFilter(e.target.value)}
                  className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md text-slate-700 outline-none focus:border-indigo-500 transition-all font-medium"
                >
                  <option value="all">Qualquer Linhagem</option>
                  {availableBreeds.map(breed => (
                    <option key={breed} value={breed}>{breed}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Column togglers */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 uppercase tracking-wider mb-3">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Colunas do Relatório
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {Object.keys(columns).map(colKey => {
                  const labelMap: Record<string, string> = {
                    id: 'ID Animal', name: 'Nome Oficial', species: 'Espécie', sex: 'Sexo', 
                    birthDate: 'Nasc.', rebanho: 'Rebanho', manejo: 'Manejo', breedComp: 'Raças', 
                    inbreeding: 'Endogamia (F)', heterozygosity: 'Heterozigose',
                    depDesmame: 'DEP Desmame', accDesmame: 'Acurácia Desmame',
                    depSobreano: 'DEP Sobreano', accSobreano: 'Acurácia Sobreano',
                    depPE: 'DEP PE', accPE: 'Acurácia PE',
                    depAOL: 'DEP AOL', accAOL: 'Acurácia AOL',
                    depEGS: 'DEP EGS', accEGS: 'Acurácia EGS',
                    index: 'Índice Hazel'
                  };
                  const active = columns[colKey as keyof typeof columns];
                  return (
                    <button
                      key={colKey}
                      onClick={() => toggleColumn(colKey as keyof typeof columns)}
                      className="flex items-center gap-1.5 text-left text-slate-700 hover:text-slate-900 cursor-pointer"
                    >
                      {active ? (
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className="truncate">{labelMap[colKey] || colKey}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right panel: Live statistics & Preview of Table */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">
            
            {/* Real-time stats header card row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">População Filtrada</span>
                <span className="text-2xl font-black text-slate-900 mt-2">{statistics.total} <span className="text-xs font-normal text-slate-500">animais</span></span>
                <span className="text-[10px] text-slate-400 mt-1">M: {statistics.malePercent.toFixed(0)}% | F: {statistics.femalePercent.toFixed(0)}%</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Endogamia Média</span>
                <span className="text-2xl font-black text-rose-600 mt-2">{statistics.avgF.toFixed(3)}%</span>
                <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1">
                  <Percent className="w-3 h-3 text-rose-450" />
                  <span>Coeficiente F</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Heterozigose Média</span>
                <span className="text-2xl font-black text-emerald-600 mt-2">{statistics.avgH.toFixed(2)}%</span>
                <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1">
                  <Dna className="w-3 h-3 text-emerald-500" />
                  <span>Heterozigose H</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between bg-gradient-to-br from-indigo-50 to-white">
                <span className="text-[10px] text-indigo-900 font-extrabold uppercase tracking-wider">Média Índice de Seleção</span>
                <span className="text-2xl font-black text-indigo-700 mt-2">{statistics.avgIndex.toFixed(2)}</span>
                <div className="flex items-center gap-1 text-[9px] text-indigo-700 mt-1">
                  <Award className="w-3 h-3" />
                  <span>Hazel Index (Base=100)</span>
                </div>
              </div>
            </div>

            {/* Trait selective stats dashboard */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <h4 className="text-[10.5px] font-bold text-slate-500 uppercase tracking-widest mb-3">Resumo de DEPs da Seleção Corrente</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">Desmame (PD)</span>
                  <span className={`text-xs font-bold leading-none ${statistics.avgDepDesmame >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {statistics.avgDepDesmame >= 0 ? '+' : ''}{statistics.avgDepDesmame.toFixed(3)} kg
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">Sobreano (PS)</span>
                  <span className={`text-xs font-bold leading-none ${statistics.avgDepSobreano >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {statistics.avgDepSobreano >= 0 ? '+' : ''}{statistics.avgDepSobreano.toFixed(3)} kg
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">C. Escrotal (PE)</span>
                  <span className={`text-xs font-bold leading-none ${statistics.avgDepPE >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {statistics.avgDepPE >= 0 ? '+' : ''}{statistics.avgDepPE.toFixed(3)} cm
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">Olho de Lombo (AOL)</span>
                  <span className={`text-xs font-bold leading-none ${statistics.avgDepAOL >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {statistics.avgDepAOL >= 0 ? '+' : ''}{statistics.avgDepAOL.toFixed(3)} cm²
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">Gordura (EGS)</span>
                  <span className={`text-xs font-bold leading-none ${statistics.avgDepEGS >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {statistics.avgDepEGS >= 0 ? '+' : ''}{statistics.avgDepEGS.toFixed(3)} mm
                  </span>
                </div>
              </div>
            </div>

            {/* List and Actions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col min-h-[300px] overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3 justify-between shrink-0 bg-slate-50">
                <div className="relative w-full sm:w-64">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por ID, Nome, Rebanho..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-auto">
                  <button
                    onClick={exportToExcel}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Excel (Planilha)
                  </button>
                  <button
                    onClick={handlePrintPDF}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Exportar PDF / Imprimir
                  </button>
                </div>
              </div>

              {/* Data Table Preview */}
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-[9px] font-extrabold tracking-wider border-b border-slate-200">
                      {columns.id && <th className="py-2.5 px-3">ID</th>}
                      {columns.name && <th className="py-2.5 px-3">Nome</th>}
                      {columns.species && <th className="py-2.5 px-3">Espécie</th>}
                      {columns.sex && <th className="py-2.5 px-3">Sexo</th>}
                      {columns.birthDate && <th className="py-2.5 px-3">Nascimento</th>}
                      {columns.rebanho && <th className="py-2.5 px-3">Rebanho</th>}
                      {columns.manejo && <th className="py-2.5 px-3">Manejo</th>}
                      {columns.breedComp && <th className="py-2.5 px-3">Composição</th>}
                      {columns.inbreeding && <th className="py-2.5 px-3 text-right">F (%)</th>}
                      {columns.heterozygosity && <th className="py-2.5 px-3 text-right">H (%)</th>}
                      {columns.depDesmame && <th className="py-2.5 px-3 text-right">DEP Desmame</th>}
                      {columns.accDesmame && <th className="py-2.5 px-3 text-right">Acur. Desmame</th>}
                      {columns.depSobreano && <th className="py-2.5 px-3 text-right">DEP Sobreano</th>}
                      {columns.accSobreano && <th className="py-2.5 px-3 text-right">Acur. Sobreano</th>}
                      {columns.depPE && <th className="py-2.5 px-3 text-right">DEP PE</th>}
                      {columns.accPE && <th className="py-2.5 px-3 text-right">Acur. PE</th>}
                      {columns.depAOL && <th className="py-2.5 px-3 text-right">DEP AOL</th>}
                      {columns.accAOL && <th className="py-2.5 px-3 text-right">Acur. AOL</th>}
                      {columns.depEGS && <th className="py-2.5 px-3 text-right">DEP EGS</th>}
                      {columns.accEGS && <th className="py-2.5 px-3 text-right">Acur. EGS</th>}
                      {columns.index && <th className="py-2.5 px-3 text-right bg-indigo-50 font-black text-indigo-900 border-l border-indigo-100">Índice</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px] font-normal text-slate-600">
                    {filteredAnimals.length === 0 ? (
                      <tr>
                        <td colSpan={25} className="py-12 text-center text-slate-400 font-medium bg-slate-50/50">
                          Nenhum registro encontrado para a combinação de filtros correspondente.
                        </td>
                      </tr>
                    ) : (
                      filteredAnimals.map((a, idx) => {
                        const breedsString = Object.entries(a.breedComp || {})
                          .map(([b, w]) => `${b}: ${(Number(w) * 100).toFixed(0)}%`)
                          .join(', ');
                        
                        return (
                          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                            {columns.id && <td className="py-2 px-3 font-mono text-slate-500 font-semibold">{a.id}</td>}
                            {columns.name && <td className="py-2 px-3 font-bold text-slate-900">{a.name}</td>}
                            {columns.species && (
                              <td className="py-2 px-3">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                  🐂 Bovino
                                </span>
                              </td>
                            )}
                            {columns.sex && <td className="py-2 px-3">{a.sex === 'M' ? 'Macho' : 'Fêmea'}</td>}
                            {columns.birthDate && <td className="py-2 px-3 whitespace-nowrap">{a.birthDate}</td>}
                            {columns.rebanho && <td className="py-2 px-3 truncate max-w-[100px]">{a.rebanho}</td>}
                            {columns.manejo && <td className="py-2 px-3 font-mono">{a.manejo}</td>}
                            {columns.breedComp && <td className="py-2 px-3 truncate max-w-[150px] font-medium text-slate-500" title={breedsString}>{breedsString}</td>}
                            
                            {columns.inbreeding && (
                              <td className={`py-2 px-3 text-right font-mono ${a.f_inbreeding && a.f_inbreeding > 0.0625 ? 'text-red-600 font-bold bg-red-50/50' : ''}`}>
                                {((a.f_inbreeding || 0) * 100).toFixed(2)}%
                              </td>
                            )}
                            {columns.heterozygosity && (
                              <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">
                                {((a.heterozygosity || 0) * 100).toFixed(2)}%
                              </td>
                            )}

                            {columns.depDesmame && (
                              <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                                <span className={getDEP(a.id, 'pesoDesmame') >= 0 ? 'text-slate-800' : 'text-red-550'}>
                                  {getDEP(a.id, 'pesoDesmame').toFixed(3)}
                                </span>
                              </td>
                            )}
                            {columns.accDesmame && (
                              <td className="py-2 px-3 text-right font-mono whitespace-nowrap text-slate-400">
                                {Math.round(getAcc(a.id, 'pesoDesmame')*100)}%
                              </td>
                            )}
                            {columns.depSobreano && (
                              <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                                <span className={getDEP(a.id, 'pesoSobreano') >= 0 ? 'text-slate-800' : 'text-red-550'}>
                                  {getDEP(a.id, 'pesoSobreano').toFixed(3)}
                                </span>
                              </td>
                            )}
                            {columns.accSobreano && (
                              <td className="py-2 px-3 text-right font-mono whitespace-nowrap text-slate-400">
                                {Math.round(getAcc(a.id, 'pesoSobreano')*100)}%
                              </td>
                            )}
                            {columns.depPE && (
                              <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                                <span className={getDEP(a.id, 'pe') >= 0 ? 'text-slate-800' : 'text-red-550'}>
                                  {getDEP(a.id, 'pe').toFixed(3)}
                                </span>
                              </td>
                            )}
                            {columns.accPE && (
                              <td className="py-2 px-3 text-right font-mono whitespace-nowrap text-slate-400">
                                {Math.round(getAcc(a.id, 'pe')*100)}%
                              </td>
                            )}
                            {columns.depAOL && (
                              <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                                <span className={getDEP(a.id, 'aol') >= 0 ? 'text-slate-800' : 'text-red-550'}>
                                  {getDEP(a.id, 'aol').toFixed(3)}
                                </span>
                              </td>
                            )}
                            {columns.accAOL && (
                              <td className="py-2 px-3 text-right font-mono whitespace-nowrap text-slate-400">
                                {Math.round(getAcc(a.id, 'aol')*100)}%
                              </td>
                            )}
                            {columns.depEGS && (
                              <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                                <span className={getDEP(a.id, 'egs') >= 0 ? 'text-slate-800' : 'text-red-550'}>
                                  {getDEP(a.id, 'egs').toFixed(3)}
                                </span>
                              </td>
                            )}
                            {columns.accEGS && (
                              <td className="py-2 px-3 text-right font-mono whitespace-nowrap text-slate-400">
                                {Math.round(getAcc(a.id, 'egs')*100)}%
                              </td>
                            )}

                            {columns.index && (
                              <td className="py-2 px-3 text-right font-bold bg-indigo-50/50 text-indigo-700 font-mono border-l border-indigo-100">
                                {a.selectionIndexScore.toFixed(2)}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

        {/* Closing Footer of report */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 shrink-0 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Info className="w-4 h-4 text-slate-400" />
            <span>As avaliações genéticas de herdabilidade se baseiam no grupo populacional ativo de cada espécie selecionada.</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-slate-600">
            <span>Universidade Federal de Santa Maria</span>
          </div>
        </div>

      </div>
    </div>
  );
}
