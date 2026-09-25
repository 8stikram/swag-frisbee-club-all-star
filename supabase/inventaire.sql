-- ===========================================================================
-- Swag Frisbee Club All Star — INVENTAIRE ET BOUTIQUE
--
-- À coller dans Supabase : SQL Editor, puis Run. Rejouable : le relancer ne
-- casse rien et n'efface rien. Vient APRÈS schema.sql et profils.sql.
--
-- Ce que ce fichier ajoute :
--   • ce que le joueur possède hors tenues (disques, dos de cartes, bannières) ;
--   • ce qu'il porte (tenue par perso, disque, dos, bannière) ;
--   • ses favoris et ses compteurs StatTrak ;
--   • ses deux disques offerts, tirés une seule fois et gardés ;
--   • un CATALOGUE des prix, côté serveur.
--
-- Le catalogue est ici et pas dans le navigateur, parce que c'est lui qui
-- décide ce qu'on paie. Jusqu'ici `acheter_skin(p_cout)` faisait confiance au
-- prix envoyé par le jeu : n'importe qui pouvait s'acheter une tenue pour une
-- pièce depuis la console. `acheter_objet` lit le prix dans cette table.
--
-- Conséquence : une tenue ajoutée au jeu doit être ajoutée ici aussi, sinon
-- elle est invendable. C'est le prix de ne plus croire le navigateur.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Ce que porte et ce que possède un joueur.
--
-- `tenues` (profils.sql) ne bouge pas : les tenues y restent, sans préfixe,
-- pour que les anciennes versions du jeu continuent de les lire. `objets`
-- reçoit TOUT, tenues comprises, avec le préfixe du type — c'est la liste que
-- lit le nouvel inventaire.
-- ---------------------------------------------------------------------------
alter table profils add column if not exists objets text[] not null default '{}';
alter table profils add column if not exists equipement jsonb not null default '{}'::jsonb;
alter table profils add column if not exists favoris text[] not null default '{}';
alter table profils add column if not exists stattrak jsonb not null default '{}'::jsonb;
alter table profils add column if not exists disques_offerts text[];

-- Les tenues déjà achetées rejoignent `objets`, une fois.
update profils
   set objets = objets || (select coalesce(array_agg('tenue:' || t), '{}')
                             from unnest(tenues) t
                            where not (objets @> array['tenue:' || t]))
 where array_length(tenues, 1) is not null;

-- ---------------------------------------------------------------------------
-- 2. Le catalogue : un objet, son type, son prix.
--
-- Les tenues d'origine, le dos de cartes du casino et « ma bannière » n'y sont
-- pas : ils sont offerts à tout le monde, il n'y a rien à acheter.
-- Le disque 20/20 non plus : il se gagne au tutoriel.
-- ---------------------------------------------------------------------------
create table if not exists catalogue (
  id text primary key,
  type text not null,
  prix int not null default 0,
  achetable boolean not null default true
);
alter table catalogue enable row level security;
drop policy if exists "catalogue lisible" on catalogue;
create policy "catalogue lisible" on catalogue for select using (true);

