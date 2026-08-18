// ---------------------------------------------------------------------------
// Liaison directe entre deux navigateurs.
//
// Aucun serveur ne voit passer une seule image de jeu : les deux navigateurs
// se parlent en direct. Il faut seulement qu'ils se présentent une première
// fois, et cette présentation tient dans deux bouts de texte que les joueurs
// s'échangent eux-mêmes — par Discord, par SMS, comme ils veulent.
//
// Un service pourra plus tard porter ces deux textes à leur place, pour
// remplacer le copier-coller par un code à cinq lettres. Rien d'autre ne
// changera ici : c'est déjà la même mécanique.
//
// L'hôte fabrique une invitation, l'invité en fabrique une réponse, l'hôte
// l'accepte. À partir de là le canal est ouvert dans les deux sens.
// ---------------------------------------------------------------------------

// Serveurs publics qui servent uniquement à découvrir sa propre adresse
// visible depuis l'extérieur. Ils ne relaient aucune donnée.
const GLACE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export const Reseau = {
  etat: 'ferme',   // ferme | attente | connecte | perdu
  role: null,      // hote | invite
  ping: 0
};

let pc = null, canal = null;
let auMessage = null, auChangement = null;

export function surMessage(fn) { auMessage = fn; }
export function surChangement(fn) { auChangement = fn; }
function etat(e) { Reseau.etat = e; if (auChangement) auChangement(e); }

// Le texte échangé est encodé sur une ligne : une description de connexion
// contient des retours à la ligne, qui se font massacrer dès qu'on la colle
// dans une messagerie.
function emballer(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
function deballer(txt) { return JSON.parse(decodeURIComponent(escape(atob(txt.trim())))); }

// On attend d'avoir trouvé toutes ses adresses avant de produire le texte.
// Sinon il faudrait en envoyer d'autres au fil de l'eau, ce qui suppose déjà
// un canal ouvert — exactement ce qu'on est en train d'établir.
function attendreAdresses(p) {
  return new Promise(resolve => {
    if (p.iceGatheringState === 'complete') return resolve();
    const verif = () => {
      if (p.iceGatheringState === 'complete') {
        p.removeEventListener('icegatheringstatechange', verif);
        resolve();
      }
    };
    p.addEventListener('icegatheringstatechange', verif);
    // Filet : certaines configurations ne signalent jamais la fin.
    setTimeout(resolve, 2500);
  });
}

function brancherCanal(c) {
  canal = c;
  c.onopen = () => etat('connecte');
  c.onclose = () => etat('perdu');
  c.onmessage = e => {
    let m; try { m = JSON.parse(e.data); } catch (err) { return; }
    if (m.t === 'ping') { envoyer({ t: 'pong', h: m.h }); return; }
    if (m.t === 'pong') { Reseau.ping = Math.round(performance.now() - m.h); return; }
    if (auMessage) auMessage(m);
  };
}

function nouvellePc() {
  const p = new RTCPeerConnection({ iceServers: GLACE });
  p.onconnectionstatechange = () => {
    if (['failed', 'disconnected', 'closed'].includes(p.connectionState)) etat('perdu');
  };
  return p;
}

// --- Côté hôte -------------------------------------------------------------
export async function heberger() {
  fermer();
  Reseau.role = 'hote'; etat('attente');
  pc = nouvellePc();
  // Le canal est créé par l'hôte ; l'invité le reçoit tout ouvert.
  // ordered/maxRetransmits : les intentions de jeu sont périssables, une
  // ancienne qu'on retransmettrait indéfiniment n'a plus aucune valeur.
  brancherCanal(pc.createDataChannel('jeu', { ordered: false, maxRetransmits: 0 }));
  await pc.setLocalDescription(await pc.createOffer());
  await attendreAdresses(pc);
  return emballer(pc.localDescription);
}

export async function accepterReponse(texte) {
  if (!pc) throw new Error('aucune invitation en cours');
  await pc.setRemoteDescription(deballer(texte));
}

// --- Côté invité -----------------------------------------------------------
export async function rejoindre(texteInvitation) {
  fermer();
  Reseau.role = 'invite'; etat('attente');
  pc = nouvellePc();
  pc.ondatachannel = e => brancherCanal(e.channel);
  await pc.setRemoteDescription(deballer(texteInvitation));
  await pc.setLocalDescription(await pc.createAnswer());
  await attendreAdresses(pc);
  return emballer(pc.localDescription);
}

// --- Échanges --------------------------------------------------------------
export function envoyer(obj) {
  if (canal && canal.readyState === 'open') { canal.send(JSON.stringify(obj)); return true; }
  return false;
}
export function mesurerPing() { envoyer({ t: 'ping', h: performance.now() }); }
export function connecte() { return !!canal && canal.readyState === 'open'; }

export function fermer() {
  if (canal) { try { canal.close(); } catch (e) { } canal = null; }
  if (pc) { try { pc.close(); } catch (e) { } pc = null; }
  Reseau.role = null; Reseau.ping = 0;
  etat('ferme');
}
