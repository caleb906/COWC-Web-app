// Edge function: transcribe-audio
// Accepts a multipart/form-data audio blob, forwards it to OpenAI Whisper,
// and returns the transcript text. Audio is never stored.
//
// Required Supabase secrets:
//   OPENAI_API_KEY  — OpenAI API key (for Whisper)
//
// Deploy:
//   supabase functions deploy transcribe-audio --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    })
  }

  // Expect multipart/form-data with an "audio" file field
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    })
  }

  const audioFile = formData.get("audio") as File | null
  if (!audioFile) {
    return new Response(JSON.stringify({ error: "Missing 'audio' field" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    })
  }

  // Forward to Whisper — file must have a recognisable extension
  // MediaRecorder typically produces webm; we'll name it accordingly
  const ext       = audioFile.type.includes("mp4") ? "mp4"
                  : audioFile.type.includes("ogg")  ? "ogg"
                  : "webm"
  const fileName  = `recording.${ext}`

  const whisperForm = new FormData()
  whisperForm.append("file", new File([await audioFile.arrayBuffer()], fileName, { type: audioFile.type }))
  whisperForm.append("model", "whisper-1")
  whisperForm.append("response_format", "text")

  try {
    const resp = await fetch(WHISPER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: whisperForm,
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error("Whisper error:", err)
      return new Response(JSON.stringify({ error: "Transcription failed", detail: err }), {
        status: 502, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    // response_format=text returns plain text, not JSON
    const transcript = await resp.text()
    return new Response(
      JSON.stringify({ transcript: transcript.trim() }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    )
  } catch (e) {
    console.error("Transcription network error:", e)
    return new Response(JSON.stringify({ error: "Network error during transcription" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    })
  }
})
