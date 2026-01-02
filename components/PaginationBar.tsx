
import React from 'react';

interface PaginationBarProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    label?: string;
}

const PaginationBar: React.FC<PaginationBarProps> = ({ currentPage, totalPages, onPageChange, label = "Página" }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between mt-4 bg-slate-900/40 p-2 rounded-lg border border-white/5">
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="ps-button py-1 px-3 disabled:opacity-30 disabled:pointer-events-none"
                title="Anterior"
            >
                <i className="fas fa-chevron-left text-[10px]"></i>
            </button>
            
            <div className="text-[10px] font-orbitron font-bold text-slate-400 tracking-widest uppercase">
                {label} <span className="text-cyan-400">{currentPage}</span> <span className="mx-1">/</span> {totalPages}
            </div>

            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ps-button py-1 px-3 disabled:opacity-30 disabled:pointer-events-none"
                title="Siguiente"
            >
                <i className="fas fa-chevron-right text-[10px]"></i>
            </button>
        </div>
    );
};

export default PaginationBar;
