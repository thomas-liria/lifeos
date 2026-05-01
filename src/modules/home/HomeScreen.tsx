"use client";

import FocusCard           from "./FocusCard";
import GreetingCard        from "./GreetingCard";
import HabitsStrip         from "./HabitsStrip";
import SmartPlanCard       from "./SmartPlanCard";
import UpcomingEventsCard  from "./UpcomingEventsCard";
import WorkspaceChips      from "./WorkspaceChips";
import { useHomeData }     from "./useHomeData";

const DELAYS = ["0ms", "60ms", "120ms", "180ms", "240ms"];

function Card({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <div
      className="fade-in-card"
      style={{ animationDelay: DELAYS[index] ?? "0ms" }}
    >
      {children}
    </div>
  );
}

export default function HomeScreen() {
  const data = useHomeData();

  return (
    <div className="flex flex-col gap-6 py-5">
      <Card index={0}>
        <GreetingCard
          greeting={data.greeting}
          dateStr={data.dateStr}
          urgentCount={data.urgentCount}
          mounted={data.mounted}
        />
      </Card>

      <Card index={1}>
        <FocusCard tasks={data.focusTasks} mounted={data.mounted} />
      </Card>

      <Card index={2}>
        <WorkspaceChips
          counts={data.workspaceCounts}
          names={data.workspaceNames}
          mounted={data.mounted}
        />
      </Card>

      <Card index={3}>
        <HabitsStrip
          habits={data.habits}
          onToggle={data.toggleHabit}
          mounted={data.mounted}
        />
      </Card>

      <Card index={4}>
        <UpcomingEventsCard
          events={data.upcomingEvents}
          mounted={data.mounted}
          calendarLoading={data.calendarLoading}
        />
      </Card>

      <Card index={5}>
        <SmartPlanCard items={data.planItems} mounted={data.mounted} />
      </Card>
    </div>
  );
}
