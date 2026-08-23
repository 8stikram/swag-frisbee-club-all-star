-- ===========================================================================
-- Swag Frisbee Club All Star — profils enrichis, amis, historique,
-- commentaires, votes de terrain et préférences en ligne.
--
-- À coller dans Supabase : SQL Editor, puis Run. Rejouable : le relancer ne
-- casse rien et n'efface rien.
--
-- Ce fichier vient APRÈS schema.sql, qui crée déjà `profils` et `arenes`.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Le profil s'enrichit.
-- ---------------------------------------------------------------------------
alter table profils add column if not exists statut text;             -- statut libre
alter table profils add column if not exists banniere text;           -- image du haut
alter table profils add column if not exists titre_actif text;        -- titre affiché
alter table profils add column if not exists main text;               -- personnage principal
alter table profils add column if not exists vu_le timestamptz default now();
alter table profils add column if not exists preferences jsonb default '{}'::jsonb;

-- Un joueur est « en ligne » s'il s'est manifesté récemment. Le jeu envoie un
-- signe de vie régulier ; deux minutes sans nouvelle et il passe hors ligne.
-- Une vraie présence temps réel demanderait une connexion permanente : pour
-- une pastille verte, ce serait payer très cher un détail.
-- Supprimée puis recréée, jamais remplacée : remplacer une vue interdit
-- d'ajouter ou de retirer une colonne ailleurs qu'à la fin, et ce fichier doit
-- pouvoir être relancé après avoir été enrichi plus bas. Une vue ne contient
-- aucune donnée, la supprimer ne coûte rien.
drop view if exists profils_publics;
create view profils_publics as
  select id, pseudo, avatar, banniere, couleur1, couleur2,
         statut, titre_actif, main, vu_le,
         (vu_le > now() - interval '2 minutes') as en_ligne,
         matchs, victoires, defaites, points_marques, points_encaisses,
         case when matchs > 0
              then round(victoires::numeric / matchs * 100, 1)
              else 0 end as taux_victoire,
         persos, cree_le
  from profils;

-- Signe de vie. Écrit uniquement sa propre ligne.
create or replace function signe_de_vie() returns void
language sql security definer as $$
  update profils set vu_le = now() where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 2. Les titres. Le catalogue est commun, les déblocages sont personnels.
-- ---------------------------------------------------------------------------
create table if not exists titres (
  id text primary key,
  libelle text not null,
  condition text                       -- ce qu'il faut faire pour l'avoir
);
alter table titres enable row level security;
drop policy if exists "titres lisibles" on titres;
create policy "titres lisibles" on titres for select using (true);

insert into titres (id, libelle, condition) values
  ('debutant',   'DÉBUTANT',        'Offert à la création du compte'),
  ('habitue',    'HABITUÉ',         'Jouer 10 matchs en ligne'),
  ('veteran',    'VÉTÉRAN',         'Jouer 50 matchs en ligne'),
  ('tireur',     'TIREUR D''ÉLITE', 'Marquer 100 points au total'),
  ('invaincu',   'INVAINCU',        'Gagner 10 matchs en ligne'),
  ('legende',    'LÉGENDE',         'Gagner 50 matchs en ligne')
on conflict (id) do update set libelle = excluded.libelle, condition = excluded.condition;

create table if not exists titres_debloques (
  joueur uuid references auth.users on delete cascade,
  titre text references titres on delete cascade,
  obtenu_le timestamptz default now(),
  primary key (joueur, titre)
);
alter table titres_debloques enable row level security;
drop policy if exists "titres debloques lisibles" on titres_debloques;
create policy "titres debloques lisibles" on titres_debloques for select using (true);
drop policy if exists "titres debloques a soi" on titres_debloques;
create policy "titres debloques a soi" on titres_debloques
  for insert with check (auth.uid() = joueur);

