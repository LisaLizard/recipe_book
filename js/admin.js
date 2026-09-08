/* ==========================================================================
   admin.js — логика /admin: вход по паролю, форма добавления/редактирования
   рецепта, список рецептов, живое превью карточки.
   Подключается после config.js, db.js, recipe-card.js.
   ========================================================================== */

let recipesCache = [];
let editingId = null; // null = создаём новый рецепт

const els = {
  gate: document.getElementById('admin-gate'),
  gateForm: document.getElementById('admin-gate-form'),
  gateInput: document.getElementById('admin-gate-password'),
  gateError: document.getElementById('admin-gate-error'),
  app: document.getElementById('admin-app'),

  list: document.getElementById('admin-recipe-list'),
  newBtn: document.getElementById('admin-new-btn'),

  form: document.getElementById('recipe-form'),
  formTitle: document.getElementById('form-title'),
  deleteBtn: document.getElementById('admin-delete-btn'),
  status: document.getElementById('admin-status'),

  ingredientsList: document.getElementById('ingredients-list'),
  addIngredientBtn: document.getElementById('add-ingredient-btn'),
  stepsList: document.getElementById('steps-list'),
  addStepBtn: document.getElementById('add-step-btn'),

  photoUrlInput: document.getElementById('field-photo-url'),
  photoPreview: document.getElementById('photo-preview'),

  preview: document.getElementById('card-preview'),
};

/* ---------------------------- вход по паролю ---------------------------- */

els.gateForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (els.gateInput.value === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin-authed', '1');
    showApp();
  } else {
    els.gateError.textContent = 'Неверный пароль';
  }
});

function showApp() {
  els.gate.hidden = true;
  els.app.hidden = false;
  loadRecipes();
}

if (sessionStorage.getItem('admin-authed') === '1') {
  showApp();
}

/* ------------------------------ список рецептов ------------------------------ */

async function loadRecipes() {
  try {
    recipesCache = await getRecipes();
    renderList();
  } catch (err) {
    console.error(err);
    els.list.innerHTML = '<li class="error">Не удалось загрузить список рецептов</li>';
  }
}

function renderList() {
  if (recipesCache.length === 0) {
    els.list.innerHTML = '<li class="empty-state">Рецептов пока нет</li>';
    return;
  }
  els.list.innerHTML = recipesCache.map((r) => `
    <li>
      <button type="button" class="admin-list-item ${r.id === editingId ? 'is-active' : ''}" data-id="${r.id}">
        ${r.is_favorite ? '💚 ' : ''}${r.name || '(без названия)'}
        <span class="admin-list-item__category">${r.category || ''}</span>
      </button>
    </li>
  `).join('');

  els.list.querySelectorAll('[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => loadIntoForm(btn.getAttribute('data-id')));
  });
}

