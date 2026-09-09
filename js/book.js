/* ==========================================================================
   book.js — логика страницы /book.

   Книга — это последовательность "страниц" трёх типов:
     { type: 'cover' }                         — обложка (заглушка)
     { type: 'divider', category }              — разделитель категории
     { type: 'recipe', recipe }                 — карточка рецепта

   Показывается всегда ровно одна страница за раз (viewer), она
   масштабируется под доступное место, чтобы помещаться целиком без
   прокрутки. Слева — оглавление-аккордеон: клик по категории
   раскрывает список её рецептов и переключает книгу на разделитель
   этой категории; клик по рецепту в списке — открывает его страницу.

   Подключается после config.js, db.js, recipe-card.js, html2pdf.js.
   ========================================================================== */

const CATEGORY_ORDER = ['завтрак', 'основное', 'супы', 'десерты', 'салаты', 'напитки', 'другое'];

const CATEGORY_LABELS = {
  'завтрак': 'Завтрак',
  'основное': 'Основное',
  'супы': 'Супы',
  'десерты': 'Десерты',
  'салаты': 'Салаты',
  'напитки': 'Напитки',
  'другое': 'Другое',
};

let allRecipes = [];
let pages = [];        // построенная последовательность страниц книги
let currentIndex = 0;  // индекс текущей страницы в pages
let expandedCategory = null; // какая категория раскрыта/подсвечена в сайдбаре
let pdfBusy = false;

const els = {
  status: document.getElementById('book-status'),
  sidebar: document.getElementById('toc-categories'),
  viewerPage: document.getElementById('viewer-page'),
  prevBtn: document.getElementById('prev-page'),
  nextBtn: document.getElementById('next-page'),
  indicator: document.getElementById('page-indicator'),
  pdfBtn: document.getElementById('download-pdf-btn'),
};

function setStatus(text) {
  if (els.status) els.status.textContent = text;
}

function categoryKey(recipe) {
  return (recipe.category || '').toLowerCase().trim();
}

/** Категории из CATEGORY_ORDER, для которых есть хотя бы один рецепт. */
function categoriesPresent() {
  const set = new Set(allRecipes.map(categoryKey));
  return CATEGORY_ORDER.filter((cat) => set.has(cat));
}

/** Строит плоский список страниц: обложка → (разделитель + рецепты) на каждую категорию. */
function buildPages() {
  const list = [{ type: 'cover' }];
  categoriesPresent().forEach((cat) => {
    list.push({ type: 'divider', category: cat });
    allRecipes
      .filter((r) => categoryKey(r) === cat)
      .forEach((recipe) => list.push({ type: 'recipe', recipe }));
  });
  return list;
}

function findDividerIndex(cat) {
  return pages.findIndex((p) => p.type === 'divider' && p.category === cat);
}

function findRecipeIndex(id) {
  return pages.findIndex((p) => p.type === 'recipe' && String(p.recipe.id) === String(id));
}

/* -------------------------- рендер отдельных страниц -------------------------- */

function renderCoverHTML() {
  return `
    <div class="book-sheet book-sheet--cover">
      <div class="cover-emoji">🦎</div>
      <div class="cover-title">Книга рецептов<br>ящерицы</div>
      <div class="cover-hint">обложка — заглушка, дизайн будет позже</div>
    </div>`;
}

function renderDividerHTML(category) {
  const entry = RECIPE_CATEGORIES[category] || RECIPE_CATEGORIES[RECIPE_CARD_DEFAULT_CATEGORY];
  const [emoji, bg] = entry;
  const label = CATEGORY_LABELS[category] || category;
  return `
    <div class="book-sheet book-sheet--divider" style="--rc-bg:${bg}">
      <div class="divider-emoji">${emoji}</div>
      <div class="divider-title">${rcEscapeHtml(label)}</div>
    </div>`;
}

/** Возвращает DOM-узел страницы (не добавляя его никуда). */
function pageNode(page) {
  if (page.type === 'cover') {
    const wrap = document.createElement('div');
    wrap.innerHTML = renderCoverHTML();
    return wrap.firstElementChild;
  }
  if (page.type === 'divider') {
    const wrap = document.createElement('div');
    wrap.innerHTML = renderDividerHTML(page.category);
    return wrap.firstElementChild;
  }
  return renderRecipeCard(page.recipe);
}

