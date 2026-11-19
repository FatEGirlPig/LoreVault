-- ON CONFLICT (platform, external_id) needs a non-partial unique constraint.
-- NULL external_ids (manual games) stay distinct, so behaviour is unchanged.
drop index if exists games_platform_external;
alter table games add constraint games_platform_external unique (platform, external_id);
