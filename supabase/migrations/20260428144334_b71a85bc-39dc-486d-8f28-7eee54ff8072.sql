
alter table public.orders
  add column preparing_at timestamptz,
  add column ready_at timestamptz,
  add column done_at timestamptz,
  add column status_updated_at timestamptz not null default now();

create table public.order_audit_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index on public.order_audit_log(order_id, created_at desc);

alter table public.order_audit_log enable row level security;

create policy "public read audit" on public.order_audit_log for select using (true);
create policy "public insert audit" on public.order_audit_log for insert with check (true);

-- Auto-stamp status timestamps when status changes
create or replace function public.handle_order_status_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.status_updated_at := now();
    if new.status = 'preparing' and new.preparing_at is null then
      new.preparing_at := now();
    elsif new.status = 'ready' and new.ready_at is null then
      new.ready_at := now();
    elsif new.status = 'done' and new.done_at is null then
      new.done_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_status_change
  before update on public.orders
  for each row
  execute function public.handle_order_status_change();
