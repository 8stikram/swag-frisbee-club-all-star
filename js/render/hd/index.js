// ---------------------------------------------------------------------------
// LES TERRAINS HD EN JEU.
//
// render.js demande ici le terrain de la map en cours (dessinerTerrainHD) et
// la neige du Pôle Nord (dessinerNeigeHD). Chaque terrain a son rendu en pixel
// art (render/hd/<terrain>.js), retenu sur les maquettes mockups/*-hd.html ;
// il est créé à la première demande, et ce module lui passe l'état du match
// dont il a besoin : l'heure, le flash de chaque cage, les cercles bonus et le
// score du Stadium, les étoiles filantes du disque Galaxie.
//
// Ce qui reste peint au canevas, exprès : la tempête de Dune de Râ et la brume
// de Raccoon City. Ce sont des règles de jeu, par-dessus les joueurs, dont la
// lisibilité a été mesurée telle qu'elle est (game/desert.js, game/brume.js).
//
// Règle pour chaque terrain, y compris les prochains : les cages sont tirées
// de l'univers du terrain et ne ressemblent à celles d'aucun autre (radeau et
// voiles aux Îles du Destin, makimono et shimenawa à Konoha, stands de tir à
// cibles à la fête foraine, quais de chargement Overwatch à Gibraltar…). Les zones 3 / 5 / 3 y restent lisibles d'un coup
// d'œil, et l'embouchure est toujours marquée.
//
// Le décor est recalculé trente fois par seconde au plus, et recopié entre
// deux images : ce qui y bouge est lent, et c'est la moitié du travail en moins.
// ---------------------------------------------------------------------------
import { ctx } from '../../core/dom.js';
import { G } from '../../game/state.js';
import { getMapId } from '../../data/maps.js';
import { ZONES } from '../../game/zones.js';
import { creerPixel as station } from './station.js';
import { creerPixel as stadium } from './stadium.js';
import { creerPixel as dune } from './dune.js';
import { creerPixel as poleNord, dessinerNeige } from './pole-nord.js';
import { creerPixel as raccoon } from './raccoon.js';
import { creerPixel as temple } from './temple.js';
import { creerPixel as iles } from './iles.js';
import { creerPixel as konoha } from './konoha.js';
import { creerPixel as fete } from './fete.js';
import { creerPixel as gibraltar } from './gibraltar.js';

// Identifiants de data/maps.js. La salle d'entraînement ('dojo') n'y est pas :
// elle est nue exprès, rien n'y doit détourner l'œil.
const FABRIQUES = { arena: station, stadium, dune, polenord: poleNord, raccoon, temple, iles, konoha, fete, gibraltar };
const PAS = 1 / 30;
const rendus = new Map();

function rendu(id) {
  let r = rendus.get(id);
  if (!r && FABRIQUES[id]) {
    r = { r: FABRIQUES[id](), img: null, t: -1, miroir: null };
    rendus.set(id, r);
  }
  return r;
}

export function aUnTerrainHD(id = getMapId()) { return !!FABRIQUES[id]; }

// L'écran géant du Stadium : les deux noms et le score, dans l'ordre où les
// joueurs apparaissent à l'écran — celui de gauche d'abord, comme le HUD.
function texteEcran(miroir) {
  if (!G.p1 || !G.p2 || G.demo) return null;
  const [g, d] = miroir ? [G.p2, G.p1] : [G.p1, G.p2];
  const nom = p => {
    const s = String((p.char && p.char.short) || '').toUpperCase();
    return s.length > 8 ? s.split(' ')[0].slice(0, 8) : s;
  };
  const complet = `${nom(g)} ${g.score} - ${d.score} ${nom(d)}`;
  return complet.length <= 26 ? complet : `${g.score} - ${d.score}`;
}

function extras(id, miroir) {
  const but = Math.max(G.goalFlash[0], G.goalFlash[1]);
  const e = { miroir, butG: G.goalFlash[0], butD: G.goalFlash[1] };
  if (id === 'stadium') {
    // Même public que drawGradins() : plus calme à l'entraînement, debout au
    // but et pendant le zoom d'un plongeon parfait.
    const calme = G.training ? .35 : 1;
    e.calme = calme;
    e.leve = Math.min(1, but * 1.5 + (G.zoom ? 1 : 0)) * calme;
    e.cercles = G.cercles;
    e.dureeCercle = ZONES.DUREE;
    e.ecran = texteEcran(miroir);
  } else if (id === 'arena') e.filantes = G.filantes;
  else if (id === 'polenord') e.neigeAPart = true;
  return e;
}

// Peint le terrain HD de la map en cours dans `ctx`, avec la transformation
// en place. Renvoie false si la map n'en a pas (la salle d'entraînement).
export function dessinerTerrainHD() {
  const id = getMapId();
  const r = rendu(id);
  if (!r) return false;
  // Le monde est-il retourné (invité en ligne) ? On le lit sur la
  // transformation en cours plutôt que sur enMiroir() : l'écran de choix du
  // terrain peint aussi par ici, sans miroir, même chez l'invité.
  const miroir = ctx.getTransform().a < 0;
  const t = G.now;
  if (!r.img || r.miroir !== miroir || t < r.t || t - r.t >= PAS) {
    r.img = r.r.image(t, Math.max(G.goalFlash[0], G.goalFlash[1]), extras(id, miroir));
    r.t = t; r.miroir = miroir;
  }
  ctx.drawImage(r.img, 0, 0);
  return true;
}

// La neige du Pôle Nord, en espace écran et par-dessus tout, comme
// drawNeigeNoel(). Renvoie false hors du Pôle Nord.
export function dessinerNeigeHD() {
  if (getMapId() !== 'polenord') return false;
  dessinerNeige(ctx, G.now);
  return true;
}

// Prépare les fonds fixes des terrains quand le navigateur n'a rien
// d'autre à faire. Chacun coûte quelques centaines de millisecondes la
// première fois : sans ça, l'écran de choix du terrain se figeait en peignant
// ses six vignettes d'un coup.
export function prechaufferTerrainsHD() {
  const ids = Object.keys(FABRIQUES);
  let i = 0;
  const planifier = () => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(suivant, { timeout: 5000 });
    else setTimeout(suivant, 500);
  };
  const suivant = () => {
    while (i < ids.length && rendus.has(ids[i])) i++;
    if (i >= ids.length) return;
    rendu(ids[i++]);
    planifier();
  };
  planifier();
}
