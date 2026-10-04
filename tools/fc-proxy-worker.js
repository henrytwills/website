// Cloudflare Worker: CORS proxy for the FC Lazy-List Calculator.
//
// Keeps the Parse.bot API key server-side and only forwards requests to the
// one list_fc27_players endpoint, so it can't be used as an open proxy.
//
// Setup (free plan is fine):
//   1. Cloudflare dashboard → Workers & Pages → Create → Worker → paste this file → Deploy.
//   2. Worker → Settings → Variables and Secrets:
//        PARSEBOT_API_KEY  (type: Secret)  your Parse.bot key
//        ALLOWED_ORIGIN    (optional)      e.g. https://yoursite.com — defaults to "*"
//   3. Copy the worker URL (https://<name>.<you>.workers.dev) into PROXY_URL
//      in fc-lazy-list.html.

const UPSTREAM = "https://api.parse.bot/scraper/aceab8c4-b37d-4567-86d1-52688300a90b/list_fc27_players";
const ALLOWED_PARAMS = ["page", "min_rating", "league_id"];
const CACHE_SECONDS = 60;

export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Accept",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: cors });
    if (!env.PARSEBOT_API_KEY) return new Response("PARSEBOT_API_KEY secret is not set", { status: 500, headers: cors });

    // Rebuild the upstream URL from whitelisted, numeric-only params.
    const incoming = new URL(request.url).searchParams;
    const upstream = new URL(UPSTREAM);
    for (const key of ALLOWED_PARAMS) {
      const value = incoming.get(key);
      if (value !== null && /^\d{1,6}$/.test(value)) upstream.searchParams.set(key, value);
    }

    // Short edge cache so repeated refreshes don't burn API quota.
    const cache = caches.default;
    const cacheKey = new Request(upstream.toString());
    let response = await cache.match(cacheKey);

    if (!response) {
      const res = await fetch(upstream.toString(), {
        headers: { "X-API-Key": env.PARSEBOT_API_KEY, "Accept": "application/json" },
      });
      response = new Response(res.body, res);
      response.headers.set("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
      if (res.ok) ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    const out = new Response(response.body, response);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
