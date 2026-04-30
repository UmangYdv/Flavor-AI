import { getApiUrl, getPollinationsImageUrl } from "../lib/api";
import { Recipe } from "../types";

const pollinationsImageCache = new Map<string, string>();

const NIM_URL = getApiUrl("/api/nvidia/v1/chat/completions");
const REQUEST_INTERVAL_MS = 1500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 40;

// Model configurations for different tasks
const MODELS = {
  // Fast text-only model for general recipe generation and suggestions
  TEXT_FAST: "meta/llama-3.2-3b-instruct",
  // High-quality text model for complex recipe generation
  TEXT_HIGH_QUALITY: "meta/llama-3.1-8b-instruct",
  // Vision model for image analysis (ingredient detection)
  VISION: "meta/llama-3.2-11b-vision-instruct",
  // Large model for meal planning (more reasoning capability)
  TEXT_LARGE: "meta/llama-3.1-70b-instruct",
} as const;

type ModelType = (typeof MODELS)[keyof typeof MODELS];

interface PendingRequest {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

const requestQueue: PendingRequest[] = [];
let queueProcessing = false;
let lastRequestTime = 0;
let windowStart = Date.now();
let requestsInWindow = 0;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resetWindowIfNeeded(now: number) {
  if (now - windowStart >= RATE_LIMIT_WINDOW_MS) {
    windowStart = now;
    requestsInWindow = 0;
  }
}

export function getNvidiaRequestStats() {
  const now = Date.now();
  resetWindowIfNeeded(now);

  return {
    requestsInCurrentWindow: requestsInWindow,
    remainingRequestsThisWindow: Math.max(
      0,
      RATE_LIMIT_MAX_PER_WINDOW - requestsInWindow,
    ),
    windowStart,
    windowEndsAt: windowStart + RATE_LIMIT_WINDOW_MS,
    queuedRequests: requestQueue.length,
  };
}

async function processQueue() {
  if (queueProcessing) return;
  queueProcessing = true;

  while (requestQueue.length > 0) {
    const now = Date.now();
    resetWindowIfNeeded(now);
    const nextAllowedTime = lastRequestTime + REQUEST_INTERVAL_MS;
    if (now < nextAllowedTime) {
      await wait(nextAllowedTime - now);
    }

    const request = requestQueue.shift()!;
    requestsInWindow += 1;
    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }

    lastRequestTime = Date.now();
  }

  queueProcessing = false;
}

function enqueueRequest(execute: () => Promise<any>) {
  return new Promise<any>((resolve, reject) => {
    requestQueue.push({ execute, resolve, reject });
    processQueue();
  });
}

async function callNim(
  body: any,
  context: string,
  model: ModelType = MODELS.TEXT_FAST,
) {
  return enqueueRequest(async () => {
    const requestBody = { ...body, model };

    const response = await fetch(NIM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await response.text();
    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok) {
      throw new Error(
        `NVIDIA NIM error while ${context}: ${response.status} ${response.statusText} - ${truncateForError(rawText)}`,
      );
    }

    if (contentType.includes("text/html") || looksLikeHtml(rawText)) {
      throw new Error(
        `Recipe API returned HTML while ${context}. Check the native API base URL and deployed serverless endpoints. Raw content: ${truncateForError(rawText)}`,
      );
    }

    try {
      return JSON.parse(rawText);
    } catch {
      return rawText;
    }
  });
}

function getTextFromResponse(response: any): string {
  if (!response) return "";
  if (typeof response === "string") return response;

  const content =
    response?.choices?.[0]?.message?.content ??
    response?.choices?.[0]?.text ??
    response?.message?.content ??
    response?.content ??
    response?.text;
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.type === "text") return item.text ?? "";
        if (item?.type === "json")
          return item.json ? JSON.stringify(item.json) : "";
        if (typeof item === "object") return item.text ?? JSON.stringify(item);
        return "";
      })
      .join(" ");
  }
  if (typeof content === "object") {
    return content.text ?? JSON.stringify(content);
  }
  return String(content);
}

function looksLikeHtml(text: string) {
  return /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);
}

