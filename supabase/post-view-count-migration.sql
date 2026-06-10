create or replace function public.increment_post_view_count(post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  update public.posts
  set view_count = view_count + 1
  where id = post_id
    and status = 'public'
  returning view_count into next_count;

  if next_count is null then
    select view_count
    into next_count
    from public.posts
    where id = post_id;
  end if;

  return coalesce(next_count, 0);
end;
$$;
