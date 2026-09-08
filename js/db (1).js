/* ==========================================================================
   db.js — обёртка над таблицей `recipes` в Supabase.
   Подключается после config.js (использует supabaseClient).
   ========================================================================== */

const TABLE = 'recipes';

/** Получить все рецепты, отсортированные по категории и названию. */
async function getRecipes() {
  const { data, error } = await supabaseClient
    .from(TABLE)
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

/** Получить один рецепт по id. */
async function getRecipe(id) {
  const { data, error } = await supabaseClient
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/** Добавить новый рецепт. Возвращает созданную запись. */
async function addRecipe(recipe) {
  const { data, error } = await supabaseClient
    .from(TABLE)
    .insert([recipe])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Обновить существующий рецепт по id. */
async function updateRecipe(id, recipe) {
  const { data, error } = await supabaseClient
    .from(TABLE)
    .update(recipe)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Удалить рецепт по id. */
async function deleteRecipe(id) {
  const { error } = await supabaseClient.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

