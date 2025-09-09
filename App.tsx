import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Bus, BusStop, Report, ChatMessage, UserProfile, Coordinates, ReportType, RouteResult, TravelMode, UppyChatMessage, MicromobilityService, GlobalChatMessage, RatingHistoryEntry, Maneuver, ScheduleDetail
} from './types';
import {
  MOCK_BUS_LINES, MOCK_BUS_STOPS_DATA, DEFAULT_MAP_CENTER, REPORT_TYPE_TRANSLATIONS, BUS_LINE_ADDITIONAL_INFO, DEFAULT_MAP_ZOOM
} from './constants';
import { useSettings } from './contexts/SettingsContext';

// Components
import Navbar from './components/Navbar';
import MapDisplay from './components/MapDisplay';
import { BusCard } from './components/BusCard';
import ChatWindow from './components/ChatWindow';
import Modal from './components/Modal';
import ReportForm from './components/ReportForm';
import LoginPage from './components/LoginPage';
import ErrorToast from './components/ErrorToast';
import TripPlanner from './components/TripPlanner';
import CalculatorModal from './components/CalculatorModal';
import UppyAssistant from './components/UppyAssistant';
import MicromobilityRegistrationModal from './components/MicromobilityRegistrationModal';
import PostTripReviewModal from './components/BusCard';
import MicromobilityChatModal from './components/MicromobilityChatModal';
import OperatorInsightsModal from './components/FloatingMapModal';
import NavigationDisplay from './components/NavigationDisplay';
import AccessibilityControls from './components/AccessibilityControls';
import MicromobilityChat from './components/MicromobilityChat';
import RankingTable from './components/RankingTable';
import LocationDashboard from './components/LocationDashboard';
import PointsOfInterest from './components/PointsOfInterest';
import AvailableServices from './components/AvailableServices';
import TripDetailsPanel from './components/TripDetailsPanel'; // Import the new component
import RequestConfirmationPanel from './components/RequestConfirmationPanel';

// Services
import { getAddressFromCoordinates } from './services/geolocationService';
import { fetchRoute } from './services/routesService';
import { getWeather, getWeatherByLocationName } from './services/mockWeatherService';
import { getUppyResponse, getUppySystemInstruction, getAiRouteSummary } from './services/geminiService';
import { speak, calculateDistance } from './services/navigationService';
import { audioService } from './services/audioService';

