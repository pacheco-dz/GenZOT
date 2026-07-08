import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, TrendingUp, HelpCircle, AlertCircle } from 'lucide-react';
import { Animal, Species } from '../types';

interface GeneticSimulatorProps {
  evaluationEstimates: { [trait: string]: { [id: string]: { dep: number; acc: number } } };
  animals: Animal[];
}

export default function GeneticSimulator({ evaluationEstimates, animals }: GeneticSimulatorProps) {
  const [traitKey, setTraitKey] = useState('pesoDesmame');
  const [heritability, setHeritability] = useState(0.25);
  const [phenoStdDev, setPhenoStdDev] = useState(15.0); // kg or cm
  
  const [selectionProportion, setSelectionProportion] = useState(5); // 5% (Top)
  const [intervalSource, setIntervalSource] = useState<'calculated' | 'slider'>('slider');
  const [generationInterval, setGenerationInterval] = useState(4.0); // years
  const [generations, setGenerations] = useState(5); // number of generations
  const [inbreedingRate, setInbreedingRate] = useState(1.0); // % of inbreeding increase per generation (ΔF)

  // Calculate actual Generation Interval (L) from collected animals database
  const generationIntervalStats = useMemo(() => {
    if (!animals || animals.length === 0) {
      return { average: 4.0, count: 0 };
    }
    
    let totalYears = 0;
    let count = 0;
    const animalMap = new Map(animals.map(a => [a.id, a]));
    
    for (const animal of animals) {
      if (animal.sireId) {
        const sire = animalMap.get(animal.sireId);
        if (sire && sire.birthYear && animal.birthYear) {
          const age = animal.birthYear - sire.birthYear;
          if (age > 0 && age < 25) { // reasonable age limit for bovines
            totalYears += age;
            count++;
          }
        }
      }
      if (animal.damId) {
        const dam = animalMap.get(animal.damId);
        if (dam && dam.birthYear && animal.birthYear) {
          const age = animal.birthYear - dam.birthYear;
          if (age > 0 && age < 25) { // reasonable age limit for bovines
            totalYears += age;
            count++;
          }
        }
      }
    }
    
    if (count > 0) {
      return { average: Number((totalYears / count).toFixed(2)), count };
    }
    return { average: 4.0, count: 0 };
  }, [animals]);

  const activeGenerationInterval = intervalSource === 'calculated' ? generationIntervalStats.average : generationInterval;

  // Approximation of selection intensity (i) given proportion selected (p%)
  // Based on normal distribution integrals for truncation selection
  const getIntensity = (p: number) => {
    const pFrac = p / 100;
    if (pFrac >= 1) return 0;
    if (p <= 1) return 2.66;
    if (p <= 5) return 2.06;
    if (p <= 10) return 1.75;
    if (p <= 20) return 1.40;
    if (p <= 30) return 1.16;
    if (p <= 40) return 0.97;
    if (p <= 50) return 0.80;
    if (p <= 60) return 0.64;
    return 0.50;
  };

  const currentI = getIntensity(selectionProportion);
  
  // Delta G computations
  // Response per generation = i * h² * σ_p
  const responsePerGen = currentI * heritability * phenoStdDev;
  const responsePerYear = responsePerGen / activeGenerationInterval;

  // Inbreeding Depression per Generation based on Burrow (1993, 1998)
  // Estimated at 3.0% of standard deviation per 1% of inbreeding (ΔF)
  const depressionFactor = 0.03 * phenoStdDev;

  const simulationData = useMemo(() => {
    const data = [];
    let currentIdealGain = 0;
    
    for (let gen = 0; gen <= generations; gen++) {
      const currentF = gen * inbreedingRate; // Accumulated inbreeding F%
      const currentDepression = currentF * depressionFactor;
      const currentRealGain = currentIdealGain - currentDepression;

      data.push({
        generation: `Geração ${gen}`,
        year: gen * activeGenerationInterval,
        idealGain: Number(currentIdealGain.toFixed(2)),
        realGain: Number(currentRealGain.toFixed(2)),
        depression: Number(currentDepression.toFixed(2)),
        inbreeding: Number(currentF.toFixed(2)),
      });
      currentIdealGain += responsePerGen;
    }
    return data;
  }, [selectionProportion, heritability, phenoStdDev, generations, activeGenerationInterval, responsePerGen, inbreedingRate, depressionFactor]);

  // Calculations for dynamic visual accumulated genetic gain progress bar
  const lastGenData = simulationData[simulationData.length - 1];
  const totalRealGain = lastGenData ? lastGenData.realGain : 0;
  const totalIdealGain = lastGenData ? lastGenData.idealGain : 0;
  const totalLoss = lastGenData ? lastGenData.depression : 0;
  const totalInbreeding = lastGenData ? lastGenData.inbreeding : 0;
  const totalYears = lastGenData ? lastGenData.year : 0;

  // Benchmark goal is 1.5 standard deviations or the maximum simulated ideal gain
  const benchmarkGoal = Math.max(totalIdealGain, 1.5 * phenoStdDev, 10);
  const realPct = Math.min(100, Math.max(0, (totalRealGain / benchmarkGoal) * 100));
  const lossPct = Math.min(100 - realPct, Math.max(0, (totalLoss / benchmarkGoal) * 100));
  const efficiency = totalIdealGain > 0 ? (totalRealGain / totalIdealGain) * 100 : 100;

  const milestones = simulationData.map((d, idx) => {
    const pct = Math.min(100, Math.max(0, (d.realGain / benchmarkGoal) * 100));
    return {
      label: idx === 0 ? 'Base' : `G${idx}`,
      pct,
      gain: d.realGain,
    };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-slate-800">
      
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white shadow-inner flex flex-col md:flex-row items-start md:items-center gap-4">
        <Target className="w-8 h-8 opacity-90 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="text-lg font-bold tracking-wide">Simulador de Progresso Genético Esperado (ΔG)</h2>
          <p className="text-xs text-emerald-50 opacity-90 mt-1 max-w-4xl leading-relaxed">
            A resposta à seleção mede o avanço genético alcançado pelo rebanho ao longo das gerações. Com base na clássica <strong className="text-white">Equação do Criador (Lush, 1937)</strong>, este simulador prevê a taxa anual de retorno de acordo com as decisões de retenção e as herdabilidades populacionais.
          </p>
        </div>
      </div>

      {/* Amplified Educational Breeder's Equation Guide */}
      <div className="bg-indigo-50/65 border-b border-indigo-100 px-6 py-4 flex gap-3 text-slate-700">
        <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="text-[11px] space-y-1 leading-relaxed">
          <p className="font-bold text-indigo-950 uppercase tracking-wide">Como é calculado o Progresso Genético (ΔG)?</p>
          <p className="text-slate-600">
            O avanço genético por geração é regido pela fórmula: <strong className="text-indigo-800 font-serif">ΔG = i × h² × σp</strong>.
          </p>
          <ul className="list-disc ml-4 space-y-0.5 mt-1 text-slate-600">
            <li><strong>Intensidade de Seleção (i)</strong>: Representa quão superior são os animais escolhidos em relação à média geral. Se você seleciona apenas o <span className="font-bold">Top 5%</span> (alta intensidade), o ganho será muito maior do que se selecionar o Top 30%.</li>
            <li><strong>Herdabilidade (h²)</strong>: Proporção da variabilidade fenotípica que é herdável (genética aditiva). Traços como AOL e EGS possuem herdabilidade moderada/alta (~0.25 a 0.40), respondendo rápido à seleção.</li>
            <li><strong>Desvio Padrão Fenotípico (σp)</strong>: A quantidade de dispersão física real que existe para aquele traço na fazenda.</li>
            <li><strong>Intervalo de Gerações (L)</strong>: A idade média dos pais quando sua progênie nasce. Dividir o progresso genético por L nos dá o <strong className="text-emerald-700">Avanço Genético Anual (ΔG/ano)</strong>. Reduzir L acelera o ganho por ano!</li>
          </ul>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2 mb-3">
              Parâmetros Populacionais
            </h3>
            
            <div>
               <label 
                 className="text-xs font-bold text-slate-700 flex justify-between cursor-help border-b border-dashed border-slate-300 pb-0.5"
                 title="Mede a proporção da variação fenotípica que é herdada (genética aditiva). Quanto maior, mais rápida é a resposta à seleção."
               >
                 <span className="flex items-center gap-1">
                   Herdabilidade (h²)
                   <HelpCircle className="w-3 h-3 text-slate-400 inline" />
                 </span>
                 <span className="text-indigo-600 font-mono">{heritability.toFixed(2)}</span>
               </label>
               <input
                 type="range" min="0.05" max="0.60" step="0.05"
                 value={heritability} onChange={e => setHeritability(Number(e.target.value))}
                 className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
               />
               <p className="text-[10px] text-slate-400 mt-1">A proporção de variação fenotípica (o que você vê) que é estritamente genética.</p>
            </div>

            <div>
               <label 
                 className="text-xs font-bold text-slate-700 flex justify-between cursor-help border-b border-dashed border-slate-300 pb-0.5"
                 title="Desvio padrão da característica física real na população. Define o nível de variação absoluta disponível para seleção."
               >
                 <span className="flex items-center gap-1">
                   Desvio Padrão Fenotípico (σp)
                   <HelpCircle className="w-3 h-3 text-slate-400 inline" />
                 </span>
                 <span className="text-indigo-600 font-mono">{phenoStdDev.toFixed(1)}</span>
               </label>
               <input
                 type="range" min="1" max="40" step="1"
                 value={phenoStdDev} onChange={e => setPhenoStdDev(Number(e.target.value))}
                 className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
               />
               <p className="text-[10px] text-slate-400 mt-1">A variação absoluta na característica dentro da população (em kg, cm, %...).</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2 mb-3">
              Decisões de Manejo (Fazenda)
            </h3>

            <div>
               <label 
                 className="text-xs font-bold text-slate-700 flex justify-between cursor-help border-b border-dashed border-slate-300 pb-0.5"
                 title="Porcentagem dos melhores animais do rebanho mantidos para reprodução. Reter uma fatia menor (ex: 5%) aumenta a superioridade genética da progênie."
               >
                 <span className="flex items-center gap-1">
                   Intensidade de Seleção (Retenção)
                   <HelpCircle className="w-3 h-3 text-slate-400 inline" />
                 </span>
                 <span className="text-rose-600 font-mono">Top {selectionProportion}%</span>
               </label>
               <input
                 type="range" min="1" max="50" step="1"
                 value={selectionProportion} onChange={e => setSelectionProportion(Number(e.target.value))}
                 className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500 mt-2"
               />
               <div className="text-[10px] bg-white border border-slate-200 rounded p-1.5 mt-2 flex gap-1.5 items-center">
                 <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                 <span className="text-slate-500">Intensidade (i) calculada: <strong className="text-slate-800">{currentI.toFixed(2)}</strong></span>
               </div>
            </div>

            <div>
               <label 
                 className="text-xs font-bold text-slate-700 flex justify-between cursor-help border-b border-dashed border-slate-300 pb-0.5"
                 title="Taxa com que a consanguinidade aumenta por geração. Recomenda-se manter abaixo de 1.0% para evitar prejuízos graves por depressão endogâmica."
               >
                 <span className="flex items-center gap-1">
                   Taxa de Endogamia p/ Geração (ΔF)
                   <HelpCircle className="w-3 h-3 text-slate-400 inline" />
                 </span>
                 <span className={`${inbreedingRate >= 1.5 ? 'text-rose-600 font-bold' : 'text-indigo-600'} font-mono`}>{inbreedingRate.toFixed(1)}%</span>
               </label>
               <input
                 type="range" min="0" max="8" step="0.2"
                 value={inbreedingRate} onChange={e => setInbreedingRate(Number(e.target.value))}
                 className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650 mt-2"
               />
               <p className="text-[10px] text-slate-400 mt-1">
                 O acúmulo de consanguinidade por geração. A FAO recomenda manter ΔF abaixo de 1.0% para mitigar depressão endogâmica.
               </p>
            </div>

             <div className="space-y-3">
                <label 
                  className="text-xs font-bold text-slate-700 flex justify-between cursor-help border-b border-dashed border-slate-300 pb-1"
                  title="Idade média dos pais no nascimento da progênie que os substituirá. Intervalos de gerações menores aceleram o ganho genético anual."
                >
                  <span className="flex items-center gap-1">
                    Intervalo de Gerações (Anos)
                    <HelpCircle className="w-3 h-3 text-slate-400 inline" />
                  </span>
                  <span className="text-rose-600 font-extrabold font-mono">{activeGenerationInterval.toFixed(2)} anos</span>
                </label>
                
                {/* Switcher Option button group */}
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIntervalSource('calculated')}
                    className={`text-[10px] font-extrabold py-1.5 px-2 rounded-md transition-all cursor-pointer ${
                      intervalSource === 'calculated'
                        ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    📊 Obter dos Dados
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntervalSource('slider')}
                    className={`text-[10px] font-extrabold py-1.5 px-2 rounded-md transition-all cursor-pointer ${
                      intervalSource === 'slider'
                        ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    🎚️ Ajustar Manual (Régua)
                  </button>
                </div>

                {intervalSource === 'calculated' ? (
                  <div className="bg-white border border-emerald-100 rounded-lg p-2.5 space-y-1.5 shadow-3xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Cálculo Automático</span>
                      <span className="text-xs font-black text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150">
                        {generationIntervalStats.average} anos
                      </span>
                    </div>
                    {generationIntervalStats.count > 0 ? (
                      <p className="text-[10px] text-slate-600 leading-relaxed">
                        Obtido a partir de <strong className="text-emerald-700">{generationIntervalStats.count}</strong> pares de ascendência (pais/mães e filhos com nascimento registrado no banco).
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        ⚠️ Sem dados suficientes de nascimento de pais e filhos. Utilizando valor de referência padrão de <strong className="text-slate-700">4.0 anos</strong>.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="range" min="2" max="8" step="0.5"
                      value={generationInterval} onChange={e => setGenerationInterval(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500 mt-1"
                    />
                    <p className="text-[10px] text-slate-400 leading-tight">Tempo médio ajustado manualmente para a renovação geracional.</p>
                  </div>
                )}
             </div>
            
            <div>
               <label 
                 className="text-xs font-bold text-slate-700 flex justify-between cursor-help border-b border-dashed border-slate-300 pb-0.5"
                 title="Número de gerações estimadas para a simulação de longo prazo."
               >
                 <span className="flex items-center gap-1">
                   Projeção no Futuro
                   <HelpCircle className="w-3 h-3 text-slate-400 inline" />
                 </span>
                 <span className="text-slate-600 font-mono">{generations} Gerações</span>
               </label>
               <input
                 type="range" min="2" max="15" step="1"
                 value={generations} onChange={e => setGenerations(Number(e.target.value))}
                 className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500 mt-2"
               />
            </div>
          </div>
        </div>

        {/* Chart and Progress Panel */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          
          {/* Chart Card */}
          <div className="bg-white rounded-xl border border-slate-100 p-6 flex-1 flex flex-col relative shadow-sm">
            <div className="absolute top-4 right-4 text-right flex flex-col sm:flex-row gap-2 justify-end">
              <div 
                className="bg-indigo-50 text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-100 text-[11px] font-semibold text-center leading-snug cursor-help"
                title="Ganho genético puro por geração calculado através da equação do criador: i * h² * σp."
              >
                <span className="text-[9px] font-bold block opacity-75 uppercase">Ganho Aditivo (ΔG) / Geração</span>
                <span className="text-sm font-black text-indigo-900">+{responsePerGen.toFixed(2)} un</span>
              </div>
              <div 
                className="bg-rose-50 text-rose-800 px-3 py-1.5 rounded-lg border border-rose-100 text-[11px] font-semibold text-center leading-snug cursor-help"
                title="Redução física estimada no desempenho decorrente de homozigose por consanguinidade (ΔF × 0.03 × σp)."
              >
                <span className="text-[9px] font-bold block opacity-75 uppercase">Perda Depos. (p/Geração de ΔF)</span>
                <span className="text-sm font-black text-rose-900">-{(inbreedingRate * depressionFactor).toFixed(2)} un</span>
              </div>
            </div>

            <div className="border-b border-slate-100 pb-3 mb-6 mt-14 sm:mt-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Retorno Fenotípico Líquido (Acumulado)
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Comparativo entre o progresso aditivo teórico e a resposta real mitigada pela depressão endogâmica.</p>
            </div>

            <div className="w-full flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulationData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="generation" 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    label={{ value: 'Avanço Acumulado (unidades)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip 
                    content={({ payload, active }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg shadow-xl text-white text-[11px] space-y-1.5 max-w-[260px]">
                            <p className="text-xs font-bold border-b border-slate-800 pb-1 text-slate-200">{data.generation}</p>
                            <p className="text-slate-400">Tempo Decorrido: ~{data.year.toFixed(1)} anos</p>
                            <div className="space-y-1 pt-1">
                              <p className="flex justify-between gap-4">
                                <span className="text-slate-400">Progresso Teórico:</span>
                                <span className="font-bold font-mono text-slate-100">+{data.idealGain} un</span>
                              </p>
                              <p className="flex justify-between gap-4">
                                <span className="text-rose-400">Consanguinidade:</span>
                                <span className="font-bold font-mono text-rose-300">F = {data.inbreeding.toFixed(1)}%</span>
                              </p>
                              <p className="flex justify-between gap-4">
                                <span className="text-rose-400">Depressão Endogâmica:</span>
                                <span className="font-bold font-mono text-rose-300">-{data.depression} un</span>
                              </p>
                              <div className="border-t border-slate-800 pt-1 mt-1 font-extrabold text-emerald-400 flex justify-between gap-4">
                                <span>Retorno Líquido Real:</span>
                                <span className="font-mono">+{data.realGain} un</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="idealGain" 
                    name="Teórico (Sem Endogamia)"
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: '#ffffff', stroke: '#94a3b8', strokeWidth: 1 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="realGain" 
                    name="Real (Com Endogamia)"
                    stroke="#4f46e5" 
                    strokeWidth={4}
                    dot={{ r: 5, fill: '#ffffff', stroke: '#4f46e5', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Custom chart legend to match styles exactly */}
            <div className="flex justify-center gap-6 text-[10px] mt-2 border-t border-slate-100 pt-2 text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 border-t border-dashed border-slate-400"></span>
                <span>Avanço Genético Teórico (Sem Endogamia)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-indigo-650 rounded"></span>
                <span>Retorno Real na Fazenda (Deduzida a Depressão Endogâmica)</span>
              </div>
            </div>
            
            <div className="mt-4 bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-2">
              <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 leading-relaxed font-normal">
                <strong>O impacto real da Endogamia:</strong> 
                <p className="mt-1">
                  Enquanto a seleção direcionada eleva o valor genético aditivo (<span className="font-bold">Teórico</span>), o acasalamento consanguíneo descontrolado reduz o desempenho físico real (<span className="font-bold">Real</span>). Isso ocorre porque a endogamia eleva a homozigose de alelos deletérios recessivos, reduzindo a eficiência metabólica, imunidade e reprodução do rebanho, processo conhecido na zootecnia como <strong>Depressão por Endogamia</strong> (Burrow, 1993).
                </p>
              </div>
            </div>

          </div>

          {/* Card: Barra de Progresso do Ganho Genético Acumulado (ΔG) */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 rounded-xl p-5 text-white shadow-md border border-slate-800 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-indigo-900/40 pb-3">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-2.5 py-0.5 rounded-full uppercase">
                  Ganho Realizado Acumulado (ΔG Total)
                </span>
                <h3 className="text-sm font-extrabold tracking-tight mt-1">
                  Evolução do Rebanho em {generations} Gerações (~{totalYears.toFixed(0)} Anos)
                </h3>
              </div>
              <div className="text-right flex flex-col sm:items-end">
                <span className="text-[9px] font-medium text-slate-400 uppercase">Eficiência Genômica Aditiva</span>
                <span className={`text-sm font-black ${efficiency > 85 ? 'text-emerald-400' : efficiency > 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {efficiency.toFixed(0)}% Utilizado
                </span>
              </div>
            </div>

            {/* Main Multi-segment Progress Bar */}
            <div className="relative mt-2 mb-10 mx-1">
              {/* Labels for baseline and milestone targets */}
              <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-2 font-mono">
                <span>REBANHO BASE (0.00 un)</span>
                <span>META ZOOTÉCNICA PROGRESSIVA (+{benchmarkGoal.toFixed(1)} un)</span>
              </div>

              {/* Progress Container Track */}
              <div className="h-6 bg-slate-800 rounded-full overflow-hidden flex relative border border-slate-700/60 shadow-inner">
                {/* Realized Genetic Gain (Active Green gradient) */}
                <div 
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-300 relative flex items-center pl-3"
                  style={{ width: `${realPct}%` }}
                >
                  {realPct > 12 && (
                    <span className="text-[10px] font-black text-white whitespace-nowrap tracking-wider">
                      +{totalRealGain.toFixed(2)} un
                    </span>
                  )}
                </div>

                {/* Lost Potential due to Inbreeding (Amber/Red Hatched bar) */}
                <div 
                  className="h-full transition-all duration-300 bg-rose-700/95 flex items-center pr-3 justify-end border-l border-rose-500/30 cursor-help"
                  style={{ 
                    width: `${lossPct}%`,
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255, 255, 255, 0.15) 4px, rgba(255, 255, 255, 0.15) 8px)' 
                  }}
                  title={`Perda acumulada por endogamia: -${totalLoss.toFixed(2)} unidades devido a ${totalInbreeding.toFixed(2)}% de consanguinidade média acumulada.`}
                >
                  {lossPct > 12 && (
                    <span className="text-[9px] font-black text-rose-100 whitespace-nowrap">
                      -{totalLoss.toFixed(2)} un (Endogamia)
                    </span>
                  )}
                </div>
              </div>

              {/* Generation Milestones Markers on the Track */}
              <div className="absolute top-10 w-full">
                {milestones.map((m, idx) => {
                  const isLast = idx === milestones.length - 1;
                  return (
                    <div 
                      key={idx}
                      className="absolute transition-all duration-300 flex flex-col items-center"
                      style={{ 
                        left: `${m.pct}%`, 
                        transform: 'translateX(-50%)',
                        zIndex: 10 + idx 
                      }}
                    >
                      {/* Interactive indicator dot */}
                      <span className={`w-2.5 h-2.5 rounded-full border ${idx === 0 ? 'bg-slate-400 border-slate-600' : isLast ? 'bg-indigo-400 border-white animate-bounce' : 'bg-emerald-400 border-emerald-950'} shadow-md`}></span>
                      <span className="text-[9px] font-bold text-slate-300 mt-1 font-mono">{m.label}</span>
                      <span className="text-[8px] font-semibold text-slate-500 font-mono">
                        +{m.gain.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details and metrics matrix */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 pt-3 border-t border-indigo-900/20">
              <div 
                className="bg-slate-900/40 p-2.5 rounded-lg border border-indigo-900/10 cursor-help"
                title="Ganho genético líquido realmente manifestado, descontada a depressão por endogamia."
              >
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Ganho Líquido Real</span>
                <span className="text-xs font-black text-emerald-400 font-mono">+{totalRealGain.toFixed(2)} un</span>
                <span className="text-[8px] text-slate-500 block mt-0.5">Resposta física corrigida</span>
              </div>
              <div 
                className="bg-slate-900/40 p-2.5 rounded-lg border border-indigo-900/10 cursor-help"
                title="A resposta à seleção teórica acumulada se não houvesse consanguinidade."
              >
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Potencial Teórico</span>
                <span className="text-xs font-black text-slate-300 font-mono">+{totalIdealGain.toFixed(2)} un</span>
                <span className="text-[8px] text-slate-500 block mt-0.5">Sem depressão endogâmica</span>
              </div>
              <div 
                className="bg-slate-900/40 p-2.5 rounded-lg border border-indigo-900/10 cursor-help"
                title="A soma da perda no desempenho devido à depressão endogâmica nas gerações."
              >
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Perda por Endogamia</span>
                <span className="text-xs font-black text-rose-400 font-mono">-{totalLoss.toFixed(2)} un</span>
                <span className="text-[8px] text-slate-500 block mt-0.5">Capacidade perdida</span>
              </div>
              <div 
                className="bg-slate-900/40 p-2.5 rounded-lg border border-indigo-900/10 cursor-help"
                title="Taxa de inbreeding (F) média projetada e acumulada ao final do período."
              >
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Consanguinidade</span>
                <span className="text-xs font-black text-amber-400 font-mono">{totalInbreeding.toFixed(1)}% F</span>
                <span className="text-[8px] text-slate-500 block mt-0.5">Acúmulo consanguíneo total</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
