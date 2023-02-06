create table if not exists clash_log (
    tag text,
    "time" timestamp,
    data jsonb
);

create table if not exists internet_access_events (
    access_timestamp timestamp,
    protocol varchar not null,
    host varchar not null,
    port integer not null,
    rule varchar not null,
    proxy varchar not null
);
create index on internet_access_events (access_timestamp);
create or replace function route_clash_log() returns trigger as $route_clash_log$
    begin
        if new.data ? 'log' then
            return new;
        end if;
        insert into internet_access_events
        select new.time, new.data->>'protocol', new.data->>'host', cast(new.data->>'port' as integer), new.data->>'rule', new.data->>'proxy';
        return null;
    end;
$route_clash_log$ language plpgsql;
create trigger route_clash_log before insert on clash_log for each row execute function route_clash_log();
