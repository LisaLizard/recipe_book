/* ==========================================================================
   book.js — логика страницы /book: загрузка рецептов из Supabase,
   фильтр по категориям, оглавление, рендер карточек.
   Подключается после config.js, db.js, recipe-card.js.
   ========================================================================== */

const CATEGORY_ORDER = ['завтрак', 'основное', 'супы', 'десерты', 'салаты', 'напитки', 'другое'];

let allRecipes = [];
let activeCategory = 'все';

const els = {
  status: document.getElementById('book-status'),
  filters: document.getElementById('category-filters'),
  toc: document.getElementById('toc'),
  content: document.getElementById('book-content'),
};

function setStatus(text) {
  if (els.status) els.status.textContent = text;
}

function categoriesPresent() {
  const set = new Set(allRecipes.map((r) => (r.category || '').toLowerCase().trim()));
  return CATEGORY_ORDER.filter((c) => set.has(c));
}

function renderFilters() {
  const cats = ['все', ...categoriesPresent()];
  els.filters.innerHTML = cats.map((cat) => {
    const emoji = cat === 'все' ? '📖' : (RECIPE_CATEGORIES[cat] || [])[0] || '';
    const active = cat === activeCategory ? 'is-active' : '';
    return `<button class="filter-btn ${active}" data-category="${cat}">${emoji} ${cat}</button>`;
  }).join('');

  els.filters.querySelectorAll('[data-category]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.getAttribute('data-category');
      renderFilters();
      renderBook();
    });
  });
}

function renderToc(visibleRecipes) {
  if (!els.toc) return;
  els.toc.innerHTML = visibleRecipes.map((r) =>
    `<li><a href="#recipe-${r.id}">${r.name}</a></li>`
  ).join('');
}

function renderBook() {
  const visible = activeCategory === 'все'
    ? allRecipes
    : allRecipes.filter((r) => (r.category || '').toLowerCase().trim() === activeCategory);

  renderToc(visible);

  els.content.innerHTML = '';
  if (visible.length === 0) {
    els.content.innerHTML = '<p class="empty-state">В этой категории пока нет рецептов.</p>';
    return;
  }

  visible.forEach((recipe) => {
    const page = document.createElement('div');
    page.className = 'book-page';
    page.id = `recipe-${recipe.id}`;
    page.appendChild(renderRecipeCard(recipe));
    els.content.appendChild(page);
  });
}

async function init() {
  setStatus('Загружаю рецепты…');
  try {
    allRecipes = await getRecipes();
    setStatus(allRecipes.length ? '' : 'Рецептов пока нет — добавьте их в /admin.');
    renderFilters();
    renderBook();
  } catch (err) {
    console.error(err);
    setStatus('Не удалось загрузить рецепты. Проверьте SUPABASE_URL и ANON_KEY в config.js.');
  }
}

init();
