"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageTitle2 } from "@/components/page-title";

import { Button } from "@/components/ui/button";

export default function Page() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleDeleteAll = async () => {
        if (!confirm("Are you absolutely sure? This action cannot be undone. All videos and analytics data will be permanently deleted.")) {
            return;
        }

        try {
            setDeleting(true);
            const res = await fetch('http://localhost:8000/api/video/all', {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error("Failed to delete");
            alert("All system data has been wiped.");
        } catch (e) {
            console.error(e);
            alert("Failed to delete data. Check console.");
        } finally {
            setDeleting(false);
        }
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <PageTitle2 />

            {/* Settings List */}
            <div className="flex flex-col gap-6">
                {/* Theme Setting */}
                <div className="flex items-center justify-between border-b border-border py-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">Theme</span>
                        <span className="text-muted-foreground text-xs">
                            How Locus looks on your device
                        </span>
                    </div>
                    <Select value={theme} onValueChange={setTheme} defaultValue="dark">
                        <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dark">
                                <Moon className="size-4 mr-2" />
                                Dark
                            </SelectItem>
                            <SelectItem value="light">
                                <Sun className="size-4 mr-2" />
                                Light
                            </SelectItem>
                            <SelectItem value="system">
                                <Monitor className="size-4 mr-2" />
                                System
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Danger Zone */}
                <div className="flex flex-col gap-4 pt-4">
                    <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
                    <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                        <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm text-foreground">Delete All Data</span>
                            <span className="text-xs text-muted-foreground">
                                Permanently remove all videos, detections, and metadata.
                            </span>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteAll}
                            disabled={deleting}
                        >
                            {deleting ? "Deleting..." : "Delete Everything"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
