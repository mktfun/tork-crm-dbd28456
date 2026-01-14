-- Buckets (upsert safe)
insert into storage.buckets (id, name, public)
values ('quote-uploads','quote-uploads', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('policy-docs','policy-docs', false)
on conflict (id) do nothing;

-- RLS policies for private bucket 'policy-docs'
-- Policy: Users can view their own policy docs
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Users can view their own policy docs' and tablename = 'objects' and schemaname = 'storage'
  ) then
    create policy "Users can view their own policy docs"
      on storage.objects for select
      using (
        bucket_id = 'policy-docs'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- Policy: Users can upload their own policy docs
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Users can upload their own policy docs' and tablename = 'objects' and schemaname = 'storage'
  ) then
    create policy "Users can upload their own policy docs"
      on storage.objects for insert
      with check (
        bucket_id = 'policy-docs'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- Policy: Users can update their own policy docs
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Users can update their own policy docs' and tablename = 'objects' and schemaname = 'storage'
  ) then
    create policy "Users can update their own policy docs"
      on storage.objects for update
      using (
        bucket_id = 'policy-docs'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- Policy: Users can delete their own policy docs
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Users can delete their own policy docs' and tablename = 'objects' and schemaname = 'storage'
  ) then
    create policy "Users can delete their own policy docs"
      on storage.objects for delete
      using (
        bucket_id = 'policy-docs'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;