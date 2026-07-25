# Patchnotes

Résumé de chaque chantier, du plus récent au plus ancien. Nouvelles features d'abord, équilibrage et corrections ensuite.

## 2026-07-25 — L'eau : rivières et lacs

- **Une rivière sinueuse** (`≈`) traverse désormais la plaine du nord au sud, accompagnée d'un ou deux lacs. L'eau est infranchissable — pour les nains comme pour les gobelins.
- **Deux gués** percent la rivière : ce sont les seuls points de passage naturels — des goulets stratégiques à défendre (un gué + une porte = un péage mortel pour les invasions venues de l'autre rive).
- S'implanter dans un méandre adossé à la montagne devient la position forte de début de partie.
- Technique : la génération valide chaque carte (connectivité, montagne atteignable) et retire si elle est injouable — plus aucune carte cassée.

## 2026-07-25 — L'escalade des invasions

- **Les gobelins attaquent en vagues** de plus en plus nombreuses (1, puis 2, jusqu'à 6) et rapprochées (~2 min 30 au début, ~80 s au plus fort). La bande arrive groupée : « Une bande de 3 gobelins déferle sur la région ! »
- **La prospérité attire les convoitises** : chaque tranche de 4 habitants au-delà de 5 grossit les bandes — une colonie de 12 nains subit des assauts bien plus durs qu'un avant-poste.
- La partie devient perdable : murailles, portes et surplus de nourriture sont désormais des décisions de survie.
- Technique : l'état d'invasion (numéro de vague, compte à rebours) vit dans un composant du monde — recharger une sauvegarde ne remet pas la menace à zéro.

## 2026-07-25 — L'inanition

- **La famine tue** : un nain dont la jauge de faim est au maximum perd de la santé (~40 s d'agonie à vitesse ×1) — le journal prévient (« Urist meurt de faim ! ») puis acte le décès. Un repas in extremis stoppe l'érosion.
- Le moral s'effrite en continu pendant l'agonie : la famine pousse aux crises de nerfs avant de tuer.
- Les fermes deviennent une assurance-vie ; un siège qui coupe l'accès aux champs est désormais mortel.
- Technique : la mort (cadavre, job relâché, charge lâchée) est mutualisée dans `death.js` — combat et famine l'utilisent, les causes futures seront gratuites.

## 2026-07-25 — Les migrants

- **La colonie grandit** : toutes les ~2 min, si la colonie est attractive, un migrant arrive au bord de la carte (« Un migrant est arrivé : Fikod ! »).
- Conditions : surplus de nourriture obligatoire ; un lit par habitant double l'arrivée (2 migrants). Plafond à 12 nains.
- Les morts deviennent des pertes réelles mais récupérables — prospérer attire des bras.

## 2026-07-25 — Les portes

- **Nouveau meuble : la porte** (🚪, fabriquée à l'atelier avec une bûche) — franchissable par les nains, **infranchissable par les gobelins**.
- La forteresse devient étanche sans emmurer les ouvriers : les gobelins campent devant la porte pendant que la colonie vaque.

## 2026-07-25 — La sauvegarde

- **Boutons 💾 / 📂** : la partie se sauvegarde dans le navigateur et survit au rechargement de la page. Les nains reprennent leurs occupations en un tick (jobs, désignations et zones conservés).
- Un dormeur sauvé en plein somme finit sa nuit ; un enragé reste enragé.

## 2026-07-25 — La montagne et les forêts

- **Nouvelle génération de carte** : un massif montagneux plein occupe le flanc droit (~40 % de la carte), au front irrégulier — c'est la réserve à creuser pour bâtir la forteresse.
- Les arbres poussent en **bosquets denses** (~13 % de la plaine, contre 4 % éparpillés avant).

## 2026-07-25 — Outillage (dev)

- Suite de tests permanente (`npm test`), hook de fin de tâche, `CLAUDE.md`, 6 skills et 3 commands de revue. Serveur de dev sans cache.

## 2026-07-24 — Les ateliers

- **La menuiserie** (⚒) et le premier meuble : le **lit** (🛏) — fabriqué d'une bûche, il accélère la récupération de 50 % et **soigne pendant le sommeil** (le sol soigne un peu aussi).
- Chaîne complète : chercher la bûche → façonner à l'atelier → installer au site désigné. Un chantier interrompu est repris là où il en était.

## 2026-07-24 — Le moral

- **Les nains ont des émotions** : repas, nuits complètes et victoires remontent le moral ; blessures, faim, fuites et morts de camarades (surtout vues de près) le minent. Jauge dans l'inspection.
- Moral bas : travail à mi-vitesse. Moral au fond : **crise de nerfs** — le nain erre en fracassant des objets jusqu'à l'apaisement.

## 2026-07-24 — Le combat

- **Les gobelins deviennent dangereux** : points de vie, frappes au contact, blessures et morts (« Urist a succombé à ses blessures. ») avec cadavre.
- **Courage** : un nain en bonne santé charge (« Urist a terrassé un gobelin ! »), un blessé fuit. Le nombre fait la force : seul on fuit, en groupe on tient.

## 2026-07-24 — Le socle (première version jouable)

- **Simulation** : ECS + bus d'événements, boucle à 5 ticks/s, rendu ASCII sur Canvas, journal narratif.
- **Le monde** : cavernes générées, murs, arbres ; pathfinding A*.
- **Les nains** : faim et repas, sommeil, arbitre de priorités (manger / dormir / travailler / errer / fuir).
- **Les jobs** : creuser, abattre, transporter vers les **stockages**, bâtir des murs, semer et récolter les **champs** (boucle de nourriture auto-suffisante). Désignation au cliquer-glisser, murs fantômes.
- **Les gobelins** : apparitions périodiques, poursuite, fuite des nains.
- **Confort** : inspection au clic (jauges), pause et vitesses ×1/×3, contenu du jeu entièrement en JSON.
