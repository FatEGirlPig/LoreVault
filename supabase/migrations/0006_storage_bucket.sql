-- Private bucket for Vault files and clips. No storage.objects policies: access only via server-issued signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 52428800,
  array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','text/plain','text/markdown','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
