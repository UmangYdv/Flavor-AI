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

export default async function handler(req: any, res: any) {
  if (handleCorsPreflight(req, res)) {
    return;
  }

  applyCorsHeaders(res);

  const apiKey = process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "Missing NVIDIA_API_KEY. Set NVIDIA_API_KEY in your Vercel environment or local .env file.",
    });
  }

  const pathParam = req.query.path;
  let upstreamPath = "";

  if (Array.isArray(pathParam)) {
    upstreamPath = `/${pathParam.map(String).join("/")}`;
  } else if (typeof pathParam === "string") {
    upstreamPath = pathParam.startsWith("/") ? pathParam : `/${pathParam}`;
  } else if (typeof req.url === "string") {
    const urlPath = req.url.split("?")[0];
    const match = urlPath.match(/^\/api\/nvidia(\/.*)$/);
    upstreamPath = match ? match[1] : "";
  }

  if (!upstreamPath) {
    return res.status(400).json({
      error:
        "Missing NVIDIA path. Request must be sent to /api/nvidia/<path>, e.g. /api/nvidia/v1/chat/completions.",
    });
  }

  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path") continue;
    if (Array.isArray(value)) {
      value.forEach((item) => queryParams.append(key, String(item)));
    } else if (value != null) {
      queryParams.append(key, String(value));
    }
  }

  const upstreamUrl = `https://integrate.api.nvidia.com${upstreamPath}${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  if (req.headers.accept) {
    headers.Accept = req.headers.accept;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body:
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body ?? {}),
  });

  res.status(upstreamResponse.status);
  upstreamResponse.headers.forEach((value, name) => {
    if (name.toLowerCase() === "transfer-encoding") return;
    if (name.toLowerCase() === "content-encoding") return;
    res.setHeader(name, value);
  });

  const responseBody = await upstreamResponse.text();
  res.send(responseBody);
}
