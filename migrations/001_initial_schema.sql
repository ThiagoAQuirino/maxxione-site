-- Enable extensions
create extension if not exists "uuid-ossp";

-- ─── CATEGORIES ───────────────────────────────────────────────────────────────
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  parent_id uuid references categories(id) on delete set null,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── PRODUCTS ─────────────────────────────────────────────────────────────────
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  description text,
  category_id uuid references categories(id) on delete set null,
  base_price decimal(10,2) not null,
  compare_price decimal(10,2),
  cost_price decimal(10,2),
  sku text unique,
  weight decimal(8,3),
  height decimal(8,2),
  width decimal(8,2),
  length decimal(8,2),
  active boolean default true,
  featured boolean default false,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── PRODUCT IMAGES ───────────────────────────────────────────────────────────
create table if not exists product_images (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ─── PRODUCT VARIANTS ─────────────────────────────────────────────────────────
create table if not exists product_variants (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade,
  size text,
  color text,
  color_hex text,
  sku text unique,
  price_override decimal(10,2),
  stock int default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  phone text,
  cpf text,
  avatar_url text,
  role text default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── ADDRESSES ────────────────────────────────────────────────────────────────
create table if not exists addresses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  recipient text not null,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- ─── COUPONS ──────────────────────────────────────────────────────────────────
create table if not exists coupons (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  type text not null check (type in ('percentage', 'fixed')),
  value decimal(10,2) not null,
  min_order_value decimal(10,2) default 0,
  max_uses int,
  used_count int default 0,
  expires_at timestamptz,
  active boolean default true,
  created_at timestamptz default now()
);

-- ─── ORDERS ───────────────────────────────────────────────────────────────────
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  order_number text unique not null,
  user_id uuid references profiles(id) on delete set null,
  guest_email text,
  guest_name text,
  status text default 'pending' check (status in ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
  subtotal decimal(10,2) not null,
  discount decimal(10,2) default 0,
  shipping_cost decimal(10,2) default 0,
  total decimal(10,2) not null,
  coupon_id uuid references coupons(id),
  shipping_address jsonb not null,
  shipping_method text,
  tracking_code text,
  payment_method text,
  payment_id text,
  payment_status text default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── ORDER ITEMS ──────────────────────────────────────────────────────────────
create table if not exists order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  product_name text not null,
  variant_description text,
  quantity int not null,
  unit_price decimal(10,2) not null,
  total_price decimal(10,2) not null,
  created_at timestamptz default now()
);

-- ─── ORDER STATUS HISTORY ─────────────────────────────────────────────────────
create table if not exists order_status_history (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade,
  status text not null,
  notes text,
  created_at timestamptz default now()
);

-- ─── WISHLISTS ────────────────────────────────────────────────────────────────
create table if not exists wishlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

-- ─── RLS POLICIES ─────────────────────────────────────────────────────────────
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table profiles enable row level security;
alter table addresses enable row level security;
alter table coupons enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table wishlists enable row level security;

-- Categories: public read
create policy "categories_public_read" on categories for select using (active = true);
create policy "categories_admin_all" on categories for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Products: public read active products
create policy "products_public_read" on products for select using (active = true);
create policy "products_admin_all" on products for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Product images: public read
create policy "product_images_public_read" on product_images for select using (true);
create policy "product_images_admin_all" on product_images for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Product variants: public read active
create policy "variants_public_read" on product_variants for select using (active = true);
create policy "variants_admin_all" on product_variants for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Profiles: users see/edit own, admins see all
create policy "profiles_own" on profiles for all using (auth.uid() = id);
create policy "profiles_admin_read" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Addresses: users manage own
create policy "addresses_own" on addresses for all using (auth.uid() = user_id);

-- Coupons: authenticated read active, admin all
create policy "coupons_auth_read" on coupons for select using (active = true and auth.uid() is not null);
create policy "coupons_admin_all" on coupons for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Orders: users see own, admin sees all
create policy "orders_own" on orders for select using (auth.uid() = user_id);
create policy "orders_insert" on orders for insert with check (true); -- allow guest checkout
create policy "orders_admin_all" on orders for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Order items: users see own via order
create policy "order_items_own" on order_items for select using (
  exists (select 1 from orders where id = order_id and user_id = auth.uid())
);
create policy "order_items_insert" on order_items for insert with check (true);
create policy "order_items_admin" on order_items for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Order status history: same as orders
create policy "order_history_own" on order_status_history for select using (
  exists (select 1 from orders where id = order_id and user_id = auth.uid())
);
create policy "order_history_insert" on order_status_history for insert with check (true);
create policy "order_history_admin" on order_status_history for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Wishlists: users manage own
create policy "wishlists_own" on wishlists for all using (auth.uid() = user_id);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
create index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_active on products(active);
create index if not exists idx_products_featured on products(featured);
create index if not exists idx_variants_product on product_variants(product_id);
create index if not exists idx_images_product on product_images(product_id, sort_order);
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_number on orders(order_number);
create index if not exists idx_orders_payment on orders(payment_id);
create index if not exists idx_order_items_order on order_items(order_id);

-- ─── SEED CATEGORIES ─────────────────────────────────────────────────────────
insert into categories (name, slug, sort_order) values
  ('Fitness', 'fitness', 1),
  ('Praia', 'praia', 2),
  ('Leggings', 'leggings', 3),
  ('Tops', 'tops', 4),
  ('Shorts', 'shorts', 5),
  ('Conjuntos', 'conjuntos', 6),
  ('Biquínis', 'biquinis', 7),
  ('Saídas de Praia', 'saidas-de-praia', 8),
  ('Acessórios', 'acessorios', 9)
on conflict (slug) do nothing;

-- ─── STORAGE BUCKET ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "products_bucket_public_read" on storage.objects
  for select using (bucket_id = 'products');

create policy "products_bucket_admin_upload" on storage.objects
  for insert with check (
    bucket_id = 'products' and
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "products_bucket_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'products' and
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
