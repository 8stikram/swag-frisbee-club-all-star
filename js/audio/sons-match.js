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
  goal: { niveau: 0.264, groupes: [
    // A — Filet + fanfare
    { gain: 1.3, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "bruit", "f": [420, 300], "q": 0.8, "d": 0.55, "g": 0.2302},
      {"t": "ton", "f": [62, 38], "d": 0.5, "g": 0.422},
      {"t": "ton", "onde": "square", "f": [660], "d": 0.16, "g": 0.0844, "delai": 0.05},
      {"t": "ton", "onde": "square", "f": [830], "d": 0.16, "g": 0.0844, "delai": 0.135},
      {"t": "ton", "onde": "square", "f": [990], "d": 0.16, "g": 0.0844, "delai": 0.22},
      {"t": "ton", "onde": "square", "f": [1320], "d": 0.16, "g": 0.0844, "delai": 0.305}
    ] },
    // B — Stade
    { gain: 0.3, decalage: 0, hauteur: -7, longueur: 1, couches: [
      {"t": "bruit", "f": [420, 300], "q": 0.8, "d": 0.45, "g": 0.2491},
      {"t": "ton", "f": [70, 40], "d": 0.3, "g": 0.3559},
      {"t": "foule", "a": 0.18, "d": 1.7, "g": 0.2669, "delai": 0.05}
    ] },
    // D — Boum
    { gain: 0.5, decalage: 0, hauteur: 0, longueur: 1, couches: [
      {"t": "ton", "f": [56, 28], "d": 0.7, "g": 0.333},
      {"t": "bruit", "filtre": "lowpass", "f": [320], "d": 0.45, "g": 0.1427}
    ] },
    // E — Public
    { gain: 0.2, decalage: 0, hauteur: 9, longueur: 1, couches: [
      {"t": "foule", "a": 0.2, "d": 1.8, "g": 0.2258, "delai": 0.05}
    ] }
  ] }
};
