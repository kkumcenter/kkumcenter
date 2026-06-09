-- 군북면 꿈키움센터 Supabase RLS policies
-- 실행 순서: 1) schema.sql -> 2) seed.sql -> 3) policies.sql

alter table public.profiles enable row level security;
alter table public.admin_email_allowlist enable row level security;
alter table public.staff_members enable row level security;
alter table public.site_settings enable row level security;
alter table public.spaces enable row level security;
alter table public.space_reservations enable row level security;
alter table public.programs enable row level security;
alter table public.program_applications enable row level security;
alter table public.program_sessions enable row level security;
alter table public.program_attendance enable row level security;
alter table public.program_feedback enable row level security;
alter table public.inquiries enable row level security;
alter table public.space_usage_logs enable row level security;
alter table public.posts enable row level security;
alter table public.attachments enable row level security;
alter table public.galleries enable row level security;
alter table public.gallery_images enable row level security;
alter table public.videos enable row level security;
alter table public.admin_logs enable row level security;

-- profiles
drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "Super admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
on public.profiles
for all
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;

-- admin email allowlist
drop policy if exists "Admins can manage admin email allowlist" on public.admin_email_allowlist;
drop policy if exists "Super admins can manage admin email allowlist" on public.admin_email_allowlist;
create policy "Admins can manage admin email allowlist"
on public.admin_email_allowlist
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- staff members
drop policy if exists "Admins can manage staff members" on public.staff_members;
drop policy if exists "Super admins can manage staff members" on public.staff_members;
create policy "Admins can manage staff members"
on public.staff_members
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- site settings
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

-- spaces
drop policy if exists "Anyone can read active spaces" on public.spaces;
create policy "Anyone can read active spaces"
on public.spaces
for select
using (is_active = true);

drop policy if exists "Admins can manage spaces" on public.spaces;
drop policy if exists "Super admins can manage spaces" on public.spaces;
create policy "Admins can manage spaces"
on public.spaces
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- space reservations
drop policy if exists "Anyone can create received space reservations" on public.space_reservations;
create policy "Anyone can create received space reservations"
on public.space_reservations
for insert
with check (
  status = 'received'
  and applicant_type = 'guest'
  and user_id is null
  and lookup_password_hash is not null
  and birth_year is not null
  and region is not null
);

drop policy if exists "Members can read own reservations" on public.space_reservations;
drop policy if exists "Admins can manage reservations" on public.space_reservations;
drop policy if exists "Super admins can manage reservations" on public.space_reservations;
create policy "Admins can manage reservations"
on public.space_reservations
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- programs
drop policy if exists "Anyone can read programs" on public.programs;

drop policy if exists "Admins can manage programs" on public.programs;
drop policy if exists "Super admins can manage programs" on public.programs;
create policy "Admins can manage programs"
on public.programs
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- program applications
drop policy if exists "Anyone can create program applications" on public.program_applications;
create policy "Anyone can create program applications"
on public.program_applications
for insert
with check (
  status in ('completed', 'waiting')
  and applicant_type = 'guest'
  and user_id is null
  and lookup_password_hash is not null
  and birth_year is not null
  and region is not null
);

drop policy if exists "Members can read own program applications" on public.program_applications;
drop policy if exists "Admins can manage program applications" on public.program_applications;
drop policy if exists "Super admins can manage program applications" on public.program_applications;
create policy "Admins can manage program applications"
on public.program_applications
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- program sessions / attendance / feedback
drop policy if exists "Admins can manage program sessions" on public.program_sessions;
create policy "Admins can manage program sessions"
on public.program_sessions
for all
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Admins can manage program attendance" on public.program_attendance;
create policy "Admins can manage program attendance"
on public.program_attendance
for all
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Admins can manage program feedback" on public.program_feedback;
create policy "Admins can manage program feedback"
on public.program_feedback
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- inquiries
drop policy if exists "Anyone can create inquiries" on public.inquiries;
create policy "Anyone can create inquiries"
on public.inquiries
for insert
with check (
  status = 'received'
  and answer is null
  and answered_by is null
  and answered_at is null
  and writer_type = 'guest'
  and user_id is null
  and lookup_password_hash is not null
  and birth_year is not null
  and region is not null
);

drop policy if exists "Members can read own inquiries" on public.inquiries;
drop policy if exists "Admins can manage inquiries" on public.inquiries;
drop policy if exists "Super admins can manage inquiries" on public.inquiries;
create policy "Admins can manage inquiries"
on public.inquiries
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- space usage logs
drop policy if exists "Admins can manage space usage logs" on public.space_usage_logs;
create policy "Admins can manage space usage logs"
on public.space_usage_logs
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- posts
drop policy if exists "Anyone can read public posts" on public.posts;
create policy "Anyone can read public posts"
on public.posts
for select
using (status = 'public');

drop policy if exists "Members can create village posts" on public.posts;
drop policy if exists "Members can update own village posts" on public.posts;
drop policy if exists "Admins can manage posts" on public.posts;
drop policy if exists "Board admins can manage posts" on public.posts;
drop policy if exists "Board admins can read posts" on public.posts;
drop policy if exists "Board admins can create posts" on public.posts;
drop policy if exists "Board admins can update posts" on public.posts;
drop policy if exists "Super admins can delete posts" on public.posts;
create policy "Board admins can read posts"
on public.posts
for select
using (public.can_manage_board());
create policy "Board admins can create posts"
on public.posts
for insert
with check (public.can_manage_board());
create policy "Board admins can update posts"
on public.posts
for update
using (public.can_manage_board())
with check (public.can_manage_board());
create policy "Super admins can delete posts"
on public.posts
for delete
using (public.is_super_admin());

-- attachments
drop policy if exists "Anyone can read attachments" on public.attachments;
create policy "Anyone can read attachments"
on public.attachments
for select
using (true);

