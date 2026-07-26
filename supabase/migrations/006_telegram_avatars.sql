alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists avatar_file_id text;
alter table profiles add column if not exists avatar_updated_at timestamptz;