/* -------------------------------- viewer -------------------------------- */

/** Масштабирует лист (794×1123) так, чтобы он целиком влезал в viewer-stage. */
function fitSheetToViewer(sheetEl) {
  const stage = document.querySelector('.viewer-stage');
  if (!stage || !sheetEl) return;

  const prevW = els.prevBtn.offsetWidth || 40;
  const nextW = els.nextBtn.offsetWidth || 40;
  const stageStyles = getComputedStyle(stage);
  const gapPx = parseFloat(stageStyles.gap || stageStyles.columnGap || '12') || 12;

  const availW = stage.clientWidth - prevW - nextW - gapPx * 2 - 4;
  const availH = stage.clientHeight - 4;

  const scale = Math.max(0.1, Math.min(availW / 794, availH / 1123, 1));

  sheetEl.style.transform = `scale(${scale})`;
  els.viewerPage.style.width = `${794 * scale}px`;
  els.viewerPage.style.height = `${1123 * scale}px`;
}

function renderCurrentPage() {
  const page = pages[currentIndex];
  if (!page) return;

  els.viewerPage.innerHTML = '';
  const node = pageNode(page);
  els.viewerPage.appendChild(node);
  fitSheetToViewer(node);

  els.prevBtn.disabled = currentIndex <= 0;
  els.nextBtn.disabled = currentIndex >= pages.length - 1;

  const label = page.type === 'cover'
    ? 'Обложка'
    : page.type === 'divider'
      ? (CATEGORY_LABELS[page.category] || page.category)
      : page.recipe.name;
  els.indicator.textContent = `${currentIndex + 1} / ${pages.length} · ${label}`;

  // подсветка в сайдбаре: держим текущую категорию раскрытой
  if (page.type === 'divider') {
    expandedCategory = page.category;
    renderSidebar();
  } else if (page.type === 'recipe') {
    expandedCategory = categoryKey(page.recipe);
    renderSidebar();
  }
}

function setCurrentPage(index) {
  if (index < 0 || index >= pages.length) return;
  currentIndex = index;
  renderCurrentPage();
}

/* -------------------------------- сайдбар -------------------------------- */

function renderSidebar() {
  const cats = categoriesPresent();

  if (cats.length === 0) {
    els.sidebar.innerHTML = '<p class="toc-empty">Рецептов пока нет.</p>';
    return;
  }

  const currentPage = pages[currentIndex];
  const currentRecipeId = currentPage && currentPage.type === 'recipe'
    ? String(currentPage.recipe.id)
    : null;

  els.sidebar.innerHTML = cats.map((cat) => {
    const entry = RECIPE_CATEGORIES[cat] || [];
    const emoji = entry[0] || '';
    const label = CATEGORY_LABELS[cat] || cat;
    const isOpen = expandedCategory === cat;
    const recipesInCat = allRecipes.filter((r) => categoryKey(r) === cat);

    const items = recipesInCat.map((r) => {
      const active = String(r.id) === currentRecipeId ? 'is-active' : '';
      return `<button class="toc-recipe-link ${active}" data-recipe-id="${r.id}">${rcEscapeHtml(r.name)}</button>`;
    }).join('') || '<span class="toc-empty">пока нет рецептов</span>';

    return `
      <div class="toc-category">
        <button class="toc-category-btn ${isOpen ? 'is-active' : ''}" data-category="${cat}">
          <span>${emoji} ${rcEscapeHtml(label)}</span>
          <span class="chevron">${isOpen ? '▾' : '▸'}</span>
        </button>
        <div class="toc-recipe-list" ${isOpen ? '' : 'hidden'}>${items}</div>
      </div>`;
  }).join('');

  els.sidebar.querySelectorAll('.toc-category-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category');
      expandedCategory = cat;
      const idx = findDividerIndex(cat);
      if (idx >= 0) setCurrentPage(idx); // renderSidebar() вызовется изнутри renderCurrentPage
    });
  });

  els.sidebar.querySelectorAll('.toc-recipe-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-recipe-id');
      const idx = findRecipeIndex(id);
      if (idx >= 0) setCurrentPage(idx);
    });
  });
}

