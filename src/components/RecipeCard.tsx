import React, { useState } from "react";
import {
  Clock,
  Flame,
  Leaf,
  ChevronRight,
  Heart,
  Calendar,
  Image,
} from "lucide-react";
import { Recipe } from "../types";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onFavorite?: () => void;
  onPlan?: () => void;
  isFavorite?: boolean;
}

const FALLBACK_IMAGE = "https://via.placeholder.com/800x600?text=Recipe+Image";

export default function RecipeCard({
  recipe,
  onClick,
  onFavorite,
  onPlan,
  isFavorite,
}: RecipeCardProps) {
  const [imageError, setImageError] = useState(false);

  // 🔥 FIX: support both image sources
  const imageSrc =
    !imageError && (recipe.image || recipe.imageUrl)
      ? recipe.image || recipe.imageUrl
      : FALLBACK_IMAGE;

  const handleImageError = () => {
    console.warn(`⚠️ Image failed to load: ${recipe.title}`, imageSrc);
    setImageError(true);
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative h-48 bg-stone-100">
        <img
          src={imageSrc}
          alt={recipe.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          onError={handleImageError}
        />

        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {recipe.isVeg ? (
            <div className="bg-green-500/90 text-white px-2 py-1 rounded-lg flex items-center gap-1.5">
              <Leaf size={12} />
              <span className="text-[10px] font-bold">Veg</span>
            </div>
          ) : (
            <div className="bg-red-500/90 text-white px-2 py-1 rounded-lg flex items-center gap-1.5">
              <Flame size={12} />
              <span className="text-[10px] font-bold">Non-Veg</span>
            </div>
          )}

          {/* 🔥 FIXED ERROR */}
          {(recipe.missingIngredientsCount ?? 0) > 0 && (
            <div className="bg-amber-500/90 text-white px-2 py-1 rounded-lg text-[10px] font-bold">
              {recipe.missingIngredientsCount ?? 0} missing
            </div>
          )}
        </div>

        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite?.();
            }}
            className={cn(
              "p-2 rounded-xl shadow-lg",
              isFavorite ? "bg-red-500 text-white" : "bg-white text-stone-600",
            )}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onPlan) onPlan();
              else onClick();
            }}
            className="p-2 bg-white rounded-xl text-stone-600 shadow-lg"
          >
            <Calendar size={18} className="text-orange-500" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex gap-3 text-white text-xs">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{recipe.prepTime}m</span>
            </div>
            <div className="flex items-center gap-1">
              <Flame size={14} />
              <span>{recipe.calories} kcal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between mb-2">
          <h3 className="font-bold text-stone-900 group-hover:text-orange-600">
            {recipe.title}
          </h3>
          <ChevronRight className="text-stone-300 group-hover:text-orange-400" />
        </div>

        <p className="text-stone-500 text-sm line-clamp-2 mb-4">
          {recipe.description}
        </p>

        <div className="flex gap-1.5 flex-wrap">
          {recipe.mealType.slice(0, 2).map((type) => (
            <span
              key={type}
              className="px-2 py-1 bg-stone-50 text-stone-500 text-[10px] font-bold rounded"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
