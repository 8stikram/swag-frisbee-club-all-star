// ---------------------------------------------------------------------------
// Banc d'équilibrage : des matchs bot contre bot, en accéléré, sans affichage.
//
// À charger dans une page du jeu (serveur local) :
//   (0, eval)(await (await fetch('/mockups/_banc-equilibrage.js')).text());
//   await __equi.preparer();
//   __equi.match('leon', 'chopper', 2, 'arena')  → { gagnant, score, duree, ... }
//
// Les deux joueurs sont des IA du même niveau. Le mode démo n'est PAS utilisé :
// il force Naruto contre Leon et coupe les ultimes. On lance un vrai match
// solo, puis on remplace le joueur humain par une IA.
// ---------------------------------------------------------------------------
window.__equi = {
  async preparer() {
    const [st, lp, cst, mp, ch, ac, au] = await Promise.all([
      import('/js/game/state.js'), import('/js/game/loop.js'), import('/js/core/constants.js'),
      import('/js/data/maps.js'), import('/js/data/characters.js'), import('/js/game/actions.js'),
      import('/js/audio/audio.js')]);
    Object.assign(this, { st, lp, cst, mp, ch, ac, au, G: st.G, ROSTER: ch.ROSTER });
    const si = document.getElementById('scr-intro'); if (si) si.hidden = true;
    return this.ROSTER.length + ' persos';
  },

  // Un match complet. `limite` : secondes de jeu au-delà desquelles on arrête
  // (un match nul par épuisement compte comme tel, pas comme une victoire).
  match(a, b, diff = 2, map = 'arena', limite = 600) {
    const { st, lp, cst, mp, G } = this;
    mp.setMapId(map); cst.applyMap();
    st.initMatch(false, a, b, diff, false);
    const p1 = st.makePlayer(a, 1, false, diff);
    G.p1 = p1; p1.foe = G.p2; G.p2.foe = p1;
    this.ac.setupServe(Math.random() < .5 ? 1 : 2);
    G.cdT = -1;
    const pas = 1 / 60; let t = 0, erreur = null;
    try {
      while (!G.winner && G.state !== 'over' && t < limite) { lp.update(pas); t += pas; }
    } catch (e) { erreur = e.message; }
    const s1 = G.p1.stats, s2 = G.p2.stats;
    return {
      a, b, map, diff,
      gagnant: G.winner ? G.winner.ck : null,
      cote: G.winner ? G.winner.side : 0,
      score: [G.p1.score, G.p2.score],
      duree: Math.round(t),
      ultis: [s1.specials, s2.specials],
      buts: [s1.buts, s2.buts],
      erreur
    };
  }
};
'banc d equilibrage charge';
