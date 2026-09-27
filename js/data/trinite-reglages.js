// ---------------------------------------------------------------------------
// TRINITÉ, l'ultime de Sora — les réglages VALIDÉS par l'utilisateur dans les
// mockups d'animation, repris tels quels depuis leurs fichiers :
//   mockups/sora-trinity-anim.reglages.json    (l'apparition et le départ)
//   mockups/sora-trinity-dingo.reglages.json   (Dingo gardien)
//   mockups/sora-trinity-donald.reglages.json  (Donald et le Brasier)
// La logique (js/game/trinite.js) et le rendu (js/render/trinity-anim.js) les
// lisent tous les deux : les minutages du jeu et ceux de l'image ne peuvent
// pas diverger. Aucune dépendance, pour ne fermer aucun cycle d'import.
// ---------------------------------------------------------------------------
export const R_APPARITION = {"flashOuverture": 0.12, "flashExtinction": 0.45, "flashRayon": 38, "flashIntensite": 0.9, "flashRayons": 10, "apparition": 0.06, "decalage": 0.1, "pop": 1.08, "popDuree": 0.3, "blanchiment": 0.9, "blanchimentDuree": 0.25, "transitionDebut": 0.25, "transitionDuree": 0.6, "presence": 5, "respiration": 1, "retourE": 0.35, "dissolution": 0.5, "montee": 14, "etincelles": 26};
export const R_DINGO = {"cycle": 0.52, "cuisse": 24, "genou": 55, "pied": 16, "bras": 35, "rebond": 3, "penche": 8, "tete": 4, "flexion": 3, "respiration": 1, "armeDuree": 0.14, "armeAngle": 55, "frappeDuree": 0.08, "frappeAngle": 75, "retourDuree": 0.34, "depassement": 0.35, "torsion": 10, "pas": 5, "trainee": 0.8, "transition": 0.2, "squash": 0.07, "ressort": 1, "oreilles": 22, "chapeau": 10, "arret": 0.07, "secousse": 6, "anneau": 1, "etincelles": 10, "poussiere": 6, "clignement": 1};
export const R_DONALD = {"cycle": 0.3, "jambes": 22, "pied": 14, "dandine": 7, "rebond": 2.2, "brasTrot": 14, "queue": 20, "tapote": 1, "respiration": 1, "armeDuree": 0.22, "armeAngle": 95, "tourDuree": 0.38, "tours": 1, "lancerDuree": 0.1, "lancerAngle": 28, "retourDuree": 0.32, "depassement": 0.35, "bec": 16, "cercle": 30, "vol": 0.38, "arc": 18, "boule": 6, "attente": 0.75, "flammes": 1.4, "trainee": 1, "transition": 0.18, "squash": 0.08, "ressort": 1, "bonnet": 16, "arret": 0.06, "secousse": 5, "etincelles": 14, "clignement": 1};

// L'ultime dure le temps de présence validé ; le départ (retour en E puis
// dissolution) se joue ensuite, sans plus rien arbitrer.
export const TRINITE_DUREE = R_APPARITION.presence;
export const TRINITE_DEPART = R_APPARITION.retourE + R_APPARITION.dissolution;

// Les quatre temps de l'incantation de Donald, et la boule de feu.
export const INCANTE = (() => {
  const a = R_DONALD.armeDuree, b = a + R_DONALD.tourDuree, c = b + R_DONALD.lancerDuree;
  return { arme: a, tour: b, lancer: c, fin: c + R_DONALD.retourDuree };
})();
export const BRASIER_VOL = R_DONALD.vol;
// Le coup de bouclier de Dingo : armé, frappe, arrêt sur image, retour.
export const COUP_DINGO = R_DINGO.armeDuree + R_DINGO.frappeDuree + R_DINGO.arret + R_DINGO.retourDuree;
