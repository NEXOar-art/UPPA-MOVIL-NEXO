
import React from 'react';
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
    return (
        <div className="absolute top-32 left-4 z-[1001] w-full max-w-sm animate-[preloader-fade-in_0.5s_ease-out]">
            <div className="ps-card p-4 w-full h-full flex flex-col bg-slate-900/90 border-2 border-blue-500/50 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-orbitron text-blue-300">Informe de Misión</h3>
                    <button
                        onClick={onClearRoute}
                        className="p-2 text-slate-400 hover:text-red-400"
                        title="Finalizar Misión"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="flex items-center justify-around text-center border-y border-blue-500/20 py-2">
                    <div>
                        <p className="font-bold text-xl text-white font-orbitron">{routeResult.duration}</p>
                        <p className="text-xs text-slate-400 uppercase">Duración</p>
                    </div>
                    <div className="h-8 border-l border-blue-500/20"></div>
                    <div>
                        <p className="font-bold text-xl text-white font-orbitron">{routeResult.distance}</p>
                        <p className="text-xs text-slate-400 uppercase">Distancia</p>
                    </div>
                </div>

                {(aiRouteSummary || isLoading) && (
                    <div className="p-2 bg-indigo-900/40 border-l-4 border-indigo-500 rounded-r-md min-h-[50px]">
                        <h4 className="text-xs font-semibold text-blue-300 mb-1">Análisis IA de Ruta</h4>
                        {isLoading ? (
                            <div className="flex items-center space-x-2 text-sm text-gray-400">
                                <LoadingSpinner size="w-4 h-4" />
                                <span>Analizando...</span>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-200 italic">"{aiRouteSummary}"</p>
                        )}
                    </div>
                )}
                
                <div className="flex space-x-2">
                    <button
                        onClick={onReport}
                        disabled={!selectedBusLineId}
                        className="ps-button flex-1"
                        title={!selectedBusLineId ? "Selecciona una línea de colectivo para poder reportar" : "Reportar incidente en la ruta"}
                    >
                        <i className="fas fa-bullhorn mr-2"></i> Reportar
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
    );
};

export default TripDetailsPanel;
