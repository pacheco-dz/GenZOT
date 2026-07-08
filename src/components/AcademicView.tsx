/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Animal, GeneticParameters } from '../types';
import { solveBLUP, computeRelationshipMatrix, computeAInverse, buildClosedSortedPedigree } from '../utils/math';
import { Award, HelpCircle, GraduationCap, Settings, Cpu, Layers, Grid, TrendingUp, Info, Calendar, BookOpen, Sparkles, Sliders } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip
} from 'recharts';

interface AcademicViewProps {
  animals: Animal[];
  geneticParams: GeneticParameters;
  onUpdateParams: (params: GeneticParameters) => void;
  evaluationEstimates: { [trait: string]: { [id: string]: { dep: number; acc: number } } };
}

export default function AcademicView({
  animals,
  geneticParams,
  onUpdateParams,
  evaluationEstimates
}: AcademicViewProps) {
  const [selectedTrait, setSelectedTrait] = useState<'pesoDesmame' | 'pesoSobreano' | 'pe' | 'aol' | 'egs'>('pesoDesmame');
  const [activeTab, setActiveTab] = useState<'mme' | 'pedigree' | 'formulas' | 'variances'>('mme');

  // Closed and topologically sorted pedigree
  const closedSortedPedigree = useMemo(() => {
    return buildClosedSortedPedigree(animals);
  }, [animals]);

  // A and A^-1 Matrices for active pedigree
  const pedigreeMatrices = useMemo(() => {
    const rel = computeRelationshipMatrix(closedSortedPedigree);
    const ainv = computeAInverse(closedSortedPedigree, rel.F);
    return {
      A: rel.A,
      AInv: ainv,
      F: rel.F,
      ids: rel.ids
    };
  }, [closedSortedPedigree]);

  // Live MME Solver and details extraction
  const blupSystem = useMemo(() => {
    return solveBLUP(animals, selectedTrait, geneticParams);
  }, [animals, selectedTrait, geneticParams]);

  // Dynamic parameters modifies
  const handleH2Change = (val: number) => {
    // h2 = var_g / (var_g + var_e) -> keep var_g fixed at 15.0 to adjust var_e relative
    const var_g = 15.0;
    const var_e = (var_g * (1 - val)) / val;
    onUpdateParams({
      ...geneticParams,
      [`h2_${selectedTrait}`]: Number(val.toFixed(2)),
      [`var_g_${selectedTrait}`]: Number(var_g.toFixed(1)),
      [`var_e_${selectedTrait}`]: Number(var_e.toFixed(1))
    });
  };

  const sys = blupSystem.systemDetails;
  const idsList = sys.indexToAnimalId;

  // Helper to retrieve meta info for active trait
  const activeTraitMeta = useMemo(() => {
    switch (selectedTrait) {
      case 'pesoDesmame':
        return { label: 'Peso ao Desmame', unit: 'kg', color: '#10b981' };
      case 'pesoSobreano':
        return { label: 'Peso ao Sobreano', unit: 'kg', color: '#6366f1' };
      case 'pe':
        return { label: 'Perímetro Escrotal', unit: 'cm', color: '#f59e0b' };
      case 'aol':
        return { label: 'Área de Olho de Lombo', unit: 'cm²', color: '#3b82f6' };
      case 'egs':
        return { label: 'Espessura de Gordura', unit: 'mm', color: '#f43f5e' };
      default:
        return { label: selectedTrait, unit: '', color: '#4f46e5' };
    }
  }, [selectedTrait]);

  // Compute live genetic trend
  const trendData = useMemo(() => {
    const yearsMap: { [year: number]: { sum: number; count: number; sumAcc: number } } = {};
    
    animals.forEach(animal => {
      const yr = animal.birthYear;
      const traitEsts = evaluationEstimates[selectedTrait];
      const estim = traitEsts ? traitEsts[animal.id] : null;
      const depVal = estim ? estim.dep : 0;
      const accVal = estim ? estim.acc : 0;
      
      if (!yearsMap[yr]) {
        yearsMap[yr] = { sum: 0, count: 0, sumAcc: 0 };
      }
      yearsMap[yr].sum += depVal;
      yearsMap[yr].sumAcc += accVal;
      yearsMap[yr].count += 1;
    });

    return Object.keys(yearsMap)
      .map(yrStr => {
        const yr = Number(yrStr);
        const { sum, count, sumAcc } = yearsMap[yr];
        return {
          year: yr,
          formattedYear: `${yr}`,
          avgDEP: Number((sum / count).toFixed(3)),
          avgAcc: Number((sumAcc / count).toFixed(3)),
          animalsCount: count
        };
      })
      .sort((a, b) => a.year - b.year);
  }, [animals, selectedTrait, evaluationEstimates]);

  // Derived trend statistics
  const trendStats = useMemo(() => {
    if (trendData.length < 2) {
      return { progress: 0, isPositive: true, firstYear: 0, lastYear: 0, avgOverall: 0, avgAccOverall: 0 };
    }
    const firstObj = trendData[0];
    const lastObj = trendData[trendData.length - 1];
    const progressVal = lastObj.avgDEP - firstObj.avgDEP;
    const avgOverallVal = trendData.reduce((acc, curr) => acc + curr.avgDEP, 0) / trendData.length;
    const avgAccOverallVal = (trendData.reduce((acc, curr) => acc + curr.avgAcc, 0) / trendData.length) * 100;
    return {
      progress: Math.abs(progressVal),
      isPositive: progressVal >= 0,
      firstYear: firstObj.year,
      lastYear: lastObj.year,
      avgOverall: Number(avgOverallVal.toFixed(3)),
      avgAccOverall: Number(avgAccOverallVal.toFixed(1))
    };
  }, [trendData]);

  return (
    <div className="space-y-6">
      {/* Educational parameter controls banner */}
      <div className="bg-white rounded-xl shadow-3xs border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2 md:col-span-1 border-r border-gray-50 pr-0 md:pr-6">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 leading-tight">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            Parâmetros Biométricos do Simulador
          </h3>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Mude as propriedades genéticas aditivas em tempo real para ver o impacto direto das equações de modelos mistos e nas DEPs.
          </p>

          <div className="pt-2">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Característica Avaliada</label>
            <select
              value={selectedTrait}
              onChange={(e) => setSelectedTrait(e.target.value as any)}
              className="w-full text-xs border border-gray-200 rounded-md p-1.5 bg-white font-semibold"
            >
              <option value="pesoDesmame">Peso ao Desmame (h²={geneticParams.h2_pesoDesmame})</option>
              <option value="pesoSobreano">Peso ao Sobreano / Fínal (h²={geneticParams.h2_pesoSobreano})</option>
              <option value="pe">Perímetro Escrotal (h²={geneticParams.h2_pe})</option>
              <option value="aol">Área de Olho de Lombo (h²={geneticParams.h2_aol})</option>
              <option value="egs">Espessura de Gordura (h²={geneticParams.h2_egs})</option>
            </select>
          </div>
        </div>

        {/* Sliders parameters */}
        <div className="space-y-4 md:col-span-2 flex flex-col justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1" title="Herdabilidade (h²): Proporção da variância fenotípica total atribuída à variância genética aditiva (h² = σ²a / σ²p).">
                <span className="text-gray-700 border-b border-dashed border-gray-400 cursor-help">Herdabilidade (h²)</span>
                <span className="font-mono text-indigo-700">{(sys.h2 * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.80"
                step="0.01"
                value={sys.h2}
                onChange={e => handleH2Change(Number(e.target.value))}
                className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[9px] text-gray-400 block mt-0.5">
                Proporção da variação total devida à herança aditiva.
              </span>
            </div>

            <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100/50 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-indigo-900 tracking-wider">Razão de Penalização BLUP</span>
              <div className="flex justify-between items-baseline mt-1 font-mono cursor-help" title="Razão de Variâncias (α = σ²e / σ²a): Utilizada em Z'Z + A⁻¹α. Quanto maior α (menor herdabilidade), mais as estimativas (DEPs) são 'encolhidas' (regredidas) em direção à média para se esquivar de erros amostrais.">
                <span className="text-[11px] text-gray-500 border-b border-dashed border-gray-400">α = σ²e / σ²a :</span>
                <span className="text-sm font-black text-indigo-700">{sys.alpha.toFixed(3)}</span>
              </div>
              <span className="text-[9px] text-gray-400 block mt-0.5 leading-tight">
                Grau de encolhimento (shrinkage). Herdabilidades menores produzem &alpha; maior, reduzindo o efeito genético.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Genetic Trend Chart Section - Recharts */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-6 shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center border-b border-slate-100 pb-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-lg shrink-0 text-slate-800">
              <TrendingUp className="w-5 h-5 text-indigo-650" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Evolução da Tendência Genética (BLUP)</h3>
              <p className="text-[10px] text-slate-400">Progresso dos valores aditivos médios (DEPs) por safra (ano de nascimento) de ruminantes do rebanho.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Sajfras: {trendStats.firstYear || 'N/A'} - {trendStats.lastYear || 'N/A'}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-250 text-indigo-800 rounded-lg text-[11px]">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              Média DEP Geral: <strong className="font-mono text-indigo-900">{trendStats.avgOverall ?? 0} {activeTraitMeta.unit}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
          
          {/* Recharts Graphical Pane */}
          <div className="lg:col-span-3 min-h-[280px] bg-slate-50/50 rounded-xl border border-slate-100 p-4 relative flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                DEP Média por Geração ({activeTraitMeta.unit})
              </span>
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-white border border-indigo-100 px-2.5 py-0.5 rounded-full shadow-3xs">
                Característica: {activeTraitMeta.label}
              </span>
            </div>
            
            {trendData.length > 0 ? (
              <div className="w-full h-64 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 10, right: 20, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorDEP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeTraitMeta.color} stopOpacity={0.22}/>
                        <stop offset="95%" stopColor={activeTraitMeta.color} stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="formattedYear"
                      stroke="#64748b"
                      fontSize={10}
                      fontWeight="600"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      fontWeight="600"
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                    />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-800 text-white rounded-lg p-3 text-[10px] font-mono shadow-md space-y-1">
                              <div className="font-bold border-b border-slate-800 pb-1 text-[11px] text-slate-300">Safra {data.year}</div>
                              <div className="flex justify-between gap-6">
                                <span className="text-slate-400">Nº Animais:</span>
                                <span className="font-bold text-white">{data.animalsCount}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-slate-400">DEP Média:</span>
                                <span className="font-bold text-emerald-400">
                                  {data.avgDEP > 0 ? `+${data.avgDEP}` : data.avgDEP} {activeTraitMeta.unit}
                                </span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-slate-400">Acurácia Média:</span>
                                <span className="font-bold text-sky-450">{(data.avgAcc * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgDEP"
                      name="DEP Média"
                      stroke={activeTraitMeta.color}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorDEP)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: activeTraitMeta.color }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-mono italic">
                Nenhum dado histórico de safra disponível para gerar a tendência.
              </div>
            )}
          </div>

          {/* Scholars/Educational Insights Sidecard */}
          <div className="bg-slate-905 bg-slate-900 rounded-xl p-5 text-slate-300 border-l-4 border-emerald-500 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="px-2 py-0.5 bg-emerald-500 rounded text-[9px] font-bold text-slate-950 uppercase tracking-widest">
                Análise Zootécnica
              </span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Progresso Genético Obtido</h4>
              
              <div className="space-y-2 mt-4 font-mono text-[10px]">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Ganho Acumulado:</span>
                  <span className={`font-bold ${trendStats.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trendStats.isPositive ? '+' : '-'}{trendStats.progress.toFixed(3)} {activeTraitMeta.unit}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Acurácia Geral:</span>
                  <span className="font-bold text-sky-400">
                    {trendStats.avgAccOverall ?? 0}%
                  </span>
                </div>
                <div className="flex justify-between pb-0.5">
                  <span className="text-slate-400">Animais Avaliados:</span>
                  <span className="font-bold text-white">
                    {animals.length} cab
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 leading-relaxed pt-3 border-t border-slate-800">
              <p>
                O ganho genético aditivo anual é diretamente dependente da <strong>Herdabilidade (h²)</strong> configurada acima e da intensidade de seleção aplicada. Ao elevar a herdabilidade do simulador, veja como as estimativas de DEPs respondem, aumentando as oscilações e a taxa de progresso calculada.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Deep matrix segments view */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-gray-900">Lab de Álgebra Linear & Equações Mistos (MME)</h3>
              <p className="text-[10px] text-gray-400">Verifique a montagem exata dos vetores, matrizes, pedigree e resoluções.</p>
            </div>
          </div>

          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('mme')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                activeTab === 'mme' ? 'bg-white text-gray-900 shadow-3xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Matrizes do MME
            </button>
            <button
              onClick={() => setActiveTab('pedigree')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                activeTab === 'pedigree' ? 'bg-white text-gray-900 shadow-3xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Pedigree e Consanguinidade A
            </button>
            <button
              onClick={() => setActiveTab('formulas')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                activeTab === 'formulas' ? 'bg-white text-gray-900 shadow-3xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" /> Equações de Henderson
            </button>
            <button
              onClick={() => setActiveTab('variances')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                activeTab === 'variances' ? 'bg-white text-gray-900 shadow-3xs border border-indigo-150' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Decomposição de Variâncias & Prática
            </button>
          </div>
        </div>

        {activeTab === 'mme' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-3 text-[11px] leading-relaxed text-gray-600">
              Abaixo são mostradas as submatrizes mistas calculadas em tempo real. Os eixos representam os <strong>Efeitos Fixos</strong> (Grupos de Contemporâneos e Cruzamentos) seguidos pelos <strong>Valores Aditivos Genéticos Individuais</strong> de cada animal do rebanho fechado.
            </div>

            {/* Displaying MME LHS matrix */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-700 font-mono flex items-center gap-1 cursor-help w-max" title="LHS = Left-Hand Side. Composta por submatrizes: X'X (incidência contagem fixos), X'Z e Z'X (associação fixo-animal), e (Z'Z + A⁻¹α) (associação animal-animal somada ao pedigree + penalização).">
                <span className="border-b border-dashed border-gray-400">Matriz de Coeficientes LHS (Esquerda do MME) [{sys.mmeLHS.length} x {sys.mmeLHS.length}]</span>
              </h4>
              <div className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-900 p-4 shadow-inner max-h-72">
                <table className="w-full text-left border-collapse font-mono text-[9px] text-gray-300">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500">
                      <th className="p-1 pb-2">Label</th>
                      {sys.fixedEffectNames.map((n, i) => (
                        <th key={i} className="p-1 pb-2 text-center cursor-help border-b border-dashed border-gray-600/50" title={`Matriz X: Frequencia Efeito Fixo (${n}). Soma de dados que incidem sobre esse termo fixo. Na transversal (Z'X/X'Z) mapeia o registro com o G. Contemporâneo.`}>F_{i}</th>
                      ))}
                      {idsList.map((id, i) => (
                        <th key={i} className="p-1 pb-2 text-center text-amber-400 cursor-help border-b border-dashed border-amber-600/50" title={`Matriz Z: Efeito Genético Aleatório (${id}). A parte Z'Z conta pesagens fenotípicas, e a matriz de Parentesco A⁻¹ adiciona ligações co-variânces aditivas interligando parentes.`}>{id}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sys.mmeLHS.map((row, rIdx) => {
                      const isRandomRow = rIdx >= sys.fixedEffectNames.length;
                      const label = !isRandomRow 
                        ? sys.fixedEffectNames[rIdx] 
                        : `[Gen] ${idsList[rIdx - sys.fixedEffectNames.length]}`;
                      
                      return (
                        <tr key={rIdx} className="border-b border-gray-800/40 hover:bg-gray-800/50">
                          <td className="p-1 font-bold whitespace-nowrap text-gray-400 max-w-[130px] truncate" title={label}>{label}</td>
                          {row.map((val, cIdx) => {
                            const isRandomCol = cIdx >= sys.fixedEffectNames.length;
                            return (
                              <td
                                key={cIdx}
                                className={`p-1 text-center font-mono select-all ${
                                  val !== 0
                                    ? isRandomRow && isRandomCol
                                      ? 'text-indigo-400 font-bold'
                                      : 'text-gray-200'
                                    : 'text-gray-700'
                                }`}
                              >
                                {val !== 0 ? val.toFixed(2) : '0'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matrix matching RHS vectors and solutions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold text-gray-700 font-mono flex items-center gap-1 cursor-help w-max mb-2" title="RHS = Right-Hand Side. Soma vetorial das medições (y). X'y indexa somas de pesagens dos GC, enquanto Z'y vincula as observações individuais para balizar o equacionamento (fenótipo ajustado).">
                  <span className="border-b border-dashed border-gray-400">Vetor de Observações RHS (Direita do MME)</span>
                </h4>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono text-[10px] text-gray-300 max-h-56 overflow-y-auto">
                  {sys.mmeRHS.map((val, idx) => {
                    const isRandom = idx >= sys.fixedEffectNames.length;
                    const name = !isRandom 
                      ? sys.fixedEffectNames[idx] 
                      : `animal:${idsList[idx - sys.fixedEffectNames.length]}`;
                    return (
                      <div key={idx} className="flex justify-between border-b border-gray-900 py-1 hover:bg-gray-900/50">
                        <span className="text-gray-500">{name}</span>
                        <span className="font-bold text-emerald-400">{val.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-700 font-mono flex items-center gap-1 cursor-help w-max mb-2" title="Vetor de soluções gerado após computação (LHS⁻¹ * RHS). As primeiras posições compõem o vetor beta (β̂) dos efeitos ambientais e, abaixo delas, o vetor de efeitos genéticos (û - ou DEP/EBV).">
                  <span className="border-b border-dashed border-gray-400">Vetor de Soluções do Sistema (MME Solutions)</span>
                </h4>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono text-[10px] text-gray-300 max-h-56 overflow-y-auto">
                  {sys.solutions.map((val, idx) => {
                    const isRandom = idx >= sys.fixedEffectNames.length;
                    const name = !isRandom 
                      ? sys.fixedEffectNames[idx] 
                      : `EBV (u) - ${idsList[idx - sys.fixedEffectNames.length]}`;
                    return (
                      <div key={idx} className="flex justify-between border-b border-gray-900 py-1 hover:bg-gray-900/50">
                        <span className="text-gray-500">{name}</span>
                        <span className="font-bold text-indigo-400">{val > 0 ? `+${val.toFixed(3)}` : val.toFixed(3)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pedigree' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-3 text-[11px] leading-relaxed text-gray-600">
              O parentesco numérico entre todos os animais é construído sequencialmente usando o algoritmo de **Meuwissen & Luo (1992)**. Com base nisso, Henderson deduziu as contribuições para a inversa <strong>A⁻¹</strong> diretamente a partir do pedigree dos pais, demonstrada a seguir.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matrix A representation */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 font-mono flex items-center gap-1 cursor-help w-max mb-2" title="A Matrix: Numerador de Relações Aditivas (Wright). Diagonais = 1 + F (Inbreeding). Extra-diagonais marcam a proporção de alelos compartilhados.">
                  <span className="border-b border-dashed border-gray-400">Matriz de Parentesco Aditivo A (Grau de Sangue e F)</span>
                </h4>
                <div className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-50 p-3 max-h-72">
                  <table className="w-full text-left border-collapse font-mono text-[9px] text-gray-700">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="p-1">ID</th>
                        {pedigreeMatrices.ids.map(id => (
                          <th key={id} className="p-1 text-center font-bold">{id}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pedigreeMatrices.A.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-gray-100 hover:bg-gray-100">
                          <td className="p-1 font-bold text-gray-800">{pedigreeMatrices.ids[rIdx]}</td>
                          {row.map((val, cIdx) => {
                            const isDiag = rIdx === cIdx;
                            return (
                              <td
                                key={cIdx}
                                className={`p-1 text-center font-mono ${
                                  isDiag 
                                    ? 'bg-indigo-50/50 text-indigo-900 font-bold' 
                                    : val > 0 
                                      ? 'text-gray-900 font-medium' 
                                      : 'text-gray-300'
                                }`}
                              >
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Matrix A^-1 representation */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 font-mono flex items-center gap-1 cursor-help w-max mb-2" title="A⁻¹ Matriz Inversa direta originada pelas regras de Henderson. Permite a integração relacional gigantesca com complexidade linear, somada diretamente na porção animal do LHS penalizada por alpha.">
                  <span className="border-b border-dashed border-gray-400">Inversa Direta de Henderson A⁻¹ (Sem Inversão Exata)</span>
                </h4>
                <div className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-50 p-3 max-h-72">
                  <table className="w-full text-left border-collapse font-mono text-[9px] text-gray-700">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="p-1">ID</th>
                        {pedigreeMatrices.ids.map(id => (
                          <th key={id} className="p-1 text-center font-bold">{id}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pedigreeMatrices.AInv.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-gray-100 hover:bg-gray-100">
                          <td className="p-1 font-bold text-gray-800">{pedigreeMatrices.ids[rIdx]}</td>
                          {row.map((val, cIdx) => {
                            const isDiag = rIdx === cIdx;
                            return (
                              <td
                                key={cIdx}
                                className={`p-1 text-center font-mono ${
                                  isDiag 
                                    ? 'bg-amber-50/50 text-amber-900 font-bold' 
                                    : Math.abs(val) > 0.001 
                                      ? 'text-gray-900 font-medium' 
                                      : 'text-gray-300'
                                }`}
                              >
                                {val !== 0 ? val.toFixed(2) : '0'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'formulas' && (
          <div className="space-y-6">
            {/* Geometric Balance Didático banner block */}
            <div className="bg-slate-900 rounded-xl p-6 text-slate-300 border-l-4 border-blue-500 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-blue-500 rounded text-[9px] font-bold text-white uppercase">Didático</span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Fundamentos Matemáticos (MME)</h3>
                </div>
                <p className="text-[10px] italic text-slate-500">Henderson (1984), Mrode (2014)</p>
              </div>

              <div className="flex flex-col lg:flex-row items-stretch gap-6">
                <div className="font-mono text-center text-xs text-white leading-relaxed flex items-center justify-center border-b lg:border-b-0 lg:border-l border-slate-700 pb-3 lg:pb-0 lg:pl-6 bg-slate-950 p-4 rounded-lg overflow-x-auto cursor-help" title="X'X (Fixos), X'Z/Z'X (Associação). O quadrante animal Z'Z contém o nº de medições por indivíduo na diagonal. α = σ²e/σ²a penaliza as ligações em A⁻¹, regularizando as estimativas sob modelo misto BLUP (Henderson).">
                  {"$$\\begin{bmatrix} X'X & X'Z \\\\ Z'X & Z'Z + A^{-1}\\alpha \\end{bmatrix} \\begin{bmatrix} \\hat{\\beta} \\\\ \\hat{u} \\end{bmatrix} = \\begin{bmatrix} X'y \\\\ Z'y \\end{bmatrix}$$"}
                </div>
                <div className="flex-1 text-[11px] lg:border-l lg:border-slate-700 lg:pl-6 text-slate-400 leading-relaxed self-center">
                  Este rebanho está sendo avaliado via BLUP. O vetor <strong>&beta;</strong> representa os efeitos fixos do Grupo Contemporâneo (Manejo-Sexo-Ano), enquanto <strong>u</strong> representa o valor genético aditivo (DEP). O termo <strong>A⁻¹</strong> é a matriz de parentesco inversa computada via algoritmo de Meuwissen &amp; Luo diretamente a partir da árvore genealógica.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Significado do Coeficiente F:</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  O coeficiente de consanguinidade individual de Meuwissen &amp; Luo (1992) representa a probabilidade de um animal possuir genes homozigotos idênticos por descendência direta. É expressado como metade da relação aditiva entre seus pais nas gerações anteriores:
                </p>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg font-mono text-[10px] text-slate-800 mt-2.5">
                  F_progeny = 0.5 * A_sire_dam
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Acurácia Analítica Real baseada na PEV:</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Uma vantagem diferencial deste motor é que ele não estima acurácia baseada em coeficientes vagos. Ele inverte completamente as equações LHS e extrai a diagonal correspondente ao animal {`C_ii`}. A Acurácia matemática exata ({`r`}) é mostrada a partir do erro padrão de predição (PEV):
                </p>
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg font-mono text-[10px] text-slate-800 space-y-1 mt-2.5">
                  <div>• PEV = C_ii * σ²e</div>
                  <div>• r² = 1 - (PEV / σ²a) = 1 - C_ii * &alpha;</div>
                  <div>• r = sqrt( r² )</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'variances' && (() => {
          const var_g = 15.0;
          const var_e = (var_g * (1 - sys.h2)) / sys.h2;
          const var_p = var_g + var_e;
          const gPercent = (var_g / var_p) * 100;
          const ePercent = (var_e / var_p) * 100;

          return (
            <div className="space-y-6 animate-fade-in text-slate-800">
              {/* Banner of didactic focus */}
              <div className="bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border border-teal-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Sliders className="w-48 h-48 text-indigo-700" />
                </div>
                <div className="space-y-2 max-w-3xl">
                  <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} /> Estudo de Decomposição de Variância
                  </span>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Laboratório Didático: Genética Aditiva vs Ambiente</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    A herança biológica em animais é modelada estatisticamente pela divisão da variância total observada (Fenotípica) entre fatores herdáveis (Genética Aditiva) e ruídos não-herdáveis (Ambiente/Manejo). Ajuste o seletor de herdabilidade no cabeçalho para ver a dinâmica de regularização.
                  </p>
                </div>
              </div>

              {/* Visual breakdown of decomposition */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
                <div className="md:col-span-5 space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3 shadow-3xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Equação Fundamental
                    </h4>
                    <div className="font-mono text-center text-[12.5px] font-bold bg-slate-900 text-slate-100 p-2.5 rounded-lg border border-slate-800 leading-normal">
                      {"σ²p = σ²g + σ²e"}
                    </div>
                    <div className="text-[10px] text-slate-500 space-y-2 leading-relaxed">
                      <p>• <strong className="text-slate-700">σ²p (Variância Fenotípica):</strong> Variabilidade total que o fazendeiro mede no curral (balança, trena, ultrassom).</p>
                      <p>• <strong className="text-indigo-700">σ²g (Variância Genética Aditiva):</strong> A parte herdável real. É transmitida de pai para filho (EBV/DEP).</p>
                      <p>• <strong className="text-emerald-700">σ²e (Variância Ambiental/Residual):</strong> Ruídos causados por pasto, manejo, estresse térmico, saúde, e erros amostrais.</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3 shadow-3xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Herdabilidade Aplicada
                    </h4>
                    <div className="font-mono text-center text-[12.5px] font-bold bg-slate-900 text-slate-100 p-2.5 rounded-lg border border-slate-800 leading-normal">
                      {"h² = σ²g / σ²p"}
                    </div>
                    <p className="text-[9.8px] text-slate-500 leading-relaxed">
                      Indica a confiabilidade de se selecionar um animal com base no seu desempenho físico. Quanto maior a herdabilidade, mais próxima a correlação entre o fenótipo medido e os genes reais.
                    </p>
                  </div>
                </div>

                {/* Graphic bar representations */}
                <div className="md:col-span-7 space-y-5 bg-white p-5 rounded-xl border border-slate-150 shadow-3xs flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Decomposição Gráfica da Variabilidade:</span>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700">
                        <span>Proporção Genética Aditiva (Herdabilidade):</span>
                        <span className="font-mono text-indigo-700 font-extrabold">{gPercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex border border-slate-150">
                        <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${gPercent}%` }} />
                      </div>
                      <span className="text-[8.5px] text-slate-400 block leading-tight">Representa a fração transmissível hereditariamente às próximas safras.</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700">
                        <span>Proporção de Ruído Residual (Ambiente & Erro):</span>
                        <span className="font-mono text-emerald-700 font-extrabold">{ePercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex border border-slate-150">
                        <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${ePercent}%` }} />
                      </div>
                      <span className="text-[8.5px] text-slate-400 block leading-tight">Ruído não-herdável que confunde a seleção tradicional se não houver correção pelo BLUP.</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 space-y-1.5 mt-2">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-700 block">Valores Absolutos de Variância (Estatística):</span>
                    <div className="grid grid-cols-3 gap-2.5 text-center text-[10px] font-mono leading-tight">
                      <div className="bg-white p-2 rounded border border-slate-150">
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">σ²g (Aditiva)</span>
                        <strong className="text-indigo-700 text-[11px]">{var_g.toFixed(2)}</strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-150">
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">σ²e (Residual)</span>
                        <strong className="text-emerald-700 text-[11px]">{var_e.toFixed(2)}</strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-150">
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">σ²p (Total)</span>
                        <strong className="text-slate-800 text-[11px]">{var_p.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roteiro de Atividade Prática de Variâncias */}
              <div className="bg-gradient-to-r from-teal-50 to-indigo-50 p-5 rounded-2xl border border-indigo-150 space-y-4 shadow-3xs">
                <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                  <GraduationCap className="w-5 h-5 text-indigo-650" />
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 block">Atividade Supervisionada</span>
                    <h3 className="text-sm font-black text-indigo-950">Roteiro de Atividade Prática: Decomposição de Variância & Encolhimento BLUP</h3>
                  </div>
                </div>
                
                <p className="text-[11px] text-slate-650 leading-relaxed">
                  Utilize os controles de herdabilidade e características zootécnicas para simular diferentes parâmetros e responder às questões acadêmicas centrais de melhoramento animal:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10.5px]">
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100/50 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="inline-block bg-teal-50 text-teal-700 font-extrabold text-[8.5px] px-2 py-0.5 rounded-full mb-1 border border-teal-100">Tarefa 1</span>
                      <h4 className="font-bold text-slate-800">Baixa Herdabilidade</h4>
                      <p className="text-[9.5px] text-slate-500 leading-relaxed mt-1">
                        Configure a herdabilidade para <strong>10%</strong> (típico de características reprodutivas e de adaptabilidade). O que acontece com a razão de variâncias Alpha (α) e o que isso significa para a seleção?
                      </p>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded text-[8.5px] text-indigo-950 font-semibold border border-indigo-50 leading-normal">
                      💡 <strong className="text-indigo-900 block font-bold mb-0.5">Diagnóstico Zootécnico:</strong> Alpha dispara para 9.00! Isso encolhe massivamente as DEPs, exigindo o uso estrito do pedigree/BLUP para achar animais superiores sem errar pelo ambiente.
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100/50 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="inline-block bg-indigo-50 text-indigo-700 font-extrabold text-[8.5px] px-2 py-0.5 rounded-full mb-1 border border-indigo-100">Tarefa 2</span>
                      <h4 className="font-bold text-slate-800">Alta Herdabilidade</h4>
                      <p className="text-[9.5px] text-slate-500 leading-relaxed mt-1">
                        Configure a herdabilidade para <strong>50%</strong> (como características de carcaça e ultrassom de gordura). Como o valor de Alpha se comporta e qual o impacto nas soluções do BLUP?
                      </p>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded text-[8.5px] text-indigo-950 font-semibold border border-indigo-50 leading-normal">
                      💡 <strong className="text-indigo-900 block font-bold mb-0.5">Diagnóstico Zootécnico:</strong> Alpha cai para 1.00. O encolhimento das DEPs é muito menor. O próprio fenótipo medido no curral é um excelente preditor do real valor genético!
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100/50 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="inline-block bg-purple-50 text-purple-700 font-extrabold text-[8.5px] px-2 py-0.5 rounded-full mb-1 border border-purple-100">Tarefa 3</span>
                      <h4 className="font-bold text-slate-800">Equação da Decomposição</h4>
                      <p className="text-[9.5px] text-slate-500 leading-relaxed mt-1">
                        Se a variância genética aditiva é mantida em <strong>15.0</strong> e fixamos a herdabilidade do Peso ao Sobreano em <strong>30%</strong>, qual deve ser o valor exato da variância residual/ambiental (σ²e)?
                      </p>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded text-[8.5px] text-indigo-950 font-semibold border border-indigo-50 leading-normal">
                      💡 <strong className="text-indigo-900 block font-bold mb-0.5">Diagnóstico Zootécnico:</strong> σ²e = 15.0 × (1 - 0.3) / 0.3 = 35.0. Com isso, a variância fenotípica total (σ²p) é igual a 50.0.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
