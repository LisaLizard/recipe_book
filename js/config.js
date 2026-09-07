/* ==========================================================================
   config.js — подключение к Supabase.

   Вставьте сюда свои реальные значения из Supabase:
   Project Settings → API → Project URL / anon public key.

   ВАЖНО: anon key — публичный ключ, его можно коммитить в открытый
   репозиторий (доступ к данным всё равно регулируется правилами RLS
   в Supabase), но сам URL/ключ должны быть настоящими, иначе сайт
   не подключится к базе.
   ========================================================================== */

const SUPABASE_URL = 'https://fzpmgiktmogsvalxdjrb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6cG1naWt0bW9nc3ZhbHhkanJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MDE2NzYsImV4cCI6MjEwMzk3NzY3Nn0.DOo7Cfu0aVWtQjh_xRCFUDSqNqhv4Jtb9h-KG1YY8yE';

// supabase-js подключается через CDN (см. <script> в HTML-страницах)
// и создаёт глобальный объект window.supabase.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Название бакета в Supabase Storage для фото рецептов.
// Создайте его вручную: Storage → New bucket → "recipe-photos" (Public bucket: да).
const PHOTO_BUCKET = 'recipe-photos';

// Простой пароль для входа в админку (сравнение на клиенте — не бронебойная
// защита, но достаточно, чтобы случайный посетитель не редактировал книгу).
const ADMIN_PASSWORD = 'addnew';
