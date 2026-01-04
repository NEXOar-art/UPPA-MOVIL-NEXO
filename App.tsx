
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Bus, BusStop, Report, ChatMessage, UserProfile, Coordinates, ReportType, RouteResult, TravelMode, UppyChatMessage, MicromobilityService, GlobalChatMessage, RatingHistoryEntry, Maneuver, ScheduleDetail, MicromobilityServiceType
} from './types';
import {
  MOCK_BUS_LINES, MOCK_BUS_STOPS_DATA, DEFAULT_MAP_CENTER, REPORT_TYPE_TRANSLATIONS, BUS_LINE_ADDITIONAL_INFO, DEFAULT_MAP_ZOOM, UPPA_MERCADO_PAGO_ALIAS, MICROMOBILITY_PRICING
} from './constants';
import { useSettings } from './contexts/SettingsContext';

// Components
import Navbar from './components/Navbar';
import MapDisplay from './components/MapDisplay';
import BusCard from './components/BusCard';
import Modal from './components/Modal';
import ReportForm from './components/ReportForm';
import LoginPage from './components/LoginPage';
import ErrorToast from './components/ErrorToast';
import TripPlanner from './components/TripPlanner';
import MicromobilityRegistrationModal from './components/MicromobilityRegistrationModal';
import MicromobilityChatModal from './components/MicromobilityChatModal';
import MicromobilityChat from './components/MicromobilityChat';
import RankingTable from './components/RankingTable';
import LocationDashboard from './components/LocationDashboard';
import AvailableServices from './components/AvailableServices';
import CollapsibleSection from './components/CollapsibleSection';
import PaginationBar from './components/PaginationBar';
import AccessibilityControls from './components/AccessibilityControls';

// Services
import { getAddressFromCoordinates } from './services/geolocationService';
import { fetchRoute } from './services/routesService';
import { getWeather } from './services/mockWeatherService';
import { getAiRouteSummary } from './services/geminiService';
import { audioService } from './services/audioService';
import { syncService, SyncEventType, SyncEvent } from './services/syncService';

const ITEMS_PER_PAGE_BUSES = 3;

