import React, { useState, useEffect } from 'react';

const Compass: React.FC = () => {
    const [heading, setHeading] = useState<number>(0);
    const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');

    const handleOrientation = (event: DeviceOrientationEvent) => {
        // webkitCompassHeading is for iOS, 360 - alpha is a common fallback for other devices.
        const compassHeading = (event as any).webkitCompassHeading || (360 - (event.alpha ?? 0));
        if (compassHeading !== null) {
            setHeading(compassHeading);
        }
    };

    const requestPermission = async () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const response = await (DeviceOrientationEvent as any).requestPermission();
                if (response === 'granted') {
                    setPermissionState('granted');
                    window.addEventListener('deviceorientation', handleOrientation, true);
                } else {
                    setPermissionState('denied');
                }
            } catch (error) {
                console.error("Error requesting device orientation permission:", error);
                setPermissionState('denied');
            }
        } else {
            // For other browsers that support the event without explicit permission requests (requires HTTPS).
            setPermissionState('granted');
            window.addEventListener('deviceorientation', handleOrientation, true);
        }
    };

    useEffect(() => {
        // Check for basic support right away.
        if (!window.DeviceOrientationEvent) {
            setPermissionState('unsupported');
            return;
        }

        // Cleanup the event listener when the component unmounts.
        return () => {
            window.removeEventListener('deviceorientation', handleOrientation, true);
        };
    }, []);

    const renderCompassContent = () => {
        switch (permissionState) {
            case 'prompt':
                return (
                    <button
                        onClick={requestPermission}
                        className="w-full h-full flex flex-col items-center justify-center text-center ps-button bg-slate-800/80 border-cyan-500/50 rounded-full"
                        title="Activar Brújula"
                    >
                        <i className="fas fa-compass text-2xl mb-1"></i>
                        <span className="text-xs">Activar</span>
                    </button>
                );
            case 'denied':
            case 'unsupported':
                return (
                    <div className="w-full h-full flex items-center justify-center bg-red-900/50 rounded-full" title="Brújula no disponible">
                        <i className="fas fa-compass-slash text-2xl text-red-400"></i>
                    </div>
                );
            case 'granted':
                return (
                    <>
                        {/* Needle pointing North */}
                        <div
                            className="absolute top-1/2 left-1/2 w-1 h-8 bg-red-500 origin-bottom rounded-t-full transition-transform duration-500 ease-in-out z-20"
                            style={{
                                transform: `translateX(-50%) rotate(${heading}deg) translateY(-100%)`,
                                boxShadow: '0 0 8px rgba(255, 0, 0, 0.8)',
                            }}
                        />
                         {/* Rose that rotates with the device */}
                        <div className="w-full h-full transition-transform duration-500 ease-in-out" style={{ transform: `rotate(-${heading}deg)` }}>
                            {/* Cardinal Points */}
                            <span className="absolute top-1 left-1/2 -translate-x-1/2 font-orbitron text-base text-red-500" style={{textShadow: '0 0 4px #f00'}}>N</span>
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 font-orbitron text-sm text-slate-300">S</span>
                            <span className="absolute top-1/2 right-1.5 -translate-y-1/2 font-orbitron text-sm text-slate-300">E</span>
                            <span className="absolute top-1/2 left-1.5 -translate-y-1/2 font-orbitron text-sm text-slate-300">W</span>
                        </div>
                        {/* Center hub icon and degree display */}
                        <i className="fas fa-compass text-cyan-400/70 text-base absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"></i>
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-orbitron text-xs text-cyan-400/80 mt-6 z-20">{Math.round(heading)}°</span>
                    </>
                );
        }
    };

    return (
        <div 
            className="absolute top-4 right-4 z-20 w-24 h-24 bg-slate-900/70 backdrop-blur-sm rounded-full border-2 border-cyan-500/30 shadow-lg"
            style={{
                boxShadow: '0 0 15px var(--ps-glow-soft), inset 0 0 10px rgba(0,0,0,0.6)'
            }}
        >
            {renderCompassContent()}
        </div>
    );
};

export default Compass;