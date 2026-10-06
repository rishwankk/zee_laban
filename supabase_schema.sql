-- Supabase Schema for Zee Laban POS System

-- 1. System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 2. Stores
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_mobile TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    owner_password TEXT NOT NULL,
    location TEXT NOT NULL,
    pincode TEXT NOT NULL,
    upi_id TEXT,
    gst_number TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Users (Admins and Cashiers)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    store_id TEXT REFERENCES public.stores(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Products
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL,
    gst_rate NUMERIC NOT NULL,
    gst_inclusive BOOLEAN DEFAULT false,
    description TEXT,
    image_url TEXT,
    price_locked BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Staff
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL,
    joining_date TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Staff Advances
CREATE TABLE IF NOT EXISTS public.staff_advances (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES public.staff(id),
    store_id TEXT REFERENCES public.stores(id),
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Shift Logs
CREATE TABLE IF NOT EXISTS public.shift_logs (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES public.staff(id),
    store_id TEXT REFERENCES public.stores(id),
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    duration_minutes NUMERIC,
    corrected_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Stock
CREATE TABLE IF NOT EXISTS public.stock (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id),
    product_id TEXT REFERENCES public.products(id),
    quantity NUMERIC NOT NULL,
    status TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- 10. Stock Logs
CREATE TABLE IF NOT EXISTS public.stock_logs (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id),
    product_id TEXT REFERENCES public.products(id),
    old_status TEXT,
    new_status TEXT NOT NULL,
    old_quantity NUMERIC,
    new_quantity NUMERIC NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. Bills
CREATE TABLE IF NOT EXISTS public.bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT NOT NULL,
    store_id TEXT REFERENCES public.stores(id),
    cashier_id TEXT,
    customer_name TEXT,
    customer_mobile TEXT,
    subtotal NUMERIC NOT NULL,
    cgst NUMERIC NOT NULL,
    sgst NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    order_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. Bill Items
CREATE TABLE IF NOT EXISTS public.bill_items (
    id TEXT PRIMARY KEY,
    bill_id TEXT REFERENCES public.bills(id),
    product_id TEXT REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL
);

-- Seed Initial Admin User & Settings
INSERT INTO public.system_settings (key, value) VALUES 
('admin_email', 'admin@laban.com'),
('admin_password', 'admin123')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.users (id, name, email, role) VALUES 
('usr-001', '(Super Admin)', 'admin@laban.com', 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, name) VALUES 
('cat-001', 'Laban'),
('cat-002', 'Drinks'),
('cat-003', 'Sweets'),
('cat-004', 'Add-ons')
ON CONFLICT (id) DO NOTHING;
