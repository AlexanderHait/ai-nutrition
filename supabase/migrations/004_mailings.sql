create table if not exists mailings(
 id bigserial primary key,title text not null,content text not null,segment text not null default 'all',
 status text not null default 'scheduled' check(status in ('draft','scheduled','sent','cancelled')),
 recipient_count integer not null default 0,sent_count integer not null default 0,
 scheduled_at timestamptz,sent_at timestamptz,created_at timestamptz not null default now()
);
create index if not exists mailings_status_schedule_idx on mailings(status,scheduled_at);
