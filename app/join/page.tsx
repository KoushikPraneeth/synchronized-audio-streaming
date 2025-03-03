"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { io, Socket } from "socket.io-client";
import { formatRoomCode } from "@/lib/utils";
import { AlertCircle, Volume2, Headphones, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const initialCode = searchParams?.get("code") || "";
  
  const [roomCode, setRoomCode] = useState<string>(initialCode);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReceiving, setIsReceiving] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer[]>([]);
  const lastPlayedTimestampRef = useRef<number>(0);
  
  const { toast } = useToast();

  useEffect(() => {
    // Only initialize socket on client side
    if (typeof window === 'undefined') {
      return; // Exit early if running on server
    }
    
    // Initialize socket connection
    const socket = io("/api/socket", {
      path: "/api/socket",
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
    
    socketRef.current = socket;
    
    // Set up socket event listeners
    socket.on("connect", () => {
      console.log("Socket connected");
      
      // If we have a room code from URL, join automatically
      if (initialCode) {
        joinRoom(initialCode);
      }
    });
    
    socket.on("room-joined", () => {
      setIsConnected(true);
      setError(null);
      toast({
        title: "Connected to room",
        description: `Successfully joined room ${formatRoomCode(roomCode)}`,
      });
    });
    
    socket.on("room-not-found", () => {
      setError("Room not found. Please check the code and try again.");
      setIsConnected(false);
    });
    
    socket.on("audio-data", ({ audioData, timestamp }) => {
      if (!isReceiving) return;
      
      // Process incoming audio data
      processIncomingAudio(audioData, timestamp);
    });
    
    socket.on("host-stopped-streaming", () => {
      setIsReceiving(false);
      toast({
        title: "Streaming stopped",
        description: "The host has stopped streaming audio",
      });
    });
    
    // Clean up on component unmount
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [initialCode, roomCode, isReceiving, toast]);
  
  // Update volume when slider changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);
  
  const joinRoom = (code: string) => {
    if (!code.trim()) {
      setError("Please enter a room code");
      return;
    }
    
    if (socketRef.current) {
      socketRef.current.emit("join-room", { roomCode: code.toUpperCase().replace(/-/g, '') });
      setRoomCode(code.toUpperCase());
    }
  };
  
  const startReceiving = async () => {
    try {
      // Initialize Web Audio API
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const gainNode = audioContext.createGain();
      gainNodeRef.current = gainNode;
      gainNode.gain.value = volume / 100;
      gainNode.connect(audioContext.destination);
      
      setIsReceiving(true);
      
      // Sync time with server
      if (socketRef.current) {
        socketRef.current.emit("sync-time", { 
          clientTime: Date.now(),
          roomCode: roomCode.toUpperCase().replace(/-/g, '')
        });
      }
      
      toast({
        title: "Receiving audio",
        description: "You are now receiving audio from the host",
      });
    } catch (error) {
      console.error("Error initializing audio:", error);
      toast({
        variant: "destructive",
        title: "Audio error",
        description: "Failed to initialize audio playback",
      });
    }
  };
  
  const stopReceiving = () => {
    setIsReceiving(false);
    toast({
      title: "Stopped receiving",
      description: "Audio reception has been stopped",
    });
  };
  
  const processIncomingAudio = (audioData: number[], timestamp: number) => {
    if (!audioContextRef.current || !gainNodeRef.current) return;
    
    const audioContext = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    
    // Create audio buffer
    const buffer = audioContext.createBuffer(1, audioData.length, audioContext.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Convert audio data to float32 values
    for (let i = 0; i < audioData.length; i++) {
      channelData[i] = (audioData[i] / 128.0) - 1.0;
    }
    
    // Create buffer source
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    
    // Calculate when to play this buffer
    const now = audioContext.currentTime;
    const timeSinceLastPlayed = timestamp - lastPlayedTimestampRef.current;
    const playTime = now + (timeSinceLastPlayed > 500 ? 0 : 0.05);
    
    // Play the audio
    source.start(playTime);
    lastPlayedTimestampRef.current = timestamp;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    joinRoom(roomCode);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Join Audio Session</h1>
          <p className="text-muted-foreground">
            Connect to a host and receive synchronized audio
          </p>
        </div>
        
        {!isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Enter Room Code</CardTitle>
              <CardDescription>
                Enter the 6-digit code provided by the host
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="roomCode">Room Code</Label>
                    <Input
                      id="roomCode"
                      placeholder="ABCDEF"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="text-center text-xl tracking-widest font-mono"
                      maxLength={8}
                    />
                  </div>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button type="submit" className="w-full">Join Room</Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Connected to Room
                <Badge variant={isReceiving ? "default" : "outline"} className="ml-2">
                  {isReceiving ? "Receiving" : "Not Receiving"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Room Code: {formatRoomCode(roomCode)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Volume</label>
                    <span className="text-sm text-muted-foreground">{volume}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <Slider
                      value={[volume]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(value) => setVolume(value[0])}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Audio Status</h4>
                    <p className="text-sm text-muted-foreground">
                      {isReceiving 
                        ? "Currently receiving audio from the host" 
                        : "Click 'Start Receiving' to begin listening"}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {!isReceiving ? (
                      <Button onClick={startReceiving} className="gap-2">
                        <Headphones className="h-4 w-4" />
                        Start Receiving
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={stopReceiving} className="gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Stop Receiving
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}