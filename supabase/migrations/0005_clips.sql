alter table media_files add column if not exists title text check (char_length(title) <= 100);
create index if not exists media_clips_public on media_files (created_at desc) where category = 'video' and status = 'ready' and visibility = 'public';
