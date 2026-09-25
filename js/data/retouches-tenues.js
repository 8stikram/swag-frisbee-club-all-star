// ---------------------------------------------------------------------------
// LES RETOUCHES DE L'ATELIER (mockups/atelier-tenues.html), collées telles
// quelles. Chaque tenue donne sa pose DEBOUT — tête et corps — et les couleurs
// qu'elle change ou ajoute. Les cinq autres poses s'en déduisent au chargement
// (voir deriver-pose.js), et les chromas suivent leur tenue de base.
//
// Pour intégrer un nouveau bloc « Copier mes retouches » : coller le contenu de
// son objet "retouches" ici, une tenue par clé. Une clé déjà présente se
// remplace.
// ---------------------------------------------------------------------------
export const RETOUCHES = {
  "naruto:shippuden": {
    "tete": [
      "...hH.HH.Hh.....",
      "..HHHHHHHHHH....",
      ".hHHHHHHHHHHh...",
      "..hHHHHHHHHh....",
      "..KKKKKKKKKK....",
      "..KKMMMMMMKK....",
      "..SSSSSSSSSS....",
      "..SSSESSSSES....",
      "..swSSSSSSws....",
      "...SSSSSSSS....."
    ],
    "corps": [
      "....KKKKKK......",
      "..KKKKKKKKKK....",
      ".SKKKKKKKKKKS...",
      ".SOOOOKKOOOOS...",
      "..OOOOKKOOOO....",
      "..KKKKKKKKKK....",
      "...PP....PP.....",
      "...WW....PP.....",
      "..PPP....PPP....",
      "..KKK....KKK...."
    ],
    "couleurs": { "K": "#131315" }
  },
  "naruto:hokage": {
    "tete": [
      "................",
      "....HHHHHh......",
      "...hHHHHHHh.....",
      "..HHHHHHHHHh....",
      "..HHHHHHHHHH....",
      "..hhSHSHSHSh....",
      "..hSSSSSSSSS....",
      "..SSSESSSSES....",
      "..swSSSSSSws....",
      "...SSSSSSSS....."
    ],
    "corps": [
      "....BOooOB......",
      "..BBoOooOoBB....",
      ".BBBOOooOOBBB...",
      ".BBBKKKKKKBBB...",
      "..RBOOooOOBR....",
      "..RRKKKKKKRR....",
      "...KK....KK.....",
      "...KK....KK.....",
      "...KK....KK.....",
      "..KKK....KKK...."
    ],
    "couleurs": { "K": "#0d0d0d" }
  },
  "naruto:ermite": {
    "tete": [
      "...hH.HH.Hh.....",
      "..HHHHHHHHHH....",
      ".hHHHHHHHHHHh...",
      "..hHHHHHHHHh....",
      "..KKKKKKKKKK....",
      "..KKMMMMMMKK....",
      "..SSSSSSSSSS....",
      "..SSyYSSSyYS....",
      "..swSSSSSSws....",
      "...SSSSSSSS....."
    ],
    "corps": [
      "....AKKKKA......",
      "..AAKKKKKKAA....",
      ".SAAKKKKKKAAS...",
      ".SAAOOKKOOAAS...",
      "..AROOKKOORA....",
      "..RRKKKKKKRR....",
      "...PP....PP.....",
      "...WW....PP.....",
      "..PPP....PPP....",
      "..KKK....KKK...."
    ],
    "couleurs": { "K": "#131315", "R": "#86181b", "X": "#c69c7b", "Y": "#f7b036", "y": "#e65c00" }
  },
  "naruto:thelast": {
    "tete": [
      "................",
      "....HHHHHh......",
      "...hHHHHHHh.....",
      "..HHHHHHHHHh....",
      "..KKKKKKKKKK....",
      "..KKMMMMMMKK....",
      "..hSSSSSSSSS....",
      "..SSSESSSSES....",
      "..swSSSSSSws....",
      "...SSSSSSSS....."
    ],
    "corps": [
      "....AAAAAA......",
      "..DAABddBDDD....",
      ".DAADDddDDDDA...",
      ".SADDDddDDDDS...",
      "..DDDDddDDDD....",
      "..dddddddddd....",
      "...PP....PP.....",
      "...WW....PP.....",
      "..PPP....PPP....",
      "..KKK....KKK...."
    ],
    "couleurs": { "K": "#131315", "B": "#bcb9ae" }
  },
  "naruto:minato": {
    "tete": [
      "...hH.HH.Hh.....",
      "..HHHHHHHHHH....",
      ".hHHHHHHHHHHh...",
      "..hHHHHHHHHh....",
      "..nnnnnnnnnn....",
      "..nnMMMMMMnn....",
      "..SSSSSSSSSS....",
      "..SSSESSSSES....",
      "..SSSSSSSSSS....",
      "...SSSSSSSS....."
    ],
    "corps": [
      "....BVnnVB......",
      "..BBVVvvVVBB....",
      ".nBBVuvvuVBBn...",
      ".nBBVvvvvVBBn...",
      "..BBVVvvVVBB....",
      "..RRNNNNNNRR....",
      "...MM....NN.....",
      "...NN....NN.....",
      "..MMM....MMM....",
      "..KKK....KKK...."
    ],
    "couleurs": { "w": "#dbac76", "K": "#172440" }
  },
  "leon:rpd": {
    "tete": [
      "....lLLLLl......",
      "...LLLLLLLL.....",
      "..LLLLLLLLLL....",
      "..LLLLllLLLL....",
      "..LLSSSSSSLL....",
      "..LSSSSSSSSL....",
      "..SSSESSSSES....",
      "..SSSSSSSSSS....",
      "...SSSSSSSS.....",
      "....JJJJJJ......"
    ],
    "corps": [
      "..KAAKKKKAAK....",
      ".VKAWAWWAWAKB...",
      ".VAAAAAAAAAAV...",
      ".SAAKKKKKKAAS...",
      "..JJJJJJJJJJ....",
      "..AAKKVKKKAA....",
      "...DD....DD.....",
      "...AK....KA.....",
      "...DD....DD.....",
      "..AAA....AAA...."
    ],
    "couleurs": { "J": "#31394e", "V": "#a3a3a3", "B": "#9e833d", "D": "#28334d", "A": "#15181e" }
  },
  "leon:re2": {
    "tete": [
      "....lLLLLl......",
      "...LLLLLLLL.....",
      "..LLLLLLLLLL....",
      "..LLLLllLLLL....",
      "..LLSSSSSSLL....",
      "..LSSSSSSSSL....",
      "..SSSESSSSES....",
      "..SSSSSSSSSS....",
      "...SSSSSSSS.....",
      "....uUUUUu......"
    ],
    "corps": [
      "..uuUuuuuUuu....",
      ".uuUuuuuuuUuu...",
      ".uUuWWWWWWuUu...",
      ".SUuuuuuuuuUS...",
      "..JJJJJJJJJJ....",
      "..VVQVQQVQVV....",
      "...uu....uu.....",
      "...uu....VV.....",
      "...uu....uu.....",
      "..KKK....KKK...."
    ],
    "couleurs": { "Q": "#2e3038" }
  },
  "leon:re4": {
    "tete": [
      "....lLLLLl......",
      "...LLLLLLLL.....",
      "..LLLLLLLLLL....",
      "..LLLLllLLLL....",
      "..LLLSSSSLLL....",
      "..LLSSSSSSLL....",
      "..LSSESSSSEL....",
      "..SSSSSSSSSS....",
      "...SSSSSSSS.....",
      "....GffffG......"
    ],
    "corps": [
      "..GGGKKKKGGG....",
      ".mmmmKKKKmmmm...",
      ".mmmmKKKKmmmm...",
      ".NmmmKKKKmmmN...",
      "..GGGKKKKGGG....",
      "..CCCCVCCCCC....",
      "...CC....CC.....",
      "...cc....cc.....",
      "...CC....CC.....",
      "..KKK....KKK...."
    ],
    "couleurs": { "G": "#6f4f2f" }
  },
  "leon:darkside": {
    "tete": [
      "....lLLLLl......",
      "...LLLLLLLL.....",
      "..LLLLLLLLLL....",
      "..LLLLllLLLL....",
      "..LLSSSSSSLL....",
      "..LSSSSSSSSL....",
      "..SSSESSSSES....",
      "..SSSSSSSSSS....",
      "...SSSSSSSS.....",
      "....gQQQQg......"
    ],
    "corps": [
      "..QQgQQQQEQQ....",
      ".NQQAQQQQAQQN...",
      ".SQQgQQQQgQQS...",
      ".SGGgQQQQgGGS...",
      "..GgGGAAGGgG....",
      "..EEEEEEEEEE....",
      "...CW....WC.....",
      "...cI....Ic.....",
      "...CW....WC.....",
      "..KKK....KKK...."
    ],
    "couleurs": { "W": "#4e5341", "A": "#8a8a8a", "c": "#555c42", "Q": "#353536", "G": "#3c4b20", "H": "#353b2b", "I": "#343829" }
  },
  "leon:requiem": {
    "tete": [
      "....lLLLLl......",
      "...LLLLLLLL.....",
      "..LLLLLLLLLL....",
      "..LLLLllLLLL....",
      "..LLLSSSSLLL....",
      "..LLSSSSSSLL....",
      "..LSSESSSSEL....",
      "..SsSSSSSSsS....",
      "...lsSSSSsl.....",
      "....GGYYGG......"
    ],
    "corps": [
      "..QGGqQQqGGQ....",
      ".QQQQqYYqQQQQ...",
      ".QQQQqYYqQQQQ...",
      ".qQQQqYYqQQQq...",
      "..QQQqYYqQQ.....",
      "...QQqYYqQQ.....",
      "...QQq..qQQ.....",
      "...qq....qq.....",
      "...qq....qq.....",
      "..KKK....KKK...."
    ],
    "couleurs": { "Y": "#4b5977", "G": "#3c2e25" }
  },
  "jingle:polenord": {
    "tete": [
      "......WG........",
      ".....WgGg.......",
      ".....WGGg.......",
      "....WGGGgg......",
      "....WGGGgd......",
      "...WGGGGggd.....",
      "...WGGGGggd.....",
      "..gWGGGGgggd....",
      "..dgGGGgggdg....",
      "..RVRVRVRVRV...."
    ],
    "corps": [
      "....rvrvrv......",
      "..SVvVVVVvVS....",
      ".SSVvVVVVvVSS...",
      ".SSlvVVVVvlSS...",
      ".SrrlSssSlrrS...",
      "..rRRlsSlRRr....",
      "...RRRllRRR.....",
      "...SS....SS.....",
      "...SS....SS.....",
      "..GSS....SSG...."
    ]
  },
  "jingle:smoking": {
    "tete": [
      "....JLLLHh......",
      "....JLLLHh......",
      "....JLLLHh......",
      "....JLLLHh......",
      "....JLLLHh......",
      "....XRRRrr......",
      "....JLLLHh......",
      "..JLLLLLLHHh....",
      ".JLLLLLLLLHHh...",
      "...HHHHHHHH....."
    ],
    "corps": [
      "...HpPRRPpH.....",
      "..HHLPRRPLHH....",
      ".HHLLPRRPLLHH...",
      ".HHJLPRRPLJHH...",
      ".HHrJpRRpJrHH...",
      "..HrRJppJRrH....",
      "...rrRJJRrr.....",
      "...HH....HH.....",
      "...HH....HH.....",
      "..GHH....HHG...."
    ]
  },
  "jingle:cowboy": {
    "tete": [
      "................",
      "......EC........",
      ".....ECCc.......",
      ".....CCCc.......",
      "....ECCCcc......",
      "....rRRRrr......",
      ".y.ECCCCCcc.y...",
      "..yCCCCCCCCy....",
      "...ycccccyy.....",
      "...rRrRrRrR....."
    ],
    "corps": [
      "....RrRrRr......",
      "..EyyEccEyyE....",
      ".EEyRRRRRRyEE...",
      ".EEGyEccEygEE...",
      ".EyyyEccEyyyE...",
      "..RRRrGgrrrr....",
      "...RrrGgrrr.....",
      "...CC....CC.....",
      "...cc....cc.....",
      "..Gyy....yyG...."
    ]
  },
  "jingle:halloween": {
    "tete": [
      ".......vv.......",
      "......Vv........",
      ".....OOoo.......",
      "....OOOOoo......",
      "...OWEOOEWo.....",
      "...OOEOOEoo.....",
      "..OOOOOOOOoo....",
      "..OOWOEEOWoo....",
      "..OOOOOOOOoo....",
      "..qZqZqZqZqZ...."
    ],
    "corps": [
      "....qZqZqZ......",
      "..ZQqQQQQqQZ....",
      ".ZZQqQQQQqQZZ...",
      ".ZZZqQQQQqZZZ...",
      "..qZQQQQQQZq....",
      "..qZZQGGQZZq....",
      "...qqqZZqqq.....",
      "...QQ....QQ.....",
      "...QQ....QQ.....",
      "..qQq....qQq...."
    ],
    "couleurs": { "O": "#cf8544", "o": "#be723c", "Z": "#47324d", "Q": "#18111d", "q": "#291c31" }
  },
  "chopper:junker": {
    "tete": [
      ".hhvhhhhh.......",
      "..hvoMMMMMo.....",
      "..hoMMMMMMMo....",
      "..oMMMMMMMMMo...",
      "..oMMWWMoMWWo...",
      "..oMMWWoooWWo...",
      "..MMMMoKmKooM...",
      "...MyymKmKmyM...",
      "....YyMmMmMY....",
      "...KKKKKKKKK...."
    ],
    "corps": [
      ".WmWmKSSSKYy....",
      ".mMmmKStSKKYy...",
      ".WmmKKSTtKKKW...",
      ".oSKKKtTTKKKS...",
      ".SSSStTTTTtSS...",
      "..WWtTTTTTtW....",
      "..JWWJJJJWWJ....",
      "..JjWJ..JWjJ....",
      ".JJjJ....JjJJ...",
      ".nnn......nnn..."
    ],
    "couleurs": { "H": "#aba79b", "v": "#202022", "A": "#424243" }
  },
  "yuki:doudoune": {
    "tete": [
      "..gW..Wg........",
      ".gpWWWWpg.......",
      ".WWWWWWWWW......",
      ".WWWWWWWWWWs....",
      ".WWgEEWWgEEWs...",
      ".WWWWWWWWWWWsn..",
      ".wWWWWWWWWWWsn..",
      ".gwWWWWWWWWws...",
      "..gwwwwwwwg.....",
      "...KKAgAKK......"
    ],
    "corps": [
      "..KKKAwAKKK.....",
      ".WKKKWAWKgKW....",
      ".WKKKwswKwKW....",
      ".WKKKsssKKKW....",
      "gWKKKWsWKKKW....",
      "wwKKKWsWKKK.....",
      "..KKKKKKKKK.....",
      "...WW...WW......",
      "...WW...WW......",
      "..wwW...Www....."
    ],
    "couleurs": { "W": "#ffffff", "A": "#4a4a54" }
  },
  "yoshi:vert": {
    "tete": [
      "..rRGGllg.......",
      ".rRGGWElllGg....",
      ".rRGGWEllllGg...",
      "..rGGGGGllllGg..",
      ".rRGGGGgllllGg..",
      ".rRGWWglllllGg..",
      ".rRWWWGlllllGg..",
      "..rWWWWWWWWWg...",
      "..rWWWWWWWWWg...",
      "...rWWWWWWGg...."
    ],
    "corps": [
      "....BGGGWWGg....",
      "...rAGGGWWWGg...",
      "..rRAGGWWWWWg...",
      "..rRWGGWWWWWg...",
      ".rRWAGWWWWWGg...",
      ".rAGGGWWWWGGg...",
      "...GGG...GGG....",
      "...CCC...CCC....",
      "...OOOO..OOOO...",
      "...YYYY..YYYY..."
    ],
    "couleurs": { "A": "#b0b0b0", "B": "#8f8f8f", "C": "#a95b2d" }
  },
  "hollis:platine": {
    "tete": [
      "....CCCCCC......",
      "..CCCCCCCCCC....",
      ".cCCCCCCCCCCC...",
      ".cCCCCCCCCCCC...",
      ".cCcSSSSSScCC...",
      ".ccSSSSSSSScC...",
      ".cSSSSSSSSSSc...",
      ".cSSSESSSSESc...",
      ".cSSNNNNNNNNc...",
      "..kSSSSSSSSk...."
    ],
    "corps": [
      "..cSSSSSSSSc....",
      ".SccSSSSSSccS...",
      ".ScCSsSSsSCcS...",
      ".SCCSSsSSSCCS...",
      "..CSSSsSSSSC....",
      "..PPPPPPPPPP....",
      "...PP....PP.....",
      "...PP....PP.....",
      "..OOO....OOO....",
      "..KKK....KKK...."
    ]
  }
};
