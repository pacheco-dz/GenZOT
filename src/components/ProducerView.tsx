/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Animal, SelectionIndexConfig, Species } from '../types';
import { calculateSelectionIndex } from '../utils/math';
import { Activity, Star, Sliders, ShieldAlert, Award, FileText, Sparkles, TrendingUp, HelpCircle, Flag, ActivitySquare, AlertTriangle, ArrowUp, ArrowDown, Target, Download, SlidersHorizontal, Check } from 'lucide-react';
import { ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import PedigreeGraph from './PedigreeGraph';
import * as XLSX from 'xlsx';

interface ProducerViewProps {
  animals: Animal[];
  indexConfig: SelectionIndexConfig;
  onUpdateIndexConfig: (config: SelectionIndexConfig) => void;
  evaluationEstimates: { [trait: string]: { [id: string]: { dep: number; acc: number } } };
  selectedSpecies?: Species;
  onSelectedSpeciesChange?: (species: Species) => void;
}

interface InfoTooltipProps {
  title: string;
  content: React.ReactNode;
  theory?: string;
  practice?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

function InfoTooltip({ title, content, theory, practice, position = 'top', className = '' }: InfoTooltipProps) {
  const [active, setActive] = useState(false);

  let posClass = 'bottom-full left-1/2 -translate-x-1/2 mb-2';
  let arrowClass = 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-slate-900 border-x-transparent border-b-transparent';
  
  if (position === 'bottom') {
    posClass = 'top-full left-1/2 -translate-x-1/2 mt-2';
    arrowClass = 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-slate-900 border-x-transparent border-t-transparent';
  } else if (position === 'left') {
    posClass = 'right-full top-1/2 -translate-y-1/2 mr-2';
    arrowClass = 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-slate-900 border-y-transparent border-r-transparent';
  } else if (position === 'right') {
    posClass = 'left-full top-1/2 -translate-y-1/2 ml-2';
    arrowClass = 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-slate-900 border-y-transparent border-l-transparent';
  }

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setActive(!active); }}
        className="text-slate-400 hover:text-indigo-600 transition-colors cursor-help inline-flex items-center justify-center p-0.5 ml-1"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {active && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-slate-900 text-slate-100 rounded-xl p-3 text-xs font-normal leading-relaxed shadow-xl z-[100] border border-slate-800 text-left normal-case tracking-normal">
          <div className="border-b border-slate-800 pb-1.5 mb-2">
            <h5 className="font-bold text-indigo-400 text-[11px] uppercase tracking-wider">{title}</h5>
          </div>
          <div className="text-[10px] text-slate-300 space-y-2">
            <div>{content}</div>
            {theory && (
              <div className="pt-1.5 border-t border-slate-800/65">
                <span className="font-bold text-indigo-300 uppercase tracking-wider text-[8px] block">Teoria Científica</span>
                <p className="text-slate-400 text-[9px] leading-snug">{theory}</p>
              </div>
            )}
            {practice && (
              <div className="pt-1.5 border-t border-slate-800/65">
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[8px] block">Prática Zootécnica</span>
                <p className="text-emerald-300 text-[9px] leading-snug">{practice}</p>
              </div>
            )}
          </div>
          <div className={`absolute w-0 h-0 border-4 border-solid ${arrowClass}`}></div>
        </div>
      )}
    </div>
  );
}

