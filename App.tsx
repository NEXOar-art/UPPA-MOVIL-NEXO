
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Bus, BusStop, Report, ChatMessage, UserProfile, Coordinates, ReportType, RouteResult, TravelMode, UppyChatMessage, MicromobilityService, GlobalChatMessage, RatingHistoryEntry, Maneuver, ScheduleDetail, MicromobilityServiceType
} from './types';
import {
  MOCK_BUS_LINES, MOCK_BUS_STOPS_DATA, DEFAULT_MAP_CENTER, REPORT_TYPE_TRANSLATIONS, BUS_LINE_ADDITIONAL_INFO, DEFAULT_MAP_ZOOM, UPPA_MERCADO_PAGO_ALIAS, UPPA_CRYPTO_ADDRESS_EXAMPLE, MOCK_COMMUNITY_PILOTS
} from './constants';
import { useSettings } from './contexts/SettingsContext';

// Components
import Navbar from './components/Navbar';
import MapDisplay from './components/MapDisplay';
import BusCard from './components/BusCard';
import ChatWindow from './components/ChatWindow';
import Modal from './components/Modal';
import ReportForm from './components/ReportForm';
import LoginPage from './components/LoginPage';
import ErrorToast from './components/ErrorToast';
import TripPlanner from './components/TripPlanner';
import CalculatorModal from './components/CalculatorModal';
import UppyAssistant from './components/UppyAssistant';
import MicromobilityRegistrationModal from './components/MicromobilityRegistrationModal';
import MicromobilityChatModal from './components/MicromobilityChatModal';
import OperatorInsightsModal from './components/FloatingMapModal';
import NavigationDisplay from './components/NavigationDisplay';
import AccessibilityControls from './components/AccessibilityControls';
import MicromobilityChat from './components/MicromobilityChat';
import RankingTable from './components/RankingTable';
import LocationDashboard from './components/LocationDashboard';
import PointsOfInterest from './components/PointsOfInterest';
import AvailableServices from './components/AvailableServices';
import TripDetailsPanel from './components/TripDetailsPanel';
import RequestConfirmationPanel from './components/RequestConfirmationPanel';
import ApmModal, { ApmResult } from './components/ApmModal';
import CollapsibleSection from './components/CollapsibleSection';
import PaginationBar from './components/PaginationBar';

// Services
import { getAddressFromCoordinates } from './services/geolocationService';
import { fetchRoute } from './services/routesService';
import { getWeather, getWeatherByLocationName } from './services/mockWeatherService';
import { getUppyResponse, getUppySystemInstruction, getAiRouteSummary } from './services/geminiService';
import { speak, calculateDistance } from './services/navigationService';
import { audioService } from './services/audioService';

const ITEMS_PER_PAGE_BUSES = 3;

// Inicializamos con pilotos de la comunidad simulados para visibilidad inmediata
const INITIAL_PILOTS: MicromobilityService[] = MOCK_COMMUNITY_PILOTS;

