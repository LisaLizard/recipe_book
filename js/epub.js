/* ==========================================================================
   epub.js — экспорт книги в EPUB (фиксированная вёрстка, EPUB 3).

   Переиспользует те же HTML-генераторы, что и весь остальной сайт:
   renderCoverHTML() / renderDividerHTML() (из book.js) и recipeCardHTML()
   (из recipe-card.js) — поэтому визуально страницы EPUB совпадают со
   страницами книги и PDF. Подключать после recipe-card.js и book.js
   (использует их глобальные функции/переменные) и после JSZip.

   Ограничение: шрифты (Jost/Playfair Display/…) подключены онлайн-ссылкой
   на Google Fonts, как и на сайте — если читалка открывает EPUB без
   интернета, она покажет книгу системным шрифтом-заменителем. Полное
   встраивание файлов шрифтов внутрь EPUB — отдельная доработка на будущее.
   ========================================================================== */

const EPUB_PAGE_W = 794;
const EPUB_PAGE_H = 1123;

function epubPad(n, width) {
  return String(n).padStart(width, '0');
}

/** Скачивает фото через тот же CORS-прокси, что и PDF-экспорт, возвращает байты. */
async function epubFetchImage(url) {
  const proxied = corsProxied(url);
  const res = await fetch(proxied);
  if (!res.ok) throw new Error(`HTTP ${res.status} при загрузке ${url}`);
  const blob = await res.blob();
  const mime = blob.type || 'image/jpeg';
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const bytes = await blob.arrayBuffer();
  return { bytes, ext, mime };
}

function epubPageXhtml(bodyHtml, title) {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
<meta charset="utf-8"/>
<title>${rcEscapeHtml(title)}</title>
<meta name="viewport" content="width=${EPUB_PAGE_W}, height=${EPUB_PAGE_H}"/>
<link rel="stylesheet" type="text/css" href="../css/style.css"/>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

async function generateEpub() {
  const btn = document.getElementById('download-epub-btn');
  if (!btn || btn.disabled) return;

  if (typeof window.JSZip !== 'function' || !pages.length) {
    window.alert('Библиотека для EPUB ещё не загрузилась. Обновите страницу и попробуйте снова.');
    return;
  }

  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';

  const overlay = document.createElement('div');
  overlay.className = 'pdf-export-overlay';
  overlay.textContent = 'Собираю EPUB…';
  document.body.appendChild(overlay);

  try {
    const zip = new window.JSZip();

    // mimetype обязательно первым файлом и без сжатия — так требует спецификация EPUB
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    const oebps = zip.folder('OEBPS');

    // общий CSS — переиспользуем реальные стили сайта (клетка, цвета категорий и т.д.)
    const [mainCss, cardCss] = await Promise.all([
      fetch('css/main.css').then((r) => r.text()),
      fetch('css/recipe-card.css').then((r) => r.text()),
    ]);
    const fontsImport = "@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Jost:wght@300;400;500;600;700&family=La+Belle+Aurore&family=Playfair+Display:wght@600;700&display=swap');\n";
    oebps.folder('css').file('style.css', fontsImport + mainCss + '\n' + cardCss);

    const manifestItems = [];
    const spineItems = [];
    const navPoints = [];
    let imgCounter = 0;
    const totalDigits = String(pages.length).length;

    for (let i = 0; i < pages.length; i += 1) {
      overlay.textContent = `Собираю EPUB… страница ${i + 1} из ${pages.length}`;
      const page = pages[i];
      const num = epubPad(i + 1, totalDigits);
      const pageId = `page-${num}`;
      const pageHref = `pages/page-${num}.xhtml`;

      let bodyHtml;
      let title;

      if (page.type === 'cover') {
        title = 'Обложка';
        bodyHtml = renderCoverHTML();
      } else if (page.type === 'divider') {
        title = CATEGORY_LABELS[page.category] || page.category;
        bodyHtml = renderDividerHTML(page.category);
      } else {
        title = page.recipe.name;
        let recipeForExport = page.recipe;

        if (page.recipe.photo_url) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const { bytes, ext, mime } = await epubFetchImage(page.recipe.photo_url);
            imgCounter += 1;
            const imgNum = epubPad(imgCounter, 4);
            const imgName = `img-${imgNum}.${ext}`;
            oebps.folder('images').file(imgName, bytes);
            manifestItems.push(`<item id="img-${imgNum}" href="images/${imgName}" media-type="${mime}"/>`);
            recipeForExport = { ...page.recipe, photo_url: `../images/${imgName}` };
          } catch (err) {
            console.warn('EPUB: не удалось встроить фото рецепта', page.recipe.name, err);
            recipeForExport = { ...page.recipe, photo_url: null };
          }
        }

        bodyHtml = recipeCardHTML(recipeForExport);
      }

      oebps.folder('pages').file(`page-${num}.xhtml`, epubPageXhtml(bodyHtml, title));
      manifestItems.push(`<item id="${pageId}" href="${pageHref}" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="${pageId}"/>`);

      if (page.type === 'cover' || page.type === 'divider') {
        navPoints.push({ href: pageHref, title, children: [] });
      } else if (navPoints.length) {
        navPoints[navPoints.length - 1].children.push({ href: pageHref, title });
      }
    }

    const navListHtml = navPoints.map((np) => {
      const children = np.children.length
        ? `<ol>${np.children.map((c) => `<li><a href="${c.href}">${rcEscapeHtml(c.title)}</a></li>`).join('')}</ol>`
        : '';
      return `<li><a href="${np.href}">${rcEscapeHtml(np.title)}</a>${children}</li>`;
    }).join('');

    oebps.file('nav.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><meta charset="utf-8"/><title>Содержание</title></head>
<body>
<nav epub:type="toc" id="toc">
<h1>Содержание</h1>
<ol>${navListHtml}</ol>
</nav>
</body>
</html>`);

    const bookId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-lizard-recipes`;
    const modified = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

    oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:${bookId}</dc:identifier>
    <dc:title>Книга рецептов ящерицы</dc:title>
    <dc:language>ru</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:orientation">portrait</meta>
    <meta property="rendition:spread">none</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="css/style.css" media-type="text/css"/>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine>
    ${spineItems.join('\n    ')}
  </spine>
</package>`);

    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kniga-receptov-yashcheritsy.epub';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    window.alert('Не удалось собрать EPUB. Попробуйте ещё раз.');
  } finally {
    document.body.removeChild(overlay);
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

const epubBtnEl = document.getElementById('download-epub-btn');
if (epubBtnEl) epubBtnEl.addEventListener('click', generateEpub);
