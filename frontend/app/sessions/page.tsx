"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Calendar,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionSummary {
  id: string;
  date: string;
  transcriptLength: number;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    const data = localStorage.getItem("novispace_sessions");
    if (data) {
      setSessions(JSON.parse(data));
    }
  }, []);

  const deleteSession = (id: string) => {
    localStorage.removeItem(`novispace_session_${id}`);
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    localStorage.setItem("novispace_sessions", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">NoviSpace</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Past Consultations</h1>
            <p className="mt-1 text-muted-foreground">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <Link href="/consult">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" /> New Consultation
            </Button>
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 py-16">
            <MessageSquare className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <h2 className="text-lg font-medium">No sessions yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a consultation to see your history here.
            </p>
            <Link href="/consult" className="mt-4">
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" /> Start First Consultation
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const date = new Date(s.date);
              return (
                <div key={s.id} className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
                  <Link href={`/report/${s.id}`} className="flex flex-1 items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                      <Calendar className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {date.toLocaleDateString("en-CA", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {date.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
                        {" — "}
                        {s.transcriptLength} messages
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                  <button
                    onClick={() => deleteSession(s.id)}
                    className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Delete session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
