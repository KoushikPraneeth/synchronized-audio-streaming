"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import dynamic from "next/dynamic";

// Dynamically import QRCodeSVG to ensure it only loads on the client side
const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeSVG),
  { ssr: false }
);
import { io, Socket } from "socket.io-client";
import { formatRoomCode, generateRandomCode } from "@/lib/utils";
import { AlertCircle, Headphones, Volume2, Users, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HostPage() {
  const [roomCode, setRoomCode] = useState<string>("");
  const [connectedClients, setConnectedClients] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [copied, setCopied] = useState<boolean>(false);
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    // Generate a room code on component mount
    const code = generateRandomCode();
    setRoomCode(code);
    
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
      socket.emit("create-room", { roomCode: code });
    });
    
    socket.on("client-joined", ({ count }) => {
      setConnectedClients(count);
      toast({
        title: "New device connected",
        description: `${count} device${count !== 1 ? 's' : ''} now connected`,
      });
    });
    
    socket.on("client-left", ({ count }) => {
      setConnectedClients(count);
    });
    
    // Clean up on component unmount
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      socket.disconnect();
    };
  }, [toast]);
  
  const startStreaming = async () => {
    try {
      // Request audio capture permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: false
      });
      
      mediaStreamRef.current = stream;
      setAudioPermission(true);
      
      // Set up Web Audio API
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      
      sourceNode.connect(analyser);
      
      // Start audio processing and transmission
      setIsStreaming(true);
      processAudio();
      
      toast({
        title: "Streaming started",
        description: "Your audio is now being streamed to connected devices",
      });
      
      // Handle stream ending (user stops sharing)
      stream.getAudioTracks()[0].onended = () => {
        stopStreaming();
      };
    } catch (error) {
      console.error("Error accessing audio:", error);
      setAudioPermission(false);
      toast({
        variant: "destructive",
        title: "Permission denied",
        description: "Audio capture permission is required for streaming",
      });
    }
  };
  
  const stopStreaming = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (socketRef.current) {
      socketRef.current.emit("stop-streaming", { roomCode });
    }
    
    setIsStreaming(false);
    toast({
      title: "Streaming stopped",
      description: "Audio streaming has been stopped",
    });
  };
  
  const processAudio = () => {
    if (!analyserRef.current || !socketRef.current || !isStreaming) return;
    
    const analyser = analyserRef.current;
    const socket = socketRef.current;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteTimeDomainData(dataArray);
    
    // Send audio data to server
    socket.emit("audio-data", {
      roomCode,
      audioData: Array.from(dataArray),
      timestamp: Date.now(),
    });
    
    // Continue processing
    requestAnimationFrame(processAudio);
  };
  
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Room code copied",
      description: "Room code has been copied to clipboard",
    });
  };
  
  const formattedRoomCode = formatRoomCode(roomCode);
  // Use a ref to store the join URL to avoid window reference during server-side rendering
  const joinUrlRef = useRef<string>("");
  
  // Update the join URL when component mounts (client-side only)
  useEffect(() => {
    joinUrlRef.current = `${window.location.origin}/join?code=${roomCode}`;
  }, [roomCode]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Host Audio Session</h1>
          <p className="text-muted-foreground">
            Share your system audio with multiple devices in perfect sync
          </p>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Room Information
              <Badge variant={isStreaming ? "default" : "outline"} className="ml-2">
                {isStreaming ? "Live" : "Not Streaming"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Share this code or QR code with others to join your audio session
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 flex flex-col items-center">
              <div className="bg-muted p-4 rounded-lg mb-4">
                {/* QRCodeSVG is dynamically imported and only rendered on client side */}
                <QRCodeSVG value={joinUrlRef.current} size={180} />
              </div>
              <p className="text-sm text-muted-foreground">Scan to join</p>
            </div>
            
            <div className="flex-1 flex flex-col items-center">
              <div className="text-4xl font-mono tracking-wider mb-4 bg-muted py-3 px-6 rounded-lg">
                {formattedRoomCode}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={copyRoomCode}
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy Code"}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{connectedClients} device{connectedClients !== 1 ? 's' : ''} connected</span>
            </div>
          </CardFooter>
        </Card>
        
        {audioPermission === false && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Permission Denied</AlertTitle>
            <AlertDescription>
              Audio capture permission is required to stream audio. Please allow access and try again.
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Streaming Controls</CardTitle>
            <CardDescription>
              Start streaming your system audio to connected devices
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
                    disabled={!isStreaming}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Streaming Status</h4>
                  <p className="text-sm text-muted-foreground">
                    {isStreaming 
                      ? "Audio is currently being streamed to connected devices" 
                      : "Click 'Start Streaming' to begin sharing your audio"}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {!isStreaming ? (
                    <Button onClick={startStreaming} className="gap-2">
                      <Headphones className="h-4 w-4" />
                      Start Streaming
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={stopStreaming} className="gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Stop Streaming
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}