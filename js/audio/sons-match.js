// ---------------------------------------------------------------------------
// Bruitages du cœur du match, tels que choisis dans mockups/sfx-coeur.html
// (réglages d'origine : mockups/sfx-coeur.reglages.json). Chaque son superpose
// plusieurs groupes de couches ; `niveau` aligne tous les sons sur la même
// intensité perçue — la fenêtre de 100 ms la plus forte, pondérée comme
// l'oreille, à force .6 — calée sur la moyenne des anciens bips pour ne pas
// changer l'équilibre avec la musique. Données pures, jouées par moteur-sfx.js.
// ---------------------------------------------------------------------------
export const SONS_MATCH = {
  throw: { niveau: 0.723, groupes: [
    // A — Fouet
    { gain: 1, decalage: 0, hauteur: 0, longueur: 2, couches: [
      {"t": "bruit", "f": [2600, 900], "q": 1.3, "a": 0.004, "d": 0.15, "g": 0.0812, "sf": 1},
      {"t": "ton", "onde": "sawtooth", "f": [240, 700], "d": 0.08, "g": 0.0128, "sf": 0.5},
      {"t": "ton", "f": [130, 55], "d": 0.08, "g": 0.0855, "sf": 1}
    ] },
    // B — Coup de poignet
    { gain: 1, decalage: 0, hauteur: 0, longueur: 2, couches: [
      {"t": "clic", "g": 0.1345},
      {"t": "modes", "partiels": [[620, 0.05, 1], [1450, 0.03, 0.45], [2900, 0.02, 0.2]], "g": 0.0628},
      {"t": "bruit", "f": [1200, 3800], "q": 0.8, "a": 0.02, "d": 0.2, "g": 0.1166, "sf": 0.8}
    ] },
    // C — Frappe
    { gain: 2, decalage: 0, hauteur: -12, longueur: 1, couches: [
      {"t": "ton", "f": [170, 48], "d": 0.1, "g": 0.0811, "sf": 1},
      {"t": "bruit", "filtre": "highpass", "f": [3200], "d": 0.05, "g": 0.0324},
      {"t": "bruit", "f": [1900, 700], "a": 0.01, "d": 0.2, "g": 0.0295, "sf": 0.6}
    ] },
    // D — Souffle long
    { gain: 1, decalage: 0.08, hauteur: 0, longueur: 2, couches: [
      {"t": "bruit", "filtre": "lowpass", "f": [1400, 380], "q": 0.7, "a": 0.03, "d": 0.32, "g": 0.0996, "sf": 1.2}
    ] },
    // E — Claquement sec
    { gain: 1, decalage: 0, hauteur: 0, longueur: 2, couches: [
      {"t": "clic", "g": 0.1487},
      {"t": "ton", "onde": "square", "f": [1300, 650], "d": 0.03, "g": 0.0212}
    ] }
  ] },
  superthrow: { niveau: 0.277, groupes: [
    // A — Canon
    { gain: 2, decalage: 0, hauteur: -5, longueur: 1, couches: [
      {"t": "ton", "f": [95, 34], "d": 0.38, "g": 0.117},
      {"t": "bruit", "filtre": "lowpass", "f": [1000, 200], "d": 0.42, "g": 0.0635},
      {"t": "ton", "onde": "sawtooth", "f": [280, 1200], "d": 0.18, "g": 0.015},
      {"t": "clic", "g": 0.0668}
    ] },
    // B — Déchirure
    { gain: 2, decalage: 0, hauteur: -12, longueur: 1, couches: [
      {"t": "bruit", "f": [500, 5200], "q": 2, "a": 0.01, "d": 0.36, "g": 0.1276},
      {"t": "fm", "f": [220, 900], "ratio": 1.41, "indice": [6, 1], "d": 0.28, "g": 0.0273},
      {"t": "ton", "f": [110, 45], "d": 0.2, "g": 0.1367}
    ] },
    // C — Réacteur
    { gain: 0.75, decalage: 0.005, hauteur: 7, longueur: 2, couches: [
      {"t": "bruit", "f": [380, 1700], "q": 0.9, "a": 0.04, "d": 0.6, "g": 0.1643},
      {"t": "bruit", "filtre": "highpass", "f": [4500], "a": 0.02, "d": 0.3, "g": 0.0387},
      {"t": "ton", "f": [58, 48], "a": 0.02, "d": 0.5, "g": 0.1691},
      {"t": "clic", "g": 0.1449}
    ] },
    // D — Sub
    { gain: 2, decalage: 0, hauteur: 0, longueur: 2, couches: [
      {"t": "ton", "f": [62, 30], "d": 0.55, "g": 0.1135}
    ] }
  ] },
  bounce: { niveau: 0.701, groupes: [
    // A — Pong gras
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "ton", "onde": "triangle", "f": [250, 105], "d": 0.09, "g": 0.1836, "sf": 1},
      {"t": "bruit", "f": [950], "d": 0.05, "g": 0.0734, "sf": 0.6},
      {"t": "clic", "g": 0.0688}
    ] },
    // C — Impact + matière
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "ton", "f": [160, 58], "d": 0.08, "g": 0.1295, "sf": 1},
      {"t": "modes", "mat": true, "g": 0.0518, "sf": 0.8},
      {"t": "clic", "g": 0.0518}
    ] },
    // D — Queue du mur
    { gain: 1.8, decalage: -0.005, hauteur: 0, longueur: 1, couches: [
      {"t": "bruit", "f": [700, 400], "q": 1.5, "d": 0.26, "g": 0.24, "delai": 0.02, "sf": 1}
    ] }
  ] },
  catch: { niveau: 0.517, groupes: [
    // A — Claque
    { gain: 0.55, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "ton", "f": [430, 170], "d": 0.09, "g": 0.1888},
      {"t": "bruit", "f": [1150], "d": 0.06, "g": 0.1187, "sf": 0.8},
      {"t": "clic", "g": 0.1295}
    ] },
    // B — Gant
    { gain: 0.85, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "bruit", "filtre": "lowpass", "f": [2600, 700], "d": 0.07, "g": 0.1786, "sf": 1},
      {"t": "ton", "f": [140, 78], "d": 0.09, "g": 0.1518, "sf": 1},
      {"t": "modes", "partiels": [[560, 0.03, 1], [1300, 0.02, 0.4]], "g": 0.0446}
    ] },
    // D — Ancrage grave
    { gain: 2, decalage: 0, hauteur: 0, longueur: 1.8, couches: [
      {"t": "ton", "f": [92, 52], "d": 0.13, "g": 0.1042, "sf": 1.3}
    ] }
  ] },
  dash: { niveau: 0.876, groupes: [
    // A — Swoosh
    { gain: 1.8, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "bruit", "f": [900, 3400], "q": 1.6, "a": 0.02, "d": 0.16, "g": 0.2506}
    ] },
    // B — Baskets
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "bruit", "filtre": "lowpass", "f": [600], "d": 0.07, "g": 0.2951},
      {"t": "ton", "f": [2500, 2150], "d": 0.06, "g": 0.0263, "delai": 0.01},
      {"t": "bruit", "f": [1800, 3000], "q": 1.2, "a": 0.02, "d": 0.1, "g": 0.1265, "delai": 0.02}
    ] },
    // C — Ancien amélioré
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "bruit", "f": [2600, 1800], "d": 0.14, "g": 0.061},
      {"t": "ton", "f": [500, 900], "d": 0.1, "g": 0.0136},
      {"t": "ton", "f": [110, 60], "d": 0.06, "g": 0.1017}
    ] },
    // D — Pas lourd
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "ton", "f": [120, 58], "d": 0.06, "g": 0.067},
      {"t": "bruit", "filtre": "lowpass", "f": [420], "d": 0.06, "g": 0.0353}
    ] }
  ] },
  dive: { niveau: 2.264, groupes: [
    // B — Tissu au sol
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "bruit", "f": [800, 520], "q": 0.7, "a": 0.05, "d": 0.42, "g": 0.0608, "delai": 0.1},
      {"t": "clic", "g": 0.0468, "delai": 0.1},
      {"t": "ton", "f": [90, 55], "d": 0.1, "g": 0.0748, "delai": 0.1}
    ] },
    // D — Poussière
    { gain: 0.45, decalage: -0.02, hauteur: 0, longueur: 1, couches: [
      {"t": "bruit", "filtre": "highpass", "f": [2600], "a": 0.05, "d": 0.3, "g": 0.0154, "delai": 0.12}
    ] }
  ] },
  perfect: { niveau: 0.261, groupes: [
    // A — Cristal
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "clic", "g": 0.1663},
      {"t": "ton", "f": [85, 40], "d": 0.22, "g": 0.2613},
      {"t": "ton", "f": [1320], "d": 0.55, "g": 0.0475},
      {"t": "ton", "f": [1760], "d": 0.4, "g": 0.0333, "delai": 0.01},
      {"t": "ton", "f": [2640], "d": 0.28, "g": 0.0214, "delai": 0.02}
    ] },
    // B — Ralenti
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "ton", "f": [210, 55], "d": 0.6, "g": 0.1326},
      {"t": "bruit", "filtre": "lowpass", "f": [3200, 250], "d": 0.55, "g": 0.0648},
      {"t": "ton", "onde": "triangle", "f": [1760, 1700], "d": 0.6, "g": 0.0147}
    ] },
    // C — Arpège
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "ton", "onde": "square", "f": [990], "d": 0.1, "g": 0.0993},
      {"t": "ton", "onde": "square", "f": [1320], "d": 0.1, "g": 0.0993, "delai": 0.04},
      {"t": "ton", "onde": "square", "f": [1760], "d": 0.12, "g": 0.0993, "delai": 0.08},
      {"t": "ton", "onde": "square", "f": [2640], "d": 0.16, "g": 0.0794, "delai": 0.12},
      {"t": "bruit", "filtre": "highpass", "f": [4000], "d": 0.12, "g": 0.0993}
    ] },
    // D — Choc
    { gain: 1.45, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "ton", "f": [72, 30], "d": 0.3, "g": 0.2042},
      {"t": "bruit", "filtre": "lowpass", "f": [520], "d": 0.2, "g": 0.1021}
    ] }
  ] },
  // But à 3 points (mockups/sfx-but.html) : POW, filet, sub, cuivres, clameur.
  goal: { niveau: 0.435, groupes: [
    // A — POW arcade
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "clic", "g": 0.0396},
      {"t": "ton", "f": [150, 40], "d": 0.18, "g": 0.0634, "sat": 3},
      {"t": "bruit", "f": [3000, 800], "q": 0.7, "d": 0.09, "g": 0.0396, "sat": 2},
      {"t": "ton", "onde": "square", "f": [220, 110], "d": 0.1, "g": 0.0056}
    ] },
    // C — Filet qui tremble
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "filet", "f": 2200, "d": 0.55, "g": 0.4012},
      {"t": "bruit", "f": [420, 300], "q": 0.8, "d": 0.4, "g": 0.1605}
    ] },
    // D — Sub
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "ton", "f": [50, 26], "d": 0.9, "g": 0.2281}
    ] },
    // F — Ta-daaa cuivres
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "cuivre", "notes": [392, 493.88, 587.33], "a": 0.02, "tenue": 0.06, "d": 0.1, "filtre": [600, 3200], "g": 0.0444, "delai": 0.05},
      {"t": "cuivre", "notes": [523.25, 659.25, 783.99], "a": 0.03, "tenue": 0.35, "d": 0.5, "filtre": [600, 3600], "vibrato": 14, "g": 0.0493, "delai": 0.2}
    ] },
    // I — Clameur
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "clameur", "a": 0.25, "tenue": 0.5, "d": 1.6, "g": 0.0718, "sifflets": 3, "applaudissements": 25, "delai": 0.05}
    ] }
  ] },
  // But à 5 points : la même base, plus l'explosion, le klaxon, la clameur géante
  // et les confettis. Calé 2 dB au-dessus des autres sons : il doit s'entendre plus gros.
  goal5: { niveau: 0.456, groupes: [
    // A — POW arcade
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "clic", "g": 0.0396},
      {"t": "ton", "f": [150, 40], "d": 0.18, "g": 0.0634, "sat": 3},
      {"t": "bruit", "f": [3000, 800], "q": 0.7, "d": 0.09, "g": 0.0396, "sat": 2},
      {"t": "ton", "onde": "square", "f": [220, 110], "d": 0.1, "g": 0.0056}
    ] },
    // B — Explosion
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "clic", "g": 0.026},
      {"t": "ton", "f": [90, 28], "d": 0.9, "g": 0.0468, "sat": 2.5},
      {"t": "bruit", "filtre": "lowpass", "f": [5000, 120], "d": 1.1, "g": 0.0312, "sat": 1.5},
      {"t": "crepitement", "n": 30, "d": 0.9, "g": 0.013, "f": 2500, "delai": 0.05}
    ] },
    // C — Filet qui tremble
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "filet", "f": 2200, "d": 0.55, "g": 0.4012},
      {"t": "bruit", "f": [420, 300], "q": 0.8, "d": 0.4, "g": 0.1605}
    ] },
    // D — Sub
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "ton", "f": [50, 26], "d": 0.9, "g": 0.2281}
    ] },
    // E — Klaxon de but
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "cuivre", "notes": [233.08, 293.66, 349.23], "a": 0.05, "tenue": 0.55, "d": 0.35, "filtre": [400, 2600], "desaccord": 10, "vibrato": 10, "g": 0.0479, "delai": 0.08}
    ] },
    // F — Ta-daaa cuivres
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "cuivre", "notes": [392, 493.88, 587.33], "a": 0.02, "tenue": 0.06, "d": 0.1, "filtre": [600, 3200], "g": 0.0444, "delai": 0.05},
      {"t": "cuivre", "notes": [523.25, 659.25, 783.99], "a": 0.03, "tenue": 0.35, "d": 0.5, "filtre": [600, 3600], "vibrato": 14, "g": 0.0493, "delai": 0.2}
    ] },
    // I — Clameur
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "clameur", "a": 0.25, "tenue": 0.5, "d": 1.6, "g": 0.0718, "sifflets": 3, "applaudissements": 25, "delai": 0.05}
    ] },
    // J — Clameur géante
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "clameur", "a": 0.2, "tenue": 1, "d": 2.2, "g": 0.0664, "sifflets": 8, "applaudissements": 60, "delai": 0.05}
    ] },
    // K — Confettis
    { gain: 1, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "crepitement", "n": 40, "d": 1.2, "g": 0.1216, "f": 5000, "delai": 0.1},
      {"t": "fm", "f": [2637], "ratio": 2.7, "indice": [3, 0.4], "d": 0.5, "g": 0.0304, "delai": 0.15},
      {"t": "fm", "f": [3136], "ratio": 2.7, "indice": [3, 0.4], "d": 0.5, "g": 0.0243, "delai": 0.3}
    ] }
  ] }
};
