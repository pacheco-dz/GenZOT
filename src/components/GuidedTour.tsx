import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position: 'bottom' | 'top' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tab-records',
    title: 'Coleta de Dados',
    description: 'Nesta área, você cadastra novos animais, informa os pais e registra as pesagens e medidas de ultrassom (AOL/EGS) coletadas na fazenda.',
    position: 'bottom'
  },
  {
    targetId: 'tab-dashboard',
    title: 'Análise Genética',
    description: 'Aqui você visualiza o ranking BLUP do rebanho, ajusta os pesos econômicos em tempo real e analisa a progressão genética (ΔG). O centro de comando do produtor.',
    position: 'bottom'
  },
  {
    targetId: 'tab-simulator',
    title: 'Simulador Genético (ΔG)',
    description: 'Projete o futuro do rebanho brincando com a intensidade de seleção e herdabilidade para estimar em quantos anos alcançará suas metas.',
    position: 'bottom'
  },
  {
    targetId: 'tab-mating',
    title: 'Acasalamento Planejado',
    description: 'Escolha uma matriz e veja as melhores recomendações de touros, travando acasalamentos que possam gerar altos índices de consanguinidade (F%).',
    position: 'bottom'
  }
];

export default function GuidedTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Check if it's the user's first time
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('genzot_tour_seen');
    if (!hasSeenTour) {
      // Small delay to let the UI render completely
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener('start-guided-tour', handleStartTour);
    return () => window.removeEventListener('start-guided-tour', handleStartTour);
  }, []);

  const closeTour = () => {
    setIsOpen(false);
    localStorage.setItem('genzot_tour_seen', 'true');
  };

  const calculatePosition = useCallback(() => {
    if (!isOpen) return;

    const step = TOUR_STEPS[currentStep];
    const targetElement = document.getElementById(step.targetId);

    if (targetElement) {
      // Ensuring it scrolls into view with smooth behavior
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Calculate after a small delay to allow scroll
      setTimeout(() => {
        const rect = targetElement.getBoundingClientRect();
        setTargetRect(rect);

        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        let top = 0;
        let left = 0;

        // Position tooltip based on requested position relative to target
        if (step.position === 'bottom') {
          top = rect.bottom + scrollY + 12;
          left = rect.left + scrollX + (rect.width / 2);
        } else if (step.position === 'top') {
          top = rect.top + scrollY - 12;
          left = rect.left + scrollX + (rect.width / 2);
        } else if (step.position === 'right') {
          top = rect.top + scrollY + (rect.height / 2);
          left = rect.right + scrollX + 12;
        } else if (step.position === 'left') {
          top = rect.top + scrollY + (rect.height / 2);
          left = rect.left + scrollX - 12;
        }

        setTooltipStyle({
          top: `${top}px`,
          left: `${left}px`,
          transform: step.position === 'bottom' || step.position === 'top' 
            ? 'translateX(-50%)' 
            : 'translateY(-50%)',
          position: 'absolute'
        });
      }, 300);
    } else {
      // Fallback center screen if target is missing
      setTargetRect(null);
      setTooltipStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      });
    }
  }, [currentStep, isOpen]);

  useEffect(() => {
    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [calculatePosition]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <>
      {/* Invisible overlay over the entire screen to block clicks outside */}
      <div 
        className={`fixed inset-0 z-50 pointer-events-auto transition-opacity ${!targetRect ? 'bg-slate-900/70' : ''}`}
      ></div>

      {/* Target Highlights cutout simulation (border box over target) */}
      {targetRect && (
        <div
          className="fixed z-50 rounded-lg pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.7), 0 0 0 2px #34d399, 0 0 20px rgba(52, 211, 153, 0.5)'
          }}
        ></div>
      )}

      {/* Main Tooltip Popover */}
      <div
        className="z-[60] bg-white rounded-xl shadow-2xl border border-slate-100 max-w-sm w-[320px] transition-all duration-300 opacity-100 scale-100"
        style={tooltipStyle}
      >
        {/* Arrow pointer based on position */}
        {targetRect && (
          <div 
            className={`absolute w-4 h-4 bg-white border-slate-100 transform rotate-45 ${
              step.position === 'bottom' ? '-top-2 left-1/2 -translate-x-1/2 border-l border-t' :
              step.position === 'top' ? '-bottom-2 left-1/2 -translate-x-1/2 border-r border-b' :
              step.position === 'left' ? '-right-2 top-1/2 -translate-y-1/2 border-r border-t' :
              '-left-2 top-1/2 -translate-y-1/2 border-l border-b'
            }`}
          />
        )}

        <div className="p-5 relative z-10">
          <button 
            onClick={closeTour}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Passo {currentStep + 1} de {TOUR_STEPS.length}
            </span>
          </div>

          <h3 className="text-sm font-bold text-slate-800 mb-2">{step.title}</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-5">
            {step.description}
          </p>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className={`text-[10px] font-semibold flex items-center gap-1 ${
                currentStep === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChevronLeft className="w-3 h-3" /> Anterior
            </button>
            
            <div className="flex gap-1">
              {TOUR_STEPS.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full ${i === currentStep ? 'bg-emerald-500' : 'bg-slate-200'}`}
                />
              ))}
            </div>

            {currentStep < TOUR_STEPS.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm"
              >
                Próximo <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={closeTour}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm"
              >
                Começar <Check className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
