
import React, { useState } from 'react';
import { GlobalChatMessage, UserProfile, MicromobilityService } from '../types';
import Modal from './Modal';
import MicromobilityChatWindow from './MicromobilityChatWindow';
import MicromobilityServiceCard from './MicromobilityServiceCard';

type PrivateChat = {
    participants: { id: string, name: string }[];
    messages: GlobalChatMessage[];
}

interface MicromobilityChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: GlobalChatMessage[];
  currentUser: UserProfile;
  onSendMessage: (message: GlobalChatMessage) => void;
  privateChats: Record<string, PrivateChat>;
  onSendPrivateMessage: (chatId: string, message: GlobalChatMessage) => void;
  services: MicromobilityService[];
  onOpenRegistration: () => void;
  onToggleAvailability: (serviceId: string) => void;
  onToggleOccupied: (serviceId: string) => void;
  onConfirmPayment: (serviceId: string) => void;
}

const MicromobilityChatModal: React.FC<MicromobilityChatModalProps> = ({
  isOpen,
  onClose,
  messages,
  currentUser,
  onSendMessage,
  privateChats,
  onSendPrivateMessage,
  services,
  onOpenRegistration,
  onToggleAvailability,
  onToggleOccupied,
  onConfirmPayment
}) => {
  const [activeChatTab, setActiveChatTab] = useState<'global' | string>('global');
  const myServices = services.filter(s => s.providerId === currentUser.id);

  const activePrivateChats = Object.entries(privateChats).filter(([id, chat]) => 
    (chat as PrivateChat).participants.some(p => p.id === currentUser.id)
  );

  const activeMessages = activeChatTab === 'global' 
    ? messages 
    : privateChats[activeChatTab]?.messages || [];

  const handleSendMessage = (msg: GlobalChatMessage) => {
    if (activeChatTab === 'global') {
        onSendMessage(msg);
    } else {
        onSendPrivateMessage(activeChatTab, msg);
    }
  };

  const getChatPartnerName = (chat: PrivateChat) => {
    const partner = chat.participants.find(p => p.id !== currentUser.id);
    return partner ? partner.name : "Piloto";
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="CENTRO DE COMUNICACIONES" 
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col h-[85vh] lg:h-[80vh] gap-4">
        
        {/* Selector de Canal Optimizado */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide border-b border-white/10 shrink-0">
            <button 
                onClick={() => setActiveChatTab('global')}
                className={`px-4 py-3 rounded-t-xl text-[10px] font-black tracking-widest whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeChatTab === 'global' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                <i className="fas fa-broadcast-tower text-xs"></i> REPORTE PÚBLICO
            </button>
            {activePrivateChats.map(([id, chat]) => (
                <button 
                    key={id}
                    onClick={() => setActiveChatTab(id)}
                    className={`px-4 py-3 rounded-t-xl text-[10px] font-black tracking-widest whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeChatTab === id ? 'bg-fuchsia-500/10 border-fuchsia-400 text-fuchsia-300' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    <i className="fas fa-shield-alt text-xs"></i> NEXO: {getChatPartnerName(chat as PrivateChat).toUpperCase()}
                </button>
            ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-grow min-h-0 overflow-hidden">
            {/* Ventana de Chat: Ocupa todo el espacio principal */}
            <div className="flex-grow flex flex-col min-h-0 relative">
                <div className="flex-grow bg-slate-950/40 rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
                    <MicromobilityChatWindow
                        messages={activeMessages}
                        currentUser={currentUser}
                        onSendMessage={handleSendMessage}
                    />
                </div>
            </div>

            {/* Panel de Gestión del Piloto: Con padding inferior extra para asegurar scroll del PIN */}
            <div className="flex flex-col shrink-0 lg:w-80 gap-4 overflow-y-auto pr-2 scrollbar-thin">
                <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-5 space-y-5 shadow-xl min-h-full pb-24">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <div className="space-y-1">
                            <h3 className="text-[10px] font-black font-orbitron text-cyan-400 tracking-widest uppercase">Estatus de Piloto</h3>
                            <p className="text-[9px] text-slate-500 font-mono">PANEL DE CONTROL DE UNIDAD</p>
                        </div>
                        <button 
                            onClick={onOpenRegistration}
                            className="w-8 h-8 bg-cyan-500/20 rounded-lg text-cyan-300 hover:bg-cyan-500 hover:text-white transition-all flex items-center justify-center shadow-lg shadow-cyan-500/10"
                            title="Desplegar nueva unidad"
                        >
                            <i className="fas fa-plus text-xs"></i>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {myServices.length === 0 ? (
                            <div className="p-6 border border-dashed border-white/10 rounded-xl text-center bg-black/20">
                                <i className="fas fa-id-card-alt text-slate-700 text-2xl mb-3"></i>
                                <p className="text-[10px] text-slate-500 italic mb-4 px-4">No has registrado unidades de transporte en la red actual.</p>
                                <button onClick={onOpenRegistration} className="ps-button active py-2 text-[9px] w-full">UNIRSE A LA FLOTA</button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {myServices.map(s => (
                                    <div key={s.id} className="relative group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-30 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        <div className="relative">
                                            <MicromobilityServiceCard 
                                                service={s} isOwnService={true} currentUser={currentUser}
                                                onToggleAvailability={onToggleAvailability} onToggleOccupied={onToggleOccupied} onConfirmPayment={onConfirmPayment}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-blue-500/20 space-y-3">
                         <div className="flex items-center gap-2">
                            <i className="fas fa-info-circle text-blue-400 text-xs"></i>
                            <h4 className="text-[9px] font-black text-blue-300 uppercase tracking-wider">Protocolo de Uso</h4>
                         </div>
                         <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                            La visibilidad de tu unidad depende del estado de disponibilidad. Mantén tu canal privado atento para solicitudes de misiones.
                         </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </Modal>
  );
};

export default MicromobilityChatModal;
