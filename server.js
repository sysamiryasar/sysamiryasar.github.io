const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5500;
const ROOT = __dirname;

// Minimal .env loader — no dependency needed for a handful of KEY=VALUE lines.
// Real environment variables (e.g. set by a host) always win over the file.
(function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
})();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

const HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; connect-src 'self' https://api.github.com",
};

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...HEADERS });
  res.end(data);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory rate limit: 5 submissions per IP per 10 minutes.
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };
const rateLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const hits = (rateLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  hits.push(now);
  rateLog.set(ip, hits);
  return hits.length > RATE_LIMIT.max;
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleContact(req, res) {
  const ip = req.socket.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    sendJson(res, 429, { error: "Too many messages sent recently. Please try again later." });
    return;
  }

  let payload;
  try {
    const raw = await readBody(req, 10_000);
    payload = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { error: "Invalid request." });
    return;
  }

  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 200) : "";
  const email = typeof payload.email === "string" ? payload.email.trim().slice(0, 200) : "";
  const message = typeof payload.message === "string" ? payload.message.trim().slice(0, 5000) : "";

  if (!name || !email || !message) {
    sendJson(res, 400, { error: "Please fill in all fields." });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    sendJson(res, 400, { error: "Please enter a valid email address." });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !toEmail) {
    console.error("Contact form: RESEND_API_KEY or CONTACT_TO_EMAIL is not configured.");
    sendJson(res, 500, { error: "Email is not configured on the server yet." });
    return;
  }

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Portfolio Contact <onboarding@resend.dev>",
        to: [toEmail],
        reply_to: email,
        subject: `New message from ${name} — samiryasar.com`,
        html: `
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend API error:", resendRes.status, errBody);
      sendJson(res, 502, { error: "Could not send your message right now. Please try again later." });
      return;
    }

    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error("Contact form send failed:", err);
    sendJson(res, 502, { error: "Could not send your message right now. Please try again later." });
  }
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);

  if (urlPath === "/api/contact") {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }
    handleContact(req, res).catch((err) => {
      console.error("Unhandled contact error:", err);
      sendJson(res, 500, { error: "Something went wrong." });
    });
    return;
  }

  let staticPath = urlPath;
  if (staticPath === "/") staticPath = "/index.html";

  // Never serve dotfiles (.env, .gitignore, .git/*, etc.) — these can hold secrets.
  const hasDotSegment = staticPath.split("/").some((seg) => seg.startsWith("."));
  if (hasDotSegment) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
    return;
  }

  const filePath = path.normalize(path.join(ROOT, staticPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      const notFoundPath = path.join(ROOT, "404.html");
      fs.readFile(notFoundPath, (err404, notFoundData) => {
        if (err404) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("404 Not Found");
          return;
        }
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", ...HEADERS });
        res.end(notFoundData);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", ...HEADERS });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}`);
});
