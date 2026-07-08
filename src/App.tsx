/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Animal, GeneticParameters, SelectionIndexConfig, Species } from './types';
import { initialAnimals, defaultGeneticParameters, defaultSelectionIndexConfig } from './utils/dummyData';
import { solveBLUP, computeRelationshipMatrix, buildClosedSortedPedigree, computeHeterozygosity } from './utils/math';

// Modular Components Imports
import ProducerView from './components/ProducerView';
import AcademicView from './components/AcademicView';
import DataSection from './components/DataSection';
import MatingWizard from './components/MatingWizard';
import ReferenceSection from './components/ReferenceSection';
import GeneticSimulator from './components/GeneticSimulator';
import SettingsSection from './components/SettingsSection';
import ReportModal from './components/ReportModal';

import logoUrl from './assets/images/genecorte_bovino_logo_v2_1782841611872.jpg';
import LoginScreen from './components/LoginScreen';

import { Sprout, LayoutDashboard, Settings, UserCheck, BookOpen, Layers, ShieldCheck, TrendingUp, HelpCircle, LogOut, Sliders, FileText, Dna } from 'lucide-react';

export default function App() {
  const loadState = <T,>(key: string, defaultVal: T): T => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  // Auth gate State
  const [authMode, setAuthMode] = useState<'demo' | null>(() => {
    try {
      const stored = localStorage.getItem('geno_auth_mode');
      return (stored as 'demo' | null) || null;
    } catch {
      return null;
    }
  });

  // App-level state
  const [animals, setAnimals] = useState<Animal[]>(() => loadState('geno_animals', initialAnimals));

  const [geneticParams, setGeneticParams] = useState<GeneticParameters>(() => loadState('geno_params', defaultGeneticParameters));
  const [indexConfig, setIndexConfig] = useState<SelectionIndexConfig>(() => loadState('geno_index', defaultSelectionIndexConfig));
  
  useEffect(() => {
    localStorage.setItem('geno_animals', JSON.stringify(animals));
  }, [animals]);

  useEffect(() => {
    localStorage.setItem('geno_params', JSON.stringify(geneticParams));
  }, [geneticParams]);

  useEffect(() => {
    localStorage.setItem('geno_index', JSON.stringify(indexConfig));
  }, [indexConfig]);

  useEffect(() => {
    if (authMode) {
      localStorage.setItem('geno_auth_mode', authMode);
    } else {
      localStorage.removeItem('geno_auth_mode');
    }
  }, [authMode]);

  // Dual-mode visualization setting
  const [viewMode, setViewMode] = useState<'producer' | 'academic'>('producer');
  
  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'mating' | 'simulator' | 'references' | 'settings'>('dashboard');

  // Automatically reset forbidden tabs in producer mode
  useEffect(() => {
    if (viewMode === 'producer' && (activeTab === 'simulator' || activeTab === 'references')) {
      setActiveTab('dashboard');
    }
  }, [viewMode, activeTab]);

  // Global keyboard shortcuts hook for quick tab switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in form fields or editable areas
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName;
        if (
          tagName === 'INPUT' || 
          tagName === 'TEXTAREA' || 
          tagName === 'SELECT' || 
          (activeEl as HTMLElement).isContentEditable
        ) {
          return;
        }
      }

      // Map '1' to Records, '2' to Dashboard, '3' to Mating, and so on.
      switch (e.key) {
        case '1':
          setActiveTab('records');
          break;
        case '2':
          setActiveTab('dashboard');
          break;
        case '3':
          setActiveTab('mating');
          break;
        case '4':
          if (viewMode === 'academic') {
            setActiveTab('simulator');
          }
          break;
        case '5':
          if (viewMode === 'academic') {
            setActiveTab('references');
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewMode]);

  // Active global species state
  const [selectedSpecies, setSelectedSpecies] = useState<Species>('bovino');

  // Report Modal state
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Automatic Backup execution check on animal database change
  useEffect(() => {
    try {
      const freq = localStorage.getItem('geno_backup_freq');
      if (freq && freq !== 'off') {
        const days = parseInt(freq);
        if (!isNaN(days) && days > 0) {
          const lastTsStr = localStorage.getItem('geno_last_backup_ts');
          const lastTs = lastTsStr ? parseInt(lastTsStr) : 0;
          const now = Date.now();
          const elapsedDays = (now - lastTs) / (1000 * 60 * 60 * 24);
          
          if (elapsedDays >= days && animals.length > 0) {
            // Run automatic backup logic
            const backupData = {
              app: 'GenZOT',
              version: '3.0',
              timestamp: new Date().toISOString(),
              animalsCount: animals.length,
              data: animals
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `genzot_backup_auto_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            const nowStr = new Date().toLocaleString('pt-BR');
            localStorage.setItem('geno_last_backup_time', nowStr);
            localStorage.setItem('geno_last_backup_ts', String(now));

            // Log history tracking
            let currentLog = [];
            try {
              const logStr = localStorage.getItem('geno_backup_log');
              currentLog = logStr ? JSON.parse(logStr) : [];
            } catch {
              currentLog = [];
            }
            const newLog = [{
              id: Math.random().toString(36).substring(2, 9),
              timestamp: nowStr,
              count: animals.length,
              type: 'auto' as const
            }, ...currentLog].slice(0, 10);
            localStorage.setItem('geno_backup_log', JSON.stringify(newLog));
            
            console.log('Auto-backup executado automaticamente (Frequência: de ' + days + ' em ' + days + ' dias)');
          }
        }
      } else {
        if (!localStorage.getItem('geno_last_backup_ts')) {
          localStorage.setItem('geno_last_backup_time', new Date().toLocaleString('pt-BR'));
          localStorage.setItem('geno_last_backup_ts', String(Date.now()));
        }
      }
    } catch (e) {
      console.warn('Falha na orquestração de auto-backup:', e);
    }
  }, [animals]);

  // Reactively compute inbreeding coefficients F and heterozygosity for each animal
  const computedAnimals = useMemo(() => {
    const sortedPed = buildClosedSortedPedigree(animals);
    const { F } = computeRelationshipMatrix(sortedPed);
    
    return animals.map(a => ({
      ...a,
      f_inbreeding: F[a.id] || 0.0,
      heterozygosity: computeHeterozygosity(a, animals)
    }));
  }, [animals]);

  // Reactively solve BLUP/MME evaluations for all active traits
  const evaluationEstimates = useMemo(() => {
    const pesoDesmame = solveBLUP(computedAnimals, 'pesoDesmame', geneticParams).estimates;
    const pesoSobreano = solveBLUP(computedAnimals, 'pesoSobreano', geneticParams).estimates;
    const pe = solveBLUP(computedAnimals, 'pe', geneticParams).estimates;
    const aol = solveBLUP(computedAnimals, 'aol', geneticParams).estimates;
    const egs = solveBLUP(computedAnimals, 'egs', geneticParams).estimates;

    return {
      pesoDesmame,
      pesoSobreano,
      pe,
      aol,
      egs
    };
  }, [computedAnimals, geneticParams]);

  // Action: Add new animal record
  const handleAddAnimal = (newAnimal: Animal) => {
    // Check for existing ID
    if (animals.some(a => a.id === newAnimal.id)) {
      alert(`Erro: Já existe um animal registrado sob o identificador ${newAnimal.id}.`);
      return;
    }
    setAnimals(prev => [...prev, newAnimal]);
  };

  // Action: Delete animal record
  const handleDeleteAnimal = (idToDel: string) => {
    setAnimals(prev => prev.filter(a => a.id !== idToDel));
  };

  // Action: Update animal record
  const handleUpdateAnimal = (idToUpdate: string, updatedAnimal: Animal) => {
    setAnimals(prev => prev.map(a => a.id === idToUpdate ? updatedAnimal : a));
  };

  // Action: Reset dummy dataset
  const handleResetData = () => {
    if (window.confirm("Deseja redefinir os dados para o rebanho de teste padrão?")) {
      setAnimals(initialAnimals);
      setGeneticParams(defaultGeneticParameters);
      setIndexConfig(defaultSelectionIndexConfig);
    }
  };

  // Live stats computed for the header to match the Geometric Balance design
  const headerStats = useMemo(() => {
    if (computedAnimals.length === 0) return { h2Avg: 0.30, fAvg: 0.0 };
    const h2Avg = (geneticParams.h2_pesoDesmame + geneticParams.h2_pesoSobreano + geneticParams.h2_pe + geneticParams.h2_aol + geneticParams.h2_egs) / 5;
    const fAvgVal = computedAnimals.reduce((acc, curr) => acc + (curr.f_inbreeding || 0), 0) / computedAnimals.length;
    return {
      h2Avg: Number(h2Avg.toFixed(2)),
      fAvg: Number((fAvgVal * 100).toFixed(2))
    };
  }, [computedAnimals, geneticParams]);

  if (!authMode) {
    return <LoginScreen onLoginSuccess={(mode) => setAuthMode(mode)} />;
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans antialiased flex flex-col" id="app-container">
      {/* Upper Navigation Rail - Geometric Balance Styled */}
      <header className="h-auto md:h-16 bg-[#0F172A] flex flex-col md:flex-row items-center justify-between px-6 py-3 md:py-0 border-b border-slate-700 w-full shrink-0">
        
        {/* Logo & Headline */}
        <div className="flex items-center space-x-3 mb-3 md:mb-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md ring-2 ring-amber-500/40">
            <Dna className="w-5.5 h-5.5 animate-[pulse_3s_infinite]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
              Gen<span className="text-amber-500">ZOT</span>
            </h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider leading-none mt-1">
              Melhoramento Genético de animais
            </p>
          </div>
        </div>

        {/* Dual-Mode Selector slider switch */}
        <div className="flex items-center bg-slate-800 rounded-full p-1 border border-slate-705 shrink-0 mb-3 md:mb-0">
          <button
            onClick={() => setViewMode('producer')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
              viewMode === 'producer'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            MODO PRODUTOR
          </button>
          <button
            onClick={() => setViewMode('academic')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
              viewMode === 'academic'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            MODO ACADÊMICO
          </button>
        </div>

        {/* Species Selection on the right */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-extrabold tracking-wider transition-all duration-200 shadow-sm border border-indigo-500 shrink-0 cursor-pointer"
            id="global-report-button"
            title="Abrir Centro de Relatórios com exportação Excel & PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            RELATÓRIO
          </button>



          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center justify-center p-2 rounded-lg transition-all border shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
            }`}
            title="Configurações & Backup"
            id="global-settings-button"
          >
            <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-white animate-spin' : 'text-emerald-500 hover:animate-spin'}`} style={{ animationDuration: '6s' }} />
          </button>

          <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-emerald-500 hidden sm:block overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-300" title={`Acessado via: ${authMode}`}>
            🐄
          </div>

          <button 
            onClick={() => setAuthMode(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold tracking-wider transition-all border border-rose-500 shadow-sm cursor-pointer"
            title="Desconectar do sistema"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">SAIR</span>
          </button>
        </div>
      </header>

      {/* Main Structural Layout Wrapper */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        
        {/* Sub-navigation tabs selection */}
        <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200" id="navigation-tabs">
          <button
            id="tab-records"
            onClick={() => setActiveTab('records')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'records'
                ? 'bg-slate-100 text-slate-900 font-bold border-l-4 border-emerald-500'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="Pressione '1' para acessar rapidamente"
          >
            <Settings className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>COLETA DE DADOS</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.25 text-[9px] font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">1</kbd>
          </button>
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-slate-100 text-slate-900 font-bold border-l-4 border-emerald-500'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="Pressione '2' para acessar rapidamente"
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-500" />
            <span>{viewMode === 'producer' ? 'ANÁLISE GENÉTICA' : 'PARÂMETROS & VARIÂNCIAS'}</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.25 text-[9px] font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">2</kbd>
          </button>
          <button
            id="tab-mating"
            onClick={() => setActiveTab('mating')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'mating'
                ? 'bg-slate-100 text-slate-900 font-bold border-l-4 border-emerald-500'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="Pressione '3' para acessar rapidamente"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>ACASALAMENTO PLANEJADO</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.25 text-[9px] font-mono font-black text-amber-700 bg-amber-50 border border-amber-200 rounded">3</kbd>
          </button>
          {viewMode === 'academic' && (
            <button
              id="tab-simulator"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-slate-100 text-slate-900 font-bold border-l-4 border-emerald-500'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Pressione '4' para acessar rapidamente"
            >
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>SIMULAR (ΔG)</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.25 text-[9px] font-mono font-black text-slate-700 bg-slate-100 border border-slate-300 rounded">4</kbd>
            </button>
          )}
          {viewMode === 'academic' && (
            <button
              onClick={() => setActiveTab('references')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'references'
                  ? 'bg-slate-100 text-slate-900 font-bold border-l-4 border-emerald-500'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Pressione '5' para acessar rapidamente"
            >
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>MANUAL E CIENTÍFICO</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.25 text-[9px] font-mono font-black text-slate-700 bg-slate-100 border border-slate-300 rounded">5</kbd>
            </button>
          )}
        </div>

        {/* Tab Selection routing components */}
        <section className="space-y-6" id="active-panel">
          {activeTab === 'dashboard' && (
            viewMode === 'producer' ? (
              <ProducerView
                animals={computedAnimals}
                indexConfig={indexConfig}
                onUpdateIndexConfig={setIndexConfig}
                evaluationEstimates={evaluationEstimates}
                selectedSpecies={selectedSpecies}
                onSelectedSpeciesChange={setSelectedSpecies}
              />
            ) : (
              <AcademicView
                animals={computedAnimals}
                geneticParams={geneticParams}
                onUpdateParams={setGeneticParams}
                evaluationEstimates={evaluationEstimates}
              />
            )
          )}

          {activeTab === 'records' && (
            <DataSection
              animals={computedAnimals}
              onAddAnimal={handleAddAnimal}
              onDeleteAnimal={handleDeleteAnimal}
              onResetData={handleResetData}
              onUpdateAnimal={handleUpdateAnimal}
              selectedSpecies={selectedSpecies}
              onSelectedSpeciesChange={setSelectedSpecies}
              viewMode={viewMode}
            />
          )}

          {activeTab === 'mating' && (
            <MatingWizard
              animals={computedAnimals}
              indexConfig={indexConfig}
              evaluationEstimates={evaluationEstimates}
              selectedSpecies={selectedSpecies}
              onSelectedSpeciesChange={setSelectedSpecies}
              viewMode={viewMode}
            />
          )}

          {activeTab === 'simulator' && (
            <GeneticSimulator evaluationEstimates={evaluationEstimates} animals={computedAnimals} />
          )}

          {activeTab === 'references' && (
            <ReferenceSection />
          )}

          {activeTab === 'settings' && (
            <SettingsSection
              animals={animals}
              onRestoreAnimals={setAnimals}
              onResetAllData={handleResetData}
            />
          )}
        </section>
      </main>

      {/* Humble, Clean Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 text-center py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-slate-200 text-[11px]">Gen<span className="text-amber-500">ZOT</span> • Predição Genética para animais.</p>
          <p className="text-[10px] text-slate-500">Ciência acadêmica a serviço da Zootecnia.</p>
          <p className="text-[9px] text-slate-600 mt-2">© 2026 Prof. Paulo Pacheco e Profa. Thaise Melo. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Global Interactive Report Modal Panel */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        animals={computedAnimals}
        indexConfig={indexConfig}
        evaluationEstimates={evaluationEstimates}
        currentSpecies={selectedSpecies}
      />
    </div>
  );
}