-- ---------------------------------------------------------------------------
-- 3. Les amitiés. Une seule ligne par paire : le demandeur et le destinataire.
-- ---------------------------------------------------------------------------
create table if not exists amis (
  demandeur uuid references auth.users on delete cascade,
  destinataire uuid references auth.users on delete cascade,
  etat text not null default 'attente' check (etat in ('attente', 'accepte')),
  cree_le timestamptz default now(),
  primary key (demandeur, destinataire),
  check (demandeur <> destinataire)
);
alter table amis enable row level security;

-- On ne voit que les liens qui nous concernent : la liste d'amis d'un inconnu
-- ne regarde personne.
drop policy if exists "amis les siens" on amis;
create policy "amis les siens" on amis for select
  using (auth.uid() = demandeur or auth.uid() = destinataire);

-- On ne demande qu'en son propre nom.
drop policy if exists "amis demander" on amis;
create policy "amis demander" on amis for insert with check (auth.uid() = demandeur);

-- Seul le destinataire accepte : sans cette règle, on pourrait s'ajouter
-- soi-même à la liste de n'importe qui.
drop policy if exists "amis accepter" on amis;
create policy "amis accepter" on amis for update using (auth.uid() = destinataire);

-- Chacun peut rompre le lien, dans un sens comme dans l'autre.
drop policy if exists "amis retirer" on amis;
create policy "amis retirer" on amis for delete
  using (auth.uid() = demandeur or auth.uid() = destinataire);

-- ---------------------------------------------------------------------------
-- 4. L'historique des matchs. Une ligne par match, vue des deux côtés.
-- ---------------------------------------------------------------------------
create table if not exists matchs (
  id bigserial primary key,
  joueur uuid references auth.users on delete cascade,
  adversaire uuid references auth.users on delete set null,
  adversaire_pseudo text,              -- gardé même si le compte disparaît
  score_joueur int not null default 0,
  score_adversaire int not null default 0,
  perso_joueur text,
  perso_adversaire text,
  mode text default 'en_ligne',
  gagne boolean not null,
  joue_le timestamptz default now()
);
create index if not exists matchs_par_joueur on matchs (joueur, joue_le desc);
alter table matchs enable row level security;

-- Lecture ouverte : les trois derniers matchs s'affichent sur un profil public.
drop policy if exists "matchs lisibles" on matchs;
create policy "matchs lisibles" on matchs for select using (true);

-- On n'écrit que ses propres matchs, et on ne les réécrit jamais : un
-- historique qu'on pourrait retoucher ne vaudrait rien.
drop policy if exists "matchs ecrire les siens" on matchs;
create policy "matchs ecrire les siens" on matchs for insert with check (auth.uid() = joueur);

-- ---------------------------------------------------------------------------
-- 5. Les commentaires de profil, avec réponses.
-- ---------------------------------------------------------------------------
create table if not exists commentaires (
  id bigserial primary key,
  profil uuid references auth.users on delete cascade,   -- le mur visité
  auteur uuid references auth.users on delete cascade,
  parent bigint references commentaires (id) on delete cascade,  -- réponse à…
  texte text not null check (char_length(texte) between 1 and 300),
  ecrit_le timestamptz default now()
);
create index if not exists commentaires_par_profil on commentaires (profil, ecrit_le desc);
alter table commentaires enable row level security;

drop policy if exists "commentaires lisibles" on commentaires;
create policy "commentaires lisibles" on commentaires for select using (true);

drop policy if exists "commentaires ecrire" on commentaires;
create policy "commentaires ecrire" on commentaires for insert with check (auth.uid() = auteur);

-- L'auteur peut retirer le sien, et le propriétaire du mur peut retirer ce
-- qu'on a écrit chez lui. Sans cette seconde règle, on subirait n'importe quoi
-- sur sa propre page sans aucun recours.
drop policy if exists "commentaires retirer" on commentaires;
create policy "commentaires retirer" on commentaires for delete
  using (auth.uid() = auteur or auth.uid() = profil);

