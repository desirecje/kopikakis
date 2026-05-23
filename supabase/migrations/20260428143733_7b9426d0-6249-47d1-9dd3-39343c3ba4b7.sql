
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  drink text not null,
  size text not null check (size in ('S','M','L')),
  notes text,
  status text not null default 'pending' check (status in ('pending','preparing','ready','done')),
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  session_date date not null,
  week_number int not null,
  year int not null,
  max_capacity int not null default 6,
  created_at timestamptz not null default now()
);

create table public.session_signups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  telegram_handle text not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now()
);

create index on public.session_signups(session_id);
create index on public.session_signups(telegram_handle);

alter table public.orders enable row level security;
alter table public.sessions enable row level security;
alter table public.session_signups enable row level security;

create policy "public read orders" on public.orders for select using (true);
create policy "public insert orders" on public.orders for insert with check (true);
create policy "public update orders" on public.orders for update using (true);

create policy "public read sessions" on public.sessions for select using (true);
create policy "public insert sessions" on public.sessions for insert with check (true);

create policy "public read signups" on public.session_signups for select using (true);
create policy "public insert signups" on public.session_signups for insert with check (true);
create policy "public update signups" on public.session_signups for update using (true);