function truncateForError(text: string, maxLength: number = 500) {
  const normalized = text.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

function extractJsonSubstring(text: string): string | null {
  const clean = text.replace(/```(json)?\n?|```/gi, "").trim();
  const startCurly = clean.indexOf("{");
  const startSquare = clean.indexOf("[");
  const start =
    startCurly === -1
      ? startSquare
      : startSquare === -1
        ? startCurly
        : Math.min(startCurly, startSquare);
  if (start === -1) return null;

  const openChar = clean[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;

  for (let i = start; i < clean.length; i += 1) {
    if (clean[i] === openChar) depth += 1;
    else if (clean[i] === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return clean.slice(start, i + 1);
      }
    }
  }
  return null;
}

function sanitizeJson(text: string) {
  let sanitized = text.replace(/```(json)?\n?|```/gi, "").trim();

  // Handle fractions like 1/4, 1/2, etc.
  sanitized = sanitized.replace(/:\s*(\d+\/\d+)/g, ': "$1"');

  sanitized = sanitized.replace(/:\s*([+-]?\d+(?:\.\d+)?[a-zA-Z]+)/g, ': "$1"');
  sanitized = sanitized.replace(
    /:\s*([+-]?\d+(?:\.\d+)?)([a-zA-Z]+)\s*(?=[,}\]])/g,
    ': "$1$2"',
  );

  return sanitized;
}

function parseJson(text: string) {
  const cleaned = sanitizeJson(text);
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    const snippet = extractJsonSubstring(cleaned);
    if (snippet) {
      try {
        return JSON.parse(snippet);
      } catch (secondError) {
        throw new Error(
          `Unable to parse JSON response. Raw content: ${truncateForError(cleaned, 800)}`,
        );
      }
    }
    throw new Error(
      `Unable to parse JSON response. Raw content: ${truncateForError(cleaned, 800)}`,
    );
  }
}

function isValidImageUrl(value: any): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function normalizeParsedValues(value: any): any {
  if (Array.isArray(value)) {
    return value.map(normalizeParsedValues);
  }
  if (value && typeof value === "object") {
    const normalized: any = {};
    for (const key in value) {
      normalized[key] = normalizeParsedValues(value[key]);
    }
    return normalized;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const numberMatch = trimmed.match(
      /^([+-]?\d+(?:\.\d+)?)(?:\s*(?:g|mg|kg|kcal|cal))?$/i,
    );
    if (numberMatch) {
      return Number(numberMatch[1]);
    }
  }
  return value;
}

function extractRecipeArray(raw: any): any[] {
  console.log(
    "📦 extractRecipeArray input:",
    JSON.stringify(raw).slice(0, 500),
  );

  if (Array.isArray(raw)) {
    console.log("✅ Raw is already array, returning", raw.length, "items");
    return raw;
  }
  if (!raw || typeof raw !== "object") {
    console.log("❌ Raw is not an object");
    return [];
  }

  if (Array.isArray(raw.recipes)) {
    console.log("✅ Found raw.recipes array with", raw.recipes.length, "items");
    return raw.recipes;
  }
  if (Array.isArray(raw.items)) {
    console.log("✅ Found raw.items array with", raw.items.length, "items");
    return raw.items;
  }
  if (Array.isArray(raw.data)) {
    console.log("✅ Found raw.data array with", raw.data.length, "items");
    return raw.data;
  }

  // Look for any array property
  const arrayValues = Object.values(raw).filter(Array.isArray);
  if (arrayValues.length > 0) {
    console.log(
      "✅ Found array in object values, length:",
      arrayValues[0].length,
    );
    return arrayValues[0];
  }

  // If no array found, check if all values are objects (could be recipes with numeric keys)
  const values = Object.values(raw);
  console.log(
    "⚠️ No array found, checking values. Total values:",
    values.length,
  );
  console.log(
    "⚠️ Values:",
    values.map((v) => typeof v),
  );

  if (
    values.length > 0 &&
    values.every((v) => v && typeof v === "object" && !Array.isArray(v))
  ) {
    console.log("✅ All values are objects, treating as recipes");
    return values;
  }

  console.log("❌ Could not extract recipe array");
  return [];
}

function generateImageUrlFromTitle(title: string, index: number = 0): string {
  const cacheKey = `${title.trim()}|${index}`;
  if (pollinationsImageCache.has(cacheKey)) {
    return pollinationsImageCache.get(cacheKey)!;
  }

  const seed = Math.floor(Date.now() / 1000) + index;
  const url = getPollinationsImageUrl(title, {
    model: "flux",
    width: 800,
    height: 600,
    nologo: true,
    seed,
  });
  pollinationsImageCache.set(cacheKey, url);
  return url;
}

