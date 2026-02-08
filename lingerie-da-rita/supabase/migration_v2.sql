-- ================================================
-- Lingerie da Rita - Migration V2 (incremental)
-- Run this if you already ran the first migration
-- ================================================

-- 1. Add new columns to products
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_archived') THEN
    ALTER TABLE products ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'min_stock_alert') THEN
    ALTER TABLE products ADD COLUMN min_stock_alert INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. New indexes
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON products(is_archived);

-- 3. Update products RLS policy to include is_archived filter
DROP POLICY IF EXISTS "Anyone can view available products" ON products;
CREATE POLICY "Anyone can view available products" ON products
  FOR SELECT USING ((is_available = true AND is_archived = false) OR is_admin());

-- 4. App Settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- 5. App Settings RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read settings" ON app_settings;
CREATE POLICY "Anyone can read settings" ON app_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert settings" ON app_settings;
CREATE POLICY "Admins can insert settings" ON app_settings
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update settings" ON app_settings;
CREATE POLICY "Admins can update settings" ON app_settings
  FOR UPDATE USING (is_admin());

-- 6. Seed default settings
INSERT INTO app_settings (key, value, label) VALUES
  ('pix_key', '', 'Chave Pix'),
  ('whatsapp_number', '', 'Numero WhatsApp'),
  ('merchant_name', 'LINGERIE DA RITA', 'Nome do Comerciante (Pix)'),
  ('merchant_city', 'SAO PAULO', 'Cidade (Pix)')
ON CONFLICT (key) DO NOTHING;
