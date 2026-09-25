// ---------------------------------------------------------------------------
// FAIRE SUIVRE UNE POSE. L'atelier des tenues ne retouche que la pose debout ;
// les cinq autres (course, lancer, plongeon, dash) se déduisent d'elle, pour
// que la retouche se voie dans tout le match sans redessiner six fois.
//
// On compare la pose au debout d'ORIGINE, ligne par ligne :
// - une ligne identique reprend la ligne retouchée telle quelle — c'est le
//   cas de la tête et de presque tout le buste ;
// - sinon, chaque groupe de pixels de la ligne (une jambe, le buste et le bras
//   collé) cherche le décalage qui le fait coïncider avec le debout : s'il
//   lui ressemble assez, ses pixels communs reprennent la retouche à cet
//   endroit — une jambe écartée en course emporte ainsi sa botte retouchée ;
// - un pixel propre à la pose change de couleur comme sa couleur a changé
//   ailleurs (si tout le 'P' du debout est devenu 'K', le sien aussi).
// Un pixel ajouté sur une ligne qui bouge n'est pas recopié : il flotterait
// là où la jambe n'est plus.
// ---------------------------------------------------------------------------

// Pour chaque lettre du debout d'origine, celle qui l'a le plus souvent
// remplacée — si elle l'a remplacée au moins une fois sur deux.
function substitutions(idle0, idle1) {
  const vus = {};
  for (let y = 0; y < idle0.length; y++) for (let x = 0; x < idle0[y].length; x++) {
    const a = idle0[y][x], b = idle1[y][x];
    if (a === '.') continue;
    const v = vus[a] || (vus[a] = { total: 0, par: {} });
    v.total++; v.par[b] = (v.par[b] || 0) + 1;
  }
  const sub = {};
  for (const [a, v] of Object.entries(vus)) {
    const [b, n] = Object.entries(v.par).filter(([l]) => l !== '.').sort((p, q) => q[1] - p[1])[0] || [];
    sub[a] = b && n * 2 >= v.total ? b : a;
  }
  return sub;
}

// Les suites de pixels pleins d'une ligne : {debut, texte}.
function groupes(ligne) {
  const out = [];
  const re = /[^.]+/g;
  let m;
  while ((m = re.exec(ligne))) out.push({ debut: m.index, texte: m[0] });
  return out;
}

// Le décalage (de -3 à +3 cases) qui fait le mieux coïncider un groupe de la
// pose avec la ligne du debout, et la part de ses pixels qui coïncident alors.
function alignement(g, i0) {
  let meilleur = { dx: 0, part: -1 };
  for (const dx of [0, -1, 1, -2, 2, -3, 3]) {
    let n = 0;
    for (let k = 0; k < g.texte.length; k++) if (i0[g.debut + k - dx] === g.texte[k]) n++;
    const part = n / g.texte.length;
    if (part > meilleur.part) meilleur = { dx, part };
  }
  return meilleur;
}
// En dessous, le groupe ne ressemble pas assez au debout — un bras tendu, un
// corps couché : reporter la retouche au pixel y mettrait des taches, on n'en
// reprend que les couleurs.
const RESSEMBLANCE = .75;

export function deriverPose(pose, idle0, idle1) {
  const sub = substitutions(idle0, idle1);
  return pose.map((ligne, y) => {
    const i0 = idle0[y], i1 = idle1[y];
    if (ligne === i0) return i1;
    const out = [...ligne];
    for (const g of groupes(ligne)) {
      const { dx, part } = alignement(g, i0);
      for (let k = 0; k < g.texte.length; k++) {
        const x = g.debut + k, c = g.texte[k];
        out[x] = part >= RESSEMBLANCE && i0[x - dx] === c ? i1[x - dx] : (sub[c] || c);
      }
    }
    return out.join('');
  });
}
