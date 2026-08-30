create index if not exists albums_release_year_id_idx
  on public.albums (year desc, id);

create index if not exists albums_genre_year_id_idx
  on public.albums (lower(genre), year desc, id);

create index if not exists album_metadata_album_id_release_date_idx
  on public.album_metadata (album_id, original_release_date desc)
  where original_release_date is not null and trim(original_release_date) <> '';

create or replace function public.muze_catalogue_identity(value text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', ' ', 'g'));
$$;

create or replace function public.muze_homepage_catalogue_query(
  p_search text default '',
  p_genre text default 'All',
  p_year int default null,
  p_sort text default 'score',
  p_offset int default 0,
  p_limit int default 120
)
returns table (
  id text,
  title text,
  artist text,
  year int,
  release_date text,
  genre text,
  cover_url text,
  effective_score numeric,
  effective_ratings_count bigint,
  muze_rank bigint,
  total_matches bigint,
  global_top jsonb,
  global_genres jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
with community as (
  select a.id::text id, a.title, a.artist, a.year, a.genre, a.cover_url,
    coalesce(round(avg(r.rating)::numeric, 1), 0) avg_rating,
    count(r.rating)::bigint ratings_count
  from public.albums a
  left join public.ratings r on r.album_id = a.id
  group by a.id
), curated(id,title,artist,year,genre,cover_url,avg_rating,ratings_count) as (
  values
    ('seed-1','Abbey Road','The Beatles',1969,'Rock','https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/48/53/43/485343e3-dd6a-0034-faec-f4b6403f8108/13UMGIM63890.rgb.jpg/600x600bb.jpg',9.4::numeric,18432::bigint),
    ('seed-2','To Pimp a Butterfly','Kendrick Lamar',2015,'Hip-Hop','https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/b5/a6/91/b5a69171-5232-3d5b-9c15-8963802f83dd/15UMGIM15814.rgb.jpg/600x600bb.jpg',9.3::numeric,22102::bigint),
    ('seed-3','OK Computer','Radiohead',1997,'Alternative','https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/07/60/ba/0760ba0f-148c-b18f-d0ff-169ee96f3af5/634904078164.png/600x600bb.jpg',9.2::numeric,20110::bigint),
    ('seed-4','Songs in the Key of Life','Stevie Wonder',1976,'Soul','https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/eb/1f/12/eb1f12ec-474c-63aa-43af-09282f423b9d/00602537004737.rgb.jpg/600x600bb.jpg',9.2::numeric,11240::bigint),
    ('seed-5','Illmatic','Nas',1994,'Hip-Hop','https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b9/eb/cc/b9ebccbc-5ba4-2cdb-5332-b065739abd9a/886444567619.jpg/600x600bb.jpg',9.1::numeric,16650::bigint),
    ('seed-6','Rumours','Fleetwood Mac',1977,'Pop Rock','https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/4d/13/ba/4d13bac3-d3d5-7581-2c74-034219eadf2b/081227970949.jpg/600x600bb.jpg',9.0::numeric,15100::bigint)
), base as (
  select * from community
  union all
  select * from curated
), overrides as (
  select album_id,
    max(admin_score) filter (where admin_score is not null) admin_score,
    (max(admin_ratings_count) filter (where admin_ratings_count is not null))::bigint admin_ratings_count
  from public.album_overviews
  where album_id is not null
  group by album_id
), legacy_overrides as (
  select public.muze_catalogue_identity(title) title_key,
    public.muze_catalogue_identity(artist) artist_key,
    max(admin_score) filter (where admin_score is not null) admin_score,
    (max(admin_ratings_count) filter (where admin_ratings_count is not null))::bigint admin_ratings_count
  from public.album_overviews
  where album_id is null
  group by 1,2
), metadata_by_id as (
  select distinct on (album_id) album_id, original_release_date
  from public.album_metadata
  where album_id is not null and coalesce(trim(original_release_date),'') <> ''
  order by album_id, manually_verified desc, last_verified_at desc nulls last, updated_at desc
), metadata_by_identity as (
  select distinct on (public.muze_catalogue_identity(title),public.muze_catalogue_identity(artist))
    public.muze_catalogue_identity(title) title_key,
    public.muze_catalogue_identity(artist) artist_key,
    original_release_date
  from public.album_metadata
  where coalesce(trim(original_release_date),'') <> ''
  order by public.muze_catalogue_identity(title),public.muze_catalogue_identity(artist),manually_verified desc,last_verified_at desc nulls last,updated_at desc
), resolved as (
  select b.*,
    coalesce(mi.original_release_date,mk.original_release_date,b.year::text) release_date,
    coalesce(o.admin_score,l.admin_score,b.avg_rating) effective_score,
    coalesce(o.admin_ratings_count,l.admin_ratings_count,b.ratings_count) effective_ratings_count,
    row_number() over (
      partition by public.muze_catalogue_identity(b.artist)||'::'||public.muze_catalogue_identity(b.title)
      order by coalesce(o.admin_ratings_count,l.admin_ratings_count,b.ratings_count) desc, b.id
    ) identity_row
  from base b
  left join overrides o on o.album_id=b.id
  left join legacy_overrides l
    on l.title_key=public.muze_catalogue_identity(b.title)
   and l.artist_key=public.muze_catalogue_identity(b.artist)
  left join metadata_by_id mi on mi.album_id=b.id
  left join metadata_by_identity mk
    on mk.title_key=public.muze_catalogue_identity(b.title)
   and mk.artist_key=public.muze_catalogue_identity(b.artist)
), globally_ranked as (
  select r.*,
    row_number() over (order by effective_score desc, effective_ratings_count desc, title, id) muze_rank
  from resolved r
  where identity_row=1
    and not (
      lower(coalesce(genre,''))='greatest hits'
      or public.muze_catalogue_identity(title) ~ '(^| )(greatest hits|best of|very best of)( |$)'
    )
), greatest_hits as (
  select r.*, null::bigint muze_rank
  from resolved r
  where identity_row=1
    and (
      lower(coalesce(genre,''))='greatest hits'
      or public.muze_catalogue_identity(title) ~ '(^| )(greatest hits|best of|very best of)( |$)'
    )
), catalogue as (
  select * from globally_ranked
  union all
  select * from greatest_hits
), filtered as (
  select g.*
  from catalogue g
  where (coalesce(trim(p_search),'')='' or concat_ws(' ',g.title,g.artist,g.genre) ilike '%'||trim(p_search)||'%')
    and (
      coalesce(trim(p_search),'')<>''
      or lower(coalesce(trim(p_genre),''))='greatest hits'
      or not (
        lower(coalesce(g.genre,''))='greatest hits'
        or public.muze_catalogue_identity(g.title) ~ '(^| )(greatest hits|best of|very best of)( |$)'
      )
    )
    and (
      coalesce(trim(p_genre),'')=''
      or lower(p_genre)='all'
      or (
        lower(p_genre)='greatest hits'
        and (
          lower(coalesce(g.genre,''))='greatest hits'
          or public.muze_catalogue_identity(g.title) ~ '(^| )(greatest hits|best of|very best of)( |$)'
        )
      )
      or (
        lower(p_genre)<>'greatest hits'
        and lower(g.genre)=lower(p_genre)
      )
    )
    and (p_year is null or g.year=p_year)
), global_values as (
  select
    (select to_jsonb(x) from (select id,title,artist,year,release_date,genre,cover_url,effective_score,effective_ratings_count,muze_rank from globally_ranked order by muze_rank limit 1) x) top_album,
    (select jsonb_agg(genre order by genre) from (
      select distinct genre from globally_ranked where coalesce(genre,'')<>''
      union
      select 'Greatest hits' where exists(select 1 from greatest_hits)
    ) genres) genres
)
select f.id,f.title,f.artist,f.year,f.release_date,f.genre,f.cover_url,f.effective_score,f.effective_ratings_count,f.muze_rank,
  count(*) over () total_matches,gv.top_album global_top,gv.genres global_genres
from filtered f
cross join global_values gv
order by
  case when p_sort='year' then
    case
      when f.release_date ~ '^\d{4}-\d{1,2}-\d{1,2}' then
        split_part(f.release_date,'-',1)::bigint*10000 + split_part(f.release_date,'-',2)::bigint*100 + split_part(f.release_date,'-',3)::bigint
      when f.release_date ~ '^\d{4}-\d{1,2}' then
        split_part(f.release_date,'-',1)::bigint*10000 + split_part(f.release_date,'-',2)::bigint*100
      else coalesce(f.year,0)::bigint*10000
    end
  end desc nulls last,
  case when p_sort='ratings' then f.effective_ratings_count end desc,
  case when p_sort='hidden' then f.effective_ratings_count end asc,
  case when p_sort='score' then f.effective_score end desc,
  case when p_sort in ('score','ratings','hidden') then f.effective_score end desc,
  case when p_sort='score' then f.effective_ratings_count end desc,
  f.id
offset greatest(0,p_offset)
limit least(120,greatest(1,p_limit));
$$;

grant execute on function public.muze_homepage_catalogue_query(text,text,int,text,int,int) to anon, authenticated;