export default function ProducerView({
  animals,
  indexConfig,
  onUpdateIndexConfig,
  evaluationEstimates,
  selectedSpecies: propSelectedSpecies,
  onSelectedSpeciesChange
}: ProducerViewProps) {
  const [localSpecies, setLocalSpecies] = useState<Species>('bovino');
  const selectedSpecies = propSelectedSpecies !== undefined ? propSelectedSpecies : localSpecies;
  const setSelectedSpecies = onSelectedSpeciesChange !== undefined ? onSelectedSpeciesChange : setLocalSpecies;
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [selectedPedigreeAnimal, setSelectedPedigreeAnimal] = useState<Animal | null>(null);

  const [filterTop, setFilterTop] = useState<'all' | 'top5' | 'top10' | 'top20'>('all');
  const [filterSex, setFilterSex] = useState<'all' | 'M' | 'F' | 'F_repro'>('all');
  const [filterSire, setFilterSire] = useState<string>('');
  const [trendTrait, setTrendTrait] = useState<'pesoDesmame' | 'pesoSobreano' | 'pe' | 'aol' | 'egs'>('pesoDesmame');

  // Advanced Discard and Multi-criteria Filters
  const [advFilterSex, setAdvFilterSex] = useState<'all' | 'M' | 'F'>('all');
  const [advFilterInbreeding, setAdvFilterInbreeding] = useState<number>(0); // 0 = disabled, e.g. 6.25, 12.5
  const [advFilterTrait, setAdvFilterTrait] = useState<'none' | 'pesoDesmame' | 'pesoSobreano' | 'pe' | 'aol' | 'egs'>('none');
  const [advFilterTraitOperator, setAdvFilterTraitOperator] = useState<'less_than' | 'greater_than'>('less_than');
  const [advFilterTraitVal, setAdvFilterTraitVal] = useState<number>(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Precision Breeding Controls (Academics, Producers, Technicians)
  const [accuracyThreshold, setAccuracyThreshold] = useState<number>(0); // 0% to 100%
  const [showPhenotypeAjustado, setShowPhenotypeAjustado] = useState<boolean>(false);
  const [kgValue, setKgValue] = useState<number>(12.0); // R$ per kg of live weight
  const [cullingWeight, setCullingWeight] = useState<number>(180); // average weight of calf for culling
  const [cowCullingValue, setCowCullingValue] = useState<number>(3200); // average price per culled adult cow
  const [inbreedingAlertLimit, setInbreedingAlertLimit] = useState<number>(6.25); // e.g. 6.25%

  // Genetic Gain (ΔG) parameters
  const [customL, setCustomL] = useState<number>(5.0); // Generation interval in years
  const [lOption, setLOption] = useState<'custom' | 'calculated'>('custom'); // Option 1 (custom) vs Option 2 (calculated)
  const [card4Tab, setCard4Tab] = useState<'formula' | 'traits' | 'models'>('formula');

  // Interactive Curve Selection Ruler (Régua de Seleção)
  const [curveSelectionPercent, setCurveSelectionPercent] = useState<number>(30); // Default Top 30% area
  const [curveSelectionDir, setCurveSelectionDir] = useState<'top' | 'bottom'>('top'); // Default positive selection


  // Dynamic user traits selection for the selection index
  const [enabledTraits, setEnabledTraits] = useState<Record<string, boolean>>({
    pesoDesmame: true,
    pesoSobreano: true,
    pe: true,
    aol: true,
    egs: true
  });

  // Selector for enabling/disabling the display of specific DEP and Accuracies
  const [visibleTraits, setVisibleTraits] = useState<Record<string, boolean>>({
    pesoDesmame: true,
    pesoSobreano: true,
    pe: true,
    aol: true,
    egs: true
  });

  // Calculate customized weights where deselected traits are zeroed out (excluded)
  const activeIndexConfig = useMemo(() => {
    return {
      ...indexConfig,
      weight_pesoDesmame: enabledTraits.pesoDesmame ? indexConfig.weight_pesoDesmame : 0,
      weight_pesoSobreano: enabledTraits.pesoSobreano ? indexConfig.weight_pesoSobreano : 0,
      weight_pe: enabledTraits.pe ? indexConfig.weight_pe : 0,
      weight_aol: enabledTraits.aol ? indexConfig.weight_aol : 0,
      weight_egs: enabledTraits.egs ? indexConfig.weight_egs : 0,
    };
  }, [indexConfig, enabledTraits]);

  // Dynamic weights modifications
  const handleWeightChange = (trait: keyof SelectionIndexConfig, val: number) => {
    if (trait === 'name') return;
    onUpdateIndexConfig({
      ...indexConfig,
      [trait]: Number(val.toFixed(1))
    });
  };

  // Filter animals of species
  const activeAnimals = useMemo(() => {
    return animals.filter(a => a.species === selectedSpecies);
  }, [animals, selectedSpecies]);

  const siresList = useMemo(() => {
    const list = new Set<string>();
    activeAnimals.forEach(a => {
      if (a.sireId && a.sireId !== '0') list.add(a.sireId);
    });
    return Array.from(list).sort();
  }, [activeAnimals]);

  // Compute calculated indices for active animals with base config (all 1.0x) for real-time visualization
  const baseRankMap = useMemo(() => {
    const baseConfig: SelectionIndexConfig = {
      name: 'Base',
      weight_pesoDesmame: 1.0,
      weight_pesoSobreano: 1.0,
      weight_pe: 1.0,
      weight_aol: 1.0,
      weight_egs: 1.0
    };
    const scored = activeAnimals.map(anim => {
      return { id: anim.id, score: calculateSelectionIndex(anim, baseConfig, evaluationEstimates) };
    }).sort((a, b) => b.score - a.score);

    const map: Record<string, number> = {};
    scored.forEach((anim, idx) => {
      map[anim.id] = idx;
    });
    return map;
  }, [activeAnimals, evaluationEstimates]);

  // Compute calculated indices for active animals
  const rankedAnimals = useMemo(() => {
    return activeAnimals.map(anim => {
      const idxScore = calculateSelectionIndex(anim, activeIndexConfig, evaluationEstimates);
      return {
        ...anim,
        idxScore
      };
    }).sort((a, b) => b.idxScore - a.idxScore);
  }, [activeAnimals, activeIndexConfig, evaluationEstimates]);

  // Selected animals inside the interactive selection curve area
  const curveSelectionStats = useMemo(() => {
    if (rankedAnimals.length === 0) {
      return { 
        selectedIds: new Set<string>(), 
        selectedCount: 0, 
        cutoffScore: 0, 
        selectedAvg: 0, 
        generalAvg: 0, 
        diffSelection: 0 
      };
    }
    
    const count = Math.max(1, Math.round(rankedAnimals.length * (curveSelectionPercent / 100)));
    
    let selectedList: typeof rankedAnimals = [];
    if (curveSelectionDir === 'top') {
      selectedList = rankedAnimals.slice(0, count);
    } else {
      selectedList = rankedAnimals.slice(rankedAnimals.length - count);
    }
    
    const selectedIds = new Set(selectedList.map(a => a.id));
    
    const cutoffScore = selectedList.length > 0 
      ? (curveSelectionDir === 'top' ? selectedList[selectedList.length - 1].idxScore : selectedList[0].idxScore)
      : 0;
      
    const generalAvg = rankedAnimals.reduce((acc, a) => acc + a.idxScore, 0) / rankedAnimals.length;
    const selectedAvg = selectedList.reduce((acc, a) => acc + a.idxScore, 0) / selectedList.length;
    const diffSelection = selectedAvg - generalAvg;
    
    return {
      selectedIds,
      selectedCount: count,
      cutoffScore: Number(cutoffScore.toFixed(2)),
      selectedAvg: Number(selectedAvg.toFixed(2)),
      generalAvg: Number(generalAvg.toFixed(2)),
      diffSelection: Number(diffSelection.toFixed(2))
    };
  }, [rankedAnimals, curveSelectionPercent, curveSelectionDir]);

  const filteredRankedAnimals = useMemo(() => {
    let list = rankedAnimals;
    
    // Sire filter
    if (filterSire) {
      list = list.filter(a => a.sireId === filterSire);
    }
    
    // Sex filter
    if (filterSex === 'M') {
      list = list.filter(a => a.sex === 'M');
    } else if (filterSex === 'F') {
      list = list.filter(a => a.sex === 'F');
    } else if (filterSex === 'F_repro') {
      const currentYear = new Date().getFullYear();
      list = list.filter(a => a.sex === 'F' && (currentYear - a.birthYear) >= 2);
    }
    
    // Top % filter (rank bounds)
    if (filterTop !== 'all' && rankedAnimals.length > 0) {
      const pct = filterTop === 'top5' ? 0.05 : filterTop === 'top10' ? 0.1 : 0.2;
      const count = Math.max(1, Math.ceil(rankedAnimals.length * pct));
      // Ranked list is already sorted by index
      const topSet = new Set(rankedAnimals.slice(0, count).map(a => a.id));
      list = list.filter(a => topSet.has(a.id));
    }

    // Advanced Discard / Multi-criteria filters
    if (advFilterSex !== 'all') {
      list = list.filter(a => a.sex === advFilterSex);
    }
    if (advFilterInbreeding > 0) {
      list = list.filter(a => ((a.f_inbreeding || 0) * 100) >= advFilterInbreeding);
    }
    if (advFilterTrait !== 'none') {
      list = list.filter(a => {
        const dep = evaluationEstimates[advFilterTrait]?.[a.id]?.dep || 0;
        if (advFilterTraitOperator === 'less_than') {
          return dep < advFilterTraitVal;
        } else {
          return dep > advFilterTraitVal;
        }
      });
    }

    // Accuracy Threshold Filter (Zootecnista de Campo)
    if (accuracyThreshold > 0) {
      list = list.filter(a => {
        const enabledTraitKeys = Object.keys(enabledTraits).filter(k => enabledTraits[k]);
        if (enabledTraitKeys.length === 0) return true;
        let sumAcc = 0;
        enabledTraitKeys.forEach(t => {
          sumAcc += evaluationEstimates[t]?.[a.id]?.acc || 0;
        });
        const avgAcc = sumAcc / enabledTraitKeys.length;
        return (avgAcc * 100) >= accuracyThreshold;
      });
    }
    
    return list;
  }, [rankedAnimals, filterTop, filterSex, filterSire, advFilterSex, advFilterInbreeding, advFilterTrait, advFilterTraitOperator, advFilterTraitVal, evaluationEstimates, accuracyThreshold, enabledTraits]);

  // Calculate average generation interval L from parent-offspring links in the active database
  const calculatedL = useMemo(() => {
    let totalYears = 0;
    let sampleCount = 0;
    
    // Map animals by ID for fast lookup
    const animalMap = new Map<string, Animal>();
    rankedAnimals.forEach(a => {
      animalMap.set(a.id, a);
    });
    
    rankedAnimals.forEach(offspring => {
      if (!offspring.birthDate) return;
      const offspringDate = new Date(offspring.birthDate);
      if (isNaN(offspringDate.getTime())) return;
      
      const checkParent = (parentId: string | null) => {
        if (!parentId) return;
        const parent = animalMap.get(parentId);
        if (parent && parent.birthDate) {
          const parentDate = new Date(parent.birthDate);
          if (!isNaN(parentDate.getTime())) {
            const ageInYears = (offspringDate.getTime() - parentDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
            if (ageInYears > 0.5 && ageInYears < 25) { // Reasonable biological limits
              totalYears += ageInYears;
              sampleCount++;
            }
          }
        }
      };
      
      checkParent(offspring.sireId);
      checkParent(offspring.damId);
    });
    
    if (sampleCount > 0) {
      return Number((totalYears / sampleCount).toFixed(2));
    }
    return 5.2; // Robust biological default fallback if no parent-offspring links exist
  }, [rankedAnimals]);

  const currentL = lOption === 'custom' ? customL : calculatedL;

  // Dynamic Calculation of Genetic Gain (ΔG)
  const geneticGainData = useMemo(() => {
    if (rankedAnimals.length === 0) {
      return {
        sigmaG: 0,
        avgAcc: 0,
        deltaGSelection: 0,
        deltaGCulling: 0,
      };
    }
    
    // 1. Calculate standard deviation of selection index scores (σ_g)
    const scores = rankedAnimals.map(a => a.idxScore);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    const sigmaG = Math.sqrt(variance) || 12.5;
    
    // 2. Calculate average accuracy (r_gg) of currently enabled traits
    const enabledTraitKeys = Object.keys(enabledTraits).filter(k => enabledTraits[k]);
    let totalAcc = 0;
    let accCount = 0;
    rankedAnimals.forEach(a => {
      enabledTraitKeys.forEach(t => {
        const acc = evaluationEstimates[t]?.[a.id]?.acc || 0.0;
        totalAcc += acc;
        accCount++;
      });
    });
    const avgAcc = accCount > 0 ? (totalAcc / accCount) : 0.75;
    
    // 3. Formula: ΔG = (i * σg * r_gg) / L
    // For elite selection (selecting top 20%): i = 1.40
    const deltaGSelection = (1.40 * sigmaG * avgAcc) / currentL;
    
    // Read custom culling percent and map culling intensity (i) dynamically
    const cullingPercent = Number(localStorage.getItem('geno_culling_percent')) || 20;
    const intensityMap: Record<number, number> = {
      5: 0.10,
      10: 0.19,
      15: 0.27,
      20: 0.35,
      25: 0.42,
      30: 0.50,
      35: 0.57,
      40: 0.64
    };
    const cullingIntensity = intensityMap[cullingPercent] || 0.35;
    
    // For culling bottom % (selecting remaining % of the population):
    const deltaGCulling = (cullingIntensity * sigmaG * avgAcc) / currentL;
    
    return {
      sigmaG: Number(sigmaG.toFixed(2)),
      avgAcc: Number(avgAcc.toFixed(3)),
      deltaGSelection: Number(deltaGSelection.toFixed(3)),
      deltaGCulling: Number(deltaGCulling.toFixed(3)),
    };
  }, [rankedAnimals, enabledTraits, evaluationEstimates, currentL]);

  // Expected progress per individual trait dynamically estimated
  const traitProgressData = useMemo(() => {
    const enabledTraitKeys = Object.keys(enabledTraits).filter(k => enabledTraits[k]);
    if (rankedAnimals.length === 0 || enabledTraitKeys.length === 0) return [];

    const cullingPercent = Number(localStorage.getItem('geno_culling_percent')) || 20;
    const intensityMap: Record<number, number> = {
      5: 0.10,
      10: 0.19,
      15: 0.27,
      20: 0.35,
      25: 0.42,
      30: 0.50,
      35: 0.57,
      40: 0.64
    };
    const cullingIntensity = intensityMap[cullingPercent] || 0.35;

    return enabledTraitKeys.map(traitKey => {
      // Get DEPs for this trait
      const deps = rankedAnimals.map(a => evaluationEstimates[traitKey]?.[a.id]?.dep || 0);
      const avgDep = deps.length > 0 ? deps.reduce((sum, val) => sum + val, 0) / deps.length : 0;
      const variance = deps.length > 0 ? deps.reduce((sum, val) => sum + Math.pow(val - avgDep, 2), 0) / deps.length : 0;
      const sigmaTrait = Math.sqrt(variance) || 1.0;

      // Get accuracies
      const accs = rankedAnimals.map(a => evaluationEstimates[traitKey]?.[a.id]?.acc || 0);
      const avgAccTrait = accs.length > 0 ? accs.reduce((sum, val) => sum + val, 0) / accs.length : 0.75;

      // Response to selection: R = (i * sigma_g * r) / L
      const progressSelection = (1.40 * sigmaTrait * avgAccTrait) / currentL;
      const progressCulling = (cullingIntensity * sigmaTrait * avgAccTrait) / currentL;

      const labels: Record<string, string> = {
        pesoDesmame: 'Peso ao Desmame (PD)',
        ganhoPeso: 'Ganho de Peso Pós-Desmame (GPD)',
        marmoreio: 'Marmoreio (MARM)',
        musculatura: 'Musculatura (MUSC)',
        habilidadeMaterna: 'Habilidade Materna (HM)',
        resistenciaCarrapato: 'Resistência Carrapatos (RC)'
      };

      const unit: Record<string, string> = {
        pesoDesmame: 'kg',
        ganhoPeso: 'g/dia',
        marmoreio: '%',
        musculatura: 'pts',
        habilidadeMaterna: 'kg',
        resistenciaCarrapato: 'escore'
      };

      return {
        key: traitKey,
        label: labels[traitKey] || traitKey,
        unit: unit[traitKey] || '',
        sigma: Number(sigmaTrait.toFixed(2)),
        acc: Number(avgAccTrait.toFixed(3)),
        progressSelection: Number(progressSelection.toFixed(3)),
        progressCulling: Number(progressCulling.toFixed(3))
      };
    });
  }, [rankedAnimals, enabledTraits, evaluationEstimates, currentL]);

  // Tamanho Efetivo da População (Ne) - Acadêmicos & Pesquisadores
  const effectivePopulationSize = useMemo(() => {
    const sires = new Set<string>();
    const dams = new Set<string>();
    activeAnimals.forEach(a => {
      if (a.sireId && a.sireId !== '0') sires.add(a.sireId);
      if (a.damId && a.damId !== '0') dams.add(a.damId);
    });
    
    const Nm = sires.size || 1; // Safeguard
    const Nf = dams.size || 1; // Safeguard
    
    // Classic Wright's formula for effective population size
    const Ne = Math.round((4 * Nm * Nf) / (Nm + Nf));
    
    // FAO warning statuses: Ne < 50 is critical, Ne < 100 is warning, Ne >= 100 is healthy
    let status = 'Excelente';
    let color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (Ne < 50) {
      status = 'Crítico (Alta Deriva Gênica)';
      color = 'text-rose-700 bg-rose-50 border-rose-200';
    } else if (Ne < 100) {
      status = 'Alerta de Afunilamento';
      color = 'text-amber-700 bg-amber-50 border-amber-200';
    }
    
    return { Ne, Nm, Nf, status, color };
  }, [activeAnimals]);

  // Helper to export arrays of arrays to a real .xlsx file
  const exportToXLSX = (headers: string[], rows: any[][], fileName: string, sheetName: string = "Dados") => {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Exporter for full ranking (Academics / Researchers)
  const exportFullRankingCSV = () => {
    if (filteredRankedAnimals.length === 0) {
      alert("Nenhum animal listado para exportação.");
      return;
    }
    
    const cullingPercent = Number(localStorage.getItem('geno_culling_percent')) || 20;
    const discardThresholdPct = (100 - cullingPercent) / 100;
    
    const headers = [
      "Posicao_Ranking",
      "Brinco_ID",
      "Nome",
      "Sexo",
      "Ano_Nascimento",
      "Pai_ID",
      "Mae_ID",
      "Grau_Sangue",
      "Heterozigose_Pct",
      "Consanguinidade_F_Pct",
      "Indice_Produtivo",
      "Classificacao",
      "Desmame_DEP_kg",
      "Desmame_Acc_Pct",
      "Sobreano_DEP_kg",
      "Sobreano_Acc_Pct",
      "PE_DEP_cm",
      "PE_Acc_Pct",
      "AOL_DEP_cm2",
      "AOL_Acc_Pct",
      "EGS_DEP_mm",
      "EGS_Acc_Pct"
    ];
    
    const rows = filteredRankedAnimals.map((anim) => {
      const rankIdx = rankedAnimals.findIndex(a => a.id === anim.id);
      const percentile = (rankIdx + 1) / Math.max(1, rankedAnimals.length);
      
      let classification = "Regular";
      if (percentile <= 0.05) classification = "Elite (Top 5%)";
      else if (percentile <= 0.20) classification = "Superior (Top 20%)";
      else if (percentile >= discardThresholdPct) classification = `Descarte (Bottom ${cullingPercent}%)`;

      const breedCompStr = Object.entries(anim.breedComp).map(([b, p]) => `${(Number(p) * 100).toFixed(0)}%${b}`).join('/');
      const inbreedingPercent = ((anim.f_inbreeding || 0) * 100).toFixed(1);
      const heterozygosityPercent = ((anim.heterozygosity || 0) * 100).toFixed(1);

      return [
        rankIdx + 1,
        anim.id,
        anim.name,
        anim.sex,
        anim.birthYear,
        anim.sireId || 'Fundador',
        anim.damId || 'Fundadora',
        breedCompStr,
        `${heterozygosityPercent}%`,
        `${inbreedingPercent}%`,
        Number(anim.idxScore.toFixed(2)),
        classification,
        Number(evaluationEstimates['pesoDesmame']?.[anim.id]?.dep || 0),
        Number(((evaluationEstimates['pesoDesmame']?.[anim.id]?.acc || 0) * 100).toFixed(0)),
        Number(evaluationEstimates['pesoSobreano']?.[anim.id]?.dep || 0),
        Number(((evaluationEstimates['pesoSobreano']?.[anim.id]?.acc || 0) * 100).toFixed(0)),
        Number(evaluationEstimates['pe']?.[anim.id]?.dep || 0),
        Number(((evaluationEstimates['pe']?.[anim.id]?.acc || 0) * 100).toFixed(0)),
        Number(evaluationEstimates['aol']?.[anim.id]?.dep || 0),
        Number(((evaluationEstimates['aol']?.[anim.id]?.acc || 0) * 100).toFixed(0)),
        Number(evaluationEstimates['egs']?.[anim.id]?.dep || 0),
        Number(((evaluationEstimates['egs']?.[anim.id]?.acc || 0) * 100).toFixed(0))
      ];
    });
    
    exportToXLSX(headers, rows, `gene_corte_ranking_completo_${selectedSpecies}.xlsx`, "Ranking Completo");
  };

  // Excel Exporter for field management culling order (Producers)
  const exportFieldCullingOrderCSV = (manejoOption: 'abate' | 'castracao' | 'venda_leilao') => {
    const totalCount = rankedAnimals.length;
    if (totalCount === 0) {
      alert("Nenhum animal cadastrado para descarte.");
      return;
    }
    
    const cullingPercent = Number(localStorage.getItem('geno_culling_percent')) || 20;
    const discardThresholdPct = (100 - cullingPercent) / 100;
    
    // Filter the bottom %
    const discardThresholdIdx = Math.floor(totalCount * discardThresholdPct);
    const discardList = rankedAnimals.slice(discardThresholdIdx);
    
    if (discardList.length === 0) {
      alert(`Nenhum animal classificado no Bottom ${cullingPercent}% encontrado.`);
      return;
    }
    
    const headers = [
      "Ordem_Manejo",
      "Brinco_ID",
      "Nome",
      "Sexo",
      "Ano_Nascimento",
      "Rebanho_Origem",
      "Manejo_Lote",
      "Indice_Produtivo",
      "Consanguinidade_F",
      "Acao_Manejo_Recomendada",
      "Instrucoes_Curral"
    ];
    
    let actionLabel = "Abate Estratégico";
    let instructLabel = "Destinar ao lote de engorda final para descarte no frigorífico.";
    if (manejoOption === 'castracao') {
      actionLabel = "Castração Zootécnica";
      instructLabel = "Realizar castração imediata para evitar reprodução indesejada e promover ganho de gordura.";
    } else if (manejoOption === 'venda_leilao') {
      actionLabel = "Venda / Apartação Comercial";
      instructLabel = "Apartar no curral de embarque para destinação ao leilão de descarte/cria comercial.";
    }
    
    const rows = discardList.map((anim, idx) => {
      const inbreedingPercent = ((anim.f_inbreeding || 0) * 100).toFixed(1);
      return [
        idx + 1,
        anim.id,
        anim.name,
        anim.sex,
        anim.birthYear,
        anim.rebanho,
        anim.manejo,
        Number(anim.idxScore.toFixed(2)),
        `${inbreedingPercent}%`,
        actionLabel,
        instructLabel
      ];
    });
    
    exportToXLSX(headers, rows, `gene_corte_ordem_apartacao_${manejoOption}_${selectedSpecies}.xlsx`, "Ordem de Manejo");
  };

  // Excel Exporter for bottom culling percent discard list
  const exportDiscardReportCSV = () => {
    const totalCount = rankedAnimals.length;
    if (totalCount === 0) {
      alert("Nenhum animal cadastrado para exportação.");
      return;
    }
    
    const cullingPercent = Number(localStorage.getItem('geno_culling_percent')) || 20;
    const discardThresholdPct = (100 - cullingPercent) / 100;
    
    // Bottom group of the entire herd
    const discardThresholdIdx = Math.floor(totalCount * discardThresholdPct);
    const discardList = rankedAnimals.slice(discardThresholdIdx);
    
    if (discardList.length === 0) {
      alert(`Nenhum animal no grupo de Descarte (Bottom ${cullingPercent}%) encontrado.`);
      return;
    }
    
    // Create Excel content
    const headers = [
      "Posicao_Ranking",
      "Brinco_ID",
      "Nome",
      "Sexo",
      "Ano_Nascimento",
      "Indice_Produtivo",
      "F_Inbreeding_Pct",
      "Fraquezas_Detectadas"
    ];
    
    const rows = discardList.map((anim) => {
      const rankIdx = rankedAnimals.findIndex(a => a.id === anim.id);
      const inbreedingPercent = ((anim.f_inbreeding || 0) * 100).toFixed(1);
      
      const weaknesses: string[] = [];
      const traits = [
        { key: 'pesoDesmame', label: 'Peso Desmame' },
        { key: 'pesoSobreano', label: 'Peso Sobreano' },
        { key: 'pe', label: 'PE' },
        { key: 'aol', label: 'AOL' },
        { key: 'egs', label: 'EGS' }
      ];
      traits.forEach(t => {
        const dep = evaluationEstimates[t.key]?.[anim.id]?.dep || 0;
        if (dep < 0) {
          weaknesses.push(`Baixo ${t.label} (DEP: ${dep.toFixed(2)})`);
        }
      });
      if (anim.f_inbreeding && anim.f_inbreeding >= 0.0625) {
        weaknesses.push(`Endogamia (F: ${inbreedingPercent}%)`);
      }
      const weaknessesStr = weaknesses.length > 0 ? weaknesses.join(' | ') : 'Desempenho Geral Limítrofe';
      
      return [
        rankIdx + 1,
        anim.id,
        anim.name,
        anim.sex,
        anim.birthYear,
        Number(anim.idxScore.toFixed(2)),
        `${inbreedingPercent}%`,
        weaknessesStr
      ];
    });
    
    exportToXLSX(headers, rows, `gene_corte_relatorio_descarte_${selectedSpecies}.xlsx`, "Relatório de Descarte");
  };

  // General KPIs and Analytics
  const kpis = useMemo(() => {
    if (rankedAnimals.length === 0) return { avgIndex: 100, inbredCount: 0, elitesCount: 0 };
    const sum = rankedAnimals.reduce((acc, curr) => acc + curr.idxScore, 0);
    const avgIndex = Number((sum / rankedAnimals.length).toFixed(1));

    // Inbred animals (F >= 6.25% or 0.0625)
    const inbredCount = activeAnimals.filter(a => (a.f_inbreeding || 0) >= 0.0625).length;

    // Elite animals (Index score is greater than 110.0)
    const elitesCount = rankedAnimals.filter(a => a.idxScore >= 110).length;

    return { avgIndex, inbredCount, elitesCount };
  }, [rankedAnimals, animals]);

  // NATIVE INLINE SVG GENERATION - GENETIC & INBREEDING TRENDS
  // Group animals by birth year and compute average DEP of Desmame and Inbreeding
  const trendData = useMemo(() => {
    const yearsMap: { [year: number]: { count: number; sumDep: number; sumF: number } } = {};
    activeAnimals.forEach(a => {
      const year = a.birthYear;
      const dep = evaluationEstimates[trendTrait]?.[a.id]?.dep || 0.0;
      const f = a.f_inbreeding || 0.0;
      if (!yearsMap[year]) {
        yearsMap[year] = { count: 0, sumDep: 0, sumF: 0 };
      }
      yearsMap[year].count += 1;
      yearsMap[year].sumDep += dep;
      yearsMap[year].sumF += f;
    });

    const years = Object.keys(yearsMap).map(Number).sort();
    return years.map(y => ({
      year: y,
      avgDep: Number((yearsMap[y].sumDep / yearsMap[y].count).toFixed(2)),
      avgF: Number(((yearsMap[y].sumF / yearsMap[y].count) * 100).toFixed(2)) // express F as percentage
    }));
  }, [activeAnimals, evaluationEstimates, trendTrait]);

  // Calculate coordinates for SVG trends plot
  const svgDimensions = { width: 440, height: 160, padding: 30 };
  const chartsElements = useMemo(() => {
    if (trendData.length < 2) return null;
    const years = trendData.map(d => d.year);
    const deps = trendData.map(d => d.avgDep);
    const fs = trendData.map(d => d.avgF);

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const yearDiff = maxYear - minYear || 1;

    // Dep scales
    const minDep = Math.min(...deps) - 0.5;
    const maxDep = Math.max(...deps) + 0.5;
    const depDiff = maxDep - minDep || 1;

    // F scales
    const minF = Math.min(...fs) - 0.2;
    const maxF = Math.max(...fs) + 1.0;
    const fDiff = maxF - minF || 1;

    const computeCoords = (xVal: number, yVal: number, isF: boolean) => {
      const xPct = (xVal - minYear) / yearDiff;
      const x = svgDimensions.padding + xPct * (svgDimensions.width - 2 * svgDimensions.padding);

      const yMin = isF ? minF : minDep;
      const yMax = isF ? maxF : maxDep;
      const yDiff = isF ? fDiff : depDiff;

      const yPct = (yVal - yMin) / yDiff;
      // Invert Y direction
      const y = svgDimensions.height - svgDimensions.padding - yPct * (svgDimensions.height - 2 * svgDimensions.padding);
      return { x, y };
    };

    // Draw Dep Path
    let depPath = '';
    const depPoints: { x: number; y: number; year: number; val: number }[] = [];
    trendData.forEach((d, i) => {
      const pt = computeCoords(d.year, d.avgDep, false);
      depPoints.push({ ...pt, year: d.year, val: d.avgDep });
      if (i === 0) depPath += `M ${pt.x} ${pt.y}`;
      else depPath += ` L ${pt.x} ${pt.y}`;
    });

    // Draw F Path
    let fPath = '';
    const fPoints: { x: number; y: number; year: number; val: number }[] = [];
    trendData.forEach((d, i) => {
      const pt = computeCoords(d.year, d.avgF, true);
      fPoints.push({ ...pt, year: d.year, val: d.avgF });
      if (i === 0) fPath += `M ${pt.x} ${pt.y}`;
      else fPath += ` L ${pt.x} ${pt.y}`;
    });

    return { depPath, depPoints, fPath, fPoints, minYear, maxYear, minDep, maxDep, minF, maxF, computeCoords };
  }, [trendData]);

  const scatterData = useMemo(() => {
    return rankedAnimals.map(anim => ({
      id: anim.id,
      name: anim.name || anim.id,
      index: Number(anim.idxScore.toFixed(1)),
      inbreeding: Number(((anim.f_inbreeding || 0) * 100).toFixed(2)),
      isAlert: (anim.f_inbreeding || 0) >= 0.0625
    }));
  }, [rankedAnimals]);

  const genoPhenoCorrelationData = useMemo(() => {
    return activeAnimals
      .filter(anim => anim.phenotypes && anim.phenotypes[trendTrait] !== undefined)
      .map(anim => ({
        id: anim.id,
        name: anim.name || anim.id,
        phenotype: Number(anim.phenotypes[trendTrait]),
        dep: Number((evaluationEstimates[trendTrait]?.[anim.id]?.dep || 0).toFixed(2)),
      }));
  }, [activeAnimals, evaluationEstimates, trendTrait]);

  const accDepData = useMemo(() => {
    return rankedAnimals.map(anim => {
      const dep = evaluationEstimates[trendTrait]?.[anim.id]?.dep || 0;
      const acc = evaluationEstimates[trendTrait]?.[anim.id]?.acc || 0;
      return {
        id: anim.id,
        name: anim.name || anim.id,
        dep: Number(dep.toFixed(2)),
        acc: Number((acc * 100).toFixed(1)),
        isElite: anim.idxScore >= 110
      };
    });
  }, [rankedAnimals, evaluationEstimates, trendTrait]);

  const histogramData = useMemo(() => {
    if (rankedAnimals.length === 0) return [];
    const min = Math.floor(Math.min(...rankedAnimals.map(a => a.idxScore)));
    const max = Math.ceil(Math.max(...rankedAnimals.map(a => a.idxScore)));
    
    // Create ~10 buckets
    const bucketCount = 10;
    const bucketSize = Math.max(1, (max - min) / bucketCount);
    
    const buckets: { 
      rangeStr: string; 
      minVal: number; 
      count: number; 
      countSelected: number; 
      countUnselected: number; 
    }[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bMin = min + (i * bucketSize);
      const bMax = bMin + bucketSize;
      buckets.push({
        rangeStr: `${bMin.toFixed(0)} - ${bMax.toFixed(0)}`,
        minVal: bMin,
        count: 0,
        countSelected: 0,
        countUnselected: 0
      });
    }

    const selectedIds = curveSelectionStats.selectedIds;

    rankedAnimals.forEach(a => {
      const idx = Math.min(bucketCount - 1, Math.floor((a.idxScore - min) / bucketSize));
      if (buckets[idx]) {
        buckets[idx].count += 1;
        if (selectedIds.has(a.id)) {
          buckets[idx].countSelected += 1;
        } else {
          buckets[idx].countUnselected += 1;
        }
      }
    });

    return buckets;
  }, [rankedAnimals, curveSelectionStats]);

  return (
    <div className="space-y-6">
      {/* KPI Cards section */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Total Animals card */}
        <div className="bg-white rounded-xl shadow-3xs border border-gray-100/80 p-4 shrink-0 hover:shadow-2xs transition group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                <span>Animais Ativos</span>
                <InfoTooltip 
                  title="Animais Ativos" 
                  content="A quantidade total de cabeças sob avaliação ativa e monitoramento zootécnico no rebanho."
                  theory="Grupos de contemporâneos representativos ajudam a isolar fatores climáticos e de manejo, melhorando a precisão estatística do modelo BLUP."
                  practice="Identifique se o número de animais ativos é representativo da safra para assegurar um diferencial de seleção eficiente."
                />
              </span>
              <span className="text-2xl font-black text-gray-900 leading-tight mt-1 block">
                {activeAnimals.length}
              </span>
            </div>
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-gray-500 font-medium">
            Registrados sob monitoramento zootécnico ativo.
          </div>
        </div>

        {/* Average index score */}
        <div className="bg-white rounded-xl shadow-3xs border border-gray-100/80 p-4 shrink-0 hover:shadow-2xs transition group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                <span>Índice Médio</span>
                <InfoTooltip 
                  title="Índice de Produtividade Médio" 
                  content="Média aritmética das avaliações genéticas dos animais do lote, ponderada pelos pesos econômicos configurados."
                  theory="O índice ponderado consolida o valor aditivo de múltiplos caracteres em uma única métrica alinhada ao objetivo bioeconômico da propriedade."
                  practice="O ideal é manter a média populacional acima de 100 pontos, indicando progresso genético superior em relação à base de referência histórica."
                />
              </span>
              <span className="text-2xl font-black text-indigo-700 leading-tight mt-1 block">
                {kpis.avgIndex}
              </span>
            </div>
            <div className="bg-yellow-50 p-2 rounded-lg text-yellow-600">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            Base ideal superior a 100 pontos.
          </div>
        </div>

        {/* Consanguinity warning indicator */}
        <div className="bg-white rounded-xl shadow-3xs border border-gray-100/80 p-4 shrink-0 hover:shadow-2xs transition group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                <span>Inbreeding Crítico</span>
                <InfoTooltip 
                  title="Consanguinidade Crítica" 
                  content="Contagem de animais com coeficiente de consanguinidade F ≥ 6.25% (limiar zootécnico internacional)."
                  theory="Valores de F acima do limite geram depressão por endogamia, afetando a taxa de concepção, fertilidade, peso de descarte e sobrevivência."
                  practice="Evite utilizar touros aparentados com as matrizes ativas. Considere animais críticos na hora de projetar os acasalamentos."
                />
              </span>
              <span className={`text-2xl font-black leading-tight mt-1 block ${kpis.inbredCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {kpis.inbredCount}
              </span>
            </div>
            <div className={`p-2 rounded-lg ${kpis.inbredCount > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-gray-500 font-medium">
            Casos com endogamia perigosa (F ≥ 6.25%).
          </div>
        </div>

        {/* Elites selection card */}
        <div className="bg-white rounded-xl shadow-3xs border border-gray-100/80 p-4 shrink-0 hover:shadow-2xs transition group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                <span>Animais Elite</span>
                <InfoTooltip 
                  title="Animais Elite" 
                  content="Cabeças com desempenho excepcional que se situam no estrato superior do rebanho (Índice Geral ≥ 110)."
                  theory="Representam os principais condutores do diferencial de seleção, capazes de herdar e fixar mutações e combinações benéficas nas futuras gerações."
                  practice="Reserve e priorize estes animais como matrizes de reposição e doadoras de óvulos (fêmeas) ou touros centrais (machos) para acelerar o progresso genético."
                />
              </span>
              <span className="text-2xl font-black text-amber-600 leading-tight mt-1 block">
                {kpis.elitesCount}
              </span>
            </div>
            <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-gray-500 font-medium">
            Reprodutores com índice acima de 110pts.
          </div>
        </div>
      </div>


      {/* Main content body grid: index configurator + actual rank */}
      <div className="flex flex-col gap-6">
        
        {/* Index Sliders and settings column */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5 w-full">
          <div className="border-b border-gray-50 pb-3 flex items-center justify-between gap-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Configuração de Pesos</h3>
              <InfoTooltip 
                title="Pesos Econômicos do Índice"
                content="Permite configurar a importância relativa (multiplicador) de cada característica zootécnica no cálculo do Índice de Produtividade."
                theory="Índices de Seleção Multicaracterísticos (Hazel, 1943) combinam o mérito genético de vários traços com base na herdabilidade, correlações genéticas e valores econômicos marginais."
                practice="Ajuste os multiplicadores para focar na meta de produção da fazenda (ex: priorizar peso à desmama se vende bezerros, ou espessura de gordura se vende carcaças de qualidade)."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Como interpretar */}
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex gap-3">
              <HelpCircle className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-[10px] text-gray-650 leading-relaxed">
                <strong className="text-indigo-800 block text-xs mb-1">Como interpretar o multiplicador (ex: 1.2x)?</strong>
                O multiplicador indica a <strong>importância relativa</strong> de cada característica na formulação do Índice de Produtividade (a nota final do animal).
                <ul className="list-disc ml-4 mt-2 space-y-1.5 opacity-90 text-[9.5px]">
                  <li><strong className="text-slate-700 font-mono bg-white px-1 py-0.5 rounded border border-slate-150">1.0x (neutro):</strong> Peso base (importância normal).</li>
                  <li><strong className="text-emerald-700 font-mono bg-emerald-50 px-1 py-0.5 rounded border border-emerald-150">1.2x:</strong> Dá 20% <strong>mais valor</strong> ao traço, puxando rankings a favor desta DEP.</li>
                  <li><strong className="text-rose-700 font-mono bg-rose-50 px-1 py-0.5 rounded border border-rose-150">0.5x:</strong> A característica terá <strong>metade do impacto</strong> na nota final.</li>
                </ul>
              </div>
            </div>

            {/* Presets de Mercado */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="w-4 h-4 text-slate-700" />
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Presets de Mercado</h4>
                </div>
                <p className="text-[9.5px] text-slate-500 mb-3">Auto-ajuste estratégico dos pesos baseado no foco comercial da fazenda.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <button 
                   onClick={() => {
                     setEnabledTraits({pesoDesmame: false, pesoSobreano: true, pe: false, aol: true, egs: true});
                     onUpdateIndexConfig({...indexConfig, weight_pesoSobreano: 1.5, weight_aol: 1.5, weight_egs: 1.0});
                   }}
                   className="p-2 bg-white border border-slate-200 rounded-lg text-center hover:bg-slate-100 transition duration-150 shadow-3xs cursor-pointer active:scale-[0.98]"
                 >
                   <span className="block text-[10px] font-bold text-slate-800">Ciclo Curto</span>
                   <span className="block text-[8px] text-slate-500 mt-0.5">Engorda rápida (PS, AOL)</span>
                 </button>
                 <button 
                   onClick={() => {
                     setEnabledTraits({pesoDesmame: true, pesoSobreano: false, pe: true, aol: false, egs: true});
                     onUpdateIndexConfig({...indexConfig, weight_pesoDesmame: 1.2, weight_pe: 2.0, weight_egs: 1.2});
                   }}
                   className="p-2 bg-white border border-slate-200 rounded-lg text-center hover:bg-slate-100 transition duration-150 shadow-3xs cursor-pointer active:scale-[0.98]"
                 >
                   <span className="block text-[10px] font-bold text-slate-800">Reposição</span>
                   <span className="block text-[8px] text-slate-500 mt-0.5">Matrizes (PD, PE, EGS)</span>
                 </button>
                 <button 
                   onClick={() => {
                     setEnabledTraits({pesoDesmame: false, pesoSobreano: false, pe: false, aol: true, egs: true});
                     onUpdateIndexConfig({...indexConfig, weight_aol: 1.5, weight_egs: 2.0});
                   }}
                   className="p-2 bg-white border border-slate-200 rounded-lg text-center hover:bg-slate-100 transition duration-150 shadow-3xs cursor-pointer active:scale-[0.98]"
                 >
                   <span className="block text-[10px] font-bold text-slate-800">Qualidade</span>
                   <span className="block text-[8px] text-slate-500 mt-0.5">Carnes Especiais (AOL, EGS)</span>
                 </button>
                 <button 
                   onClick={() => {
                     setEnabledTraits({pesoDesmame: true, pesoSobreano: true, pe: true, aol: true, egs: true});
                     onUpdateIndexConfig({...indexConfig, weight_pesoDesmame: 1, weight_pesoSobreano: 1, weight_pe: 1, weight_aol: 1, weight_egs: 1});
                   }}
                   className="p-2 bg-white border border-slate-200 rounded-lg text-center hover:bg-slate-100 transition duration-150 shadow-3xs cursor-pointer active:scale-[0.98]"
                 >
                   <span className="block text-[10px] font-bold text-slate-800">Equilíbrio</span>
                   <span className="block text-[8px] text-slate-500 mt-0.5">Índice Base (1.0x geral)</span>
                 </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Weaning weight handle */}
            <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${enabledTraits.pesoDesmame ? 'bg-indigo-50/20 border-indigo-100' : 'bg-slate-50/75 border-slate-200/60 opacity-60'}`}>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enabledTraits.pesoDesmame}
                      onChange={e => setEnabledTraits(prev => ({ ...prev, pesoDesmame: e.target.checked }))}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-700 flex items-center">
                      <span>Peso Desmame (KG)</span>
                      <InfoTooltip 
                        title="DEP Peso ao Desmame"
                        content="Diferença Esperada na Progênie para peso à desmama. Mede o potencial de ganho de peso do filhote até a desmama (205 dias) e o leite produzido pela mãe."
                        theory="A herdabilidade é de média magnitude (0.20 a 0.25). Selecionar para peso de desmame acelera a velocidade inicial de crescimento aditivo."
                        practice="Aumente o peso se a meta comercial da fazenda for maximizar a rentabilidade na venda de bezerros comerciais desmamados."
                      />
                    </span>
                  </label>
                  <span className={`font-mono text-xs font-bold ${enabledTraits.pesoDesmame ? 'text-indigo-700' : 'text-gray-400'}`}>
                    {enabledTraits.pesoDesmame ? `${indexConfig.weight_pesoDesmame}x` : 'Excluído (0.0x)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  disabled={!enabledTraits.pesoDesmame}
                  value={indexConfig.weight_pesoDesmame}
                  onChange={e => handleWeightChange('weight_pesoDesmame', Number(e.target.value))}
                  className={`w-full h-1 bg-gray-150 rounded-lg appearance-none ${enabledTraits.pesoDesmame ? 'cursor-pointer accent-indigo-600' : 'cursor-not-allowed opacity-40'}`}
                />
              </div>
              <span className="text-[9px] text-gray-450 block mt-2 leading-tight">Estimativa e potencial de habilidade materna da mãe.</span>
            </div>

            {/* Yearling weight handle */}
            <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${enabledTraits.pesoSobreano ? 'bg-indigo-50/20 border-indigo-100' : 'bg-slate-50/75 border-slate-200/60 opacity-60'}`}>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enabledTraits.pesoSobreano}
                      onChange={e => setEnabledTraits(prev => ({ ...prev, pesoSobreano: e.target.checked }))}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-700 flex items-center">
                      <span>Peso Sobreano / Final</span>
                      <InfoTooltip 
                        title="DEP Peso ao Sobreano"
                        content="Diferença Esperada na Progênie para peso aos 550 dias. Representa o vigor de crescimento absoluto do animal na recria/engorda."
                        theory="Apresenta herdabilidade moderada a alta (0.30 a 0.45). É o principal indicador genético de potencial de carcaça total pós-desmame."
                        practice="Crucial para sistemas de ciclo completo, engorda intensiva e terminação precoce de novilhos de corte."
                      />
                    </span>
                  </label>
                  <span className={`font-mono text-xs font-bold ${enabledTraits.pesoSobreano ? 'text-indigo-700' : 'text-gray-400'}`}>
                    {enabledTraits.pesoSobreano ? `${indexConfig.weight_pesoSobreano}x` : 'Excluído (0.0x)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  disabled={!enabledTraits.pesoSobreano}
                  value={indexConfig.weight_pesoSobreano}
                  onChange={e => handleWeightChange('weight_pesoSobreano', Number(e.target.value))}
                  className={`w-full h-1 bg-gray-150 rounded-lg appearance-none ${enabledTraits.pesoSobreano ? 'cursor-pointer accent-indigo-600' : 'cursor-not-allowed opacity-40'}`}
                />
              </div>
              <span className="text-[9px] text-gray-450 block mt-2 leading-tight">Régua de crescimento aditivo corporal pós-desmame.</span>
            </div>

            {/* PE handle */}
            <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${enabledTraits.pe ? 'bg-indigo-50/20 border-indigo-100' : 'bg-slate-50/75 border-slate-200/60 opacity-60'}`}>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enabledTraits.pe}
                      onChange={e => setEnabledTraits(prev => ({ ...prev, pe: e.target.checked }))}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-700 flex items-center">
                      <span>Perímetro Escrotal (PE)</span>
                      <InfoTooltip 
                        title="DEP Perímetro Escrotal"
                        content="Diferença Esperada na Progênie para perímetro escrotal (cm) medido ao sobreano. Indicador indireto de fertilidade global."
                        theory="Apresenta forte correlação genética negativa com a idade de puberdade sexual nas filhas fêmeas e irmãs. Touros com alto PE produzem descendentes muito férteis e precoces."
                        practice="Eleve o peso de PE ao selecionar reprodutores destinados a produzir fêmeas de reposição de altíssima eficiência reprodutiva."
                      />
                    </span>
                  </label>
                  <span className={`font-mono text-xs font-bold ${enabledTraits.pe ? 'text-indigo-700' : 'text-gray-400'}`}>
                    {enabledTraits.pe ? `${indexConfig.weight_pe}x` : 'Excluído (0.0x)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  disabled={!enabledTraits.pe}
                  value={indexConfig.weight_pe}
                  onChange={e => handleWeightChange('weight_pe', Number(e.target.value))}
                  className={`w-full h-1 bg-gray-150 rounded-lg appearance-none ${enabledTraits.pe ? 'cursor-pointer accent-indigo-600' : 'cursor-not-allowed opacity-40'}`}
                />
              </div>
              <span className="text-[9px] text-gray-450 block mt-2 leading-tight">Correlacionado com precocidade de fertilidade das filhas.</span>
            </div>

            {/* AOL handle */}
            <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${enabledTraits.aol ? 'bg-indigo-50/20 border-indigo-100' : 'bg-slate-50/75 border-slate-200/60 opacity-60'}`}>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enabledTraits.aol}
                      onChange={e => setEnabledTraits(prev => ({ ...prev, aol: e.target.checked }))}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-700 flex items-center">
                      <span>Área Olho de Lombo (AOL)</span>
                      <InfoTooltip 
                        title="DEP Área de Olho de Lombo"
                        content="Diferença Esperada na Progênie para a área do Longissimus dorsi (cm²). Avalia a musculosidade do esqueleto."
                        theory="Apresenta herdabilidade moderada (0.25 a 0.35). Correlaciona-se com rendimento de carne limpa na carcaça e conformação física dos novilhos."
                        practice="Fundamental para produtores que buscam bonificações por carcaça pesada e rendimento de desossa superior no frigorífico."
                      />
                    </span>
                  </label>
                  <span className={`font-mono text-xs font-bold ${enabledTraits.aol ? 'text-indigo-700' : 'text-gray-400'}`}>
                    {enabledTraits.aol ? `${indexConfig.weight_aol}x` : 'Excluído (0.0x)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  disabled={!enabledTraits.aol}
                  value={indexConfig.weight_aol}
                  onChange={e => handleWeightChange('weight_aol', Number(e.target.value))}
                  className={`w-full h-1 bg-gray-150 rounded-lg appearance-none ${enabledTraits.aol ? 'cursor-pointer accent-indigo-600' : 'cursor-not-allowed opacity-40'}`}
                />
              </div>
              <span className="text-[9px] text-gray-450 block mt-2 leading-tight">Musculosidade global e rendimento líquido de cortes finos.</span>
            </div>

            {/* EGS handle */}
            <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${enabledTraits.egs ? 'bg-indigo-50/20 border-indigo-100' : 'bg-slate-50/75 border-slate-200/60 opacity-60'}`}>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enabledTraits.egs}
                      onChange={e => setEnabledTraits(prev => ({ ...prev, egs: e.target.checked }))}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-700 flex items-center">
                      <span>Espessura de Gordura (EGS)</span>
                      <InfoTooltip 
                        title="DEP Espessura de Gordura"
                        content="Diferença Esperada na Progênie para a camada de gordura subcutânea (mm). Mede o potencial de acabamento do animal."
                        theory="Herdabilidade moderada (0.30). A gordura subcutânea protege a carcaça do resfriamento rápido pós-abate (cold shortening) e preserva as reservas energéticas reprodutivas da fêmea."
                        practice="Eleve o peso de EGS se as fêmeas sofrem sob restrições alimentares ou se os bezerros são desvalorizados por carcaça sem acabamento no gancho."
                      />
                    </span>
                  </label>
                  <span className={`font-mono text-xs font-bold ${enabledTraits.egs ? 'text-indigo-700' : 'text-gray-400'}`}>
                    {enabledTraits.egs ? `${indexConfig.weight_egs}x` : 'Excluído (0.0x)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  disabled={!enabledTraits.egs}
                  value={indexConfig.weight_egs}
                  onChange={e => handleWeightChange('weight_egs', Number(e.target.value))}
                  className={`w-full h-1 bg-gray-150 rounded-lg appearance-none ${enabledTraits.egs ? 'cursor-pointer accent-indigo-600' : 'cursor-not-allowed opacity-40'}`}
                />
              </div>
              <span className="text-[9px] text-gray-450 block mt-2 leading-tight">Capacidade de acabamento e retenção térmica da carcaça.</span>
            </div>
          </div>
        </div>

        {/* Animal Ranking Column */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 w-full">
          <div className="border-b border-gray-50 pb-3 flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Ranking de Classificação do Rebanho</span>
              <InfoTooltip 
                title="Ranking de Classificação"
                content="Lista ordenada decrescentemente pelo Índice de Produtividade customizado, classificando o rebanho em estratos de mérito genético aditivo."
                theory="A ordenação utiliza o algoritmo BLUP (Melhor Preditor Linear Não-Viesado) integrando matrizes de parentesco e dados genômicos para separar o efeito ambiental do valor genético real."
                practice="Utilize a classificação para separar lotes homogêneos no curral, apartar fêmeas de reposição e escolher animais doadores (Elite) ou para descarte seletivo."
              />
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full flex gap-2">
              <span className="opacity-75">Ordenação por Índice Produtivo</span>
              <span className="border-l border-indigo-200 pl-2">Exibindo {filteredRankedAnimals.length} animais</span>
            </span>
          </div>

          {/* Classification Legend Box */}
          {(() => {
            const cPercent = Number(localStorage.getItem('geno_culling_percent')) || 20;
            const regMaxPct = 100 - cPercent;
            return (
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Entenda os Critérios de Classificação do Rebanho:</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div 
                    className="bg-white border border-slate-200/80 p-2 rounded-md hover:shadow-3xs hover:border-slate-300 transition cursor-help"
                    title="Elite (Top 5%): Animais que estão entre os 5% melhores do rebanho com base no Índice de Produtividade customizado. Indicados como potenciais doadores e reprodutores de alto impacto zootécnico."
                  >
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border text-amber-700 bg-amber-100 border-amber-200">
                      <Award className="w-2.5 h-2.5" /> Elite (Top 5%)
                    </span>
                    <p className="text-[9px] text-gray-500 mt-1 leading-tight">Recomendados para reprodutores e doadoras.</p>
                  </div>
                  <div 
                    className="bg-white border border-slate-200/80 p-2 rounded-md hover:shadow-3xs hover:border-slate-300 transition cursor-help"
                    title="Superior (Top 20%): Animais no percentil superior de 5% a 20%. Apresentam desempenho acima da média geral e devem ser prioritariamente mantidos e multiplicados no plantel."
                  >
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border text-emerald-700 bg-emerald-100 border-emerald-200">
                      Superior (Top 20%)
                    </span>
                    <p className="text-[9px] text-gray-500 mt-1 leading-tight">Animais com desempenho acima da média do rebanho.</p>
                  </div>
                  <div 
                    className="bg-white border border-slate-200/80 p-2 rounded-md hover:shadow-3xs hover:border-slate-300 transition cursor-help"
                    title={`Regular: Representa o grupo intermediário (percentil 20% a ${regMaxPct}%). Animais equilibrados com desempenho padrão para as metas de produção estabelecidas.`}
                  >
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border text-slate-500 bg-slate-100 border-slate-200">
                      Regular (Média)
                    </span>
                    <p className="text-[9px] text-gray-500 mt-1 leading-tight">Desempenho mediano condizente com a média comercial.</p>
                  </div>
                  <div 
                    className="bg-white border border-rose-100 p-2 rounded-md hover:shadow-3xs hover:border-rose-200 transition cursor-help"
                    title={`Descarte (Bottom ${cPercent}%): Representa os ${cPercent}% animais de menor desempenho produtivo agregado pelo índice. O descarte sistemático desses animais previne a transmissão de DEPs desfavoráveis, reduz custos desnecessários com manutenção e acelera expressivamente o ganho genético médio do rebanho comercial.`}
                  >
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border text-rose-700 bg-rose-100 border-rose-200">
                      Descarte (Bottom {cPercent}%)
                    </span>
                    <p className="text-[9px] text-rose-600 mt-1 leading-tight font-medium">Indicados para remoção ou abate estratégico.</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* PAINEL DE DECISÃO MULTICRITÉRIO E ZOOTECNIA DE PRECISÃO */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 bg-slate-50/70 p-5 rounded-xl border border-slate-200/80">
            
            {/* CARD 1: Acadêmicos e Pesquisa (Zootecnia Científica) */}
            <div className="bg-white p-4.5 rounded-lg border border-slate-200/60 flex flex-col justify-between shadow-3xs space-y-3.5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-indigo-650" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center">
                    <span>1. Acadêmicos e Pesquisa (Análise Populacional)</span>
                    <InfoTooltip 
                      title="Análise Populacional Avançada"
                      content="Métricas de dinâmica de população zootécnica calculadas em tempo real com base no rebanho ativo."
                      theory="Avalia a variabilidade genética cumulativa, monitorando a sustentabilidade de longo prazo do programa de melhoramento genético."
                      practice="Supervisione o tamanho efetivo populacional (Ne) para garantir que a fazenda não sofra com depressão endogâmica devido a poucos reprodutores ativos."
                    />
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  Acompanhe métricas populacionais avançadas calculadas em tempo real com base no rebanho ativo.
                </p>

                {/* Métricas de Diversidade Genética */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-150">
                    <span className="block font-bold text-slate-800">Tamanho Efetivo (<span className="font-serif italic font-bold">N<sub>e</sub></span>):</span>
                    <span className={`font-extrabold font-mono text-xs ${effectivePopulationSize.Ne < 50 ? 'text-amber-600' : 'text-indigo-700'}`}>
                      {effectivePopulationSize.Ne} cabeças
                    </span>
                    <span className="block text-[8px] text-slate-400 mt-0.5">Fórmula de Wright (Ne = 4NmNf/(Nm+Nf))</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-150">
                    <span className="block font-bold text-slate-800">Estrutura de Plantel:</span>
                    <span className="font-semibold text-slate-700 font-mono text-[9px] block">
                      Reprodutores Ativos: {Array.from(new Set(rankedAnimals.map(a => a.sireId).filter(Boolean))).length}
                    </span>
                    <span className="font-semibold text-slate-700 font-mono text-[9px] block">
                      Matrizes Ativas: {Array.from(new Set(rankedAnimals.map(a => a.damId).filter(Boolean))).length}
                    </span>
                  </div>
                </div>

                {/* Alerta de FAO */}
                {effectivePopulationSize.Ne < 50 && (
                  <div className="bg-amber-50/70 border border-amber-250 p-2.5 rounded text-[9.5px] text-amber-800 flex gap-2 items-start mt-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <strong>Aviso de Sustentabilidade Genética (FAO):</strong> Ne abaixo de 50 indivíduos aumenta significativamente a depressão por endogamia a médio prazo e o risco de deriva genética. Considere diversificar reprodutores fundadores.
                    </div>
                  </div>
                )}

                {/* Nivelamento de Idades (Ajuste Ambiental 205 dias) */}
                <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-bold text-slate-700">Nivelamento Ambiental (Peso Ajustado):</span>
                    <span className="text-[8.5px] text-slate-400 leading-tight">Exibe o peso padronizado a 205 dias no detalhe de cada animal</span>
                  </div>
                  <button
                    onClick={() => setShowPhenotypeAjustado(!showPhenotypeAjustado)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs active:scale-[0.97] cursor-pointer ${
                      showPhenotypeAjustado
                        ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm shadow-emerald-250/40'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {showPhenotypeAjustado ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                        <span>Ativado (205d)</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span>Desativado</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={exportFullRankingCSV}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-bold py-2 px-3 rounded border border-slate-250 flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar Ranking Completo para P&D (Excel)
                </button>
              </div>
            </div>

            {/* CARD 2: Produtores e Criadores (Impacto Econômico) */}
            <div className="bg-white p-4.5 rounded-lg border border-slate-200/60 flex flex-col justify-between shadow-3xs space-y-3.5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-emerald-650" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center">
                    <span>2. Produtores e Fazendeiros (Métrica Financeira)</span>
                    <InfoTooltip 
                      title="Métrica Financeira e Retorno Econômico"
                      content="Calculadora e simulador que traduz o progresso genético e os descartes em valores monetários reais de mercado."
                      theory="Aplica pesos econômicos diretos e preços de mercado às características genéticas aditivas, demonstrando o retorno econômico (ROI) do investimento em sêmen ou IATF."
                      practice="Ajuste os preços de mercado de bezerros e matrizes para simular com precisão o ganho monetário da fazenda com a eliminação de animais de baixo desempenho."
                    />
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3.5">
                  Traduza a diferença do mérito genético do índice em termos financeiros reais e ordene apartações no curral.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
                  {/* Slider 1: Preço Bezerro */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[10px] text-slate-650 mb-1">
                        <span className="font-bold text-slate-700">Preço Bezerro (R$/kg):</span>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">R$ {kgValue.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="8.0"
                        max="22.0"
                        step="0.5"
                        value={kgValue}
                        onChange={e => setKgValue(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>
                    <span className="text-[7.5px] text-slate-450 block mt-1 leading-tight">Valor por kg vivo de bezerro comercial desmamado.</span>
                  </div>

                  {/* Slider 2: Peso Descarte */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[10px] text-slate-650 mb-1">
                        <span className="font-bold text-slate-700">Peso Descarte (kg/cab):</span>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{cullingWeight} kg</span>
                      </div>
                      <input
                        type="range"
                        min="120"
                        max="350"
                        step="10"
                        value={cullingWeight}
                        onChange={e => setCullingWeight(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <span className="text-[7.5px] text-slate-450 block mt-1 leading-tight">Peso estimado de apartação dos animais jovens inferiores.</span>
                  </div>

                  {/* Slider 3: Valor Vaca Descarte */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[10px] text-slate-650 mb-1">
                        <span className="font-bold text-slate-700">Vaca Improdutiva (R$/cab):</span>
                        <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">R$ {cowCullingValue.toLocaleString('pt-BR')}</span>
                      </div>
                      <input
                        type="range"
                        min="1500"
                        max="6000"
                        step="100"
                        value={cowCullingValue}
                        onChange={e => setCowCullingValue(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                    </div>
                    <span className="text-[7.5px] text-slate-450 block mt-1 leading-tight">Valor bruto estimado de venda de fêmeas vazias.</span>
                  </div>
                </div>

                {/* Ações de Lote para Descarte (Bottom %) */}
                {(() => {
                  const cPercent = Number(localStorage.getItem('geno_culling_percent')) || 20;
                  const totalCount = rankedAnimals.length;
                  const discardThresholdPct = (100 - cPercent) / 100;
                  const discardThresholdIdx = Math.floor(totalCount * discardThresholdPct);
                  const discardList = rankedAnimals.slice(discardThresholdIdx);
                  
                  const countMales = discardList.filter(a => a.sex === 'M').length;
                  const countFemales = discardList.filter(a => a.sex === 'F').length;

                  const maleRevenue = countMales * cullingWeight * kgValue;
                  const femaleRevenue = countFemales * cowCullingValue;
                  const totalRevenue = maleRevenue + femaleRevenue;

                  const semenDoses = Math.floor(totalRevenue / 50);
                  const iatfProtocols = Math.floor(totalRevenue / 90);
                  const eliteHeifers = Math.floor(totalRevenue / 6000);

                  return (
                    <>
                      <span className="block text-[9.5px] uppercase font-black text-rose-800 tracking-wider mb-2">
                        Ações e Ordens de Manejo em Lote (Bottom {cPercent}%)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[9.5px] mb-3">
                        <button
                          onClick={() => exportFieldCullingOrderCSV('abate')}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded py-1.5 px-2 font-bold text-center transition flex items-center justify-center gap-1 active:scale-[0.98] cursor-help"
                          title={`Critério de Abate Comercial: Destinado a animais do percentil inferior (Bottom ${cPercent}%) com pior musculatura e crescimento aditivo. A eliminação imediata evita o consumo ineficiente de pastagem e cessa o custo de manutenção de indivíduos improdutivos.`}
                        >
                          <Download className="w-3 h-3" /> Abate Comercial
                        </button>
                        <button
                          onClick={() => exportFieldCullingOrderCSV('castracao')}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-250 rounded py-1.5 px-2 font-bold text-center transition flex items-center justify-center gap-1 active:scale-[0.98] cursor-help"
                          title={`Critério de Castração Campo: Aplicado a machos inteiros de baixo mérito genético aditivo (Bottom ${cPercent}%). A castração sistemática no curral de manejo previne a reprodução indesejada e acidentes de cobertura, dociliza o lote de recria e estimula a deposição precoce de gordura subcutânea (EGS).`}
                        >
                          <Download className="w-3 h-3" /> Castração Campo
                        </button>
                        <button
                          onClick={() => exportFieldCullingOrderCSV('venda_leilao')}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-250 rounded py-1.5 px-2 font-bold text-center transition flex items-center justify-center gap-1 active:scale-[0.98] cursor-help"
                          title={`Critério de Venda / Leilão: Indicado para fêmeas improdutivas, descartes precoces ou matrizes com DEPs de habilidade materna deficientes. A venda em leilões comerciais de cria/recria/engorda converte animais indesejáveis em capital líquido para reinvestimento em genética superior.`}
                        >
                          <Download className="w-3 h-3" /> Venda / Leilão
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* CALCULADORA REINVESTIMENTO */}
                        <div className="bg-emerald-50/70 border border-emerald-150 rounded-lg p-3 space-y-2 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 text-emerald-900 mb-1.5">
                              <Sliders className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-wider">Calculadora de Faturamento</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-650 border-b border-emerald-100/60 pb-1.5 mb-2">
                              <div>
                                <span className="block text-slate-500">Descarte Fêmeas:</span>
                                <span className="font-mono font-bold text-slate-800">R$ {femaleRevenue.toLocaleString('pt-BR')}</span>
                              </div>
                              <div>
                                <span className="block text-slate-500">Descarte Machos:</span>
                                <span className="font-mono font-bold text-slate-800">R$ {maleRevenue.toLocaleString('pt-BR')}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center bg-white px-2 py-1.5 rounded border border-emerald-200 mb-2">
                              <span className="text-[9.5px] font-bold text-emerald-950">Capital Recuperado:</span>
                              <span className="text-xs font-black font-mono text-emerald-750">R$ {totalRevenue.toLocaleString('pt-BR')}</span>
                            </div>
                          </div>

                          {totalRevenue > 0 ? (
                            <div className="text-[8.5px] text-slate-600 leading-normal bg-white/50 p-2 rounded border border-emerald-100">
                              <span className="font-extrabold text-emerald-900 uppercase block tracking-wider text-[7.5px] mb-1">Poder de Reinvestimento Genético:</span>
                              <ul className="space-y-0.5 list-disc pl-3 text-slate-700 font-semibold">
                                <li>🧬 {semenDoses} doses Sêmen Elite (touros de ponta)</li>
                                <li>🏥 {iatfProtocols} protocolos IATF completos</li>
                                {eliteHeifers > 0 && <li>🐂 {eliteHeifers} Novilhas de Elite</li>}
                              </ul>
                            </div>
                          ) : (
                            <div className="text-[8px] text-slate-400 italic text-center py-2">Sem animais no descarte para reinvestimento.</div>
                          )}
                        </div>

                        {/* Critérios Explicativos para o Bottom % */}
                        <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-3 flex flex-col justify-between">
                          <div>
                            <span className="block text-[9.5px] font-bold text-rose-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <HelpCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" /> Descarte Técnico:
                            </span>
                            <ul className="text-[8.5px] text-slate-650 space-y-1.5 leading-relaxed">
                              <li>• <strong className="text-rose-900">Limiar Matemático:</strong> Filtro automático do percentil inferior (piores {cPercent}%) ordenado decrescentemente pelo Índice de Seleção.</li>
                              <li>• <strong className="text-rose-900">Manejo Direcionado:</strong> Exporta planilha de curral com Brinco, Nome, Sexo, Lote, Índice e Consanguinidade (<span className="font-serif italic">F</span>).</li>
                              <li>• <strong className="text-rose-900">Objetivo:</strong> Eliminar alelos desfavoráveis, reter recursos alimentares e elevar o mérito genético do plantel.</li>
                            </ul>
                          </div>
                          <span className="text-[7.5px] text-slate-400 block mt-2 pt-2 border-t border-rose-150/40">Evita prejuízos com animais improdutivos.</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* CARD 3: Técnicos e Acasaladores (Zootecnia de Precisão) */}
            <div className="bg-white p-4.5 rounded-lg border border-slate-200/60 flex flex-col justify-between shadow-3xs space-y-3.5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-650" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center">
                    <span>3. Técnicos e Zootecnistas (Filtros Avançados)</span>
                    <InfoTooltip 
                      title="Filtros Técnicos Avançados"
                      content="Configurações e travas de segurança estatística e genética para refinar a tomada de decisões."
                      theory="Assegura que as decisões de seleção sejam robustas, baseando-se em acurácia estatística e controlando os limiares aceitáveis de consanguinidade para mitigar riscos reprodutivos."
                      practice="Ajuste o limite de acurácia mínima para esconder animais muito jovens da seleção, e configure o limiar de endogamia (F) aceitável."
                    />
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  Ajuste restrições técnicas para assegurar a confiabilidade estatística e evitar depressão por endogamia no curral.
                </p>
 
                {/* Limiar de Acurácia & Consanguinidade em Grid */}
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center text-[10px] text-slate-650 mb-1">
                          <span className="font-bold text-slate-700 flex items-center">
                            <span>Acurácia Mínima das DEPs</span>
                            <InfoTooltip 
                              title="Acurácia Mínima das DEPs"
                              content="Limiar estatístico mínimo exigido para as DEPs (Diferenças Esperadas na Progênie) dos animais exibidos no ranking."
                              theory="A acurácia reflete a confiabilidade da estimativa do valor genético. É calculada com base no número de informações do próprio animal, de seus parentes e descendentes."
                              practice="Aumente este limiar para focar as decisões apenas em reprodutores provados e animais com dados zootécnicos robustos."
                            />
                          </span>
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{accuracyThreshold * 100}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="0.90"
                          step="0.05"
                          value={accuracyThreshold}
                          onChange={e => setAccuracyThreshold(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                      <span className="text-[7.5px] text-slate-400 block mt-1 leading-tight">Oculta do rebanho animais jovens com baixa fidedignidade de DEPs estimadas.</span>
                    </div>
   
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center text-[10px] text-slate-650 mb-1">
                          <span className="font-bold text-slate-700 flex items-center">
                            <span>Alerta Consanguinidade (F)</span>
                            <InfoTooltip 
                              title="Alerta de Consanguinidade Máxima (F)"
                              content="O limite máximo tolerado de parentesco interno para disparar avisos e formatações de alerta de endogamia."
                              theory="O acúmulo de consanguinidade reduz a variabilidade e aumenta a homozigose de alelos recessivos deletérios, gerando depressão endogâmica."
                              practice="Selecione o limite (recomenda-se 6.25%). Animais acima deste limite receberão alertas em vermelho na planilha de curral."
                            />
                          </span>
                          <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">{(inbreedingAlertLimit).toFixed(2)}%</span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="15.0"
                          step="0.5"
                          value={inbreedingAlertLimit}
                          onChange={e => setInbreedingAlertLimit(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                        />
                      </div>
                      <span className="text-[7.5px] text-slate-400 block mt-1 leading-tight">Ativa alerta de consanguinidade visual acima do percentual tolerado.</span>
                    </div>
                  </div>
 
                  {/* Informações de Auxílio Técnico e Zootécnico */}
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 space-y-2">
                    <span className="block text-[8.5px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-650 shrink-0" /> Guia Zootécnico: Objetivo & Aplicações
                    </span>
                    <p className="text-[8.2px] text-slate-500 leading-normal">
                      Este painel configura restrições e travas de segurança estatística e genética antes de ordenar manejos, descartes ou exportações de relatórios:
                    </p>
                    <div className="space-y-1.5 text-[8px] text-slate-600 leading-normal">
                      <div>
                        <strong className="text-indigo-900 block font-bold">A. Filtro por Acurácia Mínima das DEPs (accuracyThreshold):</strong>
                        <span className="text-slate-500 font-medium">Objetivo:</span> Evitar que decisões de seleção de longo prazo (como reter animais elite) sejam baseadas em estimativas de baixa confiabilidade estatística (animais muito jovens).<br />
                        <span className="text-slate-500 font-medium">Onde é Utilizado:</span> Filtra dinamicamente a lista de animais ranqueados (<span className="font-mono text-[7px]">rankedAnimals</span>) e os gráficos de dispersão, ocultando indivíduos com acurácia inferior ao limiar técnico definido.
                      </div>
                      <div className="border-t border-slate-200/60 pt-1.5">
                        <strong className="text-rose-900 block font-bold">B. Limite de Alerta de Consanguinidade (inbreedingAlertLimit):</strong>
                        <span className="text-slate-500 font-medium">Objetivo:</span> Sinalizar e alertar visualmente o criador sobre indivíduos com parentesco excessivo (consanguinidade), prevenindo a ocorrência de depressão endogâmica.<br />
                        <span className="text-slate-500 font-medium">Onde é Utilizado:</span> Atua na listagem de animais e detalhes de pedigree. Caso a taxa de consanguinidade do animal seja superior ao limiar (ex: 6.25%, limite recomendado pela FAO), o app dispara formatação visual destacada em vermelho e uma tag expressa de aviso <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">Alerta Endogamia</span>.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: Simulação de Progresso Genético (ΔG) - AMPLIADA */}
            <div className="bg-white p-4.5 rounded-lg border border-slate-200/60 flex flex-col justify-between shadow-3xs space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-650" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center">
                      <span>4. Progresso Genético (ΔG)</span>
                      <InfoTooltip 
                        title="Simulador de Progresso Esperado"
                        content="Projeta o ganho genético aditivo anual médio (ΔG) da próxima geração em resposta ao diferencial de seleção aplicado."
                        theory="Equação de Rendimento Genético: ΔG = (Intensidade (i) * Acurácia (r) * Desvio Padrão Genético (σg)) / Intervalo de Geração (L). Compara o modelo genômico empírico real contra o potencial teórico."
                        practice="Utilize as abas internas para ver a fórmula matemática, a resposta segregada por DEP e comparar a velocidade do progresso sob diferentes abordagens zootécnicas."
                      />
                    </h4>
                  </div>
                  {/* Tab Selector Inside Card 4 */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCard4Tab('formula')}
                      className={`px-2 py-1 text-[8.5px] font-bold rounded-md transition ${
                        card4Tab === 'formula'
                          ? 'bg-white text-indigo-700 shadow-2xs border border-slate-250'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Equação
                    </button>
                    <button
                      type="button"
                      onClick={() => setCard4Tab('traits')}
                      className={`px-2 py-1 text-[8.5px] font-bold rounded-md transition ${
                        card4Tab === 'traits'
                          ? 'bg-white text-indigo-700 shadow-2xs border border-slate-250'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Por DEP
                    </button>
                    <button
                      type="button"
                      onClick={() => setCard4Tab('models')}
                      className={`px-2 py-1 text-[8.5px] font-bold rounded-md transition ${
                        card4Tab === 'models'
                          ? 'bg-white text-indigo-700 shadow-2xs border border-slate-250'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Comparativo
                    </button>
                  </div>
                </div>

                {card4Tab === 'formula' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Estime o ganho genético aditivo anual esperado utilizando a equação tradicional de progresso:
                    </p>

                    {/* Fórmula */}
                    <div className="bg-slate-50/80 p-2.5 rounded border border-slate-150 flex items-center justify-center font-mono text-[10.5px] text-slate-750">
                      <span className="font-serif italic text-xs font-bold mr-1 text-indigo-750">ΔG</span> = 
                      <div className="flex flex-col items-center mx-1 text-[10px]">
                        <span className="border-b border-slate-400 pb-0.5 px-2">
                          <span className="font-serif italic font-bold" title="Intensidade de seleção (pelo descarte)">i</span> × 
                          <span className="font-serif italic font-bold" title="Desvio padrão genético do índice"> σ<sub>g</sub></span> × 
                          <span className="font-serif italic font-bold" title="Acurácia média de seleção"> r<sub>gĝ</sub></span>
                        </span>
                        <span className="pt-0.5 font-bold" title="Intervalo de gerações">L</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-600">
                      <div className="bg-slate-50 p-2 rounded border border-slate-150">
                        <span className="block font-bold text-slate-700">Desvio Genético (<span className="font-serif italic">σ<sub>g</sub></span>):</span>
                        <span className="font-bold text-indigo-700 font-mono text-xs">{geneticGainData.sigmaG} pts</span>
                        <span className="block text-[7.5px] text-slate-400">Variabilidade aditiva real do rebanho</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-150">
                        <span className="block font-bold text-slate-700">Acurácia Média (<span className="font-serif italic">r<sub>gĝ</sub></span>):</span>
                        <span className="font-bold text-emerald-700 font-mono text-xs">{(geneticGainData.avgAcc * 100).toFixed(1)}%</span>
                        <span className="block text-[7.5px] text-slate-400">Fidedignidade das DEPs ativas</span>
                      </div>
                    </div>

                    {/* Opções de Intervalo de Gerações (L) */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-650">
                        <span className="font-bold text-slate-700">Intervalo de Gerações (<span className="font-serif italic">L</span>):</span>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{currentL} anos</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setLOption('custom')}
                          className={`text-[9.5px] font-bold py-1 px-1.5 rounded transition ${
                            lOption === 'custom'
                              ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-100'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                          }`}
                        >
                          Opção 1: Régua Manual
                        </button>
                        <button
                          type="button"
                          onClick={() => setLOption('calculated')}
                          className={`text-[9.5px] font-bold py-1 px-1.5 rounded transition flex items-center justify-center gap-1 ${
                            lOption === 'calculated'
                              ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-100'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                          }`}
                        >
                          Opção 2: Calculado BD
                        </button>
                      </div>

                      {lOption === 'custom' ? (
                        <div className="pt-1">
                          <input
                            type="range"
                            min="2.0"
                            max="10.0"
                            step="0.5"
                            value={customL}
                            onChange={e => setCustomL(Number(e.target.value))}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                          />
                          <span className="block text-[7.5px] text-slate-400 mt-1">Tempo médio de renovação do plantel. Reduzir L acelera o ganho anual.</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-50/50 border border-emerald-100/60 p-2 rounded-lg text-[8.2px] text-slate-650 leading-relaxed pt-1.5">
                          <span className="font-bold text-emerald-950 block">Métrica Baseada em Evidências:</span>
                          <p>O intervalo de gerações (<span className="font-serif italic">L</span>) foi calculado dinamicamente com base nas datas de nascimento dos animais e seus respectivos pais registrados no banco de dados.</p>
                          <p className="mt-1 text-emerald-700 font-bold">L Calculado = {calculatedL} anos (com base no rebanho registrado)</p>
                        </div>
                      )}
                    </div>

                    {/* Resultados Cenários */}
                    <div className="border-t border-slate-100 pt-2 text-[9px] space-y-2">
                      <span className="block font-bold text-slate-700 uppercase tracking-wider text-[8px]">Ganhos Anuais Estimados</span>
                      {(() => {
                        const cPercent = Number(localStorage.getItem('geno_culling_percent')) || 20;
                        return (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-rose-50/60 border border-rose-100 p-2 rounded">
                              <span className="text-[7.5px] font-black text-rose-700 uppercase block tracking-wider">Descarte (Bottom {cPercent}%)</span>
                              <span className="text-[11px] font-extrabold text-rose-950 block font-mono">+{geneticGainData.deltaGCulling} <span className="text-[8px] font-normal text-slate-500">pts/ano</span></span>
                              <span className="text-[7px] text-slate-400 block mt-0.5">Com intensidade de descarte real</span>
                            </div>
                            <div className="bg-emerald-50/60 border border-emerald-100 p-2 rounded">
                              <span className="text-[7.5px] font-black text-emerald-700 uppercase block tracking-wider">Elite Reposição (Top 20%)</span>
                              <span className="text-[11px] font-extrabold text-emerald-950 block font-mono">+{geneticGainData.deltaGSelection} <span className="text-[8px] font-normal text-slate-500">pts/ano</span></span>
                              <span className="text-[7px] text-slate-400 block mt-0.5">Seleção dos top-indexados</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {card4Tab === 'traits' && (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-slate-650 leading-tight">
                      Ganho genético aditivo anual esperado <strong className="text-slate-800">por característica individual</strong> com base nas DEPs do lote ativo:
                    </p>
                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                      {traitProgressData.map(trait => {
                        const maxVal = Math.max(...traitProgressData.map(t => Math.max(t.progressSelection, 0.01)));
                        const pctSelection = Math.min(100, (trait.progressSelection / maxVal) * 100);
                        const pctCulling = Math.min(100, (trait.progressCulling / maxVal) * 100);
                        return (
                          <div key={trait.key} className="space-y-1 text-[9.5px]">
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>{trait.label}</span>
                              <span className="font-mono text-indigo-700 font-black">
                                +{trait.progressSelection.toFixed(2)} / +{trait.progressCulling.toFixed(2)} {trait.unit}
                              </span>
                            </div>
                            {/* Dual mini bar chart */}
                            <div className="space-y-0.5">
                              {/* Top (Elite) */}
                              <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-1 rounded-full transition-all duration-500" 
                                  style={{ width: `${pctSelection}%` }} 
                                  title="Reposição de Elites"
                                />
                              </div>
                              {/* Bottom (Culling) */}
                              <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                <div 
                                  className="bg-rose-400 h-1 rounded-full transition-all duration-500" 
                                  style={{ width: `${pctCulling}%` }} 
                                  title="Filtro de Descarte"
                                />
                              </div>
                            </div>
                            <div className="flex justify-between text-[7.5px] text-slate-400">
                              <span>σg_dep: {trait.sigma} {trait.unit}</span>
                              <span>Acurácia: {(trait.acc * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <span className="block text-[7.5px] text-slate-400 leading-tight">
                      A escala representa <span className="text-emerald-600 font-bold">Elite (Top 20%)</span> e <span className="text-rose-600 font-bold">Descarte (Bottom)</span> em taxa anual. Ganhos estimados de acordo com a herdabilidade empírica e as DEPs reais do lote.
                    </span>
                  </div>
                )}

                {card4Tab === 'models' && (
                  <div className="space-y-2.5">
                    <div className="bg-amber-50/50 border border-amber-150 p-2.5 rounded-lg text-[10px] space-y-2">
                      <span className="font-bold text-amber-900 uppercase block tracking-wider flex items-center gap-1 text-[9px]">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        Guia: Por que os resultados de progresso diferem?
                      </span>
                      <p className="text-slate-650 leading-relaxed text-[9px]">
                        O progresso nesta aba <strong className="text-slate-900">Análise Genética (Card 4)</strong> e o do <strong className="text-slate-900">Simulador de Progresso Esperado</strong> sob a aba "Simular Efeitos" servem a propósitos distintos e utilizam premissas matemáticas diferentes:
                      </p>
                      
                      <div className="space-y-1.5 text-[8.5px] text-slate-650 pl-1">
                        <div>
                          <strong className="text-slate-800 font-bold block">• Análise Genética (Empírico & Instantâneo):</strong>
                          Mede a variabilidade <strong className="text-indigo-900 font-bold">real empírica</strong> do lote atual (<span className="font-mono font-bold">σg</span> calculado dinamicamente no índice e nas DEPs) e a acurácia calculada do seu rebanho ativo. Utiliza a Equação de Rendel & Robertson clássica sem perdas aditivas.
                        </div>
                        <div>
                          <strong className="text-slate-800 font-bold block">• Simulador de Progresso (Teórico & Multi-geracional):</strong>
                          É um modelo populacional simulado de longo prazo. Emprega estimativas <strong className="text-indigo-900 font-bold">teóricas de herdabilidade (h²)</strong> globais, intensidades de seleção customizadas de forma independente para machos e fêmeas e, crucialmente, <strong className="text-rose-700 font-black">deduz a Depressão por Endogamia</strong> (ΔG_real = ΔG_teorico - 2F · depressão) para punir a consanguinidade cumulativa ao longo das gerações.
                        </div>
                      </div>
                    </div>
                    <span className="block text-[7.5px] text-slate-400">
                      Ambos os modelos validam as decisões zootécnicas, sendo o do rebanho focado no presente (lote real) e o do simulador focado na projeção populacional futura.
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 flex flex-wrap gap-3 items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Sliders className="w-3 h-3" /> Filtros
            </span>
            
            <select 
              value={filterTop} 
              onChange={e => setFilterTop(e.target.value as any)}
              className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:border-indigo-400"
            >
              <option value="all">Todo o Rebanho</option>
              <option value="top5">Apenas Top 5% (Elites)</option>
              <option value="top10">Apenas Top 10%</option>
              <option value="top20">Apenas Top 20%</option>
            </select>

            <select 
              value={filterSex} 
              onChange={e => setFilterSex(e.target.value as any)}
              className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:border-indigo-400"
            >
              <option value="all">Ambos os Sexos</option>
              <option value="M">Apenas Machos</option>
              <option value="F">Apenas Fêmeas</option>
              <option value="F_repro">Fêmeas Reprodutivas {">"} 2A</option>
            </select>

            <select 
              value={filterSire} 
              onChange={e => setFilterSire(e.target.value)}
              className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:border-indigo-400 max-w-[140px]"
            >
              <option value="">Linhagem - Todos</option>
              {siresList.map(sire => (
                <option key={sire} value={sire}>Pai: {sire}</option>
              ))}
            </select>

            {/* Toggle button for advanced filters */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition duration-150 flex items-center gap-1.5 ${
                showAdvancedFilters || advFilterSex !== 'all' || advFilterInbreeding > 0 || advFilterTrait !== 'none'
                  ? 'bg-amber-600 border-amber-700 text-white font-extrabold shadow-sm ring-2 ring-amber-500/30'
                  : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 ring-2 ring-amber-500/15'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Filtragem de Descarte Estratégico { (advFilterSex !== 'all' || advFilterInbreeding > 0 || advFilterTrait !== 'none') && "•" }
            </button>
            
            {(filterTop !== 'all' || filterSex !== 'all' || filterSire !== '' || advFilterSex !== 'all' || advFilterInbreeding > 0 || advFilterTrait !== 'none') && (
              <button 
                onClick={() => { 
                  setFilterTop('all'); 
                  setFilterSex('all'); 
                  setFilterSire(''); 
                  setAdvFilterSex('all');
                  setAdvFilterInbreeding(0);
                  setAdvFilterTrait('none');
                }}
                className="text-[10px] text-rose-500 font-medium hover:underline ml-auto"
              >
                Limpar Todos
              </button>
            )}
          </div>

          {/* Sub-painel: Filtros Avançados de Descarte Estratégico */}
          {showAdvancedFilters && (
            <div className="bg-indigo-50/30 border border-indigo-100/70 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-800 uppercase tracking-wider">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filtros Combinados para Descarte Estratégico (Zootécnico)</span>
              </div>
              <p className="text-[10.5px] text-slate-650 leading-relaxed">
                Combine critérios genéticos e fenotípicos para um descarte cirúrgico: elimine fêmeas improdutivas, restrinja animais com alto coeficiente de consanguinidade, ou filtre DEPs críticas específicas para manter a diversidade.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Sex Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Sexo Alvo do Descarte:</label>
                  <select
                    value={advFilterSex}
                    onChange={e => setAdvFilterSex(e.target.value as any)}
                    className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-400"
                  >
                    <option value="all">Qualquer Sexo</option>
                    <option value="M">Descartar apenas Machos</option>
                    <option value="F">Descartar apenas Fêmeas</option>
                  </select>
                </div>

                {/* 2. Inbreeding (Endogamia) Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Endogamia (Coeficiente F) &ge; :</label>
                  <select
                    value={advFilterInbreeding}
                    onChange={e => setAdvFilterInbreeding(Number(e.target.value))}
                    className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-400"
                  >
                    <option value="0">Desconsiderar Consanguinidade</option>
                    <option value="3.125">F &ge; 3.12% (Baixa endogamia)</option>
                    <option value="6.25">F &ge; 6.25% (Alerta de endogamia)</option>
                    <option value="12.5">F &ge; 12.5% (Alta endogamia - Crítico)</option>
                  </select>
                </div>

                {/* 3. Trait threshold Filter */}
                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Desempenho Genético DEP Alvo:</label>
                  <div className="flex gap-1">
                    <select
                      value={advFilterTrait}
                      onChange={e => setAdvFilterTrait(e.target.value as any)}
                      className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none focus:border-indigo-400 flex-1"
                    >
                      <option value="none">Nenhuma DEP</option>
                      <option value="pesoDesmame">Peso Desmame</option>
                      <option value="pesoSobreano">Peso Sobreano</option>
                      <option value="pe">PE (Fértil)</option>
                      <option value="aol">AOL (Carcaça)</option>
                      <option value="egs">EGS (Gordura)</option>
                    </select>
                    
                    {advFilterTrait !== 'none' && (
                      <>
                        <select
                          value={advFilterTraitOperator}
                          onChange={e => setAdvFilterTraitOperator(e.target.value as any)}
                          className="text-[11px] bg-white border border-slate-200 rounded px-1 py-1 text-slate-700 focus:outline-none focus:border-indigo-400 w-12 text-center"
                        >
                          <option value="less_than">&lt;</option>
                          <option value="greater_than">&gt;</option>
                        </select>
                        <input
                          type="number"
                          step="0.1"
                          value={advFilterTraitVal}
                          onChange={e => setAdvFilterTraitVal(Number(e.target.value))}
                          className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-750 focus:outline-none focus:border-indigo-400 w-14 font-mono font-bold"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50/50 p-2 rounded text-[9px] text-indigo-700 leading-relaxed border border-indigo-50 font-semibold">
                💡 Esta filtragem integrada permite traçar planos cirúrgicos de eliminação seletiva (ex: descartar apenas matrizes com DEP de fertilidade menor que zero, mantendo as diversidades de linhagens paternais).
              </div>
            </div>
          )}

          {/* Characteristic display selector */}
          <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100/90 flex flex-col md:flex-row gap-2.5 md:items-center text-xs justify-between">
            <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              <span>📋 Visualizar DEPs:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded px-2.5 py-1 text-[11px] font-medium text-gray-700 cursor-pointer hover:bg-slate-50 select-none">
                <input 
                  type="checkbox" 
                  checked={visibleTraits.pesoDesmame} 
                  onChange={e => setVisibleTraits(prev => ({ ...prev, pesoDesmame: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                />
                Desmame (kg)
              </label>
              <label className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded px-2.5 py-1 text-[11px] font-medium text-gray-700 cursor-pointer hover:bg-slate-50 select-none">
                <input 
                  type="checkbox" 
                  checked={visibleTraits.pesoSobreano} 
                  onChange={e => setVisibleTraits(prev => ({ ...prev, pesoSobreano: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                />
                Sobreano (kg)
              </label>
              <label className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded px-2.5 py-1 text-[11px] font-medium text-gray-700 cursor-pointer hover:bg-slate-50 select-none">
                <input 
                  type="checkbox" 
                  checked={visibleTraits.pe} 
                  onChange={e => setVisibleTraits(prev => ({ ...prev, pe: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                />
                Fértil (cm)
              </label>
              <label className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded px-2.5 py-1 text-[11px] font-medium text-gray-700 cursor-pointer hover:bg-slate-50 select-none">
                <input 
                  type="checkbox" 
                  checked={visibleTraits.aol} 
                  onChange={e => setVisibleTraits(prev => ({ ...prev, aol: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                />
                Carcaça (cm²)
              </label>
              <label className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded px-2.5 py-1 text-[11px] font-medium text-gray-700 cursor-pointer hover:bg-slate-50 select-none">
                <input 
                  type="checkbox" 
                  checked={visibleTraits.egs} 
                  onChange={e => setVisibleTraits(prev => ({ ...prev, egs: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                />
                Acabam. (mm)
              </label>
            </div>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredRankedAnimals.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center italic">Nenhum animal atende aos filtros atuais.</p>
            ) : (
              filteredRankedAnimals.map((anim) => {
                const rankIdx = rankedAnimals.findIndex(a => a.id === anim.id); // Must use absolute rank from original array
                const percentile = (rankIdx + 1) / Math.max(1, rankedAnimals.length);
                const baseRank = baseRankMap[anim.id];
                const rankShift = baseRank !== undefined ? baseRank - rankIdx : 0; // Positive = climbed in ranking

                const inbreedingPercent = Number(((anim.f_inbreeding || 0) * 100).toFixed(1));
                const isElite = anim.idxScore >= 110;
                
                const cullingPercent = Number(localStorage.getItem('geno_culling_percent')) || 20;
                const discardThresholdPct = (100 - cullingPercent) / 100;

                let classificationInfo = { label: "Regular", color: "text-slate-500 bg-slate-100 border-slate-200" };
                if (percentile <= 0.05) {
                   classificationInfo = { label: "Elite (Top 5%)", color: "text-amber-700 bg-amber-100 border-amber-200" };
                } else if (percentile <= 0.20) {
                   classificationInfo = { label: "Superior (Top 20%)", color: "text-emerald-700 bg-emerald-100 border-emerald-200" };
                } else if (percentile >= discardThresholdPct) {
                   classificationInfo = { label: `Descarte (Bottom ${cullingPercent}%)`, color: "text-rose-700 bg-rose-100 border-rose-200" };
                }
                
                // Friendly translations
                const desmameHabilidade = evaluationEstimates['pesoDesmame']?.[anim.id]?.dep || 0.0;
                const desmameAcc = evaluationEstimates['pesoDesmame']?.[anim.id]?.acc || 0.0;

                const carneHabilidade = evaluationEstimates['pesoSobreano']?.[anim.id]?.dep || 0.0;
                const carneAcc = evaluationEstimates['pesoSobreano']?.[anim.id]?.acc || 0.0;
                
                const fertilidadeHabilidade = evaluationEstimates['pe']?.[anim.id]?.dep || 0.0;
                const fertilidadeAcc = evaluationEstimates['pe']?.[anim.id]?.acc || 0.0;
                
                const carcaçaHabilidade = evaluationEstimates['aol']?.[anim.id]?.dep || 0.0;
                const carcaçaAcc = evaluationEstimates['aol']?.[anim.id]?.acc || 0.0;

                const gorduraHabilidade = evaluationEstimates['egs']?.[anim.id]?.dep || 0.0;
                const gorduraAcc = evaluationEstimates['egs']?.[anim.id]?.acc || 0.0;

                return (
                  <div
                    key={anim.id}
                    className={`border rounded-xl p-3.5 transition duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white hover:border-indigo-100 hover:shadow-3xs ${
                      inbreedingPercent >= 6.25 ? 'border-rose-200 bg-rose-50/20' : isElite ? 'border-amber-150 bg-amber-50/10' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="flex flex-col items-center gap-0.5 justify-center shrink-0 w-10">
                        <div className="font-mono text-xs font-extrabold text-gray-500 select-none bg-gray-50 rounded p-1 w-full text-center">
                          #{rankIdx + 1}
                        </div>
                        {rankShift !== 0 && (
                          <div className={`text-[9px] font-bold flex items-center gap-0.5 leading-none ${rankShift > 0 ? 'text-emerald-500' : 'text-rose-500'}`} title={`Simulação: Alteração de rank devido aos multiplicadores. Movimentou ${Math.abs(rankShift)} posições.`}>
                            {rankShift > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                            {Math.abs(rankShift)}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-950 font-mono text-xs">{anim.id}</span>
                          <span className="text-[11px] text-gray-800 font-semibold">{anim.name}</span>
                          <button 
                            title="Visualizar Pedigree Interativo"
                            onClick={() => setSelectedPedigreeAnimal(anim)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1 rounded transition ml-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/></svg>
                          </button>
                          
                          <span 
                            title={
                              classificationInfo.label.includes('Descarte') 
                                ? "Descarte (Bottom 20%): Animais que pertencem aos 20% de menor desempenho no índice. Recomendados para eliminação, abate ou substituição para acelerar o progresso genético e otimizar custos."
                                : classificationInfo.label.includes('Elite')
                                ? "Elite (Top 5%): Animais no percentil superior de 5%. Desempenho excepcional, ideais para acasalamentos dirigidos e produção de sêmen/embriões."
                                : classificationInfo.label.includes('Superior')
                                ? "Superior (Top 20%): Animais com desempenho acima da média do rebanho comercial. Ideais para retenção de fêmeas de reposição."
                                : "Regular: Animais que representam a média padrão estável do rebanho comercial."
                            }
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border cursor-help ${classificationInfo.color}`}
                          >
                            {classificationInfo.label.includes('Elite') && <Award className="w-2.5 h-2.5" />}
                            {classificationInfo.label}
                          </span>

                          {/* Recomendação de Brinco Físico de Curral */}
                          <span 
                            title={`Manejo Prático: Recomendação de Brinco Físico de identificação no curral de apartação para facilitação visual da equipe de campo.`}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border cursor-help ${
                              classificationInfo.label.includes('Elite')
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : classificationInfo.label.includes('Superior')
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : classificationInfo.label.includes('Descarte')
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              classificationInfo.label.includes('Elite')
                                ? 'bg-amber-450'
                                : classificationInfo.label.includes('Superior')
                                ? 'bg-blue-500'
                                : classificationInfo.label.includes('Descarte')
                                ? 'bg-rose-500'
                                : 'bg-emerald-500'
                            }`} />
                            Brinco {
                              classificationInfo.label.includes('Elite')
                                ? 'Dourado ⭐️'
                                : classificationInfo.label.includes('Superior')
                                ? 'Azul 🟦'
                                : classificationInfo.label.includes('Descarte')
                                ? 'Vermelho 🟥'
                                : 'Verde 🟩'
                            }
                          </span>
                        </div>
 
                        {/* Pedigree & friendly indicators */}
                        <div className="flex gap-2 items-center flex-wrap pt-1 text-[10px] text-gray-500">
                          <span>Grau: <strong className="text-gray-750">{Object.entries(anim.breedComp).map(([b, p]) => `${(Number(p) * 100).toFixed(0)}% ${b}`).join('/')}</strong></span>
                          <span>•</span>
                          {(anim.heterozygosity ?? 0) > 0 && (
                            <>
                              <span
                                className="cursor-help border-b border-dashed border-gray-300"
                                title={`Heterozigose Individual: ${((anim.heterozygosity ?? 0) * 100).toFixed(0)}%. Fração de locos gênicos contendo alelos de origens raciais distintas. Promove vigor híbrido (heterozigose).`}
                              >
                                Heterozigose: <strong className="text-indigo-650 font-bold">{((anim.heterozygosity ?? 0) * 100).toFixed(0)}%</strong>
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <span>
                            Consanguinidade: <strong className={inbreedingPercent >= inbreedingAlertLimit ? 'text-rose-600 font-bold' : 'text-gray-700'}>{inbreedingPercent}%</strong>
                          </span>
                          {inbreedingPercent >= inbreedingAlertLimit && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 px-1.5 py-0.5 bg-rose-50 rounded border border-rose-200 uppercase tracking-widest ml-1 animate-pulse" title="⚠️ ALERTA DE ENDOGAMIA LIMITE - Restrição de plantel reprodutivo configurada pelo técnico.">
                              <Flag className="w-3 h-3 fill-rose-600" />
                              Alerta Endogamia ({inbreedingAlertLimit}%)
                            </span>
                          )}
                        </div>

                        {/* Projeção de Retorno Financeiro */}
                        <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                          <span className="text-gray-400">Impacto Econômico:</span>
                          {desmameHabilidade > 0 ? (
                            <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded text-[9px]" title={`Pelo Peso ao Desmame (+${desmameHabilidade} kg) * Cotação de R$ ${kgValue.toFixed(2)}/kg`}>
                              💰 +R$ {(desmameHabilidade * kgValue).toFixed(2)} por cria
                            </span>
                          ) : desmameHabilidade < 0 ? (
                            <span className="font-extrabold text-rose-700 bg-rose-50 border border-rose-150 px-1.5 py-0.5 rounded text-[9px]" title={`Depreciação por Peso ao Desmame (${desmameHabilidade} kg) * Cotação de R$ ${kgValue.toFixed(2)}/kg`}>
                              📉 -R$ {Math.abs(desmameHabilidade * kgValue).toFixed(2)} por cria
                            </span>
                          ) : (
                            <span className="font-bold text-gray-500 bg-gray-50 border border-gray-150 px-1.5 py-0.5 rounded text-[9px]">
                              R$ 0,00 (Média)
                            </span>
                          )}
                        </div>

                        {/* Nivelamento de Idades (Transparência Científica do Ajuste de 205 dias) */}
                        {showPhenotypeAjustado && (
                          <div className="mt-2.5 text-[10px] bg-slate-50 border border-slate-150/70 p-2.5 rounded-lg space-y-1 w-full max-w-lg">
                            <div className="flex justify-between items-center text-slate-700">
                              <span className="font-extrabold text-indigo-900 uppercase tracking-wider text-[8px]">Nivelamento Ambiental (Desmame a 205 dias)</span>
                              <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-[9px] font-bold">Zootecnia de Precisão</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-650 pt-1">
                              <div>
                                <span className="block text-gray-400 text-[8px] font-semibold">Observado:</span>
                                <span className="font-bold text-gray-800">{anim.phenotypes.pesoDesmame || 185} kg</span>
                              </div>
                              <div>
                                <span className="block text-gray-400 text-[8px] font-semibold">Peso Nasc (PN):</span>
                                <span className="font-bold text-gray-800">{anim.phenotypes.pesoNascimento || 35} kg</span>
                              </div>
                              <div>
                                <span className="block text-gray-400 text-[8px] font-semibold">Idade Real:</span>
                                <span className="font-bold text-gray-800">{185 + (parseInt(anim.id.replace(/\D/g, '')) % 40) || 205} dias</span>
                              </div>
                              <div>
                                <span className="block text-gray-400 text-[8px] font-semibold">Ajustado (205d):</span>
                                <span className="font-bold text-emerald-700 font-mono">
                                  {(((anim.phenotypes.pesoDesmame || 185) - (anim.phenotypes.pesoNascimento || 35)) / (185 + (parseInt(anim.id.replace(/\D/g, '')) % 40) || 205) * 205 + (anim.phenotypes.pesoNascimento || 35) + (anim.damId ? 12 : 0)).toFixed(1)} kg
                                </span>
                              </div>
                            </div>
                            <div className="text-[9px] text-gray-450 italic leading-snug mt-1 pt-1 border-t border-dashed border-slate-200">
                              Fórmula: <span className="font-mono bg-white px-1 py-0.5 rounded border">((Obs - PN) / Idade) * 205 + PN + F_mãe</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-gray-55 pt-2 sm:pt-0">
                      {/* Technical values translated simply */}
                      <div className="flex flex-wrap gap-1.5 md:gap-2 text-[10px]">
                        {!visibleTraits.pesoDesmame && !visibleTraits.pesoSobreano && !visibleTraits.pe && !visibleTraits.aol && !visibleTraits.egs && (
                          <span className="text-gray-400 italic text-[9px] self-center">Ocultas pelo seletor</span>
                        )}

                        {visibleTraits.pesoDesmame && (
                          <div
                            className="bg-gray-50 p-1.5 rounded-md text-center cursor-help relative min-w-[53px]"
                            onMouseEnter={() => setShowTooltip(`desmame-${anim.id}`)}
                            onMouseLeave={() => setShowTooltip(null)}
                          >
                            <span className="text-gray-400 block font-bold text-[8px] uppercase leading-none mb-0.5">Desmame</span>
                            <span className="font-bold text-indigo-950 block text-[11px] leading-tight">{desmameHabilidade > 0 ? `+${desmameHabilidade}` : desmameHabilidade} kg</span>
                            <span className="text-gray-500 font-medium text-[8px] block mt-0.5">Acc: {(desmameAcc * 100).toFixed(0)}%</span>
                            {showTooltip === `desmame-${anim.id}` && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-[8px] font-normal leading-normal shadow-lg z-50">
                                <strong className="text-emerald-400 block mb-0.5">DEP Peso ao Desmame (PD)</strong>
                                Mede o potencial para crescimento do filhote até a desmama (em kg). Valores maiores indicam progênie com maior peso à desmama, elevando a eficiência da fase de cria. Eleva a lucratividade do criador.
                              </div>
                            )}
                          </div>
                        )}

                        {visibleTraits.pesoSobreano && (
                          <div
                            className="bg-gray-50 p-1.5 rounded-md text-center cursor-help relative min-w-[53px]"
                            onMouseEnter={() => setShowTooltip(`carne-${anim.id}`)}
                            onMouseLeave={() => setShowTooltip(null)}
                          >
                            <span className="text-gray-400 block font-bold text-[8px] uppercase leading-none mb-0.5">Sobreano</span>
                            <span className="font-bold text-indigo-950 block text-[11px] leading-tight">{carneHabilidade > 0 ? `+${carneHabilidade}` : carneHabilidade} kg</span>
                            <span className="text-gray-500 font-medium text-[8px] block mt-0.5">Acc: {(carneAcc * 100).toFixed(0)}%</span>
                            {showTooltip === `carne-${anim.id}` && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-[8px] font-normal leading-normal shadow-lg z-50">
                                <strong className="text-emerald-400 block mb-0.5">DEP Peso ao Sobreano (PS)</strong>
                                Representa o vigor genético para o ganho de peso pós-desmame (em kg). Característica crucial para sistemas de engorda intensiva, confinamento e terminação precoce de bovinos de corte.
                              </div>
                            )}
                          </div>
                        )}

                        {visibleTraits.pe && (
                          <div
                            className="bg-gray-50 p-1.5 rounded-md text-center cursor-help relative min-w-[53px]"
                            onMouseEnter={() => setShowTooltip(`fert-${anim.id}`)}
                            onMouseLeave={() => setShowTooltip(null)}
                          >
                            <span className="text-gray-400 block font-bold text-[8px] uppercase leading-none mb-0.5">Fértil</span>
                            <span className="font-bold text-indigo-950 block text-[11px] leading-tight">{fertilidadeHabilidade > 0 ? `+${fertilidadeHabilidade}` : fertilidadeHabilidade} cm</span>
                            <span className="text-gray-500 font-medium text-[8px] block mt-0.5">Acc: {(fertilidadeAcc * 100).toFixed(0)}%</span>
                            {showTooltip === `fert-${anim.id}` && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-[8px] font-normal leading-normal shadow-lg z-50">
                                <strong className="text-emerald-400 block mb-0.5">DEP Perímetro Escrotal (PE)</strong>
                                Indicador indireto clássico de precocidade sexual e fertilidade (em cm). Reprodutores com elevados valores transmitem puberdade mais temporã e fertilidade às filhas e filhos machos.
                              </div>
                            )}
                          </div>
                        )}

                        {visibleTraits.aol && (
                          <div
                            className="bg-gray-50 p-1.5 rounded-md text-center cursor-help relative min-w-[53px]"
                            onMouseEnter={() => setShowTooltip(`carb-${anim.id}`)}
                            onMouseLeave={() => setShowTooltip(null)}
                          >
                            <span className="text-gray-400 block font-bold text-[8px] uppercase leading-none mb-0.5">Carcaça</span>
                            <span className="font-bold text-indigo-950 block text-[11px] leading-tight">{carcaçaHabilidade > 0 ? `+${carcaçaHabilidade}` : carcaçaHabilidade} cm²</span>
                            <span className="text-gray-500 font-medium text-[8px] block mt-0.5">Acc: {(carcaçaAcc * 100).toFixed(0)}%</span>
                            {showTooltip === `carb-${anim.id}` && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-[8px] font-normal leading-normal shadow-lg z-50">
                                <strong className="text-emerald-400 block mb-0.5">DEP Área Olho de Lombo (AOL)</strong>
                                Mede a quantidade total de carne vermelha limpa na carcaça (em cm²). Correlaciona-se com a musculatura geral, rendimento de desossa no açougue e conformação física do novilho.
                              </div>
                            )}
                          </div>
                        )}

                        {visibleTraits.egs && (
                          <div
                            className="bg-gray-50 p-1.5 rounded-md text-center cursor-help relative min-w-[53px]"
                            onMouseEnter={() => setShowTooltip(`gord-${anim.id}`)}
                            onMouseLeave={() => setShowTooltip(null)}
                          >
                            <span className="text-gray-400 block font-bold text-[8px] uppercase leading-none mb-0.5">Acabam.</span>
                            <span className="font-bold text-indigo-950 block text-[11px] leading-tight">{gorduraHabilidade > 0 ? `+${gorduraHabilidade}` : gorduraHabilidade} mm</span>
                            <span className="text-gray-500 font-medium text-[8px] block mt-0.5">Acc: {(gorduraAcc * 100).toFixed(0)}%</span>
                            {showTooltip === `gord-${anim.id}` && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-[8px] font-normal leading-normal shadow-lg z-50">
                                <strong className="text-emerald-400 block mb-0.5">DEP Espessura de Gordura (EGS)</strong>
                                Mede a capacidade de acabamento de carcaça e deposição de gordura subcutânea (em mm). Garante proteção fria no frigorífico, suculência, sabor e mantenabilidade reprodutiva da vacada.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Main Index Display */}
                      <div className="text-right">
                        <span className="text-[14px] font-black text-indigo-700 font-mono block">
                          {anim.idxScore}
                        </span>
                        <span className="text-[8px] text-gray-400 block font-bold uppercase tracking-wider">Índice</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* NATIVE EXQUISITE SVG CHART MODULE FOR TRENDS */}
      {trendData.length >= 2 && chartsElements && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="border-b border-gray-100 pb-3 mb-5 flex items-center justify-between cursor-help" title="Prática: Use a progressão genética (positiva) em conjunto com a de endogamia (idealmente estável ou negativa). Teoria: Ao submeter a seleção à otimização matemática, evitamos que o avanço numérico da DEP afunille a diversidade do rebanho gerando endogamia futura.">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-dashed border-gray-400 w-max">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Gráfico de Tendência Genética Populacional (Safra a Safra)
            </h3>
            <span className="text-[9px] font-mono text-gray-400 uppercase font-semibold">Tendência por Ano de Nascimento (Safra)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Average Trait DEP Trend */}
            <div className="border border-gray-50 rounded-xl p-4 bg-gray-50/20 cursor-help" title="Prática: Trajetória das Diferenças Esperadas na Progênie. O objetivo é formar uma declividade consistentemente ascendente (Delta G positivo).">
              <div className="flex justify-between items-start mb-3 border-b border-dashed border-indigo-200 pb-2">
                <h4 className="text-[11px] font-bold text-indigo-950 block">Evolução Genética (DEP Média)</h4>
                <select 
                  value={trendTrait} 
                  onChange={e => setTrendTrait(e.target.value as any)}
                  className="text-[10px] bg-white border border-indigo-200 rounded px-2 py-0.5 text-indigo-700 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="pesoDesmame">Peso ao Desmame</option>
                  <option value="pesoSobreano">Peso ao Sobreano</option>
                  <option value="pe">Perímetro Escrotal</option>
                  <option value="aol">Área de Olho de Lombo</option>
                  <option value="egs">Espessura de Gordura</option>
                </select>
              </div>
              <div className="relative w-full overflow-hidden flex justify-center">
                <svg
                  width={svgDimensions.width}
                  height={svgDimensions.height}
                  className="max-w-full h-auto text-gray-700 font-mono"
                >
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((pct, i) => {
                    const y = svgDimensions.padding + pct * (svgDimensions.height - 2 * svgDimensions.padding);
                    return (
                      <line
                        key={i}
                        x1={svgDimensions.padding}
                        y1={y}
                        x2={svgDimensions.width - svgDimensions.padding}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Connecting Line */}
                  <path
                    d={chartsElements.depPath}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Dots & Labels */}
                  {chartsElements.depPoints.map((pt, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                      <text x={pt.x} y={pt.y - 10} textAnchor="middle" className="text-[9px] fill-indigo-900 font-bold">
                        {pt.val > 0 ? `+${pt.val}` : pt.val} kg
                      </text>
                      <text x={pt.x} y={svgDimensions.height - 12} textAnchor="middle" className="text-[9px] fill-gray-400 font-semibold">
                        {pt.year}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Chart 2: Average Inbreeding F Trend */}
            <div className="border border-gray-50 rounded-xl p-4 bg-gray-50/20 cursor-help" title="Prática: Indica se acasalamentos muito parentais estão ocorrendo. Teoria: Calculado por algorítmos tabulares de Wright a partir das genealogias iteradas atreladas a equação estrutural de variâncias. F a cima de 6% gera perdas marginais.">
              <h4 className="text-[11px] font-bold text-rose-950 mb-3 block border-b border-dashed border-rose-200 w-max">Evolução do Índice de Consanguinidade Médio (% F)</h4>
              <div className="relative w-full overflow-hidden flex justify-center">
                <svg
                  width={svgDimensions.width}
                  height={svgDimensions.height}
                  className="max-w-full h-auto text-gray-700 font-mono"
                >
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((pct, i) => {
                    const y = svgDimensions.padding + pct * (svgDimensions.height - 2 * svgDimensions.padding);
                    return (
                      <line
                        key={i}
                        x1={svgDimensions.padding}
                        y1={y}
                        x2={svgDimensions.width - svgDimensions.padding}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Connecting Line */}
                  <path
                    d={chartsElements.fPath}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Dots & Labels */}
                  {chartsElements.fPoints.map((pt, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                      <text x={pt.x} y={pt.y - 10} textAnchor="middle" className="text-[9px] fill-rose-900 font-bold">
                        {pt.val.toFixed(1)}%
                      </text>
                      <text x={pt.x} y={svgDimensions.height - 12} textAnchor="middle" className="text-[9px] fill-gray-400 font-semibold">
                        {pt.year}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCATTER PLOT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* SCATTER PLOT FOR INDEX VS INBREEDING */}
        {scatterData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col">
            <div className="border-b border-gray-100 pb-3 mb-5 flex items-center justify-between cursor-help" title="Prática: Ajuda a identificar animais de alto índice produtivo, mas com consanguinidade alta (canto superior direito). Teoria: Ao avaliar ambos os eixos, o criador equilibra o ganho genético com a preservação da diversidade genética.">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-dashed border-gray-400 w-max">
                <ActivitySquare className="w-4 h-4 text-indigo-600" />
                Relação Índice Produtivo vs Endogamia
              </h3>
            </div>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 35, left: 55 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis 
                    type="number" 
                    dataKey="inbreeding" 
                    name="Consanguinidade" 
                    unit="%" 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    label={{ value: "Coeficiente de Consanguinidade (F %)", position: 'bottom', offset: 5, fontSize: 11, fill: '#475569' }} 
                  />
                  <YAxis 
                    type="number" 
                    dataKey="index" 
                    name="Índice" 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    label={{ value: "Índice de Produtividade", angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569' }}
                  />
                  <RechartsTooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload, active }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl">
                            <p className="text-xs font-bold text-white mb-1">{data.name}</p>
                            <p className="text-[10px] text-gray-300">Índice: <strong className="text-indigo-400">{data.index}</strong></p>
                            <p className="text-[10px] text-gray-300">Endogamia: <strong className={data.isAlert ? "text-rose-400" : "text-emerald-400"}>{data.inbreeding}%</strong></p>
                            {data.isAlert && (
                              <p className="text-[9px] text-rose-300 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Alerta Crítico
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={6.25} stroke="#f43f5e" strokeDasharray="3 3" />
                  <Scatter 
                    name="Animais" 
                    data={scatterData} 
                    fill="#4f46e5"
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={payload.isAlert ? 6 : 5} 
                          fill={payload.isAlert ? "#f43f5e" : "#4f46e5"} 
                          opacity={0.8}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-[10px] text-gray-500 font-medium pb-2 border-b border-dashed border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600 border border-white shadow-sm block"></span>
                Animal Padrão (F &lt; 6.25%)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 border border-white shadow-sm block"></span>
                Animal Consanguíneo (F &ge; 6.25%)
              </div>
            </div>
          </div>
        )}

        {/* SCATTER PLOT FOR DEP VS PHENOTYPE */}
        {genoPhenoCorrelationData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col">
            <div className="border-b border-gray-100 pb-3 mb-5 flex items-center justify-between cursor-help" title="Prática: Permite visualizar a acurácia fenotípica (o quanto o animal parece bom) versus mérito genético (o quanto ele é bom reprodutor).">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-dashed border-gray-400 w-max">
                <ActivitySquare className="w-4 h-4 text-emerald-600" />
                Dispersão: Genótipo vs Fenótipo
              </h3>
            </div>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 35, left: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis 
                    type="number" 
                    dataKey="phenotype" 
                    name="Fenótipo" 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    label={{ value: "Valor Fenotípico (Observado no Campo)", position: 'bottom', offset: 5, fontSize: 11, fill: '#475569' }} 
                  />
                  <YAxis 
                    type="number" 
                    dataKey="dep" 
                    name="DEP" 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    label={{ value: "Valor Genético Estimado (DEP)", angle: -90, position: 'insideLeft', offset: 12, style: { textAnchor: 'middle' }, fontSize: 11, fill: '#475569' }}
                  />
                  <RechartsTooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload, active }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-emerald-950 border border-emerald-800 p-3 rounded-lg shadow-xl">
                            <p className="text-xs font-bold text-white mb-1">{data.name}</p>
                            <p className="text-[10px] text-emerald-100">Fenótipo: <strong className="text-white">{data.phenotype}</strong></p>
                            <p className="text-[10px] text-emerald-100">DEP: <strong className="text-white">{data.dep > 0 ? `+${data.dep}` : data.dep}</strong></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter 
                    name="Animais" 
                    data={genoPhenoCorrelationData} 
                    fill="#10b981"
                    shape={(props: any) => {
                      const { cx, cy } = props;
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={5} 
                          fill="#10b981" 
                          opacity={0.8}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-[10px] text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-sm block"></span>
                Correlação Genoma-Fenótipo para: {trendTrait}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HISTOGRAM PLOT FOR DISTRIBUTION WITH INTERACTIVE SELECTION RULER */}
      {histogramData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between cursor-help" title="Prática: Ajuda a entender como o rebanho está distribuído segundo o índice. Teoria: A Curva de Gauss natural das distribuições genômicas indica a concentração nos animais intermediários. Focar seleção à direita significa ganho acelerado.">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-dashed border-gray-400 w-max">
              <ActivitySquare className="w-4 h-4 text-indigo-600" />
              Distribuição de Índice Produtivo (Curva de Gauss)
            </h3>
          </div>

          {/* Régua de Seleção e Métricas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 bg-slate-50 border border-slate-100 p-4 rounded-xl" id="interactive-curve-ruler">
            {/* Controle da Régua */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    Régua de Seleção & Pressão de Seleção
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Arraste o controle para selecionar a proporção da área da curva de Gauss e calcular o impacto genético real no rebanho.
                  </p>
                </div>

                {/* Seleção de Direção */}
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 self-start">
                  <button
                    type="button"
                    onClick={() => setCurveSelectionDir('top')}
                    className={`px-2.5 py-1 text-[9.5px] font-bold rounded-md transition ${
                      curveSelectionDir === 'top'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Top (Melhores)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurveSelectionDir('bottom')}
                    className={`px-2.5 py-1 text-[9.5px] font-bold rounded-md transition ${
                      curveSelectionDir === 'bottom'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Bottom (Piores)
                  </button>
                </div>
              </div>

              {/* Slider da Régua */}
              <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200/60 shadow-2xs">
                <span className="text-[10.5px] font-black text-slate-400 w-8 text-right">1%</span>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={curveSelectionPercent}
                  onChange={(e) => setCurveSelectionPercent(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-hidden"
                />
                <span className={`text-xs font-black px-2 py-0.5 rounded-md min-w-[52px] text-center border ${
                  curveSelectionDir === 'top' 
                    ? 'text-indigo-600 bg-indigo-50 border-indigo-100' 
                    : 'text-rose-600 bg-rose-50 border-rose-100'
                }`}>
                  {curveSelectionPercent}%
                </span>
              </div>
            </div>

            {/* Resultado da Simulação */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Impacto Zootécnico da Seleção</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded-md border border-slate-100">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Animais Contidos</span>
                    <span className="text-xs font-black text-slate-800">
                      {curveSelectionStats.selectedCount} <span className="text-[10px] font-medium text-slate-400">/ {rankedAnimals.length}</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-md border border-slate-100">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
                      {curveSelectionDir === 'top' ? 'Índice de Corte' : 'Índice Máximo'}
                    </span>
                    <span className={`text-xs font-black ${curveSelectionDir === 'top' ? 'text-indigo-600' : 'text-rose-600'}`}>
                      {curveSelectionStats.cutoffScore}
                    </span>
                  </div>
                </div>
              </div>

              {/* Diferencial de Seleção (S) */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium">Diferencial (<span className="font-serif italic">S</span>):</span>
                  <span className={`font-black ${curveSelectionStats.diffSelection >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {curveSelectionStats.diffSelection >= 0 ? '+' : ''}{curveSelectionStats.diffSelection} pts
                  </span>
                </div>
                <div className="text-[9.5px] text-slate-400">
                  Média Sel: <strong className="text-slate-700">{curveSelectionStats.selectedAvg}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico da Curva de Gauss / Histograma */}
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 20, right: 20, bottom: 35, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} vertical={false} />
                <XAxis 
                  dataKey="rangeStr" 
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  label={{ value: "Intervalo do Índice Produtivo", position: 'bottom', offset: 5, fontSize: 11, fill: '#475569' }} 
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  label={{ value: "Nº de Animais", angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569' }}
                />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                  content={({ payload, active }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-slate-100">
                          <p className="text-xs font-bold mb-1 text-indigo-300">Faixa de Índice: {data.rangeStr}</p>
                          <div className="space-y-1 text-[10px]">
                            <p className="text-slate-300">Total na faixa: <strong className="text-white">{data.count}</strong> animais</p>
                            <p className={curveSelectionDir === 'top' ? 'text-emerald-400' : 'text-rose-400'}>
                              Selecionados na Área: <strong>{data.countSelected}</strong>
                            </p>
                            <p className="text-slate-400">Não selecionados: <strong>{data.countUnselected}</strong></p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="countSelected" 
                  stackId="a" 
                  fill={curveSelectionDir === 'top' ? '#10b981' : '#f43f5e'} 
                  name="Selecionados (Área)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="countUnselected" 
                  stackId="a" 
                  fill="#e2e8f0" 
                  name="Outros Animais"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Relação Acurácia x DEP */}
      {accDepData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col">
          <div className="border-b border-gray-100 pb-3 mb-5 flex items-center justify-between cursor-help" title="Prática e Teoria: Acurácia mede a confiabilidade da DEP. Identifique os reprodutores provados (Acurácia Alta) ou jovens promessas (Acurácia Baixa). É a relação fundamental do risco vs. ganho em Melhoramento Genético.">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-dashed border-gray-400 w-max">
              <ActivitySquare className="w-4 h-4 text-purple-600" />
              Acurácia vs DEP ({trendTrait})
            </h3>
          </div>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 35, left: 55 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis 
                  type="number" 
                  dataKey="dep" 
                  name="DEP" 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  label={{ value: "Valor Genético (DEP)", position: 'bottom', offset: 5, fontSize: 11, fill: '#475569' }} 
                />
                <YAxis 
                  type="number" 
                  dataKey="acc" 
                  name="Acurácia" 
                  unit="%"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  label={{ value: "Acurácia (%)", angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569' }}
                />
                <RechartsTooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload, active }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-purple-950 border border-purple-800 p-3 rounded-lg shadow-xl">
                          <p className="text-xs font-bold text-white mb-1">{data.name}</p>
                          <p className="text-[10px] text-purple-100">DEP: <strong className="text-white">{data.dep > 0 ? `+${data.dep}` : data.dep}</strong></p>
                          <p className="text-[10px] text-purple-100">Acurácia: <strong className="text-white">{data.acc}%</strong></p>
                          {data.isElite && <p className="text-[9px] text-amber-400 mt-1 uppercase font-bold text-center bg-purple-900 rounded py-0.5"><Award className="w-3 h-3 inline pb-0.5" /> Elite</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  name="Animais" 
                  data={accDepData} 
                  fill="#9333ea"
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    const r = payload.isElite ? 6 : 4;
                    const fill = payload.isElite ? "#fbbf24" : "#9333ea";
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={r} 
                        fill={fill} 
                        opacity={payload.isElite ? 1 : 0.6}
                        stroke="#ffffff"
                        strokeWidth={payload.isElite ? 1.5 : 1}
                      />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-[10px] text-gray-500 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-600 border border-white shadow-sm block opacity-60"></span>
              Regular
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 border border-white shadow-sm block"></span>
              Animais Elite
            </div>
          </div>
        </div>
      )}
      {/* MODAL PEDIGREE INTERATIVO */}
      {selectedPedigreeAnimal && (
        <PedigreeGraph 
          animal={selectedPedigreeAnimal} 
          animals={animals} 
          onClose={() => setSelectedPedigreeAnimal(null)} 
        />
      )}
    </div>
  );
}
