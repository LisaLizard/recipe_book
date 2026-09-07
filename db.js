/* ==========================================================================
   db.js — обёртка над таблицей `recipes` в Supabase.
   Подключается после config.js (использует supabaseClient и PHOTO_BUCKET).
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

/**
 * Загрузить фото в Supabase Storage и вернуть публичный URL.
 * @param {File} file
 * @param {string} recipeId — используется как часть имени файла
 */
async function uploadRecipePhoto(file, recipeId) {
  const ext = file.name.split('.').pop();
  const path = `${recipeId || Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
