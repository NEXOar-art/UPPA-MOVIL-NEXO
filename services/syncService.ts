
import { MicromobilityService, GlobalChatMessage, UserProfile } from '../types';

// El canal permite que diferentes pestañas/ventanas se comuniquen en tiempo real
const SYNC_CHANNEL_NAME = 'uppa_urban_network_sync';
const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);

export enum SyncEventType {
    PRESENCE_PULSE = 'PRESENCE_PULSE',
    PILOT_DEPLOYED = 'PILOT_DEPLOYED',
    PILOT_UPDATED = 'PILOT_UPDATED',
    CHAT_MESSAGE = 'CHAT_MESSAGE',
    INTEL_REPORT = 'INTEL_REPORT'
}

export interface SyncEvent {
    type: SyncEventType;
    payload: any;
    senderId: string;
    timestamp: number;
}

export const syncService = {
    /**
     * Envía un evento a todos los demás clientes conectados
     */
    broadcast: (type: SyncEventType, payload: any, senderId: string) => {
        const event: SyncEvent = {
            type,
            payload,
            senderId,
            timestamp: Date.now()
        };
        channel.postMessage(event);
        
        // También guardamos localmente ciertos tipos de datos para persistencia compartida
        if (type === SyncEventType.PILOT_DEPLOYED || type === SyncEventType.PILOT_UPDATED) {
            const currentPilots = JSON.parse(localStorage.getItem('uppa_shared_pilots') || '[]');
            const pilot = payload as MicromobilityService;
            const index = currentPilots.findIndex((p: any) => p.id === pilot.id);
            
            if (index > -1) {
                currentPilots[index] = pilot;
            } else {
                currentPilots.push(pilot);
            }
            localStorage.setItem('uppa_shared_pilots', JSON.stringify(currentPilots));
        }
    },

    /**
     * Suscribe a los eventos del canal
     */
    subscribe: (callback: (event: SyncEvent) => void) => {
        const handler = (ev: MessageEvent) => callback(ev.data);
        channel.addEventListener('message', handler);
        return () => channel.removeEventListener('message', handler);
    },

    /**
     * Recupera los datos persistidos en el almacenamiento compartido del navegador
     */
    getSharedPilots: (): MicromobilityService[] => {
        return JSON.parse(localStorage.getItem('uppa_shared_pilots') || '[]');
    }
};
