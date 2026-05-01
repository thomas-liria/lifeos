import TopBar from "@/components/layout/TopBar";
import SmartInputBar from "@/components/layout/SmartInputBar";
import BottomTabBar from "@/components/layout/BottomTabBar";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      {/* pt-14: clears TopBar. pb-32: clears SmartInputBar + BottomTabBar */}
      <main className="pt-14 pb-32">
        {children}
      </main>
      <SmartInputBar />
      <BottomTabBar />
    </div>
  );
}
