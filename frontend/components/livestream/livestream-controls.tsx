"use client";

import { Button } from '@/components/ui/button';
import { Maximize, Minimize, Minus, Plus } from 'lucide-react';
import { ButtonGroup } from '../ui/button-group';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

interface LivestreamControlsProps {
    gridCols: number;
    setGridCols: (cols: number | ((prev: number) => number)) => void;
    isFullscreen: boolean;
    toggleFullscreen: () => void;
}

const HIDE_DELAY_MS = 3000; // 3 seconds before auto-hide
const IDLE_OPACITY = 0;
const ACTIVE_OPACITY = 1;

export function LivestreamControls({
    gridCols,
    setGridCols,
    isFullscreen,
    toggleFullscreen
}: LivestreamControlsProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isIdle, setIsIdle] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset idle timer on any interaction
    const resetIdleTimer = useCallback(() => {
        setIsIdle(false);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setIsIdle(true);
        }, HIDE_DELAY_MS);
    }, []);

    // Initialize idle timer on mount
    useEffect(() => {
        resetIdleTimer();

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [resetIdleTimer]);

    const handleIncreaseCols = () => {
        setGridCols((prev) => Math.min(prev + 1, 6)); // Max 6 columns
        resetIdleTimer();
    };

    const handleDecreaseCols = () => {
        setGridCols((prev) => Math.max(prev - 1, 1)); // Min 1 column
        resetIdleTimer();
    };

    const handleFullscreenToggle = () => {
        toggleFullscreen();
        resetIdleTimer();
    };

    // Determine current opacity based on hover and idle state
    const currentOpacity = isHovered || !isIdle ? ACTIVE_OPACITY : IDLE_OPACITY;

    return (
        <motion.div
            initial={{ opacity: ACTIVE_OPACITY }}
            animate={{ opacity: currentOpacity }}
            transition={{
                duration: isIdle && !isHovered ? 0.3 : 0.15,
                ease: "easeOut"
            }}
            onMouseEnter={() => {
                setIsHovered(true);
                resetIdleTimer();
            }}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={resetIdleTimer}
            className="fixed bottom-4 right-4 z-20"
        >
            <ButtonGroup orientation="horizontal" className="rounded-lg">
                <ButtonGroup orientation="horizontal" className="hidden md:flex">
                    <Button
                        variant="secondary"
                        onClick={handleIncreaseCols}
                        disabled={gridCols >= 6}
                        title="Increase Columns"
                    >
                        <Plus />
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleDecreaseCols}
                        disabled={gridCols <= 1}
                        title="Decrease Columns"
                    >
                        <Minus />
                    </Button>
                </ButtonGroup>
                <ButtonGroup>
                    <Button
                        variant="secondary"
                        onClick={handleFullscreenToggle}
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isFullscreen ? <Minimize /> : <Maximize />}
                    </Button>
                </ButtonGroup>
            </ButtonGroup>
        </motion.div>
    );
}
