
import { CocoClass } from "@/lib/coco-classes";

export type EventType = "detection" | "alert" | "system";

export interface DetectionEvent {
    event_id: string;
    camera_id: string;
    timestamp: string; // ISO 8601
    label: CocoClass;
    confidence: number;
    has_snapshot: boolean;
    is_alert: boolean;
    thumbnail_url?: string;
    details?: {
        color?: string;
        direction?: string;
        zone?: string;
    };
}

export interface CameraMetadata {
    camera_id: string;
    name: string;
    location: string;
    status: "online" | "offline" | "maintenance";
    resolution: string;
    fps: number;
}

export interface Aggregations {
    total_events: number;
    active_events: number; // Currently in frame
    avg_dwell_time_seconds: number;
    alerts: {
        loitering: number;
        unattended_object: number;
        intrusion: number;
    };
    busiest_hour: number; // 0-23
}

export interface EventDataResponse {
    metadata: CameraMetadata;
    events: DetectionEvent[];
    aggregations: Aggregations;
}
