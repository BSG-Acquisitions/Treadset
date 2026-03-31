
create table public.route_location_pings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  user_id uuid not null,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  event_type text not null default 'ping',
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_pings_assignment on route_location_pings(assignment_id, recorded_at);
create index idx_pings_user_date on route_location_pings(user_id, recorded_at);

alter table route_location_pings enable row level security;

create policy "Users can insert own pings"
  on route_location_pings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Org members can read pings"
  on route_location_pings for select to authenticated
  using (organization_id in (
    select organization_id from users where id = auth.uid()
  ));
