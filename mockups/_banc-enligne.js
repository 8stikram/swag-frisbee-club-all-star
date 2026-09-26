// Banc du mode en ligne : à coller dans chaque onglet (hôte et invité).
// window.__banc.perte = 0.4 → jette 40 % des messages du canal 'jeu' (hors ping).
window.__banc = { perte: 0, log: [], errs: [] };
window.addEventListener('error', e => window.__banc.errs.push(e.message));
window.addEventListener('unhandledrejection', e => window.__banc.errs.push('rejet: ' + (e.reason && e.reason.message || e.reason)));
(() => {
  const vrai = RTCDataChannel.prototype.send;
  RTCDataChannel.prototype.send = function (d) {
    let t = '?'; try { t = JSON.parse(d).t; } catch (e) { }
    if (this.label === 'jeu' && t !== 'ping' && t !== 'pong' && Math.random() < window.__banc.perte) {
      if (!['e', 'c', 's'].includes(t)) window.__banc.log.push('PERDU ' + t);
      return;
    }
    if (!['e', 'c', 's', 'ping', 'pong'].includes(t)) window.__banc.log.push('→ ' + t + ' [' + this.label + ']');
    return vrai.call(this, d);
  };
})();
window.__banc.choisir = async (indice) => {
  document.querySelectorAll('.scr-select .cell')[indice].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 400));
  document.querySelector('.skinTile.r-base').click();
};
window.__banc.lancer = () => document.querySelector('.scr-maps [data-act=startMatch]').click();
window.__banc.etat = async () => {
  const dm = await import('/js/core/dom.js'), st = await import('/js/game/state.js'), cx = await import('/js/reseau/connexion.js');
  return { ecran: dm.curScreen, etat: st.G.state, demo: st.G.demo, persos: [st.G.p1 && st.G.p1.ck, st.G.p2 && st.G.p2.ck], reseau: cx.Reseau.etat, log: window.__banc.log.slice(-8), errs: window.__banc.errs };
};
'banc prêt';