const App: React.FC = () => {
    // STATE
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [buses, setBuses] = useState<Record<string, Bus>>(MOCK_BUS_LINES);
    const [busStops] = useState<Record<string, BusStop[]>>(MOCK_BUS_STOPS_DATA);
    const [reports, setReports] = useState<Report[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [globalChatMessages, setGlobalChatMessages] = useState<GlobalChatMessage[]>([]);
    const [privateChats, setPrivateChats] = useState<Record<string, {
        participants: { id: string, name: string }[];
        messages: GlobalChatMessage[];
    }>>({});
    const [micromobilityServices, setMicromobilityServices] = useState<MicromobilityService[]>([]);
    const [selectedBusLineId, setSelectedBusLineId] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [mapCenter, setMapCenter] = useState<Coordinates>(DEFAULT_MAP_CENTER);
    const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
    const [isRouteLoading, setIsRouteLoading] = useState(false);
    const [aiRouteSummary, setAiRouteSummary] = useState<string | null>(null);
    const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
    const [currentNavigation, setCurrentNavigation] = useState<{ steps: Maneuver[]; currentStepIndex: number } | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [distanceToNextManeuver, setDistanceToNextManeuver] = useState(0);
    const [weather, setWeather] = useState({ condition: "Cargando...", temp: 0, icon: "fas fa-spinner fa-spin" });
    const [currentSchedule, setCurrentSchedule] = useState<ScheduleDetail | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(window.innerWidth >= 1024);
    const [serviceToConfirm, setServiceToConfirm] = useState<string | null>(null);
    const [confirmationCountdown, setConfirmationCountdown] = useState(120);
    const [isMicromobilitySectionOpen, setIsMicromobilitySectionOpen] = useState(false);
    const [isRankingOpen, setIsRankingOpen] = useState(false);

    // MODAL STATES
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
    const [isMicromobilityRegistrationOpen, setIsMicromobilityRegistrationOpen] = useState(false);
    const [isMicromobilityChatOpen, setIsMicromobilityChatOpen] = useState(false);
    const [postTripReviewService, setPostTripReviewService] = useState<MicromobilityService | null>(null);
    const [isOperatorInsightsOpen, setIsOperatorInsightsOpen] = useState(false);

    // UPPY ASSISTANT STATE
    const [uppyChatHistory, setUppyChatHistory] = useState<UppyChatMessage[]>([]);
    const [isUppyLoading, setIsUppyLoading] = useState(false);
    const [isUppyVoiceEnabled, setIsUppyVoiceEnabled] = useState(false);
    const [userPreferences, setUserPreferences] = useState<string[]>([]);
    
    const { t, theme, fontSize } = useSettings();
    const countdownIntervalRef = useRef<number | null>(null);

    // HANDLERS
    const showNotification = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
        setNotification({ message, type });
    }, []);

    const handleTogglePanel = () => {
        setIsPanelVisible(prev => !prev);
    };

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

    const handleSendChatMessage = (message: ChatMessage) => {
        setChatMessages(prev => [...prev, message]);
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
                setAiRouteSummary(`⚠️ No se pudo generar el resumen IA: ${error.message}`);
            } finally {
                setIsAiSummaryLoading(false);
            }
        }
    }, [reports, showNotification]);

    const handleClearRoute = () => {
        setRouteResult(null);
        setAiRouteSummary(null);
        endNavigation();
    };

    const handleFindRouteToStop = (stopLocation: Coordinates) => {
        if (userLocation) {
            handleSetRoute(userLocation, stopLocation, 'WALK');
            showNotification("Ruta a la parada trazada. Revisa el Planificador de Misión.", 'info');
        } else {
            showNotification(t('locationRequiredForRoute'), 'error');
        }
    };
    
    const handleNavigateToPOI = (destination: Coordinates, travelMode: TravelMode) => {
        if (userLocation) {
            handleSetRoute(userLocation, destination, travelMode);
            showNotification("Ruta a punto de interés trazada.", 'info');
        } else {
            showNotification(t('locationRequiredForRoute'), 'error');
        }
    };

    const endNavigation = useCallback(() => {
        setCurrentNavigation(null);
    }, []);

    const handleUppySubmit = async (text: string) => {
        const newUserMessage: UppyChatMessage = { role: 'user', text };
        const newHistory = [...uppyChatHistory, newUserMessage];
        setUppyChatHistory(newHistory);
        setIsUppyLoading(true);
    
        const reportSummary = reports.slice(0, 5).map(r => `- ${REPORT_TYPE_TRANSLATIONS[r.type]}: ${r.description}`).join('\n');
        const busLineContext = selectedBusLineId ? `El usuario está viendo la línea ${buses[selectedBusLineId].lineName}.` : "El usuario no tiene una línea de colectivo seleccionada.";
        const preferencesSummary = userPreferences.length > 0 ? userPreferences.map(p => `- ${p}`).join('\n') : "Sin preferencias.";

        try {
            const systemInstruction = getUppySystemInstruction(currentUser?.name || 'Usuario', busLineContext, reportSummary, preferencesSummary);
            
            const contentHistory = newHistory.map(m => ({ role: m.role, parts: [{ text: m.text }] }));

            const response = await getUppyResponse(systemInstruction, contentHistory);
    
            if (response.functionCalls) {
                const functionCall = response.functionCalls[0];
                let functionResponse;

                if (functionCall.name === 'getWeatherForLocation') {
                    const location = functionCall.args.location as string;
                    const weatherData = await getWeatherByLocationName(location);
                    functionResponse = {
                        functionResponse: { name: 'getWeatherForLocation', response: { name: 'getWeatherForLocation', content: weatherData } }
                    };
                } else if (functionCall.name === 'saveUserPreference') {
                    const preference = functionCall.args.preference as string;
                    setUserPreferences(prev => [...new Set([...prev, preference])]);
                    functionResponse = {
                        functionResponse: { name: 'saveUserPreference', response: { name: 'saveUserPreference', content: { success: true, message: `Preferencia '${preference}' guardada.` } } }
                    };
                }
                
                if (functionResponse) {
                    const historyWithFuncCall = [...contentHistory, { role: 'model', parts: [{ functionCall }] }];
                    const historyWithFuncResponse = [...historyWithFuncCall, functionResponse];
                    const finalResponse = await getUppyResponse(systemInstruction, historyWithFuncResponse);
                    setUppyChatHistory(prev => [...prev, { role: 'model', text: finalResponse.text }]);
                }
            } else {
                 setUppyChatHistory(prev => [...prev, { role: 'model', text: response.text }]);
            }

        } catch (error: any) {
            setUppyChatHistory(prev => [...prev, { role: 'model', text: `Lo siento, tuve un problema: ${error.message}` }]);
        } finally {
            setIsUppyLoading(false);
        }
    };

    const handleRegisterMicromobilityService = (formData: Omit<MicromobilityService, 'id' | 'providerId' | 'providerName' | 'isActive' | 'isAvailable' | 'isOccupied' | 'isPendingPayment' | 'rating' | 'numberOfRatings' | 'totalRatingPoints' | 'completedTrips' | 'avgPunctuality' | 'avgSafety' | 'avgCleanliness' | 'avgKindness' | 'ecoScore' | 'ratingHistory' | 'subscriptionExpiryTimestamp'>) => {
        if (!currentUser) return;
        
        const newService: MicromobilityService = {
            id: `ms-${Date.now()}`,
            providerId: currentUser.id, providerName: currentUser.name, ...formData,
            isActive: false, isAvailable: false, isOccupied: false, isPendingPayment: true,
            rating: 0, numberOfRatings: 0, totalRatingPoints: 0, completedTrips: 0,
            avgPunctuality: 0, avgSafety: 0, avgCleanliness: 0, avgKindness: 0, ecoScore: 0,
            ratingHistory: [], subscriptionExpiryTimestamp: null,
        };
        setMicromobilityServices(prev => [...prev, newService]);
        showNotification("Servicio registrado. Actívalo desde el Nexo para ser visible.", "success");
        setIsMicromobilityRegistrationOpen(false);
    };
    
    const handleConfirmPayment = (serviceId: string) => {
        setMicromobilityServices(prev => prev.map(s => {
            if (s.id === serviceId) {
                showNotification(`Servicio "${s.serviceName}" activado. ¡Ahora eres visible en la red!`, 'success');
                return {
                    ...s,
                    isPendingPayment: false,
                    isActive: true,
                    isAvailable: true, 
                    subscriptionExpiryTimestamp: Date.now() + (s.subscriptionDurationHours * 60 * 60 * 1000),
                };
            }
            return s;
        }));
         if (currentUser) {
            setCurrentUser(prev => prev ? ({ ...prev, xp: prev.xp + 50 }) : null);
        }
    };

    const handleToggleFavorite = (busLineId: string) => {
        if (!currentUser) return;
        const isFav = currentUser.favoriteBusLineIds.includes(busLineId);
        const updatedFavorites = isFav 
            ? currentUser.favoriteBusLineIds.filter(id => id !== busLineId)
            : [...currentUser.favoriteBusLineIds, busLineId];
        setCurrentUser({ ...currentUser, favoriteBusLineIds: updatedFavorites });
    };

    const handleToggleAvailability = (serviceId: string) => {
        setMicromobilityServices(prev => prev.map(s => s.id === serviceId ? { ...s, isAvailable: !s.isAvailable, isOccupied: false } : s));
    };

    const handleToggleOccupied = (serviceId: string, currentUserId: string) => {
        setMicromobilityServices(prev => prev.map(s => {
            if (s.id === serviceId) {
                const wasOccupied = s.isOccupied;
                const updatedService = { ...s, isOccupied: !s.isOccupied };
                if (wasOccupied) { 
                    updatedService.completedTrips += 1;
                    const passengerId = 'simulated_passenger_id'; 
                    if (passengerId !== currentUserId) {
                        setPostTripReviewService(updatedService);
                    }
                }
                return updatedService;
            }
            return s;
        }));
    };

    const handleInitiateRequest = (serviceId: string) => {
        if (serviceToConfirm) return;
        setServiceToConfirm(serviceId); // This is the service being requested by the user
        setConfirmationCountdown(120);
    };

    const handleCancelRequest = useCallback(() => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        setServiceToConfirm(null);
        setConfirmationCountdown(120);
    }, []);
    
    const handleSubmitReview = (review: Omit<RatingHistoryEntry, 'userId' | 'timestamp' | 'sentiment'>) => {
        if (!postTripReviewService) return;
        const serviceId = postTripReviewService.id;

        setMicromobilityServices(prev => prev.map(s => {
            if (s.id === serviceId) {
                const newTotalRatings = s.numberOfRatings + 1;
                const newTotalPoints = s.totalRatingPoints + review.overallRating;
                const newHistoryEntry: RatingHistoryEntry = { ...review, userId: currentUser?.id || 'unknown', timestamp: Date.now(), sentiment: 'unknown' };

                return {
                    ...s,
                    numberOfRatings: newTotalRatings,
                    totalRatingPoints: newTotalPoints,
                    rating: newTotalPoints / newTotalRatings,
                    avgPunctuality: ((s.avgPunctuality * s.numberOfRatings) + review.scores.punctuality) / newTotalRatings,
                    avgSafety: ((s.avgSafety * s.numberOfRatings) + review.scores.safety) / newTotalRatings,
                    avgCleanliness: ((s.avgCleanliness * s.numberOfRatings) + review.scores.cleanliness) / newTotalRatings,
                    avgKindness: ((s.avgKindness * s.numberOfRatings) + review.scores.kindness) / newTotalRatings,
                    ratingHistory: [...s.ratingHistory, newHistoryEntry],
                };
            }
            return s;
        }));

        setPostTripReviewService(null);
        showNotification("Gracias por tu evaluación. Tu feedback mejora la red.", "success");
    };

    // USEEFFECTS
    useEffect(() => {
        document.body.className = `theme-${theme}`;
        document.documentElement.style.fontSize = `${fontSize}px`;
    }, [theme, fontSize]);

    useEffect(() => { // Responsive Panel Visibility
        const handleResize = () => { setIsPanelVisible(window.innerWidth >= 1024); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => { // Geolocation Watcher
        let watchId: number;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                },
                (error) => console.error("Error watching position:", error.message),
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
            );
        }
        return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
    }, []);

    useEffect(() => { // Simulate bus movement
        const interval = setInterval(() => {
            setBuses(prevBuses => {
                const newBuses = { ...prevBuses };
                Object.keys(newBuses).forEach(busId => {
                    const bus = newBuses[busId];
                    const stops = busStops[busId];
                    if (!stops || stops.length < 2) return;
                    const currentStopIndex = stops.findIndex(s => s.location.lat === bus.currentLocation.lat && s.location.lng === bus.currentLocation.lng);
                    const nextStopIndex = (currentStopIndex + 1) % stops.length;
                    const nextStop = stops[nextStopIndex];
                    const latDiff = (nextStop.location.lat - bus.currentLocation.lat) * 0.1;
                    const lngDiff = (nextStop.location.lng - bus.currentLocation.lng) * 0.1;
                    let newLat = bus.currentLocation.lat + latDiff;
                    let newLng = bus.currentLocation.lng + lngDiff;
                    if (calculateDistance({lat: newLat, lng: newLng}, nextStop.location) < 20) {
                        newLat = nextStop.location.lat;
                        newLng = nextStop.location.lng;
                    }
                    newBuses[busId] = { ...bus, currentLocation: { lat: newLat, lng: newLng } };
                });
                return newBuses;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, [busStops]);

    useEffect(() => { // Load user from localStorage
        const savedUser = localStorage.getItem('uppa-user');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));
    }, []);

    useEffect(() => { // Fetch weather
        if (userLocation) getWeather(userLocation).then(setWeather);
    }, [userLocation]);

    useEffect(() => { // Navigation updates
        if (!currentNavigation || !userLocation) return;
        const interval = setInterval(() => {
            const { steps, currentStepIndex } = currentNavigation;
            if (!steps[currentStepIndex]) return;
            const nextStep = steps[currentStepIndex];
            const distance = calculateDistance(userLocation, nextStep.location);
            setDistanceToNextManeuver(distance);
            if (distance < 20) {
                const newStepIndex = currentStepIndex + 1;
                if (newStepIndex < steps.length) {
                    setCurrentNavigation({ steps, currentStepIndex: newStepIndex });
                    if (!isMuted) speak(steps[newStepIndex].instruction);
                } else {
                    endNavigation();
                    showNotification("Has llegado a tu destino.", "success");
                }
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [currentNavigation, userLocation, isMuted, endNavigation, showNotification]);

     useEffect(() => { // Request Countdown Timer
        if (serviceToConfirm) {
            countdownIntervalRef.current = window.setInterval(() => {
                setConfirmationCountdown(prev => {
                    if (prev <= 1) {
                        const confirmedService = micromobilityServices.find(s => s.id === serviceToConfirm);
                        if (confirmedService && currentUser) {
                            setMicromobilityServices(currServices => currServices.map(s => 
                                s.id === serviceToConfirm ? { ...s, isOccupied: true, isAvailable: false } : s
                            ));

                            setPrivateChats(prevChats => ({
                                ...prevChats,
                                [confirmedService.id]: {
                                    participants: [
                                        { id: currentUser.id, name: currentUser.name },
                                        { id: confirmedService.providerId, name: confirmedService.providerName }
                                    ],
                                    messages: []
                                }
                            }));

                            showNotification(`Servicio con ${confirmedService.providerName} confirmado. Se ha abierto un chat privado.`, 'success');
                        }
                        handleCancelRequest();
                        return 0;                        
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [serviceToConfirm, handleCancelRequest, showNotification, micromobilityServices, currentUser]);

    const isTopRanked = useMemo(() => {
        if (!currentUser) return false;
        const sortedServices = micromobilityServices
            .filter(s => s.isActive && s.numberOfRatings > 0)
            .sort((a, b) => b.rating - a.rating);
        return sortedServices.slice(0, 5).some(s => s.providerId === currentUser.id);
    }, [micromobilityServices, currentUser]);

    if (!currentUser) {
        return <LoginPage onLogin={handleLogin} />;
    }

    return (
        <div className="bg-ps-dark-bg text-gray-200 min-h-screen flex flex-col font-sans">
            <Navbar
                appName="UppA"
                currentUser={currentUser}
                onLogout={handleLogout}
                onOpenRanking={() => setIsRankingOpen(prev => !prev)}
                connectedUsersCount={137}
                onFocusUserLocation={() => userLocation && setMapCenter(userLocation)}
                onToggleMicromobilityModal={() => setIsMicromobilityChatOpen(prev => !prev)}
                isTopRanked={isTopRanked}
                onTogglePanel={handleTogglePanel}
                isPanelVisible={isPanelVisible}
            />

            <main className="flex-grow flex relative overflow-hidden">
                {isPanelVisible && <div onClick={handleTogglePanel} className="fixed lg:hidden inset-0 bg-black/60 z-30" aria-hidden="true" />}
                <div className={`${isPanelVisible ? 'translate-x-0' : '-translate-x-full'} absolute lg:relative top-0 left-0 h-full lg:h-auto w-[90%] max-w-[400px] lg:w-[400px] flex-shrink-0 bg-ps-dark-bg p-4 z-40 lg:z-auto flex flex-col gap-4 overflow-y-auto scrollbar-thin transition-transform duration-300 ease-in-out lg:translate-x-0`}>
                    {selectedBusLineId && buses[selectedBusLineId] ? (
                         <BusCard
                            bus={buses[selectedBusLineId]}
                            onSelect={() => {}} isSelected={true} onReport={handleOpenReportModal}
                            details={BUS_LINE_ADDITIONAL_INFO[selectedBusLineId] || null}
                            isFavorite={currentUser.favoriteBusLineIds.includes(selectedBusLineId)}
                            onToggleFavorite={() => handleToggleFavorite(selectedBusLineId)}
                            onFindRouteToStop={handleFindRouteToStop}
                        >
                          <ChatWindow
                              busLineId={selectedBusLineId}
                              messages={chatMessages.filter(m => m.busLineId === selectedBusLineId)}
                              currentUser={currentUser} onSendMessage={handleSendChatMessage}
                              onSendReportFromChat={() => {}}
                              onToggleCalculator={() => setIsCalculatorModalOpen(true)}
                          />
                        </BusCard>
                    ) : (
                        <div className="ps-card p-4">
                            <h3 className="text-xl font-orbitron text-blue-300">Selecciona una Línea</h3>
                            <div className="space-y-2 mt-2">
                                {Object.values(buses).map(bus => (
                                     <BusCard
                                        key={bus.id} bus={bus} onSelect={() => handleSelectBusLine(bus.id)}
                                        isSelected={false} onReport={() => {}} details={null}
                                        isFavorite={currentUser.favoriteBusLineIds.includes(bus.id)}
                                        onToggleFavorite={() => handleToggleFavorite(bus.id)}
                                        onFindRouteToStop={handleFindRouteToStop}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <TripPlanner onSetRoute={handleSetRoute} onClearRoute={handleClearRoute} isRouteLoading={isRouteLoading} />
                    <UppyAssistant currentUser={currentUser} chatHistory={uppyChatHistory} isLoading={isUppyLoading} isVoiceEnabled={isUppyVoiceEnabled} onSubmit={handleUppySubmit} onToggleVoice={setIsUppyVoiceEnabled} />
                    <AvailableServices services={micromobilityServices.filter(s => s.isActive && s.isAvailable && !s.isOccupied)} currentUser={currentUser} serviceToConfirm={serviceToConfirm} confirmationCountdown={confirmationCountdown} onInitiateRequest={handleInitiateRequest} onCancelRequest={handleCancelRequest} />
                    <PointsOfInterest onNavigate={handleNavigateToPOI} />
                </div>

                <div className="flex-grow min-w-0 h-full p-4">
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
                        onSelectBusStop={() => {}}
                        onNavigateToStopLocation={handleFindRouteToStop}
                        serviceToConfirm={serviceToConfirm}
                        onInitiateRequest={handleInitiateRequest}
                    />
                     {currentNavigation && (
                        <NavigationDisplay
                            currentStep={currentNavigation.steps[currentNavigation.currentStepIndex]}
                            onEndNavigation={endNavigation} isMuted={isMuted} onToggleMute={() => setIsMuted(prev => !prev)}
                            distanceToNextManeuver={distanceToNextManeuver}
                        />
                    )}
                </div>
            </main>
            
            {routeResult && !routeResult.error && (
                <TripDetailsPanel
                    routeResult={routeResult}
                    aiRouteSummary={aiRouteSummary}
                    isLoading={isRouteLoading || isAiSummaryLoading}
                    onClearRoute={handleClearRoute}
                    onReport={handleOpenReportModal}
                    selectedBusLineId={selectedBusLineId}
                />
            )}

            <Modal isOpen={isReportModalOpen} onClose={handleCloseReportModal} title="Transmitir Intel">
                {selectedBusLineId && <ReportForm busLineId={selectedBusLineId} currentUser={currentUser} onSubmit={handleSubmitReport} onClose={handleCloseReportModal} />}
            </Modal>
            <CalculatorModal isOpen={isCalculatorModalOpen} onClose={() => setIsCalculatorModalOpen(false)} />
            <MicromobilityChatModal 
                isOpen={isMicromobilityChatOpen} 
                onClose={() => setIsMicromobilityChatOpen(false)} 
                messages={globalChatMessages} 
                currentUser={currentUser} 
                onSendMessage={handleSendGlobalChatMessage}
                privateChats={privateChats}
                onSendPrivateMessage={handleSendPrivateMessage}
                services={micromobilityServices}
                onOpenRegistration={() => setIsMicromobilityRegistrationOpen(true)}
                onToggleAvailability={handleToggleAvailability}
                onToggleOccupied={(serviceId) => handleToggleOccupied(serviceId, currentUser.id)}
                onConfirmPayment={handleConfirmPayment}
             />
            <Modal isOpen={isMicromobilityRegistrationOpen} onClose={() => setIsMicromobilityRegistrationOpen(false)} title="Registrar Servicio de Micromovilidad">
                <MicromobilityRegistrationModal currentUser={currentUser} onSubmit={handleRegisterMicromobilityService} onClose={() => setIsMicromobilityRegistrationOpen(false)} />
            </Modal>
            <OperatorInsightsModal isOpen={isOperatorInsightsOpen} onClose={() => setIsOperatorInsightsOpen(false)} services={micromobilityServices} />
            {postTripReviewService && <PostTripReviewModal isOpen={!!postTripReviewService} onClose={() => setPostTripReviewService(null)} onSubmit={handleSubmitReview} service={postTripReviewService} currentUser={currentUser} />}
            {serviceToConfirm && micromobilityServices.find(s => s.id === serviceToConfirm) && (
                <RequestConfirmationPanel
                    service={micromobilityServices.find(s => s.id === serviceToConfirm)!}
                    countdown={confirmationCountdown}
                    onCancel={handleCancelRequest}
                />
            )}
            {notification && <ErrorToast notification={notification} onClose={() => setNotification(null)} />}
            <AccessibilityControls />
        </div>
    );
};

export default App;