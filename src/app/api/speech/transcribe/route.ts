import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_AI_ENGINE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8000";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  const language = String(formData.get("language") ?? "auto");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing audio file for transcription." },
      { status: 400 }
    );
  }

  const audioBuffer = await file.arrayBuffer();
  const contentType = file.type || "audio/webm";

  const backendForm = new FormData();
  backendForm.append("file", new Blob([audioBuffer], { type: contentType }), "audio.webm");
  backendForm.append("language", language);

  const response = await fetch(`${BACKEND_BASE_URL}/api/speech/transcribe`, {
    method: "POST",
    body: backendForm,
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: error || "Speech transcription request failed." },
      { status: response.status }
    );
  }

  const payload = await response.json();
  return NextResponse.json({ transcript: payload.transcript ?? payload.text ?? "" });
}
