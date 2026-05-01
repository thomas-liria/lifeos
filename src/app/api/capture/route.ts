import Anthropic from "@anthropic-ai/sdk";

// Force dynamic rendering so Next.js exposes runtime env vars (not static-build snapshot)
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a task extraction assistant for a personal life \
operating system. The user manages three workspaces: \
Personal, WeedGuys (a gardening and snow removal business), \
and SnapshotTO (an event photography and photobooth startup). \
They also have a School workspace that is inactive for now.

When given a raw input, extract the following as JSON only. \
No explanation, no markdown, just a raw JSON object:

{
  "text": "string — cleaned up task description",
  "workspace": "Personal | WeedGuys | SnapshotTO | unclear",
  "type": "task | reminder | note | gym-log",
  "urgency": "urgent | normal | someday",
  "dueDate": "today | tomorrow | this-week | YYYY-MM-DD | null",
  "confidence": "high | medium | low"
}

Rules:
- If the input mentions invoice, client, route, snow, garden, WeedGuys — workspace is WeedGuys
- If the input mentions photobooth, event, photo, booking, quote, SnapshotTO, snapshot — workspace is SnapshotTO
- If the input mentions gym, bench, squat, sets, reps, weight, workout — type is gym-log
- If workspace is genuinely unclear, set it to "unclear" so the user can assign it manually
- urgency is urgent if words like: urgent, asap, important, today, overdue, deadline appear
- Be generous with interpretation — the user types fast and messy`;

export interface CaptureResult {
  text:       string;
  workspace:  "Personal" | "WeedGuys" | "SnapshotTO" | "unclear";
  type:       "task" | "reminder" | "note" | "gym-log";
  urgency:    "urgent" | "normal" | "someday";
  dueDate:    "today" | "tomorrow" | "this-week" | string | null;
  confidence: "high" | "medium" | "low";
}

export async function POST(request: Request) {
  try {
    const { text } = (await request.json()) as { text: string };

    if (!text?.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    // Instantiate inside the handler so Next.js env vars are definitely loaded
    const apiKey = process.env["ANTHROPIC_API_KEY"];   // bracket notation avoids static inlining
    if (!apiKey) {
      console.error("[/api/capture] ANTHROPIC_API_KEY is not set");
      return Response.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 512,
      system: [
        {
          type:          "text",
          text:          SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: text.trim() }],
    });

    // Pull the text block out of the response
    const raw = response.content.find((b) => b.type === "text");
    if (!raw || raw.type !== "text") {
      return Response.json({ error: "Empty response from model" }, { status: 502 });
    }

    // Strip any accidental markdown fences
    const cleaned = raw.text.trim().replace(/^```[a-z]*\n?/i, "").replace(/```$/g, "");
    const result: CaptureResult = JSON.parse(cleaned);

    return Response.json(result);
  } catch (err) {
    console.error("[/api/capture]", err);
    return Response.json({ error: "Capture failed" }, { status: 500 });
  }
}
