"use client";

interface Props {
  greeting:    string;
  dateStr:     string;
  urgentCount: number;
  mounted:     boolean;
}

export default function GreetingCard({ greeting, dateStr, urgentCount, mounted }: Props) {
  const urgencyLine = !mounted
    ? " "                                                 // non-breaking space keeps height stable
    : urgentCount === 0
      ? "You're clear — nothing urgent today"
      : `You have ${urgentCount} ${urgentCount === 1 ? "thing" : "things"} that need you today`;

  return (
    <div className="px-4 pt-2">
      <p className="text-xs text-foreground/45 tracking-wide">{dateStr || " "}</p>
      <h1 className="text-[1.6rem] font-medium text-foreground mt-0.5 leading-tight">
        {greeting || " "}
      </h1>
      <p className="text-sm text-foreground/55 mt-1.5 min-h-[1.25rem]">{urgencyLine}</p>
    </div>
  );
}
