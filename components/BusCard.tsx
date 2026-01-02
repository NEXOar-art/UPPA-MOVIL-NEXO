
import React, { useState } from 'react';
import { Bus, BusLineDetails, Coordinates } from '../types';

interface BusCardProps {
  bus: Bus;
  onSelect: () => void;
  isSelected: boolean;
  onReport: () => void;
  details: BusLineDetails | null;
  children?: React.ReactNode;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onFindRouteToStop: (stopLocation: Coordinates) => void;
  onTriggerApm: () => void;
}

const BusCard: React.FC<BusCardProps> = ({ bus, onSelect, isSelected, onReport, details, children, isFavorite, onToggleFavorite, onFindRouteToStop, onTriggerApm }) => {
    const [activeTab, setActiveTab] = useState<'intel' | 'ruta' | 'reporte'>('intel');
    const [isStopsVisible, setIsStopsVisible] = useState(false);
    
    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleFavorite();
        audioService.playConfirmationSound();
    };

    const handleTabClick = (tab: 'intel' | 'ruta' | 'reporte') => {
        setActiveTab(tab);
        if (tab !== 'ruta') {
            setIsStopsVisible(false);
        }
    };
    
    const tabButtonStyle = (isActive: boolean) => 
        `flex-1 text-[10px] uppercase font-bold py-2 rounded transition-all flex items-center justify-center space-x-2 ${
            isActive ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'hover:bg-slate-700 text-slate-400'
        }`;

    return (
        <div className={`ps-card p-4 border-2 transition-all duration-300 ${isSelected ? 'border-cyan-400 shadow-xl bg-slate-800/80' : 'border-white/5 hover:border-blue-500/30 cursor-pointer'}`} onClick={!isSelected ? onSelect : undefined}>
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3 overflow-hidden">
                    <div className={`w-1.5 h-10 rounded-full ${bus.color} flex-shrink-0 shadow-[0_0_8px_currentColor]`}></div>
                    <div className="overflow-hidden">
                        <h3 className="text-lg font-bold font-orbitron truncate">{bus.lineName}</h3>
                        <p className="text-xs text-slate-500 truncate">{bus.description}</p>
                    </div>
                </div>
                <button
                    onClick={handleFavoriteClick}
                    className={`p-2 rounded-lg transition-all ${isFavorite ? 'text-yellow-400 scale-110' : 'text-slate-600 hover:text-yellow-400/50'}`}
                    title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                >
                    <i className={`${isFavorite ? 'fas' : 'far'} fa-star text-xl`}></i>
                </button>
            </div>

            {isSelected && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-[preloader-fade-in_0.3s_ease-out]">
                    <button 
                        onClick={onTriggerApm} 
                        className="w-full ps-button bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-400 text-[10px] py-2 flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-exclamation-triangle"></i> ¿SIN COLECTIVO? ACTIVAR APM
                    </button>

                    <div className="flex space-x-1 bg-black/20 p-1 rounded-lg">
                        <button onClick={() => handleTabClick('intel')} className={tabButtonStyle(activeTab === 'intel')}>
                            <i className="fas fa-satellite-dish"></i><span>Intel</span>
                        </button>
                        <button onClick={() => handleTabClick('ruta')} className={tabButtonStyle(activeTab === 'ruta')}>
                            <i className="fas fa-route"></i><span>Ruta</span>
                        </button>
                        <button onClick={() => handleTabClick('reporte')} className={tabButtonStyle(activeTab === 'reporte')}>
                            <i className="fas fa-bullhorn"></i><span>Reportar</span>
                        </button>
                    </div>

                    <div className="min-h-[100px]">
                        {activeTab === 'intel' && (
                            <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin pr-2">{children}</div>
                        )}
                        {activeTab === 'ruta' && details && (
                            <div className="space-y-3 text-xs text-slate-400 max-h-[300px] overflow-y-auto scrollbar-thin pr-2">
                                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                    <p className="mb-1"><strong className="text-cyan-400">Operador:</strong> {details.operator}</p>
                                    <p className="leading-relaxed">{details.generalDescription}</p>
                                </div>

                                {details.specificRoutes.map((route, index) => (
                                    <div key={index} className="p-3 bg-black/20 rounded-lg border border-white/5">
                                        <h4 className="font-bold text-cyan-300 font-orbitron mb-2 uppercase text-[10px]">Trazado: {route.name}</h4>
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="bg-white/5 p-2 rounded text-center">
                                                <p className="font-orbitron text-white text-base">{route.stopsCount}</p>
                                                <p className="text-[9px] uppercase tracking-widest text-slate-500">Paradas</p>
                                            </div>
                                            <div className="bg-white/5 p-2 rounded text-center">
                                                <p className="font-orbitron text-white text-base">{route.approxDuration}</p>
                                                <p className="text-[9px] uppercase tracking-widest text-slate-500">Estimado</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsStopsVisible(!isStopsVisible)}
                                            className="w-full text-[10px] font-bold text-slate-400 hover:text-white transition-colors flex justify-between items-center"
                                        >
                                            PUNTOS DE CONTROL
                                            <i className={`fas fa-chevron-down transition-transform ${isStopsVisible ? 'rotate-180' : ''}`}></i>
                                        </button>
                                        {isStopsVisible && (
                                            <ul className="mt-2 space-y-1 pt-2 border-t border-white/5">
                                                {route.keyStops.map((stop, sIdx) => (
                                                    <li key={sIdx} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5">
                                                        <i className="fas fa-map-pin text-cyan-500 text-[10px]"></i>
                                                        <span className="text-[11px]">{stop.name}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'reporte' && (
                           <div className="text-center py-6 bg-black/20 rounded-lg border border-white/5">
                                <i className="fas fa-bullhorn text-3xl text-cyan-400 mb-3 opacity-50"></i>
                                <h4 className="font-bold text-sm text-white mb-2">APORTAR INTEL</h4>
                                <p className="text-[11px] text-slate-500 px-4 mb-4 leading-relaxed">
                                    Reporta demoras, incidentes, o el estado del servicio para la comunidad.
                                </p>
                                <button onClick={onReport} className="ps-button active py-2 text-[10px]">
                                    <i className="fas fa-plus mr-2"></i>NUEVO REPORTE
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const PostTripReviewModal: React.FC<any> = () => null;
export default BusCard;
import { audioService } from '../services/audioService';
