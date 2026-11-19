-- New accounts are public unless the player changes it.
-- Private notes and the linked Steam account ID stay private by default.
alter table profiles alter column visibility set default 'public';
alter table privacy_settings alter column library set default 'public';
alter table privacy_settings alter column activity set default 'public';
alter table privacy_settings alter column collections_default set default 'public';
alter table privacy_settings alter column media_default set default 'public';
alter table privacy_settings alter column friends_list set default 'public';

-- Existing players who never touched their settings get the new defaults too.
update profiles set visibility = 'public' where visibility = 'private' and updated_at = created_at;
update privacy_settings ps set library = 'public', activity = 'public', collections_default = 'public', media_default = 'public', friends_list = 'public'
where ps.updated_at <= (select u.created_at + interval '5 seconds' from auth.users u where u.id = ps.user_id);
