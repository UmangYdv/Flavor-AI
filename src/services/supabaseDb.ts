import { supabase } from '../supabaseClient';
import type { MealPlanEntry, PantryItem, Recipe, ShoppingListItem } from '../types';

function assertOk<T>(result: { data: T | null; error: any }): T {
  if (result.error) throw result.error;
  return result.data;
}

export async function listFavorites(userId: string): Promise<Recipe[]> {
  const res = await supabase
    .from('favorites')
    .select('recipe')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  const rows = assertOk<{ recipe: Recipe }[]>(res) ?? [];
  return rows.map(r => r.recipe);
}

export async function addFavorite(userId: string, recipe: Recipe): Promise<void> {
  const res = await supabase.from('favorites').insert({
    user_id: userId,
    recipe_id: recipe.id,
    recipe_title: recipe.title,
    recipe,
  });
  assertOk(res as any);
}

export async function removeFavorite(userId: string, recipeTitle: string): Promise<void> {
  const res = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_title', recipeTitle);
  assertOk(res as any);
}

export async function listPantry(userId: string): Promise<PantryItem[]> {
  // Be tolerant if older schema is missing `category`.
  const res = await supabase
    .from('pantry_items')
    .select('id,name,quantity,expiry_date,category')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (res.error && String(res.error.code) === 'PGRST204') {
    const fallback = await supabase
      .from('pantry_items')
      .select('id,name,quantity,expiry_date')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const rows = assertOk<any[]>(fallback) ?? [];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      quantity: r.quantity,
      expiryDate: r.expiry_date ?? undefined,
      category: 'other',
    }));
  }

  const rows = assertOk<any[]>(res) ?? [];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    quantity: r.quantity,
    expiryDate: r.expiry_date ?? undefined,
    category: r.category ?? 'other',
  }));
}

export async function addPantryItem(userId: string, item: Omit<PantryItem, 'id'>): Promise<void> {
  // Be tolerant if older schema is missing `category`.
  const res = await supabase.from('pantry_items').insert({
    user_id: userId,
    name: item.name,
    quantity: item.quantity,
    category: item.category,
    expiry_date: item.expiryDate ?? null,
  });

  if (res.error && String(res.error.code) === 'PGRST204') {
    const fallback = await supabase.from('pantry_items').insert({
      user_id: userId,
      name: item.name,
      quantity: item.quantity,
      expiry_date: item.expiryDate ?? null,
    });
    assertOk(fallback as any);
    return;
  }

  assertOk(res as any);
}

export async function removePantryItem(userId: string, id: string): Promise<void> {
  const res = await supabase.from('pantry_items').delete().eq('user_id', userId).eq('id', id);
  assertOk(res as any);
}

export async function listShopping(userId: string): Promise<ShoppingListItem[]> {
  const res = await supabase
    .from('shopping_list_items')
    .select('id,name,amount,is_bought')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  const rows = assertOk<any[]>(res) ?? [];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    isBought: !!r.is_bought,
  }));
}

export async function addShoppingItem(userId: string, item: Omit<ShoppingListItem, 'id'>): Promise<void> {
  const res = await supabase.from('shopping_list_items').insert({
    user_id: userId,
    name: item.name,
    amount: item.amount,
    is_bought: item.isBought,
  });
  assertOk(res as any);
}

export async function setShoppingBought(userId: string, id: string, isBought: boolean): Promise<void> {
  const res = await supabase
    .from('shopping_list_items')
    .update({ is_bought: isBought })
    .eq('user_id', userId)
    .eq('id', id);
  assertOk(res as any);
}

export async function removeShoppingItem(userId: string, id: string): Promise<void> {
  const res = await supabase.from('shopping_list_items').delete().eq('user_id', userId).eq('id', id);
  assertOk(res as any);
}

export async function listMealPlans(userId: string): Promise<MealPlanEntry[]> {
  const res = await supabase
    .from('meal_plan_entries')
    .select('id,recipe_id,recipe_title,date,meal_type,calories,macros')
    .eq('user_id', userId)
    .order('date', { ascending: true });
  const rows = assertOk<any[]>(res) ?? [];
  return rows.map(r => ({
    id: r.id,
    recipeId: r.recipe_id,
    recipeTitle: r.recipe_title,
    date: r.date,
    mealType: r.meal_type,
    calories: r.calories ?? undefined,
    macros: r.macros ?? undefined,
  }));
}

export async function addMealPlanEntry(userId: string, entry: Omit<MealPlanEntry, 'id'>): Promise<void> {
  const res = await supabase.from('meal_plan_entries').insert({
    user_id: userId,
    recipe_id: entry.recipeId,
    recipe_title: entry.recipeTitle,
    date: entry.date,
    meal_type: entry.mealType,
    calories: entry.calories ?? null,
    macros: entry.macros ?? null,
  });
  assertOk(res as any);
}

export async function removeMealPlanEntry(userId: string, id: string): Promise<void> {
  const res = await supabase.from('meal_plan_entries').delete().eq('user_id', userId).eq('id', id);
  assertOk(res as any);
}

export async function clearMealPlans(userId: string): Promise<void> {
  const res = await supabase.from('meal_plan_entries').delete().eq('user_id', userId);
  assertOk(res as any);
}

