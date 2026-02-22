export type AuthUser = {
  id: string;
  email: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  user: AuthUser;
};

type SupabaseTokenResponse = {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number | null;
  expires_in?: number | null;
  user?: {
    id: string;
    email?: string | null;
  } | null;
};

type SupabaseUserResponse = {
  id: string;
  email?: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function hasSupabaseBrowserConfig(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

function buildAuthUrl(path: string): string {
  return `${SUPABASE_URL}/auth/v1/${path}`;
}

function computeExpiresAt(payload: SupabaseTokenResponse): number | null {
  if (typeof payload.expires_at === "number" && Number.isFinite(payload.expires_at)) {
    return payload.expires_at;
  }

  if (typeof payload.expires_in === "number" && Number.isFinite(payload.expires_in)) {
    return Math.floor(Date.now() / 1000) + payload.expires_in;
  }

  return null;
}

function mapSession(payload: SupabaseTokenResponse): AuthSession {
  if (!payload.access_token || !payload.user?.id) {
    throw new Error("Invalid auth response from Supabase.");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: computeExpiresAt(payload),
    user: {
      id: payload.user.id,
      email: payload.user.email ?? null
    }
  };
}

function sharedHeaders(accessToken?: string): HeadersInit {
  const headers: HeadersInit = {
    apikey: SUPABASE_ANON_KEY,
    "content-type": "application/json"
  };

  if (accessToken) {
    return {
      ...headers,
      Authorization: `Bearer ${accessToken}`
    };
  }

  return headers;
}

async function parseError(response: Response): Promise<never> {
  const text = await response.text();
  throw new Error(text || `Supabase auth request failed (${response.status}).`);
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthSession | null> {
  if (!hasSupabaseBrowserConfig()) {
    throw new Error("Supabase auth is not configured.");
  }

  const response = await fetch(buildAuthUrl("signup"), {
    method: "POST",
    headers: sharedHeaders(),
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as SupabaseTokenResponse & { session?: SupabaseTokenResponse | null };
  if (!payload.access_token || !payload.user?.id) {
    return null;
  }

  return mapSession(payload);
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  if (!hasSupabaseBrowserConfig()) {
    throw new Error("Supabase auth is not configured.");
  }

  const response = await fetch(buildAuthUrl("token?grant_type=password"), {
    method: "POST",
    headers: sharedHeaders(),
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as SupabaseTokenResponse;
  return mapSession(payload);
}

export async function refreshAuthSession(refreshToken: string): Promise<AuthSession> {
  if (!hasSupabaseBrowserConfig()) {
    throw new Error("Supabase auth is not configured.");
  }

  const response = await fetch(buildAuthUrl("token?grant_type=refresh_token"), {
    method: "POST",
    headers: sharedHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as SupabaseTokenResponse;
  return mapSession(payload);
}

export async function getUserFromAccessToken(accessToken: string): Promise<AuthUser> {
  if (!hasSupabaseBrowserConfig()) {
    throw new Error("Supabase auth is not configured.");
  }

  const response = await fetch(buildAuthUrl("user"), {
    method: "GET",
    headers: sharedHeaders(accessToken)
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as SupabaseUserResponse;
  return {
    id: payload.id,
    email: payload.email ?? null
  };
}

export async function signOutWithAccessToken(accessToken: string): Promise<void> {
  if (!hasSupabaseBrowserConfig()) {
    return;
  }

  await fetch(buildAuthUrl("logout"), {
    method: "POST",
    headers: sharedHeaders(accessToken)
  });
}
