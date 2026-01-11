"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type VideoSourceType = 'file' | 'stream' | 'rtsp';

interface VideoContextType {
    videoUrl: string | null;
    setVideoUrl: (url: string | null) => void;

    videoType: VideoSourceType;
    setVideoType: (type: VideoSourceType) => void;

    videoStream: MediaStream | null;
    setVideoStream: (stream: MediaStream | null) => void;

    videoConfig: { url?: string; name?: string } | null;
    setVideoConfig: (config: { url?: string; name?: string } | null) => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoType, setVideoType] = useState<VideoSourceType>('file');
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
    const [videoConfig, setVideoConfig] = useState<{ url?: string; name?: string } | null>(null);

    return (
        <VideoContext.Provider value={{
            videoUrl, setVideoUrl,
            videoType, setVideoType,
            videoStream, setVideoStream,
            videoConfig, setVideoConfig
        }}>
            {children}
        </VideoContext.Provider>
    );
}

export function useVideo() {
    const context = useContext(VideoContext);
    if (context === undefined) {
        throw new Error("useVideo must be used within a VideoProvider");
    }
    return context;
}
