-- ================================================================
-- LANGERIE_RITA - RESET COMPLETO + CRIACAO DO ZERO
-- ================================================================
-- COPIA TUDO E COLA NO SQL EDITOR DO SUPABASE
-- ISSO VAI APAGAR TODOS OS DADOS E RECRIAR AS TABELAS
-- ================================================================

-- ================================================
-- PASSO 1: LIMPAR TUDO (DROP)
-- ================================================

-- Drop trigger primeiro
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS create_public_order(TEXT, TEXT, JSONB, TEXT, JSONB, NUMERIC) CASCADE;

-- Drop tables na ordem correta (respeitar foreign keys)
DROP TABLE IF EXISTS installments CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Limpar usuarios do auth (opcional - descomente se quiser)
-- DELETE FROM auth.users;

-- ================================================
-- PASSO 2: EXTENSOES
-- ================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- PASSO 3: TABELAS
-- ================================================

-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CUSTOMERS
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE products (
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

-- SALES
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'installment_1x', 'installment_2x', 'installment_3x')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SALE ITEMS
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INSTALLMENTS (PARCELAS)
CREATE TABLE installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EXPENSES (DESPESAS)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('fuel', 'bags', 'gifts', 'other')),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- APP SETTINGS (CONFIGURACOES)
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- PASSO 4: INDEXES
-- ================================================
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX idx_installments_sale_id ON installments(sale_id);
CREATE INDEX idx_installments_due_date ON installments(due_date);
CREATE INDEX idx_installments_is_paid ON installments(is_paid);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_products_is_archived ON products(is_archived);
CREATE INDEX idx_app_settings_key ON app_settings(key);

-- ================================================
-- PASSO 5: PERMISSOES (GRANT)
-- ================================================

-- Anon: so leitura em produtos e settings (vitrine publica)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.products TO anon;
GRANT SELECT ON TABLE public.app_settings TO anon;

-- Authenticated: acesso total (admin controla via RLS)
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.customers TO authenticated;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.sales TO authenticated;
GRANT ALL ON TABLE public.sale_items TO authenticated;
GRANT ALL ON TABLE public.installments TO authenticated;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.app_settings TO authenticated;

-- ================================================
-- PASSO 6: ROW LEVEL SECURITY (RLS)
-- ================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Funcao helper: verificar se usuario e admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Allow profile creation on signup" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- PRODUCTS: Qualquer um ve produtos disponiveis, so admin modifica
CREATE POLICY "Anyone can view available products" ON products
  FOR SELECT USING ((is_available = true AND is_archived = false) OR is_admin());
CREATE POLICY "Admins can insert products" ON products
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update products" ON products
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete products" ON products
  FOR DELETE USING (is_admin());

-- CUSTOMERS: So admin
CREATE POLICY "Admins can view customers" ON customers
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert customers" ON customers
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update customers" ON customers
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete customers" ON customers
  FOR DELETE USING (is_admin());

-- SALES: So admin
CREATE POLICY "Admins can view sales" ON sales
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert sales" ON sales
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update sales" ON sales
  FOR UPDATE USING (is_admin());

-- SALE ITEMS: So admin
CREATE POLICY "Admins can view sale_items" ON sale_items
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert sale_items" ON sale_items
  FOR INSERT WITH CHECK (is_admin());

-- INSTALLMENTS: So admin
CREATE POLICY "Admins can view installments" ON installments
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert installments" ON installments
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update installments" ON installments
  FOR UPDATE USING (is_admin());

-- EXPENSES: So admin
CREATE POLICY "Admins can view expenses" ON expenses
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert expenses" ON expenses
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update expenses" ON expenses
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete expenses" ON expenses
  FOR DELETE USING (is_admin());

-- APP SETTINGS: Todos leem, so admin modifica
CREATE POLICY "Anyone can read settings" ON app_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert settings" ON app_settings
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update settings" ON app_settings
  FOR UPDATE USING (is_admin());

