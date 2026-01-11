"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AspectRatio } from "../ui/aspect-ratio";
import { useVideo } from "@/components/video-context";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AddCameraDialog() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("rtsp");
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
    const { setVideoType, setVideoStream, setVideoConfig } = useVideo();
    const router = useRouter();

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleConnect = () => {
        setOpen(false);
        const taskId = crypto.randomUUID();

        if (activeTab === "webcam") {
            setVideoType('stream');
            // IMPORTANT: We do NOT stop the stream tracks here.
            // We pass the active stream to the context so it survives navigation.
            // The cleanup function in useEffect needs to know NOT to kill it.
            // For now, we rely on the fact that we are unmounting this component
            // but passing the stream reference to the context.
            // However, our current useEffect cleanup WILL kill it on unmount.
            // We need a ref to track if we are redirecting.
            if (stream) {
                setVideoStream(stream);
                // Hack: Prevent cleanup from killing the stream by cloning it or
                // modifying the cleanup logic. simpler is to modify cleanup logic.
                // we will use a ref for this.
                isRedirectingRef.current = true;
            }
        } else {
            setVideoType('rtsp');
            // TODO: Get actual values from inputs. For now using placeholders/defaults
            setVideoConfig({
                name: "RTSP Camera",
                url: "rtsp://admin:password@192.168.1.10:554/stream"
            });
        }

        router.push(`/create/${taskId}`);
    };

    const isRedirectingRef = useRef(false);

    // Handle stream lifecycle
    useEffect(() => {
        let currentStream: MediaStream | null = null;
        let mounted = true;

        const startStream = async () => {
            // Only request access if we are on the webcam tab and open
            if (open && activeTab === "webcam") {
                try {
                    setError(null);

                    // If we haven't fetched devices yet, we need to request permission first to get labels
                    // We'll do a generic request first if we have no devices listed
                    let constraints: MediaStreamConstraints = { video: true };

                    if (selectedDeviceId && selectedDeviceId !== "default") {
                        constraints = { video: { deviceId: { exact: selectedDeviceId } } };
                    }

                    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

                    if (!mounted) {
                        mediaStream.getTracks().forEach(track => track.stop());
                        return;
                    }

                    currentStream = mediaStream;
                    setStream(mediaStream);

                    // Enumerate devices if we haven't already (now that we have permission)
                    if (devices.length === 0) {
                        const allDevices = await navigator.mediaDevices.enumerateDevices();
                        const videoDevices = allDevices.filter(device => device.kind === "videoinput");
                        setDevices(videoDevices);

                        // Set default if none selected
                        if (!selectedDeviceId && videoDevices.length > 0) {
                            // Don't overwrite if user already selected something (though unlikely here)
                            // We typically just leave it empty to mean "default" or set it to the first one
                        }
                    }
                } catch (err) {
                    console.error("Error accessing webcam:", err);
                    setError("Could not access webcam. Please check permissions.");
                }
            } else {
                // Stop stream if tab changed or dialog closed
                // BUT only if we are not redirecting!
                if (stream && !isRedirectingRef.current) {
                    stream.getTracks().forEach(track => track.stop());
                    setStream(null);
                }
            }
        };

        // If we are closing or switching away, stop immediately
        if (!open || activeTab !== "webcam") {
            if (stream && !isRedirectingRef.current) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
        } else {
            // Otherwise try to start
            startStream();
        }

        // Cleanup on unmount or dependency change
        return () => {
            mounted = false;
            // Only stop tracks if we are NOT redirecting
            if (currentStream && !isRedirectingRef.current) {
                currentStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [open, activeTab, selectedDeviceId]); // Re-run if device changes

    // Re-attach stream to video element if it exists but wasn't attached (e.g. during render)
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!isMounted) {
        return (
            <Button variant="default" className="cursor-pointer">
                <Plus className="size-4" />
                Add Camera
            </Button>
        );
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) {
                // Reset redirect flag when closing dialog manually
                isRedirectingRef.current = false;
            }
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                <Button variant="default" className="cursor-pointer">
                    <Plus className="size-4" />
                    Add Camera
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Camera</DialogTitle>
                    <DialogDescription>
                        Connect a new camera via RTSP stream or local webcam.
                    </DialogDescription>
                </DialogHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="rtsp" className="cursor-pointer">RTSP / HTTP</TabsTrigger>
                        <TabsTrigger value="webcam" className="cursor-pointer">Webcam</TabsTrigger>
                    </TabsList>

                    <TabsContent value="rtsp" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="rtsp-name">Camera Name</Label>
                            <Input id="rtsp-name" placeholder="e.g. Front Door" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rtsp-url">Stream URL</Label>
                            <Input id="rtsp-url" placeholder="rtsp://admin:password@192.168.1.10:554/stream" />
                        </div>
                    </TabsContent>

                    <TabsContent value="webcam" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="webcam-name">Camera Name</Label>
                            <Input id="webcam-name" placeholder="e.g. Desk Webcam" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="device">Device</Label>
                            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                                <SelectTrigger id="device">
                                    <SelectValue placeholder="Select a device" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default Camera</SelectItem>
                                    {devices.map((device, index) => (
                                        <SelectItem key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Camera ${index + 1}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="relative aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
                            {error ? (
                                <div className="text-destructive text-sm p-4 text-center">{error}</div>
                            ) : !stream ? (
                                <div className="text-muted-foreground text-sm">Requesting Camera Access...</div>
                            ) : null}

                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${!stream ? 'hidden' : ''}`}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <Button variant="outline" className="cursor-pointer" onClick={() => setOpen(false)}>Cancel</Button>
                    {/* TODO: Implement backend integration */}
                    {/* - POST /api/cameras to save new camera configuration */}
                    {/* - Handle connection testing before saving */}
                    <Button
                        type="submit"
                        className="cursor-pointer"
                        onClick={handleConnect}
                    >
                        Connect
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
