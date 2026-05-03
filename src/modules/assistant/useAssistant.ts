"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export interface Message {
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  createdAt: string;
}

export function useAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const router                  = useRouter();
  const loadedRef               = useRef(false);

  // Load last 30 messages from Supabase
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .order("created_at", { ascending: true })
      .limit(30)
      .then(({ data, error }) => {
        if (!error && data) {
          setMessages(
            data.map((m) => ({
              id:        m.id as string,
              role:      m.role as "user" | "assistant",
              content:   m.content as string,
              createdAt: m.created_at as string,
            }))
          );
        }
      }); // Graceful — panel still works without history
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id:        `tmp-${Date.now()}`,
      role:      "user",
      content:   text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: text.trim() }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { content: string; navigateTo?: string } = await res.json();

      const assistantMsg: Message = {
        id:        `tmp-${Date.now()}-a`,
        role:      "assistant",
        content:   data.content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.navigateTo) {
        router.push(data.navigateTo);
      }
    } catch {
      setError("Couldn't reach the assistant — try again");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
    }
  }, [loading, router]);

  const clearHistory = useCallback(async () => {
    await supabase.from("ai_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setMessages([]);
  }, []);

  return { messages, loading, error, sendMessage, clearHistory };
}
