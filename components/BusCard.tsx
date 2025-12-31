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
    };

    const handleTabClick = (tab: 'intel' | 'ruta' | 'reporte') => {
        setActiveTab(tab);
        if (tab !== 'ruta') {
            setIsStopsVisible(false);
        }
    };
    
    const tabButtonStyle = (isActive: boolean) => 
        `flex-1 text-sm py-2 rounded transition-colors flex items-center justify-center space-x-2 ${
            isActive ? 'bg-cyan-500 text-white shadow-[0_0_8px_var(--ps-cyan)]' : 'hover:bg-slate-700 text-slate-300'
        }`;

    return (
        <div className={`ps-card p-4 border-2 transition-all duration-300 ${isSelected ? 'border-cyan-400 shadow-lg shadow-cyan-500/10' : 'border-transparent hover:border-blue-500/50 cursor-pointer'}`} onClick={!isSelected ? onSelect : undefined}>
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                    <div className={`w-2 h-8 rounded-full ${bus.color} mt-1`}></div>
                    <div>
                        <h3 className="text-xl font-bold font-orbitron">{bus.lineName}</h3>
                        <p className="text-sm text-slate-400">{bus.description}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleFavoriteClick}
                        className={`p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
                            ${isFavorite
                                ? 'text-yellow-400 hover:text-yellow-300 focus:ring-yellow-400'
                                : 'text-slate-400 hover:text-white focus:ring-cyan-400'
                            }`}
                        title={isFavorite ? 'Eliminar de favoritos' : 'Añadir a favoritos'}
                        aria-label={isFavorite ? 'Eliminar de favoritos' : 'Añadir a favoritos'}
                    >
                        <i className={`${isFavorite ? 'fas' : 'far'} fa-star text-lg ${isFavorite ? 'rank-glow text-yellow-400' : ''}`}></i>
                    </button>
                </div>
            </div>

            {isSelected && (
                <div className="mt-4 pt-4 border-t border-blue-500/20 space-y-4">
                    <button 
                        onClick={onTriggerApm} 
                        className="w-full ps-button bg-amber-600/80 hover:bg-amber-700 border-amber-500/80 hover:border-amber-500 ps-button-glow-effect text-base py-3"
                    >
                        <i className="fas fa-exclamation-triangle mr-2"></i> ¿No hay colectivo? Activar APM
                    </button>

                    <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-md">
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

                    <div className="animate-[preloader-fade-in_0.5s_ease-out]">
                        {activeTab === 'intel' && (
                            <div className="space-y-4 max-h-[450px] overflow-y-auto scrollbar-thin pr-2 -mr-2">{children}</div>
                        )}
                        {activeTab === 'ruta' && details && (
                            <div className="space-y-3 text-xs text-slate-300 max-h-[450px] overflow-y-auto scrollbar-thin pr-2 -mr-2">
                                <div className="p-3 bg-slate-900/50 rounded-lg border border-blue-500/20">
                                    <p><strong>Operador:</strong> {details.operator || 'No disponible'}</p>
                                    <p><strong>Info:</strong> {details.generalDescription || 'No disponible'}</p>
                                </div>

                                {details.specificRoutes.map((route, index) => (
                                    <div key={index} className="p-3 bg-slate-900/50 rounded-lg border border-blue-500/20">
                                        <h4 className="font-bold text-sm text-cyan-300 font-orbitron mb-2">Recorrido: {route.name}</h4>
                                        <div className="grid grid-cols-2 gap-2 text-center mb-3">
                                            <div className="bg-slate-800 p-2 rounded">
                                                <p className="font-orbitron text-cyan-400">{route.stopsCount}</p>
                                                <p className="text-slate-400 text-[10px] uppercase">Paradas</p>
                                            </div>
                                            <div className="bg-slate-800 p-2 rounded">
                                                <p className="font-orbitron text-cyan-400">{route.approxDuration}</p>
                                                <p className="text-slate-400 text-[10px] uppercase">Duración</p>
                                            </div>
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => setIsStopsVisible(!isStopsVisible)}
                                                className="w-full ps-button text-xs py-1.5 flex justify-between items-center"
                                                aria-expanded={isStopsVisible}
                                            >
                                                <span>Paradas Clave</span>
                                                <i className={`fas fa-chevron-down transition-transform duration-300 ${isStopsVisible ? 'rotate-180' : ''}`}></i>
                                            </button>
                                            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isStopsVisible ? 'max-h-96 mt-2' : 'max-h-0'}`}>
                                                <ul className="space-y-1 text-xs pt-2 border-t border-blue-500/10">
                                                    {route.keyStops.map((stop, stopIndex) => (
                                                        <li key={stopIndex} className="text-slate-400 flex items-start p-1 rounded hover:bg-slate-800">
                                                            <i className="fas fa-map-pin text-blue-400 mr-2 mt-0.5 w-3 text-center"></i>
                                                            <button onClick={() => onFindRouteToStop(stop.location)} className="text-left text-blue-300 hover:text-cyan-300 hover:underline focus:outline-none">
                                                                {stop.name}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'reporte' && (
                           <div className="text-center p-4 bg-slate-900/50 rounded-lg">
                                <i className="fas fa-bullhorn text-4xl text-cyan-400 mb-3"></i>
                                <h4 className="font-bold text-lg text-white mb-2">Aportar Intel a la Red</h4>
                                <p className="text-slate-400 text-sm mb-4">
                                    Reporta demoras, incidentes, o el estado del servicio para ayudar a toda la comunidad.
                                </p>
                                <button onClick={onReport} className="ps-button active">
                                    <i className="fas fa-plus-circle mr-2"></i> Crear Nuevo Reporte
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