drop policy if exists "Authenticated users can upload attachments" on public.attachments;
drop policy if exists "Admins can manage attachments" on public.attachments;
drop policy if exists "Board admins can manage attachments" on public.attachments;
drop policy if exists "Board admins can create attachments" on public.attachments;
drop policy if exists "Board admins can update attachments" on public.attachments;
drop policy if exists "Super admins can delete attachments" on public.attachments;
create policy "Board admins can create attachments"
on public.attachments
for insert
with check (public.can_manage_board());
create policy "Board admins can update attachments"
on public.attachments
for update
using (public.can_manage_board())
with check (public.can_manage_board());
create policy "Super admins can delete attachments"
on public.attachments
for delete
using (public.is_super_admin());

-- galleries
drop policy if exists "Anyone can read public galleries" on public.galleries;
create policy "Anyone can read public galleries"
on public.galleries
for select
using (status = 'public');

drop policy if exists "Members can create galleries" on public.galleries;
drop policy if exists "Members can update own galleries" on public.galleries;
drop policy if exists "Admins can manage galleries" on public.galleries;
drop policy if exists "Board admins can manage galleries" on public.galleries;
drop policy if exists "Board admins can read galleries" on public.galleries;
drop policy if exists "Board admins can create galleries" on public.galleries;
drop policy if exists "Board admins can update galleries" on public.galleries;
drop policy if exists "Super admins can delete galleries" on public.galleries;
create policy "Board admins can read galleries"
on public.galleries
for select
using (public.can_manage_board());
create policy "Board admins can create galleries"
on public.galleries
for insert
with check (public.can_manage_board());
create policy "Board admins can update galleries"
on public.galleries
for update
using (public.can_manage_board())
with check (public.can_manage_board());
create policy "Super admins can delete galleries"
on public.galleries
for delete
using (public.is_super_admin());

-- gallery images
drop policy if exists "Anyone can read public gallery images" on public.gallery_images;
create policy "Anyone can read public gallery images"
on public.gallery_images
for select
using (
  exists (
    select 1
    from public.galleries
    where galleries.id = gallery_images.gallery_id
      and galleries.status = 'public'
  )
);

drop policy if exists "Members can create gallery images" on public.gallery_images;
drop policy if exists "Admins can manage gallery images" on public.gallery_images;
drop policy if exists "Board admins can manage gallery images" on public.gallery_images;
drop policy if exists "Board admins can create gallery images" on public.gallery_images;
drop policy if exists "Board admins can read gallery images" on public.gallery_images;
drop policy if exists "Board admins can update gallery images" on public.gallery_images;
drop policy if exists "Super admins can delete gallery images" on public.gallery_images;
create policy "Board admins can read gallery images"
on public.gallery_images
for select
using (public.can_manage_board());
create policy "Board admins can create gallery images"
on public.gallery_images
for insert
with check (public.can_manage_board());
create policy "Board admins can update gallery images"
on public.gallery_images
for update
using (public.can_manage_board())
with check (public.can_manage_board());
create policy "Super admins can delete gallery images"
on public.gallery_images
for delete
using (public.is_super_admin());

-- videos
drop policy if exists "Anyone can read public videos" on public.videos;
create policy "Anyone can read public videos"
on public.videos
for select
using (status = 'public');

drop policy if exists "Board admins can read videos" on public.videos;
drop policy if exists "Board admins can create videos" on public.videos;
drop policy if exists "Board admins can update videos" on public.videos;
drop policy if exists "Super admins can delete videos" on public.videos;
create policy "Board admins can read videos"
on public.videos
for select
using (public.can_manage_board());
create policy "Board admins can create videos"
on public.videos
for insert
with check (public.can_manage_board());
create policy "Board admins can update videos"
on public.videos
for update
using (public.can_manage_board())
with check (public.can_manage_board());
create policy "Super admins can delete videos"
on public.videos
for delete
using (public.is_super_admin());

-- admin logs
drop policy if exists "Admins can read admin logs" on public.admin_logs;
drop policy if exists "Super admins can read admin logs" on public.admin_logs;
create policy "Admins can read admin logs"
on public.admin_logs
for select
using (public.is_super_admin());

drop policy if exists "Admins can create admin logs" on public.admin_logs;
drop policy if exists "Super admins can create admin logs" on public.admin_logs;
create policy "Admins can create admin logs"
on public.admin_logs
for insert
with check (public.is_super_admin());

-- storage buckets
insert into storage.buckets (id, name, public)
values
  ('space-images', 'space-images', true),
  ('program-images', 'program-images', true),
  ('post-attachments', 'post-attachments', true),
  ('gallery-images', 'gallery-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Anyone can read kkumcenter public files" on storage.objects;
create policy "Anyone can read kkumcenter public files"
on storage.objects
for select
using (
  bucket_id in (
    'space-images',
    'program-images',
    'post-attachments',
    'gallery-images'
  )
);

drop policy if exists "Authenticated users can upload kkumcenter files" on storage.objects;
drop policy if exists "Admins can manage program images" on storage.objects;
drop policy if exists "Admins can manage kkumcenter storage files" on storage.objects;
drop policy if exists "Board admins can manage kkumcenter storage files" on storage.objects;
create policy "Admins can manage program images"
on storage.objects
for all
using (
  public.is_super_admin()
  and bucket_id in ('program-images')
)
with check (
  public.is_super_admin()
  and bucket_id in ('program-images')
);

create policy "Board admins can manage kkumcenter storage files"
on storage.objects
for all
using (
  public.can_manage_board()
  and bucket_id in ('post-attachments', 'gallery-images')
)
with check (
  public.can_manage_board()
  and bucket_id in ('post-attachments', 'gallery-images')
);
