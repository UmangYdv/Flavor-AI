function applyCorsHeaders(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function handleCorsPreflight(req: any, res: any) {
  if (req.method !== "OPTIONS") {
    return false;
  }

  applyCorsHeaders(res);
  res.status(204).end();
  return true;
}

export default function handler(req: any, res: any) {
  if (handleCorsPreflight(req, res)) {
    return;
  }

  applyCorsHeaders(res);

  const apiKey =
    process.env.POLLINATIONS_SECRET_KEY ||
    process.env.VITE_POLLINATIONS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "Missing POLLINATIONS_SECRET_KEY. Set POLLINATIONS_SECRET_KEY in your Vercel environment or local .env file.",
    });
  }

  const rawQuery = req.query.query;
  const prompt = Array.isArray(rawQuery)
    ? rawQuery.join("/")
    : String(rawQuery || "");

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "query") continue;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else if (value != null) {
      params.append(key, String(value));
    }
  }

  const queryString = params.toString();
  const upstreamUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(
    prompt,
  )}${queryString ? `?${queryString}&key=${encodeURIComponent(apiKey)}` : `?key=${encodeURIComponent(apiKey)}`}`;

  return res.redirect(307, upstreamUrl);
}
