# Patchnotes

Résumé de chaque chantier, du plus récent au plus ancien. Nouvelles features d'abord, équilibrage et corrections ensuite.

## 2026-07-25 — Les objectifs de stock

- **La colonie brasse toute seule** : fixez une cible dans le nouveau panneau **Objectifs** (« une bière 2 / 3 », boutons − / +) et l'intendance poste ou retire elle-même les ordres de brassage pour maintenir le stock — plus un clic par chope.
- **Le panneau dit pourquoi ça n'avance pas** : « bloqué : aucun atelier » tant qu'aucune brasserie n'est posée, « bloqué : rien à produire » quand le brassable manque — la production repart d'elle-même dès que le monde change.
- **Le bouton 🍺 Brasser disparaît** : la cible de stock remplace l'ordre manuel. Baisser la cible retire les ordres en attente ; un nain déjà à l'ouvrage finit sa chope.
- Technique : la mécanique est générique sur les recettes consommables — un futur consommable pilotable par objectif = une entrée dans la liste des objectifs, aucun code.

## 2026-07-25 — La bière

- **Nouvel atelier : la brasserie** (🏺) et son bouton **🍺 Brasser** : un clic, et un nain porte un champignon à la brasserie pour en tirer une chope (`δ`) — « Urist a brassé une bière. » La bière est rangée au stock comme le reste.
- **Un nain assoiffé préfère la bière à la rivière** : il la boit sur place — « Urist a vidé une chope de bière ! » — et y gagne un vrai coup de moral (+15, contre +5 pour l'eau de la berge). L'anti-crise de nerfs des mauvais jours.
- **Brasser consomme la nourriture** : chaque chope coûte un champignon de la ferme — à vous d'arbitrer entre les ventres et les gosiers. Sans champignon, le brassage attend la prochaine récolte et reprend tout seul.
- Une colonie coupée de l'eau peut désormais survivre sur ses tonnelets — la bière étanche la soif aussi bien que la rivière.
- Technique : les ateliers sont typés (menuiserie, brasserie) et les recettes déclarent leur atelier, leur ingrédient et leur caractère consommable — un futur consommable fabriqué = une entrée de JSON.

## 2026-07-25 — Bien dormir compte

- **Le réveil dépend du couchage** : une nuit complète en lit remonte le moral de +10, contre +3 seulement à même le sol — le journal le raconte : « Urist a mal dormi. »
- Le lit cumule désormais trois avantages : nuit 50 % plus courte, guérison accélérée, et le vrai bon moral au réveil. Les dortoirs deviennent un investissement, pas un luxe.

## 2026-07-25 — La soif

- **Les nains ont soif** : nouvelle jauge, et des allers-retours réguliers à la berge — « Urist a soif ! », « Urist s'est désaltéré. » Un pont fait office d'abreuvoir sécurisé.
- **La déshydratation tue, et plus vite que la faim** (~24 s d'agonie contre 40) : « Dagna meurt de soif ! » puis « Dagna est morte de soif. » Couper une colonie de son eau est désormais la stratégie de siège la plus expéditive.
- **Pas d'eau accessible ? Les nains ne se figent pas** : ils renoncent temporairement et continuent de travailler en se déshydratant — le temps de creuser jusqu'à la rivière ou de bâtir un pont salvateur.
- La génération de carte garantit une berge accessible au départ ; à vous de ne pas vous en couper en construisant.
- Technique : l'inanition est généralisée en système d'attrition configurable (faim, soif, et les causes futures) — une mort de plus = une entrée de config.

## 2026-07-25 — La pêche

- **Nouvel outil 🎣 Pêche** : peignez une zone sur l'eau (une berge adjacente est requise), et les nains viendront y pêcher — « Urist a pêché un poisson. » Le poisson (`α`) est rangé au stock et nourrit les affamés comme le reste.
- **La nourriture de siège** : moins nourrissante et plus lente que la ferme, la pêche ne demande ni semis ni récolte à défendre — une muraille englobant un bout de berge rend la colonie autosuffisante.
- Un pont posé sur un coin de pêche l'annule (la case n'est plus de l'eau).

## 2026-07-25 — Les ponts

- **Nouveau meuble : le pont** (🌉, une bûche à l'atelier) — se désigne directement sur l'eau, le menuisier le pose depuis la berge. La rivière fait deux cases de large : prévoyez deux ponts côte à côte.
- **Un pont est une brèche, pas une porte** : les gobelins l'empruntent aussi. À vous de verrouiller le débouché avec une porte.
- Les chantiers en attente de l'autre côté de la rivière reprennent d'eux-mêmes dès le pont posé.

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