/* -------------------------------- навигация -------------------------------- */

els.prevBtn.addEventListener('click', () => setCurrentPage(currentIndex - 1));
els.nextBtn.addEventListener('click', () => setCurrentPage(currentIndex + 1));

window.addEventListener('resize', () => {
  const sheetEl = els.viewerPage.firstElementChild;
  if (sheetEl) fitSheetToViewer(sheetEl);
});

/* -------------------------------- скачивание PDF -------------------------------- */

/**
 * Внешние фото (Pinterest и т.п.) обычно не отдают CORS-заголовки, поэтому
 * html2canvas не может включить их в холст напрямую. Прогоняем такие ссылки
 * через публичный прокси-сервис изображений, который отдаёт их уже с
 * разрешающими CORS-заголовками. Используется только при экспорте в PDF —
 * на обычном просмотре книги фото показываются по прямой ссылке.
 */
function corsProxied(url) {
  if (!/^https?:\/\//i.test(url)) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}

/** Ждёт загрузки всех <img> внутри узла (успешной или с ошибкой). */
function waitForImages(node) {
  const imgs = Array.from(node.querySelectorAll('img'));
  return Promise.all(imgs.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));
}

async function handleDownloadPdf() {
  if (pdfBusy || !pages.length) return;

  if (typeof window.html2canvas !== 'function' || !window.jspdf || !window.jspdf.jsPDF) {
    window.alert('Библиотека для PDF ещё не загрузилась. Обновите страницу и попробуйте снова.');
    return;
  }

  pdfBusy = true;
  const originalLabel = els.pdfBtn.textContent;
  els.pdfBtn.disabled = true;

  // Контейнер для рендера должен реально находиться на экране в обычных
  // (положительных) координатах — иначе html2canvas у части браузеров/версий
  // обрезает его при захвате и отдаёт пустой холст. Поэтому прячем его не
  // сдвигом в минус, а полноэкранной "шторкой" поверх (см. .pdf-export-overlay).
  const overlay = document.createElement('div');
  overlay.className = 'pdf-export-overlay';
  document.body.appendChild(overlay);

  const stage = document.createElement('div');
  stage.className = 'pdf-export-root';
  document.body.appendChild(stage);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();

  try {
    for (let i = 0; i < pages.length; i += 1) {
      overlay.textContent = `Собираю PDF… страница ${i + 1} из ${pages.length}`;

      stage.innerHTML = '';
      const node = pageNode(pages[i]);

      // подменяем ссылки на фото на CORS-safe прокси перед показом на странице
      node.querySelectorAll('img').forEach((img) => {
        const original = img.getAttribute('src');
        if (original) {
          img.crossOrigin = 'anonymous';
          img.src = corsProxied(original);
        }
      });

      stage.appendChild(node);

      // ждём реальной загрузки фото + один кадр на отрисовку остального
      // eslint-disable-next-line no-await-in-loop
      await waitForImages(node);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // eslint-disable-next-line no-await-in-loop
      const canvas = await window.html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, pageHeightMm);
    }

    pdf.save('kniga-receptov-yashcheritsy.pdf');
  } catch (err) {
    console.error(err);
    window.alert('Не удалось собрать PDF. Попробуйте ещё раз.');
  } finally {
    document.body.removeChild(stage);
    document.body.removeChild(overlay);
    pdfBusy = false;
    els.pdfBtn.textContent = originalLabel;
    els.pdfBtn.disabled = false;
  }
}

els.pdfBtn.addEventListener('click', handleDownloadPdf);

/* -------------------------------- инициализация -------------------------------- */

async function init() {
  setStatus('Загружаю рецепты…');
  try {
    allRecipes = await getRecipes();
    setStatus(allRecipes.length ? '' : 'Рецептов пока нет — добавьте их в /admin.');
    pages = buildPages();
    currentIndex = 0;
    renderSidebar();
    renderCurrentPage();
  } catch (err) {
    console.error(err);
    setStatus('Не удалось загрузить рецепты. Проверьте SUPABASE_URL и ANON_KEY в config.js.');
  }
}

init();
