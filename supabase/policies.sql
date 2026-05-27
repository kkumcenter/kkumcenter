-- 군북면 꿈키움센터 Supabase RLS policies
-- 실행 순서: 1) schema.sql -> 2) seed.sql -> 3) policies.sql

alter table public.profiles enable row level security;
alter table public.admin_email_allowlist enable row level security;
alter table public.spaces enable row level security;
alter table public.space_reservations enable row level security;
alter table public.programs enable row level security;
alter table public.program_applications enable row level security;
alter table public.inquiries enable row level security;
alter table public.posts enable row level security;
alter table public.attachments enable row level security;
alter table public.galleries enable row level security;
alter table public.gallery_images enable row level security;
alter table public.admin_logs enable row level security;

-- profiles
drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
on public.profiles
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- admin email allowlist
drop policy if exists "Admins can manage admin email allowlist" on public.admin_email_allowlist;
create policy "Admins can manage admin email allowlist"
on public.admin_email_allowlist
for all
using (public.is_admin())
with check (public.is_admin());

-- spaces
drop policy if exists "Anyone can read active spaces" on public.spaces;
create policy "Anyone can read active spaces"
on public.spaces
for select
using (is_active = true);

drop policy if exists "Admins can manage spaces" on public.spaces;
create policy "Admins can manage spaces"
on public.spaces
for all
using (public.is_admin())
with check (public.is_admin());

-- space reservations
drop policy if exists "Anyone can create received space reservations" on public.space_reservations;
create policy "Anyone can create received space reservations"
on public.space_reservations
for insert
with check (
  status = 'received'
  and (
    (
      applicant_type = 'guest'
      and user_id is null
      and lookup_password_hash is not null
    )
    or
    (
      applicant_type = 'member'
      and user_id = auth.uid()
      and auth.uid() is not null
    )
  )
);

drop policy if exists "Members can read own reservations" on public.space_reservations;
create policy "Members can read own reservations"
on public.space_reservations
for select
using (user_id = auth.uid());

drop policy if exists "Admins can manage reservations" on public.space_reservations;
create policy "Admins can manage reservations"
on public.space_reservations
for all
using (public.is_admin())
with check (public.is_admin());

-- programs
drop policy if exists "Anyone can read programs" on public.programs;
create policy "Anyone can read programs"
on public.programs
for select
using (true);

drop policy if exists "Admins can manage programs" on public.programs;
create policy "Admins can manage programs"
on public.programs
for all
using (public.is_admin())
with check (public.is_admin());

-- program applications
drop policy if exists "Anyone can create program applications" on public.program_applications;
create policy "Anyone can create program applications"
on public.program_applications
for insert
with check (
  status in ('completed', 'waiting')
  and (
    (
      applicant_type = 'guest'
      and user_id is null
      and lookup_password_hash is not null
    )
    or
    (
      applicant_type = 'member'
      and user_id = auth.uid()
      and auth.uid() is not null
    )
  )
);

drop policy if exists "Members can read own program applications" on public.program_applications;
create policy "Members can read own program applications"
on public.program_applications
for select
using (user_id = auth.uid());

drop policy if exists "Admins can manage program applications" on public.program_applications;
create policy "Admins can manage program applications"
on public.program_applications
for all
using (public.is_admin())
with check (public.is_admin());

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
  and (
    (
      writer_type = 'guest'
      and user_id is null
      and lookup_password_hash is not null
    )
    or
    (
      writer_type = 'member'
      and user_id = auth.uid()
      and auth.uid() is not null
    )
  )
);

drop policy if exists "Members can read own inquiries" on public.inquiries;
create policy "Members can read own inquiries"
on public.inquiries
for select
using (user_id = auth.uid());

drop policy if exists "Admins can manage inquiries" on public.inquiries;
create policy "Admins can manage inquiries"
on public.inquiries
for all
using (public.is_admin())
with check (public.is_admin());

-- posts
drop policy if exists "Anyone can read public posts" on public.posts;
create policy "Anyone can read public posts"
on public.posts
for select
using (status = 'public');

drop policy if exists "Members can create village posts" on public.posts;
create policy "Members can create village posts"
on public.posts
for insert
with check (
  auth.uid() is not null
  and board_type = 'village'
  and author_id = auth.uid()
  and status in ('public', 'draft')
);

drop policy if exists "Members can update own village posts" on public.posts;
create policy "Members can update own village posts"
on public.posts
for update
using (
  auth.uid() is not null
  and board_type = 'village'
  and author_id = auth.uid()
)
with check (
  auth.uid() is not null
  and board_type = 'village'
  and author_id = auth.uid()
  and status in ('public', 'private', 'draft')
);

drop policy if exists "Admins can manage posts" on public.posts;
create policy "Admins can manage posts"
on public.posts
for all
using (public.is_admin())
with check (public.is_admin());

-- attachments
drop policy if exists "Anyone can read attachments" on public.attachments;
create policy "Anyone can read attachments"
on public.attachments
for select
using (true);

drop policy if exists "Authenticated users can upload attachments" on public.attachments;
create policy "Authenticated users can upload attachments"
on public.attachments
for insert
with check (
  auth.uid() is not null
  and uploaded_by = auth.uid()
);

drop policy if exists "Admins can manage attachments" on public.attachments;
create policy "Admins can manage attachments"
on public.attachments
for all
using (public.is_admin())
with check (public.is_admin());

-- galleries
drop policy if exists "Anyone can read public galleries" on public.galleries;
create policy "Anyone can read public galleries"
on public.galleries
for select
using (status = 'public');

drop policy if exists "Members can create galleries" on public.galleries;
create policy "Members can create galleries"
on public.galleries
for insert
with check (
  auth.uid() is not null
  and author_id = auth.uid()
  and status = 'public'
);

drop policy if exists "Members can update own galleries" on public.galleries;
create policy "Members can update own galleries"
on public.galleries
for update
using (
  auth.uid() is not null
  and author_id = auth.uid()
)
with check (
  auth.uid() is not null
  and author_id = auth.uid()
);

drop policy if exists "Admins can manage galleries" on public.galleries;
create policy "Admins can manage galleries"
on public.galleries
for all
using (public.is_admin())
with check (public.is_admin());

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
create policy "Members can create gallery images"
on public.gallery_images
for insert
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.galleries
    where galleries.id = gallery_images.gallery_id
      and galleries.author_id = auth.uid()
  )
);

drop policy if exists "Admins can manage gallery images" on public.gallery_images;
create policy "Admins can manage gallery images"
on public.gallery_images
for all
using (public.is_admin())
with check (public.is_admin());

-- admin logs
drop policy if exists "Admins can read admin logs" on public.admin_logs;
create policy "Admins can read admin logs"
on public.admin_logs
for select
using (public.is_admin());

drop policy if exists "Admins can create admin logs" on public.admin_logs;
create policy "Admins can create admin logs"
on public.admin_logs
for insert
with check (public.is_admin());

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
create policy "Authenticated users can upload kkumcenter files"
on storage.objects
for insert
with check (
  auth.uid() is not null
  and bucket_id in (
    'post-attachments',
    'gallery-images'
  )
);

drop policy if exists "Admins can manage kkumcenter storage files" on storage.objects;
create policy "Admins can manage kkumcenter storage files"
on storage.objects
for all
using (public.is_admin())
with check (public.is_admin());
