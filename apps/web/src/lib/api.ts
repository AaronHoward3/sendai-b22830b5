// apps/web/src/lib/api.ts
// If you set VITE_API_BASE_URL=https://your-api-host/api (on Vercel), we'll use it.
// Otherwise we default to '/api' so Vercel rewrites can proxy server-side.
const BASE =
  (import.meta as any)?.env?.VITE_API_BASE_URL?.replace(/\/$/, "") || "/api";

export function apiPath(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${p}`;
}

async function parseJsonOrThrow(res: Response) {
  const text = await res.text(); // read once so we can show the real error body
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${text.slice(0, 800)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON but got:\n${text.slice(0, 800)}`);
  }
}

export async function postJSON<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiPath(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // keep auth cookies for requireAuth
    body: body ? JSON.stringify(body) : undefined,
  });
  return parseJsonOrThrow(res) as Promise<T>;
}

export async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(apiPath(path), {
    method: "GET",
    credentials: "include",
  });
  return parseJsonOrThrow(res) as Promise<T>;
}

// Convenience helpers for your UI
export async function checkout(planId: string): Promise<void> {
  const { url } = await postJSON<{ url: string }>("/billing/checkout", { planId });
  window.location.assign(url);
}

export async function openBillingPortal(): Promise<void> {
  const { url } = await postJSON<{ url: string }>("/billing/portal");
  window.location.assign(url);
}
