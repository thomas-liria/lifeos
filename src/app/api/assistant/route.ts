import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are the personal AI assistant for Thomas, a 25-year-old in Hamilton, Ontario managing his daily life, two businesses (WeedGuys Gardening & Snow Removal, SnapshotTO event photography), a part-time job, and personal health goals.

You have full context of his tasks, routine, habits, and schedule. You are direct, helpful, and ADHD-aware — you give clear, actionable responses without overwhelming detail.

When Thomas asks you to add a task, do it directly using the add_task tool.
When he asks to mark a task complete, use the complete_task tool.
When he asks what he should do today, synthesize his full context and give him a clear prioritized answer.
When he asks about his businesses, give him focused advice.
When he asks to navigate somewhere in the app, use the navigate tool.
You remember previous conversations.

Always respond in plain conversational language. Never use bullet points unless he asks for a list. Keep responses concise — he is busy.

Workspace IDs: personal, weedguys, snapshotto
Urgency values: urgent, normal, someday`;

const tools: Anthropic.Tool[] = [
  {
    name: "add_task",
    description: "Add a new task directly to the user's task list in the database.",
    input_schema: {
      type: "object" as const,
      properties: {
        text:      { type: "string", description: "The task description" },
        workspace: { type: "string", enum: ["personal", "weedguys", "snapshotto"] },
        urgency:   { type: "string", enum: ["urgent", "normal", "someday"] },
        due_date:  { type: "string", description: "YYYY-MM-DD format, or omit for no due date" },
      },
      required: ["text", "workspace", "urgency"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as complete by its ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "The UUID of the task to complete" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "navigate",
    description: "Navigate the app to a specific screen.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "App path e.g. /tasks?workspace=weedguys, /home, /routine, /log, /calendar" },
      },
      required: ["path"],
    },
  },
];

export async function POST(request: Request) {
  try {
    const { message } = (await request.json()) as { message: string };
    if (!message?.trim()) {
      return Response.json({ error: "No message provided" }, { status: 400 });
    }

    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) return Response.json({ error: "Server misconfiguration" }, { status: 500 });

    const client = new Anthropic({ apiKey });
    const db     = createServerClient();

    // ── Fetch context ─────────────────────────────────────────────────────────
    const today = new Date().toLocaleDateString("en-CA");
    const now   = new Date().toLocaleString("en-US", { timeZone: "America/Toronto", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

    const [tasksRes, habitRes, gymRes, prevMsgsRes] = await Promise.all([
      db.from("tasks").select("id,text,workspace,urgency,due_date,completed").order("created_at"),
      db.from("habit_completions").select("habit_name,completed_date").eq("completed_date", today),
      db.from("gym_sessions").select("session_type,started_at,created_at").order("created_at", { ascending: false }).limit(5),
      db.from("ai_messages").select("role,content").order("created_at", { ascending: true }).limit(30),
    ]);

    const tasks       = tasksRes.data    ?? [];
    const habits      = habitRes.data    ?? [];
    const gymSessions = gymRes.data      ?? [];
    const prevMsgs    = prevMsgsRes.data ?? [];

    const incompleteTasks = tasks.filter((t) => !t.completed);
    const completedToday  = tasks.filter((t) => t.completed);

    const context = `Current datetime: ${now}
Today's date: ${today}

INCOMPLETE TASKS (${incompleteTasks.length} total):
${incompleteTasks.map((t) => `- [${t.id}] [${t.workspace}] [${t.urgency}] ${t.text}${t.due_date ? ` (due: ${t.due_date})` : ""}`).join("\n") || "None"}

COMPLETED TODAY: ${completedToday.length} tasks

TODAY'S HABITS COMPLETED:
${habits.map((h) => `- ${h.habit_name}`).join("\n") || "None yet"}

RECENT GYM SESSIONS (last 5):
${gymSessions.map((s) => `- ${s.session_type} on ${(s.started_at || s.created_at).slice(0, 10)}`).join("\n") || "No recent sessions"}`;

    // ── Build message history ─────────────────────────────────────────────────
    const history: Anthropic.MessageParam[] = prevMsgs.map((m) => ({
      role:    m.role as "user" | "assistant",
      content: m.content,
    }));
    history.push({ role: "user", content: message });

    // ── Save user message ─────────────────────────────────────────────────────
    await db.from("ai_messages").insert({ role: "user", content: message });

    // ── Call Claude ───────────────────────────────────────────────────────────
    let navigateTo: string | undefined;
    let assistantText = "";

    // Tool-use loop
    const messages: Anthropic.MessageParam[] = [...history];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await client.messages.create({
        model:      "claude-opus-4-7",
        max_tokens: 1024,
        system:     [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          { type: "text", text: `\n\n${context}` },
        ],
        tools,
        messages,
      });

      // Collect text
      for (const block of response.content) {
        if (block.type === "text") assistantText += block.text;
      }

      if (response.stop_reason !== "tool_use") break;

      // Process tool calls
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        if (block.type !== "tool_use") continue;

        if (block.name === "add_task") {
          const inp = block.input as { text: string; workspace: string; urgency: string; due_date?: string };
          const { error } = await db.from("tasks").insert({
            text:      inp.text,
            workspace: inp.workspace,
            urgency:   inp.urgency,
            due_date:  inp.due_date ?? null,
            completed: false,
          });
          toolResults.push({
            type: "tool_result", tool_use_id: block.id,
            content: error ? `Error: ${error.message}` : `Task "${inp.text}" added to ${inp.workspace}.`,
          });

        } else if (block.name === "complete_task") {
          const inp = block.input as { task_id: string };
          const { error } = await db.from("tasks")
            .update({ completed: true, completed_at: new Date().toISOString() })
            .eq("id", inp.task_id);
          toolResults.push({
            type: "tool_result", tool_use_id: block.id,
            content: error ? `Error: ${error.message}` : "Task marked complete.",
          });

        } else if (block.name === "navigate") {
          const inp = block.input as { path: string };
          navigateTo = inp.path;
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Navigating to ${inp.path}` });
        }
      }

      // Continue with tool results
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user",      content: toolResults });
    }

    // ── Save assistant response ───────────────────────────────────────────────
    if (assistantText) {
      await db.from("ai_messages").insert({ role: "assistant", content: assistantText });
    }

    return Response.json({ content: assistantText, navigateTo });

  } catch (err) {
    console.error("[/api/assistant]", err);
    return Response.json({ error: "Assistant error" }, { status: 500 });
  }
}
