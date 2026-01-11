"use client";

import { PageTitle2 } from '@/components/page-title';
import { LiveCard } from '@/components/livestream/live-card';
import { AddCameraDialog } from '@/components/livestream/add-camera-dialog';
import { LivestreamControls } from '@/components/livestream/livestream-controls';
import { useRef, useState, useEffect } from 'react';

interface LivestreamViewProps {
    defaultGridCols?: number;
}

interface Camera {
    id: string;
    name: string;
    status: string;
}

export function LivestreamView({ defaultGridCols = 3 }: LivestreamViewProps) {
    // Grid columns state, initialized from prop
    const [gridCols, setGridCols] = useState(defaultGridCols);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [cameras, setCameras] = useState<Camera[]>([]);
    const gridContainerRef = useRef<HTMLDivElement>(null);

    // Fetch cameras from public/data/events.json
    useEffect(() => {
        fetch('/data/events.json')
            .then(res => res.json())
            .then(data => {
                if (data.cameras) {
                    setCameras(data.cameras);
                }
            })
            .catch(err => console.error("Failed to load cameras:", err));
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            gridContainerRef.current?.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Persist gridCols to cookie whenever it changes
    useEffect(() => {
        document.cookie = `livestream_cols=${gridCols}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
    }, [gridCols]);

    const cardSize = gridCols >= 5 ? 'sm' : gridCols >= 3 ? 'md' : 'lg';

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 relative">
            <div className="flex items-center justify-between">
                <PageTitle2 />
                <AddCameraDialog />
            </div>

            <div
                ref={gridContainerRef}
                className={`relative flex-1 flex flex-col ${isFullscreen ? 'bg-background h-screen w-screen fixed top-0 left-0 z-50 overflow-y-auto' : ''}`}
            >
                <div
                    className={`grid auto-rows-min gap-2 grid-cols-1 md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))] ${isFullscreen ? 'w-full p-4' : ''}`}
                    style={{
                        '--cols': gridCols
                    } as React.CSSProperties}
                >
                    {cameras.map((camera) => (
                        <LiveCard
                            key={camera.id}
                            cameraId={camera.id}
                            cameraName={camera.name}
                            status={camera.status as "live" | "offline" | "connecting"}
                            size={cardSize}
                        />
                    ))}
                </div>

                <LivestreamControls
                    gridCols={gridCols}
                    setGridCols={setGridCols}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                />
            </div>
        </div>
    );
}
