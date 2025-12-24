"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { LoadingOverlay } from "@/components/layout";
import { Download, FileJson, Table, Clock, Users, Activity, BarChart3, Flame } from "lucide-react";
import { BentoGrid, BentoCard } from "@/components/dashboard/BentoGrid";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import DwellTimeChart from "@/components/dashboard/DwellTimeChart";
import ClassDistributionChart from "@/components/dashboard/ClassDistributionChart";
import PeakTimeChart from "@/components/dashboard/PeakTimeChart";
import HeatmapChart from "@/components/dashboard/HeatmapChart";
import Sparkline from "@/components/dashboard/Sparkline";

export default function ResultPage() {
    const params = useParams();

    const router = useRouter();
    const taskId = params.taskId as string;
    const [activeTab, setActiveTab] = useState<"actions" | "details">("actions");
    const [analysisTab, setAnalysisTab] = useState<"activity" | "dwell" | "classes" | "peak" | "heatmap">("activity");

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
            <BentoGrid className="grid-cols-12 grid-rows-12">
                {/* Main Video Tile - Spans 8 cols, 8 rows (Matches screen aspect ratio 16:9) */}
                <BentoCard
                    className="col-span-8 row-span-8 p-0"
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
                    </div>
                </BentoCard>

                {/* Zone Statistics - Spans 4 cols, 8 rows (Right Sidebar) */}
                <BentoCard className="col-span-4 row-span-8" title="Zone Analysis">
                    <div className="space-y-3 px-4 pb-4 pt-0 h-full overflow-y-auto pr-2">
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
                                    className="bg-btn-bg/20 border border-primary-border rounded-lg p-3 hover:bg-btn-bg/40 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2 h-2 rounded-full shadow-[0_0_8px]"
                                                style={{
                                                    backgroundColor: `rgb(${zone.color?.join(",")})`,
                                                    boxShadow: `0 0 10px rgb(${zone.color?.join(",")})`
                                                }}
                                            />
                                            <span className="text-sm font-medium text-text-color truncate max-w-[120px]">
                                                {zone.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sparkline */}
                                    <div className="mb-3 -mx-1">
                                        <Sparkline
                                            data={job.detectionData}
                                            zoneId={zone.id}
                                            color={zone.color}
                                            duration={job.processTime || 10}
                                        />
                                    </div>

                                    {isLine && lineCrossing ? (
                                        <div className="grid grid-cols-2 gap-2 text-center items-end">
                                            <div className="text-left">
                                                <p className="text-xs text-secondary-text mb-0.5">In / Out</p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-sm font-bold text-green-400">{lineCrossing.in}</span>
                                                    <span className="text-xs text-text-color/20">/</span>
                                                    <span className="text-sm font-bold text-red-400">{lineCrossing.out}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-secondary-text mb-0.5">Net Flow</p>
                                                <span className={`text-sm font-bold ${lineCrossing.in - lineCrossing.out > 0 ? 'text-green-400' : lineCrossing.in - lineCrossing.out < 0 ? 'text-red-400' : 'text-text-color'}`}>
                                                    {lineCrossing.in - lineCrossing.out > 0 ? '+' : ''}{lineCrossing.in - lineCrossing.out}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2 text-center items-end">
                                            <div className="text-left">
                                                <p className="text-xs text-secondary-text mb-0.5">Count</p>
                                                <p className="text-sm font-bold text-text-color leading-none">
                                                    {stats.total}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-secondary-text mb-0.5">Avg Dwell</p>
                                                <span className="text-sm font-bold text-amber-500">
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

                {/* Analysis Dashboard - Spans 8 cols, 4 rows (Bottom Left) */}
                <BentoCard className="col-span-8 row-span-4" noScroll>
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
                                onClick={() => setAnalysisTab("classes")}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${analysisTab === "classes"
                                    ? "border-green-500 text-green-500"
                                    : "border-transparent text-secondary-text hover:text-text-color"
                                    }`}
                            >
                                <Users className="w-3.5 h-3.5" /> Demographics
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
                                onClick={() => setAnalysisTab("heatmap")}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${analysisTab === "heatmap"
                                    ? "border-orange-500 text-orange-500"
                                    : "border-transparent text-secondary-text hover:text-text-color"
                                    }`}
                            >
                                <Flame className="w-3.5 h-3.5" /> Heatmap
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
                            {analysisTab === "classes" && (
                                <ClassDistributionChart
                                    data={job.detectionData}
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
                            {analysisTab === "heatmap" && (
                                <HeatmapChart
                                    data={job.heatmapData}
                                    zones={job.zones}
                                />
                            )}
                        </div>
                    </div>
                </BentoCard>

                {/* Control Panel / Actions - Spans 4 cols, 4 rows (Bottom Right) */}
                <BentoCard className="col-span-4 row-span-4" noScroll>
                    <div className="flex flex-col h-full p-4 overflow-hidden">
                        {/* Tab Switcher */}
                        <div className="flex p-1 bg-btn-bg rounded-lg mb-4 shrink-0 border border-primary-border">
                            <button
                                onClick={() => setActiveTab("actions")}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === "actions"
                                    ? "bg-blue-500/20 text-blue-500 shadow-sm"
                                    : "text-secondary-text hover:text-text-color"
                                    }`}
                            >
                                Actions
                            </button>
                            <button
                                onClick={() => setActiveTab("details")}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === "details"
                                    ? "bg-blue-500/20 text-blue-500 shadow-sm"
                                    : "text-secondary-text hover:text-text-color"
                                    }`}
                            >
                                Details
                            </button>
                        </div>

                        <div className="flex-1 min-h-0">
                            {activeTab === "actions" ? (
                                <div className="flex flex-col gap-3 h-full justify-between">
                                    <button
                                        onClick={() => router.push(`/zone/${taskId}`)}
                                        className="w-full py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-sm font-medium transition-all shrink-0"
                                    >
                                        Edit Zones
                                    </button>

                                    <div className="flex gap-2 shrink-0">
                                        <a
                                            href={api.getExportCsvUrl(taskId)}
                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-btn-bg hover:bg-btn-hover border border-primary-border text-xs font-medium transition-all text-text-color"
                                            download
                                        >
                                            <Table className="w-3 h-3" /> CSV
                                        </a>
                                        <a
                                            href={api.getExportJsonUrl(taskId)}
                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-btn-bg hover:bg-btn-hover border border-primary-border text-xs font-medium transition-all text-text-color"
                                            download
                                        >
                                            <FileJson className="w-3 h-3" /> JSON
                                        </a>
                                    </div>

                                    <a
                                        className="w-full py-2 flex items-center justify-center gap-2 rounded-lg bg-text-color text-bg-color hover:opacity-90 text-sm font-bold transition-all shrink-0 mt-auto"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Video
                                    </a>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 h-full content-start overflow-y-auto pr-1">
                                    <div className="bg-btn-bg/40 rounded-lg p-3 border border-primary-border">
                                        <p className="text-[10px] text-secondary-text uppercase tracking-widest mb-1">Model</p>
                                        <p className="text-sm font-semibold truncate" title={job.model}>
                                            {job.model?.replace(".pt", "") || "N/A"}
                                        </p>
                                    </div>
                                    <div className="bg-btn-bg/40 rounded-lg p-3 border border-primary-border">
                                        <p className="text-[10px] text-secondary-text uppercase tracking-widest mb-1">Confidence</p>
                                        <p className="text-sm font-semibold">{job.confidence}%</p>
                                    </div>
                                    <div className="bg-btn-bg/40 rounded-lg p-3 border border-primary-border">
                                        <p className="text-[10px] text-secondary-text uppercase tracking-widest mb-1">Dimensions</p>
                                        <p className="text-sm font-semibold">{job.frameWidth} x {job.frameHeight}</p>
                                    </div>
                                    <div className="bg-btn-bg/40 rounded-lg p-3 border border-primary-border">
                                        <p className="text-[10px] text-secondary-text uppercase tracking-widest mb-1">Processed</p>
                                        <p className="text-sm font-semibold">{job.processTime?.toFixed(1)}s</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </BentoCard>
            </BentoGrid>
        </main>
    );
}

