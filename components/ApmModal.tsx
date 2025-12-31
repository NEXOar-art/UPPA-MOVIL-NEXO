import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import { MicromobilityService, MicromobilityServiceType } from '../types';
import { MICROMOBILITY_SERVICE_ICONS } from '../constants';

export type ApmResult = MicromobilityService & {
    eta: number; // in minutes
    cost: number;
};

interface ApmModalProps {
    isOpen: boolean;
    onClose: () => void;
    status: 'running' | 'finished' | 'no_results' | 'idle';
    results: ApmResult[];
    onSelectService: (serviceId: string) => void;
}

const simulationSteps = [
    "Prediciendo demanda por zona y horario (RNN/XGBoost)",
    "Asignando vehículos inteligentemente (Algoritmo Genético)",
    "Optimizando rutas en tiempo real (RL/Dijkstra)",
    "Balanceando flota estratégicamente (K-Means/Monte Carlo)",
];

const ApmModal: React.FC<ApmModalProps> = ({ isOpen, onClose, status, results, onSelectService }) => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (status === 'running') {
            setCurrentStep(0);
            const interval = setInterval(() => {
                setCurrentStep(prev => {
                    if (prev >= simulationSteps.length - 1) {
                        clearInterval(interval);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1200); // Adjust timing for simulation feel
            return () => clearInterval(interval);
        }
    }, [status]);
    
    const renderSimulation = () => (
        <div className="space-y-4">
            {simulationSteps.map((step, index) => (
                <div key={index} className="flex items-center space-x-3 text-sm">
                    {currentStep > index ? (
                        <i className="fas fa-check-circle text-green-400 w-5 text-center"></i>
                    ) : currentStep === index ? (
                        <div className="w-5 flex justify-center"><LoadingSpinner size="w-4 h-4" /></div>
                    ) : (
                        <i className="far fa-circle text-slate-500 w-5 text-center"></i>
                    )}
                    <span className={`${currentStep >= index ? 'text-slate-200' : 'text-slate-500'}`}>{step}</span>
                </div>
            ))}
             {currentStep >= simulationSteps.length - 1 && (
                 <p className="text-center text-cyan-300 pt-4 animate-pulse">Análisis completado. Generando alternativas...</p>
             )}
        </div>
    );

    const renderResults = () => (
        <div className="space-y-3">
             <h3 className="text-xl font-orbitron text-lime-300 border-b border-lime-500/20 pb-2 mb-3">
                Alternativas de Viaje Encontradas
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-2 -mr-2">
                {results.map(service => (
                     <div key={service.id} className="p-3 bg-slate-900/50 rounded-lg flex items-center justify-between gap-3 border border-slate-700/80">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <i className={`${MICROMOBILITY_SERVICE_ICONS[service.type]} ${service.type === MicromobilityServiceType.Moto ? 'text-sky-400' : 'text-indigo-400'} text-2xl`}></i>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-white truncate" title={service.serviceName}>{service.serviceName}</p>
                                <p className="text-xs text-slate-400 truncate" title={service.providerName}>
                                    {service.providerName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <p className="font-mono text-lg text-white">{service.eta}'</p>
                                <p className="text-xs text-slate-500">ETA</p>
                            </div>
                            <div className="text-center">
                                <p className="font-mono text-lg text-white">${service.cost}</p>
                                <p className="text-xs text-slate-500">Est.</p>
                            </div>
                            <button
                                onClick={() => onSelectService(service.id)}
                                className="ps-button active whitespace-nowrap px-3 py-1.5 text-xs"
                                title={`Solicitar ${service.type}`}
                            >
                                <i className="fas fa-paper-plane mr-2"></i>
                                Solicitar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const renderNoResults = () => (
         <div className="text-center py-8">
            <i className="fas fa-satellite-dish text-5xl text-slate-600 mb-4"></i>
            <h3 className="text-xl font-bold text-slate-300">Sin Alternativas Inmediatas</h3>
            <p className="text-slate-400 mt-2">El algoritmo no encontró vehículos de micromovilidad cercanos y disponibles en este momento. Sugerimos esperar 5 minutos y volver a intentar.</p>
        </div>
    );

    const renderContent = () => {
        switch (status) {
            case 'running': return renderSimulation();
            case 'finished': return renderResults();
            case 'no_results': return renderNoResults();
            default: return null;
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Algoritmo Predictivo Multimodal (APM)">
           {renderContent()}
        </Modal>
    );
};

export default ApmModal;
