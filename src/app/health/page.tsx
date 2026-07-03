import Link from "next/link";

async function getHealthStatus() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default async function HealthPage() {
  const health = await getHealthStatus();

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Deployment health check</h1>
      <p>This page verifies whether the Vercel frontend can reach the Render backend and AI engine.</p>
      <p>
        <Link href="/">Go back home</Link>
      </p>
      {health ? (
        <pre style={{ background: "#f5f5f5", padding: 16, overflowX: "auto" }}>
{JSON.stringify(health, null, 2)}
        </pre>
      ) : (
        <p>Health endpoint returned an error. Check the Vercel deployment logs and Render service logs.</p>
      )}
    </main>
  );
}