const App: React.FC = () => {
    // STATE PRINCIPAL
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [buses, setBuses] = useState<Record<string, Bus>>(MOCK_BUS_LINES);
    const [busStops] = useState<Record<string, BusStop[]>>(MOCK_BUS_STOPS_DATA);
    const [reports, setReports] = useState<Report[]>([]);
    const [globalChatMessages, setGlobalChatMessages] = useState<GlobalChatMessage[]>([]);
    
    // Solo incluir pilotos reales que se postulan
    const [micromobilityServices, setMicromobilityServices] = useState<MicromobilityService[]>([]);
    
    // MULTIUSER PRESENCE STATE
    const [activePeers, setActivePeers] = useState<Record<string, number>>({}); // userId -> lastSeen

    // Private Chats State
    const [privateChats, setPrivateChats] = useState<Record<string, { 
        participants: {id: string, name: string}[]; 
        messages: GlobalChatMessage[]; 
    }>>({});

    const [selectedBusLineId, setSelectedBusLineId] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [mapCenter, setMapCenter] = useState<Coordinates>(DEFAULT_MAP_CENTER);
    const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
    const [isRouteLoading, setIsRouteLoading] = useState(false);
    const [aiRouteSummary, setAiRouteSummary] = useState<string | null>(null);
    const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
    const [weather, setWeather] = useState({ condition: "Cargando...", temp: 0, icon: "fas fa-spinner fa-spin" });
    const [isPanelVisible, setIsPanelVisible] = useState(window.innerWidth >= 1024);
    const [busCurrentPage, setBusCurrentPage] = useState(1);

    // MODAL STATES
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
    const [isMicromobilityRegistrationOpen, setIsMicromobilityRegistrationOpen] = useState(false);
    const [isMicromobilityChatOpen, setIsMicromobilityChatOpen] = useState(false);

    const { t, theme, fontSize } = useSettings();

    // NOTIFICACIONES
    const showNotification = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
        setNotification({ message, type });
    }, []);

    // MULTIUSER: Sincronización de eventos entrantes
    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = syncService.subscribe((event: SyncEvent) => {
            switch (event.type) {
                case SyncEventType.PRESENCE_PULSE:
                    setActivePeers(prev => ({ ...prev, [event.senderId]: Date.now() }));
                    break;
                
                case SyncEventType.PILOT_DEPLOYED:
                    setMicromobilityServices(prev => {
                        const exists = prev.find(s => s.id === event.payload.id);
                        if (exists) return prev;
                        return [...prev, event.payload];
                    });
                    if (event.payload.providerId !== currentUser.id) {
                        showNotification(`Nueva unidad detectada: ${event.payload.serviceName}`, 'info');
                    }
                    break;

                case SyncEventType.PILOT_UPDATED:
                    setMicromobilityServices(prev => prev.map(s => 
                        s.id === event.payload.id ? event.payload : s
                    ));
                    break;

                case SyncEventType.CHAT_MESSAGE:
                    setGlobalChatMessages(prev => [...prev, event.payload]);
                    break;

                case SyncEventType.INTEL_REPORT:
                    setReports(prev => [event.payload, ...prev]);
                    break;
            }
        });

        const presenceInterval = setInterval(() => {
            syncService.broadcast(SyncEventType.PRESENCE_PULSE, { name: currentUser.name }, currentUser.id);
        }, 5000);

        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            setActivePeers(prev => {
                const updated = { ...prev };
                let changed = false;
                Object.keys(updated).forEach(id => {
                    if (now - updated[id] > 15000) {
                        delete updated[id];
                        changed = true;
                    }
                });
                return changed ? updated : prev;
            });
        }, 10000);

        return () => {
            unsubscribe();
            clearInterval(presenceInterval);
            clearInterval(cleanupInterval);
        };
    }, [currentUser, showNotification]);

    useEffect(() => {
        const shared = syncService.getSharedPilots();
        if (shared.length > 0) {
            setMicromobilityServices(shared);
        }
    }, []);

    // HANDLERS
    const handleLogin = (userName: string) => {
        const newUser: UserProfile = {
            id: `user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: userName,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userName}`,
            level: 1, xp: 0, xpToNextLevel: 100, tokens: 50000, badges: [], rank: 999, favoriteBusLineIds: []
        };
        setCurrentUser(newUser);
        localStorage.setItem('uppa-user', JSON.stringify(newUser));
        syncService.broadcast(SyncEventType.PRESENCE_PULSE, { name: userName }, newUser.id);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('uppa-user');
    };

    const handleSendGlobalChatMessage = (message: GlobalChatMessage) => {
        setGlobalChatMessages(prev => [...prev, message]);
        if (currentUser) {
            syncService.broadcast(SyncEventType.CHAT_MESSAGE, message, currentUser.id);
        }
    };

    const handleSubmitReport = (report: Report) => {
        setReports(prev => [report, ...prev]);
        if (currentUser) {
            syncService.broadcast(SyncEventType.INTEL_REPORT, report, currentUser.id);
            setCurrentUser(prev => prev ? ({ ...prev, xp: prev.xp + 20 }) : null);
        }
    };

    const handleServiceRegistration = (formData: any) => {
        if (!currentUser) return;
        
        const price = MICROMOBILITY_PRICING[formData.type as MicromobilityServiceType][formData.subscriptionDurationHours as number];
        if (currentUser.tokens < price) {
            showNotification("Fichas insuficientes para registrar esta unidad.", "error");
            return;
        }

        const newService: MicromobilityService = {
            id: `service-${Date.now()}`,
            providerId: currentUser.id,
            providerName: currentUser.name,
            serviceName: formData.serviceName,
            type: formData.type,
            vehicleModel: formData.vehicleModel,
            vehicleColor: formData.vehicleColor,
            whatsapp: formData.whatsapp,
            location: formData.location, 
            address: formData.address || "Ubicación fijada por GPS",
            petsAllowed: formData.petsAllowed,
            subscriptionDurationHours: formData.subscriptionDurationHours,
            
            // Se registra como inactivo y pendiente de pago
            isActive: false, 
            isAvailable: false,
            isOccupied: false,
            isPendingPayment: true, 
            
            rating: 5.0,
            numberOfRatings: 0,
            totalRatingPoints: 0,
            completedTrips: 0,
            avgPunctuality: 5.0,
            avgSafety: 5.0,
            avgCleanliness: 5.0,
            avgKindness: 5.0,
            ecoScore: 90,
            ratingHistory: [],
            subscriptionExpiryTimestamp: null
        };

        setMicromobilityServices(prev => [newService, ...prev]);
        setCurrentUser(prev => prev ? ({ ...prev, tokens: prev.tokens - price }) : null);
        syncService.broadcast(SyncEventType.PILOT_DEPLOYED, newService, currentUser.id);
        
        setIsMicromobilityRegistrationOpen(false);
        setIsMicromobilityChatOpen(true); 
        showNotification(`Unidad registrada. Procede con el abono para activarla.`, "info");
        audioService.playConfirmationSound();
    };

    const handleConfirmPayment = (serviceId: string) => {
        if (!currentUser) return;
        setMicromobilityServices(prev => prev.map(s => {
            if (s.id === serviceId) {
                const expiry = Date.now() + (s.subscriptionDurationHours * 3600000);
                const updated = { ...s, isPendingPayment: false, isActive: true, isAvailable: true, subscriptionExpiryTimestamp: expiry };
                syncService.broadcast(SyncEventType.PILOT_UPDATED, updated, currentUser.id);
                return updated;
            }
            return s;
        }));
        showNotification("¡Unidad activada y disponible!", "success");
        audioService.playHighlightSound();
    };

    const handleToggleAvailability = (serviceId: string) => {
        if (!currentUser) return;
        setMicromobilityServices(prev => prev.map(s => {
            if (s.id === serviceId) {
                const updated = { ...s, isAvailable: !s.isAvailable };
                syncService.broadcast(SyncEventType.PILOT_UPDATED, updated, currentUser.id);
                return updated;
            }
            return s;
        }));
    };

    const handleToggleOccupied = (serviceId: string) => {
        if (!currentUser) return;
        setMicromobilityServices(prev => prev.map(s => {
            if (s.id === serviceId) {
                const updated = { ...s, isOccupied: !s.isOccupied };
                syncService.broadcast(SyncEventType.PILOT_UPDATED, updated, currentUser.id);
                return updated;
            }
            return s;
        }));
    };

    const connectedUsersCount = Object.keys(activePeers).length + 1; 
    const activePilotsCount = micromobilityServices.filter(s => s.isActive && s.isAvailable && !s.isOccupied).length;

    useEffect(() => {
        document.body.className = `theme-${theme}`;
        document.documentElement.style.fontSize = `${fontSize}px`;
    }, [theme, fontSize]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                null,
                { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 }
            );
        }
    }, []);

    useEffect(() => {
        if (userLocation) getWeather(userLocation).then(setWeather);
    }, [userLocation]);

    if (!currentUser) return <LoginPage onLogin={handleLogin} />;

    const busEntries: Bus[] = Object.values(buses);
    const totalBusPages = Math.ceil(busEntries.length / ITEMS_PER_PAGE_BUSES);
    const paginatedBuses: Bus[] = busEntries.slice((busCurrentPage - 1) * ITEMS_PER_PAGE_BUSES, busCurrentPage * ITEMS_PER_PAGE_BUSES);

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-inter">
            <Navbar
                appName="UppA" currentUser={currentUser} onLogout={handleLogout} onOpenRanking={() => {}}
                connectedUsersCount={connectedUsersCount} activePilotsCount={activePilotsCount}
                onFocusUserLocation={() => userLocation && setMapCenter(userLocation)}
                onToggleMicromobilityModal={() => setIsMicromobilityChatOpen(true)}
                onToggleDonationModal={() => setIsDonationModalOpen(true)}
                isTopRanked={false} onTogglePanel={() => setIsPanelVisible(!isPanelVisible)}
                isPanelVisible={isPanelVisible}
            />

            <main className="flex-grow flex relative overflow-hidden">
                <aside className={`control-deck bg-slate-900/60 backdrop-blur-xl border-r border-white/5 transition-all duration-500 ${isPanelVisible ? 'w-full max-w-[400px]' : 'w-0'} flex flex-col overflow-hidden z-20`}>
                    <div className="flex-grow overflow-y-auto scrollbar-thin p-4 space-y-4">
                        <LocationDashboard 
                            busLineName={selectedBusLineId ? buses[selectedBusLineId].lineName : "Red Urbana"}
                            data={{ weather, reports, schedule: null }} 
                        />
                        
                        <CollapsibleSection title="Líneas de Colectivos" icon="fas fa-bus-alt" defaultOpen={true}>
                            <div className="space-y-3">
                                {paginatedBuses.map(bus => (
                                    <BusCard
                                        key={bus.id} bus={bus} isSelected={selectedBusLineId === bus.id}
                                        onSelect={() => { setSelectedBusLineId(bus.id); setMapCenter(bus.currentLocation); }}
                                        onReport={setIsReportModalOpen.bind(null, true)}
                                        details={selectedBusLineId === bus.id ? BUS_LINE_ADDITIONAL_INFO[bus.id] : null}
                                        isFavorite={currentUser.favoriteBusLineIds.includes(bus.id)}
                                        onToggleFavorite={() => {}} onFindRouteToStop={() => {}} onTriggerApm={() => {}}
                                    >
                                        {reports.filter(r => r.busLineId === bus.id).slice(0, 3).map(r => (
                                            <div key={r.id} className="p-2 bg-white/5 rounded border border-white/5 text-[10px]">
                                                <p className="font-bold text-cyan-400 uppercase">{REPORT_TYPE_TRANSLATIONS[r.type]}</p>
                                                <p className="text-slate-300 italic">"{r.description}"</p>
                                            </div>
                                        ))}
                                    </BusCard>
                                ))}
                                <PaginationBar currentPage={busCurrentPage} totalPages={totalBusPages} onPageChange={setBusCurrentPage} label="FASE" />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Nexo de Comunicación" icon="fas fa-satellite-dish" defaultOpen={true}>
                            <MicromobilityChat 
                                isOpen={true} onToggle={() => {}}
                                hasAvailableServices={activePilotsCount > 0}
                                activePilotsCount={activePilotsCount}
                                onOpenChat={() => setIsMicromobilityChatOpen(true)}
                                onOpenRegistration={() => setIsMicromobilityRegistrationOpen(true)}
                            />
                            <AvailableServices
                                services={micromobilityServices.filter(s => s.isActive && s.isAvailable && !s.isOccupied && s.providerId !== currentUser.id)}
                                currentUser={currentUser} serviceToConfirm={null} confirmationCountdown={0}
                                onInitiateRequest={() => setIsMicromobilityChatOpen(true)} onCancelRequest={() => {}}
                            />
                        </CollapsibleSection>

                        <CollapsibleSection title="Rankings" icon="fas fa-trophy">
                            <RankingTable services={micromobilityServices} currentUser={currentUser} />
                        </CollapsibleSection>
                    </div>
                </aside>

                <div className="flex-grow relative z-10 bg-slate-900">
                    <MapDisplay
                        center={mapCenter} zoom={DEFAULT_MAP_ZOOM}
                        buses={buses} busStops={busStops} reports={reports}
                        micromobilityServices={micromobilityServices}
                        selectedBusLineId={selectedBusLineId} userLocation={userLocation}
                        routeResult={routeResult} isNavigating={false} serviceToConfirm={null}
                        onInitiateRequest={() => setIsMicromobilityChatOpen(true)}
                        onSelectBusStop={() => {}} onNavigateToStopLocation={() => {}}
                    />
                </div>
            </main>

            <AccessibilityControls />
            {notification && <ErrorToast notification={notification} onClose={() => setNotification(null)} />}
            
            <MicromobilityChatModal 
                isOpen={isMicromobilityChatOpen} onClose={() => setIsMicromobilityChatOpen(false)}
                messages={globalChatMessages} currentUser={currentUser} onSendMessage={handleSendGlobalChatMessage}
                privateChats={privateChats} onSendPrivateMessage={() => {}}
                services={micromobilityServices} onOpenRegistration={() => { setIsMicromobilityChatOpen(false); setIsMicromobilityRegistrationOpen(true); }}
                onToggleAvailability={handleToggleAvailability} onToggleOccupied={handleToggleOccupied} onConfirmPayment={handleConfirmPayment}
            />

            <Modal isOpen={isMicromobilityRegistrationOpen} onClose={() => setIsMicromobilityRegistrationOpen(false)} title="Unirse a la Flota">
                <MicromobilityRegistrationModal 
                    currentUser={currentUser} userLocation={userLocation}
                    onSubmit={handleServiceRegistration} onClose={() => setIsMicromobilityRegistrationOpen(false)}
                />
            </Modal>

            <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Transmitir Intel">
                <ReportForm busLineId={selectedBusLineId || ""} currentUser={currentUser} onSubmit={handleSubmitReport} onClose={() => setIsReportModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default App;
