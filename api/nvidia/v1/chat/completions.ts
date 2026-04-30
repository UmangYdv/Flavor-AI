import { applyCorsHeaders, handleCorsPreflight } from "../../../_lib/cors";

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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const upstreamUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {});

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });

    const responseBody = await upstreamResponse.text();
    res.status(upstreamResponse.status);
    upstreamResponse.headers.forEach((value, name) => {
      if (name.toLowerCase() === "transfer-encoding") return;
      if (name.toLowerCase() === "content-encoding") return;
      res.setHeader(name, value);
    });

    return res.send(responseBody);
  } catch (error) {
    return res.status(500).json({
      error: "NVIDIA proxy failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