const App: React.FC = () => {
    // STATE
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [buses, setBuses] = useState<Record<string, Bus>>(MOCK_BUS_LINES);
    const [busStops] = useState<Record<string, BusStop[]>>(MOCK_BUS_STOPS_DATA);
    const [reports, setReports] = useState<Report[]>([]);
    const [globalChatMessages, setGlobalChatMessages] = useState<GlobalChatMessage[]>([]);
    const [busCurrentPage, setBusCurrentPage] = useState(1);
    const [micromobilityServices, setMicromobilityServices] = useState<MicromobilityService[]>(INITIAL_PILOTS);

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
    const [currentNavigation, setCurrentNavigation] = useState<{ steps: Maneuver[]; currentStepIndex: number } | null>(null);
    const [weather, setWeather] = useState({ condition: "Cargando...", temp: 0, icon: "fas fa-spinner fa-spin" });
    const [isPanelVisible, setIsPanelVisible] = useState(window.innerWidth >= 1024);
    const [isMicromobilitySectionOpen, setIsMicromobilitySectionOpen] = useState(true);

    // MODAL STATES
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
    const [isMicromobilityRegistrationOpen, setIsMicromobilityRegistrationOpen] = useState(false);
    const [isMicromobilityChatOpen, setIsMicromobilityChatOpen] = useState(false);

    const { t, theme, fontSize } = useSettings();

    // HANDLERS
    const showNotification = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
        setNotification({ message, type });
    }, []);

    const handleTogglePanel = () => setIsPanelVisible(prev => !prev);

    const handleLogin = (userName: string) => {
        const newUser: UserProfile = {
            id: `user-${Date.now()}`,
            name: userName,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userName}`,
            level: 1, xp: 0, xpToNextLevel: 100, tokens: 50000, badges: [], rank: 999, favoriteBusLineIds: []
        };
        setCurrentUser(newUser);
        localStorage.setItem('uppa-user', JSON.stringify(newUser));
        showNotification(`${t('welcomeMessage', { userName })}`, 'success');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('uppa-user');
        showNotification(t('logoutMessage'), 'info');
    };

    const handleSelectBusLine = useCallback((busLineId: string) => {
        setSelectedBusLineId(busLineId);
        setMapCenter(buses[busLineId].currentLocation);
        audioService.playHighlightSound();
    }, [buses]);

    const handleOpenReportModal = () => setIsReportModalOpen(true);
    const handleCloseReportModal = () => setIsReportModalOpen(false);

    const handleSubmitReport = (report: Report) => {
        setReports(prev => [report, ...prev]);
        showNotification("Intel transmitido. ¡Gracias por tu aporte!", 'success');
        if (currentUser) {
            setCurrentUser(prev => prev ? ({ ...prev, xp: prev.xp + 20 }) : null);
        }
    };

    const handleSendGlobalChatMessage = (message: GlobalChatMessage) => {
        setGlobalChatMessages(prev => [...prev, message]);
    };

    const handleSendPrivateMessage = (chatId: string, message: GlobalChatMessage) => {
        setPrivateChats(prev => {
            const chat = prev[chatId];
            if (!chat) return prev;
            return {
                ...prev,
                [chatId]: { ...chat, messages: [...chat.messages, message] }
            };
        });
    };

    const handleInitiateRequest = (serviceId: string) => {
        if (!currentUser) return;
        const requestedService = micromobilityServices.find(s => s.id === serviceId);
        if (!requestedService || !requestedService.isAvailable || requestedService.isOccupied) {
            showNotification("Este piloto ya no está disponible para nuevas misiones.", "error");
            return;
        }

        if (!privateChats[serviceId]) {
            setPrivateChats(prev => ({
                ...prev,
                [serviceId]: {
                    participants: [
                        { id: currentUser.id, name: currentUser.name },
                        { id: requestedService.providerId, name: requestedService.providerName }
                    ],
                    messages: [
                        {
                            id: `system-${Date.now()}`,
                            userId: 'system',
                            userName: 'UppA Protocol',
                            timestamp: Date.now(),
                            text: `Has iniciado contacto con ${requestedService.providerName}. Acuerda el punto de encuentro y la tarifa aquí.`,
                            sentiment: 'neutral'
                        }
                    ]
                }
            }));
        }

        setIsMicromobilityChatOpen(true);
        audioService.playConfirmationSound();
        showNotification(`Canal de comunicación abierto con ${requestedService.providerName}.`, "success");
    };

    const handleServiceRegistration = (formData: any) => {
        if (!currentUser) return;
        
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
            address: formData.address,
            petsAllowed: formData.petsAllowed,
            subscriptionDurationHours: formData.subscriptionDurationHours,
            isActive: false, 
            isAvailable: true,
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
        setIsMicromobilityRegistrationOpen(false);
        setIsMicromobilityChatOpen(true); 
        
        audioService.playConfirmationSound();
        showNotification(`Registro recibido. Completa la activación en el Nexo para aparecer en el mapa.`, "info");
        
        const price = formData.subscriptionDurationHours * 1000;
        setCurrentUser(prev => prev ? ({ ...prev, tokens: prev.tokens - price }) : null);
    };

    const handleToggleAvailability = (serviceId: string) => {
        setMicromobilityServices(prev => prev.map(s => 
            s.id === serviceId ? { ...s, isAvailable: !s.isAvailable } : s
        ));
        audioService.playHighlightSound();
    };

    const handleToggleOccupied = (serviceId: string) => {
        setMicromobilityServices(prev => prev.map(s => 
            s.id === serviceId ? { ...s, isOccupied: !s.isOccupied } : s
        ));
        audioService.playHighlightSound();
    };

    const handleConfirmPayment = (serviceId: string) => {
        setMicromobilityServices(prev => prev.map(s => {
            if (s.id === serviceId) {
                const expiry = Date.now() + (s.subscriptionDurationHours * 3600000);
                return { ...s, isPendingPayment: false, isActive: true, subscriptionExpiryTimestamp: expiry };
            }
            return s;
        }));
        showNotification("¡Unidad activada y desplegada en el mapa!", "success");
        audioService.playConfirmationSound();
    };

    const handleSetRoute = useCallback(async (origin: Coordinates, destination: Coordinates, travelMode: TravelMode) => {
        setIsRouteLoading(true);
        setAiRouteSummary(null);
        const result = await fetchRoute(origin, destination, travelMode);
        setRouteResult(result);
        setIsRouteLoading(false);

        if (result.error) {
            showNotification(result.error, 'error');
        } else {
            setIsAiSummaryLoading(true);
            try {
                const originAddress = await getAddressFromCoordinates(origin) || `${origin.lat}, ${origin.lng}`;
                const destinationAddress = await getAddressFromCoordinates(destination) || `${destination.lat}, ${destination.lng}`;
                const routeInfo = `Duración: ${result.duration}, Distancia: ${result.distance}.`;
                const userReportsContext = reports.slice(0, 5).map(r => `${REPORT_TYPE_TRANSLATIONS[r.type]}: ${r.description}`).join(' | ');

                const summary = await getAiRouteSummary(originAddress, destinationAddress, routeInfo, userReportsContext);
                setAiRouteSummary(summary);
            } catch (error: any) {
                setAiRouteSummary(`⚠️ Resumen IA no disponible.`);
            } finally {
                setIsAiSummaryLoading(false);
            }
        }
    }, [reports, showNotification]);

    const handleClearRoute = () => {
        setRouteResult(null);
        setAiRouteSummary(null);
        setCurrentNavigation(null);
    };

    const handleNavigateToStop = useCallback((stopLocation: Coordinates) => {
        if (!userLocation) {
            showNotification(t('locationRequiredForRoute'), 'error');
            return;
        }
        handleSetRoute(userLocation, stopLocation, 'WALK');
        audioService.playHighlightSound();
    }, [userLocation, handleSetRoute, showNotification, t]);

    // REAL USER COUNT: Based on mock community + registered pilots + current user
    const realConnectedUsers = micromobilityServices.length + 1;

    // HUB STATUS LOGIC: Should show exact pilot count instead of just binary status
    const activePilotsCount = micromobilityServices.filter(s => s.isActive && s.isAvailable && !s.isOccupied).length;
    const hasAnyPilotActive = activePilotsCount > 0;

    useEffect(() => {
        document.body.className = `theme-${theme}`;
        document.documentElement.style.fontSize = `${fontSize}px`;
    }, [theme, fontSize]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
                (error) => console.warn(`GPS Error: ${error.message}`),
                { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 }
            );
        }
    }, []);

    useEffect(() => {
        const savedUser = localStorage.getItem('uppa-user');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));
    }, []);

    useEffect(() => {
        if (userLocation) getWeather(userLocation).then(setWeather);
    }, [userLocation]);

    if (!currentUser) return <LoginPage onLogin={handleLogin} />;

    // ONLY SHOW ACTIVE PILOTS ON THE SIDEBAR/MAP (EXCLUDING MYSELF FOR REQUESTS)
    const availableMicromobilityServices = micromobilityServices.filter(s => s.isActive && s.isAvailable && !s.isOccupied && s.providerId !== currentUser.id);
    
    const busEntries = Object.values(buses) as Bus[];
    const totalBusPages = Math.ceil(busEntries.length / ITEMS_PER_PAGE_BUSES);
    const paginatedBuses = busEntries.slice((busCurrentPage - 1) * ITEMS_PER_PAGE_BUSES, busCurrentPage * ITEMS_PER_PAGE_BUSES);

    return (
        <div id="app-container" className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-inter">
            <Navbar
                appName="UppA"
                currentUser={currentUser}
                onLogout={handleLogout}
                onOpenRanking={() => {}}
                connectedUsersCount={realConnectedUsers}
                onFocusUserLocation={() => userLocation && setMapCenter(userLocation)}
                onToggleMicromobilityModal={() => setIsMicromobilityChatOpen(true)}
                onToggleDonationModal={() => setIsDonationModalOpen(true)}
                isTopRanked={false}
                onTogglePanel={handleTogglePanel}
                isPanelVisible={isPanelVisible}
            />

            <main className="flex-grow flex relative overflow-hidden">
                <aside className={`control-deck bg-slate-900/60 backdrop-blur-xl border-r border-white/5 transition-all duration-500 ease-in-out ${isPanelVisible ? 'w-full max-w-[400px]' : 'w-0'} flex flex-col overflow-hidden z-20`}>
                    <div className="flex-grow overflow-y-auto scrollbar-thin p-4 space-y-4">
                        <LocationDashboard 
                            busLineName={selectedBusLineId ? MOCK_BUS_LINES[selectedBusLineId].lineName : "Red Urbana"}
                            data={{ weather, reports, schedule: null }} 
                        />
                        
                        <CollapsibleSection title="Planificación de Misión" icon="fas fa-route" defaultOpen={false}>
                            <TripPlanner onSetRoute={handleSetRoute} onClearRoute={handleClearRoute} isRouteLoading={isRouteLoading} />
                        </CollapsibleSection>

                        <CollapsibleSection title="Líneas de Colectivos" icon="fas fa-bus-alt" defaultOpen={true}>
                            <div className="space-y-3">
                                {paginatedBuses.map(bus => (
                                    <BusCard
                                        key={bus.id}
                                        bus={bus}
                                        onSelect={() => handleSelectBusLine(bus.id)}
                                        isSelected={selectedBusLineId === bus.id}
                                        onReport={handleOpenReportModal}
                                        details={selectedBusLineId === bus.id ? BUS_LINE_ADDITIONAL_INFO[bus.id] : null}
                                        isFavorite={currentUser!.favoriteBusLineIds.includes(bus.id)}
                                        onToggleFavorite={() => {
                                            const isFav = currentUser!.favoriteBusLineIds.includes(bus.id);
                                            const updated = isFav 
                                                ? currentUser!.favoriteBusLineIds.filter(id => id !== bus.id)
                                                : [...currentUser!.favoriteBusLineIds, bus.id];
                                            const updatedUser = { ...currentUser!, favoriteBusLineIds: updated };
                                            setCurrentUser(updatedUser);
                                            localStorage.setItem('uppa-user', JSON.stringify(updatedUser));
                                        }}
                                        onFindRouteToStop={handleNavigateToStop}
                                        onTriggerApm={() => {}}
                                    />
                                ))}
                                <PaginationBar currentPage={busCurrentPage} totalPages={totalBusPages} onPageChange={setBusCurrentPage} label="Fase" />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Nexo de Comunicación" icon="fas fa-satellite-dish" defaultOpen={isMicromobilitySectionOpen}>
                            <div className="space-y-4">
                                <MicromobilityChat 
                                    isOpen={true}
                                    onToggle={() => setIsMicromobilitySectionOpen(!isMicromobilitySectionOpen)}
                                    hasAvailableServices={hasAnyPilotActive}
                                    activePilotsCount={activePilotsCount}
                                    onOpenChat={() => setIsMicromobilityChatOpen(true)}
                                    onOpenRegistration={() => setIsMicromobilityRegistrationOpen(true)}
                                />
                                <AvailableServices
                                    services={availableMicromobilityServices}
                                    currentUser={currentUser}
                                    serviceToConfirm={null}
                                    confirmationCountdown={0}
                                    onInitiateRequest={handleInitiateRequest}
                                    onCancelRequest={() => {}}
                                />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Rankings de Honor" icon="fas fa-trophy">
                            <RankingTable services={micromobilityServices} currentUser={currentUser} />
                        </CollapsibleSection>
                    </div>
                </aside>

                <div className="flex-grow relative z-10 bg-slate-900">
                    <MapDisplay
                        center={mapCenter}
                        zoom={DEFAULT_MAP_ZOOM}
                        buses={buses}
                        busStops={busStops}
                        reports={reports}
                        micromobilityServices={micromobilityServices}
                        selectedBusLineId={selectedBusLineId}
                        userLocation={userLocation}
                        routeResult={routeResult}
                        isNavigating={!!currentNavigation}
                        serviceToConfirm={null}
                        onInitiateRequest={handleInitiateRequest}
                        onSelectBusStop={() => {}}
                        onNavigateToStopLocation={handleNavigateToStop}
                    />
                </div>
            </main>

            <AccessibilityControls />
            {notification && <ErrorToast notification={notification} onClose={() => setNotification(null)} />}
            
            <MicromobilityChatModal 
                isOpen={isMicromobilityChatOpen}
                onClose={() => setIsMicromobilityChatOpen(false)}
                messages={globalChatMessages}
                currentUser={currentUser}
                onSendMessage={handleSendGlobalChatMessage}
                privateChats={privateChats}
                onSendPrivateMessage={handleSendPrivateMessage}
                services={micromobilityServices}
                onOpenRegistration={() => {
                    setIsMicromobilityChatOpen(false);
                    setIsMicromobilityRegistrationOpen(true);
                }}
                onToggleAvailability={handleToggleAvailability}
                onToggleOccupied={handleToggleOccupied}
                onConfirmPayment={handleConfirmPayment}
            />

            <Modal isOpen={isMicromobilityRegistrationOpen} onClose={() => setIsMicromobilityRegistrationOpen(false)} title="Unirse a la Flota">
                <MicromobilityRegistrationModal 
                    currentUser={currentUser}
                    userLocation={userLocation}
                    onSubmit={handleServiceRegistration}
                    onClose={() => setIsMicromobilityRegistrationOpen(false)}
                />
            </Modal>

            <Modal isOpen={isDonationModalOpen} onClose={() => setIsDonationModalOpen(false)} title="Apoya a UppA">
                <div className="text-center space-y-4">
                    <p className="text-slate-300">UppA es una red construida por la comunidad.</p>
                    <div className="p-4 bg-slate-800 rounded-lg border border-cyan-500/30">
                        <h4 className="text-cyan-400 font-bold">Alias de Mercado Pago</h4>
                        <p className="text-2xl font-mono text-white mt-1">{UPPA_MERCADO_PAGO_ALIAS}</p>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isReportModalOpen} onClose={handleCloseReportModal} title="Transmitir Intel">
                <ReportForm busLineId={selectedBusLineId || ""} currentUser={currentUser} onSubmit={handleSubmitReport} onClose={handleCloseReportModal} />
            </Modal>
        </div>
    );
};

export default App;
