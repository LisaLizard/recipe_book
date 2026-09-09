/* ==========================================================================
   recipe-card.js
   Рендерит карточку рецепта (см. css/recipe-card.css) из объекта recipe,
   как он приходит из таблицы Supabase `recipes`.
   Обычный скрипт (не модуль) — доступен как window.renderRecipeCard(...).
   ========================================================================== */

// Цвета и эмодзи по категориям: [эмодзи, фон листа, фон карточки, фон блока шагов]
const RECIPE_CATEGORIES = {
  'завтрак':   ['🥞', '#FBEFC0', '#FFFCEC', '#F7D983'],
  'завтраки':  ['🥞', '#FBEFC0', '#FFFCEC', '#F7D983'],
  'основное':  ['🥡', '#BFE4EA', '#F2FAFB', '#8CCBD9'],
  'супы':      ['🍜', '#F6D6C7', '#FEF5F0', '#EDAE93'],
  'десерты':   ['🧁', '#FBC9DF', '#FEF3F7', '#F59CC1'],
  'салаты':    ['🥗', '#CBEFC6', '#F5FCF3', '#9CDE94'],
  'напитки':   ['☕️', '#EBD7B0', '#FCF8EE', '#DBB983'],
  'другое':    ['🌿', '#DCD3F0', '#F8F6FD', '#B6A7E0'],
};

const RECIPE_CARD_DEFAULT_CATEGORY = 'завтрак';
const RECIPE_CARD_INGREDIENT_ROWS = 12; // фиксированное число строк, чтобы колонка не "прыгала"

function rcEscapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Приводит recipe.ingredients к массиву { qty, name }. */
function rcNormalizeIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  return ingredients.map((item) => {
    if (item && typeof item === 'object') {
      return { qty: item.qty ?? item.amount ?? '', name: item.name ?? '' };
    }
    const str = String(item);
    const match = str.match(/^([\d.,/]+\s*[^\s—-]*)\s*[—-]?\s*(.*)$/);
    return match ? { qty: match[1].trim(), name: match[2].trim() } : { qty: '', name: str };
  });
}

/** Приводит recipe.steps к массиву строк. */
function rcNormalizeSteps(steps) {
  if (Array.isArray(steps)) return steps.map(String);
  if (typeof steps === 'string') return steps.split(/\n+/).filter(Boolean);
  return [];
}

/** Возвращает готовую HTML-строку карточки (пригодится и для экспорта в PDF). */
function recipeCardHTML(recipe) {
  const categoryKey = (recipe.category || '').toLowerCase().trim();
  const [emoji, bg, tableBg, stepBg] = RECIPE_CATEGORIES[categoryKey] || RECIPE_CATEGORIES[RECIPE_CARD_DEFAULT_CATEGORY];

  const ingredients = rcNormalizeIngredients(recipe.ingredients);
  const steps = rcNormalizeSteps(recipe.steps);
  const spice = Math.max(0, Math.min(3, Math.round(recipe.spiciness ?? 0)));

  const ingredientRows = Array.from({ length: RECIPE_CARD_INGREDIENT_ROWS }, (_, i) => {
    const ing = ingredients[i];
    return `
      <div class="recipe-card__ingredient-row">
        <span class="recipe-card__ingredient-qty">${ing ? rcEscapeHtml(ing.qty) : ''}</span>
        <span class="recipe-card__ingredient-name">${ing ? rcEscapeHtml(ing.name) : ''}</span>
      </div>`;
  }).join('');

  const stepsText = steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

  const photoBlock = recipe.photo_url
    ? `<img src="${rcEscapeHtml(recipe.photo_url)}" alt="${rcEscapeHtml(recipe.name)}">`
    : `<div class="recipe-card__photo-placeholder">место для фото</div>`;

  const sourceBlock = recipe.source_url
    ? `<a href="${rcEscapeHtml(recipe.source_url)}" target="_blank" rel="noopener">${rcEscapeHtml(recipe.source_url)}</a>`
    : '';

  return `
<div class="recipe-card" style="--rc-bg:${bg};--rc-table-bg:${tableBg};--rc-step-bg:${stepBg}" data-recipe-id="${rcEscapeHtml(recipe.id ?? '')}" data-category="${rcEscapeHtml(categoryKey)}">
  <div class="recipe-card__table">

    <div class="recipe-card__left">
      <div class="recipe-card__ingredients">
        <div class="recipe-card__section-title"><span>ингредиенты</span></div>
        <div class="recipe-card__ingredients-list">${ingredientRows}</div>
      </div>
      <div class="recipe-card__notes-wrap">
        <div class="recipe-card__notes">
          <div class="recipe-card__notes-title">notes</div>
          <div class="recipe-card__notes-text">${rcEscapeHtml(recipe.additional_info)}</div>
        </div>
      </div>
    </div>

    <div class="recipe-card__right">
      <div class="recipe-card__header">
        <div class="recipe-card__title">${rcEscapeHtml(recipe.name)}</div>
        <span class="recipe-card__fav">${recipe.is_favorite ? '💚' : ''}</span>
      </div>

      <div class="recipe-card__meta">
        <div class="recipe-card__meta-cell">
          <span class="recipe-card__meta-emoji">${emoji}</span>
          <span class="recipe-card__meta-category">${rcEscapeHtml(recipe.category)}</span>
        </div>
        <div class="recipe-card__meta-cell">
          <span class="recipe-card__meta-value">${recipe.time_minutes ? rcEscapeHtml(recipe.time_minutes) + ' мин' : ''}</span>
          <span class="recipe-card__meta-label">время</span>
        </div>
        <div class="recipe-card__meta-cell">
          <span class="recipe-card__meta-value">${recipe.portions ? rcEscapeHtml(recipe.portions) : ''}</span>
          <span class="recipe-card__meta-label">порции</span>
        </div>
        <div class="recipe-card__meta-cell">
          <span class="recipe-card__meta-spice">${'🔥'.repeat(spice)}</span>
          <span class="recipe-card__meta-label">острота</span>
        </div>
      </div>

      <div class="recipe-card__body">
        <div class="recipe-card__photo">${photoBlock}</div>
        <div class="recipe-card__steps">
          <div class="recipe-card__steps-title"><span>способ приготовления</span></div>
          <div class="recipe-card__steps-text">${rcEscapeHtml(stepsText)}</div>
        </div>
      </div>
    </div>

    <div class="recipe-card__footer-source">
      <span class="recipe-card__footer-source-label">источник</span>
      ${sourceBlock}
    </div>
    <div class="recipe-card__footer-bon"><span>приятного аппетита!</span></div>

  </div>
</div>`;
}

/** Строит DOM-узел карточки рецепта. */
function renderRecipeCard(recipe) {
  const wrap = document.createElement('div');
  wrap.innerHTML = recipeCardHTML(recipe);
  return wrap.firstElementChild;
}
