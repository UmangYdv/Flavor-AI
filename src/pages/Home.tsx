import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Upload,
  Plus,
  Search,
  Sparkles,
  RefreshCw,
  X,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  generateRecipes,
  getHotPicks,
  scanIngredientsFromImage,
} from "../services/nvidiaService";
import { Recipe } from "../types";
import RecipeCard from "../components/RecipeCard";
import { getPollinationsImageUrl } from "../lib/api";
import { cn } from "../lib/utils";
import { commonIngredients } from "../data/commonIngredients";
import RecipeDetails from "../components/RecipeDetails";

/* 🔥 IMAGE FUNCTION (FIXED - ALWAYS WORKS) */
const getFoodImage = (query: string, index: number = 0) => {
  const seed = Math.floor(Date.now() / 1000) + index;
  return getPollinationsImageUrl(query, {
    model: "flux",
    width: 800,
    height: 600,
    nologo: true,
    seed,
  });
};

interface HomeProps {
  ingredients: string[];
  setIngredients: React.Dispatch<React.SetStateAction<string[]>>;
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  hotPicks: Recipe[];
  setHotPicks: React.Dispatch<React.SetStateAction<Recipe[]>>;
  selectedMealType: string;
  setSelectedMealType: React.Dispatch<React.SetStateAction<string>>;
  favorites: Recipe[];
  toggleFavorite: (recipe: Recipe) => void;
  onAddToShoppingList?: (items: { name: string; amount: string }[]) => void;
  onFinishCooking?: (recipe: Recipe) => void;
  onPlanned?: () => Promise<void>;
}

