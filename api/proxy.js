export const config = { runtime: "edge" };

const TARGET = "https://proxy.mtwsistemas.store";

const HOP_BY_HOP = new Set([
  "host","connection","keep-alive","te","trailer","transfer-encoding",
  "upgrade","proxy-authenticate","proxy-authorization","forwarded",
  "x-forwarded-host","x-forwarded-proto","x-forwarded-port",
  "x-real-ip","x-forwarded-for",
]);

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const target = new URL(url.pathname + url.search, TARGET);

    const outHeaders = new Headers();
    for (const [k, v] of req.headers) {
      if (HOP_BY_HOP.has(k) || k.startsWith("x-vercel-")) continue;
      outHeaders.set(k, v);
    }
    outHeaders.set("host", new URL(TARGET).host);

    const init = {
      method: req.method,
      headers: outHeaders,
      redirect: "manual",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      const body = await req.arrayBuffer();
      init.body = body;
    }

    const upstream = await fetch(target.toString(), init);

    const respHeaders = new Headers();
    for (const [k, v] of upstream.headers) {
      if (!HOP_BY_HOP.has(k)) respHeaders.set(k, v);
    }
    respHeaders.delete("content-length");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response("Bad Gateway: " + err.message, { status: 502 });
  }
}
