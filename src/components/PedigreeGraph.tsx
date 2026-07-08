import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Animal } from '../types';
import { X, ZoomIn, ZoomOut, User } from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  type: 'proposito' | 'sire' | 'dam';
  generation: number;
  role: string;
  sire?: TreeNode | null;
  dam?: TreeNode | null;
}

interface PedigreeGraphProps {
  animal: Animal;
  animals: Animal[];
  onClose: () => void;
}

function computeRole(type: 'proposito'|'sire'|'dam', gen: number, lineage: 'paternal'|'maternal'|'root') {
  if (gen === 1) return "Animal Avaliado";
  if (gen === 2) return type === 'sire' ? "Pai" : "Mãe";
  
  const suffix = lineage === 'paternal' ? " paterno" : " materno";
  const suffixF = lineage === 'paternal' ? " paterna" : " materna";
  
  if (gen === 3) return (type === 'sire' ? "Avô" : "Avó") + (type === 'sire' ? suffix : suffixF);
  if (gen === 4) return (type === 'sire' ? "Bisavô" : "Bisavó") + (type === 'sire' ? suffix : suffixF);
  if (gen === 5) return (type === 'sire' ? "Trisavô" : "Trisavó") + (type === 'sire' ? suffix : suffixF);
  if (gen === 6) return (type === 'sire' ? "Tetravô" : "Tetravó") + (type === 'sire' ? suffix : suffixF);
  if (gen === 7) return (type === 'sire' ? "Pentavô" : "Pentavó") + (type === 'sire' ? suffix : suffixF);
  return type === 'sire' ? "Macho ancestral" : "Fêmea ancestral";
}

