"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { Zone, Point } from "@/utils/types";

interface ZoneCanvasProps {
    frameUrl: string;
    zones: Zone[];
    activeZoneId: string | null;
    maxPoints: number;
    onZonesChange: (zones: Zone[]) => void;
    onPointAdded: (zoneId: string, point: Point) => void;
    onFrameLoaded: (width: number, height: number) => void;
}

function getColorFromClassId(classId: number): string {
    const hue = ((classId * 137.508) % 360);
    return `hsl(${hue}, 85%, 55%)`;
}

export function ZoneCanvas({
    frameUrl,
    zones,
    activeZoneId,
    maxPoints,
    onZonesChange,
    onPointAdded,
    onFrameLoaded,
}: ZoneCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [scale, setScale] = useState(1);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

    // Load the frame image
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            imageRef.current = img;
            setImageLoaded(true);
            onFrameLoaded(img.width, img.height);
        };
        img.src = frameUrl;
    }, [frameUrl, onFrameLoaded]);

    // Calculate scale and offset to fit canvas in container
    const updateCanvasSize = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const img = imageRef.current;

        if (!canvas || !container || !img) return;

        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width - 32;
        const containerHeight = containerRect.height - 32;

        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        const newScale = Math.min(scaleX, scaleY, 1);

        canvas.width = img.width * newScale;
        canvas.height = img.height * newScale;

        setScale(newScale);
    }, []);

    useEffect(() => {
        if (imageLoaded) {
            updateCanvasSize();
            window.addEventListener("resize", updateCanvasSize);
            return () => window.removeEventListener("resize", updateCanvasSize);
        }
    }, [imageLoaded, updateCanvasSize]);

    // Draw canvas content with preview line
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        const img = imageRef.current;

        if (!canvas || !ctx || !img || !imageLoaded) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw all zones
        zones.forEach((zone) => {
            if (zone.points.length === 0) return;

            const isActive = zone.id === activeZoneId;
            const color = getColorFromClassId(zone.classId);

            // Scale points
            const scaledPoints = zone.points.map((p) => ({
                x: p.x * scale,
                y: p.y * scale,
            }));

            // Draw lines between points
            ctx.strokeStyle = color;
            ctx.lineWidth = isActive ? 4 : 3;
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);

            for (let i = 1; i < scaledPoints.length; i++) {
                ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
            }

            // Close polygon if complete
            if (zone.points.length >= maxPoints) {
                ctx.closePath();
            }
            ctx.stroke();

            // Fill with semi-transparent color for complete polygons
            if (zone.points.length >= maxPoints && zone.points.length > 2) {
                ctx.fillStyle = color.replace(")", ", 0.15)").replace("hsl", "hsla");
                ctx.fill();
            }

            // Draw points
            scaledPoints.forEach((point, idx) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, isActive ? 8 : 6, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw point number
                ctx.fillStyle = "#fff";
                ctx.font = "bold 10px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(String(idx + 1), point.x, point.y);
            });

            // Draw zone label
            if (scaledPoints.length > 0) {
                const labelPoint = scaledPoints[0];
                ctx.fillStyle = color;
                ctx.font = "bold 12px sans-serif";
                ctx.textAlign = "left";
                ctx.fillText(zone.label, labelPoint.x + 12, labelPoint.y - 8);
            }
        });

        // Draw preview line following mouse for active zone
        const activeZone = zones.find((z) => z.id === activeZoneId);
        if (activeZone && activeZone.points.length > 0 && activeZone.points.length < maxPoints && mousePos) {
            const color = getColorFromClassId(activeZone.classId);
            const scaledPoints = activeZone.points.map((p) => ({
                x: p.x * scale,
                y: p.y * scale,
            }));

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            ctx.beginPath();
            ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
            for (let i = 1; i < scaledPoints.length; i++) {
                ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
            }
            ctx.lineTo(mousePos.x * scale, mousePos.y * scale);
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }, [zones, activeZoneId, scale, imageLoaded, mousePos, maxPoints]);

    // Redraw on changes
    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    // Handle canvas click
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!activeZoneId) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        const activeZone = zones.find((z) => z.id === activeZoneId);
        if (!activeZone) return;

        if (activeZone.points.length >= maxPoints) return;

        const newPoint = { x: Math.round(x), y: Math.round(y) };
        onPointAdded(activeZoneId, newPoint);
    };

    // Handle mouse move for preview line
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        setMousePos({ x, y });
    };

    // Handle mouse leave
    const handleMouseLeave = () => {
        setMousePos(null);
    };

    // Handle right-click to remove last point
    const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!activeZoneId) return;

        const updatedZones = zones.map((zone) => {
            if (zone.id === activeZoneId && zone.points.length > 0) {
                return {
                    ...zone,
                    points: zone.points.slice(0, -1),
                };
            }
            return zone;
        });

        onZonesChange(updatedZones);
    };

    if (!imageLoaded) {
        return (
            <div className="flex-1 flex items-center justify-center bg-primary-color border border-primary-border rounded-xl">
                <div className="text-secondary-text">Loading frame...</div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center p-4 bg-primary-color border border-primary-border rounded-xl overflow-hidden"
        >
            <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onContextMenu={handleContextMenu}
                className="rounded-lg cursor-crosshair"
                style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
        </div>
    );
}
