/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Animal, SelectionIndexConfig } from '../types';
import { recommendSiresForDam as runRecommender, buildClosedSortedPedigree, computeRelationshipMatrix, calculateSelectionIndex } from '../utils/math';
import { HeartHandshake, AlertTriangle, ShieldCheck, TrendingUp, Sparkles, Scale, Info, Zap, Eye, FileSpreadsheet, HelpCircle, BookOpen, GraduationCap, Award, RotateCcw, Dna } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import ProgenyModal from './ProgenyModal';

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
        className="text-slate-400 hover:text-indigo-400 transition-colors cursor-help inline-flex items-center justify-center p-0.5 ml-1"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {active && (
        <div className={`absolute ${posClass} w-72 bg-slate-900 text-slate-100 rounded-xl p-3 text-xs font-normal leading-relaxed shadow-xl z-50 border border-slate-800 text-left normal-case tracking-normal`}>
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

// Scale factors to normalize DEPs into 0-100 radar chart (where 50 = average/zero)
const traitScales: Record<string, number> = {
  pesoDesmame: 10,
  pesoSobreano: 15,
  pe: 2,
  aol: 4,
  egs: 1.5
};

const normalizeDep = (dep: number, traitName: string) => {
  const maxScale = traitScales[traitName] || 10;
  // Mapped from -maxScale..+maxScale to 0..100
  const normalized = ((dep + maxScale) / (2 * maxScale)) * 100;
  return Math.max(0, Math.min(100, normalized));
};

const maxVariances: Record<string, number> = {
  pesoDesmame: 4.5,
  pesoSobreano: 6.5,
  pe: 0.8,
  aol: 1.5,
  egs: 0.6
};

const TRAITS_OPTIONS = [
  { key: 'pesoNascimento', label: 'PN (kg)', shortKey: 'PN', bg: 'bg-stone-50 border-stone-100 text-stone-800' },
  { key: 'pesoDesmame', label: 'PD (kg)', shortKey: 'PD', bg: 'bg-emerald-50 border-emerald-100 text-emerald-800' },
  { key: 'pesoSobreano', label: 'PS (kg)', shortKey: 'PS', bg: 'bg-indigo-50 border-indigo-100 text-indigo-800' },
  { key: 'gmd', label: 'GMD (g/d)', shortKey: 'GMD', bg: 'bg-cyan-50 border-cyan-100 text-cyan-800' },
  { key: 'pe', label: 'PE (cm)', shortKey: 'PE', bg: 'bg-amber-50 border-amber-100 text-amber-800' },
  { key: 'aol', label: 'AOL (cm²)', shortKey: 'AOL', bg: 'bg-blue-50 border-blue-100 text-blue-800' },
  { key: 'egs', label: 'EGS (mm)', shortKey: 'EGS', bg: 'bg-rose-50 border-rose-100 text-rose-800' },
  { key: 'marmoreio', label: 'Marm.', shortKey: 'MARM', bg: 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-800' },
];

interface MatingWizardProps {
  animals: Animal[];
  indexConfig: SelectionIndexConfig;
  evaluationEstimates: { [trait: string]: { [id: string]: { dep: number; acc: number } } };
  selectedSpecies?: 'bovino';
  onSelectedSpeciesChange?: (species: 'bovino') => void;
  viewMode?: 'producer' | 'academic';
}

export default function MatingWizard({ 
  animals, 
  indexConfig, 
  evaluationEstimates,
  selectedSpecies: propSelectedSpecies,
  onSelectedSpeciesChange,
  viewMode = 'producer'
}: MatingWizardProps) {
  const [localSpecies, setLocalSpecies] = useState<'bovino'>('bovino');
  const selectedSpecies = propSelectedSpecies !== undefined ? propSelectedSpecies : localSpecies;
  const setSelectedSpecies = onSelectedSpeciesChange !== undefined ? onSelectedSpeciesChange : setLocalSpecies;
  const [matingMode, setMatingMode] = useState<'individual' | 'lote' | 'multitouro'>('individual');
  const batchMode = matingMode === 'lote';
  const [selectedMultiBulls, setSelectedMultiBulls] = useState<string[]>([]);
  const [collectiveResults, setCollectiveResults] = useState<any | null>(null);
  const [maxCowsPerBull, setMaxCowsPerBull] = useState<number>(10);

  const [selectedDamId, setSelectedDamId] = useState('');
  const [selectedSireId, setSelectedSireId] = useState('');
  const [selectedLote, setSelectedLote] = useState('');
  const [presetMode, setPresetMode] = useState<'padrao' | 'ciclo_curto' | 'reposicao'>('padrao');
  const [lambdaPenalty, setLambdaPenalty] = useState<number>(80); // lambda parameter for inbreeding
  const [maxFTolerance, setMaxFTolerance] = useState<number>(6.25); // Hard block for inbreeding %
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Academic Mode States for Planned Mating
  const [academicSubTab, setAcademicSubTab] = useState<'didactic' | 'traditional'>('didactic');
  const [simulatedF, setSimulatedF] = useState<number>(6.25);
  const [simulatedLambda, setSimulatedLambda] = useState<number>(100);
  const [simulatedDamBreed, setSimulatedDamBreed] = useState<'nelore' | 'angus' | 'f1_ang_nel'>('nelore');
  const [simulatedSireBreed, setSimulatedSireBreed] = useState<'nelore' | 'angus' | 'hereford' | 'senepol'>('angus');
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  const runCollectiveOptimization = () => {
    if (!selectedLote) {
      alert("Selecione um lote de fêmeas!");
      return;
    }
    if (selectedMultiBulls.length === 0) {
      alert("Selecione pelo menos um touro disponível para o IATF Coletivo!");
      return;
    }

    const damsInLote = availableDams.filter(d => `${d.rebanho} - ${d.manejo}` === selectedLote);
    if (damsInLote.length === 0) {
      alert("Nenhuma fêmea encontrada no lote selecionado!");
      return;
    }

    const sortedPed = buildClosedSortedPedigree(animals);
    const relationshipResult = computeRelationshipMatrix(sortedPed);
    const A = relationshipResult.A;
    const idxToId = new Map<string, number>();
    relationshipResult.ids.forEach((id, i) => idxToId.set(id, i));

    const siresList = animals.filter(a => selectedMultiBulls.includes(a.id));

    // For each dam, evaluate all selected sires, calculate MSI score, filter out those that exceed maxFTolerance
    const pairingMatrix: any[] = [];

    damsInLote.forEach(dam => {
      const candidates: any[] = [];
      siresList.forEach(sire => {
        let fProj = 0.0;
        const sireIdx = idxToId.get(sire.id);
        const damIdx = idxToId.get(dam.id);

        if (sireIdx !== undefined && damIdx !== undefined) {
          fProj = 0.5 * A[sireIdx][damIdx];
        }

        const fPercent = Number((fProj * 100).toFixed(3));
        if (fPercent > maxFTolerance) {
          // Summary discard: exceeds hard limit!
          return;
        }

        const sireIndexVal = calculateSelectionIndex(sire, effectiveIndexConfig, evaluationEstimates);
        const damIndexVal = calculateSelectionIndex(dam, effectiveIndexConfig, evaluationEstimates);
        const indexProj = Number(((sireIndexVal + damIndexVal) / 2).toFixed(2));
        const msiScore = Number((indexProj - (fProj * lambdaPenalty)).toFixed(4));

        let risk: 'safe' | 'warning' | 'high_risk' = 'safe';
        if (fProj >= 0.0625) {
          risk = 'high_risk';
        } else if (fProj >= 0.03125) {
          risk = 'warning';
        }

        candidates.push({
          sire,
          dam,
          fProj: fPercent,
          indexProj,
          msiScore,
          riskStatus: risk
        });
      });

      // Sort candidates by penalized msiScore descending
      candidates.sort((a, b) => b.msiScore - a.msiScore);
      pairingMatrix.push({
        dam,
        candidates
      });
    });

    // Solve using a capped greedy assignment or Stable-Marriage approximation to distribute bulls
    // Let's keep track of how many cows are assigned to each bull
    const bullCounts: { [sireId: string]: number } = {};
    selectedMultiBulls.forEach(id => { bullCounts[id] = 0; });

    const finalPairings: any[] = [];

    // Simple, elegant capped greedy assignment
    pairingMatrix.forEach(entry => {
      const dam = entry.dam;
      // Find the first candidate whose bull has not reached the cap, otherwise take the next best, or any fallback
      let chosen = entry.candidates.find((c: any) => bullCounts[c.sire.id] < maxCowsPerBull);
      if (!chosen && entry.candidates.length > 0) {
        // Fallback: ignore the cap if all selected bulls are full (since we must pair every cow)
        chosen = entry.candidates[0];
      }

      if (chosen) {
        bullCounts[chosen.sire.id]++;
        
        // Breed Composition projection
        let projectedBreedComp: Record<string, number> = {};
        Object.entries(dam.breedComp).forEach(([b, frac]) => {
          projectedBreedComp[b] = (projectedBreedComp[b] || 0) + (frac as number) * 0.5;
        });
        Object.entries(chosen.sire.breedComp).forEach(([b, frac]) => {
          projectedBreedComp[b] = (projectedBreedComp[b] || 0) + (frac as number) * 0.5;
        });

        const progenyBreedStr = Object.entries(projectedBreedComp)
          .sort((a,b) => b[1] - a[1])
          .map(([b, frac]) => `${b} ${(frac * 100).toFixed(0)}%`)
          .join(' / ');

        finalPairings.push({
          dam,
          sire: chosen.sire,
          fOffspringProj: chosen.fProj,
          indexProj: chosen.indexProj,
          msiScore: chosen.msiScore,
          riskStatus: chosen.riskStatus,
          progenyBreedStr
        });
      }
    });

    // Calculate aggregated results
    const totalDams = finalPairings.length;
    const activeSiresCount = Object.values(bullCounts).filter(c => c > 0).length;
    
    const sumIndexProj = finalPairings.reduce((sum, p) => sum + p.indexProj, 0);
    const avgIndexProj = totalDams > 0 ? Number((sumIndexProj / totalDams).toFixed(2)) : 0;

    const sumFProj = finalPairings.reduce((sum, p) => sum + p.fOffspringProj, 0);
    const avgFProj = totalDams > 0 ? Number((sumFProj / totalDams).toFixed(3)) : 0;

    setCollectiveResults({
      pairings: finalPairings,
      bullDistribution: bullCounts,
      stats: {
        totalDams,
        activeSiresCount,
        avgIndexProj,
        avgFProj
      }
    });
  };

  const exportCollectiveMatingXLSX = () => {
    if (!collectiveResults) return;
    const headers = [
      "ID Matriz", "Nome Matriz", "Composição Matriz", "Rebanho", "Manejo",
      "ID Reprodutor Designado", "Nome Reprodutor", "Raça Reprodutor",
      "Consanguinidade Offspring (F%)", "Status Consanguinidade", "Índice de Seleção Projetado", "Índice Penalizado (MSI)"
    ];

    const data = collectiveResults.pairings.map((p: any) => ({
      "ID Matriz": p.dam.id,
      "Nome Matriz": p.dam.name,
      "Composição Matriz": Object.keys(p.dam.breedComp).join('/'),
      "Rebanho": p.dam.rebanho,
      "Manejo": p.dam.manejo,
      "ID Reprodutor Designado": p.sire.id,
      "Nome Reprodutor": p.sire.name,
      "Raça Reprodutor": Object.keys(p.sire.breedComp).join('/'),
      "Consanguinidade Offspring (F%)": p.fOffspringProj,
      "Status Consanguinidade": p.riskStatus === 'safe' ? 'Seguro' : p.riskStatus === 'warning' ? 'Atenção' : 'Alto Risco',
      "Índice de Seleção Projetado": p.indexProj,
      "Índice Penalizado (MSI)": p.msiScore
    }));

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plano_IATF_Coletivo');
    
    // Auto column size adjustments
    const colWidths = headers.map(h => ({ wch: Math.max(h.length + 3, 14) }));
    worksheet['!cols'] = colWidths;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `plano_acasalamento_IATF_coletivo_${selectedSpecies}_${selectedLote}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const [selectedTraitsKeys, setSelectedTraitsKeys] = useState<string[]>(['pesoDesmame', 'pesoSobreano', 'pe', 'aol', 'egs']);
  const [progenyModalData, setProgenyModalData] = useState<{
    sire: Animal;
    dam: Animal;
    fOffspringProj: number;
    riskStatus: 'safe' | 'warning' | 'high_risk';
    msiScore: number;
    indexProj: number;
  } | null>(null);

  const exportMatingRecommendationsXLSX = () => {
    if (recommendations.length === 0) {
      alert("Nenhum acasalamento listado para exportação.");
      return;
    }
    
    const headers = [
      "Ranking",
      "Touro_ID",
      "Touro_Nome",
      "Touro_Composicao_Racial",
      "Matriz_ID",
      "Matriz_Nome",
      "Matriz_Composicao_Racial",
      "Grau_Parentesco_F_Cria_Pct",
      "Status_Risco",
      "Score_MSI_MateSel",
      "Indice_Projetado_Cria"
    ];
    
    const rows = recommendations.map((rec, idx) => {
      const sireObj = animals.find(a => a.id === rec.sireId);
      const sireBreed = sireObj ? Object.keys(sireObj.breedComp).join('/') : '';
      const referenceDamObj = selectedDamObj || (loteTarget ? loteTarget.damsInLote[0] : null);
      const damBreed = referenceDamObj ? Object.keys(referenceDamObj.breedComp).join('/') : '';
      
      const riskLabel = rec.riskStatus === 'high_risk' 
        ? 'Crítico (F >= 6.25%)' 
        : rec.riskStatus === 'warning' 
        ? 'Atenção (F 3.1% - 6.25%)' 
        : 'Seguro';

      return [
        idx + 1,
        rec.sireId,
        rec.sireName,
        sireBreed,
        batchMode ? `LOTE: ${selectedLote}` : selectedDamId,
        batchMode ? 'Várias Matrizes' : (selectedDamObj?.name || ''),
        damBreed,
        `${rec.fOffspringProj}%`,
        riskLabel,
        rec.msiScore,
        rec.indexProj
      ];
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recomendações");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `gene_corte_recomendacao_acasalamento_${selectedSpecies}_${batchMode ? 'lote' : 'matriz'}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter available females of selected species
  const availableDams = animals.filter(a => a.sex === 'F' && a.species === selectedSpecies);
  const availableSires = animals.filter(a => a.sex === 'M' && a.species === selectedSpecies);
  
  // Extract unique "Lotes" based on management/herd
  const availableLotes = Array.from(new Set(availableDams.map(d => `${d.rebanho} - ${d.manejo}`))).sort();

  const effectiveIndexConfig = React.useMemo(() => {
    if (presetMode === 'ciclo_curto') {
      return {
        name: 'Foco em Ciclo Curto',
        weight_pesoDesmame: 0.1,
        weight_pesoSobreano: 0.5,
        weight_pe: 0,
        weight_aol: 0.2,
        weight_egs: 0.2,
      };
    }
    if (presetMode === 'reposicao') {
      return {
        name: 'Reposição de Matrizes',
        weight_pesoDesmame: 0.4,
        weight_pesoSobreano: 0.1,
        weight_pe: 0.5,
        weight_aol: 0,
        weight_egs: 0,
      };
    }
    return indexConfig;
  }, [presetMode, indexConfig]);

  const calculateRecommendations = (damId: string, loteStr: string, isBatch: boolean, penalty: number, maxF: number, config: SelectionIndexConfig) => {
    // PRECALCULATE INBREEDING MATRIX HERE TO AVOID 50x CASCADING COMPUTATIONS
    const sortedPed = buildClosedSortedPedigree(animals);
    const result = computeRelationshipMatrix(sortedPed);
    const A = result.A;
    const idxToId = new Map<string, number>();
    result.ids.forEach((id, i) => idxToId.set(id, i));

    if (!isBatch) {
      if (!damId) {
        setRecommendations([]);
        return;
      }
      const dam = animals.find(a => a.id === damId);
      if (dam) {
        if (selectedSireId) {
          const sire = animals.find(a => a.id === selectedSireId);
          if (sire) {
            let fProj = 0.0;
            const sireIdx = idxToId.get(sire.id);
            const damIdx = idxToId.get(dam.id);

            if (sireIdx !== undefined && damIdx !== undefined) {
              fProj = 0.5 * A[sireIdx][damIdx];
            }

            const sireIndex = calculateSelectionIndex(sire, config, evaluationEstimates);
            const damIndex = calculateSelectionIndex(dam, config, evaluationEstimates);
            const indexProj = Number(((sireIndex + damIndex) / 2).toFixed(2));
            const msiScore = Number((indexProj - (fProj * penalty)).toFixed(4));
            const accSire = evaluationEstimates['pesoDesmame']?.[sire.id]?.acc || 0.1;
            const accDam = evaluationEstimates['pesoDesmame']?.[dam.id]?.acc || 0.1;
            const pedigreeAccProj = Number((0.5 * (accSire + accDam)).toFixed(2));

            let risk: 'safe' | 'warning' | 'high_risk' = 'safe';
            if (fProj >= 0.0625) {
              risk = 'high_risk';
            } else if (fProj >= 0.03125) {
              risk = 'warning';
            }

            const singleRec = {
              sireId: sire.id,
              sireName: sire.name,
              indexProj,
              fOffspringProj: Number((fProj * 100).toFixed(3)), // Expressed in %
              msiScore,
              riskStatus: risk,
              isInbredPedigree: fProj > 0,
              pedigreeAccProj,
              isManual: true
            };
            setRecommendations([singleRec]);
          } else {
            setRecommendations([]);
          }
        } else {
          const recs = runRecommender(dam, animals, config, evaluationEstimates, penalty, A, idxToId);
          // HARD LOCK: Filter by max tolerance
          const filteredRecs = recs.filter(r => r.fOffspringProj <= maxF);
          setRecommendations(filteredRecs);
        }
      }
    } else {
      if (!loteStr) {
        setRecommendations([]);
        return;
      }
      const damsInLote = availableDams.filter(d => `${d.rebanho} - ${d.manejo}` === loteStr);
      if (damsInLote.length === 0) return setRecommendations([]);

      const sires = animals.filter(a => a.sex === 'M' && a.species === selectedSpecies);
      
      const allSiresAgg = new Map<string, { sireId: string, sireName: string, msiSum: number, fOffspringSum: number, count: number, riskWarnings: number, riskHigh: number }>();
      sires.forEach(s => {
         allSiresAgg.set(s.id, { sireId: s.id, sireName: s.name, msiSum: 0, fOffspringSum: 0, count: 0, riskWarnings: 0, riskHigh: 0 });
      });
      
      damsInLote.forEach(dam => {
         const recs = runRecommender(dam, animals, config, evaluationEstimates, penalty, A, idxToId);
         recs.forEach(r => {
            const s = allSiresAgg.get(r.sireId);
            if (s) {
                s.msiSum += r.msiScore;
                s.fOffspringSum += r.fOffspringProj;
                s.count += 1;
                if (r.riskStatus === 'high_risk') s.riskHigh += 1;
                else if (r.riskStatus === 'warning') s.riskWarnings += 1;
            }
         });
      });
      
      const finalRecs = Array.from(allSiresAgg.values())
        .filter(s => s.count > 0)
        .map(s => {
           const avgF = s.fOffspringSum / s.count;
           let riskStatus = 'safe';
           if (avgF >= 6.25 || s.riskHigh > 0) riskStatus = 'high_risk';
           else if (avgF >= 3.125 || s.riskWarnings > (s.count * 0.5)) riskStatus = 'warning';
           
           return {
              sireId: s.sireId,
              sireName: s.sireName,
              msiScore: Number((s.msiSum / s.count).toFixed(4)),
              fOffspringProj: Number(avgF.toFixed(3)),
              riskStatus: riskStatus,
              indexProj: 'Média Lote',
              isLote: true
           };
        })
        .filter(r => r.fOffspringProj <= maxF)
        .sort((a,b) => b.msiScore - a.msiScore)
        .slice(0, 3); // Top 3 para Lotes
        
      setRecommendations(finalRecs);
    }
  };

  const handleDamChange = (id: string) => {
    setSelectedDamId(id);
    setSelectedSireId(''); // Clear selected sire when dam changes
  };

  const handleLoteChange = (lote: string) => {
    setSelectedLote(lote);
  };

  const handlePenaltyChange = (val: number) => {
    setLambdaPenalty(val);
  };

  const handleMaxFChange = (val: number) => {
    setMaxFTolerance(val);
  };

  const toggleTraitSelection = (key: string) => {
    setSelectedTraitsKeys(prev => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter(k => k !== key);
      }
      if (prev.length >= 7) return prev; // Limit to 7 to prevent crowded ui
      return [...prev, key];
    });
  };
  
  React.useEffect(() => {
    calculateRecommendations(selectedDamId, selectedLote, batchMode, lambdaPenalty, maxFTolerance, effectiveIndexConfig);
  }, [batchMode, selectedDamId, selectedSireId, selectedLote, lambdaPenalty, maxFTolerance, effectiveIndexConfig]);

  const selectedDamObj = !batchMode ? animals.find(a => a.id === selectedDamId) : undefined;
  
  // Create average dummy object for Lotes regarding projection display
  const getLoteAverageStats = () => {
     if (!batchMode || !selectedLote) return null;
     const damsInLote = availableDams.filter(d => `${d.rebanho} - ${d.manejo}` === selectedLote);
     if (damsInLote.length === 0) return null;
     
     // Build typical composite breed String
     return { damsInLote, rebanho: damsInLote[0].rebanho, manejo: damsInLote[0].manejo, count: damsInLote.length };
  };
  
  const loteTarget = getLoteAverageStats();

  const getLambdaExplanation = (val: number) => {
    if (val === 0) {
      return {
        title: 'Ignorar Parentesco (Sem Correção)',
        color: 'text-amber-800 bg-amber-50 border-amber-200/60',
        text: 'O sistema escolhe os touros unicamente por suas qualidades genéticas (DEPs), ignorando se pai e mãe são parentes. Alto risco de gerar bezerros fracos, com menor fertilidade e baixa imunidade devido a consanguinidade (endogamia).'
      };
    }
    if (val <= 50) {
      return {
        title: `Priorizar Ganho Genético Máximo (λ = ${val})`,
        color: 'text-sky-800 bg-sky-50 border-sky-200/60',
        text: `Foco total em selecionar bezerros com belezas e ganhos extraordinários, aceitando pequenos riscos de parentesco próximo. Aplica um desconto suave de apenas ${(0.0625 * val).toFixed(1)} pontos caso o filhote nasça com consanguinidade prejudicial (F = 6.25%).`
      };
    }
    if (val <= 120) {
      return {
        title: `Equilíbrio Recomendado pelo GenZOT (λ = ${val})`,
        color: 'text-emerald-850 bg-emerald-50/75 border-emerald-250/60 font-semibold',
        text: `Combinação ideal para a fazenda. O sistema busca ótimos ganhos de carne e carcaça, mas desconta severamente ${(0.0625 * val).toFixed(1)} pontos do índice de acasalamento se pai e mãe forem parentes próximos (F = 6.25%). Força a escolha de um touro excelente e sem parentesco perigoso.`
      };
    }
    return {
      title: `Segurança Extrema - Trava de Parentesco (λ = ${val})`,
      color: 'text-rose-800 bg-rose-50 border-rose-200/60',
      text: `Controle de endogamia ultra-rigoroso. Aplica desconto pesado de ${(0.0625 * val).toFixed(1)} pontos no índice de cruzamento caso ocorra parentesco próximo (F = 6.25%). Praticamente descarta touros que tenham qualquer parentesco com a vaca, priorizando a saúde do animal.`
    };
  };

  // Didactic module for academic mode
  const renderDidacticMatingModule = () => {
    // 1. Calculations for Inbreeding Depression Simulator
    const weaningLoss = simulatedF * 0.45;
    const yearlingLoss = simulatedF * 0.90;
    const intervalIncrease = simulatedF * 0.52;
    const immuneCost = simulatedF * 1.25;

    let fRiskColor = 'bg-emerald-50 border-emerald-200 text-emerald-850';
    let fRiskTitle = 'Consanguinidade Basal (Seguro)';
    let fRiskDesc = 'Sem parentesco relevante ou risco de depressão endogâmica. Ideal para animais comerciais.';

    if (simulatedF > 0 && simulatedF <= 3.125) {
      fRiskColor = 'bg-blue-50 border-blue-200 text-blue-800';
      fRiskTitle = 'Parentesco Distante (Segurança Tolerável)';
      fRiskDesc = 'Consanguinidade aceitável em programas de melhoramento para fixação de características benéficas, mas requer vigilância.';
    } else if (simulatedF > 3.125 && simulatedF <= 6.25) {
      fRiskColor = 'bg-amber-50 border-amber-200 text-amber-800';
      fRiskTitle = 'Endogamia Moderada (Limite Comercial - F = 6.25%)';
      fRiskDesc = 'Nível de acasalamento entre primos de primeiro grau. Inicia-se a depressão por endogamia perceptível e perdas produtivas.';
    } else if (simulatedF > 6.25 && simulatedF <= 12.5) {
      fRiskColor = 'bg-orange-50 border-orange-200 text-orange-800';
      fRiskTitle = 'Endogamia Severa (Meio-Irmãos - F = 12.5%)';
      fRiskDesc = 'Alto risco de expressar defeitos recessivos deletérios. Perdas severas no peso ao desmame e imunidade geral.';
    } else if (simulatedF > 12.5) {
      fRiskColor = 'bg-rose-50 border-rose-200 text-rose-800';
      fRiskTitle = 'Endogamia Catastrófica (Irmãos Inteiros / Pai × Filha - F = 25%)';
      fRiskDesc = 'Bloqueado por qualquer recomendação zootécnica de bem-estar e produção. Comprometimento grave da sobrevivência.';
    }

    // 2. Calculations for Kinghorn Multi-objective Index
    const indexAOrig = 200;
    const indexBOrig = 160;
    const fA = 0.125; // 12.5% inbreeding
    const fB = 0.00;  // 0% inbreeding

    const penaltyA = simulatedLambda * fA;
    const penaltyB = simulatedLambda * fB;

    const indexACorr = Math.max(0, indexAOrig - penaltyA);
    const indexBCorr = Math.max(0, indexBOrig - penaltyB);

    const recommendedBull = indexACorr >= indexBCorr ? 'Touro A (Hércules)' : 'Touro B (Soberano)';

    // 3. Calculations for Crossbreeding & Heterosis
    let heterosis = 0;
    let complementarityTitle = '';
    let complementarityDesc = '';
    let weaningBoost = 0;

    if (simulatedDamBreed === 'nelore') {
      if (simulatedSireBreed === 'nelore') {
        heterosis = 0;
        complementarityTitle = 'Sem Complementaridade (Zebu Puro)';
        complementarityDesc = 'Acasalamento puro-sangue Nelore. Sem ganho por heterose, focado unicamente na seleção de genes aditivos de rusticidade e adaptação tropical.';
        weaningBoost = 0;
      } else if (simulatedSireBreed === 'angus') {
        heterosis = 1.0;
        complementarityTitle = 'Complementaridade Máxima (F1 Industrial Taurus-Indicus)';
        complementarityDesc = 'Combinação perfeita: a rusticidade, tolerância ao calor e habilidade materna do Nelore unida à velocidade de ganho, qualidade de carcaça e precocidade sexual do Angus. Bezerros altamente vigorosos!';
        weaningBoost = 22.5;
      } else if (simulatedSireBreed === 'hereford') {
        heterosis = 1.0;
        complementarityTitle = 'Cruzamento Industrial F1 Britânico-Zebuíno';
        complementarityDesc = 'Foco em produzir bezerros rústicos, pesados e de carcaça limpa. Excelente vigor híbrido individual e ganho na desmama.';
        weaningBoost = 21.0;
      } else if (simulatedSireBreed === 'senepol') {
        heterosis = 1.0;
        complementarityTitle = 'Cruzamento F1 Adaptado × Zebu';
        complementarityDesc = 'Alta rusticidade e adaptabilidade ao pastejo tropical. Bezerros 100% taurinos-adaptados rústicos, ideais para climas quentes.';
        weaningBoost = 18.5;
      }
    } else if (simulatedDamBreed === 'angus') {
      if (simulatedSireBreed === 'nelore') {
        heterosis = 1.0;
        complementarityTitle = 'F1 Industrial Recíproco';
        complementarityDesc = 'Excelente ganho de peso, mas as fêmeas Angus puras sofrem mais com estresse térmico em clima quente durante a gestação.';
        weaningBoost = 22.5;
      } else if (simulatedSireBreed === 'angus') {
        heterosis = 0;
        complementarityTitle = 'Sem Complementaridade (Taurus Puro)';
        complementarityDesc = 'Acasalamento puro-sangue Angus britânico. Alta qualidade de carne, porém exige pastejo de alta qualidade e controle extremo de parasitas no clima tropical.';
        weaningBoost = 0;
      } else if (simulatedSireBreed === 'hereford') {
        heterosis = 0.5; // taurine x taurine genetic distance is lower
        complementarityTitle = 'Cruzamento Intrataurino Britânico (Cruza)';
        complementarityDesc = 'Heterose moderada. Excelente complementaridade para acabamento de gordura e marmoreio sob pastejo temperado.';
        weaningBoost = 9.5;
      } else if (simulatedSireBreed === 'senepol') {
        heterosis = 0.5;
        complementarityTitle = 'Cruzamento Adaptado × Britânico';
        complementarityDesc = 'Introduz genes de tolerância ao calor em linhagem britânica de alta qualidade de carne.';
        weaningBoost = 11.0;
      }
    } else if (simulatedDamBreed === 'f1_ang_nel') {
      if (simulatedSireBreed === 'nelore') {
        heterosis = 0.5;
        complementarityTitle = 'Retrocruzamento para Zebuíno (3/4 Nelore 1/4 Angus)';
        complementarityDesc = 'Eleva a proporção de sangue zebuíno no rebanho, readequando o rebanho para climas mais rigorosos. Há perda de 50% da heterose materna e individual.';
        weaningBoost = 11.25;
      } else if (simulatedSireBreed === 'angus') {
        heterosis = 0.5;
        complementarityTitle = 'Retrocruzamento para Britânico (3/4 Angus 1/4 Nelore)';
        complementarityDesc = 'Excelente qualidade de carne e precocidade sexual, mas exige maior investimento nutricional por ter menor adaptabilidade térmica que o F1.';
        weaningBoost = 11.25;
      } else if (simulatedSireBreed === 'hereford') {
        heterosis = 0.75;
        complementarityTitle = 'Acasalamento de Três Raças (Three-way Cross - Tricross)';
        complementarityDesc = 'Retém excelente nível de heterose (75%) utilizando uma terceira raça de alta qualidade de carne e crescimento, aproveitando ao máximo a habilidade materna da mãe F1 Angus-Nelore.';
        weaningBoost = 16.8;
      } else if (simulatedSireBreed === 'senepol') {
        heterosis = 0.75;
        complementarityTitle = 'Tricross com Touro Adaptado';
        complementarityDesc = 'Aproveita 100% da excelente habilidade materna e leite da mãe F1, gerando bezerros rústicos, de pelo curto e pesados.';
        weaningBoost = 15.5;
      }
    }

    const quizQuestions = [
      {
        id: 1,
        question: 'Qual o efeito esperado da depressão por endogamia no peso ao desmame de bezerros para cada 1% de aumento na consanguinidade (F)?',
        options: [
          'Ganho de peso de 0.5 kg por estímulo de homozigose benéfica.',
          'Nenhum efeito perceptível, pois o ambiente mascara toda a consanguinidade.',
          'Perda de peso aproximada de 0.45 kg devido à expressão de genes recessivos prejudiciais.',
          'Queda abrupta de 10.0 kg já no primeiro nível basal.'
        ],
        correct: 2,
        explanation: 'De acordo com a literatura clássica de melhoramento genético (Burrow, 1993), cada 1% de consanguinidade (F) acarreta em uma depressão endogâmica média de -0.45 kg no peso ao desmame de bovinos de corte.'
      },
      {
        id: 2,
        question: 'No modelo multiobjetivo de Kinghorn (2011), qual é a função prática do parâmetro Lambda (λ)?',
        options: [
          'Aumentar o valor genético de touros com alta habilidade materna.',
          'Pesar a aversão ao risco de parentesco, penalizando o índice de touros consanguíneos com a matriz.',
          'Multiplicar o limite máximo de descendentes permitidos por touro popular.',
          'Mapear a acurácia genômica dos marcadores SNP.'
        ],
        correct: 1,
        explanation: 'Lambda (λ) atua como um peso de penalização na equação: Índice_Corrigido = Índice_Genético - λ × Parentesco. Valores maiores de λ diminuem o índice final de touros aparentados, priorizando touros seguros.'
      },
      {
        id: 3,
        question: 'Por que o cruzamento de um Touro Angus puro em uma vaca Nelore pura (F1) gera 100% de heterozigose individual?',
        options: [
          'Porque ambas as raças pertencem à mesma subespécie, facilitando a mitose.',
          'Devido à homozigose induzida que fixa os melhores alelos aditivos de cada raça.',
          'Pela máxima distância genética entre Bos taurus taurus (Angus) e Bos taurus indicus (Nelore), sem sobreposição de alelos idênticos por descendência.',
          'Porque a raça Nelore possui maior dominância cromossômica que as demais.'
        ],
        correct: 2,
        explanation: 'Como o Angus (Taurino) e o Nelore (Zebuíno) evoluíram separadamente por milhares de anos, a distância genética deles é máxima. Ao cruzá-los, a cria herda alelos totalmente diferentes em cada loco de seus pais, alcançando 100% de heterozigose.'
      }
    ];

    const handleAnswerSelect = (qId: number, oIdx: number) => {
      setQuizAnswers({ ...quizAnswers, [qId]: oIdx });
    };

    const handleQuizReset = () => {
      setQuizAnswers({});
      setQuizSubmitted(false);
    };

    return (
      <div className="space-y-8 animate-fade-in text-slate-850">
        {/* BANNER ACADÊMICO */}
        <div className="bg-indigo-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden border border-indigo-950">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-4 translate-x-4">
            <GraduationCap className="w-64 h-64" />
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-indigo-600/30 p-3 rounded-xl border border-indigo-500/20">
              <GraduationCap className="w-8 h-8 text-indigo-300" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] bg-indigo-500/30 border border-indigo-400/35 px-2.5 py-0.5 rounded-full font-black tracking-widest uppercase text-indigo-200">
                ZOOTECNIA & ENGENHARIA GENÉTICA
              </span>
              <h3 className="text-lg font-bold">Laboratório Didático de Acasalamento</h3>
              <p className="text-xs text-indigo-200 max-w-2xl leading-relaxed">
                Explore os alicerces estatísticos e práticos de biotecnologia reprodutiva. Entenda o controle matemático da endogamia, as perdas físicas da depressão por endogamia e a força biológica do vigor híbrido.
              </p>
            </div>
          </div>
        </div>

        {/* TRÊS ENFOQUES DIDÁTICOS */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* SIMULADOR DE DEPRESSÃO POR ENDOGAMIA */}
          <div className="xl:col-span-6 bg-white p-5 rounded-2xl border border-slate-150 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-rose-50 text-rose-650 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Dimensão 1</h4>
                <h3 className="text-sm font-black text-slate-850">Simulador de Depressão por Endogamia</h3>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Arraste o slider para ajustar o **Coeficiente de Consanguinidade (F)** do bezerro. Veja os prejuízos reais ocultos causados pelo aumento da homozigose recessiva (Burrow, 1993).
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3.5">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600">F do Bezerro Projetado:</span>
                  <span className="font-mono text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                    {simulatedF.toFixed(3)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  step={0.125}
                  value={simulatedF}
                  onChange={(e) => setSimulatedF(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              {/* Quick reference tabs */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSimulatedF(0)}
                  className={`px-2 py-1 text-[9.5px] font-bold rounded-md transition-all cursor-pointer ${simulatedF === 0 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                >
                  🌱 Seguro (0%)
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedF(3.125)}
                  className={`px-2 py-1 text-[9.5px] font-bold rounded-md transition-all cursor-pointer ${simulatedF === 3.125 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                >
                  👵 Bisavô Comum (3.12%)
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedF(6.25)}
                  className={`px-2 py-1 text-[9.5px] font-bold rounded-md transition-all cursor-pointer ${simulatedF === 6.25 ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                >
                  👥 Primos (6.25%)
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedF(12.5)}
                  className={`px-2 py-1 text-[9.5px] font-bold rounded-md transition-all cursor-pointer ${simulatedF === 12.5 ? 'bg-orange-600 text-white shadow-xs' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                >
                  👫 Meio-Irmãos (12.5%)
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedF(25.0)}
                  className={`px-2 py-1 text-[9.5px] font-bold rounded-md transition-all cursor-pointer ${simulatedF === 25 ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                >
                  🛑 Irmãos/Pai (25.0%)
                </button>
              </div>

              {/* Status Alert */}
              <div className={`p-3 rounded-lg border text-xs leading-relaxed space-y-1 ${fRiskColor}`}>
                <div className="font-extrabold uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  {fRiskTitle}
                </div>
                <p className="text-[11px] opacity-90">{fRiskDesc}</p>
              </div>
            </div>

            {/* Simulated physical impacts table */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                Impactos Clínicos e Produtivos Projetados:
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-0.5">
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Peso ao Desmame</span>
                  <div className="text-base font-mono font-bold text-rose-600">
                    -{weaningLoss.toFixed(2)} kg
                  </div>
                  <p className="text-[9px] text-slate-400 leading-snug">Perda ponderal direta pela depressão metabólica.</p>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-0.5">
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Peso ao Sobreano</span>
                  <div className="text-base font-mono font-bold text-rose-600">
                    -{yearlingLoss.toFixed(2)} kg
                  </div>
                  <p className="text-[9px] text-slate-400 leading-snug">Efeito residual prejudicial na fase de crescimento pós-desmame.</p>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-0.5">
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Intervalo de Partos</span>
                  <div className="text-base font-mono font-bold text-amber-600">
                    +{intervalIncrease.toFixed(1)} dias
                  </div>
                  <p className="text-[9px] text-slate-400 leading-snug">Prejuízo na fertilidade e atraso na concepção da fêmea.</p>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-0.5">
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Suscetibilidade Clínica</span>
                  <div className="text-base font-mono font-bold text-red-650">
                    +{immuneCost.toFixed(0)}%
                  </div>
                  <p className="text-[9px] text-slate-400 leading-snug">Aumento de incidências infecciosas por deficiência imunológica.</p>
                </div>
              </div>
            </div>
          </div>

          {/* OTIMIZADOR MULTIOBJETIVO DE KINGHORN (2011) */}
          <div className="xl:col-span-6 bg-white p-5 rounded-2xl border border-slate-150 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Dimensão 2</h4>
                <h3 className="text-sm font-black text-slate-850">Otimização Multiobjetivo (Kinghorn, 2011)</h3>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              O sistema calcula o índice corrigido subtraindo o risco de parentesco do mérito genético:
              <br />
              <strong className="text-indigo-950 font-mono text-[11.5px] block my-1.5 bg-indigo-50 p-1.5 rounded text-center border border-indigo-100">
                Índice Corrigido = Índice Original - (λ × F_progênie)
              </strong>
              Modifique a **Aversão ao Risco (Lambda - λ)** abaixo para ver como o algoritmo reordena os touros.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Peso de Aversão ao Risco (λ):</span>
                  <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {simulatedLambda}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={10}
                  value={simulatedLambda}
                  onChange={(e) => setSimulatedLambda(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>0 (Ignora parentesco)</span>
                  <span>100 (Recomendável)</span>
                  <span>200 (Aversão Extrema)</span>
                </div>
              </div>
            </div>

            {/* Simulated Duel of Bulls */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block">
                Cenário de Simulação: Cruzar com Matriz "Estrela" (Filha de "Faraó")
              </span>

              <div className="space-y-3">
                {/* BULL A CARD */}
                <div className={`p-3 rounded-xl border transition ${indexACorr >= indexBCorr ? 'bg-indigo-50/50 border-indigo-200 shadow-xs' : 'bg-white border-slate-150 opacity-70'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">Touro A: Hércules (Superior, mas Parente)</span>
                        {indexACorr >= indexBCorr && <span className="bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase">Indicado #1</span>}
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-tight">Filho direto de "Faraó". Produz cria com <strong>F = 12.5%</strong>.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-semibold">Índice Corrigido</span>
                      <span className="font-mono font-black text-sm text-slate-800">{indexACorr.toFixed(1)} pts</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[9px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-1.5">
                    <span>Índice Base: {indexAOrig}</span>
                    <span className="text-rose-600 font-medium">Penalidade de Endogamia: -{penaltyA.toFixed(1)} ({simulatedLambda} × 12.5%)</span>
                  </div>
                </div>

                {/* BULL B CARD */}
                <div className={`p-3 rounded-xl border transition ${indexBCorr > indexACorr ? 'bg-indigo-50/50 border-indigo-200 shadow-xs' : 'bg-white border-slate-150 opacity-70'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">Touro B: Soberano (Médio, mas Seguro)</span>
                        {indexBCorr > indexACorr && <span className="bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase">Indicado #1</span>}
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-tight">Completamente sem parentesco. Produz cria com <strong>F = 0%</strong>.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-semibold">Índice Corrigido</span>
                      <span className="font-mono font-black text-sm text-slate-800">{indexBCorr.toFixed(1)} pts</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[9px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-1.5">
                    <span>Índice Base: {indexBOrig}</span>
                    <span className="text-emerald-600 font-medium">Penalidade de Endogamia: -{penaltyB.toFixed(1)} ({simulatedLambda} × 0%)</span>
                  </div>
                </div>
              </div>

              {/* Explicação da dinâmica */}
              <div className="p-3 bg-indigo-950 text-indigo-150 rounded-lg text-[10px] leading-relaxed border border-indigo-900">
                <span className="text-amber-300 font-bold block mb-0.5">🧠 Conclusão Estatística:</span>
                Ao regular o Lambda para <span className="font-bold text-white">{simulatedLambda}</span>, o sistema escolhe o <strong>{recommendedBull}</strong>. 
                {simulatedLambda < 100 ? (
                  <span> Com Lambda baixo, você está priorizando o desempenho genético isolado, aceitando os prejuízos de um bezerro fraco decorrente de endogamia.</span>
                ) : (
                  <span> Com Lambda equilibrado ou alto, o sistema descarta com segurança a opção consanguinidade e promove o touro livre de parentesco, mesmo que ele tenha DEPs um pouco menores. Isso protege a rentabilidade de longo prazo!</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COMPLEMENTARIDADE DE RAÇAS E HETEROZIGOSE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Dna className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Dimensão 3</h4>
              <h3 className="text-sm font-black text-slate-850">Laboratório de Heterozigose e Cruzamento Industrial</h3>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Selecione o perfil genético da Matriz e do Touro. O laboratório calcula a retenção de **Heterozigose Individual Projetada** na cria e estima o impacto zootécnico do vigor híbrido.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-center">
            
            {/* Inputs de Raça */}
            <div className="lg:col-span-5 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Perfil Genético da Matriz (Mãe):</label>
                <select
                  value={simulatedDamBreed}
                  onChange={(e) => setSimulatedDamBreed(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white font-semibold text-slate-700 focus:outline-indigo-500"
                >
                  <option value="nelore">🥩 Nelore Puro (Zebuíno - 100%)</option>
                  <option value="angus">🌾 Angus Puro (Taurino Britânico - 100%)</option>
                  <option value="f1_ang_nel">🧬 F1 Angus × Nelore (Composta - 50%/50%)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Raça do Reprodutor (Pai):</label>
                <select
                  value={simulatedSireBreed}
                  onChange={(e) => setSimulatedSireBreed(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white font-semibold text-slate-700 focus:outline-indigo-500"
                >
                  <option value="nelore">🥩 Nelore (Zebu Puro)</option>
                  <option value="angus">🐂 Angus (Taurino Britânico)</option>
                  <option value="hereford">🌾 Hereford (Taurino Britânico)</option>
                  <option value="senepol">🍀 Senepol (Taurino Adaptado)</option>
                </select>
              </div>

              <div className="text-[9.5px] text-slate-500 leading-relaxed bg-white p-3 rounded-lg border border-slate-150">
                <strong className="text-emerald-700 block mb-0.5">💡 Conceito de Vigor Híbrido:</strong>
                O cruzamento de raças puras e distantes (como Nelore × Angus) resulta em bezerros que superam a média de produção de seus pais em taxas de crescimento e fertilidade devido ao "efeito do choque de sangue".
              </div>
            </div>

            {/* Gráfico/Progresso Radial de Heterozigose */}
            <div className="lg:col-span-3 flex flex-col items-center justify-center space-y-2">
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* SVG circular track and progress */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-slate-100"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-emerald-500 transition-all duration-500"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * heterosis)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Heterozigose</span>
                  <span className="text-xl font-mono font-black text-slate-800">{(heterosis * 100).toFixed(0)}%</span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase">
                {heterosis === 1 ? 'Vigor Máximo (F1)' : heterosis === 0.75 ? 'Vigor Elevado (Tricross)' : heterosis === 0.5 ? 'Retrocruzamento' : 'Zero Heterose'}
              </span>
            </div>

            {/* Resultados do Cruzamento */}
            <div className="lg:col-span-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-3">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Classificação de Complementaridade</span>
                <span className="text-xs font-black text-slate-800 block">{complementarityTitle}</span>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{complementarityDesc}</p>
              </div>

              {heterosis > 0 && (
                <div className="border-t border-slate-200/50 pt-2 space-y-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Vantagem Estimada por Heterose Individual:</span>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>+{weaningBoost.toFixed(2)} kg na desmama de bezerros</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ESTUDOS DE CASO ACADÊMICOS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <BookOpen className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estudos de Caso de Tomada de Decisão:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => {
                setSimulatedF(12.5);
                setSimulatedLambda(0);
              }}
              className="p-3 text-left rounded-xl bg-rose-50/30 hover:bg-rose-50 border border-rose-100 transition duration-150 space-y-1 group cursor-pointer"
            >
              <span className="text-xs font-bold text-rose-950 block group-hover:text-rose-700 transition-colors">🍂 1. A Consanguinidade Oculta</span>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Bezerro fruto de acasalamento entre meio-irmãos com Lambda zerado. Veja o desastre financeiro da depressão endogâmica.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setSimulatedDamBreed('nelore');
                setSimulatedSireBreed('angus');
              }}
              className="p-3 text-left rounded-xl bg-emerald-50/30 hover:bg-emerald-50 border border-emerald-100 transition duration-150 space-y-1 group cursor-pointer"
            >
              <span className="text-xs font-bold text-emerald-950 block group-hover:text-emerald-700 transition-colors">🌾 2. Cruzamento F1 Angus x Nelore</span>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Simulação de cruzamento industrial perfeito. Veja o pico biológico de 100% de heterozigose e o bônus de peso ao desmame.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setSimulatedF(12.5);
                setSimulatedLambda(140);
              }}
              className="p-3 text-left rounded-xl bg-indigo-50/30 hover:bg-indigo-50 border border-indigo-100 transition duration-150 space-y-1 group cursor-pointer"
            >
              <span className="text-xs font-bold text-indigo-950 block group-hover:text-indigo-700 transition-colors">🛡️ 3. Correção de Kinghorn Ativa</span>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Configure um Lambda ativo de 140 para ver como o algoritmo multiobjetivo corrige o erro e promove o touro sem parentesco.
              </p>
            </button>
          </div>
        </div>

        {/* ROTEIRO DE AULA PRÁTICA */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-150 space-y-4 shadow-3xs">
          <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
            <GraduationCap className="w-5 h-5 text-indigo-650" />
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 block">Atividade Supervisionada</span>
              <h3 className="text-sm font-black text-indigo-950">Roteiro de Atividade Prática: Decisão Genética & Acasalamentos</h3>
            </div>
          </div>
          
          <p className="text-[11px] text-slate-650 leading-relaxed">
            Considere-se o consultor genético oficial da fazenda. Siga as tarefas práticas abaixo utilizando os painéis de simulação para responder às perguntas clássicas de planejamento de estações de monta:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10.5px]">
            <div className="bg-white p-3.5 rounded-xl border border-indigo-100/50 space-y-2 flex flex-col justify-between">
              <div>
                <span className="inline-block bg-rose-50 text-rose-700 font-extrabold text-[8.5px] px-2 py-0.5 rounded-full mb-1 border border-rose-100">Tarefa 1</span>
                <h4 className="font-bold text-slate-800">Custo da Endogamia</h4>
                <p className="text-[9.5px] text-slate-500 leading-relaxed mt-1">
                  Ative o <strong>Caso 1 (Consanguinidade Oculta)</strong>. Verifique o peso ao desmame perdido. Se o preço do bezerro vivo for <strong>R$ 12.00/kg</strong>, qual é a perda monetária direta por bezerro sob F = 12.5%?
                </p>
              </div>
              <div className="bg-slate-50 p-1.5 rounded text-[8.5px] text-indigo-950 font-semibold border border-indigo-50 leading-normal">
                💡 <strong className="text-indigo-900 block font-bold mb-0.5">Diagnóstico Zootécnico:</strong> Perda de Peso = 5.62kg | Prejuízo estimado de R$ 67.50 por cria produzida!
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-indigo-100/50 space-y-2 flex flex-col justify-between">
              <div>
                <span className="inline-block bg-amber-50 text-amber-700 font-extrabold text-[8.5px] px-2 py-0.5 rounded-full mb-1 border border-amber-100">Tarefa 2</span>
                <h4 className="font-bold text-slate-800">Ponto de Equilíbrio (λ)</h4>
                <p className="text-[9.5px] text-slate-500 leading-relaxed mt-1">
                  Ative o <strong>Caso 3 (Correção Ativa)</strong>. Vá alterando o Lambda (<span className="font-serif italic">λ</span>) progressivamente de 0 a 200. Qual é o valor exato de <span className="font-serif italic">λ</span> em que o sistema inverte a recomendação do Touro A para o Touro B?
                </p>
              </div>
              <div className="bg-slate-50 p-1.5 rounded text-[8.5px] text-indigo-950 font-semibold border border-indigo-50 leading-normal">
                💡 <strong className="text-indigo-900 block font-bold mb-0.5">Diagnóstico Zootécnico:</strong> O equilíbrio ocorre exatamente em λ = 40. Qualquer peso acima disso seleciona o Touro B (Soberano) pela segurança biológica.
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-indigo-100/50 space-y-2 flex flex-col justify-between">
              <div>
                <span className="inline-block bg-emerald-50 text-emerald-700 font-extrabold text-[8.5px] px-2 py-0.5 rounded-full mb-1 border border-emerald-100">Tarefa 3</span>
                <h4 className="font-bold text-slate-800">Estratégias de Cruzamento</h4>
                <p className="text-[9.5px] text-slate-500 leading-relaxed mt-1">
                  Selecione uma fêmea <strong>F1 Angus x Nelore</strong>. Compare o vigor híbrido final acasalando-a com touro <strong>Nelore</strong> (Retrocruzamento) vs touro <strong>Senepol</strong> (Three-way cross). Qual delas retém maior heterose?
                </p>
              </div>
              <div className="bg-slate-50 p-1.5 rounded text-[8.5px] text-indigo-950 font-semibold border border-indigo-50 leading-normal">
                💡 <strong className="text-indigo-900 block font-bold mb-0.5">Diagnóstico Zootécnico:</strong> O Tricross (Senepol) retém 75% de heterose materna e individual, enquanto o retrocruzamento retém apenas 50%.
              </div>
            </div>
          </div>
        </div>

        {/* QUIZ ZOOTÉCNICO DE ACASALAMENTO */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400 animate-bounce" />
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">Desafio Acadêmico</h4>
                <h3 className="text-sm font-black">Quiz de Fixação de Conceitos</h3>
              </div>
            </div>
            {quizSubmitted && (
              <button
                onClick={handleQuizReset}
                className="text-[10px] font-bold text-indigo-300 hover:text-white flex items-center gap-1 bg-slate-850 px-2.5 py-1.5 rounded-lg border border-slate-800 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reiniciar Quiz
              </button>
            )}
          </div>

          <div className="space-y-6">
            {quizQuestions.map((q, idx) => {
              const selectedOpt = quizAnswers[q.id];
              const isCorrect = selectedOpt === q.correct;

              return (
                <div key={q.id} className="space-y-2 border-b border-slate-800/60 pb-5 last:border-0 last:pb-0">
                  <p className="text-xs font-bold text-slate-200">
                    {idx + 1}. {q.question}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((option, oIdx) => {
                      let btnStyle = 'bg-slate-950/40 border-slate-800 hover:bg-slate-950/80 text-slate-300';
                      if (quizSubmitted) {
                        if (oIdx === q.correct) {
                          btnStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold';
                        } else if (selectedOpt === oIdx) {
                          btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-200 font-bold';
                        } else {
                          btnStyle = 'bg-slate-950/20 border-slate-900 text-slate-500';
                        }
                      } else if (selectedOpt === oIdx) {
                        btnStyle = 'bg-indigo-950 border-indigo-500 text-indigo-200 font-bold';
                      }

                      return (
                        <button
                          key={oIdx}
                          disabled={quizSubmitted}
                          onClick={() => handleAnswerSelect(q.id, oIdx)}
                          className={`w-full text-left p-3 rounded-xl border text-[11px] leading-snug transition duration-150 flex items-start gap-2.5 ${btnStyle} ${!quizSubmitted ? 'cursor-pointer' : ''}`}
                        >
                          <span className="w-5 h-5 shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-bold">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>

                  {quizSubmitted && selectedOpt !== undefined && (
                    <div className={`p-3 rounded-lg border text-[10px] leading-relaxed ${isCorrect ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300' : 'bg-rose-950/20 border-rose-900/50 text-rose-300'}`}>
                      <strong className="block mb-0.5">{isCorrect ? '✓ Excelente!' : '✗ Alternativa Incorreta'}</strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!quizSubmitted ? (
            <button
              type="button"
              onClick={() => setQuizSubmitted(true)}
              disabled={Object.keys(quizAnswers).length < quizQuestions.length}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-extrabold text-[10px] py-2.5 px-4 rounded-xl uppercase tracking-wider transition cursor-pointer"
            >
              Enviar Respostas do Quiz
            </button>
          ) : (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Seu Desempenho</span>
              <p className="text-sm font-black text-slate-100">
                Você acertou <strong className="text-emerald-400">{Object.keys(quizAnswers).filter(id => quizAnswers[Number(id)] === quizQuestions.find(q => q.id === Number(id))?.correct).length}</strong> de <strong className="text-indigo-400">{quizQuestions.length}</strong> questões!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-rose-500" />
          Acasalamento Dirigido Inteligente
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-normal">
          Selecione uma matriz individual ou lote de campo. O motor científico calcula recursivamente a matriz de parentesco <span className="font-bold text-slate-800">A</span>, avalia a endogamia projetada da progênie (<span className="font-bold text-slate-800">F_projetado</span>) e maximiza o ganho aditivo através de um índice ponderado de acasalamento.
        </p>

        {/* Amplified Educational banner explaining mating zootecny */}
        <div className="bg-rose-50/75 border border-rose-100 rounded-xl p-4 mt-3 flex gap-3 text-slate-700">
          <Info className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-[11px] space-y-1 leading-relaxed">
            <p className="font-bold text-rose-950 uppercase tracking-wide">Como funciona a Otimização de Acasalamento?</p>
            <p className="text-slate-600">
              O sistema cruza as previsões genéticas (DEPs/EBVs) de touros e matrizes para projetar a capacidade aditiva futura do produto (Hazel, 1943; Dickerson, 1973). Simultaneamente, calcula o <span className="font-semibold text-slate-800">Inbreeding (Consanguinidade - F)</span> da cria baseado no algoritmo recursivo de <strong>Meuwissen & Luo (1992)</strong>. Caso os pais compartilhem ancestrais comuns, o valor <span className="font-semibold text-rose-700">F</span> se eleva. Para mitigar o aparecimento de genes recessivos deletérios e a <strong>depressão por endogamia</strong> (perda de peso e imunidade, descrita quantitativamente por <strong>Burrow, 1993</strong>), o algoritmo penaliza o índice final utilizando o peso de aversão ao risco <span className="font-semibold text-indigo-700">Lambda (λ)</span> através do modelo multiobjetivo de <strong>Kinghorn (2011)</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Academic Sub-tab switch (if viewMode === 'academic') */}
      {viewMode === 'academic' && (
        <div className="flex border-b border-slate-100 mb-6 gap-2">
          <button
            type="button"
            onClick={() => setAcademicSubTab('didactic')}
            className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              academicSubTab === 'didactic'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Laboratório Didático (Efeitos de Consanguinidade & Cruzamento)
          </button>
          <button
            type="button"
            onClick={() => setAcademicSubTab('traditional')}
            className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              academicSubTab === 'traditional'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Acasalamento Dirigido Comercial (Calculadora Completa)
          </button>
        </div>
      )}

      {viewMode === 'academic' && academicSubTab === 'didactic' ? (
        renderDidacticMatingModule()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Selection parameters */}
        <div className="space-y-4 md:col-span-1 border-r border-gray-100 pr-0 md:pr-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Matriz & Espécie</h3>

          <div className="pt-2 border-t border-gray-100">
             <label className="block text-[11px] font-semibold text-gray-500 mb-2 flex items-center">
               <span>Modo de Acasalamento</span>
               <InfoTooltip
                 title="Modos de Acasalamento"
                 content="Escolha entre acasalamento individual (uma fêmea por vez), Lote Coletivo (planejar touros para a média de um grupo de manejo) ou IATF Coletivo (otimizador linear que distribui o pool de touros de forma ótima limitando doses por touro)."
                 theory="O acasalamento ótimo pode ser calculado de forma individual para ganhos genéticos pontuais, ou através de otimização de portfólio (Mate Selection, Kinghorn 2011) para maximizar o ganho de todo o rebanho sob restrições físicas."
                 practice="Utilize 'IATF Coletivo' para planejar as inseminações de toda a estação de monta de uma vez, limitando o número máximo de doses por touro para economizar sêmen e evitar gargalos."
               />
             </label>
             <div className="grid grid-cols-3 gap-1 mb-3">
               <button
                 type="button"
                 onClick={() => { setMatingMode('individual'); setSelectedLote(''); setSelectedSireId(''); setRecommendations([]); setCollectiveResults(null); }}
                 className={`py-1.5 px-1 rounded-md text-[9px] font-bold border text-center transition ${matingMode === 'individual' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
               >
                 Individual
               </button>
               <button
                 type="button"
                 onClick={() => { setMatingMode('lote'); setSelectedDamId(''); setSelectedSireId(''); setRecommendations([]); setCollectiveResults(null); }}
                 className={`py-1.5 px-1 rounded-md text-[9px] font-bold border text-center transition ${matingMode === 'lote' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
               >
                 Lote Coletivo
               </button>
               <button
                 type="button"
                 onClick={() => { setMatingMode('multitouro'); setSelectedDamId(''); setSelectedSireId(''); setRecommendations([]); setCollectiveResults(null); setSelectedMultiBulls(availableSires.map(s => s.id)); }}
                 className={`py-1.5 px-1 rounded-md text-[9px] font-bold border text-center transition ${matingMode === 'multitouro' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
               >
                 IATF Coletivo
               </button>
             </div>

            {matingMode === 'individual' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center">
                    <span>Matriz Selecionada (Dam)</span>
                    <InfoTooltip
                      title="Seleção de Matrizes"
                      content="Fêmeas ativas e aptas à reprodução no rebanho."
                      theory="A fêmea contribui com 50% dos genes aditivos da progênie e é fundamental para transmitir habilidade materna e fertilidade à próxima geração."
                      practice="Escolha uma matriz com dados genômicos completos para obter maior acurácia (Acc) nas projeções de ganho genético do bezerro."
                    />
                  </label>
                  <select
                    value={selectedDamId}
                    onChange={(e) => handleDamChange(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
                  >
                    <option value="">-- Selecione uma Fêmea --</option>
                    {availableDams.map(dam => {
                      const bStr = Object.keys(dam.breedComp).join('/');
                      return (
                        <option key={dam.id} value={dam.id}>
                          {dam.id} - {dam.name} ({bStr})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center">
                    <span>Touro Selecionado (Sire)</span>
                    <InfoTooltip
                      title="Simulação Específica de Touro"
                      content="Selecione um reprodutor específico para avaliar a compatibilidade genética e a consanguinidade individual simulada com a fêmea escolhida."
                      theory="Cruzamentos específicos nos permitem simular o coeficiente de parentesco direto entre qualquer par de animais."
                      practice="Deixe em 'Todos ou Sugeridos' para que o sistema vasculhe todo o banco de touros e indique automaticamente as melhores opções de cruzamento."
                    />
                  </label>
                  <select
                    value={selectedSireId}
                    onChange={(e) => setSelectedSireId(e.target.value)}
                    disabled={!selectedDamId}
                    className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">-- Todos ou Sugeridos --</option>
                    {availableSires.map(sire => {
                      const bStr = Object.keys(sire.breedComp).join('/');
                      return (
                        <option key={sire.id} value={sire.id}>
                          {sire.id} - {sire.name} ({bStr})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            ) : matingMode === 'lote' ? (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center">
                  <span>Selecione o Lote (Rebanho/Manejo)</span>
                  <InfoTooltip
                    title="Lote de Campo / Grupo de Manejo"
                    content="Grupo de fêmeas agrupadas fisicamente ou por finalidade produtiva na fazenda."
                    theory="Grupos de contemporâneos representam fêmeas que compartilharam o mesmo ambiente físico e alimentar, permitindo uma comparação genotípica mais justa."
                    practice="Selecione o lote correspondente para planejar os acasalamentos coletivos ou multitouro, otimizando o rebanho de maneira uniforme."
                  />
                </label>
                <select
                  value={selectedLote}
                  onChange={(e) => handleLoteChange(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
                >
                  <option value="">-- Selecione um Lote --</option>
                  {availableLotes.map(lote => (
                    <option key={lote} value={lote}>
                      {lote} ({availableDams.filter(d => `${d.rebanho} - ${d.manejo}` === lote).length} matrizes)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center">
                    <span>Selecione o Lote (Rebanho/Manejo)</span>
                    <InfoTooltip
                      title="Lote de Campo / Grupo de Manejo"
                      content="Grupo de fêmeas agrupadas fisicamente ou por finalidade produtiva na fazenda."
                      theory="Grupos de contemporâneos representam fêmeas que compartilharam o mesmo ambiente físico e alimentar, permitindo uma comparação genotípica mais justa."
                      practice="Selecione o lote correspondente para planejar os acasalamentos coletivos ou multitouro, otimizando o rebanho de maneira uniforme."
                    />
                  </label>
                  <select
                    value={selectedLote}
                    onChange={(e) => handleLoteChange(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md p-2 bg-white focus:outline-indigo-500"
                  >
                    <option value="">-- Selecione um Lote --</option>
                    {availableLotes.map(lote => (
                      <option key={lote} value={lote}>
                        {lote} ({availableDams.filter(d => `${d.rebanho} - ${d.manejo}` === lote).length} matrizes)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold text-slate-500 flex items-center">
                      <span>Touros Disponíveis (Pool Multitouro)</span>
                      <InfoTooltip
                        title="Pool de Reprodutores"
                        content="Lista de touros reprodutores aptos que podem ser utilizados na inseminação em lote."
                        theory="A diversidade genética do pool de sêmen previne a perda de vigor híbrido em larga escala e reduz a taxa média de inbreeding no médio prazo."
                        practice="Selecione os touros que você já possui em estoque na central ou no botijão para que o algoritmo os distribua da forma zootécnica mais eficiente."
                      />
                    </label>
                    <div className="flex gap-2 text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setSelectedMultiBulls(availableSires.map(s => s.id))}
                        className="text-indigo-600 hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMultiBulls([])}
                        className="text-indigo-600 hover:underline cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-150 rounded-lg p-2 max-h-32 overflow-y-auto bg-white space-y-1">
                    {availableSires.map(sire => {
                      const isChecked = selectedMultiBulls.includes(sire.id);
                      return (
                        <label key={sire.id} className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer text-slate-600 hover:text-slate-900">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedMultiBulls(selectedMultiBulls.filter(id => id !== sire.id));
                              } else {
                                setSelectedMultiBulls([...selectedMultiBulls, sire.id]);
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{sire.id} - {sire.name} <span className="text-[9px] text-slate-400">({Object.keys(sire.breedComp).join('/')})</span></span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex justify-between items-center w-full">
                    <span className="flex items-center">
                      <span>Limite de Coberturas por Touro</span>
                      <InfoTooltip
                        title="Capacidade Operacional de Coberturas"
                        content="Limite máximo de fêmeas que podem ser destinadas a um mesmo touro na otimização coletiva."
                        theory="A limitação do uso de reprodutores individuais evita o 'efeito do touro popular', que reduz a variabilidade genética geral e acelera a consanguinidade futura do rebanho."
                        practice="Ajuste de acordo com a quantidade de doses de sêmen disponíveis no botijão para aquele touro específico nesta estação."
                      />
                    </span>
                    <span className="font-bold text-indigo-600">{maxCowsPerBull} matrizes</span>
                  </label>
                  <input 
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={maxCowsPerBull}
                    onChange={(e) => setMaxCowsPerBull(Number(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={runCollectiveOptimization}
                  disabled={!selectedLote || selectedMultiBulls.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-100 disabled:text-gray-400 text-white font-extrabold text-[10px] py-2 px-3 rounded-lg uppercase tracking-wider transition-all duration-150 active:scale-[0.98] shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Otimizar IATF Coletivo
                </button>
              </div>
            )}
          </div>
          
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center">
              <span>Objetivo de Produção (Presets de Mercado)</span>
              <InfoTooltip
                title="Objetivos Econômicos e Presets"
                content="Permite carregar ponderações automáticas de pesos com base no objetivo comercial do rebanho."
                theory="Os presets simulam diferentes índices de seleção multicaracterística (Hazel, 1943), focando em traços de importância econômica distinta dependendo do modelo de negócios."
                practice="Escolha 'Ciclo Curto' se seu foco for vender animais pesados diretamente para o frigorífico, ou 'Novilhas de Reposição' se sua prioridade for reter as fêmeas para crescer a fazenda."
              />
            </label>
            <div className="flex flex-col gap-1.5 mt-2">
               <button
                  type="button"
                  onClick={() => setPresetMode('padrao')}
                  title="Busca o melhor equilíbrio entre peso ao desmame, carcaça e precocidade sem focar em apenas uma linha extrema."
                  className={`text-left px-3 py-2 text-[10px] font-medium border rounded-lg transition-colors ${presetMode === 'padrao' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50'}`}
               >
                 <span className="font-bold block">⚖️ Equilíbrio Padrão</span>
                 Equilibra peso à desmama, rendimento de carcaça e fertilidade.
               </button>
               <button
                  type="button"
                  onClick={() => setPresetMode('ciclo_curto')}
                  title="Ideal para venda de bezerros para confinamento rápido. Foca em ganho de peso ao sobreano e acabamento precoce com gordura na carcaça."
                  className={`text-left px-3 py-2 text-[10px] font-medium border rounded-lg transition-colors ${presetMode === 'ciclo_curto' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50'}`}
               >
                 <span className="font-bold block">🚀 Foco em Ciclo Curto (Corte)</span>
                 Prioriza crescimento rápido (Peso ao Sobreano) e gordura de acabamento (EGS).
               </button>
               <button
                  type="button"
                  onClick={() => setPresetMode('reposicao')}
                  title="Foco em produzir fêmeas excelentes para ficarem no rebanho. Valoriza leite/habilidade materna e precocidade sexual (PE)."
                  className={`text-left px-3 py-2 text-[10px] font-medium border rounded-lg transition-colors ${presetMode === 'reposicao' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50'}`}
               >
                 <span className="font-bold block">🍼 Produzir Novilhas de Reposição</span>
                 Habilidade materna/leite (Desmame) e precocidade de fertilidade (PE).
               </button>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2">
              <label className="block text-[11.5px] font-bold text-gray-750 flex items-center">
                <Scale className="w-3.5 h-3.5 text-indigo-600 mr-1" />
                <span>Evitar Parentesco Próximo (Lambda - λ)</span>
                <InfoTooltip
                  title="Aversão ao Risco de Consanguinidade"
                  content="Fator multiplicador de penalidade (Lambda) para evitar cruzamentos com touros aparentados."
                  theory="O método Mate Selection (Kinghorn, 2011) usa uma função penalizada: Índice_Corrigido = Índice_Genético - λ × Parentesco_Médio. Isso remove touros aparentados sem descartar genes excelentes."
                  practice="Mantenha o valor recomendado de 100 para ter o melhor equilíbrio entre ganho genético e controle de endogamia zootécnica."
                />
              </label>
              
              <p className="text-[10px] text-gray-500 leading-tight">
                Mova o controle para definir quanto o programa deve penalizar/descartar touros que tenham parentesco (evitar consanguidade):
              </p>

              <input 
                type="range"
                min="0"
                max="200"
                step="10"
                value={lambdaPenalty}
                onChange={(e) => handlePenaltyChange(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                <span>0 (Aceita Parentesco)</span>
                <span className="text-indigo-700 font-extrabold text-[10px]">Ajustado em: {lambdaPenalty}</span>
                <span>200 (Evita ao Máximo)</span>
              </div>

              {/* Dynamic explanations cards for ranchers */}
              {(() => {
                const expl = getLambdaExplanation(lambdaPenalty);
                return (
                  <div className={`p-2.5 rounded border text-[10.5px] leading-relaxed transition-all duration-200 mt-2 ${expl.color}`}>
                    <strong className="block text-[11px] uppercase tracking-wide mb-0.5">{expl.title}</strong>
                    {expl.text}
                  </div>
                );
              })()}
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2">
              <label className="block text-[11.5px] font-bold text-gray-750 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-500 mr-1" />
                <span>Bloqueio Duro de Endogamia (F%)</span>
                <InfoTooltip
                  title="Filtro de Descarte por Inbreeding"
                  content="Coeficiente limite acima do qual qualquer cruzamento é sumariamente proibido."
                  theory="A depressão por endogamia reduz vigor híbrido e bem-estar (Burrow, 1993). O cruzamento de meio-irmãos gera F = 6.25% e de irmãos inteiros gera F = 12.5%."
                  practice="Recomendamos fixar em 6.25% (padrão internacional) para evitar o surgimento de defeitos congênitos e perdas de peso na desmama."
                />
              </label>
              <input 
                type="range"
                min="0"
                max="25"
                step="0.25"
                value={maxFTolerance}
                onChange={(e) => handleMaxFChange(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                <span>0% (Sem tolerância)</span>
                <span className="text-rose-600 font-extrabold text-[10px]">{maxFTolerance}% MAX</span>
                <span>25%</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-normal">
                Acasalamentos que gerem crias com grau acima de <strong className="text-rose-600">{maxFTolerance}%</strong> (ex: cruzar meio-irmãos é 6,25%) serão **descartados automaticamente** da lista de recomendação.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex justify-between mb-2">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide flex items-center">
                <span>Exibição de Características</span>
                <InfoTooltip
                  title="Traços e DEPs de Comparação"
                  content="Selecione as DEPs (Diferenças Esperadas na Progênie) a serem mostradas no gráfico de radar e tabela."
                  theory="DEPs representam o dobro da capacidade de transmissão de genes aditivos de um animal, expressos na unidade de medida de cada característica (kg, cm, mm)."
                  practice="Selecione até 7 características ativas para focar nas que mais importam para seu diagnóstico genético atual."
                />
              </label>
              <span className="text-[9px] text-slate-500 font-medium">{selectedTraitsKeys.length} ativas</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TRAITS_OPTIONS.map(opt => {
                const isActive = selectedTraitsKeys.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggleTraitSelection(opt.key)}
                    className={`px-2 py-1 flex items-center gap-1 rounded text-[10px] font-bold transition-colors border ${isActive ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {isActive && <ShieldCheck className="w-2.5 h-2.5" />}
                    {opt.shortKey}
                  </button>
                );
              })}
            </div>
          </div>

          {!batchMode && selectedDamObj && (
            <div className="bg-indigo-50/40 rounded-xl p-4 border border-indigo-100 space-y-2">
              <h4 className="text-[10px] font-bold text-indigo-900 uppercase">Perfil Fisiológico</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border-b border-indigo-100/50 pb-1">
                  <span className="text-gray-500">Fazenda:</span>
                  <span className="font-bold text-gray-800">{selectedDamObj.rebanho}</span>
                </div>
                <div className="flex justify-between border-b border-indigo-100/50 pb-1">
                  <span className="text-gray-500">Manejo:</span>
                  <span className="font-bold text-gray-800">{selectedDamObj.manejo}</span>
                </div>
                <div className="flex justify-between border-b border-indigo-100/50 pb-1">
                  <span className="text-gray-500">Nascimento:</span>
                  <span className="font-semibold text-gray-800 font-mono">{selectedDamObj.birthDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pai e Mãe:</span>
                  <span className="font-mono text-[10px] text-gray-700">
                    {selectedDamObj.sireId || '?'}/{selectedDamObj.damId || '?'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {batchMode && loteTarget && (
            <div className="bg-indigo-50/40 rounded-xl p-4 border border-indigo-100 space-y-2">
              <h4 className="text-[10px] font-bold text-indigo-900 uppercase">Perfil do Lote</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border-b border-indigo-100/50 pb-1">
                  <span className="text-gray-500">Fazenda:</span>
                  <span className="font-bold text-gray-800">{loteTarget.rebanho}</span>
                </div>
                <div className="flex justify-between border-b border-indigo-100/50 pb-1">
                  <span className="text-gray-500">Manejo:</span>
                  <span className="font-bold text-gray-800">{loteTarget.manejo}</span>
                </div>
                <div className="flex justify-between border-b border-indigo-100/50 pb-1">
                  <span className="text-gray-500">Volumetria:</span>
                  <span className="font-semibold text-indigo-700 font-mono tracking-tight">{loteTarget.count} MATRIZES</span>
                </div>
              </div>
              <p className="text-[9px] text-indigo-700/80 leading-tight mt-2">
                 O algoritmo ponderará toda a heterogeneidade genética deste grupo, priorizando touros que cobrem os gargalos da maioria minimizando endogamia média do lote.
              </p>
            </div>
          )}
        </div>

        {/* Right columns: Recommendations list */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-150 pb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {matingMode === 'multitouro' ? 'Resultado do Acasalamento IATF Coletivo' : 'Sugestões de Reprodutores Alvo'}
            </h3>
            {matingMode === 'multitouro' && collectiveResults && (
              <button
                onClick={exportCollectiveMatingXLSX}
                className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1 transition cursor-pointer active:scale-[0.98]"
                title="Exportar plano de acasalamento planejado para planilha Excel."
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Planilha IATF
              </button>
            )}
            {matingMode !== 'multitouro' && recommendations.length > 0 && (
              <button
                onClick={exportMatingRecommendationsXLSX}
                className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1 transition cursor-pointer active:scale-[0.98]"
                title="Exportar plano de acasalamento planejado para planilha Excel."
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            )}
          </div>

          {matingMode === 'multitouro' ? (
             !collectiveResults ? (
               <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 bg-slate-50 border border-dashed border-gray-200 rounded-2xl">
                 <HeartHandshake className="w-10 h-10 stroke-1 text-gray-300 mb-2" />
                 <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Planejamento IATF Coletivo (Lote Multitouros)</h4>
                 <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed mt-1">
                    Selecione o lote de fêmeas na barra lateral, defina o pool de touros de seu interesse e clique em <strong>"Otimizar IATF Coletivo"</strong> para calcular a alocação matemática perfeita.
                 </p>
               </div>
             ) : (
               <div className="space-y-6">
                 {/* Aggregated KPI Cards */}
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                   <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-2xs">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Matrizes Alocadas</span>
                     <span className="text-lg font-mono font-black text-slate-800">{collectiveResults.stats.totalDams}</span>
                     <span className="text-[8px] text-emerald-600 font-bold block">100% Cobertas</span>
                   </div>
                   <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-2xs">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Reprodutores Ativos</span>
                     <span className="text-lg font-mono font-black text-slate-800">{collectiveResults.stats.activeSiresCount} / {selectedMultiBulls.length}</span>
                     <span className="text-[8px] text-indigo-500 font-bold block">Empregados no Lote</span>
                   </div>
                   <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-2xs">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Índice Médio Filho</span>
                     <span className="text-lg font-mono font-black text-indigo-700">+{collectiveResults.stats.avgIndexProj}</span>
                     <span className="text-[8px] text-indigo-500 font-bold block">Capacidade Aditiva Média</span>
                   </div>
                   <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-2xs">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Consanguinidade (F%)</span>
                     <span className={`text-lg font-mono font-black ${collectiveResults.stats.avgFProj >= 4.0 ? 'text-amber-600' : 'text-emerald-700'}`}>{collectiveResults.stats.avgFProj}%</span>
                     <span className="text-[8px] text-slate-500 block">Grau de Inbreeding Médio</span>
                   </div>
                 </div>

                 {/* Bull distribution chart */}
                 <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 shadow-2xs">
                   <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">Distribuição de Matrizes por Reprodutor</h4>
                   <div className="space-y-2">
                     {Object.entries(collectiveResults.bullDistribution).map(([sireId, count]) => {
                       const sire = animals.find(a => a.id === sireId);
                       if (!sire || (count as number) === 0) return null;
                       const pct = (count as number) / collectiveResults.stats.totalDams * 100;
                       return (
                         <div key={sireId} className="space-y-1">
                           <div className="flex justify-between text-xs font-semibold text-slate-700">
                             <span>{sire.id} - {sire.name} ({Object.keys(sire.breedComp).join('/')})</span>
                             <span className="font-mono">{count as number} matrizes ({pct.toFixed(0)}%)</span>
                           </div>
                           <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                             <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>

                 {/* Detailed pair-up table */}
                 <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs bg-white">
                   <table className="w-full text-left border-collapse font-sans">
                     <thead>
                       <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase border-b border-slate-200 tracking-wider">
                         <th className="py-2.5 px-3">Matriz</th>
                         <th className="py-2.5 px-3">Touro Designado (Sire)</th>
                         <th className="py-2.5 px-3 text-center">Inbreeding (F)</th>
                         <th className="py-2.5 px-3 text-right">Média Proj. EPD</th>
                         <th className="py-2.5 px-3 text-right">Índice MSI</th>
                         <th className="py-2.5 px-3 text-center">Ficha Completa</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-xs">
                       {collectiveResults.pairings.map((p: any, idx: number) => {
                         const colorClass = p.riskStatus === 'high_risk' 
                           ? 'text-rose-600 font-bold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded text-[10px]' 
                           : p.riskStatus === 'warning' 
                           ? 'text-amber-600 font-bold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[10px]' 
                           : 'text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[10px]';

                         return (
                           <tr key={idx} className="hover:bg-slate-50/50 transition">
                             <td className="py-2.5 px-3">
                               <div className="font-bold text-slate-800">{p.dam.name}</div>
                               <div className="text-[9px] font-mono text-slate-400">{p.dam.id} • {Object.keys(p.dam.breedComp).join('/')}</div>
                             </td>
                             <td className="py-2.5 px-3">
                               <div className="font-bold text-slate-800">{p.sire.name}</div>
                               <div className="text-[9px] font-mono text-slate-400">{p.sire.id} • {Object.keys(p.sire.breedComp).join('/')}</div>
                             </td>
                             <td className="py-2.5 px-3 text-center">
                               <span className={colorClass}>
                                 {p.fOffspringProj}%
                               </span>
                             </td>
                             <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                               +{p.indexProj}
                             </td>
                             <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                               {p.msiScore.toFixed(2)}
                             </td>
                             <td className="py-2.5 px-3 text-center">
                               <button
                                 type="button"
                                 onClick={() => setProgenyModalData({
                                   sire: p.sire,
                                   dam: p.dam,
                                   fOffspringProj: p.fOffspringProj,
                                   riskStatus: p.riskStatus,
                                   msiScore: p.msiScore,
                                   indexProj: p.indexProj
                                 })}
                                 className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[9px] px-2 py-1 rounded transition uppercase cursor-pointer"
                               >
                                 Ver Ficha
                               </button>
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               </div>
             )
          ) : ((matingMode === 'individual' && !selectedDamId) || (matingMode === 'lote' && !selectedLote)) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
              <HeartHandshake className="w-10 h-10 stroke-1 text-gray-300 mb-2" />
              <p className="text-xs font-medium">
                 {matingMode === 'lote' ? 'Selecione um lote ao lado para calcular os cruzamentos recomendados médios.' : 'Selecione uma matriz ao lado para calcular os cruzamentos recomendados.'}
              </p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8 text-gray-400 italic text-xs">
              Nenhum touro reprodutor disponível para acasalamento cadastrado nesta categoria.
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, index) => {
                const sireObj = animals.find(a => a.id === rec.sireId);
                const sireBreedStr = sireObj ? Object.keys(sireObj.breedComp).join('/') : 'Purebred';
                const referenceDamObj = selectedDamObj || (loteTarget ? loteTarget.damsInLote[0] : null);
                const damBreedStr = referenceDamObj ? Object.keys(referenceDamObj.breedComp).join('/') : 'Purebred';
                
                // Heterosis check (if main breeds differ)
                let isCrossbreed = false;
                let projectedBreedComp: Record<string, number> = {};
                if (referenceDamObj && sireObj) {
                  const damMain = Object.keys(referenceDamObj.breedComp).sort((a,b) => referenceDamObj.breedComp[b] - referenceDamObj.breedComp[a])[0];
                  const sireMain = Object.keys(sireObj.breedComp).sort((a,b) => sireObj.breedComp[b] - sireObj.breedComp[a])[0];
                  if (damMain && sireMain && damMain !== sireMain) {
                    isCrossbreed = true;
                  }
                  
                  // Compute expected breed fractions
                  Object.entries(referenceDamObj.breedComp).forEach(([b, frac]) => {
                    projectedBreedComp[b] = (projectedBreedComp[b] || 0) + frac * 0.5;
                  });
                  Object.entries(sireObj.breedComp).forEach(([b, frac]) => {
                    projectedBreedComp[b] = (projectedBreedComp[b] || 0) + frac * 0.5;
                  });
                }
                
                const progenyBreedStr = Object.entries(projectedBreedComp)
                  .sort((a,b) => b[1] - a[1])
                  .map(([b, frac]) => `${b} ${(frac * 100).toFixed(0)}%`)
                  .join(' / ');

                // Calculate heterozygosity of expected progênie
                let progHeterozygosity = 0;
                if (sireObj && referenceDamObj) {
                  let sumIntersect = 0;
                  const allBreeds = new Set([
                    ...Object.keys(sireObj.breedComp),
                    ...Object.keys(referenceDamObj.breedComp)
                  ]);
                  allBreeds.forEach(breed => {
                    const pS = sireObj.breedComp[breed] || 0;
                    const pD = referenceDamObj.breedComp[breed] || 0;
                    sumIntersect += pS * pD;
                  });
                  progHeterozygosity = Math.max(0, Math.min(1.0, 1.0 - sumIntersect));
                }

                // Build Radar Data
                const activeTraits = selectedTraitsKeys.map(k => TRAITS_OPTIONS.find(t => t.key === k)!);

                const radarData = activeTraits.map(trait => {
                  const sireDep = evaluationEstimates[trait.key]?.[rec.sireId]?.dep || 0;
                  
                  let damDep = 0;
                  if (!batchMode) {
                     damDep = evaluationEstimates[trait.key]?.[selectedDamId]?.dep || 0;
                  } else if (loteTarget) {
                     const total = loteTarget.damsInLote.reduce((acc, sumDam) => acc + (evaluationEstimates[trait.key]?.[sumDam.id]?.dep || 0), 0);
                     damDep = total / loteTarget.damsInLote.length;
                  }
                  const progDep = (sireDep + damDep) / 2;

                  return {
                    subject: trait.label,
                    DamName: normalizeDep(damDep, trait.key),
                    Touro: normalizeDep(sireDep, trait.key),
                    Progênie: normalizeDep(progDep, trait.key),
                    deltaAbs: progDep - damDep,
                    prog: progDep,
                    base: damDep,
                    fullMark: 100,
                  };
                });

                const deltaData = radarData.map(item => ({
                  name: item.subject,
                  Evolução: Number(item.deltaAbs.toFixed(2))
                }));

                return (
                  <div
                    key={rec.sireId}
                    className={`border rounded-xl p-4 transition duration-200 relative ${
                      rec.riskStatus === 'high_risk'
                        ? 'border-rose-200 bg-rose-50/5 hover:bg-rose-50/10'
                        : rec.riskStatus === 'warning'
                        ? 'border-amber-200 bg-amber-50/5 hover:bg-amber-50/10'
                        : 'border-gray-100 bg-white hover:border-indigo-100 shadow-3xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 border border-amber-500/20">
                            RANK #{index + 1}
                          </span>
                          <span className="font-bold text-gray-900 font-mono text-[13px]">{rec.sireId}</span>
                          <span className="text-xs font-semibold px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                            {sireBreedStr}
                          </span>
                        </div>
                        <h4 className="text-xs text-gray-500 mt-0.5">{rec.sireName}</h4>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <div>
                          <span className="block text-[9px] text-gray-400 uppercase font-bold text-right" title="Mate Selection Index (MSI)">MSI (MateSel)</span>
                          <span className="text-sm font-extrabold text-indigo-700 flex items-center justify-end gap-1">
                            {rec.msiScore}
                          </span>
                        </div>
                        <div className="pl-4 border-l border-gray-100">
                          <span className="block text-[9px] text-gray-400 uppercase font-bold text-right">Índice Bruto</span>
                          <span className="text-sm font-extrabold text-emerald-600 flex items-center justify-end gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                            {rec.indexProj}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Visual Complementary Radar & Heterosis */}
                    <div className="mt-4 border-t border-gray-100/70 pt-4 flex flex-col lg:flex-row gap-6 items-center">
                      <div className="w-full lg:w-1/3 flex flex-col justify-between">
                        <div className="text-center">
                          <h4 
                            className="text-[11px] font-bold text-gray-700 uppercase flex items-center justify-center gap-1 mb-1 cursor-help"
                            title="O cruzamento corrige falhas: se a mãe é fraca em uma característica, o sistema recomenda um touro forte nela para puxar o bezerro para cima."
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            Complementariedade da Cria
                            <Info className="w-3 h-3 text-slate-400 inline" />
                          </h4>
                        </div>

                         {/* Farmer-friendly explanation box */}
                        <div className="my-2 bg-gradient-to-r from-indigo-50/40 to-emerald-50/20 border border-slate-100 p-2.5 rounded-lg text-[10px] text-slate-600 leading-relaxed">
                          <span className="font-extrabold text-indigo-900 block uppercase tracking-wide text-[9px] mb-0.5">O que é complementar?</span>
                          Casar as qualidades do touro com as necessidades da vaca. Se a fêmea possui valor baixo (linha laranja tracejada), o sistema busca um touro superior (linha azul tracejada) para compensar, resultando em uma cria com genética elevada e equilibrada (área verde).
                        </div>

                        <div className="h-[210px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                               <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 9, fontWeight: 'bold' }} />
                              <Radar name={batchMode ? 'Média Lote (Laranja)' : 'Matriz (Laranja)'} dataKey="DamName" stroke="#ea580c" strokeWidth={2.5} fill="#ffedd5" fillOpacity={0.15} strokeDasharray="4 3"/>
                              <Radar name="Touro (Azul)" dataKey="Touro" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.05} strokeDasharray="3 3" />
                              <Radar name="Cria Projetada (Verde)" dataKey="Progênie" stroke="#059669" fill="#10b981" fillOpacity={0.4} />
                              <Legend wrapperStyle={{ fontSize: '8.5px', marginTop: '5px' }} />
                              <RechartsTooltip wrapperStyle={{ fontSize: '10px' }} formatter={(value: number) => value.toFixed(0)} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="w-full lg:w-2/3 space-y-4">
                        {isCrossbreed && (
                           <div className="flex items-start gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-3 rounded-lg">
                             <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                             <div>
                               <h5 className="text-[11px] font-bold text-amber-900 uppercase">Choque de Sangue e Vigor Híbrido (Heterozigose)</h5>
                               <p className="text-[10px] text-amber-800 leading-tight mt-0.5">
                                 Este acasalamento utiliza cruzamento industrial ({progenyBreedStr}). A progênie experimentará retenção de vigor híbrido, aumentando rusticidade e ganhos não explicados apenas pela genética aditiva (DEP).
                               </p>
                             </div>
                           </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div 
                              className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase cursor-help border-b border-dashed border-gray-300"
                              title="Exibe a faixa provável de variação genética da cria. Como a transmissão de genes é aleatória (segregação mendeliana), a cria pode herdar um valor acima ou abaixo da média projetada. Quanto maior a Acurácia (Acc), menor é essa margem de variação."
                            >
                              <Info className="w-3.5 h-3.5 text-indigo-500" />
                              Probabilidade de Segregamento Genético
                            </div>
                          </div>
                      
                          <div className="flex flex-wrap gap-2">
                            {activeTraits.map(trait => {
                              const sireDep = evaluationEstimates[trait.key]?.[rec.sireId]?.dep || 0;
                              let damDep = 0;
                              if (!batchMode) {
                                 damDep = evaluationEstimates[trait.key]?.[selectedDamId]?.dep || 0;
                              } else if (loteTarget) {
                                 const total = loteTarget.damsInLote.reduce((acc, sumDam) => acc + (evaluationEstimates[trait.key]?.[sumDam.id]?.dep || 0), 0);
                                 damDep = total / loteTarget.damsInLote.length;
                              }
                              
                              const sireAcc = evaluationEstimates[trait.key]?.[rec.sireId]?.acc || 0;
                              let damAcc = 0;
                              if (!batchMode) {
                                 damAcc = evaluationEstimates[trait.key]?.[selectedDamId]?.acc || 0;
                              } else if (loteTarget) {
                                 const totalAcc = loteTarget.damsInLote.reduce((acc, sumDam) => acc + (evaluationEstimates[trait.key]?.[sumDam.id]?.acc || 0), 0);
                                 damAcc = totalAcc / loteTarget.damsInLote.length;
                              }
                              
                              const progDep = (sireDep + damDep) / 2;
                              const avgAcc = (sireAcc + damAcc) / 2;
                              
                              // Calculate error margin based on Accuracy (1 - Acc) * Standard Deviation of trait
                              const margin = (1 - avgAcc) * (maxVariances[trait.key] || 1);
                              const minDep = progDep - margin;
                              const maxDep = progDep + margin;
                              
                              return (
                                <div key={trait.key} className={`flex-1 min-w-[80px] border rounded-lg p-2 text-center flex flex-col justify-center items-center ${trait.bg}`}>
                                  <span className="text-[9px] uppercase font-bold opacity-70 mb-0.5">{trait.label}</span>
                                  <div className="flex flex-col items-center">
                                    <span className="font-mono text-[8px] font-medium text-gray-500">Média: {progDep > 0 ? '+' : ''}{progDep.toFixed(2)}</span>
                                    <span className="font-mono text-[10px] font-black leading-tight mt-0.5">
                                      {minDep > 0 ? '+' : ''}{minDep.toFixed(2)} a {maxDep > 0 ? '+' : ''}{maxDep.toFixed(2)}
                                    </span>
                                  </div>
                                  <span className="text-[8px] text-gray-500 mt-1 font-medium bg-white/50 px-1 rounded-sm">Acc Média: {(avgAcc * 100).toFixed(0)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-2">
                            <div 
                              className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase cursor-help border-b border-dashed border-gray-300"
                              title="Demonstra o ganho ou perda genética (Delta Δ) esperado na progênie em comparação com a mãe ou com a média do lote. Exemplo: se o gráfico indica +2.5 para Peso ao Desmame, espera-se que o bezerro nasça com uma habilidade genética de ganho de peso 2.5 kg superior à da mãe."
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                              Impacto Esperado (Δ Progênie vs {batchMode ? 'Lote' : 'Matriz'})
                            </div>
                          </div>
                          <div className="h-[120px] w-full bg-slate-50/50 rounded-lg border border-slate-100 p-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={deltaData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip 
                                  wrapperStyle={{ fontSize: '10px' }} 
                                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                  formatter={(value: number) => [`${value > 0 ? '+' : ''}${value}`, 'Evolução']}
                                />
                                <ReferenceLine y={0} stroke="#94a3b8" />
                                <Bar dataKey="Evolução" radius={[2, 2, 0, 0]} maxBarSize={30}>
                                  {deltaData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.Evolução > 0 ? '#10b981' : entry.Evolução < 0 ? '#f43f5e' : '#cbd5e1'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100/70 pt-3">
                      {/* Left side: Consanguinity and Heterozygosity bars */}
                      <div className="space-y-3">
                        {/* Consanguinity Bar */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-gray-500">Consanguinidade da progênie estimada (F)</span>
                            <span className={`font-mono font-bold ${
                              rec.riskStatus === 'high_risk'
                                ? 'text-rose-600'
                                : rec.riskStatus === 'warning'
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}>
                              {rec.fOffspringProj}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                rec.riskStatus === 'high_risk'
                                  ? 'bg-rose-500'
                                  : rec.riskStatus === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, rec.fOffspringProj * 8)}%` }} // Scaling representation for easy visual
                            />
                          </div>
                        </div>

                        {/* Heterozigose da progênie */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-gray-500">Heterozigose da progênie</span>
                            <span className="font-mono font-bold text-indigo-650">
                              {(progHeterozygosity * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full transition-all duration-300 bg-indigo-500"
                              style={{ width: `${Math.min(100, progHeterozygosity * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Warning badges and simulation card */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                        <div className="flex-1 w-full">
                          {rec.riskStatus === 'high_risk' ? (
                            <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-100 p-2 rounded-lg w-full">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <div className="text-[10px] leading-tight">
                                <strong>Aviso Consanguíneo Elevado:</strong> F ≥ 6.25%. Risco máximo de depressão por endogamia e malformações. Não recomendado.
                              </div>
                            </div>
                          ) : rec.riskStatus === 'warning' ? (
                            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-100 p-2 rounded-lg w-full">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <div className="text-[10px] leading-tight">
                                <strong>Alerta de Parentesco:</strong> F entre 3.1% e 6.2%. Acasalamento de monitoramento ativo em rebanho zootécnico.
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100 p-2 rounded-lg w-full">
                              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="text-[10px] leading-tight">
                                <strong>Acasalamento Seguro:</strong> Genealogias limpas. Proporção nula ou basal de consanguinidade na futura cria.
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            const damObj = selectedDamObj || (loteTarget ? loteTarget.damsInLote[0] : null);
                            if (sireObj && damObj) {
                              setProgenyModalData({
                                sire: sireObj,
                                dam: damObj,
                                fOffspringProj: rec.fOffspringProj,
                                riskStatus: rec.riskStatus,
                                msiScore: rec.msiScore,
                                indexProj: rec.indexProj
                              });
                            }
                          }}
                          className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ficha da Progênie
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}

      {progenyModalData && (
        <ProgenyModal
          sire={progenyModalData.sire}
          dam={progenyModalData.dam}
          animals={animals}
          indexConfig={indexConfig}
          evaluationEstimates={evaluationEstimates}
          fOffspringProj={progenyModalData.fOffspringProj}
          riskStatus={progenyModalData.riskStatus}
          msiScore={progenyModalData.msiScore}
          indexProj={progenyModalData.indexProj}
          onClose={() => setProgenyModalData(null)}
        />
      )}
    </div>
  );
}
