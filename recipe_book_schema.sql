-- Create recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('breakfast', 'main', 'dessert', 'salad', 'beverage', 'other')),
  time_minutes INTEGER NOT NULL,
  spiciness INTEGER NOT NULL CHECK (spiciness >= 0 AND spiciness <= 3),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('★☆☆', '★★☆', '★★★')),
  ingredients JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  additional_info TEXT,
  photo_url TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
CREATE POLICY "Allow public read access" ON recipes
  FOR SELECT USING (true);

-- Policy: Allow insert/update/delete only with correct password (client-side validation)
-- Note: Password validation happens on frontend - Supabase RLS just allows the operations
CREATE POLICY "Allow all writes (password protected on frontend)" ON recipes
  FOR ALL USING (true) WITH CHECK (true);

-- Create index on category for faster filtering
CREATE INDEX idx_recipes_category ON recipes(category);

-- Create index on created_at for sorting
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);
