export const config = { runtime: "edge" };

const TARGET_BASE = "https://proxy.mtwsistemas.store";

const STRIP_HEADERS = new Set([
  "host","connection","keep-alive","proxy-authenticate","proxy-authorization",
  "te","trailer","transfer-encoding","upgrade","forwarded",
  "x-forwarded-host","x-forwarded-proto","x-forwarded-port",
]);

export default async function handler(req) {
  try {
    const pathStart = req.url.indexOf("/", 8);
    const targetUrl = pathStart === -1 ? TARGET_BASE + "/" : TARGET_BASE + req.url.slice(pathStart);
    const out = new Headers();
    let clientIp = null;
    for (const [k, v] of req.headers) {
      if (STRIP_HEADERS.has(k) || k.startsWith("x-vercel-")) continue;
      if (k === "x-real-ip") { clientIp = v; continue; }
      if (k === "x-forwarded-for") { if (!clientIp) clientIp = v; continue; }
      out.set(k, v);
    }
    if (clientIp) out.set("x-forwarded-for", clientIp);
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    return await fetch(targetUrl, {
      method: req.method, headers: out,
      body: hasBody ? req.body : undefined,
      duplex: "half", redirect: "manual",
    });
  } catch (err) {
    return new Response("Bad Gateway: " + err.message, { status: 502 });
  }
}
