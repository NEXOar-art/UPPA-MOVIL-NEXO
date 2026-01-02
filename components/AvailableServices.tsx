
import React, { useState } from 'react';
import { MicromobilityService, UserProfile, MicromobilityServiceType } from '../types';
import { MICROMOBILITY_SERVICE_ICONS } from '../constants';
import PaginationBar from './PaginationBar';

interface AvailableServicesProps {
    services: MicromobilityService[];
    currentUser: UserProfile;
    serviceToConfirm: string | null;
    confirmationCountdown: number;
    onInitiateRequest: (serviceId: string) => void;
    onCancelRequest: () => void;
}

const ITEMS_PER_PAGE = 3;

const AvailableServices: React.FC<AvailableServicesProps> = ({ 
    services, 
    onInitiateRequest, 
}) => {
    const [currentPage, setCurrentPage] = useState(1);

    if (services.length === 0) {
        return (
            <div className="bg-slate-900/30 p-8 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                <i className="fas fa-radar text-slate-700 text-3xl mb-3"></i>
                <p className="text-[10px] text-slate-500 font-orbitron uppercase tracking-widest">Escaneando sector...</p>
                <p className="text-[9px] text-slate-600 mt-1">Sin unidades disponibles en el rango actual.</p>
            </div>
        );
    }

    const totalPages = Math.ceil(services.length / ITEMS_PER_PAGE);
    const paginatedServices = services.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[9px] font-black font-orbitron text-lime-400 tracking-[0.2em] uppercase">
                    UNIDADES EN DESPLIEGUE
                </h3>
                <span className="text-[9px] text-slate-500 font-mono">{services.length} TOTAL</span>
            </div>
            
            <div className="space-y-2.5">
                {paginatedServices.map(service => {
                    const iconClass = MICROMOBILITY_SERVICE_ICONS[service.type] || 'fa-question-circle';
                    const colorClass = service.type === MicromobilityServiceType.Moto ? 'text-sky-400' : 'text-indigo-400';

                    return (
                        <div key={service.id} className="relative p-3 bg-slate-800/40 rounded-xl flex items-center gap-4 border border-white/5 hover:border-cyan-500/40 transition-all group overflow-hidden">
                            {/* Glow decorativo de fondo */}
                            <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-all"></div>
                            
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center border border-white/10 shadow-lg group-hover:border-cyan-500/50 transition-colors">
                                <i className={`fas ${iconClass} ${colorClass} text-xl`}></i>
                            </div>
                            
                            <div className="flex-grow min-w-0 pr-1">
                                <p className="text-xs font-bold text-slate-100 truncate mb-0.5" title={service.serviceName}>
                                    {service.serviceName}
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center text-yellow-500 text-[9px] font-black">
                                        <i className="fas fa-star mr-1"></i>
                                        {service.rating.toFixed(1)}
                                    </div>
                                    <div className="text-[9px] text-slate-500 uppercase tracking-tighter truncate">
                                        <i className="fas fa-map-marker-alt text-[8px] mr-1 opacity-50"></i>
                                        {service.type} • {service.vehicleColor}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => onInitiateRequest(service.id)}
                                className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center hover:bg-cyan-500 hover:text-white transition-all active:scale-90"
                                title={`Contactar a ${service.providerName}`}
                            >
                                <i className="fas fa-paper-plane text-xs"></i>
                            </button>
                        </div>
                    );
                })}
            </div>

            <PaginationBar 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
                label="SECTOR"
            />
        </div>
    );
};

export default AvailableServices;
