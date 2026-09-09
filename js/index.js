/* ==========================================================================
   index.js — логика главной страницы: счётчик рецептов, последний
   добавленный рецепт со ссылкой на него в книге, кнопка "случайный рецепт".
   Подключается после config.js, db.js (использует getRecipes()).
   ========================================================================== */

const els = {
  count: document.getElementById('stat-count'),
  lastLink: document.getElementById('stat-last'),
  randomBtn: document.getElementById('random-btn'),
};

let allRecipes = [];

/** Ссылка на конкретный рецепт в книге — book.js откроет сразу его страницу. */
function recipeBookUrl(recipe) {
  return `book.html?recipe=${encodeURIComponent(recipe.id)}`;
}

function findLastAdded(recipes) {
  const withDates = recipes.filter((r) => r.created_at);
  if (withDates.length) {
    return withDates.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b));
  }
  // если у старых записей нет created_at — берём последнюю в списке как разумный запасной вариант
  return recipes.length ? recipes[recipes.length - 1] : null;
}

async function init() {
  els.randomBtn.disabled = true;

  try {
    allRecipes = await getRecipes();

    els.count.textContent = String(allRecipes.length);

    const last = findLastAdded(allRecipes);
    if (last) {
      els.lastLink.textContent = last.name || '(без названия)';
      els.lastLink.href = recipeBookUrl(last);
    } else {
      els.lastLink.textContent = 'пока нет';
      els.lastLink.href = 'book.html';
    }

    els.randomBtn.disabled = allRecipes.length === 0;
  } catch (err) {
    console.error(err);
    els.count.textContent = '—';
    els.lastLink.textContent = 'ошибка загрузки';
    els.lastLink.removeAttribute('href');
  }
}

els.randomBtn.addEventListener('click', () => {
  if (!allRecipes.length) return;
  const pick = allRecipes[Math.floor(Math.random() * allRecipes.length)];
  window.location.href = recipeBookUrl(pick);
});

init();
