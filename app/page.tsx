import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Headphones, Radio, Laptop, Smartphone } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <Headphones className="h-10 w-10 text-primary" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Audio<span className="text-primary">Sync</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl">
            Stream audio from your laptop to multiple devices in perfect synchronization.
            Turn any collection of devices into a synchronized audio system.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button asChild size="lg" className="gap-2">
              <Link href="/host">
                <Laptop className="h-5 w-5" />
                Host Audio
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href="/join">
                <Smartphone className="h-5 w-5" />
                Join Session
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Radio className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Synchronized Playback</CardTitle>
              <CardDescription>
                All connected devices play audio in perfect sync
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our advanced time synchronization algorithm ensures that all devices play audio at exactly the same time, creating an immersive listening experience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Laptop className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Easy Setup</CardTitle>
              <CardDescription>
                No app installation required
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Works directly in your browser. Simply create a session on your host device and connect other devices by scanning a QR code or entering a room code.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Multi-Device Support</CardTitle>
              <CardDescription>
                Connect as many devices as you want
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Turn any collection of smartphones, tablets, and computers into a synchronized audio system. Perfect for parties, presentations, or multi-room setups.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}