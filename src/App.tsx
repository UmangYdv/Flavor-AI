import React, { useState, useEffect, useRef } from "react";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import {
  BookOpen,
  Package,
  Calendar,
  ShoppingCart,
  LogIn,
  Loader2,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "./hooks/useAuth";
import {
  Recipe,
  PantryItem,
  MealPlanEntry,
  ShoppingListItem,
  UserGoals,
} from "./types";
import RecipeCard from "./components/RecipeCard";
import RecipeDetails from "./components/RecipeDetails";
import { getPollinationsImageUrl } from "./lib/api";
import { cn } from "./lib/utils";
import {
  generateRecipeFromTitle,
  suggestMealPlan,
} from "./services/nvidiaService";
import { commonIngredients } from "./data/commonIngredients";
import {
  addMealPlanEntry,
  addPantryItem,
  addShoppingItem,
  clearMealPlans,
  listFavorites,
  listMealPlans,
  listPantry,
  listShopping,
  removeFavorite,
  removeMealPlanEntry,
  removePantryItem,
  removeShoppingItem,
  setShoppingBought,
  addFavorite,
} from "./services/supabaseDb";

const mealPlanImageCache = new Map<string, string>();

function formatAppError(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const anyErr = err as any;
    const parts: string[] = [];
    if (typeof anyErr.code === "string") parts.push(anyErr.code);
    if (typeof anyErr.message === "string") parts.push(anyErr.message);
    if (typeof anyErr.error_description === "string")
      parts.push(anyErr.error_description);
    if (parts.length > 0) return parts.join(": ");
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

function IntroSplashPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#f4f3fb]">
      <div className="relative h-36 w-36 overflow-hidden rounded-full bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.22) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-16 w-16">
            <div className="absolute left-1/2 top-0 h-full w-4 -translate-x-1/2 rotate-45 rounded-full bg-sky-400" />
            <div className="absolute left-1/2 top-0 h-full w-4 -translate-x-1/2 -rotate-45 rounded-full bg-sky-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

// My Recipes Page
const MyRecipes = ({
  favorites,
  toggleFavorite,
  onRecipeClick,
}: {
  favorites: Recipe[];
  toggleFavorite: (recipe: Recipe) => void;
  onRecipeClick: (recipe: Recipe) => void;
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-stone-900">My Recipes</h2>
        <span className="bg-stone-100 text-stone-600 px-4 py-1.5 rounded-full text-sm font-bold">
          {favorites.length} Saved
        </span>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-stone-100 p-6 rounded-full mb-6">
            <BookOpen size={48} className="text-stone-300" />
          </div>
          <p className="text-stone-500 max-w-md">
            Your saved recipe collection will appear here. Start scanning
            ingredients to find and save your favorites!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((recipe) => (
            <div key={recipe.id} className="relative group">
              <RecipeCard
                recipe={recipe}
                onClick={() => onRecipeClick(recipe)}
                isFavorite={true}
                onFavorite={() => toggleFavorite(recipe)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Pantry Page
const Pantry = ({
  items,
  user,
  onChanged,
}: {
  items: PantryItem[];
  user: any;
  onChanged: () => Promise<void>;
}) => {
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: "",
    category: "other",
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const q = newItem.name.trim().toLowerCase();
    if (!q) return setNameSuggestions([]);
    const existing = new Set(items.map((i) => i.name.toLowerCase()));
    const filtered = commonIngredients
      .filter(
        (i) => i.toLowerCase().includes(q) && !existing.has(i.toLowerCase()),
      )
      .slice(0, 5);
    // Only show suggestions that are not exact matches to what's typed
    const suggestions = filtered.filter((i) => i.toLowerCase() !== q);
    setNameSuggestions(suggestions);
  }, [newItem.name, items]);

  const addItem = async () => {
    if (!user || !newItem.name) return;
    try {
      setActionError(null);
      await addPantryItem(user.id, {
        name: newItem.name,
        quantity: newItem.quantity,
        category: newItem.category,
      });
      setNewItem({ name: "", quantity: "", category: "other" });
      await onChanged();
    } catch (error) {
      setActionError(formatAppError(error));
      console.error(error);
    }
  };

  const removeItem = async (id: string) => {
    if (!user) return;
    try {
      setActionError(null);
      await removePantryItem(user.id, id);
      await onChanged();
    } catch (error) {
      setActionError(formatAppError(error));
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-stone-900">Smart Pantry</h2>

      {actionError && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">
          {actionError}
        </div>
      )}

      <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            Item Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") addItem();
              }}
              placeholder="e.g. Eggs"
              className="w-full bg-stone-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
            />
            {nameSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-stone-100 z-20 overflow-hidden">
                {nameSuggestions.map((s) => (
                  <button
                    key={s}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setNewItem({ ...newItem, name: s });
                      setNameSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    type="button"
                  >
                    <span className="font-medium">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="w-32">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            Quantity
          </label>
          <input
            type="text"
            value={newItem.quantity}
            onChange={(e) =>
              setNewItem({ ...newItem, quantity: e.target.value })
            }
            placeholder="12 pcs"
            className="w-full bg-stone-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button
          onClick={addItem}
          className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
        >
          Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between group"
          >
            <div>
              <h4 className="font-bold text-stone-900">{item.name}</h4>
              <p className="text-stone-400 text-sm">{item.quantity}</p>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="p-2 text-stone-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Meal Plan Page
const MealPlan = ({
  plans,
  favorites,
  recipes,
  hotPicks,
  userGoals,
  onRecipeClick,
  onChanged,
}: {
  plans: MealPlanEntry[];
  favorites: Recipe[];
  recipes: Recipe[];
  hotPicks: Recipe[];
  userGoals: UserGoals;
  onRecipeClick: (recipe: Recipe) => void;
  onChanged: () => Promise<void>;
}) => {
  const { user } = useAuth();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [trackerDate, setTrackerDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [sortedDates, setSortedDates] = useState<string[]>(() => 
    getWeekDates(new Date())
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const trackerDateInputRef = useRef<HTMLInputElement | null>(null);

  const removePlan = async (id: string) => {
    if (!user) return;
    try {
      await removeMealPlanEntry(user.id, id);
      await onChanged();
    } catch (error) {
      setActionError(formatAppError(error));
      console.error(error);
    }
  };

  const clearAllPlans = async () => {
    if (!user || plans.length === 0) return;
    if (
      !window.confirm("Are you sure you want to clear your entire meal plan?")
    )
      return;

    setIsClearing(true);
    try {
      await clearMealPlans(user.id);
      await onChanged();
    } catch (error) {
      setActionError(formatAppError(error));
      console.error("Failed to clear meal plan", error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleAISuggest = async () => {
    if (!user) return;
    setIsSuggesting(true);
    setActionError(null);
    try {
      // Get pantry items to inform suggestions
      const pantryItems = (await listPantry(user.id)).map((p) => p.name);

      const suggestions = await suggestMealPlan(pantryItems);

      for (const s of suggestions) {
        await addMealPlanEntry(user.id, {
          recipeId: crypto.randomUUID(),
          recipeTitle: s.recipeTitle,
          date: s.date,
          mealType: (s.mealType || "lunch").toLowerCase(),
          calories: s.calories,
          macros: s.macros,
        } as any);
      }
      await onChanged();
    } catch (error) {
      setActionError(formatAppError(error));
      console.error(error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const groupedPlans = plans.reduce(
    (acc, plan) => {
      const planDate = plan.date || new Date().toISOString().slice(0, 10);
      if (!acc[planDate]) acc[planDate] = [];
      acc[planDate].push(plan);
      return acc;
    },
    {} as Record<string, MealPlanEntry[]>,
  );

  // Update the getWeekDates function to accept a custom date
  const getWeekDates = (startDate: Date) => {
    const dates: string[] = [];
    // Get Monday of the week containing the startDate
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(startDate);
    monday.setDate(startDate.getDate() + mondayOffset);

    // Generate 7 consecutive dates starting from Monday
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date.toLocaleDateString("en-CA"));
    }

    return dates;
  };

  // Update the trackerDate onChange to update the week plan
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setTrackerDate(e.target.value);
    setSortedDates(getWeekDates(newDate));
  };

  // Calculate Daily Totals for Nutritional Tracking
  const selectedMeals = groupedPlans[trackerDate] || [];
  const dailyTotals = selectedMeals.reduce(
    (acc, plan) => {
      // 1. Use macros stored directly on the plan entry (preferred for AI suggestions)
      if (plan.calories !== undefined && plan.macros) {
        acc.calories += plan.calories || 0;
        acc.protein += plan.macros.protein || 0;
        acc.carbs += plan.macros.carbs || 0;
        acc.fat += plan.macros.fat || 0;
        return acc;
      }

      // 2. Fallback: Search in all possible recipe sources
      const recipe =
        favorites.find(
          (f) => f.id === plan.recipeId || f.title === plan.recipeTitle,
        ) ||
        recipes.find(
          (r) => r.id === plan.recipeId || r.title === plan.recipeTitle,
        ) ||
        hotPicks.find(
          (h) => h.id === plan.recipeId || h.title === plan.recipeTitle,
        );

      if (recipe) {
        acc.calories += recipe.calories || 0;
        acc.protein += recipe.macros?.protein || 0;
        acc.carbs += recipe.macros?.carbs || 0;
        acc.fat += recipe.macros?.fat || 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">
            Weekly Meal Plan
          </h2>
          <p className="text-stone-500">
            Organize your cooking for the week ahead
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearAllPlans}
            disabled={isClearing || plans.length === 0}
            className="text-stone-400 hover:text-red-500 px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:text-stone-400"
          >
            {isClearing ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : (
              <Trash2 size={18} />
            )}
            Clear All
          </button>
          <button
            onClick={handleAISuggest}
            disabled={isSuggesting}
            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSuggesting ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <Sparkles size={20} />
            )}
            AI Suggest Week
          </button>
        </div>
      </div>

      {/* Nutritional Tracking Dashboard */}
      <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-stone-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">Daily Nutrition Tracker</h3>
              <p className="text-stone-400">
                Tracking progress for{" "}
                <span className="text-orange-400 font-bold">
                  {trackerDate === new Date().toLocaleDateString("en-CA")
                    ? "Today"
                    : trackerDate}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 bg-stone-800 p-2 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  const input = trackerDateInputRef.current;
                  if (input && input.showPicker) {
                    input.showPicker();
                  }
                }}
                className="flex items-center gap-2 text-sm font-bold text-white outline-none cursor-pointer touch-manipulation"
                aria-label="Select date"
              >
                <Calendar size={16} className="text-stone-400" />
                <span>
                  {new Date(trackerDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </button>
              <input
                ref={trackerDateInputRef}
                type="date"
                value={trackerDate}
                onChange={handleDateChange}
                className="sr-only"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full lg:w-auto">
            {[
              {
                label: "Calories",
                current: dailyTotals.calories,
                goal: userGoals.calories,
                unit: "kcal",
                color: "bg-orange-500",
              },
              {
                label: "Protein",
                current: dailyTotals.protein,
                goal: userGoals.protein,
                unit: "g",
                color: "bg-blue-500",
              },
              {
                label: "Carbs",
                current: dailyTotals.carbs,
                goal: userGoals.carbs,
                unit: "g",
                color: "bg-yellow-500",
              },
              {
                label: "Fat",
                current: dailyTotals.fat,
                goal: userGoals.fat,
                unit: "g",
                color: "bg-stone-500",
              },
            ].map((stat) => (
              <div key={stat.label} className="space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                  <span>{stat.label}</span>
                  <span>{Math.round((stat.current / stat.goal) * 100)}%</span>
                </div>
                <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (stat.current / stat.goal) * 100)}%`,
                    }}
                    className={cn("h-full rounded-full", stat.color)}
                  />
                </div>
                <div className="text-sm font-bold">
                  {stat.current}{" "}
                  <span className="text-stone-500 font-normal">
                    / {stat.goal}
                    {stat.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {actionError && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">
            {actionError}
          </div>
        )}
        {sortedDates.map((date) => (
          <div key={date} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-stone-900 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="flex-1 h-px bg-stone-100" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["Breakfast", "Lunch", "Dinner", "Snack"].map((type) => {
                const plan = (groupedPlans[date] || []).find(
                  (p) => p.mealType.toLowerCase() === type.toLowerCase(),
                );
                const recipe = plan
                  ? favorites.find(
                      (f) =>
                        f.id === plan.recipeId || f.title === plan.recipeTitle,
                    ) ||
                    recipes.find(
                      (r) =>
                        r.id === plan.recipeId || r.title === plan.recipeTitle,
                    ) ||
                    hotPicks.find(
                      (h) =>
                        h.id === plan.recipeId || h.title === plan.recipeTitle,
                    )
                  : null;

                const safeMealType = String(plan?.mealType || "lunch");
                const safeDate = new Date(date);
                const fallbackMealPlanRecipe: Recipe | null = plan
                  ? {
                      id:
                        plan.recipeId ||
                        `mealplan-${date}-${safeMealType}-${plan.recipeTitle}`,
                      title: plan.recipeTitle || "Planned Recipe",
                      description: `Planned ${type.toLowerCase()} for ${safeDate.toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                        },
                      )}.`,
                      ingredients: [],
                      instructions: [],
                      prepTime: 15,
                      calories: plan.calories ?? 0,
                      macros: plan.macros || {
                        protein: 0,
                        carbs: 0,
                        fat: 0,
                      },
                      mealType: [safeMealType as any],
                      isVeg: false,
                      image: undefined,
                      imageUrl: undefined,
                    }
                  : null;

                return (
                  <div
                    key={type}
                    className={cn(
                      "p-5 rounded-3xl border transition-all",
                      plan
                        ? "bg-white border-stone-100 shadow-sm"
                        : "bg-stone-50 border-dashed border-stone-200 opacity-60",
                    )}
                  >
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                      {type}
                    </div>
                    {plan ? (
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 cursor-pointer group/title"
                          onClick={() =>
                            onRecipeClick(recipe || fallbackMealPlanRecipe!)
                          }
                        >
                          <h4 className="font-bold text-stone-900 leading-tight group-hover/title:text-orange-500 transition-colors">
                            {plan.recipeTitle}
                          </h4>
                          {(recipe || fallbackMealPlanRecipe) && (
                            <p className="text-[10px] text-orange-500 font-bold mt-1 opacity-0 group-hover/title:opacity-100 transition-opacity">
                              View Recipe →
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removePlan(plan.id)}
                          className="text-stone-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-stone-300 text-sm italic">
                        Nothing planned
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {plans.length === 0 && !isSuggesting && (
          <div className="text-center py-20 bg-stone-50 rounded-[3rem] border-2 border-dashed border-stone-200">
            <Calendar size={48} className="text-stone-200 mx-auto mb-4" />
            <h3 className="text-stone-400 font-medium">No meals planned yet</h3>
            <p className="text-stone-300 text-sm mb-6">
              Let AI help you plan your week!
            </p>
            <button
              onClick={handleAISuggest}
              className="text-orange-500 font-bold hover:underline"
            >
              Suggest a meal plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Shopping List Page
const ShoppingList = ({
  items,
  user,
  onChanged,
}: {
  items: ShoppingListItem[];
  user: any;
  onChanged: () => Promise<void>;
}) => {
  const [newItem, setNewItem] = useState({ name: "", amount: "" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const q = newItem.name.trim().toLowerCase();
    if (!q) return setNameSuggestions([]);
    const existing = new Set(items.map((i) => i.name.toLowerCase()));
    const filtered = commonIngredients
      .filter(
        (i) => i.toLowerCase().includes(q) && !existing.has(i.toLowerCase()),
      )
      .slice(0, 5);
    // Only show suggestions that are not exact matches to what's typed
    const suggestions = filtered.filter((i) => i.toLowerCase() !== q);
    setNameSuggestions(suggestions);
  }, [newItem.name, items]);

  const addItem = async () => {
    if (!user || !newItem.name) return;
    try {
      setActionError(null);
      await addShoppingItem(user.id, {
        name: newItem.name,
        amount: newItem.amount,
        isBought: false,
      });
      setNewItem({ name: "", amount: "" });
      await onChanged();
    } catch (error) {
      setActionError(formatAppError(error));
      console.error(error);
    }
  };

  const toggleItem = async (id: string, isBought: boolean) => {
    if (!user) return;
    try {
      setActionError(null);
      await setShoppingBought(user.id, id, !isBought);
      await onChanged();
    } catch (error) {
      setActionError(formatAppError(error));
      console.error(error);
    }
  };

  const removeItem = async (id: string) => {
    if (!user) return;
    try {
      setActionError(null);
      await removeShoppingItem(user.id, id);
      await onChanged();
    } catch (error) {
      setActionError(formatAppError(error));
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-stone-900">Shopping List</h2>

      {actionError && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">
          {actionError}
        </div>
      )}

      <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            Item Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") addItem();
              }}
              placeholder="e.g. Milk"
              className="w-full bg-stone-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
            />
            {nameSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-stone-100 z-20 overflow-hidden">
                {nameSuggestions.map((s) => (
                  <button
                    key={s}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setNewItem({ ...newItem, name: s });
                      setNameSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    type="button"
                  >
                    <span className="font-medium">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="w-32">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            Amount
          </label>
          <input
            type="text"
            value={newItem.amount}
            onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
            placeholder="1L"
            className="w-full bg-stone-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button
          onClick={addItem}
          className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
        >
          Add
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between group"
          >
            <button
              onClick={() => toggleItem(item.id, item.isBought)}
              className="flex items-center gap-4 flex-1 text-left"
            >
              {item.isBought ? (
                <CheckCircle2 className="text-green-500" size={24} />
              ) : (
                <Circle className="text-stone-200" size={24} />
              )}
              <div
                className={
                  item.isBought
                    ? "line-through text-stone-300"
                    : "text-stone-900"
                }
              >
                <h4 className="font-bold">{item.name}</h4>
                <p className="text-sm opacity-60">{item.amount}</p>
              </div>
            </button>
            <button
              onClick={() => removeItem(item.id)}
              className="p-2 text-stone-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [activePage, setActivePage] = useState("scan");
  const { user, loading, login, logout } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [isMobileIntro, setIsMobileIntro] = useState(false);
  const [isIntroVideoPlaying, setIsIntroVideoPlaying] = useState(false);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);

  // Lifted Home State
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [hotPicks, setHotPicks] = useState<Recipe[]>([]);
  const [selectedMealType, setSelectedMealType] = useState<string>("All");
  const [favorites, setFavorites] = useState<Recipe[]>([]);

  // New Lifted States
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanEntry[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoals>({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70,
  });

  const refreshFavorites = async () => {
    if (!user) return;
    setFavorites(await listFavorites(user.id));
  };

  const refreshPantry = async () => {
    if (!user) return;
    setPantryItems(await listPantry(user.id));
  };

  const refreshShopping = async () => {
    if (!user) return;
    setShoppingList(await listShopping(user.id));
  };

  const refreshMealPlans = async () => {
    if (!user) return;
    setMealPlans(await listMealPlans(user.id));
  };

  useEffect(() => {
    const seenIntro = sessionStorage.getItem("flavorai_intro_shown");
    setShowIntro(!seenIntro);
  }, []);

  useEffect(() => {
    if (showIntro) {
      setIsIntroVideoPlaying(false);
    }
  }, [showIntro]);

  useEffect(() => {
    if (!showIntro) return;

    const video = introVideoRef.current;
    if (!video) return;

    void video.play().catch(() => {
      // If autoplay is delayed/blocked, still reveal the first frame once loaded.
    });
  }, [showIntro, isMobileIntro]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateIntroSource = () => setIsMobileIntro(mediaQuery.matches);

    updateIntroSource();
    mediaQuery.addEventListener?.("change", updateIntroSource);

    return () => {
      mediaQuery.removeEventListener?.("change", updateIntroSource);
    };
  }, []);

  const hideIntro = () => {
    sessionStorage.setItem("flavorai_intro_shown", "true");
    setIsIntroVideoPlaying(false);
    setShowIntro(false);
  };

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const [f, p, s, m] = await Promise.all([
          listFavorites(user.id),
          listPantry(user.id),
          listShopping(user.id),
          listMealPlans(user.id),
        ]);
        setFavorites(f);
        setPantryItems(p);
        setShoppingList(s);
        setMealPlans(m);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user]);

  const handleAddToShoppingList = async (
    items: { name: string; amount: string }[],
  ) => {
    if (!user) return;
    for (const item of items) {
      await addShoppingItem(user.id, { ...item, isBought: false });
    }
    await refreshShopping();
  };

  const handleFinishCooking = async (recipe: Recipe) => {
    if (!user) return;
    // Deduct from pantry
    for (const ing of recipe.ingredients) {
      const pantryItem = pantryItems.find(
        (pi) =>
          pi.name.toLowerCase().includes(ing.name.toLowerCase()) ||
          ing.name.toLowerCase().includes(pi.name.toLowerCase()),
      );
      if (pantryItem) {
        await removePantryItem(user.id, pantryItem.id);
      }
    }
    await refreshPantry();
  };

  const toggleFavorite = async (recipe: Recipe) => {
    if (!user) return;
    const isFav = favorites.some((f) => f.title === recipe.title);
    if (isFav) {
      await removeFavorite(user.id, recipe.title);
    } else {
      await addFavorite(user.id, recipe);
    }
    await refreshFavorites();
  };

  const getCachedMealPlanImageUrl = (title: string) => {
    const normalized = title.trim() || "delicious food";
    if (mealPlanImageCache.has(normalized)) {
      return mealPlanImageCache.get(normalized)!;
    }

    const imageUrl = getPollinationsImageUrl(
      `${normalized}, realistic food photography, high quality`,
      {
        model: "flux-schnell",
        width: 800,
        height: 600,
      },
    );
    mealPlanImageCache.set(normalized, imageUrl);
    return imageUrl;
  };

  const loadMealPlanRecipeDetails = async (recipe: Recipe) => {
    setSelectedRecipeForPlan(recipe);

    const needsDetails =
      recipe.ingredients.length === 0 || recipe.instructions.length === 0;
    const needsImage = !recipe.image && !recipe.imageUrl;
    if (!needsDetails && !needsImage) {
      return;
    }

    try {
      const detailedRecipe = await generateRecipeFromTitle(recipe.title);
      const mergedRecipe = {
        ...recipe,
        ...detailedRecipe,
        id: recipe.id || detailedRecipe.id,
        image: detailedRecipe.image || recipe.image,
        ingredients:
          detailedRecipe.ingredients && detailedRecipe.ingredients.length > 0
            ? detailedRecipe.ingredients
            : recipe.ingredients,
        instructions:
          detailedRecipe.instructions && detailedRecipe.instructions.length > 0
            ? detailedRecipe.instructions
            : recipe.instructions,
        calories:
          Number.isFinite(detailedRecipe.calories) &&
          detailedRecipe.calories > 0
            ? detailedRecipe.calories
            : recipe.calories,
        prepTime:
          Number.isFinite(detailedRecipe.prepTime) &&
          detailedRecipe.prepTime > 0
            ? detailedRecipe.prepTime
            : recipe.prepTime,
        macros:
          detailedRecipe.macros &&
          Number.isFinite(detailedRecipe.macros.protein) &&
          Number.isFinite(detailedRecipe.macros.carbs) &&
          Number.isFinite(detailedRecipe.macros.fat)
            ? detailedRecipe.macros
            : recipe.macros,
      } as Recipe;

      setSelectedRecipeForPlan(mergedRecipe);

      if (needsImage) {
        const imageUrl = getCachedMealPlanImageUrl(mergedRecipe.title);
        setSelectedRecipeForPlan((current) =>
          current
            ? {
                ...current,
                imageUrl,
              }
            : { ...mergedRecipe, imageUrl },
        );
      }
    } catch (error) {
      console.error("Failed to generate meal plan recipe details:", error);
    }
  };

  const [selectedRecipeForPlan, setSelectedRecipeForPlan] =
    useState<Recipe | null>(null);
  const [selectedSavedRecipe, setSelectedSavedRecipe] = useState<Recipe | null>(
    null,
  );

  const renderPage = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-orange-50 p-8 rounded-[2.5rem] mb-8">
            <LogIn size={64} className="text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold text-stone-900 mb-4">
            Welcome to FlavorAI
          </h2>
          <p className="text-stone-500 max-w-md mb-10 text-lg leading-relaxed">
            Sign in to save recipes, track your pantry, and plan your weekly
            meals with AI.
          </p>
          <button
            onClick={async () => {
              setLoginError(null);
              try {
                await login();
              } catch (e) {
                setLoginError(e instanceof Error ? e.message : String(e));
              }
            }}
            className="bg-stone-900 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-stone-200 hover:bg-stone-800 transition-all active:scale-95 flex items-center gap-3"
          >
            <img
              src="https://www.google.com/favicon.ico"
              className="w-5 h-5"
              alt="Google"
            />
            Sign in with Google
          </button>
          {loginError && (
            <div className="mt-6 max-w-md w-full text-left bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">
              {loginError}
            </div>
          )}
        </div>
      );
    }

    switch (activePage) {
      case "scan":
        return (
          <Home
            ingredients={ingredients}
            setIngredients={setIngredients}
            recipes={recipes}
            setRecipes={setRecipes}
            hotPicks={hotPicks}
            setHotPicks={setHotPicks}
            selectedMealType={selectedMealType}
            setSelectedMealType={setSelectedMealType}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            onAddToShoppingList={handleAddToShoppingList}
            onFinishCooking={handleFinishCooking}
            onPlanned={refreshMealPlans}
          />
        );
      case "recipes":
        return (
          <>
            <MyRecipes
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              onRecipeClick={(r) => setSelectedSavedRecipe(r)}
            />
            <AnimatePresence>
              {selectedSavedRecipe && (
                <RecipeDetails
                  recipe={selectedSavedRecipe}
                  onClose={() => setSelectedSavedRecipe(null)}
                  isFavorite={favorites.some(
                    (f) => f.title === selectedSavedRecipe.title,
                  )}
                  onFavorite={() => toggleFavorite(selectedSavedRecipe)}
                  userIngredients={ingredients}
                  onAddToShoppingList={handleAddToShoppingList}
                  onFinishCooking={handleFinishCooking}
                  onPlanned={refreshMealPlans}
                />
              )}
            </AnimatePresence>
          </>
        );
      case "pantry":
        return (
          <Pantry items={pantryItems} user={user} onChanged={refreshPantry} />
        );
      case "mealplan":
        return (
          <>
            <MealPlan
              plans={mealPlans}
              favorites={favorites}
              recipes={recipes}
              hotPicks={hotPicks}
              userGoals={userGoals}
              onRecipeClick={loadMealPlanRecipeDetails}
              onChanged={refreshMealPlans}
            />
            <AnimatePresence>
              {selectedRecipeForPlan && (
                <RecipeDetails
                  key={selectedRecipeForPlan.id}
                  recipe={selectedRecipeForPlan}
                  onClose={() => setSelectedRecipeForPlan(null)}
                  isFavorite={favorites.some(
                    (f) => f.title === selectedRecipeForPlan.title,
                  )}
                  onFavorite={() => toggleFavorite(selectedRecipeForPlan)}
                  userIngredients={ingredients}
                  onAddToShoppingList={handleAddToShoppingList}
                  onFinishCooking={handleFinishCooking}
                  onPlanned={refreshMealPlans}
                />
              )}
            </AnimatePresence>
          </>
        );
      case "shopping":
        return (
          <ShoppingList
            items={shoppingList}
            user={user}
            onChanged={refreshShopping}
          />
        );
      case "profile":
        return (
          <div className="max-w-2xl space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-stone-900">Profile</h2>
              <p className="text-stone-500 mt-1">
                Account details and sign out
              </p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm space-y-4">
              <div>
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Email
                </div>
                <div className="text-stone-900 font-semibold">
                  {user?.email ?? "—"}
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    await logout();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-stone-200 hover:bg-stone-800 transition-all"
              >
                Sign out
              </button>
            </div>
          </div>
        );
      default:
        return (
          <Home
            ingredients={ingredients}
            setIngredients={setIngredients}
            recipes={recipes}
            setRecipes={setRecipes}
            hotPicks={hotPicks}
            setHotPicks={setHotPicks}
            selectedMealType={selectedMealType}
            setSelectedMealType={setSelectedMealType}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            onAddToShoppingList={handleAddToShoppingList}
            onFinishCooking={handleFinishCooking}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
        <div className="text-center">
          <Loader2
            className="animate-spin text-orange-500 mx-auto mb-4"
            size={48}
          />
          <p className="text-stone-400 font-medium">Loading FlavorAI...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="intro-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-[#f4f3fb]"
          >
            {!isIntroVideoPlaying && <IntroSplashPlaceholder />}
            <video
              ref={introVideoRef}
              src={isMobileIntro ? "/intro-mobile.mp4" : "/intro.mp4"}
              autoPlay
              muted
              playsInline
              preload="auto"
              onLoadedData={() => setIsIntroVideoPlaying(true)}
              onCanPlay={() => setIsIntroVideoPlaying(true)}
              onPlaying={() => setIsIntroVideoPlaying(true)}
              onEnded={hideIntro}
              className={`h-full w-full transition-opacity duration-300 ${
                isIntroVideoPlaying ? "opacity-100" : "opacity-0"
              } ${isMobileIntro ? "object-cover" : "object-contain"}`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Layout activePage={activePage} setActivePage={setActivePage}>
        {renderPage()}
      </Layout>
    </>
  );
}
