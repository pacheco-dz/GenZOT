/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Award, FileCode, Radio, Database, HelpCircle, HardDrive, ShieldAlert, Globe } from 'lucide-react';

export default function ReferenceSection() {
  const [activeTab, setActiveTab2] = useState<'ref' | 'glossary' | 'manual' | 'erd'>('ref');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" id="secao-referencias">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          Acervo Científico, Validação e Tutoriais
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Documentação de referência acadêmica, scripts matemáticos de auditoria e suporte para operação em campo.
        </p>
      </div>

      {/* Introdução Detalhada sobre Coeficiente de Consanguinidade (F) */}
      <div className="bg-gradient-to-r from-amber-50/70 via-indigo-50/40 to-emerald-50/30 border border-indigo-100 rounded-xl p-5 mb-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-650" />
          <h3 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
            Documentação do Coeficiente de Consanguinidade (F) no Gen<span className="text-amber-600">ZOT</span>
          </h3>
        </div>
        
        <p className="text-xs text-gray-775 leading-relaxed">
          Apresento a documentação detalhada sobre como o Coeficiente de Consanguinidade (F) foi calculado no Gen<span className="text-amber-600 font-semibold">ZOT</span>, dividida de forma clara entre a fundamentação Científica e as diretrizes do Manual do Usuário. Ambas as seções já estão implementadas e ativas no painel de Acervo Científico, Validação e Tutoriais (Aba de Referências do applet):</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Abordagem Científica e Matemática */}
          <div className="bg-white/85 p-4 rounded-lg border border-indigo-100/80 space-y-2">
            <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
              🔬 1. Abordagem Científica e Matemática
            </span>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Na aba <strong>Fundamentos Científicos</strong>, a fundamentação teórica descreve a transição dos cálculos de pedigrees simples para algoritmos matriciais de alto desempenho:
            </p>
            <ul className="text-[10.5px] text-gray-505 space-y-2 list-none pl-0">
              <li>
                <strong>A Equação Clássica de Wright:</strong> Mede a probabilidade de um animal <span className="font-mono">X</span> herdar alelos idênticos por descendência de um ancestral comum aos seus pais:
                <div className="my-1.5 bg-slate-900 text-indigo-300 p-2 text-center rounded font-mono text-[10px] font-bold">
                  {"F(X) = Somatório de [ (1/2) elevado a (n1 + n2 + 1) * (1 + F(A)) ]"}
                </div>
                <div className="text-[10px] text-gray-400 pl-2">
                  • <span className="font-mono">A</span>: Ancestral comum presente tanto na linha paterna quanto na materna de <span className="font-mono">X</span>.<br />
                  • <span className="font-mono">n1, n2</span>: Número de gerações que separam o pai e a mãe de <span className="font-mono">X</span> do ancestral <span className="font-mono">A</span>.<br />
                  • <span className="font-mono">F(A)</span>: Coeficiente de consanguinidade do próprio ancestral comum <span className="font-mono">A</span>.
                </div>
              </li>
              <li>
                <strong>A Solução Computacional (Meuwissen & Luo, 1992):</strong> Para rebanhos comerciais com centenas de animais, o GenZOT implementa o algoritmo recursivo de Meuwissen & Luo (1992) sobre a Matriz de Parentesco Genético Aditivo (<span className="font-mono">A</span>):
                <div className="text-[10px] text-gray-400 pl-2 mt-1 space-y-1">
                  • <strong>Ordenação Topológica:</strong> O pedigree é ordenado cronologicamente para que genitores sempre precedem seus produtos na numeração da matriz.<br />
                  • <strong>Preenchimento da Diagonal (Variância Individual):</strong> <span className="font-mono font-bold text-indigo-950">A[i][i] = 1 + F(i)</span>, onde a consanguinidade é <span className="font-mono font-bold text-indigo-950">F(i) = 0.5 * A[s][d]</span> (metade do parentesco entre o pai <span className="font-mono">s</span> e mãe <span className="font-mono">d</span>). Se algum pai for desconhecido, seu respectivo índice é tratado como zero na herança de parentesco, resultando em <span className="font-mono font-bold">F(i) = 0</span>.<br />
                  • <strong>Fora da Diagonal (Covariâncias):</strong> <span className="font-mono">A[i][j] = A[j][i] = 0.5 * (A[j][s] + A[j][d])</span>.<br />
                  • <strong>Projeção no Acasalamento:</strong> A consanguinidade da futura cria é extraída instantaneamente por: <span className="font-mono font-bold text-emerald-700">F(Cria) = 0.5 * A[sire_idx][dam_idx]</span>.
                </div>
              </li>
            </ul>
          </div>

          {/* Abordagem Prática (Manual do Usuário) */}
          <div className="bg-white/85 p-4 rounded-lg border border-amber-150/80 space-y-2">
            <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
              📘 2. Abordagem Prática (Manual do Usuário)
            </span>
            <p className="text-[11px] text-gray-650 leading-relaxed">
              Na aba <strong>Manual do Usuário</strong>, o cálculo é apresentado em linguagem acessível ao produtor e técnico de campo, focando no manejo prático e na mitigação de riscos:
            </p>
            <ul className="text-[10.5px] text-gray-505 space-y-2 list-none pl-0">
              <li>
                <strong>Rastreamento de Pedigree e Animais Fundadores:</strong> O sistema analisa toda a árvore genealógica de pais, avós e bisavós cadastrados. Se algum ancestral for citado no pedigree mas não possuir uma ficha própria, o algoritmo cria silenciosamente um <em>"Macho/Fêmea Fundador"</em> com consanguinidade zero (<span className="font-mono font-bold">F=0</span>) para fechar o pedigree com consistência e segurança.
              </li>
              <li>
                <strong>Identificação de Ancestrais Comuns:</strong> O algoritmo vasculha as linhas paternas e maternas buscando o mesmo animal em ambos os lados.
              </li>
              <li>
                <strong>Classificação e Escalas de Risco de Endogamia (F):</strong>
                <div className="mt-1.5 grid grid-cols-1 gap-1 text-[10px] bg-slate-50 p-2 rounded border border-amber-100">
                  <div>🟢 <strong>Até 3,125% F — Seguro (Verde):</strong> Parentesco distante. Sem risco iminente de depressão endogâmica.</div>
                  <div>🟡 <strong>3,125% a 6,249% F — Atenção (Amarelo):</strong> Pequeno nível de parentesco (ex: primos ou meio-tios).</div>
                  <div>🔴 <strong>≥ 6,25% F — Alto Risco (Vermelho):</strong> Limite de alerta zootécnico (ex: acasalamento entre meio-irmãos gera exatamente <span className="font-mono font-bold">6,25% F</span>). Indica forte probabilidade de perda de desempenho produtivo (depressão por endogamia) e ativa os alertas visuais no aplicativo.</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-100 pb-3">
        <button
          onClick={() => setActiveTab2('ref')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'ref'
              ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200'
              : 'text-gray-600 hover:bg-gray-50 border border-transparent'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Fundamentos Científicos
        </button>
        <button
          onClick={() => setActiveTab2('glossary')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'glossary'
              ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200'
              : 'text-gray-600 hover:bg-gray-50 border border-transparent'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Glossário Genético
        </button>
        <button
          onClick={() => setActiveTab2('manual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'manual'
              ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200'
              : 'text-gray-600 hover:bg-gray-50 border border-transparent'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Manual do Usuário
        </button>
        <button
          onClick={() => setActiveTab2('erd')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'erd'
              ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200'
              : 'text-gray-600 hover:bg-gray-50 border border-transparent'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Modelo de Dados (ERD)
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'ref' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Referências Bibliográficas Homologadas</h3>
            <ul className="space-y-3 text-xs text-gray-600 leading-relaxed list-disc pl-4">
              <li>
                <strong>Mrode, R. A. (2014 / 2023).</strong> <em>Linear Models for the Prediction of Animal Breeding Values</em> (3rd/4th Edition). CABI Publishing. (Referência definitiva para estruturas de matrizes mistas e inversão direta de pedigree).
              </li>
              <li>
                <strong>Henderson, C. R. (1975).</strong> <em>Best Linear Unbiased Estimation and Prediction under a Selection Model</em>. Biometrics, 31(2), 423-447. (Apresentação formal do BLUP e das MME).
              </li>
              <li>
                <strong>Henderson, C. R. (1984).</strong> <em>Applications of Linear Models in Animal Breeding</em>. University of Guelph. (Guia matemático integral para análise estatística e variâncias genéticas).
              </li>
              <li>
                <strong>Meuwissen, T. H. E., & Luo, Z. (1992).</strong> <em>A fast algorithm for the computation of inbreeding coefficients in large populations</em>. Journal of Animal Breeding and Genetics, 109, 3-7. (Algoritmo adotado para este motor).
              </li>
              <li>
                <strong>Hazel, L. N. (1943).</strong> <em>The genetic basis for constructing selection indexes</em>. Genetics, 28(6), 476-490. (Fundamento absoluto dos pesos econômicos e índice linear).
              </li>
              <li>
                <strong>Falconer, D. S., & Mackay, T. F. C. (1996).</strong> <em>Introduction to Quantitative Genetics</em> (4th Edition). Longman. (Princípios teóricos da seleção aditiva).
              </li>
              <li>
                <strong>García-Cortés, L. A., & Toro, M. A. (2006).</strong> <em>Multiracial animal model with pedigree information</em>. Journal of Animal Breeding and Genetics. (Matrizes de parentesco adaptadas a cruzamentos e raças compostas).
              </li>
              <li>
                <strong>Burrow, H. M. (1993 / 1998).</strong> <em>The effects of inbreeding in beef cattle / warm-climate beef cattle</em>. Animal Breeding Abstracts / Livestock Production Science. (Estudo fundamental e base quantitativa de referência para perda de desempenho produtivo -0.28kg a -0.50kg por 1% F - devido à depressão endogâmica por acúmulo de homozigose).
              </li>
              <li>
                <strong>Dickerson, G. E. (1973).</strong> <em>Inbreeding and heterosis in crossbreeding</em>. Proceedings of Animal Breeding and Genetics Symposium. (Equações clássicas para retenção de heterozigose individual e materna e manifestação de vigor híbrido em rebanhos cruzados).
              </li>
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mt-4 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-205 pb-1.5 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-650" />
              Comparativo de Modelos: Animais Puros vs. Cruzados (Multirraciais)
            </h4>
            <p className="text-xs text-gray-700 leading-relaxed font-normal">
              <strong>Não, os modelos matemáticos não são iguais.</strong> Estimar a DEP de animais cruzados exige extensões matemáticas sofisticadas em relação aos modelos de raças puras (unirraciais). Abaixo estão descritos os dois modelos fundamentais operados sob o sistema de Equações de Modelos Mistos (MME) de Henderson:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2 shadow-2xs">
                <span className="font-extrabold text-xs text-emerald-800 uppercase block">1. Modelo Unirracial (Animais Puros)</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Utilizado quando o rebanho pertence a uma única raça (ex: 100% Nelore ou 100% Angus). O modelo assume uma <strong>única base genética</strong> homogênea e uniforme.
                </p>
                <div className="bg-slate-950 text-emerald-400 p-2 text-center rounded font-mono text-[11px] font-bold">
                  y = Xβ + Zu + e
                </div>
                <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                  <li><strong>y:</strong> Vetor de observações fenotípicas (pesos).</li>
                  <li><strong>β:</strong> Fatores fixos (Grupo de Contemporâneos, sexo, época).</li>
                  <li><strong>u:</strong> Efeito genético aditivo aleatório hereditário, onde <span className="font-mono">Var(u) = A · σ_a²</span>.</li>
                  <li><strong>A:</strong> Matriz clássica de parentesco com base aditiva única.</li>
                  <li><strong>e:</strong> Erro residual aleatório homogêneo.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2 shadow-2xs">
                <span className="font-extrabold text-xs text-indigo-800 uppercase block">2. Modelo Multirracial (Animais Cruzados)</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Necessário para rebanhos com graus de sangue mistos. O modelo precisa ajustar os desvios aditivos entre as raças genitoras e isolar o vigor híbrido não-aditivo (heterozigose).
                </p>
                <div className="bg-slate-950 text-indigo-400 p-2 text-center rounded font-mono text-[11px] font-bold">
                  y = Xβ + Σ(p_i · g_i) + δ · H + Zu_m + e
                </div>
                <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                  <li><strong>Σ(p_i · g_i):</strong> Covariáveis fixas de proporção racial ($p_i$) para estimar o efeito aditivo direto de cada raça ($g_i$) e evitar sobreestimar mestiços.</li>
                  <li><strong>δ · H:</strong> Efeito fixo de regressão da Heterozigose, onde $H$ é a heterozigose individual e $\delta$ é o vigor híbrido recuperado.</li>
                  <li><strong>u_m:</strong> Valor genético aleatório sobre matriz multirracial <span className="font-mono">Var(u) = A_m · σ_am²</span>.</li>
                  <li><strong>A_m / A_multirracial:</strong> Matriz ponderada de pedigrees adaptada a bases distintas e variâncias segregantes (García-Cortés & Toro, 2006).</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-150 rounded-lg p-3 text-[11px] text-indigo-900 leading-relaxed">
              <strong>Como o GenZOT resolve isso na prática:</strong> Nosso mecanismo estima dinamicamente a <strong>composição racial</strong> de cada indivíduo e calcula a <strong>Heterozigose Individual (H)</strong>. Nas MME, o sistema automaticamente insere as proporções das raças ativas como covariáveis de efeitos fixos concomitantes com os grupos contemporâneos. Isso garante que as DEPs dos animais sejam expressas isentas dos desvios de heterozigose e de superioridade de raças basais, entregando valores altamente robustos tanto para seleções puras quanto cruzadas.
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-650" />
              Estimação da Herdabilidade (h²): Valores de Referência vs. Amostragem em Campo
            </h4>
            <p className="text-xs text-gray-750 leading-relaxed">
              <strong>Como a herdabilidade é tratada neste app?</strong> O GenZOT utiliza <strong>valores de referência calibrados</strong> originários de programas de melhoramento genético nacionais e da literatura zootécnica estabelecida, ao invés de tentar calcular a herdabilidade ($h^2$) dinamicamente a partir das pesagens inseridas pelo usuário. 
            </p>
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <span className="font-extrabold text-[11px] text-indigo-900 uppercase block">Por que não calculamos a herdabilidade dinamicamente a partir dos seus dados locais?</span>
              <ul className="text-xs text-slate-600 space-y-2 list-decimal pl-4 leading-relaxed">
                <li>
                  <strong>Tamanho Amostral Requerido:</strong> Para estimar componentes de variância ($\sigma^2_a$ e $\sigma^2_e$) e consequentemente a herdabilidade ($h^2 = \sigma^2_a / (\sigma^2_a + \sigma^2_e)$) com significância estatística, são necessários registros genealógicos e pesagens de <strong>milhares de animais</strong> (frequentemente &gt; 1.000 ou 2.000 observações altamente conectadas). Tentar estimar $h^2$ em um rebanho comercial típico com dezenas ou centenas de animais geraria estimativas extremamente instáveis e biologicamente absurdas (como herdabilidades negativas ou superiores a 100%), falhando por completo.
                </li>
                <li>
                  <strong>Complexidade de Algoritmos de Variância:</strong> O cálculo dinâmico requer algoritmos de máxima verossimilhança restrita (REML) ou Amostragem de Gibbs (MCMC) rodando em múltiplos ciclos iterativos pesados matematicamente. O gold-standard da tomada de decisão em nível de fazenda reside no uso de <strong>parâmetros genéticos populacionais conhecidos e consolidados</strong>, mantendo o poder computacional focado exclusivamente na resolução precisa das Equações de Modelo Misto (MME) para achar as DEPs.
                </li>
              </ul>
            </div>
            <div className="bg-indigo-50 border border-indigo-150 rounded-lg p-3 text-[11px] text-indigo-950 leading-relaxed">
              <strong>Flexibilidade Científica (Aba Acadêmica):</strong> Embora não estime a herdabilidade a partir dos dados do usuário, o GenZOT oferece **total controle científico**. Na <strong>Aba Acadêmica</strong>, o pesquisador ou estudante pode ajustar individualmente a herdabilidade ($h^2$) de cada característica através de sliders interativos de <span className="font-mono">5% a 80%</span>. Ao arrastar o slider, o sistema calcula dinamicamente o coeficiente de regularização lambda/alpha do BLUP (<span className="font-mono">α = (1 - h²) / h²</span> na escala simplificada, ou <span className="font-mono">σ²e / σ²a</span>) e atualiza de forma síncrona o vetor de soluções das DEPs e acurácias na tela.
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-650" />
              Otimização de Acasalamento Planejado: Penalização de Consanguinidade (Lambda - λ) e Complementaridade
            </h4>
            <p className="text-xs text-gray-750 leading-relaxed">
              O módulo de <strong>Acasalamento Planejado</strong> do GenZOT opera uma função de seleção multiobjetivo para identificar o reprodutor ideal para cada matriz ou lote. O índice de recomendação unificado equilibra o ganho genético aditivo (pesos econômicos do preset) com o controle de perdas por depressão endogâmica.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2 shadow-2xs">
                <span className="font-extrabold text-xs text-indigo-850 uppercase block">1. A Equação do Índice de Acasalamento (λ)</span>
                <p className="text-xs text-gray-650 leading-relaxed">
                  Para cada touro candidato, o sistema projeta o rendimento genético do bezerro e desconta o prejuízo por parentesco próximo:
                </p>
                <div className="bg-slate-950 text-indigo-400 p-2 text-center rounded font-mono text-[11px] font-bold">
                  Índice = Mérito_Aditivo(DEP_Cria) - λ · F_Cria
                </div>
                <p className="text-[11px] text-gray-505 leading-normal">
                  Onde <strong>F_Cria</strong> é o Coeficiente de Endogamia projetado da cria (estimado pelo algoritmo de Meuwissen & Luo, 1992) e <strong>λ (Lambda)</strong> é o peso de aversão ao risco definido pelo produtor (0 a 200).
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2 shadow-2xs">
                <span className="font-extrabold text-xs text-indigo-855 uppercase block">2. Complementaridade de Características</span>
                <p className="text-xs text-gray-655 leading-relaxed">
                  Além do controle de consanguinidade, o acasalamento foca na <strong>correção de progênie</strong>. Características desfavoráveis na matriz (DEPs negativas ou baixas) são compensadas recomendando touros excepcionalmente fortes nessa mesma característica.
                </p>
                <p className="text-[11px] text-gray-510 leading-normal">
                  Isso resulta em um gráfico de radar onde a curva de progênie (cria projetada) tende a ser mais equilibrada e próxima do topo em todas as dimensões, reduzindo a variabilidade do lote.
                </p>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-150 rounded-lg p-3 text-[11px] text-indigo-950 leading-relaxed">
              <strong>Como interpretar o valor de Lambda (λ):</strong>
              <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-705">
                <li><strong>λ = 0:</strong> Desativa por completo a penalidade de parentesco. O sistema recomenda touros ótimos geneticamente, mesmo que sejam pais ou irmãos da matriz (F_Cria elevado), ignorando o risco de homozigose deletéria.</li>
                <li><strong>λ de 10 a 50 (Leve):</strong> Prioriza o ganho de características extremas, admitindo pequenos cruzamentos consanguíneos se o mérito genético do pai for avassalador.</li>
                <li><strong>λ de 60 a 120 (Moderado / Padrão):</strong> O equilíbrio ideal para rebanhos comerciais. Penaliza severamente touros com parentesco próximo (ex: ao cruzar meio-irmãos com F=6.25%, o touro perde 5 pontos de índice para λ = 80), forçando o algoritmo a saltar para o próximo reprodutor sem parentesco.</li>
                <li><strong>λ de 130 a 200 (Extremo / Restritivo):</strong> Foco absoluto na sanidade de rebanho. Praticamente proíbe qualquer acasalamento com o menor sinal de parentesco, escolhendo animais menos aparentados mesmo com DEPs inferiores.</li>
              </ul>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-150 rounded-lg p-5 space-y-4">
              <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider border-b border-indigo-200 pb-1.5 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-650" />
                Cálculo Científico e Matemático do Coeficiente de Consanguinidade (F)
              </h4>
              <p className="text-xs text-gray-700 leading-relaxed">
                O Coeficiente de Consanguinidade de Wright (<span className="font-mono">F</span>) mede a probabilidade de um indivíduo herdar, em um determinado loco gênico, dois alelos idênticos por descendência de um ancestral comum aos seus pais.
              </p>
              <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3 shadow-2xs">
                <span className="font-extrabold text-xs text-indigo-900 uppercase block">1. A Equação Clássica de Wright</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  A formulação matemática clássica proposta por Sewall Wright para o cálculo do coeficiente de consanguinidade de um indivíduo <span className="font-mono">X</span> é expressa de forma fluida por:
                </p>
                <div className="bg-slate-950 text-indigo-400 p-3 text-center rounded font-mono text-[11px] font-bold leading-relaxed">
                  {"F(X) = Somatório de [ (1/2) elevado a (n1 + n2 + 1) * (1 + F(A)) ]"}
                </div>
                <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                  <li><strong>A:</strong> Ancestral comum que aparece tanto no pedigree do pai quanto no da mãe de <span className="font-mono">X</span>.</li>
                  <li><strong>n1:</strong> Número de gerações na linha paterna que separam o pai de <span className="font-mono">X</span> do ancestral comum <span className="font-mono">A</span>.</li>
                  <li><strong>n2:</strong> Número de gerações na linha materna que separam a mãe de <span className="font-mono">X</span> do ancestral comum <span className="font-mono">A</span>.</li>
                  <li><strong>F_A:</strong> Coeficiente de consanguinidade do próprio ancestral comum <span className="font-mono">A</span>.</li>
                </ul>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3 shadow-2xs">
                <span className="font-extrabold text-xs text-indigo-900 uppercase block">2. A Abordagem Matricial Eficiente (Meuwissen & Luo, 1992)</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Para grandes populações de rebanho comercial, calcular os caminhos de pedigree manualmente é inviável. O GenZOT implementa o algoritmo de <strong>Meuwissen & Luo (1992)</strong> baseado na decomposição da Matriz de Parentesco Genético Aditivo (<span className="font-mono">A</span>), que segue as seguintes etapas:
                </p>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4 leading-relaxed">
                  <li>
                    <strong>Ordenação Topológica:</strong> O pedigree é fechado e ordenado cronologicamente (<span className="font-mono">buildClosedSortedPedigree</span>), de modo que os pais sempre precedem seus filhos na indexação da matriz.
                  </li>
                  <li>
                    <strong>Cálculo Recursivo da Matriz A:</strong> Para cada animal <span className="font-mono">i</span>, com pai indexado em <span className="font-mono">s</span> e mãe indexada em <span className="font-mono">d</span>, os elementos da matriz são calculados recursivamente:
                    <div className="my-2 bg-slate-50 p-2.5 rounded-lg border border-gray-150 font-mono text-[10px] text-indigo-900 space-y-1">
                      <div>• Elemento Diagonal (Variância Aditiva Individual):</div>
                      <div className="pl-4 font-bold text-slate-900">{"A[i][i] = 1 + F(i)"}</div>
                      <div className="pl-4 text-gray-500 font-sans">• Onde o Coeficiente de Consanguinidade individual é: <span className="font-mono font-bold text-indigo-950">{"F(i) = 0.5 * A[s][d]"}</span> (metade do parentesco aditivo entre o pai e a mãe). Se algum pai for desconhecido, seu respectivo índice é tratado como zero na herança de parentesco, resultando em <span className="font-mono">F(i) = 0</span>.</div>
                      <div className="mt-2">• Elementos Fora da Diagonal (Covariâncias de Parentesco entre indivíduos i e j para j &lt; i):</div>
                      <div className="pl-4 font-bold text-slate-900">{"A[i][j] = A[j][i] = 0.5 * (A[j][s] + A[j][d])"}</div>
                    </div>
                  </li>
                  <li>
                    <strong>Acasalamento Planejado e Projeção da Cria:</strong> Ao simular um acasalamento entre um touro candidato <span className="font-mono">sire</span> (índice <span className="font-mono">sire_idx</span>) e uma matriz <span className="font-mono">dam</span> (índice <span className="font-mono">dam_idx</span>), a consanguinidade projetada da progênie é dada diretamente por:
                    <div className="my-2 bg-slate-950 text-emerald-400 p-2 text-center rounded font-mono text-[11px] font-bold">
                      {"F(Cria) = 0.5 * A[sire_idx][dam_idx]"}
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            <div className="bg-white border border-slate-150 rounded-lg p-4 space-y-2 mt-3.5">
              <span className="font-extrabold text-xs text-indigo-900 uppercase block">📚 Publicações Científicas Utilizadas no Acasalamento Dirigido</span>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                As decisões recomendadas pelo algoritmo de acasalamento dirigido do GenZOT são fundamentadas cientificamente nas seguintes publicações acadêmicas homologadas:
              </p>
              <ul className="text-[11px] text-gray-600 space-y-2 list-decimal pl-4 leading-relaxed">
                <li>
                  <strong>Meuwissen, T. H. E., & Luo, Z. (1992).</strong> <em>A fast algorithm for the computation of inbreeding coefficients in large populations.</em> Journal of Animal Breeding and Genetics, 109, 3-7. <span className="text-slate-400 font-normal">(Base matemática do algoritmo recursivo que calcula instantaneamente o coeficiente de consanguinidade projetado (<span className="font-mono">F(Cria)</span>) para prevenir riscos biológicos de homozigose).</span>
                </li>
                <li>
                  <strong>Burrow, H. M. (1993).</strong> <em>The effects of inbreeding in beef cattle.</em> Animal Breeding Abstracts, 61(11), 737-753. <span className="text-slate-400 font-normal">(Estudo fundamental usado para parametrizar a taxa de depressão por endogamia e quantificar a perda de desempenho fenotípico produtivo do lote, justificando a penalização do índice via multiplicador <span className="font-mono">Lambda (λ)</span>).</span>
                </li>
                <li>
                  <strong>Kinghorn, B. P. (2011).</strong> <em>An algorithm for mate selection in breeding programs.</em> Journal of Animal Breeding and Genetics, 128(6), 423-433. <span className="text-slate-400 font-normal">(Definição do framework de seleção multiobjetivo de acasalamentos — &quot;Mate Selection&quot; —, integrando simultaneamente o mérito genético aditivo, a complementaridade das DEPs e o controle de consanguinidade na recomendação automatizada).</span>
                </li>
                <li>
                  <strong>Dickerson, G. E. (1973).</strong> <em>Inbreeding and heterosis in crossbreeding.</em> Proceedings of Animal Breeding and Genetics Symposium. <span className="text-slate-400 font-normal">(Fornece as diretrizes teóricas para a complementaridade e compensação de características, minimizando os extremos desfavoráveis no perfil projetado da cria).</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 text-amber-950 text-xs">
            <h4 className="text-xs font-bold flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-amber-800" /> Nota sobre Evolução Genômica (Single-Step GBLUP)
            </h4>
            <p className="text-xs leading-relaxed">
              O design deste sistema foi modelado para receber a substituição da inversa da matriz A pela matriz conjunta inversa H. Em rebanhos comerciais, as equações mantêm sua integridade física mudando apenas a regularização do parentesco com marcadores SNP, unindo parentesco genômico G e pedigree numérico tradicional A.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'glossary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
            <h4 className="text-xs font-bold text-indigo-900 font-mono">BLUP (Best Linear Unbiased Prediction)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Melhor Predição Linear Isenta de Vício. É o gold-standard estatístico criado por C.R. Henderson que separa os fatores de ambiente físico dos valores aditivos hereditários.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
            <h4 className="text-xs font-bold text-indigo-900 font-mono">DEP (Diferença Esperada na Progênie)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Metade do valor genético total estimado (EBV). Representa o ganho médio esperado transmitido diretamente à próxima geração do rebanho comercial sob condições equivalentes.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
            <h4 className="text-xs font-bold text-indigo-900 font-mono">Coeficiente de Consanguinidade (F)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Probabilidade de um indivíduo herdar dois genes idênticos de um ancestral comum em ambos os lados do pedigree. Alertas visuais atuam em F ≥ 6.25% para evitar depressão por endogamia.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
            <h4 className="text-xs font-bold text-indigo-900 font-mono">Acurácia (ACC)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Fidedignidade do valor genético estimado. Calculada analiticamente a partir do erro padrão de predição (PEV) extraído dos coeficientes inversos das MME.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
            <h4 className="text-xs font-bold text-indigo-900 font-mono">Grupo de Contemporâneos (GC)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Classificação que agrupa indivíduos da mesma fazenda, ano, época climática e classe alimentar. É vital para isolar variações nutricionais e focar puramente no genótipo.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
            <h4 className="text-xs font-bold text-indigo-900 font-mono">Matriz de Parentesco Numérico (A)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Matriz simétrica contendo os graus de parentesco e consanguinidade de todos os animais. Sua inversa modela as covariâncias aditivas nas equações de modelo misto.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
            <h4 className="text-xs font-bold text-indigo-900 font-mono">Heterozigose Individual (H)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Fração de locos gênicos que contêm dois alelos distintos. É máxima na primeira geração (F1) de um cruzamento entre raças puras distintas, estimulando o vigor híbrido (heterozigose) e sendo degradada à medida que a consanguinidade (homozigose) aumenta.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
            <h4 className="text-xs font-bold text-indigo-900 font-mono">gDEP (Diferença Esperada na Progênie Genômica)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Termo em português. É a DEP (Diferença Esperada na Progênie) tradicional ajustada e enriquecida através da inclusão de marcadores moleculares de DNA (SNPs) via matriz de parentesco genômica H. Eleva consideravelmente a acurácia de animais jovens antes mesmo de terem progênie medida em campo.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
            <h4 className="text-xs font-bold text-indigo-900 font-mono">gEPD (Genomic Expected Progeny Difference)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Sigla de padrão internacional em inglês para <em>Genomic Expected Progeny Difference</em>. Representa exatamente o mesmo conceito científico e estatístico que a <strong>gDEP</strong>, sendo a nomenclatura preferencialmente adotada em sumários internacionais e em publicações científicas estrangeiras.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
            <h4 className="text-xs font-bold text-indigo-900 font-mono">Depressão por Endogamia</h4>
            <p className="text-xs text-gray-600 mt-1">
              Redução na performance fenotípica (especialmente vigor, sobrevivência e características de crescimento) resultante do aumento de homozigose por acasalamentos consanguíneos. Burrow (1993) quantificou perdas médias de -0.28kg a -0.50kg por 1% F na desmama e sobreano de bovinos.
            </p>
          </div>
        </div>
      )}
      {activeTab === 'manual' && (
        <div className="space-y-4">
          <div className="prose prose-sm text-xs text-gray-600 leading-relaxed bg-white rounded-lg border border-gray-100 p-5 space-y-4">
            <div>
              <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Estruturação de Pesagens na Prática:
              </h4>
              <ol className="list-decimal pl-4 space-y-2 mt-2">
                <li>
                  <strong>Nivelamento de Idades:</strong> Ao coletar Peso ao Desmame, os pesos individuais são ajustados linearmente para a idade padrão de <strong>205 dias</strong>, descontando a variação de datas de parto.
                </li>
                <li>
                  <strong>Análise EPMUR Visual:</strong> É vital que os escores de musculatura e estrutura racial sejam avaliados pelo mesmo técnico no mesmo dia para evitar variação subjetiva entre avaliadores nos Grupos de Contemporâneos.
                </li>
                <li>
                  <strong>Validação do Pedigree:</strong> Antes do acasalamento planejado, verifique se todos os reprodutores de interesse estão listados no banco de dados para evitar projeção incorreta do Coeficiente F de endogamia.
                </li>
              </ol>
            </div>

            <div className="pt-2">
              <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-rose-600" />
                Critério de &quot;Descarte (Bottom 20%)&quot;:
              </h4>
              <p className="mt-2 text-xs text-gray-700 leading-relaxed">
                O critério de Descarte (Bottom 20%) do GenZOT funciona da seguinte forma:
              </p>
              <ul className="list-disc pl-4 space-y-2 mt-2 text-xs text-gray-600 leading-relaxed">
                <li>
                  <strong>Ordenação pelo Índice:</strong> Todos os animais ativos do lote são classificados e ordenados de forma decrescente utilizando o Índice de Seleção Bioeconômico personalizado (que pondera as DEPs de Peso ao Desmame, Peso ao Sobreano, PE, AOL e EGS conforme os pesos ajustados).
                </li>
                <li>
                  <strong>Identificação do Percentil:</strong> Os animais que caem no percentil inferior (os 20% piores desempenhos) são automaticamente sinalizados em vermelho como Descarte.
                </li>
                <li>
                  <strong>Justificativa Zootécnica:</strong> O descarte sistemático desses indivíduos impede a transmissão de DEPs desfavoráveis para as próximas gerações, otimiza os recursos alimentares/manutenção da propriedade e acelera o progresso genético médio (ΔG) do rebanho comercial ao manter apenas a fração mais eficiente do plantel.
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" />
                Capacidade de Cadastro e Análise de Animais:
              </h4>
              <p className="mt-2 text-xs text-gray-700 leading-relaxed">
                A capacidade total de animais que o sistema pode gerenciar é otimizada para o armazenamento e processamento local de alto desempenho:
              </p>
              <div className="mt-3 space-y-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <strong className="text-slate-950 block font-semibold mb-1">📱 Armazenamento Local (LocalStorage):</strong>
                  <ul className="space-y-1.5 list-disc pl-4 text-xs text-gray-600 leading-relaxed">
                    <li><strong>Capacidade:</strong> Comporta entre <strong>10.000 e 25.000 animais</strong> de forma perfeitamente fluida.</li>
                    <li><strong>Como funciona:</strong> Os dados são salvos diretamente no cache seguro do navegador. Como o registro individual de cada animal é altamente otimizado (pesando em média apenas 300 bytes, mesmo incluindo genealogia completa, composições raciais e fenótipos), o sistema utiliza de maneira extremamente eficiente os limites padrões de armazenamento local dos navegadores modernos.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Guia Prático do Acasalamento Planejado (Parentesco, Lambda e Complementaridade):
              </h4>
              <p className="mt-2 text-xs text-gray-750">
                O planejamento de acasalamento do GenZOT foi feito para ajudar a escolher o touro certo para a vaca certa, protegendo seu rebanho contra a consanguinidade (relação de parentesco perigosa) e buscando bezerros superiores e equilibrados. Entenda abaixo como usar os controles com precisão matemática simplificada para a linguagem do campo:
              </p>
              
              <div className="mt-3 space-y-4 text-xs text-gray-700">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-205">
                  <strong className="text-indigo-900 block font-semibold mb-1">⚖️ Como usar o controle "Evitar Parentesco Próximo (Lambda)" de 0 a 200?</strong>
                  <p className="mb-2 leading-relaxed">
                    Não queremos cruzar animais que são parentes próximos porque a cria de parentes nasce fraca, com menor crescimento, menor fertilidade e baixa imunidade (depressão por endogamia). No sistema, a barra de "Evitar Parentesco" (Lambda) define o tamanho do desconto para touros parentes. Veja como ajustar:
                  </p>
                  <ul className="space-y-2 list-disc pl-4 leading-relaxed">
                    <li>
                      <strong>Definido em 0 (Desativado):</strong> O sistema vai ignorar quem é parente de quem. Ele trará os melhores touros baseados apenas nas DEPs (habilidade genética), mesmo se o touro for pai ou irmão da vaca. Use apenas se não tiver nenhuma preocupação com consanguinidade.
                    </li>
                    <li>
                      <strong>Definido entre 10 e 50 (Leve):</strong> Você prefere ir atrás de bezerros com genética "campeã absoluta" e aceita correr um risco pequeno de ter animais aparentados no cruzamento. O desconto de parentesco é mínimo.
                    </li>
                    <li>
                      <strong>Definido entre 60 e 120 (Equilíbrio Recomendado pelo GenZOT):</strong> É o ajuste perfeito para a fazenda. O sistema busca touros excelentes para produção de carne, mas aplica um desconto pesado e "rebaixa" da recomendação qualquer touro que tenha parentesco perigoso com a vaca (como meio-irmãos). Evita acidentes sem perder ganho genético.
                    </li>
                    <li>
                      <strong>Definido entre 130 e 200 (Segurança Rigorosa):</strong> Tolerância mínima para parentesco. O programa prefere recomendar um touro com menor qualidade genética (DEP) do que deixar ocorrer qualquer cruzamento de parentes. Recomendado para preservação de linhas puras ou controle ultra-rigoroso.
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-205">
                  <strong className="text-indigo-900 block font-semibold mb-1">🛡️ O que é o "Bloqueio Duro de Endogamia (F%)"?</strong>
                  <p className="leading-relaxed">
                    É a sua barreira física no curral. Enquanto a barra anterior (Lambda) dá "descontos" na nota do touro, o bloqueio duro é eliminatório. Se você ajustar em <span className="font-bold">6.25%</span> (limite de alerta zootécnico) e o acasalamento projetado cruzar por exemplo meio-irmãos (que dá exatamente 6.25% de consanguinidade), aquele touro será <strong>descartado sumariamente</strong> da lista de recomendação para aquela vaca, independentemente de quão perfeitas são as suas DEPs.
                  </p>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-lg border border-amber-200">
                  <strong className="text-amber-950 block font-semibold mb-1.5 flex items-center gap-1.5">
                    🧬 Como é Calculada a Consanguinidade (Endogamia) no Aplicativo?
                  </strong>
                  <p className="leading-relaxed mb-3">
                    A consanguinidade mede o parentesco genético entre o pai e a mãe de um bezerro para calcular o risco dele herdar genes iguais e defeituosos dos seus ancestrais comuns. Veja o passo a passo simplificado de como o sistema faz esse cálculo na prática:
                  </p>
                  <ul className="space-y-3.5 list-none pl-0">
                    <li className="flex items-start gap-2 text-gray-750">
                      <span className="bg-amber-100 text-amber-800 rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                      <div>
                        <strong>Rastreamento de Pedigree Completo:</strong> O sistema analisa toda a genealogia inserida para o touro e a vaca (pais, avós, bisavós). Caso um ancestral seja citado no pedigree mas não possua uma ficha cadastrada, o sistema cria automaticamente um <em>"Animal Fundador"</em> com consanguinidade zero para fechar a genealogia e garantir a precisão matemática.
                      </div>
                    </li>
                    <li className="flex items-start gap-2 text-gray-750">
                      <span className="bg-amber-100 text-amber-800 rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                      <div>
                        <strong>Identificação do Ancestral Comum:</strong> O sistema localiza indivíduos que aparecem simultaneamente na árvore genealógica do pai e da mãe. São as fontes de endogamia.
                      </div>
                    </li>
                    <li className="flex items-start gap-2 text-gray-750">
                      <span className="bg-amber-100 text-amber-800 rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                      <div>
                        <strong>Cálculo do Coeficiente F (Grau de Consanguinidade):</strong> A consanguinidade projetada da cria equivale a <strong>metade da relação de parentesco</strong> entre o touro e a fêmea. O sistema calcula a probabilidade matemática exata com base em referências clássicas (Wright) e modernas (Meuwissen & Luo, 1992):
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10.5px] bg-white p-2.5 rounded-md border border-amber-100/60">
                          <div>
                            <span className="font-semibold text-amber-900 block">Exemplo Clássico:</span>
                            • <strong>Pai e Filha:</strong> 25,00% F<br />
                            • <strong>Irmãos Inteiros:</strong> 25,00% F<br />
                            • <strong>Meio-Irmãos:</strong> 6,25% F (Alerta)
                          </div>
                          <div>
                            <span className="font-semibold text-amber-900 block">Classificação de Risco:</span>
                            • <strong>Até 3,125% F:</strong> Seguro (Verde)<br />
                            • <strong>3,125% a 6,249% F:</strong> Atenção (Amarelo)<br />
                            • <strong>6,25% F ou mais:</strong> Alto Risco (Vermelho)
                          </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-205">
                  <strong className="text-indigo-900 block font-semibold mb-1">🎯 O que é Complementaridade e Perfil da Cria?</strong>
                  <p className="leading-relaxed">
                    Complementaridade é o termo técnico para "corrigir os defeitos da vaca usando o touro certo". Se uma vaca possui ótimas qualidades para fertilidade mas é um pouco leve (baixa DEP de Peso ao Desmame), o sistema busca um touro excelente em Peso ao Desmame para cobri-la. 
                  </p>
                  <p className="mt-1 leading-relaxed">
                    O gráfico radar ilustrativo mostra isso de forma visual: a linha cinza pontilhada representa a vaca, a azul representa o touro e a **linha verde preenchida** representa como nascerá o produto desse acasalamento. O objetivo de um acasalamento perfeito é fazer a linha verde ser o mais larga e equilibrada possível, aproveitando o vigor híbrido da progênie.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-205">
                  <strong className="text-indigo-900 block font-semibold mb-1">📚 Publicações Científicas de Suporte Utilizadas no Acasalamento:</strong>
                  <p className="mb-2 leading-relaxed">
                    O motor por trás deste assistente de acasalamentos é construído de acordo com teses e publicações zootécnicas consolidadas mundialmente:
                  </p>
                  <ul className="space-y-2 list-disc pl-4 leading-relaxed">
                    <li>
                      <strong>Algoritmo de Consanguinidade (Meuwissen & Luo, 1992):</strong> Utilizado para calcular o parentesco recursivo de forma extremamente rápida. Evita que o produtor faça cruzamentos fechados por acidente.
                    </li>
                    <li>
                      <strong>Depressão por Endogamia em Gado de Corte (Burrow, 1993):</strong> Fornece a base de dados reais de perda de peso de desmama (-0.28kg a -0.50kg por cada 1% de aumento no coeficiente F de consanguinidade), servindo de baliza matemática para os alertas e para o cálculo de prejuízo financeiro estimado.
                    </li>
                    <li>
                      <strong>Framework de Seleção de Acasalamentos (Kinghorn, 2011):</strong> Modela a seleção multiobjetivo (&quot;Mate Selection&quot;), garantindo que o touro ideal equilibre as qualidades aditivas, compense fraquezas individuais da matriz e respeite o limite de parentesco imposto.
                    </li>
                    <li>
                      <strong>Compensação e Vigor Híbrido (Dickerson, 1973):</strong> Fundamenta a simulação de complementaridade de características, compensando escores baixos da matriz com pontos fortes do reprodutor.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Herdabilidade (h²): Valores de Referência vs. Amostragem em Campo
              </h4>
              <div className="space-y-2 mt-2">
                <p>
                  <strong>Este aplicativo calcula a herdabilidade ou utilizador de valores fixos?</strong>
                </p>
                <p>
                  O GenZOT utiliza <strong>valores de referência calibrados e consolidados</strong> como padrão para as espécies bovina e ovina. Estes parâmetros representam as médias observadas na população zootécnica nacional (como as diretrizes PMGZ, Geneplus, Promebo, etc.).
                </p>
                <p>
                  <strong>Por que não estimamos a herdabilidade diretamente nas pesagens inseridas?</strong>
                </p>
                <p>
                  Estimar herdabilidade a partir do zero em uma fazenda requer um volume amostral imenso (geralmente mais de mil animais pesados com genealogias completas de pais e mães correlacionados ao longo de gerações). Em rebanhos de produtores de porte típico, tentar calcular a herdabilidade de forma autônoma levaria a sérios problemas matemáticos (valores irrealistas, negativos ou acima de 1), inviabilizando o cálculo estável das DEPs pelo BLUP.
                </p>
                <div className="bg-indigo-50 border border-indigo-150 rounded-lg p-3 text-[11px] text-indigo-950 mt-3 leading-relaxed">
                  <strong>Customização Flexível (Aba Acadêmica):</strong> Se você for um pesquisador ou possuir coeficientes específicos recomendados para o seu rebanho/região, você pode alterá-los livremente! Mude o modo de visão para a <strong>Aba Acadêmica/Científica</strong>. Nela, o usuário tem acesso a barras deslizantes (sliders) para ajustar individualmente a herdabilidade ($h^2$) de cada característica de <span className="font-mono">5% a 80%</span>. O sistema calcula dinamicamente o coeficiente de regularização do BLUP e reaplica o cálculo de todas as estimativas na hora.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'erd' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-50 border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">
              Arquitetura de Banco de Dados Relacional (ERD) - Hambito Agropecuário
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Este esquema descreve as tabelas físicas para suportar genealogias dinâmicas com cruzamentos e coletas históricas de fenótipos. A integridade referencial garante herança aditiva legítima por chaves recorrentes de filiação.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[10px]">
              
              {/* Tabela Animal */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-2xs">
                <span className="font-bold text-indigo-900 block border-b border-indigo-150 pb-1 mb-1.5 uppercase text-center text-[10px]">
                  animal (Ficha Cadastro)
                </span>
                <ul className="space-y-1.5 text-gray-700">
                  <li>🔑 <strong className="text-indigo-950">id</strong> : VARCHAR(50) [PK]</li>
                  <li>📝 <strong>nome</strong> : VARCHAR(100)</li>
                  <li>🧬 <strong>especie</strong> : VARCHAR(20) [&apos;bovino&apos;]</li>
                  <li>⚧ <strong>sexo</strong> : CHAR(1) [&apos;M&apos;,&apos;F&apos;]</li>
                  <li>📅 <strong>data_nascimento</strong> : DATE</li>
                  <li>🏹 <strong>pai_id</strong> : VARCHAR(50) [FK -&gt; animal.id]</li>
                  <li>🏹 <strong>mae_id</strong> : VARCHAR(50) [FK -&gt; animal.id]</li>
                  <li>🏠 <strong>rebanho</strong> : VARCHAR(100)</li>
                  <li>🍲 <strong>manejo</strong> : VARCHAR(50)</li>
                </ul>
              </div>

              {/* Tabela Composicao Racial */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-2xs">
                <span className="font-bold text-indigo-900 block border-b border-indigo-150 pb-1 mb-1.5 uppercase text-center text-[10px]">
                  composicao_racial (Múltiplas Raças)
                </span>
                <ul className="space-y-1.5 text-gray-700">
                  <li>🔑 <strong className="text-indigo-950">animal_id</strong> : VARCHAR(50) [PK/FK]</li>
                  <li>🔑 <strong className="text-indigo-950">raca</strong> : VARCHAR(50) [PK]</li>
                  <li>📊 <strong>proporcao</strong> : DECIMAL(5,4) [0.0 a 1.0]</li>
                </ul>
                <div className="text-[8px] text-gray-400 mt-2 italic leading-tight">
                  * Permite animais puros (100% Nelore) ou compostos (75% Angus + 25% Nelore).
                </div>
              </div>

              {/* Tabela Coleta Fenotipica */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-2xs">
                <span className="font-bold text-indigo-900 block border-b border-indigo-150 pb-1 mb-1.5 uppercase text-center text-[10px]">
                  coleta_fenotipica (Historico)
                </span>
                <ul className="space-y-1 text-gray-700">
                  <li>🔑 <strong className="text-indigo-950">id</strong> : INT [PK, AUTO_INC]</li>
                  <li>🔑 <strong className="text-indigo-950">animal_id</strong> : VARCHAR(50) [FK -&gt; animal.id]</li>
                  <li>📅 <strong>data_cadastro</strong> : TIMESTAMP</li>
                  <li>⚖️ <strong>peso_nascimento</strong> : DECIMAL(5,2) [kg]</li>
                  <li>⚖️ <strong>peso_desmame</strong> : DECIMAL(5,2) [kg]</li>
                  <li>⚖️ <strong>peso_sobreano</strong> : DECIMAL(5,2) [kg]</li>
                  <li>📐 <strong>pe</strong> : DECIMAL(4,1) [cm]</li>
                  <li>🥩 <strong>aol</strong> : DECIMAL(4,1) [cm²]</li>
                  <li>🥓 <strong>egs</strong> : DECIMAL(3,1) [mm]</li>
                  <li>📋 <strong>escore_muscular</strong> : VARCHAR(20)</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
