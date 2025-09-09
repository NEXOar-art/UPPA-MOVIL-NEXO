import React, { useState } from 'react';
import { RouteResult } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface TripDetailsPanelProps {
    routeResult: RouteResult;
    aiRouteSummary: string | null;
    isLoading: boolean;
    onClearRoute: () => void;
    onReport: () => void;
    selectedBusLineId: string | null;
}

const TripDetailsPanel: React.FC<TripDetailsPanelProps> = ({ routeResult, aiRouteSummary, isLoading, onClearRoute, onReport, selectedBusLineId }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`fixed bottom-4 left-4 right-4 z-40 transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[40vh]' : 'max-h-24'} animate-[preloader-fade-in_0.5s_ease-out]`}>
            <div className="ps-card p-3 w-full h-full flex flex-col bg-slate-900/90 border-2 border-blue-500/50">
                <div className="flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-orbitron text-blue-300">Informe de Misión</h3>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 text-slate-400 hover:text-white"
                        aria-expanded={isExpanded}
                        aria-controls="trip-details-content"
                    >
                        <i className={`fas fa-chevron-up transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                    </button>
                </div>

                <div id="trip-details-content" className={`flex-grow overflow-y-auto scrollbar-thin transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 h-0'}`}>
                    <div className="pt-2 border-t border-blue-500/20 space-y-3">
                         {aiRouteSummary && !isLoading && (
                            <div className="p-3 bg-indigo-900/40 border-l-4 border-indigo-500 rounded-r-md">
                                <h4 className="text-sm font-semibold text-blue-300 mb-1">Resumen IA</h4>
                                <p className="text-sm text-gray-200 whitespace-pre-wrap">{aiRouteSummary}</p>
                            </div>
                        )}
                        {isLoading && (
                            <div className="flex items-center space-x-2 text-sm text-gray-400">
                                <LoadingSpinner size="w-4 h-4" />
                                <span>Analizando condiciones del viaje...</span>
                            </div>
                        )}
                        <div className="flex space-x-2">
                             <button
                                onClick={onReport}
                                disabled={!selectedBusLineId}
                                className="ps-button flex-1"
                                title={!selectedBusLineId ? "Selecciona una línea de colectivo para poder reportar" : "Reportar incidente en la ruta"}
                            >
                                <i className="fas fa-bullhorn mr-2"></i> Reportar Incidente
                            </button>
                             <button
                                onClick={onClearRoute}
                                className="ps-button bg-red-600/80 hover:bg-red-700 border-red-500 flex-1"
                            >
                                <i className="fas fa-times-circle mr-2"></i> Finalizar Misión
                            </button>
                        </div>
                    </div>
                </div>

                {/* Compact View */}
                <div className={`flex items-center justify-between transition-opacity duration-300 ${isExpanded ? 'opacity-0 h-0' : 'opacity-100 pt-2'}`}>
                     <div className="flex items-center text-center space-x-6">
                        <div>
                            <p className="font-bold text-lg text-white"><i className="fas fa-clock mr-1.5 text-blue-400"></i>{routeResult.duration}</p>
                        </div>
                        <div>
                            <p className="font-bold text-lg text-white"><i className="fas fa-road mr-1.5 text-blue-400"></i>{routeResult.distance}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClearRoute}
                        className="ps-button bg-red-600/80 hover:bg-red-700 border-red-500 px-3 py-1.5 text-xs"
                    >
                       Finalizar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TripDetailsPanel;