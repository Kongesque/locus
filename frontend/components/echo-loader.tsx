'use client';

import { motion } from 'framer-motion';
import { EchoLayerInner, EchoLayerMiddle, EchoLayerOuter } from '@/components/svg/echo';

interface EchoLoaderProps {
    className?: string;
    size?: number;
    duration?: number;
}

export default function EchoLoader({ className, size = 64, duration = 2 }: EchoLoaderProps) {

    const config = {
        // We use a custom cubic-bezier for that "Apple" feel
        // This is smoother than a standard easeInOut; it lingers at the peaks
        ease: [0.4, 0, 0.2, 1] as const,

        // Core: Stays more present to maintain brand recognition
        coreOpacity: [0.85, 1, 0.85],

        // Mid: A very subtle "pulse" that suggests internal processing
        midScale: [1, 1.04, 1],

        // Outer: The "Aura" that expands to show the reach of the AI
        outerScale: [1, 1.12, 1],
    };

    return (
        <div
            className={`relative text-primary ${className ?? ''}`}
            style={{ width: size, height: size }}
        >
            {/* Layer 1: Core - Static Pulse */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ opacity: config.coreOpacity }}
                transition={{ duration, repeat: Infinity, ease: config.ease }}
            >
                <EchoLayerInner className="w-full h-full" />
            </motion.div>

            {/* Layer 2: Middle - Clockwise Breathing */}
            <motion.div
                className="absolute inset-0"
                animate={{
                    rotate: 360,
                    scale: config.midScale,
                }}
                transition={{
                    duration,
                    repeat: Infinity,
                    ease: config.ease,
                }}
            >
                <EchoLayerMiddle className="w-full h-full" />
            </motion.div>

            {/* Layer 3: Outer - Anti-Clockwise Breathing */}
            <motion.div
                className="absolute inset-0"
                animate={{
                    rotate: -360,
                    scale: config.outerScale,
                }}
                transition={{
                    duration,
                    repeat: Infinity,
                    ease: config.ease,
                }}
            >
                <EchoLayerOuter className="w-full h-full" />
            </motion.div>
        </div>
    );
}