-- ---------------------------------------------------------------------------
-- 6. Les votes de terrain. Un seul par joueur et par terrain.
-- ---------------------------------------------------------------------------
create table if not exists votes_terrain (
  joueur uuid references auth.users on delete cascade,
  terrain text not null,
  vote_le timestamptz default now(),
  primary key (joueur, terrain)
);
alter table votes_terrain enable row level security;
drop policy if exists "votes lisibles" on votes_terrain;
create policy "votes lisibles" on votes_terrain for select using (true);
drop policy if exists "votes les siens" on votes_terrain;
create policy "votes les siens" on votes_terrain for insert with check (auth.uid() = joueur);
drop policy if exists "votes retirer les siens" on votes_terrain;
create policy "votes retirer les siens" on votes_terrain for delete using (auth.uid() = joueur);

create or replace view classement_terrains as
  select terrain, count(*)::int as voix
  from votes_terrain group by terrain order by voix desc;

-- ---------------------------------------------------------------------------
-- 7. Bannières : même principe que les photos de profil.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bannieres', 'bannieres', true, 2097152,
        array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152,
      allowed_mime_types = array['image/png','image/jpeg','image/webp'];

drop policy if exists "bannieres visibles" on storage.objects;
create policy "bannieres visibles" on storage.objects
  for select using (bucket_id = 'bannieres');
