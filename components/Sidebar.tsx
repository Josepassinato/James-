// components/Sidebar.tsx
import React from 'react';
import { X, FileText, BrainCircuit, PlusCircle } from 'lucide-react';
import { KnowledgeBase, KnowledgeCategory, KnowledgeItem } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddKnowledge: () => void;
  knowledgeBase: KnowledgeBase;
  onKnowledgeItemClick: (item: KnowledgeItem) => void;
}

const CATEGORY_NAMES: Record<KnowledgeCategory, string> = {
    personal: 'Pessoal',
    professional: 'Profissional',
    goals: 'Metas',
    misc: 'Diversos'
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onAddKnowledge, knowledgeBase, onKnowledgeItemClick }) => {
  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>

      <aside
        className={`fixed top-0 left-0 h-full bg-bg-light border-r border-bg-lighter w-4/5 max-w-xs md:w-80 lg:w-96 transform transition-transform z-40 md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b border-bg-lighter">
             <div className="flex items-center space-x-2">
                <BrainCircuit size={22} className="text-brand-secondary"/>
                <h2 className="text-xl font-semibold text-text-primary">Memória de James</h2>
            </div>
            <button
              onClick={onAddKnowledge}
              className="p-2 rounded-full text-text-secondary hover:bg-bg-main hover:text-text-primary"
              title="Alimentar Memória"
            >
                <PlusCircle size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-bg-main md:hidden"
            >
              <X size={20} />
            </button>
          </header>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
             {(Object.keys(CATEGORY_NAMES) as KnowledgeCategory[]).map(categoryKey => {
                 const items = knowledgeBase?.[categoryKey];
                 if (!items || items.length === 0) return null;

                 return (
                     <div key={categoryKey} className="text-sm text-text-secondary">
                        <p className="font-semibold mb-2 text-text-primary">{CATEGORY_NAMES[categoryKey]}</p>
                        <ul className="space-y-1">
                            {items.map(item => (
                                <li 
                                    key={item.id}
                                    onClick={() => onKnowledgeItemClick(item)}
                                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-bg-main cursor-pointer"
                                >
                                    <FileText size={16} />
                                    <span className="truncate">{item.title}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                 )
             })}
             
             {/* FIX: Replaced Object.values with a type-safe check using Object.keys to prevent accessing 'length' on 'unknown' type. */}
             {(Object.keys(knowledgeBase) as Array<keyof KnowledgeBase>).every(key => !knowledgeBase[key] || knowledgeBase[key]!.length === 0) && (
                 <div className="text-center text-text-secondary text-sm pt-8">
                     <p>A Base de Conhecimento está vazia.</p>
                     <p className="mt-2">Use o botão <PlusCircle size={14} className="inline-block mx-1" /> para adicionar informações.</p>
                 </div>
             )}
          </div>
        </div>
      </aside>
    </>
  );
};