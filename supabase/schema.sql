-- ===========================================================================
-- Swag Frisbee Club All Star — comptes, profils et statistiques en ligne.
--
-- À coller tel quel dans Supabase : menu SQL Editor, puis Run.
-- Tout est rejouable : relancer ce fichier ne casse rien et n'efface rien.
--
-- Le principe de sécurité : la clé publique du jeu est visible par tout le
-- monde, donc elle ne protège rien. Ce sont les règles ci-dessous qui
-- protègent. Chacun peut lire les profils — il en faut bien pour afficher un
-- classement — mais personne ne peut écrire dans celui d'un autre.
-- ===========================================================================

create table if not exists profils (
  id uuid primary key references auth.users on delete cascade,
  pseudo text unique not null check (char_length(pseudo) between 2 and 16),
  avatar text,                             -- chemin dans le bucket avatars
  couleur1 text default '#35e0ff',         -- les deux couleurs du dégradé
  couleur2 text default '#7b2ff7',
  -- Compteurs de la fiche perso. Tenus par le jeu à la fin de chaque match.
  matchs int default 0,
  victoires int default 0,
  defaites int default 0,
  points_marques int default 0,
  points_encaisses int default 0,
  -- Nombre de matchs par personnage, pour le podium des trois plus joués.
  persos jsonb default '{}'::jsonb,
  cree_le timestamptz default now()
);

alter table profils enable row level security;

-- Lecture ouverte : classement, podium et profils publics en dépendent.
drop policy if exists "profils lisibles par tous" on profils;
create policy "profils lisibles par tous" on profils for select using (true);

-- Écriture strictement personnelle. C'est ici que tout se joue : sans ces
-- deux règles, n'importe qui pourrait se donner mille victoires.
drop policy if exists "chacun crée le sien" on profils;
create policy "chacun crée le sien" on profils for insert with check (auth.uid() = id);

drop policy if exists "chacun modifie le sien" on profils;
create policy "chacun modifie le sien" on profils for update using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Photos de profil. Lecture publique, dépôt réservé au propriétaire dans son
-- propre dossier — le nom du dossier est l'identifiant du compte, donc
-- personne ne peut écraser l'image d'un autre.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576,
        array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 1048576,
      allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];

drop policy if exists "avatars visibles par tous" on storage.objects;
create policy "avatars visibles par tous" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "dépôt dans son dossier" on storage.objects;
create policy "dépôt dans son dossier" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "remplacement dans son dossier" on storage.objects;
create policy "remplacement dans son dossier" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Classement. Une vue plutôt qu'une table : elle ne peut pas se désynchroniser
-- des profils, et il n'y a rien à tenir à jour.
-- ---------------------------------------------------------------------------
create or replace view classement as
  select id, pseudo, avatar, couleur1, couleur2,
         victoires, defaites, matchs, points_marques, points_encaisses,
         case when matchs > 0
              then round(victoires::numeric / matchs * 100, 1)
              else 0 end as taux_victoire
  from profils
  where matchs > 0
  order by victoires desc, taux_victoire desc
  limit 100;

-- ---------------------------------------------------------------------------
-- Fin de match : le jeu appelle cette fonction, elle seule sait écrire les
-- compteurs. Passer par une fonction plutôt que par une mise à jour libre
-- évite qu'on puisse s'attribuer n'importe quel score depuis le navigateur.
-- ---------------------------------------------------------------------------
create or replace function enregistrer_match(
  gagne boolean, marques int, encaisses int, perso text
) returns void
language plpgsql security definer as $$
begin
  update profils set
    matchs = matchs + 1,
    victoires = victoires + case when gagne then 1 else 0 end,
    defaites = defaites + case when gagne then 0 else 1 end,
    points_marques = points_marques + greatest(marques, 0),
    points_encaisses = points_encaisses + greatest(encaisses, 0),
    persos = jsonb_set(persos, array[perso],
              to_jsonb(coalesce((persos ->> perso)::int, 0) + 1), true)
  where id = auth.uid();
end; $$;
