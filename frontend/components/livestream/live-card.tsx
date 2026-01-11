"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import EchoLoader from "@/components/echo-loader"
import { CircleAlert } from "lucide-react"

interface LiveCardProps {
    cameraId: string
    title?: string
    thumbnail?: string
    viewerCount?: number
    status?: "live" | "offline" | "connecting"
    cameraName?: string
    size?: "sm" | "md" | "lg"
    onWatch?: () => void
    onStopStream?: () => void
    onSettings?: () => void
}

export function LiveCard({
    cameraId,
    title = "Live Stream",
    thumbnail = "/zonenet.png",
    status = "live",
    cameraName = "Camera 1",
    size = "md",
}: LiveCardProps) {
    const [currentTime, setCurrentTime] = useState<Date | null>(null)

    useEffect(() => {
        // Set initial time on client mount to avoid hydration mismatch
        setCurrentTime(new Date())

        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        })
    }

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        })
    }

    // Size-based classes
    const textSize = {
        sm: "text-[10px]",
        md: "text-xs",
        lg: "text-sm",
    }

    const iconSize = {
        sm: "size-1",
        md: "size-2",
        lg: "size-3",
    }

    const loaderSize = {
        sm: 32,
        md: 48,
        lg: 64,
    }

    const camPos = {
        sm: "-top-1 left-1",
        md: "top-1 left-2",
        lg: "top-2 left-3",
    }

    const timePos = {
        sm: "-bottom-1 left-1",
        md: "bottom-1 left-2",
        lg: "bottom-3 left-3",
    }

    return (
        <Link href={`/livestream/${cameraId}`} className="group w-full block">
            {/* Thumbnail container with CCTV overlay */}
            <div className="relative overflow-hidden rounded-xl transition-all duration-300 group-hover:rounded-none cursor-pointer">
                <img
                    src={thumbnail}
                    alt={title}
                    className="aspect-video w-full object-cover transition-opacity duration-300 group-hover:opacity-80"
                />

                {/* Camera name badge - top left */}
                <div className={`absolute ${camPos[size]} z-10`}>
                    <span className={`text-white/70 font-mono ${textSize[size]}`}>
                        {cameraName}
                    </span>
                </div>

                {/* Live status indicator - top right */}
                {status === "live" && (
                    <div className="absolute top-2 right-2 z-10">
                        <span className={`relative flex ${iconSize[size]}`}>
                            <span className={`inline-flex rounded-full bg-red-500 animate-pulse ${iconSize[size]}`}></span>
                        </span>
                    </div>
                )}

                {/* Connecting overlay */}
                {status === "connecting" && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1">
                        <EchoLoader size={loaderSize[size]} className="text-white/80" />
                        <span className={`text-white/80 font-medium animate-pulse ${textSize[size]}`}>Connecting...</span>
                    </div>
                )}

                {/* Offline overlay */}
                {status === "offline" && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1">
                        <CircleAlert className="text-white/80" size={loaderSize[size]} />
                        <span className={`text-white/80 font-medium ${textSize[size]}`}>Offline</span>
                    </div>
                )}

                {/* Date & Time overlay - bottom left (hidden when offline) */}
                {status !== "offline" && currentTime && (
                    <div className={`absolute ${timePos[size]} z-10`}>
                        <span className={`text-white/70 font-mono ${textSize[size]}`}>
                            {formatDate(currentTime)} {formatTime(currentTime)}
                        </span>
                    </div>
                )}
            </div>
        </Link>
    )
}
