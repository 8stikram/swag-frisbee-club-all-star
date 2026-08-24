// ---------------------------------------------------------------------------
// Le terminal qui défile pendant le Piratage de Cyberleek.
//
// Sorti de data/specials.js pour une raison d'architecture, pas de rangement :
// le réseau doit pouvoir en fabriquer un chez l'invité, or specials.js importe
// actions.js, qui importe partie.js — l'importer depuis partie.js aurait donc
// fermé un cycle. Ce module-ci n'importe rien du tout, donc il n'en ferme aucun.
//
// Le texte n'est pas transmis sur la liaison : il est purement décoratif et
// identique à chaque piratage, donc chacun fabrique le sien.
// ---------------------------------------------------------------------------

// Les lignes racontent une intrusion, du scan à la prise de contrôle, et la
// dernière dit exactement ce qui vient d'arriver au joueur d'en face.
const LIGNES_HACK = [
  '> scan_arene --cible=adversaire',
  '  [##########] 4 ports ouverts',
  '> exploit input_daemon',
  '  bypass ok — uid=0',
  '> patch commandes.axe_x *= -1',
  '> patch commandes.axe_y *= -1',
  '  $CYBERLEEK OWNS YOU',
  '> COMMANDES INVERSEES'
];

export function construireTerminal() {
  return LIGNES_HACK.map((texte, i) => ({ texte, a: i * .13 }));
}
