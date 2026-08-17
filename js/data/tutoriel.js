// ---------------------------------------------------------------------------
// Contenu du tutoriel. Chaque étape tient en quatre choses : ce qu'on demande,
// le geste attendu, combien de fois, et l'indice qui tombe si ça coince.
//
//   geste        : clé lue par l'observateur de js/game/moves.js
//   repetitions  : trois par défaut — le but est d'ancrer un réflexe, pas de
//                  valider un coup de chance. La précision n'entre jamais en
//                  compte : on apprend le geste, pas la réussite.
//   demo         : ce que le jeu se joue à lui-même avant de rendre la main
//   partenaire   : ce que fait le dummy pendant l'étape ('fige', 'sert',
//                  'renvoie', 'tire') — toujours lentement et prévisiblement
// ---------------------------------------------------------------------------

export const CHAPITRES_TUTO = {
  bases: {
    titre: 'FONDATIONS',
    intro: 'Bouger, viser, attraper, lancer. Tout le reste se construit là-dessus.',
    etapes: [
      {
        texte: 'Déplace-toi avec les touches de direction.',
        indice: 'Par défaut : Z Q S D. Tu peux les changer dans les Options.',
        geste: 'bouge', repetitions: 3, partenaire: 'fige', demo: null
      },
      {
        texte: 'La souris sert de viseur : le disque part toujours vers elle.',
        indice: 'Vise loin devant toi, pas sur toi-même.',
        geste: 'tir', repetitions: 1, partenaire: 'fige', demo: 'tir'
      },
      {
        texte: 'Attrape le disque : approche-toi, la réception est automatique.',
        indice: 'Va au-devant du disque plutôt que de l\'attendre sur place.',
        geste: 'attrape', repetitions: 3, partenaire: 'sert', demo: null
      },
      {
        texte: 'Renvoie-le vers la cage adverse en cliquant.',
        indice: 'On ne peut pas viser vers son propre camp : le tir ne partira pas.',
        geste: 'tir', repetitions: 3, partenaire: 'sert', demo: 'tir'
      }
    ]
  },

  attaque: {
    titre: 'OFFENSIVE',
    intro: 'Charger, dasher, et transformer une réception en tir immédiat.',
    etapes: [
      {
        texte: 'Maintiens le clic pour charger, relâche pour un tir puissant.',
        indice: 'Garde le clic enfoncé jusqu\'à ce que le personnage clignote.',
        geste: 'tirCharge', repetitions: 3, partenaire: 'sert', demo: 'tirCharge'
      },
      {
        texte: 'Dashe avec la touche dédiée : une ruée courte vers ton curseur.',
        indice: 'Par défaut : Maj gauche. Le dash a un temps de repos entre deux.',
        geste: 'dash', repetitions: 3, partenaire: 'fige', demo: 'dash'
      },
      {
        texte: 'Pendant un dash, ta zone d\'attrapé double. Attrape en dashant.',
        indice: 'Lance le dash vers le disque un instant avant qu\'il n\'arrive.',
        geste: 'attrape', repetitions: 3, partenaire: 'sert', demo: 'dash'
      },
      {
        texte: 'Attrape en dashant puis clique aussitôt : c\'est le Dash Throw.',
        indice: 'Tu as une demi-seconde après la réception. Le tir part à pleine puissance.',
        geste: 'dashThrow', repetitions: 3, partenaire: 'sert', demo: 'dashThrow'
      }
    ]
  },

  defense: {
    titre: 'DÉFENSE',
    intro: 'Le plongeon ne rattrape jamais le disque : il le renvoie.',
    etapes: [
      {
        texte: 'Clique sans le disque pour plonger vers ton curseur.',
        indice: 'Le plongeon est purement défensif. Dans le vide, tu restes au sol un instant.',
        geste: 'plongeon', repetitions: 3, partenaire: 'fige', demo: 'plongeon'
      },
      {
        texte: 'Plonge sur le disque pour le renvoyer très fort.',
        indice: 'Vise le disque, pas la cage : c\'est le contact qui compte.',
        geste: 'plongeon', repetitions: 3, partenaire: 'tire', demo: 'plongeon'
      },
      {
        texte: 'Plonge à l\'instant exact où le disque arrive : Perfect Dive.',
        indice: 'La fenêtre est très courte. Attends que le disque soit sur toi.',
        geste: 'perfectDive', repetitions: 1, partenaire: 'tire', demo: null
      }
    ]
  },

  techs: {
    titre: 'TECHNIQUES',
    intro: 'Deux gestes pour reprendre la main quand on s\'est engagé trop tôt.',
    etapes: [
      {
        texte: 'Réappuie sur la touche de dash pendant un dash : tu freines net.',
        indice: 'Le freinage garde un instant la zone d\'attrapé élargie du dash.',
        geste: 'cancelDash', repetitions: 3, partenaire: 'fige', demo: 'cancelDash'
      },
      {
        texte: 'Feinte un tir : le disque part à peine puis revient en main.',
        indice: 'Par défaut : E. Attention, pendant la feinte le disque est volable.',
        geste: 'feinte', repetitions: 3, partenaire: 'sert', demo: 'feinte'
      }
    ]
  },

  maitrise: {
    titre: 'MAÎTRISE',
    intro: 'Enchaîner les gestes, et jouer sur ce que l\'adversaire croit voir.',
    etapes: [
      {
        texte: 'Enchaîne : dash, attrapé, puis Dash Throw dans la foulée.',
        indice: 'Le Dash Throw ne demande aucune charge : clique dès la réception.',
        geste: 'dashThrow', repetitions: 3, partenaire: 'renvoie', demo: 'dashThrow'
      },
      {
        texte: 'Feinte, laisse-le réagir, puis tire pour de bon.',
        indice: 'Feinte d\'abord, attends qu\'il s\'engage, et seulement après, tire.',
        geste: 'tir', repetitions: 3, partenaire: 'renvoie', demo: 'feinte'
      },
      {
        texte: 'Dernier test : marque un but comme tu le sens.',
        indice: 'Tout est permis. Charge, dash, feinte — c\'est ton jeu maintenant.',
        geste: 'tirCharge', repetitions: 1, partenaire: 'renvoie', demo: null
      }
    ]
  }
};
