import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim()?.replace(/\/+$/, "") ||
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/+$/, "") ||
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim()?.replace(/\/+$/, "") ||
  "http://localhost:8080";

async function parseBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return new URLSearchParams(text);
  }

  try {
    return await req.formData();
  } catch (_err) {
    const text = await req.text();
    return new URLSearchParams(text);
  }
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  const text = String(body.get("text") ?? "");
  const voice = String(body.get("voice") ?? "female");
  const language = String(body.get("language") ?? "en-IN");
  const outputFormat = String(body.get("output_format") ?? "mp3");

  if (!text.trim()) {
    return NextResponse.json(
      { error: "Text input is required for speech synthesis." },
      { status: 400 }
    );
  }

  const backendForm = new URLSearchParams();
  backendForm.append("text", text);
  backendForm.append("voice", voice);
  backendForm.append("language", language);
  backendForm.append("output_format", outputFormat);

  let response: Response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}/api/speech/synthesize`, {
      method: "POST",
      body: backendForm,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to reach the backend speech service." },
      { status: 503 }
    );
  }

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: error || "Speech synthesis request failed." },
      { status: response.status }
    );
  }

  const audioBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("Content-Type") || "audio/mpeg";

  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
    },
  });
}
