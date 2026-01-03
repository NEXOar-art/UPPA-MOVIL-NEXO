
import React, { useState, useEffect } from 'react';
import { BusIcon } from './icons'; 
import { UserProfile, BadgeId } from '../types';
import { BADGE_DEFINITIONS } from '../constants';
import { useSettings } from '../contexts/SettingsContext';

interface NavbarProps {
  appName: string;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenRanking: () => void;
  connectedUsersCount: number;
  activePilotsCount: number;
  onFocusUserLocation: () => void;
  onToggleMicromobilityModal: () => void;
  onToggleDonationModal: () => void;
  isTopRanked: boolean;
  onTogglePanel: () => void;
  isPanelVisible: boolean;
}

const DateTimeDisplay: React.FC = () => {
  const { language } = useSettings();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const locale = language === 'en' ? 'en-US' : 'es-AR';
  const timeString = currentDateTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const dateString = currentDateTime.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="flex flex-col items-end text-[10px] font-mono tracking-tighter text-slate-400">
      <span className="text-cyan-400 font-bold">{timeString}</span>
      <span>{dateString.toUpperCase()}</span>
    </div>
  );
};

const Navbar: React.FC<NavbarProps> = ({ 
  appName, 
  currentUser, 
  onLogout, 
  connectedUsersCount, 
  activePilotsCount,
  onFocusUserLocation, 
  onToggleMicromobilityModal, 
  onToggleDonationModal, 
  onTogglePanel, 
  isPanelVisible 
}) => {
  const { t } = useSettings();

  return (
    <nav className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 px-4 flex items-center justify-between z-30 shadow-2xl">
      <div className="flex items-center gap-4">
        <button onClick={onTogglePanel} className="p-2 text-slate-400 hover:text-cyan-400 transition-colors">
          <i className={`fas ${isPanelVisible ? 'fa-indent' : 'fa-outdent'} text-xl`}></i>
        </button>
        <div className="flex items-center gap-2">
            <BusIcon className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <div className="flex flex-col">
                <h1 className="text-xl font-audiowide text-white leading-none">UPPA</h1>
                <span className="text-[10px] font-orbitron text-cyan-500 tracking-widest uppercase">Red Urbana</span>
            </div>
        </div>
      </div>

      {/* Indicadores de Comunidad en tiempo real */}
      <div className="hidden lg:flex items-center gap-6 bg-slate-800/40 px-5 py-2 rounded-full border border-white/5 shadow-inner">
        <div className="flex items-center gap-2 group cursor-help" title="Ciudadanos sincronizados con la red">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-white leading-none">{connectedUsersCount}</span>
                <span className="text-[8px] font-orbitron text-slate-500 tracking-tighter uppercase">CIUDADANOS</span>
            </div>
        </div>
        
        <div className="w-px h-6 bg-white/10"></div>
        
        <div className="flex items-center gap-2 group cursor-help" title="Servicios de transporte listos para despliegue">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-white leading-none">{activePilotsCount}</span>
                <span className="text-[8px] font-orbitron text-slate-500 tracking-tighter uppercase">UNIDADES</span>
            </div>
        </div>

        <div className="w-px h-6 bg-white/10"></div>
        <DateTimeDisplay />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={onFocusUserLocation} 
          className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-all animate-destello-focal" 
          title="Fijar Mi Ubicación Actual"
        >
          <i className="fas fa-crosshairs"></i>
        </button>
        <button onClick={onToggleMicromobilityModal} className="p-2.5 text-slate-400 hover:text-fuchsia-400 hover:bg-white/5 rounded-lg transition-all" title="Micromovilidad">
          <i className="fas fa-motorcycle"></i>
        </button>
        
        {currentUser && (
            <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-white/10">
                <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-xs font-bold text-slate-200">{currentUser.name}</span>
                    <div className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold">
                        <i className="fas fa-coins"></i>
                        <span>{currentUser.tokens}</span>
                    </div>
                </div>
                <img src={currentUser.avatar} className="w-9 h-9 rounded-full border border-cyan-500/50 p-0.5 bg-slate-800" alt="Avatar" />
                <button onClick={onLogout} className="p-2.5 text-slate-500 hover:text-red-400 transition-colors">
                    <i className="fas fa-power-off"></i>
                </button>
            </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