function normalizeRecipe(raw: any, index: number): Recipe {
  const title = String(raw.title || raw.name || `Recipe ${index + 1}`).trim();

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.map((ingredient: any, ingredientIndex: number) => ({
        id:
          ingredient?.id ||
          ingredient.name?.toString().toLowerCase().replace(/\s+/g, "-") ||
          `ing-${index}-${ingredientIndex}`,
        name: String(
          ingredient?.name || ingredient?.item || "Ingredient",
        ).trim(),
        amount: String(
          ingredient?.amount || ingredient?.quantity || "1",
        ).trim(),
        unit: String(ingredient?.unit || "").trim(),
      }))
    : [];

  const instructions = Array.isArray(raw.instructions)
    ? raw.instructions
        .map((step: any) => String(step || "").trim())
        .filter(Boolean)
    : typeof raw.instructions === "string"
      ? raw.instructions
          .split(/\n|\.\s*/)
          .map((step) => step.trim())
          .filter(Boolean)
      : [];

  const mealType = Array.isArray(raw.mealType)
    ? raw.mealType.map((item: any) => String(item).trim()).filter(Boolean)
    : typeof raw.mealType === "string"
      ? [raw.mealType.trim()]
      : ["breakfast"];

  const calories = Number(raw.calories);
  const prepTime = Number(raw.prepTime);
  const protein = Number(raw.macros?.protein);
  const carbs = Number(raw.macros?.carbs);
  const fat = Number(raw.macros?.fat);
  const missingIngredientsCount = Number(raw.missingIngredientsCount);

  return {
    id: String(raw.id || `recipe-${Date.now()}-${index}`),
    title: title || `Recipe ${index + 1}`,
    description: String(
      raw.description || raw.summary || "A delicious recipe.",
    ).trim(),
    ingredients,
    instructions,
    prepTime: Number.isFinite(prepTime) && prepTime > 0 ? prepTime : 15,
    calories: Number.isFinite(calories) && calories > 0 ? calories : 350,
    macros: {
      protein: Number.isFinite(protein) && protein >= 0 ? protein : 0,
      carbs: Number.isFinite(carbs) && carbs >= 0 ? carbs : 0,
      fat: Number.isFinite(fat) && fat >= 0 ? fat : 0,
    },
    mealType: mealType.length > 0 ? mealType : ["breakfast"],
    isVeg:
      typeof raw.isVeg === "boolean"
        ? raw.isVeg
        : /veg|vegetarian/i.test(title) ||
          /veg|vegetarian/i.test(String(raw.description)),
    imageUrl: isValidImageUrl(raw.imageUrl)
      ? raw.imageUrl
      : generateImageUrlFromTitle(title),
    missingIngredientsCount:
      Number.isFinite(missingIngredientsCount) && missingIngredientsCount >= 0
        ? missingIngredientsCount
        : 0,
  };
}

function normalizeRecipes(raw: any): Recipe[] {
  const items = extractRecipeArray(raw);
  console.log("🍳 extractRecipeArray returned:", items.length, "items");
  console.log("🍳 Raw items:", items);
  const recipes = items.map((item, index) => normalizeRecipe(item, index));
  console.log("🍳 Normalized recipes:", recipes.length, recipes);
  return recipes;
}

export async function scanIngredientsFromImage(
  base64Image: string,
  mimeType: string = "image/jpeg",
): Promise<string[]> {
  // Use NVIDIA vision model to detect ingredients from uploaded image
  const body = {
    temperature: 0.2,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "List all visible food ingredients in this image. Return ONLY a comma-separated list of ingredient names, nothing else. Example: tomato, onion, garlic",
          },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
        ],
      },
    ],
  };

  try {
    const response = await callNim(
      body,
      "scanning ingredients from image",
      MODELS.VISION,
    );
    const text = getTextFromResponse(response);

    if (
      !text ||
      text.toLowerCase().includes("no ingredients") ||
      text.toLowerCase().includes("unable")
    ) {
      return [];
    }

    const ingredients = text
      .split(/[,;\n]/)
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 2 && !item.includes("image"))
      .slice(0, 15);

    return ingredients;
  } catch (error) {
    console.error("Vision model error:", error);
    throw error;
  }
}

