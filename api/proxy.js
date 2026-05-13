const https = require("https");
const url = require("url");

const TARGET = "proxy.mtwsistemas.store";

const STRIP_HEADERS = new Set([
  "host","connection","keep-alive","te","trailer","transfer-encoding",
  "upgrade","proxy-authenticate","proxy-authorization",
  "x-forwarded-host","x-forwarded-proto","x-forwarded-port",
]);

module.exports = function handler(req, res) {
  const parsed = url.parse(req.url);

  const options = {
    hostname: TARGET,
    port: 443,
    path: parsed.path || "/",
    method: req.method,
    headers: {},
    rejectUnauthorized: false, // insecure=1
  };

  for (const [k, v] of Object.entries(req.headers)) {
    if (STRIP_HEADERS.has(k)) continue;
    if (k.startsWith("x-vercel-")) continue;
    options.headers[k] = v;
  }
  options.headers["host"] = TARGET;

  const proxy = https.request(options, (upstream) => {
    const respHeaders = {};
    for (const [k, v] of Object.entries(upstream.headers)) {
      if (!STRIP_HEADERS.has(k)) respHeaders[k] = v;
    }
    delete respHeaders["content-length"];
    res.writeHead(upstream.statusCode, respHeaders);
    upstream.pipe(res);
  });

  proxy.on("error", (err) => {
    res.writeHead(502);
    res.end("Bad Gateway: " + err.message);
  });

  req.pipe(proxy);
};
