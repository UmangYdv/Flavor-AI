import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Clock,
  Flame,
  Leaf,
  Volume2,
  VolumeX,
  Share2,
  Heart,
  Calendar,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ShoppingCart,
  ChefHat,
  Mic,
  MicOff,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Image,
} from "lucide-react";
import { Recipe } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import CookingMode from "./CookingMode";
import { addMealPlanEntry } from "../services/supabaseDb";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface RecipeDetailsProps {
  recipe: Recipe;
  onClose: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  initialShowPlan?: boolean;
  userIngredients?: string[];
  onAddToShoppingList?: (items: { name: string; amount: string }[]) => void;
  onFinishCooking?: (recipe: Recipe) => void;
  onPlanned?: () => Promise<void>;
}

export default function RecipeDetails({
  recipe,
  onClose,
  onFavorite,
  isFavorite = false,
  initialShowPlan = false,
  userIngredients = [],
  onAddToShoppingList,
  onFinishCooking,
  onPlanned,
}: RecipeDetailsProps) {
  const { user } = useAuth();
  const mealTypeOptions = [
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "dessert",
  ] as const;
  type MealTypeOption = (typeof mealTypeOptions)[number];

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(initialShowPlan);
  const [saveDate, setSaveDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [saveMealType, setSaveMealType] = useState<MealTypeOption>(
    (recipe.mealType[0] as MealTypeOption) || "lunch",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCookingMode, setShowCookingMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setSuccessMessage(null);
  }, [recipe.id]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const missingIngredients = recipe.ingredients.filter(
    (ing) =>
      !userIngredients.some(
        (ui) =>
          ui.toLowerCase().includes(ing.name.toLowerCase()) ||
          ing.name.toLowerCase().includes(ui.toLowerCase()),
      ),
  );

  const nutritionData = [
    { name: "Protein", value: recipe.macros.protein, color: "#f97316" },
    { name: "Carbs", value: recipe.macros.carbs, color: "#fbbf24" },
    { name: "Fat", value: recipe.macros.fat, color: "#44403c" },
  ];

  const handlePlanSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await addMealPlanEntry(user.id, {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        date: saveDate,
        mealType: saveMealType as any,
        calories: recipe.calories,
        macros: recipe.macros,
      } as any);

      setShowSaveModal(false);
      await onPlanned?.();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const speakAll = () => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    setIsSpeaking(true);
    setIsPaused(false);

    const fullText = `Recipe for ${recipe.title}. Ingredients: ${recipe.ingredients.map((i) => `${i.amount} ${i.unit} of ${i.name}`).join(", ")}. Instructions: ${recipe.instructions.join(". ")}`;
    const utterance = new SpeechSynthesisUtterance(fullText);

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [recipe.id, recipe.image, recipe.imageUrl]);

  const showPlaceholder = imageError || !(recipe.image || recipe.imageUrl);
  const imageSrc = !showPlaceholder ? recipe.image || recipe.imageUrl : null;

  // Add a ref to the button to calculate its position
  const calendarButtonRef = useRef<HTMLButtonElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });

  const handleDatePickerClick = () => {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof (input as any).showPicker === "function") {
      (input as any).showPicker();
    } else {
      input.focus();
      input.click(); // iOS fix
    }

    if (calendarButtonRef.current) {
      const rect = calendarButtonRef.current.getBoundingClientRect();
      setCalendarPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10 bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="relative h-64 md:h-80 bg-stone-100 shrink-0 overflow-hidden">
          {!showPlaceholder ? (
            <img
              src={imageSrc!}
              alt={recipe.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-orange-100 via-amber-100 to-stone-100 text-stone-500">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/90 shadow-xl">
                <Image size={44} />
              </div>
              <div className="text-center px-6">
                <p className="text-lg font-semibold text-stone-700">
                  No image available
                </p>
                <p className="text-sm text-stone-500">
                  The recipe generator did not return a valid photo.
                </p>
              </div>
            </div>
          )}

          <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
            <button
              type="button"
              onClick={onClose}
              className="bg-white/90 backdrop-blur-md p-3 rounded-2xl text-stone-600 hover:bg-white transition-all shadow-lg cursor-pointer touch-manipulation"
              aria-label="Close recipe details"
            >
              <X size={20} />
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSaveModal(true)}
                className="bg-white/90 backdrop-blur-md p-3 rounded-2xl text-stone-600 hover:bg-white transition-all shadow-lg flex items-center gap-2 cursor-pointer touch-manipulation"
                aria-label="Add to meal plan"
              >
                <Calendar size={20} className="text-orange-500" />
                <span className="text-sm font-bold text-stone-900">Plan</span>
              </button>
              <button
                type="button"
                onClick={onFavorite}
                className={cn(
                  "bg-white/90 backdrop-blur-md p-3 rounded-2xl transition-all shadow-lg cursor-pointer touch-manipulation",
                  isFavorite ? "bg-red-500 text-white" : "hover:bg-white",
                )}
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                <Heart
                  size={20}
                  className={isFavorite ? "text-white" : "text-red-500"}
                  fill={isFavorite ? "currentColor" : "none"}
                />
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
            <div className="flex gap-3 mb-3">
              {recipe.isVeg ? (
                <span className="bg-green-500 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                  <Leaf size={12} /> VEG
                </span>
              ) : (
                <span className="bg-red-500 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                  <Flame size={12} /> NON-VEG
                </span>
              )}
              {recipe.mealType.map((t) => (
                <span
                  key={t}
                  className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                >
                  {t}
                </span>
              ))}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              {recipe.title}
            </h2>
            <div className="flex gap-6 text-sm font-medium opacity-90">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-orange-400" />
                <span>{recipe.prepTime} mins</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-orange-400" />
                <span>{recipe.calories} kcal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-10 scrollbar-hide">
          {/* Nutrition Pie Chart Section */}
          <div className="mb-12 bg-stone-50 rounded-[2.5rem] p-8 border border-stone-100">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={nutritionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {nutritionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "1rem",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <h3 className="text-2xl font-bold text-stone-900">
                  Nutrition Overview
                </h3>
                <p className="text-stone-500">
                  A balanced breakdown of macronutrients for this recipe. Total
                  calories:{" "}
                  <span className="text-orange-600 font-bold">
                    {recipe.calories} kcal
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {nutritionData.map((item) => (
                    <div
                      key={item.name}
                      className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100"
                    >
                      <div className="text-sm text-stone-400 font-medium">
                        {item.name}
                      </div>
                      <div className="text-lg font-bold text-stone-900">
                        {item.value}g
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Left Column: Ingredients */}
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                  Ingredients
                </h3>
                <ul className="space-y-3">
                  {recipe.ingredients.map((ing, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100"
                    >
                      <span className="font-medium">{ing.name}</span>
                      <span className="text-stone-400 text-sm">
                        {ing.amount} {ing.unit}
                      </span>
                    </li>
                  ))}
                </ul>

                {missingIngredients.length > 0 && (
                  <>
                    <button
                      onClick={async () => {
                        if (!onAddToShoppingList) return;
                        await onAddToShoppingList(
                          missingIngredients.map((ing) => ({
                            name: ing.name,
                            amount: `${ing.amount} ${ing.unit}`,
                          })),
                        );
                        setSuccessMessage(
                          "Missing items are added to the shopping list.",
                        );
                      }}
                      className="w-full mt-4 flex items-center justify-center gap-2 bg-orange-50 text-orange-600 py-3 rounded-xl font-bold hover:bg-orange-100 transition-all border border-orange-100"
                    >
                      <ShoppingCart size={18} />
                      Add {missingIngredients.length} missing item
                      {missingIngredients.length > 1 ? "s" : ""} to shopping
                      list
                    </button>
                    {successMessage && (
                      <div className="mt-3 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {successMessage}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Instructions */}
            <div className="md:col-span-2 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                    Instructions
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCookingMode(true)}
                      className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
                    >
                      <ChefHat size={16} />
                      Start Cooking
                    </button>

                    <div className="flex items-center bg-stone-100 rounded-xl p-1">
                      <button
                        onClick={speakAll}
                        className={cn(
                          "flex items-center gap-2 font-bold text-xs px-3 py-1.5 rounded-lg transition-all",
                          isSpeaking && !isPaused
                            ? "bg-orange-500 text-white shadow-sm"
                            : "text-stone-600 hover:bg-white",
                        )}
                      >
                        {isSpeaking && !isPaused ? (
                          <Pause size={14} />
                        ) : (
                          <Volume2 size={14} />
                        )}
                        {isSpeaking ? (isPaused ? "Resume" : "Pause") : "Read"}
                      </button>
                      {isSpeaking && (
                        <button
                          onClick={stopSpeaking}
                          className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                          title="Stop Reading"
                        >
                          <VolumeX size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {recipe.instructions.map((step, i) => (
                    <div key={i} className="relative pl-12">
                      <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
                        <p className="text-stone-700 leading-relaxed">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-stone-900 mb-6">
                Save to Meal Plan
              </h3>

              <div className="space-y-6">
                <div className="relative">
                  <label className="block text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Select Date
                  </label>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={saveDate}
                    onChange={(e) => setSaveDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 border border-stone-200 bg-stone-100 text-left font-medium text-stone-700 cursor-pointer touch-manipulation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Meal Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {mealTypeOptions.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSaveMealType(type)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all",
                          saveMealType === type
                            ? "bg-orange-500 text-white shadow-lg shadow-orange-100"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200",
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-stone-400 hover:bg-stone-100 transition-colors cursor-pointer touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePlanSave}
                    disabled={isSaving}
                    className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Save Recipe"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCookingMode && (
          <CookingMode
            recipe={recipe}
            onClose={() => setShowCookingMode(false)}
            onFinish={() => {
              onFinishCooking?.(recipe);
              setShowCookingMode(false);
              onClose();
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
