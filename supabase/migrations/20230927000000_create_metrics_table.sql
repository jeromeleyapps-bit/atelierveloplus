-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp" with schema extensions;

-- Create metrics table
create table if not exists public.metrics (
  id uuid not null default extensions.uuid_generate_v4(),
  name text not null,
  value double precision,
  data jsonb,
  timestamp timestamp with time zone not null default timezone('utc'::text, now()),
  user_agent text,
  path text,
  
  constraint metrics_pkey primary key (id)
);

-- Enable Row Level Security
alter table public.metrics enable row level security;

-- Create indexes for better query performance
create index if not exists idx_metrics_name on public.metrics (name);
create index if not exists idx_metrics_timestamp on public.metrics (timestamp);

-- Policies for secure access
create or replace function public.is_service_role()
returns boolean as $$
  select current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
$$ language sql security definer;

-- Allow read access to authenticated users
create policy "Enable read access for authenticated users"
on public.metrics
for select
to authenticated
using (true);

-- Allow insert for service role (used by the API)
create policy "Enable insert for service role"
on public.metrics
for insert
to service_role
with check (true);

-- Allow delete only for service role (for cleanup)
create policy "Enable delete for service role"
on public.metrics
for delete
to service_role
using (true);

-- Function to get metrics summary
create or replace function public.get_metrics_summary(
  p_metric_name text,
  p_start_date timestamp with time zone default (now() - interval '7 days'),
  p_end_date timestamp with time zone default now()
)
returns table(
  metric_name text,
  metric_count bigint,
  avg_value numeric,
  min_value numeric,
  max_value numeric,
  p95_value numeric
) as $$
begin
  return query
  select 
    m.name::text as metric_name,
    count(*)::bigint as metric_count,
    avg(m.value)::numeric(10,2) as avg_value,
    min(m.value)::numeric(10,2) as min_value,
    max(m.value)::numeric(10,2) as max_value,
    percentile_cont(0.95) within group (order by m.value)::numeric(10,2) as p95_value
  from 
    public.metrics m
  where 
    m.name = p_metric_name
    and m.timestamp between p_start_date and p_end_date
  group by 
    m.name;
end;
$$ language plpgsql security definer;

-- Function to clean up old metrics
create or replace function public.cleanup_old_metrics(
  p_older_than_days integer default 90
)
returns bigint as $$
declare
  v_deleted_count bigint;
begin
  with deleted as (
    delete from public.metrics
    where timestamp < (now() - (p_older_than_days || ' days')::interval)
    returning 1
  )
  select count(*) into v_deleted_count from deleted;
  
  return v_deleted_count;
end;
$$ language plpgsql security definer;
