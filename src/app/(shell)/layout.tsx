import TopBar from "@/components/layout/TopBar";
import BottomTabBar from "@/components/layout/BottomTabBar";
import AssistantButton from "@/modules/assistant/AssistantButton";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      {/* pt-14: clears TopBar. pb-20: clears BottomTabBar */}
      <main className="pt-14 pb-20">
        {children}
      </main>
      <AssistantButton />
      <BottomTabBar />
    </div>
  );
}