drop policy if exists "banniere dans son dossier" on storage.objects;
create policy "banniere dans son dossier" on storage.objects
  for insert with check (
    bucket_id = 'bannieres' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "banniere remplacement" on storage.objects;
create policy "banniere remplacement" on storage.objects
  for update using (
    bucket_id = 'bannieres' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 8. Fin de match : une seule fonction écrit les compteurs, l'historique et
-- les titres. Passer par une fonction évite qu'on s'attribue n'importe quoi
-- depuis la console du navigateur.
-- ---------------------------------------------------------------------------
create or replace function enregistrer_match_complet(
  p_adversaire uuid, p_adversaire_pseudo text,
  p_score int, p_score_adv int,
  p_perso text, p_perso_adv text, p_mode text
) returns void language plpgsql security definer as $$
declare v_gagne boolean; v_m int; v_v int; v_p int;
begin
  v_gagne := p_score > p_score_adv;

  insert into matchs (joueur, adversaire, adversaire_pseudo, score_joueur,
                      score_adversaire, perso_joueur, perso_adversaire, mode, gagne)
  values (auth.uid(), p_adversaire, p_adversaire_pseudo, greatest(p_score, 0),
          greatest(p_score_adv, 0), p_perso, p_perso_adv,
          coalesce(p_mode, 'en_ligne'), v_gagne);

  update profils set
    matchs = matchs + 1,
    victoires = victoires + case when v_gagne then 1 else 0 end,
    defaites = defaites + case when v_gagne then 0 else 1 end,
    points_marques = points_marques + greatest(p_score, 0),
    points_encaisses = points_encaisses + greatest(p_score_adv, 0),
    persos = jsonb_set(persos, array[p_perso],
              to_jsonb(coalesce((persos ->> p_perso)::int, 0) + 1), true),
    vu_le = now()
  where id = auth.uid()
  returning matchs, victoires, points_marques into v_m, v_v, v_p;

  -- Titres gagnés au passage. Rien ne se perd : on n'insère que ce qui manque.
  insert into titres_debloques (joueur, titre)
  select auth.uid(), t.id from (values
    ('debutant', true), ('habitue', v_m >= 10), ('veteran', v_m >= 50),
    ('tireur', v_p >= 100), ('invaincu', v_v >= 10), ('legende', v_v >= 50)
  ) as t(id, gagne) where t.gagne
  on conflict do nothing;
end; $$;

-- Bilan face à un adversaire donné : « 5 victoires, 3 défaites ».
create or replace function face_a_face(p_adversaire uuid)
returns table (victoires bigint, defaites bigint)
language sql security definer as $$
  select count(*) filter (where gagne), count(*) filter (where not gagne)
  from matchs where joueur = auth.uid() and adversaire = p_adversaire;
$$;

-- ---------------------------------------------------------------------------
-- 9. Invitations à jouer. Un ami dépose un code d'arène chez un autre, qui le
-- voit apparaître dans sa liste d'amis. Ce n'est pas une notification de
-- connexion — c'est une porte ouverte qu'on laisse à quelqu'un.
-- ---------------------------------------------------------------------------
create table if not exists invitations (
  de uuid references auth.users on delete cascade,
  vers uuid references auth.users on delete cascade,
  code text not null,
  cree_le timestamptz default now(),
  primary key (de, vers)
);
alter table invitations enable row level security;

-- On ne voit que celles qui nous concernent.
drop policy if exists "invitations les siennes" on invitations;
create policy "invitations les siennes" on invitations for select
  using (auth.uid() = de or auth.uid() = vers);
drop policy if exists "invitations envoyer" on invitations;
create policy "invitations envoyer" on invitations for insert with check (auth.uid() = de);
drop policy if exists "invitations remplacer" on invitations;
create policy "invitations remplacer" on invitations for update using (auth.uid() = de);
-- Chacun peut la retirer : celui qui l'a envoyée comme celui qui la refuse.
drop policy if exists "invitations retirer" on invitations;
create policy "invitations retirer" on invitations for delete
  using (auth.uid() = de or auth.uid() = vers);

-- Ma liste d'amis, avec l'état de chacun et le bilan face à lui. Une fonction
-- plutôt que trois requêtes : la liste se lit d'un coup, sans aller-retour.
create or replace function mes_amis()
returns table (
  id uuid, pseudo text, avatar text, en_ligne boolean, vu_le timestamptz,
  etat text, je_demande boolean, victoires bigint, defaites bigint, invitation text
) language sql security definer as $$
  select p.id, p.pseudo, p.avatar,
         (p.vu_le > now() - interval '2 minutes') as en_ligne, p.vu_le,
         a.etat,
         (a.demandeur = auth.uid()) as je_demande,
         (select count(*) from matchs m where m.joueur = auth.uid() and m.adversaire = p.id and m.gagne),
         (select count(*) from matchs m where m.joueur = auth.uid() and m.adversaire = p.id and not m.gagne),
         (select i.code from invitations i where i.de = p.id and i.vers = auth.uid())
  from amis a
  join profils p on p.id = case when a.demandeur = auth.uid() then a.destinataire else a.demandeur end
  where a.demandeur = auth.uid() or a.destinataire = auth.uid()
  order by en_ligne desc, p.pseudo;
$$;

-- ---------------------------------------------------------------------------
-- 10. Durée des matchs et couleur du texte du profil.
-- ---------------------------------------------------------------------------
alter table matchs add column if not exists duree int;                 -- en secondes
alter table profils add column if not exists texte_sombre boolean default false;

-- La vue publique reprend le réglage de couleur : c'est le visiteur qui doit
-- voir le profil tel que son propriétaire l'a réglé.
--
-- On la supprime avant de la recréer : remplacer une vue n'autorise pas à
-- insérer une colonne au milieu des autres, PostgreSQL comprend alors qu'on
-- renomme celles qui suivent et refuse. Une vue ne contient aucune donnée,
-- la supprimer ne coûte rien.
drop view if exists profils_publics;
create view profils_publics as
  select id, pseudo, avatar, banniere, couleur1, couleur2,
         statut, titre_actif, main, vu_le, texte_sombre,
         (vu_le > now() - interval '2 minutes') as en_ligne,
         matchs, victoires, defaites, points_marques, points_encaisses,
         case when matchs > 0
              then round(victoires::numeric / matchs * 100, 1)
              else 0 end as taux_victoire,
         persos, cree_le
  from profils;

-- Durée moyenne, en secondes. Ne compte que les matchs qui l'ont enregistrée :
-- les anciens n'en ont pas, et les inclure comme s'ils avaient duré zéro
-- fausserait la moyenne vers le bas.
create or replace function duree_moyenne(p_joueur uuid)
returns int language sql security definer as $$
  select coalesce(round(avg(duree))::int, 0)
  from matchs where joueur = p_joueur and duree is not null and duree > 0;
$$;

-- La fin de match enregistre désormais la durée.
create or replace function enregistrer_match_complet(
  p_adversaire uuid, p_adversaire_pseudo text,
  p_score int, p_score_adv int,
  p_perso text, p_perso_adv text, p_mode text, p_duree int default null
) returns void language plpgsql security definer as $$
declare v_gagne boolean; v_m int; v_v int; v_p int;
begin
  v_gagne := p_score > p_score_adv;

  insert into matchs (joueur, adversaire, adversaire_pseudo, score_joueur,
                      score_adversaire, perso_joueur, perso_adversaire, mode, gagne, duree)
  values (auth.uid(), p_adversaire, p_adversaire_pseudo, greatest(p_score, 0),
          greatest(p_score_adv, 0), p_perso, p_perso_adv,
          coalesce(p_mode, 'en_ligne'), v_gagne, nullif(greatest(coalesce(p_duree, 0), 0), 0));

  update profils set
    matchs = matchs + 1,
    victoires = victoires + case when v_gagne then 1 else 0 end,
    defaites = defaites + case when v_gagne then 0 else 1 end,
    points_marques = points_marques + greatest(p_score, 0),
    points_encaisses = points_encaisses + greatest(p_score_adv, 0),
    persos = jsonb_set(persos, array[p_perso],
              to_jsonb(coalesce((persos ->> p_perso)::int, 0) + 1), true),
    vu_le = now()
  where id = auth.uid()
  returning matchs, victoires, points_marques into v_m, v_v, v_p;

  insert into titres_debloques (joueur, titre)
  select auth.uid(), t.id from (values
    ('debutant', true), ('habitue', v_m >= 10), ('veteran', v_m >= 50),
    ('tireur', v_p >= 100), ('invaincu', v_v >= 10), ('legende', v_v >= 50)
  ) as t(id, gagne) where t.gagne
  on conflict do nothing;
end; $$;

-- ---------------------------------------------------------------------------
-- 11. Bannières animées. Le GIF rejoint les formats acceptés, et la limite
-- passe à 4 Mo : une animation pèse bien plus qu'une image fixe, et 2 Mo
-- rejetaient presque tout ce qui bouge.
-- ---------------------------------------------------------------------------
update storage.buckets
   set allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'],
       file_size_limit = 4194304
 where id = 'bannieres';

-- ---------------------------------------------------------------------------
-- 12. Titre du créateur. Il ne s'obtient pas en jouant : il est attribué à un
-- compte précis, et à personne d'autre. Le jeu l'affiche en dégradé animé.
-- ---------------------------------------------------------------------------
insert into titres (id, libelle, condition)
values ('createur', 'CRÉATEUR DU JEU', 'Avoir fait le jeu')
on conflict (id) do update set libelle = excluded.libelle, condition = excluded.condition;

-- Attribué par l'adresse du compte plutôt que par un identifiant recopié : on
-- sait de qui il s'agit, et la requête reste juste même si le compte change.
insert into titres_debloques (joueur, titre)
select u.id, 'createur' from auth.users u where u.email = 'noe.dub@outlook.fr'
on conflict do nothing;

-- Et on le lui pose d'office : un titre gagné qu'il faudrait encore aller
-- choisir dans une liste ne se verrait jamais.
update profils set titre_actif = 'CRÉATEUR DU JEU'
 where id in (select id from auth.users where email = 'noe.dub@outlook.fr');