export async function generateRecipes(
  ingredients: string[],
  mealType?: string,
): Promise<Recipe[]> {
  const prompt = `Generate 5 recipe recommendations based on these ingredients: ${ingredients.join(", ")}.
${
  mealType
    ? `The recipes should be suitable for ${mealType}.
`
    : ""
}Include a mix of Perfect Matches (using mostly these ingredients) and Almost There (missing 1-2 ingredients).
For each recipe, provide a JSON object with the following exact fields:
- title: string
- description: string
- ingredients: array of objects with name, amount, and unit
- instructions: array of strings
- prepTime: number (minutes only)
- calories: number
- macros: object with protein, carbs, fat as numbers only
- mealType: array of strings
- isVeg: boolean
- missingIngredientsCount: number
- imageUrl: string

Return only a valid JSON array of recipes. Do not include units in numeric values. For example, use "protein": 4, not "4g" or 4g. Do not include any markdown, explanation, or extra text.`;

  const body = {
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: "You are a cooking assistant that outputs only JSON.",
      },
      { role: "user", content: prompt },
    ],
  };

  const response = await callNim(
    body,
    "generating recipes",
    MODELS.TEXT_HIGH_QUALITY,
  );
  const data = normalizeParsedValues(parseJson(getTextFromResponse(response)));
  return normalizeRecipes(data);
}

export async function generateRecipeFromTitle(title: string): Promise<Recipe> {
  const prompt = `Create a single recipe for the title: "${title}".
Provide a valid JSON object with the exact fields below:
- title: string
- description: string
- ingredients: array of objects with name, amount, and unit
- instructions: array of strings
- prepTime: number (minutes only)
- calories: number
- macros: object with protein, carbs, fat as numbers only
- mealType: array of strings
- isVeg: boolean
- imageUrl: string

Return only valid JSON. Do not include any markdown, explanation, or extra text.`;

  const body = {
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: "You are a cooking assistant that outputs only JSON.",
      },
      { role: "user", content: prompt },
    ],
  };

  const response = await callNim(
    body,
    "generating recipe from title",
    MODELS.TEXT_HIGH_QUALITY,
  );
  const data = normalizeParsedValues(parseJson(getTextFromResponse(response)));
  if (Array.isArray(data)) {
    return normalizeRecipe(data[0], 0);
  }
  return normalizeRecipe(data, 0);
}

export async function getHotPicks(): Promise<Recipe[]> {
  const prompt = `Suggest 4 Today's Hot Picks recipes that are trending, seasonal, and appetizing.
Provide full details for each recipe as a JSON object with the fields:
- title: string
- description: string
- ingredients: array of objects with name, amount, and unit
- instructions: array of strings
- prepTime: number (minutes only)
- calories: number
- macros: object with protein, carbs, fat as numbers only
- mealType: array of strings
- isVeg: boolean
- imageUrl: string

Return only a valid JSON array. Do not include units in numeric values. For example, use "fat": 12, not "12g" or 12g. Do not include any markdown or explanation.`;

  const body = {
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: "You are a cooking assistant that outputs only JSON.",
      },
      { role: "user", content: prompt },
    ],
  };

  const response = await callNim(
    body,
    "getting hot picks",
    MODELS.TEXT_HIGH_QUALITY,
  );
  const textResponse = getTextFromResponse(response);
  console.log("🔥 Hot picks raw response:", textResponse);

  const data = normalizeParsedValues(parseJson(textResponse));
  console.log("🔥 Hot picks parsed data:", data);

  const recipes = normalizeRecipes(data);
  console.log("🔥 Hot picks final recipes:", recipes.length, recipes);
  return recipes;
}

export async function suggestMealPlan(pantryItems: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Based on these pantry items: ${pantryItems.join(", ")}, suggest a 7-day meal plan (Breakfast, Lunch, Dinner).
Return only a valid JSON array with objects that include the fields:
- date: string (YYYY-MM-DD)
- mealType: string
- recipeTitle: string
- calories: number
- macros: object with protein, carbs, fat as numbers only

Start from today: ${today}. Do not include any markdown or explanation.`;

  const body = {
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: "You are a cooking assistant that outputs only JSON.",
      },
      { role: "user", content: prompt },
    ],
  };

  const response = await callNim(
    body,
    "suggesting meal plan",
    MODELS.TEXT_LARGE,
  );
  const data = parseJson(getTextFromResponse(response));
  return Array.isArray(data) ? data : (data.mealPlan ?? []);
}