const NodeCard = ({ node }: { node: TreeNode }) => {
  const isMale = node.type === 'sire';
  const isFemale = node.type === 'dam';
  const isRoot = node.type === 'proposito';
  
  const isUnknown = node.name.startsWith('Desc');

  let pillBg = "bg-emerald-600";
  let pillText = "ANIMAL";
  if (isMale) { pillBg = "bg-purple-600"; pillText = "MACHO"; }
  if (isFemale) { pillBg = "bg-orange-500"; pillText = "FÊMEA"; }

  if (isUnknown) {
    return (
      <div className="w-44 flex flex-col items-center mx-[10px] relative opacity-60">
        <div className={`z-10 ${pillBg} text-white text-[9px] uppercase font-bold px-3 py-0.5 rounded-full shadow-sm border border-white translate-y-2`}>
          {pillText}
        </div>
        <div className="bg-gray-100/80 w-full border border-dashed border-gray-300 rounded-lg pb-3 pt-4 px-2 flex flex-col items-center shadow-sm">
          <div className="text-center font-semibold text-[11px] text-gray-500 mb-1 border-b border-gray-200 pb-1 w-full truncate px-1">
            {node.role}
          </div>
          <div className="text-[10px] text-gray-400 font-mono tracking-wider italic mt-1 pb-1">Desconhecido</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-52 mx-[10px] relative group z-10">
      {/* Floating Pill */}
      <div className={`z-10 ${pillBg} text-white text-[10px] uppercase font-black px-4 py-1 rounded-full shadow-md border-[1.5px] border-white translate-y-2 tracking-wide`}>
        {pillText}
      </div>
      
      {/* Main Card */}
      <div className={`bg-white w-full border-2 ${isRoot ? 'border-emerald-500 shadow-emerald-200/50' : isMale ? 'border-purple-300 shadow-purple-200/50' : 'border-orange-300 shadow-orange-200/50'} rounded-xl shadow-lg pb-4 pt-5 px-3 relative transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1`}>
        
        {/* Role title */}
        <div className="text-center font-bold text-[13px] text-gray-700 pb-1.5 mb-2 border-b border-gray-100">
          {node.role}
        </div>
        
        {/* Info */}
        <div className="text-center leading-tight">
          <div className={`text-[13px] font-black truncate px-1 ${isMale ? 'text-purple-800' : isFemale ? 'text-orange-800' : 'text-emerald-800'}`} title={node.name}>
            {node.name}
          </div>
          {node.id !== node.name && (
            <div className="text-[10px] text-gray-500 font-mono mt-2 bg-gray-50 py-1 px-2 rounded-md inline-block border border-gray-100 uppercase font-medium">
              Reg: {node.id.length > 12 ? node.id.substring(0,12)+'...' : node.id}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const PedigreeNodeRenderer = ({ node }: { node: TreeNode }) => {
  if (!node) return null;
  const hasChildren = node.sire || node.dam;
  return (
    <div className="pedigree-branch">
      <NodeCard node={node} />
      {hasChildren && (
        <div className="pedigree-children">
           {node.sire && (
             <div className="pedigree-child" style={{ '--line-color': '#a855f7' } as React.CSSProperties}>
               <PedigreeNodeRenderer node={node.sire} />
             </div>
           )}
           {node.dam && (
             <div className="pedigree-child" style={{ '--line-color': '#fb923c' } as React.CSSProperties}>
               <PedigreeNodeRenderer node={node.dam} />
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default function PedigreeGraph({ animal, animals, onClose }: PedigreeGraphProps) {
  const [scale, setScale] = useState(0.85);

  const treeData = useMemo(() => {
    const buildTree = (animId: string, currentGen: number, type: 'proposito' | 'sire' | 'dam', lineage: 'paternal'|'maternal'|'root'): TreeNode | null => {
      if (currentGen > 7 || !animId || animId === '0') return null;

      const anim = animals.find(a => a.id === animId);
      const role = computeRole(type, currentGen, lineage);
      
      const node: TreeNode = {
        id: animId,
        name: anim?.name || animId,
        type,
        generation: currentGen,
        role
      };

      if (anim) {
        if (anim.sireId && anim.sireId !== '0') {
          node.sire = buildTree(anim.sireId, currentGen + 1, 'sire', currentGen === 1 ? 'paternal' : lineage);
        } else if (currentGen < 7) {
          node.sire = { 
            id: `unk-sire-${animId}`, 
            name: 'Desconhecido', 
            type: 'sire', 
            generation: currentGen + 1,
            role: computeRole('sire', currentGen + 1, currentGen === 1 ? 'paternal' : lineage)
          };
        }

        if (anim.damId && anim.damId !== '0') {
          node.dam = buildTree(anim.damId, currentGen + 1, 'dam', currentGen === 1 ? 'maternal' : lineage);
        } else if (currentGen < 7) {
          node.dam = { 
            id: `unk-dam-${animId}`, 
            name: 'Desconhecida', 
            type: 'dam', 
            generation: currentGen + 1,
            role: computeRole('dam', currentGen + 1, currentGen === 1 ? 'maternal' : lineage)
          };
        }
      }

      return node;
    };

    return buildTree(animal.id, 1, 'proposito', 'root');
  }, [animal, animals]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-sm animate-in fade-in duration-200">
      <style>{`
        .pedigree-branch {
          display: flex;
          align-items: center;
        }
        .pedigree-children {
          display: flex;
          flex-direction: column;
          margin-left: 28px;
          position: relative;
        }
        .pedigree-children::before {
          content: '';
          position: absolute;
          left: -28px;
          top: 50%;
          width: 28px;
          height: 3px;
          background-color: #cbd5e1;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          z-index: 0;
        }
        .pedigree-child {
          display: flex;
          align-items: center;
          position: relative;
          padding: 10px 0;
        }
        .pedigree-child::before {
          content: '';
          position: absolute;
          left: -28px;
          top: 50%;
          width: 28px;
          height: 3px;
          background-color: var(--line-color, #cbd5e1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.15);
          z-index: 0;
          transition: background-color 0.3s;
        }
        .pedigree-child::after {
          content: '';
          position: absolute;
          left: -28px;
          top: 0;
          bottom: 0;
          width: 3px;
          background-color: var(--line-color, #cbd5e1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.15);
          z-index: 0;
          transition: background-color 0.3s;
        }
        .pedigree-child:first-child::after {
          top: 50%;
          border-top-left-radius: 4px;
        }
        .pedigree-child:last-child::after {
          bottom: 50%;
          border-bottom-left-radius: 4px;
        }
      `}</style>
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-20 shadow-sm shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              Árvore Genealógica (Pedigree): <span className="text-emerald-700">{animal.name || animal.id}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">Hierarquia familiar em formato de chave de expansão horizontal. Linhagens paternas (roxo) e maternas (laranja) até 7 gerações.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 shadow-inner">
              <button onClick={() => setScale(s => Math.max(0.3, s - 0.15))} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded transition focus:outline-none" title="Reduzir">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold text-gray-600 font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(2, s + 0.15))} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded transition focus:outline-none" title="Ampliar">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 rounded-lg p-2 transition focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Pedigree Display Area */}
        <div className="flex-1 w-full bg-[#f8fafc] overflow-auto relative">
          <div 
            className="min-w-max min-h-max p-12 lg:p-24 pb-32 transition-transform origin-top-left" 
            style={{ transform: `scale(${scale})` }}
          >
            {treeData && <PedigreeNodeRenderer node={treeData} />}
          </div>
        </div>
        
      </div>
    </div>
  );
}
