import { NextRequest } from "next/server";

export type SupabaseAuthUser = {
  id: string;
  email: string | null;
};

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";

export function hasSupabaseServerConfig(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_SERVICE_ROLE_KEY.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

function withNoTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function authHeadersWithToken(token: string): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "content-type": "application/json"
  };
}

function serviceRoleHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("apikey", SUPABASE_SERVICE_ROLE_KEY);
  headers.set("Authorization", `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`);
  return headers;
}

export function getAccessTokenFromRequest(request: NextRequest | Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function getUserFromAccessToken(token: string): Promise<SupabaseAuthUser | null> {
  if (!hasSupabaseServerConfig()) {
    return null;
  }

  const endpoint = `${withNoTrailingSlash(SUPABASE_URL)}/auth/v1/user`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: authHeadersWithToken(token),
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { id?: string; email?: string | null };
  if (!payload.id) {
    return null;
  }

  return {
    id: payload.id,
    email: payload.email ?? null
  };
}

export async function supabaseRest<T>(pathWithQuery: string, init?: RequestInit): Promise<T> {
  if (!hasSupabaseServerConfig()) {
    throw new Error("Supabase server config is missing.");
  }

  const endpoint = `${withNoTrailingSlash(SUPABASE_URL)}/rest/v1/${pathWithQuery.replace(/^\/+/, "")}`;
  const response = await fetch(endpoint, {
    ...init,
    headers: serviceRoleHeaders(init?.headers),
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase REST failed (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return [] as T;
  }

  return (await response.json()) as T;
}
