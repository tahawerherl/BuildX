-- BuildX Complete Real-time Supabase Schema

-- 1. Users Table (Sellers and Buyers)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL CHECK (role IN ('buyer', 'seller')),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL, -- Note: In production use Supabase Auth instead
    brand_name TEXT, -- Only for sellers
    address TEXT,
    city TEXT,
    cnic TEXT,
    bank_account TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    seller_id TEXT UNIQUE -- Friendly ID for seller dashboards
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id TEXT REFERENCES users(seller_id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL,
    sku TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    image2 TEXT,
    image3 TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    total NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL,
    service_fee NUMERIC,
    commission_fee NUMERIC, -- 10% of subtotal
    platform_fee NUMERIC,   -- Rs 20 fixed
    net_payout NUMERIC,     -- subtotal - commission_fee - platform_fee
    status TEXT DEFAULT 'Pending',
    items JSONB NOT NULL,
    shipping_address TEXT,
    phone TEXT,
    payment_method TEXT,
    cancelReason TEXT,
    cancelBy TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) temporarily off for smooth protoyping, OR just enable policies
-- For the sake of the immediate prototype migration without auth tokens, we will allow anonymous access.
-- WARNING: In production, configure exact RLS policies using Supabase Auth.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow anon insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update users" ON users FOR UPDATE USING (true);

CREATE POLICY "Allow anon read products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow anon insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update products" ON products FOR UPDATE USING (true);

CREATE POLICY "Allow anon read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow anon insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update orders" ON orders FOR UPDATE USING (true);

-- Enable Supabase Realtime for Dashboard syncing
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table products;
