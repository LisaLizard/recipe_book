// =========================================
// RECIPE BOOK - CONFIG
// =========================================

// Supabase configuration
// TODO: Замени на свои значения из Supabase Dashboard
// Settings → API → Project URL и anon public
export const SUPABASE_CONFIG = {
  URL:'https://fzpmgiktmogsvalxdjrb.supabase.co',
  ANON_KEY:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6cG1naWt0bW9nc3ZhbHhkanJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MDE2NzYsImV4cCI6MjEwMzk3NzY3Nn0.DOo7Cfu0aVWtQjh_xRCFUDSqNqhv4Jtb9h-KG1YY8yE'};

// Admin password
export const ADMIN_PASSWORD = 'addnew';

// Category configuration
export const CATEGORIES = {
  breakfast: {
    name: 'Завтрак',
    emoji: '🥐',
    color: '#FFF8DC'
  },
  main: {
    name: 'Основное',
    emoji: '🍲',
    color: '#B0E0E6'
  },
  dessert: {
    name: 'Десерт',
    emoji: '🍰',
    color: '#FFB6D9'
  },
  salad: {
    name: 'Салат',
    emoji: '🥗',
    color: '#C1FFC1'
  },
  beverage: {
    name: 'Напиток',
    emoji: '🍵',
    color: '#F5DEB3'
  },
  other: {
    name: 'Другое',
    emoji: '🌿',
    color: '#FFD4A3'
  }
};

// Difficulty levels
export const DIFFICULTIES = ['★☆☆', '★★☆', '★★★'];

// Spice levels
export const SPICE_LEVELS = [
  { level: 0, label: 'Не острая' },
  { level: 1, label: '🔥' },
  { level: 2, label: '🔥🔥' },
  { level: 3, label: '🔥🔥🔥' }
];
