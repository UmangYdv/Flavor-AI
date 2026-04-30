import { Capacitor } from "@capacitor/core";

const DEFAULT_NATIVE_API_BASE_URL = "https://flavor-ai-ecru.vercel.app";

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getNativeApiBaseUrl() {
  const configuredBaseUrl = (
    import.meta.env.VITE_API_BASE_URL as string | undefined
  )?.trim();

  return stripTrailingSlash(configuredBaseUrl || DEFAULT_NATIVE_API_BASE_URL);
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (Capacitor.isNativePlatform()) {
    return `${getNativeApiBaseUrl()}${normalizedPath}`;
  }

  return normalizedPath;
}

export function getPollinationsImageUrl(
  prompt: string,
  options: {
    model?: string;
    width?: number;
    height?: number;
    nologo?: boolean;
    seed?: number;
  } = {},
) {
  const normalizedPrompt = prompt.trim() || "delicious food";
  const params = new URLSearchParams();

  if (options.model) params.set("model", options.model);
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (typeof options.nologo === "boolean") {
    params.set("nologo", String(options.nologo));
  }
  if (typeof options.seed === "number") {
    params.set("seed", String(options.seed));
  }

  const queryString = params.toString();
  const encodedPrompt = encodeURIComponent(normalizedPrompt);
  const path = `/api/pollinations/image/${encodedPrompt}${
    queryString ? `?${queryString}` : ""
  }`;

  return getApiUrl(path);
}