function loadIntoForm(id) {
  const recipe = recipesCache.find((r) => String(r.id) === String(id));
  if (!recipe) return;
  editingId = id;
  els.formTitle.textContent = 'Редактировать рецепт';
  els.deleteBtn.hidden = false;

  els.form.name.value = recipe.name || '';
  els.form.category.value = recipe.category || 'завтрак';
  els.form.time_minutes.value = recipe.time_minutes || '';
  els.form.portions.value = recipe.portions || '';
  els.form.spiciness.value = recipe.spiciness ?? 0;
  els.form.is_favorite.checked = !!recipe.is_favorite;
  els.form.additional_info.value = recipe.additional_info || '';
  els.form.source_url.value = recipe.source_url || '';

  setIngredientRows(Array.isArray(recipe.ingredients) ? recipe.ingredients : []);
  setStepRows(Array.isArray(recipe.steps) ? recipe.steps : (recipe.steps ? [recipe.steps] : []));

  els.photoUrlInput.value = recipe.photo_url || '';
  els.photoPreview.src = recipe.photo_url || '';
  els.photoPreview.hidden = !recipe.photo_url;

  renderList();
  updatePreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

els.newBtn.addEventListener('click', () => resetForm());

function resetForm() {
  editingId = null;
  els.formTitle.textContent = 'Новый рецепт';
  els.deleteBtn.hidden = true;
  els.form.reset();
  els.form.spiciness.value = 0;
  setIngredientRows([]);
  setStepRows([]);
  els.photoPreview.hidden = true;
  els.photoPreview.src = '';
  renderList();
  updatePreview();
}

/* ------------------------------ ингредиенты ------------------------------ */

function ingredientRowHTML(qty = '', name = '') {
  return `
    <div class="dynamic-row">
      <input type="text" class="ingredient-qty" placeholder="600 г" value="${qty}">
      <input type="text" class="ingredient-name" placeholder="баттернат" value="${name}">
      <button type="button" class="remove-row-btn" aria-label="Удалить">✕</button>
    </div>`;
}

function setIngredientRows(ingredients) {
  const rows = ingredients.length ? ingredients : [{ qty: '', name: '' }];
  els.ingredientsList.innerHTML = rows.map((i) => ingredientRowHTML(i.qty, i.name)).join('');
  bindDynamicRowRemovers(els.ingredientsList);
}

els.addIngredientBtn.addEventListener('click', () => {
  els.ingredientsList.insertAdjacentHTML('beforeend', ingredientRowHTML());
  bindDynamicRowRemovers(els.ingredientsList);
});

function getIngredientsFromForm() {
  return Array.from(els.ingredientsList.querySelectorAll('.dynamic-row'))
    .map((row) => ({
      qty: row.querySelector('.ingredient-qty').value.trim(),
      name: row.querySelector('.ingredient-name').value.trim(),
    }))
    .filter((i) => i.qty || i.name);
}

/* -------------------------------- шаги -------------------------------- */

function stepRowHTML(text = '') {
  return `
    <div class="dynamic-row">
      <textarea class="step-text" rows="2" placeholder="разогреть духовку до 180°">${text}</textarea>
      <button type="button" class="remove-row-btn" aria-label="Удалить">✕</button>
    </div>`;
}

function setStepRows(steps) {
  const rows = steps.length ? steps : [''];
  els.stepsList.innerHTML = rows.map(stepRowHTML).join('');
  bindDynamicRowRemovers(els.stepsList);
}

els.addStepBtn.addEventListener('click', () => {
  els.stepsList.insertAdjacentHTML('beforeend', stepRowHTML());
  bindDynamicRowRemovers(els.stepsList);
});

function getStepsFromForm() {
  return Array.from(els.stepsList.querySelectorAll('.step-text'))
    .map((t) => t.value.trim())
    .filter(Boolean);
}

function bindDynamicRowRemovers(container) {
  container.querySelectorAll('.remove-row-btn').forEach((btn) => {
    btn.onclick = () => {
      btn.closest('.dynamic-row').remove();
      updatePreview();
    };
  });
  container.querySelectorAll('input, textarea').forEach((el) => {
    el.oninput = updatePreview;
  });
}

/* -------------------------------- фото (ссылка) -------------------------------- */

els.photoUrlInput.addEventListener('input', () => {
  const url = els.photoUrlInput.value.trim();
  els.photoPreview.src = url;
  els.photoPreview.hidden = !url;
  updatePreview();
});

els.photoPreview.addEventListener('error', () => {
  els.photoPreview.hidden = true;
});

/* ------------------------------ живое превью ------------------------------ */

function collectFormData() {
  const fd = new FormData(els.form);
  return {
    name: fd.get('name') || '',
    category: fd.get('category') || 'завтрак',
    time_minutes: fd.get('time_minutes') ? Number(fd.get('time_minutes')) : null,
    portions: fd.get('portions') ? Number(fd.get('portions')) : null,
    spiciness: Number(fd.get('spiciness') || 0),
    is_favorite: fd.get('is_favorite') === 'on',
    additional_info: fd.get('additional_info') || '',
    source_url: fd.get('source_url') || '',
    ingredients: getIngredientsFromForm(),
    steps: getStepsFromForm(),
    photo_url: (fd.get('photo_url') || '').trim(),
  };
}

function updatePreview() {
  const data = collectFormData();
  els.preview.innerHTML = '';
  els.preview.appendChild(renderRecipeCard(data));
}

els.form.addEventListener('input', updatePreview);

/* -------------------------------- сохранение -------------------------------- */

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('Сохраняю…');

  try {
    const data = collectFormData();

    if (editingId) {
      await updateRecipe(editingId, data);
      setStatus('Сохранено ✓');
    } else {
      const created = await addRecipe(data);
      editingId = created.id;
      setStatus('Рецепт добавлен ✓');
    }

    await loadRecipes();
  } catch (err) {
    console.error(err);
    setStatus('Ошибка сохранения: ' + (err.message || err));
  }
});

els.deleteBtn.addEventListener('click', async () => {
  if (!editingId) return;
  if (!confirm('Удалить этот рецепт?')) return;
  try {
    await deleteRecipe(editingId);
    resetForm();
    await loadRecipes();
  } catch (err) {
    console.error(err);
    setStatus('Ошибка удаления: ' + (err.message || err));
  }
});

function setStatus(text) {
  els.status.textContent = text;
  if (text) setTimeout(() => { if (els.status.textContent === text) els.status.textContent = ''; }, 4000);
}

/* -------------------------------- инициализация -------------------------------- */

resetForm();
