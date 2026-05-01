"use client";

import { ThemeProvider } from "next-themes";
import PinGate from "@/components/PinGate";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
      <PinGate>{children}</PinGate>
    </ThemeProvider>
  );
}