insert into catalogue (id, type, prix) values
  -- Tenues : 200 pour un skin redessiné, 100 pour un chroma (une variante de
  -- couleur de la tenue d'origine).
  ('tenue:naruto:hokage', 'tenue', 200),
  ('tenue:naruto:ermite', 'tenue', 200),
  ('tenue:naruto:thelast', 'tenue', 200),
  ('tenue:naruto:minato', 'tenue', 200),
  ('tenue:leon:re2', 'tenue', 200),
  ('tenue:leon:re4', 'tenue', 200),
  ('tenue:leon:darkside', 'tenue', 200),
  ('tenue:leon:requiem', 'tenue', 200),
  ('tenue:isaac:magdalene', 'tenue', 200),
  ('tenue:isaac:cain', 'tenue', 200),
  ('tenue:isaac:azazel', 'tenue', 200),
  ('tenue:isaac:eve', 'tenue', 200),
  ('tenue:chopper:toa', 'tenue', 200),
  ('tenue:jingle:smoking', 'tenue', 200),
  ('tenue:jingle:ninja', 'tenue', 200),
  ('tenue:jingle:cowboy', 'tenue', 200),
  ('tenue:jingle:halloween', 'tenue', 200),
  ('tenue:flowser:brasier', 'tenue', 100),
  ('tenue:flowser:abysse', 'tenue', 100),
  ('tenue:flowser:venin', 'tenue', 100),
  ('tenue:flowser:albinos', 'tenue', 100),
  ('tenue:hollis:corbeau', 'tenue', 100),
  ('tenue:hollis:cerise', 'tenue', 100),
  ('tenue:hollis:argent', 'tenue', 100),
  ('tenue:hollis:glacier', 'tenue', 100),
  ('tenue:yoshi:rouge', 'tenue', 100),
  ('tenue:yoshi:bleu', 'tenue', 100),
  ('tenue:yoshi:jaune', 'tenue', 100),
  ('tenue:yoshi:violet', 'tenue', 100),
  ('tenue:yoshi:cyan', 'tenue', 100),
  ('tenue:yoshi:orange', 'tenue', 100),
  ('tenue:yoshi:rose', 'tenue', 100),
  ('tenue:yoshi:noir', 'tenue', 100),
  ('tenue:yoshi:blanc', 'tenue', 100),
  -- Disques : 50 pièces. Deux sont offerts à chaque compte (voir plus bas).
  ('disque:captain', 'disque', 50),
  ('disque:palestine', 'disque', 50),
  ('disque:israel', 'disque', 50),
  ('disque:galaxy', 'disque', 50),
  ('disque:glitch', 'disque', 50),
  ('disque:gelatine', 'disque', 50),
  ('disque:pegasus', 'disque', 50),
  ('disque:vody', 'disque', 50),
  ('disque:coaster', 'disque', 50),
  ('disque:jack', 'disque', 50),
  -- Dos de cartes et bannières : le premier lot.
  ('dos:neon', 'dos', 100),
  ('dos:noel', 'dos', 150),
  ('dos:holo', 'dos', 250),
  ('banniere:coucher', 'banniere', 100),
  ('banniere:terrain', 'banniere', 150),
  ('banniere:galaxie', 'banniere', 250),
  -- Le compteur StatTrak™, acheté objet par objet.
  ('stattrak', 'option', 25)
on conflict (id) do update set type = excluded.type, prix = excluded.prix, achetable = true;

-- ---------------------------------------------------------------------------
-- 3. Acheter.
--
-- Une seule requête débite et ajoute : on ne peut pas passer sous zéro entre
-- la vérification et le débit, ni payer sans recevoir.
-- ---------------------------------------------------------------------------
create or replace function acheter_objet(p_objet text)
returns jsonb language plpgsql security definer as $$
declare v_prix int; v_type text; v_pieces int; v_objets text[];
begin
  select prix, type into v_prix, v_type from catalogue where id = p_objet and achetable;
  if v_prix is null then raise exception 'objet introuvable'; end if;

  select objets into v_objets from profils where id = auth.uid();
  if v_objets @> array[p_objet] then raise exception 'objet deja possede'; end if;

  update profils set
    pieces = pieces - v_prix,
    objets = objets || p_objet,
    -- Une tenue rejoint aussi l'ancienne liste, que lisent les versions
    -- précédentes du jeu.
    tenues = case when v_type = 'tenue' and not (tenues @> array[substring(p_objet from 7)])
                  then tenues || substring(p_objet from 7) else tenues end
   where id = auth.uid() and pieces >= v_prix
   returning pieces, objets into v_pieces, v_objets;

  if v_pieces is null then raise exception 'pas assez de pieces'; end if;
  return jsonb_build_object('pieces', v_pieces, 'objets', v_objets);
end; $$;

-- Le StatTrak™ d'un objet : 25 pièces, compteur à zéro, une seule fois.
create or replace function acheter_stattrak(p_objet text)
returns jsonb language plpgsql security definer as $$
declare v_prix int; v_pieces int; v_st jsonb;
begin
  select prix into v_prix from catalogue where id = 'stattrak' and achetable;
  if v_prix is null then raise exception 'stattrak indisponible'; end if;
  select stattrak into v_st from profils where id = auth.uid();
  if v_st ? p_objet then raise exception 'stattrak deja pose'; end if;

  update profils set
    pieces = pieces - v_prix,
    stattrak = stattrak || jsonb_build_object(p_objet, jsonb_build_object('v', 0, 'm', 0))
   where id = auth.uid() and pieces >= v_prix
   returning pieces, stattrak into v_pieces, v_st;

  if v_pieces is null then raise exception 'pas assez de pieces'; end if;
  return jsonb_build_object('pieces', v_pieces, 'stattrak', v_st);
end; $$;

-- Un match joué : +1 match sur chaque objet équipé qui a un StatTrak™, +1
-- victoire si c'est gagné. Les objets sans compteur sont ignorés.
create or replace function stattrak_match(p_objets text[], p_gagne boolean)
returns jsonb language plpgsql security definer as $$
declare v_st jsonb; o text;
begin
  select stattrak into v_st from profils where id = auth.uid();
  foreach o in array coalesce(p_objets, '{}') loop
    if v_st ? o then
      v_st := jsonb_set(v_st, array[o, 'm'], to_jsonb(coalesce((v_st -> o ->> 'm')::int, 0) + 1));
      if p_gagne then
        v_st := jsonb_set(v_st, array[o, 'v'], to_jsonb(coalesce((v_st -> o ->> 'v')::int, 0) + 1));
      end if;
    end if;
  end loop;
  update profils set stattrak = v_st where id = auth.uid();
  return v_st;
end; $$;

-- ---------------------------------------------------------------------------
-- 4. Les deux disques offerts.
--
-- Tirés UNE fois, côté serveur, et gardés : recharger la page ou vider son
-- cache ne doit pas permettre de relancer le tirage jusqu'à tomber sur les
-- deux qu'on préfère. Le jeu envoie la liste des disques vendus du moment,
-- pour que le tirage ne tombe jamais sur une récompense ni sur un disque
-- retiré depuis.
-- ---------------------------------------------------------------------------
create or replace function disques_offerts(p_candidats text[])
returns text[] language plpgsql security definer as $$
declare v text[];
begin
  select profils.disques_offerts into v from profils where id = auth.uid();
  if v is not null and array_length(v, 1) >= 2 then return v; end if;
  select array_agg(x) into v from (select unnest(p_candidats) x order by random() limit 2) t;
  update profils set disques_offerts = v, objets = objets || v where id = auth.uid();
  return v;
end; $$;

-- ---------------------------------------------------------------------------
-- 5. La vue publique ne change pas.
--
-- Ce qu'on possède, ce qu'on aime et ses compteurs ne regardent que soi :
-- `objets`, `favoris`, `stattrak` et `equipement` restent hors de
-- profils_publics, qui ne liste que des colonnes choisies une à une.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 6. Les caisses du casino donnent aussi des disques, des dos de cartes et
-- des bannières.
--
-- La caisse paie SON prix — moins cher que la boutique, c'est ce qu'on paie en
-- renonçant à choisir — puis l'objet est offert. Le débit passe par
-- `ajouter_pieces`, comme pour les caisses de tenues ; cette fonction-ci ne
-- fait que poser l'objet sur le compte.
--
-- Même limite que `debloquer_tenue`, qui existe depuis toujours : c'est le jeu
-- qui dit ce qu'il a gagné. Un tirage arbitré par la base demanderait qu'elle
-- connaisse aussi le contenu des caisses ; ce sera à faire le jour où ça
-- comptera vraiment.
-- ---------------------------------------------------------------------------
create or replace function debloquer_objet(p_objet text)
returns text[] language sql security definer as $$
  update profils
     set objets = case when objets @> array[p_objet] then objets else objets || p_objet end
   where id = auth.uid()
  returning objets;
$$;
