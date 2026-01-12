"use client";

/**
 * Formats a date to YouTube-style relative time.
 * Examples: "Just now", "5 minutes ago", "2 hours ago", "3 days ago"
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();

    // Handle invalid dates
    if (isNaN(date.getTime())) {
        return "Unknown";
    }

    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) {
        return "Just now";
    } else if (diffMinutes < 60) {
        return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
        return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
        return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
    } else if (diffWeeks < 4) {
        return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
    } else if (diffMonths < 12) {
        return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
    } else {
        return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
    }
}

/**
 * Formats duration in YouTube style.
 * < 1 hour: "M:SS" (e.g., "3:45")
 * >= 1 hour: "H:MM:SS" (e.g., "1:23:45")
 */
export function formatDuration(durationString: string): string {
    // Handle already formatted durations (MM:SS or H:MM:SS)
    if (!durationString || durationString === "00:00") {
        return "0:00";
    }

    const parts = durationString.split(":").map(Number);

    if (parts.length === 2) {
        // MM:SS format from backend
        const [minutes, seconds] = parts;
        const totalSeconds = minutes * 60 + seconds;
        return formatSecondsToYouTube(totalSeconds);
    } else if (parts.length === 3) {
        // H:MM:SS format
        const [hours, minutes, seconds] = parts;
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        return formatSecondsToYouTube(totalSeconds);
    }

    return durationString; // Return as-is if format is unknown
}

/**
 * Converts total seconds to YouTube format.
 */
function formatSecondsToYouTube(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        // H:MM:SS format
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        // M:SS format (no leading zero on minutes)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}
