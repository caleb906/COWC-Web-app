// Edge function: process-coordinator-note
// Reads a coordinator's raw note + wedding context, calls Claude Haiku to
// extract structured suggestions, saves the note to coordinator_notes, and
// returns the suggestions array for immediate review.
//
// Required Supabase secrets:
//   ANTHROPIC_API_KEY  — Anthropic API key
//
// Deploy:
//   supabase functions deploy process-coordinator-note --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const CLAUDE_API = "https://api.anthropic.com/v1/messages"
const MODEL      = "claude-haiku-4-5-20251001"

// Vendor categories the app understands
const VENDOR_CATEGORIES = [
  "photographer","videographer","florist","dj","caterer",
  "baker","hair_makeup","officiant","venue","transportation","other",
]

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  let body: { note_text: string; wedding_id?: string; user_id?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    })
  }

  const { note_text, wedding_id, user_id } = body
  if (!note_text?.trim()) {
    return new Response(JSON.stringify({ error: "note_text is required" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    })
  }

  // ── Fetch wedding context ──────────────────────────────────────────────────
  let weddingContext = ""
  let weddingRow: Record<string, unknown> | null = null

  if (wedding_id) {
    const { data: w } = await supabase
      .from("weddings")
      .select(`
        id, couple_name, wedding_date, ceremony_time, venue_name, venue_address,
        guest_count, budget, notes,
        tasks(id, title, completed, due_date, assigned_to),
        vendors(id, name, category, status, cost),
        timeline_items(id, title, time, sort_order)
      `)
      .eq("id", wedding_id)
      .single()

    if (w) {
      weddingRow = w
      const vendors = (w.vendors as Array<Record<string,unknown>>) || []
      const tasks   = (w.tasks   as Array<Record<string,unknown>>) || []
      const tl      = (w.timeline_items as Array<Record<string,unknown>>) || []

      const vendorSummary = vendors.length
        ? vendors.map((v: Record<string,unknown>) => `${v.category}: ${v.name} (${v.status})`).join(", ")
        : "none yet"

      const openTasks = tasks.filter((t: Record<string,unknown>) => !t.completed)
      const taskSummary = openTasks.length
        ? openTasks.slice(0, 6).map((t: Record<string,unknown>) => t.title).join("; ")
        : "none"

      const tlSummary = tl.length
        ? tl.slice(0, 8).map((t: Record<string,unknown>) => `${t.time || "??"} ${t.title}`).join(", ")
        : "none"

      weddingContext = `
WEDDING CONTEXT:
- Couple: ${w.couple_name}
- Date: ${w.wedding_date || "TBD"}
- Ceremony time: ${w.ceremony_time || "TBD"}
- Venue: ${w.venue_name || "TBD"}${w.venue_address ? `, ${w.venue_address}` : ""}
- Guest count: ${w.guest_count || "TBD"}
- Budget: ${w.budget ? `$${w.budget}` : "TBD"}
- Existing vendors: ${vendorSummary}
- Open tasks: ${taskSummary}
- Current timeline: ${tlSummary}
`
    }
  }

  // ── Build Claude prompt ────────────────────────────────────────────────────
  const systemPrompt = `You are a wedding coordination assistant. Extract structured, actionable data from a coordinator's notes and return ONLY valid JSON.

${weddingContext}

Return this exact JSON structure:
{
  "suggestions": [
    {
      "type": "vendor" | "timeline_item" | "task" | "wedding_update",
      "action": "create" | "update",
      "confidence": "high" | "medium",
      "summary": "short human-readable label (max 60 chars)",
      "data": { ...type-specific fields }
    }
  ]
}

Field specs by type:

vendor → data = {
  name: string,
  category: one of [${VENDOR_CATEGORIES.join(",")}],
  cost: number | null,
  phone: string | null,
  contact_email: string | null,
  website: string | null,
  notes: string | null,
  status: "confirmed" | "pending" | "considering"
}

timeline_item → data = {
  title: string,
  time: "HH:MM" (24-hour) | null,
  description: string | null,
  duration_minutes: number | null
}

task → data = {
  title: string,
  description: string | null,
  due_date: "YYYY-MM-DD" | null,
  assigned_to: "coordinator" | "couple",
  priority: "high" | "medium" | "low"
}

wedding_update → data = {
  field: "venue_name" | "venue_address" | "guest_count" | "ceremony_time" | "notes",
  value: string | number
}

Rules:
- Only extract information clearly stated in the note. Never infer or hallucinate.
- Do not suggest things that already exist in the wedding context.
- If a cost is mentioned with currency symbols or words like "around" / "about", extract the number.
- If nothing actionable is found, return { "suggestions": [] }.
- Return ONLY the JSON object. No explanation, no markdown.`

  // ── Call Claude ────────────────────────────────────────────────────────────
  let suggestions: unknown[] = []
  try {
    const resp = await fetch(CLAUDE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: note_text }],
        system: systemPrompt,
      }),
    })

    const claudeData = await resp.json()
    const raw = claudeData?.content?.[0]?.text || "{}"

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```json\s*/,"").replace(/```\s*$/,"").trim()
    const parsed = JSON.parse(cleaned)
    suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
  } catch (e) {
    console.error("Claude extraction error:", e)
    // Return empty suggestions rather than failing — the user can still save the raw note
    suggestions = []
  }

  // ── Save note to DB ────────────────────────────────────────────────────────
  let noteId: string | null = null
  if (user_id) {
    try {
      const { data: orgRow } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user_id)
        .single()

      const { data: noteRow } = await supabase
        .from("coordinator_notes")
        .insert({
          created_by:      user_id,
          wedding_id:      wedding_id || null,
          organization_id: orgRow?.organization_id || null,
          raw_text:        note_text,
          suggestions:     suggestions,
          status:          suggestions.length > 0 ? "ready" : "draft",
        })
        .select("id")
        .single()

      noteId = noteRow?.id || null
    } catch (e) {
      console.error("Note save error:", e)
    }
  }

  return new Response(
    JSON.stringify({ suggestions, note_id: noteId }),
    { headers: { ...CORS, "Content-Type": "application/json" } },
  )
})
