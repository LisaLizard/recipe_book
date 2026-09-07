# Книга рецептов — что в архиве и как запустить

## Структура файлов
```
index.html          — главная страница
book.html           — /book, книга рецептов
admin.html          — /admin, добавление/редактирование
css/
  main.css          — общие стили сайта, навигация, форма
  recipe-card.css   — стили самой карточки рецепта
js/
  config.js         — URL и ключ Supabase, пароль админки  ← ЗАПОЛНИТЬ
  db.js             — функции чтения/записи в таблицу recipes
  recipe-card.js    — сборка HTML карточки рецепта из данных
  book.js           — логика страницы /book (фильтр, оглавление)
  admin.js          — логика /admin (форма, список, превью)
```

## Шаг 1. Supabase: таблица `recipes`

Откройте свой проект → SQL Editor → вставьте и выполните:

```sql
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'завтрак',
  time_minutes int,
  portions int,
  spiciness int default 0,
  difficulty text,
  ingredients jsonb default '[]',
  steps jsonb default '[]',
  additional_info text,
  source_url text,
  photo_url text,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- если таблица recipes у вас уже была раньше без этих колонок:
alter table recipes add column if not exists portions int;
alter table recipes add column if not exists source_url text;

-- Row Level Security: по умолчанию Supabase включает RLS и без политик
-- анонимный ключ вообще ничего не увидит. Разрешаем чтение всем
-- и запись всем (у сайта только "клиентский" пароль в админке, см. ниже).
alter table recipes enable row level security;

create policy "public read recipes" on recipes
  for select using (true);

create policy "public write recipes" on recipes
  for insert with check (true);

create policy "public update recipes" on recipes
  for update using (true);

create policy "public delete recipes" on recipes
  for delete using (true);
```

⚠️ **Важно про пароль в админке.** `ADMIN_PASSWORD` в `config.js` — это
проверка только в браузере, "чтобы случайный человек не полез
редактировать книгу". Она **не защищает данные** сами по себе: у кого
угодно, кто откроет исходники сайта, будет и ваш anon key, и адрес
таблицы, и (по политикам выше) право писать в неё напрямую через API
Supabase, минуя админку и пароль. Для семейного/личного проекта это
обычно ок, но не храните так ничего чувствительного. Если захотите
настоящую защиту — понадобится Supabase Auth вместо клиентского пароля,
это отдельная задача.

## Шаг 2. Supabase: хранилище фото

Storage → New bucket → имя `recipe-photos` → **Public bucket: да**.

Затем в SQL Editor:
```sql
create policy "public read photos" on storage.objects
  for select using (bucket_id = 'recipe-photos');

create policy "public upload photos" on storage.objects
  for insert with check (bucket_id = 'recipe-photos');
```

## Шаг 3. Заполнить config.js

Откройте `js/config.js`, вставьте:
- `SUPABASE_URL` — Project Settings → API → Project URL (уже подставлен ваш, проверьте)
- `SUPABASE_ANON_KEY` — Project Settings → API → anon public key

## Шаг 4. Проверить локально

Просто открыть `index.html` двойным кликом может не сработать из-за
ограничений браузера на `file://`. Проще запустить локальный сервер
в папке проекта:

```bash
python3 -m http.server 8000
```
и открыть `http://localhost:8000`.

Проверьте по очереди:
1. `/admin` → войти по паролю (`addnew` по умолчанию) → добавить тестовый рецепт → в превью справа должна сразу появиться карточка
2. `/book` → рецепт должен появиться, фильтр по категории должен его находить
3. Отредактировать и удалить рецепт из админки

## Шаг 5. Выложить на GitHub Pages

1. Залить все файлы в репозиторий (в корень, как они есть)
2. Settings → Pages → Source: Deploy from branch → branch `main`, папка `/root`
3. Через минуту сайт появится по адресу вида `https://<логин>.github.io/<репозиторий>/`

## Известные допущения (проверьте, устраивают ли)

- Категории в форме: завтрак / основное / супы / десерты / салаты / напитки / другое —
  это набор из присланного вами файла карточки; в более старых заметках
  проекта было 6 категорий без «супов» — уточните, нужны ли супы.
- Поле **difficulty** сохраняется в базе, но в самой карточке рецепта
  не отображается — в дизайне карточки для него нет ячейки.
- **portions** и **source_url** — новые колонки, их не было в изначальной
  схеме таблицы, добавлены SQL-скриптом выше.
