
import React from 'react';

interface MicromobilityChatProps {
  isOpen: boolean;
  onToggle: () => void;
  hasAvailableServices: boolean;
  activePilotsCount: number;
  onOpenChat: () => void;
  onOpenRegistration: () => void;
}

const MicromobilityChat: React.FC<MicromobilityChatProps> = ({
  hasAvailableServices,
  activePilotsCount,
  onOpenChat,
  onOpenRegistration,
}) => {
  // Logic updated to show GREEN when pilots are present as requested
  const availabilityColor = hasAvailableServices 
    ? 'bg-green-500/20 text-green-300 border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.15)]' 
    : 'bg-red-500/10 text-red-400 border-red-500/20';
  
  return (
    <div className="bg-slate-900/60 p-4 rounded-xl border border-white/10 shadow-lg space-y-4">
        {/* Cabecera de Estado */}
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <i className={`fas fa-satellite-dish ${hasAvailableServices ? 'text-green-400' : 'text-slate-500'} animate-pulse text-sm`}></i>
                    <span className="text-[10px] font-bold font-orbitron tracking-widest text-slate-300 uppercase">Nexo Central</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black border transition-all duration-500 ${availabilityColor}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${hasAvailableServices ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></div>
                    {hasAvailableServices ? `${activePilotsCount} PILOTOS ACTIVOS` : "SIN PILOTOS"}
                </div>
            </div>
        </div>

        {/* Descripción */}
        <div className="space-y-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-tight">Red de Despliegue Urbano</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed italic border-l-2 border-cyan-500/30 pl-3">
                Canal táctico para solicitar transporte o registrarse como piloto de la red.
            </p>
        </div>

        {/* Acciones duales */}
        <div className="grid grid-cols-1 gap-2 pt-2">
            <button
                onClick={onOpenChat}
                className="ps-button active py-2.5 text-[10px] flex items-center justify-center gap-2 group transition-all"
            >
                <i className="fas fa-comments text-xs group-hover:scale-110"></i>
                ABRIR NEXO DE CHAT
            </button>
            <button
                onClick={onOpenRegistration}
                className="w-full bg-slate-800/80 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-lg py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:border-cyan-400"
            >
                <i className="fas fa-id-badge text-xs"></i>
                UNIRSE COMO PILOTO
            </button>
        </div>
    </div>
  );
};

export default MicromobilityChat;
