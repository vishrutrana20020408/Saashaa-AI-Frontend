import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

export async function POST(req: Request) {
  const payload = await req.json();

  const response = await fetch(`${BACKEND_BASE_URL}/api/interview/face-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: error || "Face check request failed." },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