export default function Home({
  ingredients,
  setIngredients,
  recipes,
  setRecipes,
  hotPicks,
  setHotPicks,
  selectedMealType,
  setSelectedMealType,
  favorites,
  toggleFavorite,
  onAddToShoppingList,
  onFinishCooking,
  onPlanned,
}: HomeProps) {
  const [inputValue, setInputValue] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showPlanOnOpen, setShowPlanOnOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [scanningMessage, setScanningMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mealTypes = ["All", "Breakfast", "Snack", "Lunch", "Dinner", "Dessert"];

  useEffect(() => {
    if (!selectedRecipe) return;

    const matchingRecipe =
      hotPicks.find((recipe) => recipe.id === selectedRecipe.id) ||
      recipes.find((recipe) => recipe.id === selectedRecipe.id);

    if (
      matchingRecipe &&
      matchingRecipe.imageUrl &&
      matchingRecipe.imageUrl !== selectedRecipe.imageUrl
    ) {
      setSelectedRecipe(matchingRecipe);
    }
  }, [hotPicks, recipes, selectedRecipe]);

  // Auto-dismiss scanning message after 4 seconds
  useEffect(() => {
    if (!scanningMessage) return;

    const timer = setTimeout(() => {
      setScanningMessage(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [scanningMessage]);

  const [isRefreshingHotPicks, setIsRefreshingHotPicks] = useState(false);
  const hotPicksImageLoadId = useRef(0);
  const recipesImageLoadId = useRef(0);

  const preloadImagesSequentially = async (
    items: Recipe[],
    setItems: React.Dispatch<React.SetStateAction<Recipe[]>>,
    loadIdRef: React.MutableRefObject<number>,
    prefix: string,
  ) => {
    const currentLoadId = ++loadIdRef.current;
    for (let index = 0; index < items.length; index += 1) {
      if (currentLoadId !== loadIdRef.current) {
        console.log(`${prefix} preload aborted at index ${index}`);
        return;
      }

      const recipe = items[index];
      const imageUrl = getFoodImage(`${recipe.title} dish`, index);
      console.log(
        `${prefix} preloading image ${index}: ${recipe.title}`,
        imageUrl,
      );

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.referrerPolicy = "no-referrer";
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = imageUrl;
      });

      if (currentLoadId !== loadIdRef.current) {
        console.log(`${prefix} preload cancelled after load ${index}`);
        return;
      }

      setItems((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, imageUrl } : item)),
      );

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  /* 🔥 UPDATED HOT PICKS */
  const loadHotPicks = async () => {
    setIsRefreshingHotPicks(true);
    try {
      setAiError(null);

      const picks = await getHotPicks();
      console.log("🔥 loadHotPicks received:", picks.length, "recipes");

      const picksWithoutImages = picks.map((r) => ({
        ...r,
        imageUrl: undefined,
      }));

      console.log(
        "🔥 Setting",
        picksWithoutImages.length,
        "recipes without images",
      );
      setHotPicks(picksWithoutImages);

      await preloadImagesSequentially(
        picksWithoutImages,
        setHotPicks,
        hotPicksImageLoadId,
        "HotPicks",
      );
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
      console.error("🔥 Error loading hot picks:", e);
    } finally {
      setIsRefreshingHotPicks(false);
    }
  };

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = commonIngredients.filter(
        (i) =>
          i.toLowerCase().includes(inputValue.toLowerCase()) &&
          !ingredients.includes(i),
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [inputValue, ingredients]);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Unable to read image file."));
        }
      };
      reader.onerror = () =>
        reject(reader.error ?? new Error("File read error."));
      reader.readAsDataURL(file);
    });

  const normalizeImageDataUrl = async (
    dataUrl: string,
  ): Promise<{ base64: string; mimeType: string }> => {
    const [, metadata, base64] =
      dataUrl.match(/^data:(.*?);base64,(.*)$/s) || [];
    if (!metadata || !base64) {
      throw new Error("Invalid image data URL.");
    }

    const mimeType = metadata;

    const img = new Image();
    img.src = dataUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Unable to decode uploaded image."));
    });

    const maxDimension = 1600;
    const width = img.width;
    const height = img.height;
    const needsResize = Math.max(width, height) > maxDimension;
    const shouldConvert = mimeType !== "image/jpeg" || needsResize;

    if (!shouldConvert) {
      return { base64, mimeType };
    }

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context unavailable.");
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const [, jpegBase64] = jpegDataUrl.split(",");

    return { base64: jpegBase64, mimeType: "image/jpeg" };
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    source: "camera" | "upload",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    if (source === "camera") {
      setScanningMessage("Photo has been taken, now finding the ingredients.");
    } else {
      setScanningMessage(
        "Photo has been uploaded, now finding the ingredients.",
      );
    }

    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      const { base64, mimeType } = await normalizeImageDataUrl(rawDataUrl);

      setAiError(null);
      const detected = await scanIngredientsFromImage(base64, mimeType);

      if (detected.length > 0) {
        setIngredients((prev) => Array.from(new Set([...prev, ...detected])));
      } else {
        setAiError("No ingredients detected in the image.");
      }
    } catch (err) {
      console.error("Image upload error:", err);
      setAiError("Error detecting ingredients.");
    } finally {
      setIsScanning(false);
      e.target.value = "";
    }
  };

  const addIngredient = (name?: string) => {
    const val = name || inputValue.trim();
    if (val) {
      setIngredients((prev) => Array.from(new Set([...prev, val])));
      setInputValue("");
      setSuggestions([]);
    }
  };

  const removeIngredient = (name: string) => {
    setIngredients((prev) => prev.filter((i) => i !== name));
  };

  /* 🔥 UPDATED RECIPES */
  const findRecipes = async () => {
    if (ingredients.length === 0) return;

    setIsGenerating(true);

    try {
      setAiError(null);

      const results = await generateRecipes(
        ingredients,
        selectedMealType === "All" ? undefined : selectedMealType,
      );

      const recipesWithoutImages = results.map((r) => ({
        ...r,
        imageUrl: undefined,
      }));
      setRecipes(recipesWithoutImages);

      await preloadImagesSequentially(
        recipesWithoutImages,
        setRecipes,
        recipesImageLoadId,
        "Recipes",
      );
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const recipeHasImage = (recipe: Recipe) =>
    Boolean(recipe.image || recipe.imageUrl);
  const readyPerfectMatches = recipes.filter(
    (r) => (r.missingIngredientsCount || 0) === 0 && recipeHasImage(r),
  );
  const loadingPerfectMatches = recipes.filter(
    (r) => (r.missingIngredientsCount || 0) === 0 && !recipeHasImage(r),
  );
  const readyAlmostThere = recipes.filter(
    (r) => (r.missingIngredientsCount || 0) > 0 && recipeHasImage(r),
  );
  const loadingAlmostThere = recipes.filter(
    (r) => (r.missingIngredientsCount || 0) > 0 && !recipeHasImage(r),
  );
  const readyHotPicks = hotPicks.filter(recipeHasImage);
  const loadingHotPicksCount =
    isRefreshingHotPicks && hotPicks.length === 0
      ? 3
      : hotPicks.length - readyHotPicks.length;

  return (
    <div className="space-y-12">
      {aiError && (
        <div className="bg-amber-50 border border-amber-100 text-amber-900 rounded-2xl p-4 text-sm">
          {aiError}
        </div>
      )}
      {/* Hero Section */}
      <section className="relative">
        <div className="max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 leading-tight"
          >
            What's in your <span className="text-orange-500">kitchen?</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-stone-500 text-lg"
          >
            Snap a photo of your ingredients and let AI find the perfect recipe
            for you.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-10 bg-white rounded-[2rem] p-8 border border-stone-100 shadow-xl shadow-stone-200/50 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />

          <div className="relative z-10">
            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-stone-200 rounded-3xl bg-stone-50/50 mb-8 group hover:border-orange-300 transition-colors">
              <div
                className="bg-white p-4 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform cursor-pointer hover:shadow-md"
                onClick={() => cameraInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  cameraInputRef.current?.click()
                }
              >
                <Camera className="text-orange-500" size={32} />
              </div>
              <h3 className="font-bold text-stone-800 text-lg">
                Scan Your Ingredients
              </h3>
              <p className="text-stone-400 text-sm mb-6">
                Take a photo of your ingredients or type them in
              </p>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-orange-200 active:scale-95"
              >
                <Upload size={20} />
                <span>Upload Photo</span>
              </button>

              {/* Camera Input - Opens device camera on mobile, file explorer on desktop */}
              <input
                ref={cameraInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileUpload(e, "camera")}
              />

              {/* File Input - Opens file explorer */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "upload")}
              />
            </div>

            {/* Scanning message */}
            {scanningMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 text-center font-medium"
              >
                {scanningMessage}
              </motion.div>
            )}

            <div className="space-y-6">
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addIngredient()}
                      placeholder="Type ingredients (e.g. Tomato, Onion)"
                      className="w-full bg-stone-100 border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                    />
                  </div>
                  <button
                    onClick={() => addIngredient()}
                    className="bg-stone-100 text-stone-600 p-4 rounded-xl hover:bg-stone-200 transition-colors"
                  >
                    <Plus size={24} />
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-stone-100 z-20 overflow-hidden"
                    >
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => addIngredient(s)}
                          className="w-full text-left px-5 py-3 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-3"
                        >
                          <Plus size={16} className="text-stone-300" />
                          <span className="font-medium">{s}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {ingredients.map((ing) => (
                    <motion.span
                      key={ing}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="bg-stone-100 text-stone-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 group hover:bg-orange-50 hover:text-orange-700 transition-colors"
                    >
                      {ing}
                      <button
                        onClick={() => removeIngredient(ing)}
                        className="text-stone-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>

              <button
                onClick={findRecipes}
                disabled={ingredients.length === 0 || isGenerating}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                  ingredients.length > 0
                    ? "bg-orange-500 text-white shadow-orange-200 hover:bg-orange-600"
                    : "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none",
                )}
              >
                {isGenerating ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <Sparkles size={20} />
                )}
                <span>
                  Find Recipes{" "}
                  {ingredients.length > 0 &&
                    `(${ingredients.length} ingredients)`}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Meal Type Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {mealTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedMealType(type)}
            className={cn(
              "px-6 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all",
              selectedMealType === type
                ? "bg-white text-orange-600 shadow-sm border border-orange-100"
                : "text-stone-500 hover:bg-stone-100",
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Results Section */}
      {isGenerating && recipes.length === 0 ? (
        <section className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-72 rounded-3xl bg-stone-100 animate-pulse"
              />
            ))}
          </div>
          <div className="text-center text-stone-500">
            Generating recipes… this can take a few seconds. Thanks for your
            patience.
          </div>
        </section>
      ) : recipes.length > 0 ? (
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Sparkles className="text-orange-500" size={24} />
              Perfect Matches
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {readyPerfectMatches.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => {
                  setSelectedRecipe(recipe);
                  setShowPlanOnOpen(false);
                }}
                isFavorite={favorites.some((f) => f.title === recipe.title)}
                onFavorite={() => toggleFavorite(recipe)}
                onPlan={() => {
                  setSelectedRecipe(recipe);
                  setShowPlanOnOpen(true);
                }}
              />
            ))}
            {loadingPerfectMatches.map((_, idx) => (
              <div
                key={`perfect-skeleton-${idx}`}
                className="h-72 rounded-3xl bg-stone-100 animate-pulse"
              />
            ))}
          </div>

          <div className="pt-8">
            <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2 mb-8">
              <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg">
                <RefreshCw size={20} />
              </span>
              Almost There{" "}
              <span className="text-stone-400 font-normal text-lg">
                — missing just 1-2 ingredients
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readyAlmostThere.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => {
                    setSelectedRecipe(recipe);
                    setShowPlanOnOpen(false);
                  }}
                  isFavorite={favorites.some((f) => f.title === recipe.title)}
                  onFavorite={() => toggleFavorite(recipe)}
                  onPlan={() => {
                    setSelectedRecipe(recipe);
                    setShowPlanOnOpen(true);
                  }}
                />
              ))}
              {loadingAlmostThere.map((_, idx) => (
                <div
                  key={`almost-skeleton-${idx}`}
                  className="h-72 rounded-3xl bg-stone-100 animate-pulse"
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-stone-100 bg-stone-50 p-8 text-center">
          <h3 className="text-2xl font-bold text-stone-900 mb-3">
            No recipes yet
          </h3>
          <p className="text-stone-500 max-w-xl mx-auto">
            Add a few ingredients and tap "Find Recipes" to generate menu ideas.
          </p>
        </section>
      )}

      {/* Hot Picks Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-xl">
              <Flame className="text-orange-500" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-stone-900">
                Today's Hot Picks
              </h3>
              <p className="text-stone-400 text-sm">
                Fresh inspiration for your next meal
              </p>
            </div>
          </div>
          <button
            onClick={loadHotPicks}
            disabled={isRefreshingHotPicks}
            className="text-stone-400 hover:text-orange-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={20}
              className={cn(isRefreshingHotPicks && "animate-spin")}
            />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotPicks.length === 0 && !isRefreshingHotPicks ? (
            <div className="col-span-full rounded-[2rem] border border-stone-200 bg-stone-50 p-8 text-center">
              <p className="text-stone-500 text-sm">
                Click the refresh button above to load today's hot picks.
              </p>
            </div>
          ) : (
            <>
              {readyHotPicks.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => {
                    setSelectedRecipe(recipe);
                    setShowPlanOnOpen(false);
                  }}
                  isFavorite={favorites.some((f) => f.title === recipe.title)}
                  onFavorite={() => toggleFavorite(recipe)}
                  onPlan={() => {
                    setSelectedRecipe(recipe);
                    setShowPlanOnOpen(true);
                  }}
                />
              ))}
              {Array.from({ length: loadingHotPicksCount }).map((_, idx) => (
                <div
                  key={`hot-pick-skeleton-${idx}`}
                  className="h-72 rounded-3xl bg-stone-100 animate-pulse"
                />
              ))}
            </>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selectedRecipe && (
          <RecipeDetails
            key={selectedRecipe.id}
            recipe={selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
            initialShowPlan={showPlanOnOpen}
            isFavorite={favorites.some((f) => f.title === selectedRecipe.title)}
            onFavorite={() => toggleFavorite(selectedRecipe)}
            userIngredients={ingredients}
            onAddToShoppingList={onAddToShoppingList}
            onFinishCooking={onFinishCooking}
            onPlanned={onPlanned}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
