-- 홈 화면 대표 유튜브 영상 설정 저장소
-- Supabase SQL Editor에서 한 번 실행하면 됩니다.

create table if not exists public.site_settings (
  setting_key text primary key,
  setting_value text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_settings_updated_at_idx
on public.site_settings (updated_at desc);

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
on public.site_settings
for select
using (true);

drop policy if exists "Board admins can manage site settings" on public.site_settings;
create policy "Board admins can manage site settings"
on public.site_settings
for all
using (public.can_manage_board())
with check (public.can_manage_board());
