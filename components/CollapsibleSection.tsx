import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="ps-card p-0 overflow-hidden bg-slate-900/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left p-4 hover:bg-slate-800/50 transition-colors"
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${title.replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center space-x-3">
          <i className={`${icon} text-xl text-cyan-400 w-6 text-center`}></i>
          <h3 className="text-lg font-bold text-blue-300 font-orbitron">{title}</h3>
        </div>
        <i className={`fas fa-chevron-down text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      <div
        id={`collapsible-content-${title.replace(/\s+/g, '-')}`}
        className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}
      >
        <div className="p-4 border-t border-blue-500/20">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
