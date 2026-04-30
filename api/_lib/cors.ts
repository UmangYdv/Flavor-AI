export function applyCorsHeaders(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function handleCorsPreflight(req: any, res: any) {
  if (req.method !== "OPTIONS") {
    return false;
  }

  applyCorsHeaders(res);
  res.status(204).end();
  return true;
}
