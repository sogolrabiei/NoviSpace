"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Video,
  Mic,
  MessageSquare,
  ArrowRight,
  Eye,
  Zap,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image 
              src="/Logo-NoviSpace.png" 
              alt="NoviSpace" 
              width={32} 
              height={32}
              className="h-8 w-8"
            />
            <span className="text-lg font-semibold tracking-tight">
              NoviSpace
            </span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-accent">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-accent">
              How It Works
            </a>
            <Link href="/quiz" className="transition-colors hover:text-accent">
              Style Quiz
            </Link>
            <Link href="/sessions" className="transition-colors hover:text-accent">
              My Sessions
            </Link>
          </div>
          <Link href="/consult">
            <Button size="sm">Start Consultation</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-16 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs text-accent">
            <Eye className="h-3 w-3" />
            Powered by Gemini Live API
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Your AI Spatial
            <br />
            <span className="text-muted-foreground">Design Consultant</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
            Walk through your space with your camera. Get real-time,
            interruptible design advice from an AI that sees your room and
            understands architectural constraints. Get a personalized design
            report with shopping links when you&apos;re done.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/consult">
              <Button size="lg" className="gap-2 transition-all hover:bg-accent hover:text-accent-foreground">
                Start Live Consultation
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/quiz">
              <Button variant="outline" size="lg" className="gap-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Sparkles className="h-4 w-4" />
                Take Style Quiz First
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              Designed for Real Spaces
            </h2>
            <p className="mx-auto max-w-lg text-muted-foreground">
              Not another static tool. NoviSpace understands your room in
              real-time through live video and voice.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Video,
                title: "Live Video Analysis",
                desc: "Point your camera and the AI sees your space — lighting, dimensions, constraints, and all.",
              },
              {
                icon: Mic,
                title: "Natural Voice",
                desc: "Have a real conversation. Interrupt anytime. The agent pivots instantly to your needs.",
              },
              {
                icon: MessageSquare,
                title: "Live Transcript & Report",
                desc: "Full conversation transcript, bookmarked ideas, and a design report with shopping links.",
              },
              {
                icon: Shield,
                title: "Budget-Aware",
                desc: "Set your budget and get recommendations that fit. The AI tracks spending in real-time.",
              },
            ].map((f) => (
              <Card key={f.title} className="border-border/50 bg-card/50 transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <f.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mb-2 font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              How It Works
            </h2>
            <p className="mx-auto max-w-lg text-muted-foreground">
              Three steps to professional spatial design advice.
            </p>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Open & Connect",
                desc: "Click 'Start Consultation' and grant camera and microphone access. That's it.",
              },
              {
                step: "02",
                title: "Walk & Talk",
                desc: "Point your camera at any space. Ask about layouts, furniture, lighting — anything. Bookmark ideas you love.",
              },
              {
                step: "03",
                title: "Get Your Report",
                desc: "End the session and get a design report with shopping links to Amazon, Wayfair, IKEA, and more.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent/30 bg-accent/5 text-sm font-semibold text-accent">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t py-24">
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">FAQ</h2>
          </div>
          <div className="space-y-8">
            {[
              {
                q: "What devices are supported?",
                a: "Any device with a modern browser, camera, and microphone. Chrome is recommended for the best experience.",
              },
              {
                q: "Can I interrupt the AI mid-sentence?",
                a: "Yes — that's a core feature. Just start talking and the agent will immediately stop and pivot to your new direction.",
              },
              {
                q: "Does it store my video?",
                a: "No. Video frames are processed in real-time and are not stored. Your privacy is preserved.",
              },
              {
                q: "How accurate is the spatial advice?",
                a: "The agent is grounded in professional architectural and interior design principles. It provides specific dimensions, material suggestions, and layout guidance based on what it sees.",
              },
            ].map((item) => (
              <div key={item.q} className="border-b pb-6">
                <h3 className="mb-2 font-semibold">{item.q}</h3>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <Zap className="mx-auto mb-6 h-8 w-8 text-accent" />
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            Ready to reimagine your space?
          </h2>
          <p className="mb-8 text-muted-foreground">
            No uploads. No measuring tapes. Just point your camera and start
            talking.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/consult">
              <Button size="lg" className="gap-2 transition-all hover:bg-accent hover:text-accent-foreground">
                Start Live Consultation
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/quiz">
              <Button variant="outline" size="lg" className="gap-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Sparkles className="h-4 w-4" />
                Discover Your Style
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/Logo-NoviSpace.png" 
              alt="NoviSpace" 
              width={20} 
              height={20}
              className="h-5 w-5"
            />
            <span>NoviSpace</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link href="/sessions" className="transition-colors hover:text-accent">My Sessions</Link>
            <Link href="/quiz" className="transition-colors hover:text-accent">Style Quiz</Link>
            <p>Built with Gemini Live API</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
