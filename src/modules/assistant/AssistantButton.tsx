"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Bot } from "lucide-react";

const AssistantPanel = dynamic(() => import("./AssistantPanel"), { ssr: false });

export default function AssistantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(true)}
        className="fixed z-50 flex items-center justify-center
          shadow-lg active:scale-95 transition-transform"
        style={{
          bottom:       "calc(4rem + 16px)", // above BottomTabBar
          right:        "16px",
          width:        "52px",
          height:       "52px",
          borderRadius: "50%",
          background:   "var(--primary)",
        }}
        aria-label="Open AI assistant"
      >
        <Bot size={22} color="white" />
      </button>

      {/* Panel overlay */}
      {open && <AssistantPanel onClose={() => setOpen(false)} />}
    </>
  );
}
