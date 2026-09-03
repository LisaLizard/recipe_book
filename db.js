// =========================================
// RECIPE BOOK - DATABASE FUNCTIONS
// =========================================

import { SUPABASE_CONFIG } from './config.js';

let supabase = null;

// Initialize Supabase
export async function initSupabase() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm');
  
  supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
  return supabase;
}

// Get all recipes
export async function getAllRecipes() {
  if (!supabase) await initSupabase();
  
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Get recipes by category
export async function getRecipesByCategory(category) {
  if (!supabase) await initSupabase();
  
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Get single recipe by ID
export async function getRecipeById(id) {
  if (!supabase) await initSupabase();
  
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Add recipe
export async function addRecipe(recipe) {
  if (!supabase) await initSupabase();
  
  const { data, error } = await supabase
    .from('recipes')
    .insert([{
      name: recipe.name,
      category: recipe.category,
      time_minutes: recipe.time_minutes,
      spiciness: recipe.spiciness,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      additional_info: recipe.additional_info,
      photo_url: recipe.photo_url,
      is_favorite: recipe.is_favorite
    }])
    .select();
  
  if (error) throw error;
  return data[0];
}

// Update recipe
export async function updateRecipe(id, recipe) {
  if (!supabase) await initSupabase();
  
  const { data, error } = await supabase
    .from('recipes')
    .update({
      name: recipe.name,
      category: recipe.category,
      time_minutes: recipe.time_minutes,
      spiciness: recipe.spiciness,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      additional_info: recipe.additional_info,
      photo_url: recipe.photo_url,
      is_favorite: recipe.is_favorite,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
}

// Delete recipe
export async function deleteRecipe(id) {
  if (!supabase) await initSupabase();
  
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Search recipes
export async function searchRecipes(query) {
  if (!supabase) await initSupabase();
  
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .or(`name.ilike.%${query}%,additional_info.ilike.%${query}%`)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Get favorite recipes
export async function getFavoriteRecipes() {
  if (!supabase) await initSupabase();
  
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('is_favorite', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Get organized recipes by category (for table of contents)
export async function getRecipesOrganizedByCategory() {
  const recipes = await getAllRecipes();
  
  const organized = {};
  recipes.forEach(recipe => {
    if (!organized[recipe.category]) {
      organized[recipe.category] = [];
    }
    organized[recipe.category].push(recipe);
  });
  
  return organized;
}
