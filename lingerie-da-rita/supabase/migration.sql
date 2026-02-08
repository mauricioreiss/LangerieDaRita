-- ================================================
-- Lingerie da Rita - Supabase Database Migration
-- Execute this SQL in Supabase SQL Editor
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- PROFILES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- CUSTOMERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- PRODUCTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  size TEXT NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 1,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  min_stock_alert INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns if running on existing database (safe to re-run)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_archived') THEN
    ALTER TABLE products ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'min_stock_alert') THEN
    ALTER TABLE products ADD COLUMN min_stock_alert INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ================================================
-- SALES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'installment_1x', 'installment_2x', 'installment_3x')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- SALE ITEMS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- INSTALLMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- EXPENSES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('fuel', 'bags', 'gifts', 'other')),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- APP SETTINGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- INDEXES for performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_installments_sale_id ON installments(sale_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_is_paid ON installments(is_paid);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON products(is_archived);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES: Users can read own profile, admins can read all
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Allow profile creation on signup" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- PRODUCTS: Everyone can read available products, only admins can modify
CREATE POLICY "Anyone can view available products" ON products
  FOR SELECT USING (is_available = true AND is_archived = false OR is_admin());

CREATE POLICY "Admins can insert products" ON products
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update products" ON products
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete products" ON products
  FOR DELETE USING (is_admin());

-- CUSTOMERS: Only admins can manage customers
CREATE POLICY "Admins can view customers" ON customers
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert customers" ON customers
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update customers" ON customers
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete customers" ON customers
  FOR DELETE USING (is_admin());

-- SALES: Only admins
CREATE POLICY "Admins can view sales" ON sales
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert sales" ON sales
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update sales" ON sales
  FOR UPDATE USING (is_admin());

-- SALE ITEMS: Only admins
CREATE POLICY "Admins can view sale_items" ON sale_items
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert sale_items" ON sale_items
  FOR INSERT WITH CHECK (is_admin());

-- INSTALLMENTS: Only admins
CREATE POLICY "Admins can view installments" ON installments
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert installments" ON installments
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update installments" ON installments
  FOR UPDATE USING (is_admin());

-- EXPENSES: Only admins
CREATE POLICY "Admins can view expenses" ON expenses
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert expenses" ON expenses
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update expenses" ON expenses
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete expenses" ON expenses
  FOR DELETE USING (is_admin());

-- APP SETTINGS: Everyone can read, only admins can modify
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON app_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert settings" ON app_settings
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update settings" ON app_settings
  FOR UPDATE USING (is_admin());

-- ================================================
-- AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- ================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================
-- SEED: Create admin user after signup
-- Run this AFTER creating the admin user via Supabase Auth:
-- UPDATE profiles SET role = 'admin' WHERE email = 'rita@email.com';
-- ================================================

-- ================================================
-- SEED: Default App Settings
-- ================================================
INSERT INTO app_settings (key, value, label) VALUES
  ('pix_key', '', 'Chave Pix'),
  ('whatsapp_number', '', 'Numero WhatsApp'),
  ('merchant_name', 'LINGERIE DA RITA', 'Nome do Comerciante (Pix)'),
  ('merchant_city', 'SAO PAULO', 'Cidade (Pix)')
ON CONFLICT (key) DO NOTHING;
