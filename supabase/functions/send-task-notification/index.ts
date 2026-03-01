// Supabase Edge Function: send-task-notification
// Sends an email to the couple when a task is assigned to them.
//
// Required Supabase secret (set via Dashboard > Edge Functions > Secrets):
//   RESEND_API_KEY  — your Resend API key (https://resend.com)
//
// Optional secrets:
//   FROM_EMAIL      — sender address (default: notifications@yourdomain.com)
//   FROM_NAME       — sender display name (default: "Wedding Coordinator")
//
// Deploy:
//   supabase functions deploy send-task-notification

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API = "https://api.resend.com/emails"

serve(async (req) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
  const FROM_EMAIL     = Deno.env.get("FROM_EMAIL") || "notifications@cowc.app"
  const FROM_NAME      = Deno.env.get("FROM_NAME")  || "Your Wedding Coordinator"

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY secret is not set")
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  let body: { to: string; coupleName: string; taskTitle: string; taskDue?: string | null }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 })
  }

  const { to, coupleName, taskTitle, taskDue } = body
  if (!to || !coupleName || !taskTitle) {
    return new Response(JSON.stringify({ error: "Missing required fields: to, coupleName, taskTitle" }), { status: 400 })
  }

  // Build the due date string
  const dueLine = taskDue
    ? `<p style="margin:0 0 8px">📅 <strong>Due:</strong> ${new Date(taskDue + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>`
    : ""

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f9f6f2;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f2;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
        <!-- Header -->
        <tr>
          <td style="background:#2d3748;padding:32px 40px;text-align:center">
            <p style="margin:0;color:rgba(255,255,255,.5);font-size:11px;letter-spacing:.2em;text-transform:uppercase">Your Wedding</p>
            <h1 style="margin:4px 0 0;color:#c9a96e;font-size:24px;font-weight:400">New Task Added</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 40px">
            <p style="margin:0 0 16px;color:#718096;font-size:14px">Hi ${coupleName},</p>
            <p style="margin:0 0 20px;color:#2d3748;font-size:15px">
              Your coordinator has assigned a new task to your wedding checklist:
            </p>

            <div style="background:#f9f6f2;border-left:3px solid #c9a96e;border-radius:8px;padding:16px 20px;margin:0 0 24px">
              <p style="margin:0 0 8px;color:#2d3748;font-size:17px;font-weight:600">${taskTitle}</p>
              ${dueLine}
            </div>

            <p style="margin:0 0 24px;color:#718096;font-size:13px">
              Log in to your wedding portal to view all your tasks and mark this one complete.
            </p>

            <table cellpadding="0" cellspacing="0"><tr><td style="background:#c9a96e;border-radius:8px">
              <a href="${Deno.env.get("APP_URL") || "https://your-app.vercel.app"}"
                style="display:block;padding:12px 28px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;font-family:sans-serif">
                Open your portal →
              </a>
            </td></tr></table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 40px 28px;border-top:1px solid #f0ece6">
            <p style="margin:0;color:#a0aec0;font-size:11px;text-align:center">
              You're receiving this because you have an active wedding plan. Questions? Reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  // Send via Resend
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `New task: ${taskTitle}`,
      html,
    }),
  })

  const result = await res.json()

  if (!res.ok) {
    console.error("Resend error:", JSON.stringify(result))
    return new Response(JSON.stringify({ error: "Failed to send email", detail: result }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ success: true, id: result.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
