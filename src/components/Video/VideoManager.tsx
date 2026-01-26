
import React, { useEffect, useRef } from "react";
import { useCloudflareCalls } from "@/hooks/useCloudflareCalls";
import { Card } from "@/components/ui/card";
import { Loader2, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoManagerProps {
    matchId: string;
    isPlayer1: boolean;
    participantId?: string;
    isOpen: boolean;
    onToggle: () => void;
}

export function VideoManager({ matchId, isPlayer1, participantId, isOpen, onToggle }: VideoManagerProps) {
    const { localStream, remoteStream, error, initSession } = useCloudflareCalls({
        matchId,
        isPlayer1,
    });

    // Initialize session when component mounts with a valid matchId
    useEffect(() => {
        if (matchId) {
            initSession();
        }
    }, [matchId, initSession]);

    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    if (!isOpen) {
        return (
            <Button
                variant="secondary"
                size="icon"
                className="fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 shadow-lg"
                onClick={onToggle}
            >
                <Video className="h-6 w-6" />
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-4 right-4 z-50 w-64 h-auto bg-black border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="relative w-full aspect-video bg-zinc-900">
                {/* Remote Stream */}
                {remoteStream ? (
                    <RemoteVideo stream={remoteStream} />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
                        Waiting for opponent...
                    </div>
                )}

                {/* Local Stream (PIP) */}
                <div className="absolute bottom-2 right-2 w-20 aspect-video bg-zinc-800 rounded overflow-hidden border border-zinc-700 shadow-md">
                    {localStream ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover mirror"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                        </div>
                    )}
                </div>
            </div>

            <div className="p-2 flex justify-between items-center bg-zinc-900/90 backdrop-blur">
                <span className="text-xs text-zinc-400 font-semibold px-2">LIVE MATCH</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-zinc-800" onClick={onToggle}>
                    <VideoOff className="h-4 w-4 text-zinc-400" />
                </Button>
            </div>
        </Card>
    );
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (ref.current && stream) {
            ref.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video
            ref={ref}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
        />
    );
}
