
-- Allow "cancelled" as an order status
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending','preparing','ready','done','cancelled'));

alter table public.orders
  add column cancellation_requested boolean not null default false,
  add column cancellation_requested_at timestamptz,
  add column cancelled_at timestamptz;

-- Update status-change trigger to also stamp cancelled_at
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
    elsif new.status = 'cancelled' and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
  end if;
  return new;
end;
$$;

-- Guard: only allow customer cancellation requests on pending/preparing orders
create or replace function public.guard_cancellation_request()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.cancellation_requested = true and old.cancellation_requested = false then
    if old.status not in ('pending','preparing') then
      raise exception 'Cannot request cancellation: order is %', old.status
        using errcode = 'check_violation';
    end if;
    new.cancellation_requested_at := now();
  end if;
  return new;
end;
$$;

create trigger orders_cancellation_guard
  before update on public.orders
  for each row
  execute function public.guard_cancellation_request();
