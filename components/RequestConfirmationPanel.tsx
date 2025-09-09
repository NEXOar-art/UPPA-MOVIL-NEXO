import React from 'react';
import { MicromobilityService } from '../types';

interface RequestConfirmationPanelProps {
    service: MicromobilityService;
    countdown: number;
    onCancel: () => void;
}

const RequestConfirmationPanel: React.FC<RequestConfirmationPanelProps> = ({ service, countdown, onCancel }) => {
    const progressPercentage = (countdown / 120) * 100;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg animate-[preloader-fade-in_0.5s_ease-out]">
            <div className="ps-card p-4 bg-slate-900/90 border-2 border-yellow-500/50">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-lg text-yellow-300 font-orbitron">Confirmando Solicitud</h4>
                        <p className="text-sm text-slate-300">Servicio: <span className="font-semibold text-white">{service.serviceName}</span> con <span className="font-semibold text-white">{service.providerName}</span></p>
                    </div>
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-yellow-500/30" stroke="currentColor" strokeWidth="2" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="text-yellow-400" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray={`${progressPercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ transition: 'stroke-dasharray 1s linear' }} />
                        </svg>
                        <span className="absolute text-xl font-mono text-white">{countdown}</span>
                    </div>
                </div>
                <p className="text-xs text-slate-400 text-center mt-2">Puedes cancelar la solicitud antes de que finalice el tiempo. De lo contrario, el viaje quedará confirmado.</p>
                <button
                    onClick={onCancel}
                    className="w-full mt-3 ps-button bg-red-600 hover:bg-red-700 border-red-500 hover:border-red-400"
                >
                    <i className="fas fa-times-circle mr-2"></i> Cancelar Solicitud
                </button>
            </div>
        </div>
    );
};

export default RequestConfirmationPanel;
