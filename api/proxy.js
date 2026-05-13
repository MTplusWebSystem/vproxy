export const config = { runtime: "edge" };

const TARGET = "proxy.mtwsistemas.store";

const HOP_BY_HOP = new Set([
  "host","connection","keep-alive","te","trailer","transfer-encoding",
  "upgrade","proxy-authenticate","proxy-authorization","forwarded",
  "x-forwarded-host","x-forwarded-proto","x-forwarded-port",
  "x-real-ip","x-forwarded-for",
]);

export default async function handler(req) {
  const { pathname, search } = new URL(req.url);
  const outHeaders = new Headers();
  let clientIp = null;

  for (const [k, v] of req.headers) {
    if (HOP_BY_HOP.has(k) || k.startsWith("x-vercel-")) continue;
    if (k === "x-real-ip" || k === "x-forwarded-for") { clientIp ??= v; continue; }
    outHeaders.set(k, v);
  }

  outHeaders.set("host", new URL(TARGET).host);
  if (clientIp) outHeaders.set("x-forwarded-for", clientIp);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  let upstream;
  try {
    upstream = await fetch(TARGET + pathname + search, {
      method: req.method,
      headers: outHeaders,
      body: hasBody ? req.body : null,
      duplex: "half",
      redirect: "manual",
    });
  } catch (err) {
    return new Response("Bad Gateway: " + err.message, { status: 502 });
  }

  const respHeaders = new Headers();
  for (const [k, v] of upstream.headers) {
    if (!HOP_BY_HOP.has(k)) respHeaders.set(k, v);
  }
  respHeaders.delete("content-length");

  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}
