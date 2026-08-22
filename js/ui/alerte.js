import { $ } from '../core/dom.js';

// ---------------------------------------------------------------------------
// Bandeau d'erreur visible.
//
// Une panne silencieuse ne se raconte pas : « ça bug » ne dit ni où ni quoi.
// Toute erreur non rattrapée s'affiche donc à l'écran, en clair, avec le
// fichier et la ligne. Le joueur peut la recopier telle quelle, et on sait
// immédiatement de quoi on parle.
// ---------------------------------------------------------------------------
let boite = null;

function afficher(texte) {
  if (!boite) {
    boite = document.createElement('div');
    boite.className = 'alerteJeu';
    boite.addEventListener('click', () => { boite.classList.add('hidden'); });
    const st = $('stage');
    if (st) st.appendChild(boite); else document.body.appendChild(boite);
  }
  boite.textContent = texte;
  boite.classList.remove('hidden');
}

window.addEventListener('error', e => {
  const ou = e.filename ? (' — ' + e.filename.split('/').pop() + ':' + e.lineno) : '';
  afficher('Erreur : ' + (e.message || 'inconnue') + ou);
});
window.addEventListener('unhandledrejection', e => {
  const m = (e.reason && (e.reason.message || e.reason)) || 'inconnue';
  afficher('Erreur : ' + m);
});
