"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { LoadingOverlay } from "@/components/layout";
import { Download, FileJson, Table, Clock, Users, Activity, BarChart3, Flame, Info } from "lucide-react";
import { BentoGrid, BentoCard } from "@/components/dashboard/BentoGrid";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import DwellTimeChart from "@/components/dashboard/DwellTimeChart";
import PeakTimeChart from "@/components/dashboard/PeakTimeChart";
import HeatmapChart from "@/components/dashboard/HeatmapChart";
import Sparkline from "@/components/dashboard/Sparkline";

export default function ResultPage() {
    const params = useParams();

    const router = useRouter();
    const taskId = params.taskId as string;

    const [analysisTab, setAnalysisTab] = useState<"activity" | "dwell" | "peak" | "info">("activity");
    const [isHeatmapEnabled, setIsHeatmapEnabled] = useState(false);

    const { data: job, isLoading } = useQuery({
        queryKey: ["job", taskId],
        queryFn: () => api.getJob(taskId),
        enabled: !!taskId,
        refetchInterval: (query) => {
            // Poll while processing
            if (query.state.data?.status === "processing") {
                return 1000;
            }
            return false;
        },
    });

    if (isLoading) {
        return <LoadingOverlay message="Loading results..." />;
    }

    if (!job) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-secondary-text">Job not found</p>
            </div>
        );
    }

    if (job.status === "processing") {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="relative w-24 h-24 mb-4">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle
                                className="stroke-gray-400/20"
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                strokeWidth="6"
                            />
                            <circle
                                className="stroke-text-color transition-all duration-300"
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray="264"
                                strokeDashoffset={264 - (job.progress / 100) * 264}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-medium text-text-color tabular-nums">
                                {job.progress}
                            </span>
                        </div>
                    </div>
                    <p className="text-lg font-medium text-text-color">
                        Processing<span className="animate-pulse">...</span>
                    </p>
                </div>
            </div>
        );
    }

    const videoUrl = api.getOutputVideoUrl(taskId);

    // Calculate zone statistics
    const zoneStats: Record<string, { total: number; peak: number }> = {};
    job.detectionData?.forEach((event) => {
        const zoneId = event.zone_id;
        if (!zoneStats[zoneId]) {
            zoneStats[zoneId] = { total: 0, peak: 0 };
        }
        zoneStats[zoneId].total = event.count;
        if (event.count > zoneStats[zoneId].peak) {
            zoneStats[zoneId].peak = event.count;
        }
    });

    return (
        <main className="h-full w-full overflow-hidden bg-background text-text-color p-4">
            <BentoGrid className="grid-cols-12 grid-rows-[auto_1fr]">
                {/* Main Video Tile - Spans 8 cols, aspect-video forces 16:9 height */}
                <BentoCard
                    className="col-span-8 aspect-video p-0"
                    title={job.name || "Video Feed"}
                    icon={<div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                    noScroll
                    noSpacer
                    darkHeader
                >
                    <div className="relative w-full h-full bg-black flex items-center justify-center group">
                        <video
                            src={videoUrl}
                            controls
                            className="w-full h-full object-contain"
                            autoPlay
                            loop
                            muted
                        />
                        {/* Heatmap Overlay */}
                        {isHeatmapEnabled && (
                            <div className="absolute inset-0 pointer-events-none z-10">
                                <HeatmapChart
                                    data={job.heatmapData}
                                    zones={job.zones}
                                    overlay={true}
                                />
                            </div>
                        )}

                    </div>
                </BentoCard>

                {/* Zone Statistics - Spans 4 cols, matches height of video row automatically */}
                <BentoCard
                    className="col-span-4 h-full"
                    title="Zone Analysis"
                    headerAction={
                        <button
                            onClick={() => setIsHeatmapEnabled(!isHeatmapEnabled)}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${isHeatmapEnabled
                                ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                                : "bg-white/5 text-secondary-text border border-white/10 hover:bg-white/10"
                                }`}
                            title="Toggle Heatmap Overlay"
                        >
                            <Flame className="w-3 h-3" />
                            {isHeatmapEnabled ? "Heatmap" : "Heatmap"}
                        </button>
                    }
                >
                    <div className="space-y-2 px-4 pb-4 pt-1">

                        {job.zones?.map((zone) => {
                            const stats = zoneStats[zone.id] || { total: 0, peak: 0 };
                            const isLine = zone.points?.length === 2;
                            const lineCrossing = job.lineCrossingData?.[zone.id];

                            // Calculate avg dwell for this zone
                            const zoneDwellEvents = job.dwellData?.filter(d => d.zone_id === zone.id) || [];
                            const totalDwell = zoneDwellEvents.reduce((acc, curr) => acc + curr.duration, 0);
                            const avgDwell = zoneDwellEvents.length > 0 ? (totalDwell / zoneDwellEvents.length).toFixed(1) : "0.0";

                            return (
                                <div
                                    key={zone.id}
                                    className="bg-white/5 hover:bg-white/10 rounded-md p-3 transition-colors group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ backgroundColor: `rgb(${zone.color?.join(",")})` }}
                                            />
                                            <span className="text-sm font-medium text-text-color/90 truncate max-w-[120px]">
                                                {zone.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sparkline - More subtle */}
                                    <div className="mb-2 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <Sparkline
                                            data={job.detectionData}
                                            zoneId={zone.id}
                                            color={zone.color}
                                            duration={job.processTime || 10}
                                        />
                                    </div>

                                    {isLine && lineCrossing ? (
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] text-secondary-text uppercase tracking-wider mb-0.5">Net Flow</p>
                                                <div className={`text-base font-bold leading-none ${lineCrossing.in - lineCrossing.out > 0 ? 'text-green-400' : lineCrossing.in - lineCrossing.out < 0 ? 'text-red-400' : 'text-text-color'
                                                    }`}>
                                                    {lineCrossing.in - lineCrossing.out > 0 ? '+' : ''}{lineCrossing.in - lineCrossing.out}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex gap-2 text-xs text-secondary-text">
                                                    <span>In: <span className="text-green-400 font-medium">{lineCrossing.in}</span></span>
                                                    <span>Out: <span className="text-red-400 font-medium">{lineCrossing.out}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] text-secondary-text uppercase tracking-wider mb-0.5">Visitors</p>
                                                <p className="text-xl font-bold text-text-color leading-none">
                                                    {stats.total}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-secondary-text uppercase tracking-wider mb-0.5">Avg Time</p>
                                                <span className="text-sm font-medium text-amber-500/90">
                                                    {avgDwell}s
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </BentoCard>

                {/* Analysis Dashboard - Spans 8 cols, fills remaining height */}
                <BentoCard className="col-span-8" noScroll>
                    <div className="flex flex-col h-full w-full">
                        {/* Analysis Tabs */}
                        <div className="flex items-center gap-1 px-4 pt-2 border-b border-primary-border">
                            <button
                                onClick={() => setAnalysisTab("activity")}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${analysisTab === "activity"
                                    ? "border-blue-500 text-blue-500"
                                    : "border-transparent text-secondary-text hover:text-text-color"
                                    }`}
                            >
                                <Activity className="w-3.5 h-3.5" /> Activity
                            </button>
                            <button
                                onClick={() => setAnalysisTab("dwell")}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${analysisTab === "dwell"
                                    ? "border-amber-500 text-amber-500"
                                    : "border-transparent text-secondary-text hover:text-text-color"
                                    }`}
                            >
                                <Clock className="w-3.5 h-3.5" /> Dwell Time
                            </button>
                            <button
                                onClick={() => setAnalysisTab("peak")}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${analysisTab === "peak"
                                    ? "border-red-500 text-red-500"
                                    : "border-transparent text-secondary-text hover:text-text-color"
                                    }`}
                            >
                                <BarChart3 className="w-3.5 h-3.5" /> Peak Analysis
                            </button>
                            <button
                                onClick={() => setAnalysisTab("info")}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${analysisTab === "info"
                                    ? "border-blue-400 text-blue-400"
                                    : "border-transparent text-secondary-text hover:text-text-color"
                                    }`}
                            >
                                <Info className="w-3.5 h-3.5" /> Video Info
                            </button>
                        </div>

                        {/* Chart Viewport */}
                        <div className="flex-1 p-4 overflow-hidden relative">
                            {analysisTab === "activity" && (
                                <ActivityTimeline
                                    data={job.detectionData}
                                    zones={job.zones}
                                    duration={job.processTime}
                                />
                            )}
                            {analysisTab === "dwell" && (
                                <DwellTimeChart
                                    data={job.dwellData}
                                    zones={job.zones}
                                />
                            )}
                            {analysisTab === "peak" && (
                                <PeakTimeChart
                                    data={job.detectionData}
                                    zones={job.zones}
                                    duration={job.processTime}
                                />
                            )}
                            {analysisTab === "info" && (
                                <div className="h-full content-start overflow-y-auto px-1 pr-3">
                                    <div className="space-y-6">
                                        {/* Video Specs Section */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-text-color uppercase tracking-wider pb-2 border-b border-white/10">Video Specification</h4>
                                            <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-secondary-text">Resolution</span>
                                                    <span className="font-mono text-text-color font-medium">{job.frameWidth} x {job.frameHeight}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-secondary-text">Total Duration</span>
                                                    <span className="font-mono text-text-color font-medium">{job.processTime?.toFixed(2)}s</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-secondary-text">File Format</span>
                                                    <span className="font-mono text-text-color font-medium">MP4 / H.264</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-secondary-text">Frame Rate</span>
                                                    <span className="font-mono text-text-color font-medium">30 FPS</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* AI Config Section */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-text-color uppercase tracking-wider pb-2 border-b border-white/10">AI Configuration</h4>
                                            <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-secondary-text">Model Architecture</span>
                                                    <span className="font-medium text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded text-xs">{job.model || "YOLOv8"}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-secondary-text">Confidence</span>
                                                    <span className="font-mono text-text-color font-medium">
                                                        {(job.confidence > 1 ? job.confidence : job.confidence * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-secondary-text">Status</span>
                                                    <span className="font-medium text-green-400 capitalize flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                        {job.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats Section */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-text-color uppercase tracking-wider pb-2 border-b border-white/10">Analysis Data</h4>
                                            <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-secondary-text">Active Zones</span>
                                                    <span className="font-mono text-text-color font-medium">{job.zones?.length || 0}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-secondary-text">Detected Events</span>
                                                    <span className="font-mono text-text-color font-medium">{job.detectionData?.length || 0}</span>
                                                </div>
                                                <div className="col-span-2 flex justify-between items-center pt-2 border-t border-white/5 mt-1">
                                                    <span className="text-secondary-text">Processing ID</span>
                                                    <code className="text-xs font-mono text-text-color/60 hover:text-text-color transition-colors select-all cursor-text">
                                                        {taskId}
                                                    </code>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </BentoCard>

                {/* Control Panel / Actions - Spans 4 cols, fills remaining height */}
                <BentoCard className="col-span-4" noScroll>
                    <div className="flex flex-col h-full p-4 text-text-color">

                        {/* Primary Action */}
                        <a
                            href={videoUrl}
                            download={`video-${taskId}.mp4`}
                            className="w-full py-3 flex items-center justify-center gap-2 rounded-lg bg-text-color text-bg-color hover:opacity-90 text-sm font-bold transition-all mb-3 group"
                        >
                            <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            Download Video
                        </a>

                        {/* Secondary Actions Row */}
                        <div className="flex gap-2 mb-3">
                            <a
                                href={api.getExportCsvUrl(taskId)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-btn-bg hover:bg-btn-hover border border-primary-border text-xs font-medium transition-all text-text-color"
                                download
                            >
                                <Table className="w-3.5 h-3.5 opacity-70" /> CSV Export
                            </a>
                            <a
                                href={api.getExportJsonUrl(taskId)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-btn-bg hover:bg-btn-hover border border-primary-border text-xs font-medium transition-all text-text-color"
                                download
                            >
                                <FileJson className="w-3.5 h-3.5 opacity-70" /> JSON Export
                            </a>
                        </div>

                        {/* Edit Action */}
                        <button
                            onClick={() => router.push(`/zone/${taskId}`)}
                            className="w-full py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-medium transition-all mb-auto"
                        >
                            Edit Zones & Configuration
                        </button>


                    </div>
                </BentoCard>
            </BentoGrid>
        </main>
    );
}

