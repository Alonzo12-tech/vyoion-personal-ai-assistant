import { DurableObject } from "cloudflare:workers";

const CHAT_MODEL = "gemini-3.5-flash-lite";
const SPEECH_MODEL = "gemini-3.8-flash-lite-tts";
const LIVE_MODEL = "models/gemini-3.8-live";
const MAX_BODY_BYTES = 28_000_000;
const GOOGLE_API = "https://generativelanguage.googleapis.com";

function json(body, status = 200, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(body), { status, headers });
}

function integerSetting(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function hashClientAddress(address) {
  const bytes = new TextEncoder().encode(address || "unknown-client");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function reserveUsage(env, clientHash) {
  const id = env.USAGE_GATE.idFromName("shared-budget");
  const gate = env.USAGE_GATE.get(id);
  const response = await gate.fetch("https://usage-gate/reserve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientHash,
      perMinute: integerSetting(env.PER_IP_PER_MINUTE, 12),
      perDay: integerSetting(env.PER_IP_PER_DAY, 120),
      globalPerDay: integerSetting(env.GLOBAL_PER_DAY, 2000),
    }),
  });
  if (response.ok) return null;
  const body = await response.json().catch(() => ({}));
  return json(
    { error: body.error || "The shared service has reached its request limit. Please try again later." },
    response.status,
    { "retry-after": String(body.retryAfter || 60) },
  );
}

function resolveUpstreamRoute(url, method) {
  if (method === "GET" && url.pathname === "/v1beta/models") {
    return { url: `${GOOGLE_API}/v1beta/models?pageSize=100`, method: "GET" };
  }

  const modelRoute = url.pathname.match(/^\/v1beta\/models\/([a-z0-9.-]+):(streamGenerateContent|generateContent)$/i);
  if (modelRoute && method === "POST") {
    const [, model, operation] = modelRoute;
    if (operation === "streamGenerateContent" && model === CHAT_MODEL && url.searchParams.get("alt") === "sse") {
      return { url: `${GOOGLE_API}${url.pathname}?alt=sse`, method: "POST" };
    }
    if (operation === "generateContent" && model === SPEECH_MODEL && !url.search) {
      return { url: `${GOOGLE_API}${url.pathname}`, method: "POST" };
    }
  }

  if (method === "POST" && url.pathname === "/v1beta/auth_tokens" && !url.search) {
    return { url: `${GOOGLE_API}/v1beta/auth_tokens`, method: "POST", validateLiveToken: true };
  }
  return null;
}

async function validateLiveTokenRequest(request) {
  let payload;
  try {
    payload = await request.clone().json();
  } catch {
    return false;
  }
  const setup = payload?.bidiGenerateContentSetup;
  const now = Date.now();
  const startExpiry = Date.parse(payload?.newSessionExpireTime || "");
  const sessionExpiry = Date.parse(payload?.expireTime || "");
  return payload?.uses === 1
    && setup?.model === LIVE_MODEL
    && Array.isArray(setup?.generationConfig?.responseModalities)
    && setup.generationConfig.responseModalities.includes("AUDIO")
    && Number.isFinite(startExpiry) && startExpiry > now && startExpiry <= now + 2 * 60_000
    && Number.isFinite(sessionExpiry) && sessionExpiry > now && sessionExpiry <= now + 35 * 60_000;
}

export class UsageGate extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
  }

  async fetch(request) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/reserve") {
      return json({ error: "Not found." }, 404);
    }

    let input;
    try {
      input = await request.json();
    } catch {
      return json({ error: "Invalid usage reservation." }, 400);
    }
    if (!/^[a-f0-9]{64}$/.test(input.clientHash || "")) {
      return json({ error: "Invalid client identity." }, 400);
    }

    const now = Date.now();
    const minuteBucket = Math.floor(now / 60_000);
    const dayBucket = Math.floor(now / 86_400_000);
    const clientKey = `client:${input.clientHash}`;
    const globalKey = "global";
    const outcome = await this.ctx.storage.transaction(async (transaction) => {
      const client = await transaction.get(clientKey) || {};
      const global = await transaction.get(globalKey) || {};
      const clientMinuteCount = client.minuteBucket === minuteBucket ? client.minuteCount || 0 : 0;
      const clientDayCount = client.dayBucket === dayBucket ? client.dayCount || 0 : 0;
      const globalDayCount = global.dayBucket === dayBucket ? global.dayCount || 0 : 0;
      let retryAfter = 60;

      if (clientMinuteCount >= integerSetting(input.perMinute, 12)) {
        retryAfter = Math.max(1, Math.ceil(((minuteBucket + 1) * 60_000 - now) / 1000));
        return { allowed: false, retryAfter };
      }
      if (clientDayCount >= integerSetting(input.perDay, 120)
        || globalDayCount >= integerSetting(input.globalPerDay, 2000)) {
        retryAfter = Math.max(1, Math.ceil(((dayBucket + 1) * 86_400_000 - now) / 1000));
        return { allowed: false, retryAfter };
      }

      await transaction.put(clientKey, {
        minuteBucket,
        minuteCount: clientMinuteCount + 1,
        dayBucket,
        dayCount: clientDayCount + 1,
      });
      await transaction.put(globalKey, { dayBucket, dayCount: globalDayCount + 1 });
      return { allowed: true };
    });

    if (!outcome.allowed) {
      return json(
        { error: "The shared service has reached its request limit. Please try again later.", retryAfter: outcome.retryAfter },
        429,
      );
    }
    return json({ allowed: true });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "vyoiōn shared API" });
    }
    if (!env.GEMINI_API_KEY || !env.USAGE_GATE) {
      return json({ error: "The shared service is not configured." }, 503);
    }

    const route = resolveUpstreamRoute(url, request.method);
    if (!route) return json({ error: "This API operation is not available." }, 404);

    if (route.method === "POST") {
      const bodyLength = Number(request.headers.get("content-length") || 0);
      if (!Number.isSafeInteger(bodyLength) || bodyLength <= 0 || bodyLength > MAX_BODY_BYTES) {
        return json({ error: "The request is too large or has no valid content length." }, 413);
      }
      if (route.validateLiveToken && !(await validateLiveTokenRequest(request))) {
        return json({ error: "The live session request is invalid." }, 400);
      }
    }

    const clientHash = await hashClientAddress(request.headers.get("cf-connecting-ip"));
    try {
      const limited = await reserveUsage(env, clientHash);
      if (limited) return limited;
    } catch {
      return json({ error: "The shared service could not check its request limit." }, 503);
    }

    const headers = new Headers({
      "x-goog-api-key": env.GEMINI_API_KEY,
      accept: request.headers.get("accept") || "application/json",
    });
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    try {
      const upstream = await fetch(route.url, {
        method: route.method,
        headers,
        body: route.method === "POST" ? request.body : undefined,
        redirect: "manual",
        signal: request.signal,
      });
      const responseHeaders = new Headers();
      for (const name of ["content-type", "cache-control", "retry-after", "x-request-id"]) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders.set(name, value);
      }
      responseHeaders.set("cache-control", "no-store");
      responseHeaders.set("x-content-type-options", "nosniff");
      return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      });
    } catch {
      return json({ error: "The shared service could not reach the cloud API." }, 502);
    }
  },
};