-- ================================================
-- PASSO 6: TRIGGER DE AUTO-CRIACAO DE PERFIL
-- ================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    'customer'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao criar perfil: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permissoes para o trigger funcionar
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================
-- PASSO 7: FUNCAO RPC PARA PEDIDOS PUBLICOS (VITRINE)
-- ================================================
CREATE OR REPLACE FUNCTION create_public_order(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_items JSONB,
  p_payment_method TEXT,
  p_installments JSONB,
  p_total_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_sale_id UUID;
  v_item JSONB;
  v_inst JSONB;
  v_product RECORD;
BEGIN
  -- 1. Buscar ou criar cliente pelo telefone
  SELECT id INTO v_customer_id
    FROM customers
    WHERE phone = p_customer_phone
    LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (name, phone)
      VALUES (p_customer_name, p_customer_phone)
      RETURNING id INTO v_customer_id;
  ELSE
    UPDATE customers SET name = p_customer_name WHERE id = v_customer_id;
  END IF;

  -- 2. Criar venda
  INSERT INTO sales (customer_id, total_amount, payment_method, status, notes)
    VALUES (
      v_customer_id,
      p_total_amount,
      p_payment_method,
      CASE WHEN p_payment_method = 'pix' THEN 'paid' ELSE 'pending' END,
      'Pedido via vitrine online'
    )
    RETURNING id INTO v_sale_id;

  -- 3. Criar itens da venda e atualizar estoque
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
      FROM products
      WHERE id = (v_item->>'product_id')::UUID;

    IF v_product IS NULL THEN
      RAISE EXCEPTION 'Produto nao encontrado: %', v_item->>'product_id';
    END IF;

    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, cost_price)
      VALUES (
        v_sale_id,
        v_product.id,
        (v_item->>'quantity')::INTEGER,
        v_product.sale_price,
        v_product.cost_price
      );

    UPDATE products
      SET stock_quantity = GREATEST(0, stock_quantity - (v_item->>'quantity')::INTEGER),
          is_available = GREATEST(0, stock_quantity - (v_item->>'quantity')::INTEGER) > 0,
          updated_at = NOW()
      WHERE id = v_product.id;
  END LOOP;

  -- 4. Criar parcelas
  FOR v_inst IN SELECT * FROM jsonb_array_elements(p_installments)
  LOOP
    INSERT INTO installments (sale_id, installment_number, amount, due_date, is_paid, paid_date)
      VALUES (
        v_sale_id,
        (v_inst->>'installment_number')::INTEGER,
        (v_inst->>'amount')::NUMERIC,
        (v_inst->>'due_date')::DATE,
        CASE WHEN p_payment_method = 'pix' THEN true ELSE false END,
        CASE WHEN p_payment_method = 'pix' THEN CURRENT_DATE ELSE NULL END
      );
  END LOOP;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'customer_id', v_customer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissao para usuarios anonimos e autenticados usarem a funcao
GRANT EXECUTE ON FUNCTION create_public_order TO anon;
GRANT EXECUTE ON FUNCTION create_public_order TO authenticated;

-- ================================================
-- PASSO 8: DADOS INICIAIS (SEED)
-- ================================================
INSERT INTO app_settings (key, value, label) VALUES
  ('pix_key', '', 'Chave Pix'),
  ('whatsapp_number', '', 'Numero WhatsApp'),
  ('merchant_name', 'LANGERIE DA RITA', 'Nome do Comerciante (Pix)'),
  ('merchant_city', 'SAO PAULO', 'Cidade (Pix)');

-- ================================================
-- PRONTO! Agora voce precisa:
-- 1. Criar o usuario admin no Authentication do Supabase
--    (Ex: RitaLangerie@app.interno com senha)
-- 2. Depois executar:
--    UPDATE profiles SET role = 'admin' WHERE email = 'ritalangerie@app.interno';
-- ================================================
