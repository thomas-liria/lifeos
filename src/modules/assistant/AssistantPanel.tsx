"use client";

import { useEffect, useRef, useState } from "react";
import { X, ArrowUp, Bot, Trash2 } from "lucide-react";
import { useAssistant } from "./useAssistant";

interface Props {
  onClose: () => void;
}

export default function AssistantPanel({ onClose }: Props) {
  const { messages, loading, error, sendMessage, clearHistory } = useAssistant();
  const [input, setInput]   = useState("");
  const bottomRef           = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape") onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="flex flex-col rounded-t-3xl overflow-hidden"
        style={{
          background:  "var(--surface)",
          height:      "85dvh",
          borderTop:   "0.5px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3"
          style={{ borderBottom: "0.5px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "var(--primary)", opacity: 0.9 }}>
              <Bot size={16} color="white" />
            </div>
            <span className="font-medium text-[15px]" style={{ color: "var(--text)" }}>
              Assistant
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearHistory}
              className="opacity-40 hover:opacity-70 transition-opacity"
              title="Clear history"
            >
              <Trash2 size={16} style={{ color: "var(--text)" }} />
            </button>
            <button
              onClick={onClose}
              className="opacity-40 hover:opacity-70 transition-opacity"
            >
              <X size={20} style={{ color: "var(--text)" }} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
              <Bot size={32} style={{ color: "var(--text-muted)" }} />
              <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                Ask me anything — your tasks, schedule,<br />what to focus on, or add something new.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed"
                style={msg.role === "user"
                  ? { background: "var(--primary)", color: "white", borderBottomRightRadius: 6 }
                  : { background: "var(--bg)", color: "var(--text)", borderBottomLeftRadius: 6, border: "0.5px solid var(--border)" }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3" style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderBottomLeftRadius: 6 }}>
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((delay) => (
                    <div key={delay} className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: "var(--text-muted)", animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-center text-[12px]" style={{ color: "var(--urgent)" }}>{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3" style={{ borderTop: "0.5px solid var(--border)" }}>
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              placeholder="Ask me anything…"
              className="w-full rounded-2xl text-[15px] pl-4 pr-12 py-3 disabled:opacity-60 focus:outline-none"
              style={{
                background: "var(--bg)",
                border:     "0.5px solid var(--border)",
                color:      "var(--text)",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-2 w-8 h-8 rounded-full flex items-center justify-center
                transition-all disabled:opacity-30 active:scale-90"
              style={{ background: "var(--primary)" }}
            >
              <ArrowUp size={16} color="white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
