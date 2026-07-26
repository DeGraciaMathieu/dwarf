# Patchnotes

Résumé de chaque chantier, du plus récent au plus ancien. Nouvelles features d'abord, équilibrage et corrections ensuite.

## 2026-07-26 — Le cycle des saisons

- **Les saisons défilent** : printemps, été, automne, hiver s'enchaînent au fil du temps, affichés dans le bandeau d'état (🌱/☀/🍂/❄).
- **L'hiver mord** : les **cultures cessent de pousser** et les **berges gèlent** — les nains assoiffés ne peuvent plus s'y abreuver et doivent se rabattre sur la **bière stockée**. Sans réserve, la crise de soif menace.
- **Il faut anticiper** : constituez vos stocks de vivres et de boisson avant les grands froids ; les **migrants ne passent plus** tant que dure l'hiver.
- **Le dégel répare tout seul** : au retour du printemps, cultures et berges redeviennent normales, sans rien à faire.
- Le journal annonce chaque changement de saison, en rouge à l'entrée de l'hiver.
- Technique : `seasonSystem` porte un cycle sur une entité-composant `season` (600 ticks/saison) ; gel logique lu par `farmSystem`, `drinkSystem` et `migrantSystem` via `isWinter`, sans état persistant sur les nains.

## 2026-07-26 — De vraies chambres à coucher

- **Nouvelle zone 🛏 Chambre** : désignez une pièce, et un nain qui y dort dans un **lit avec un brasero à portée** se réveille **bien mieux reposé** qu'à l'air libre.
- **Trois niveaux de couchage** : dormir au sol nu (+3 de moral), sur un lit (+10), ou dans une chambre équipée (+18) — enfin une **récompense mécanique** pour aménager de vraies pièces (murs, porte, brasero).
- **La fiche d'inspection** indique désormais la qualité du couchage du nain : « à la dure », « sur un lit » ou « en chambre équipée ».
- **Aucune régression** : sans chambre désignée, les gains de repos restent exactement ceux d'avant ; effacer une chambre ou détruire son brasero rabaisse simplement le confort au réveil suivant.
- Technique : Zone `bedrooms` réutilisant l'infrastructure existante ; `sleepSystem.roomQuality()` évalue le lieu au réveil (aucun composant stocké), `moraleSystem` mappe la qualité vers ses barèmes (`restedInRoom`).

## 2026-07-26 — La cuisine et les plats préparés

- **Nouvel atelier 🍳 Cuisine** (bâti à la menuiserie) : on y transforme les **champignons** et le **poisson** en **plats préparés**, une nourriture bien plus nourrissante que la récolte crue.
- **Bien manger remonte le moral** : un nain qui déguste un plat cuisiné gagne **deux fois plus de moral** qu'en avalant du cru — une deuxième source de bonheur pilotable, après la bière.
- **Piloté par le panneau Objectifs**, comme la bière : fixez une cible de plats et l'intendance cuisine ce qu'il faut, puis s'arrête une fois le stock atteint (« Bloqué : cuisine manquante » / « ingrédient cuisinable insuffisant » sinon).
- Enfin une **raison de développer l'agriculture et la pêche** au-delà de la simple survie.
- Technique : recette d'atelier `kitchen` + recette de plat `meal` (données pures) ; marqueur `cookable` sur les ingrédients, `cooked` sur les plats ; le gain de moral au repas dépend de la qualité (`ateMeal` vs `ate`).

## 2026-07-26 — Blessés, secours et infirmerie

- **On ne meurt plus d'un seul coup** : sous un certain seuil, un nain **s'effondre grièvement blessé** au lieu de mourir net (« … s'effondre, grièvement blessé ! ») — à terre, incapable de travailler, de se battre ou de fuir.
- **Le sablier tourne** : un blessé laissé sans soin **se vide de son sang** et finit par succomber (« … s'est vidé de son sang. ») — il faut faire vite.
- **Nouvelle zone ✚ Infirmerie** : désignez-la, et un nain valide **traîne le blessé** jusqu'à elle (secours), puis **un soigneur le remet sur pied** (« … est soigné et se remet sur pied. »). Un **lit** sur place accélère la guérison.
- **Les rixes de taverne** peuvent désormais laisser un camarade blessé à secourir, et non plus seulement un mort ou rien.
- La fiche d'inspection signale l'état **« ⚠ Blessé, à terre »**.
- Technique : composant `injury` (saignement + incapacité) posé sous le seuil par `combatSystem` ; `injurySystem` gère le saignement ; activités arbitrées `rescue`/`heal` + Zone `infirmary`.

## 2026-07-26 — Amitiés, rivalités et deuils

- **Les nains se lient enfin** : à force d'être seul, un nain va **discuter** avec un camarade proche ; côte à côte, tous deux comblent leur besoin de compagnie et **tissent une amitié** (« … et … sont devenus amis. »).
- **Les rixes laissent des rancunes** : se cogner en taverne **fait chuter l'affinité** entre les deux nains, jusqu'à en faire des **rivaux** déclarés (« … et … sont désormais rivaux. »).
- **La mort d'un ami frappe fort** : quand un nain périt, ses amis proches encaissent un **deuil bien plus lourd** que les simples témoins — de quoi faire vaciller tout un groupe soudé.
- **La fiche d'inspection** liste désormais les **amis et les rivaux** du nain sélectionné.
- Technique : besoin `social` (`needsSystem`) + composant `relationships` ; activité `socialize` arbitrée (`socializeSystem`) ; malus de deuil proportionné à l'affinité dans `moraleSystem`.

## 2026-07-26 — Beuverie et rixes de taverne

- **Trop de bière rend ivre** : à force de boire, un nain finit par être saoul (« … est ivre ! »). Un ivrogne **travaille au ralenti** et **cherche la bagarre** avec un camarade à proximité (« … cherche la bagarre ! »).
- **Bagarres à mains nues, pour de vrai** : les nains se cognent **au poing** (l'arme équipée ne compte pas), et **le nain frappé riposte** — une querelle peut vite tourner à la rixe générale. Un mort dans la mêlée donne « … est mort dans une rixe. »
- L'ivresse **redescend avec le temps** : une fois dessaoulé, le nain reprend le travail (« … a dessoûlé. »).
- À surveiller : une taverne trop bien fournie peut coûter cher — la bière n'est plus seulement un remontant de moral.
- Technique : composant `intoxication` + état `drunk` (hystérésis) ; nouvelle activité `brawl` arbitrée, combat nain-contre-nain à mains nues avec riposte (`provoked`).

## 2026-07-26 — L'équipement dans la fiche du nain

- **La fiche d'inspection affiche désormais l'équipement porté** : « Arme : hache (+8 dégâts) · Armure : cotte de plates (+5 déf.) », ou « aucune » quand l'emplacement est vide — d'un coup d'œil, on voit qui part au combat désarmé.

## 2026-07-26 — La montée en puissance par paliers

- Les recettes avancées ne sont plus disponibles d'emblée : forger une **hache**, une **lance**, une **cotte de plates** ou un **bouclier** exige d'avoir d'abord bâti un **atelier de taille**.
- Le panneau Objectifs l'annonce clairement — « **Verrouillé : un atelier de taille requis** » — puis débloque la recette dès que le prérequis est satisfait, sans redémarrage.
- Technique : prérequis déclaratifs (`requires`) sur les recettes — ajouter un palier ne demande que de la donnée.

## 2026-07-26 — Le brasero

- **Nouveau meuble de confort, le brasero** (☼, taillé à l'atelier de taille à partir de pierre) : les nains qui vivent à ses côtés voient leur moral remonter au fil du temps.
- Enfin une **seconde source de moral** hors de la bière — de quoi garder une colonie heureuse et prévenir les crises de nerfs.

## 2026-07-26 — Un arsenal élargi

- La forge produit désormais, en plus de l'épée et de la cotte de mailles : une **hache** (`γ`, plus de dégâts), une **lance** (`↑`), une **cotte de plates** (`]`, plus de protection) et un **bouclier** (`)`).
- À vous d'arbitrer : frapper plus fort ou encaisser davantage. Chaque pièce se réclame via le panneau Objectifs, comme l'épée.

## 2026-07-26 — Plus de nains figés par la faim ou la soif

- Un nain qui ne peut atteindre **ni nourriture ni eau** ne reste plus planté à attendre la mort : il **reprend le travail** en attendant qu'un accès s'ouvre.
- Le journal prévient **une seule fois**, en rouge — « **… n'a plus accès à l'eau !** », « **… ne peut atteindre aucune nourriture !** » — et la crise se lève d'elle-même dès qu'on creuse un passage.

## 2026-07-26 — Gérer sa main-d'œuvre

- **Nouvel outil ⚡ Urgent** : marquez une désignation (creuser, bâtir, fabriquer…) comme prioritaire et les nains la traiteront avant le reste ; les chantiers urgents s'affichent en **rouge-orange**.
- **Les nains ont des aptitudes** (Minage, Bûcheronnage, Artisanat, Construction, Agriculture, Pêche) : un spécialiste travaille plus vite dans son domaine. Cliquez un nain pour voir ses talents — de quoi valoriser chaque tête.

## 2026-07-26 — Les invasions montent d'un cran

- **Des vagues plus tôt, plus serrées et plus grosses** : la menace grandit avec votre population **et** votre richesse (armes, armures, ateliers), sans plafond figé.
- **Trois nouveaux ennemis** : la **brute** (`B`, coriace et cognant fort), l'**archer** (`a`, qui frappe à distance) et le **chef** (`G`, dont la présence renforce toute sa bande).
- **Une IA moins naïve** : un gobelin qui vous perd de vue poursuit votre **dernière position connue** avant d'abandonner — fini l'esquive en sortant d'un pas du champ de vision.
- **La fuite a enfin un but** : un nain acculé se replie vers un refuge sûr, typiquement **derrière une porte** que les gobelins ne peuvent franchir.

## 2026-07-26 — L'outil Démolir

- **Nouvel outil 🚫 Démolir** : selon la cible, il annule un chantier en attente, efface une zone au sol, ou envoie un nain **détruire** une construction, un meuble ou un objet (« … a démoli quelque chose. »).
- Portes et ponts se démontent aussi ; les cases marquées pour démolition s'affichent d'un **× rouge**.

## 2026-07-26 — Voir ce qui se passe dans la colonie

- **Bandeau d'état** en haut de l'écran : temps écoulé (⏱), population (☺), compte à rebours avant la prochaine vague (⚔) et chantiers disponibles / en cours / inaccessibles (⚒).
- **Panneau d'inspection enrichi** : au clic sur un nain, son activité, le **chantier en cours avec sa cible et son étape**, et ses aptitudes.
- **Alertes de crise au journal**, en rouge : nain isolé de l'eau ou de la nourriture, chantier devenu **inaccessible**.
- **Objectifs plus parlants** : « Bloqué : forge manquante », « Bloqué : minerai insuffisant (0 disponible) », « En production (n en file) ».
- **Repères sur la carte** : une barre de vie coiffe un nain blessé, une pastille signale un moral au plus bas ou une crise de rage.

## 2026-07-25 — La forge, les armes et les armures

- **Nouvelle forge** (🔥, bâtie à la menuiserie) : elle transforme le minerai en **épée** (`/`) et en **cotte de mailles** (`[`).
- **Piloté par le panneau Objectifs**, comme la bière : fixez une cible d'épées ou de cottes, l'intendance forge ce qu'il faut, et un nain oisif va s'équiper tout seul — « Urist s'arme. » Plus aucune arme à placer à la main.
- **La réponse à l'escalade des invasions** : une épée (+6 aux dégâts) abat un gobelin en deux fois moins de coups ; une cotte (−3 par coup encaissé) rend les nains bien plus coriaces.
- Un nain tué **lâche son équipement au sol** — récupérable par un survivant.
- Technique : nouveau système d'équipement (un emplacement arme + un armure) ; le combat lit l'équipement pour les dégâts et l'encaissement.

## 2026-07-25 — Les veines de minerai

- **Des veines de minerai** (`○` dorés) parsèment désormais la montagne. Les creuser fait tomber du **minerai** (`♦`) au lieu de la pierre.
- Le minerai est la matière première de la forge — la montagne recèle de quoi s'armer.

## 2026-07-25 — L'atelier de taille

- **Nouvel atelier de taille** (🗿, bâti à la menuiserie) : on y taille un **lit de pierre** et une **porte de pierre** à partir de la pierre.
- Une colonie creusée dans la roche, loin des arbres, peut se meubler entièrement en pierre.

## 2026-07-25 — La pierre

- **Creuser rapporte enfin quelque chose** : abattre un mur laisse une **pierre** (`*`) sur place.
- La pierre se range au stock **Matériaux** et bâtit des murs aussi bien que le bois — la montagne devient une réserve de construction, plus seulement de la place.

## 2026-07-25 — La barre d'outils réorganisée

- Les outils passent dans un **rail vertical à gauche**, groupés par famille (**Désigner** / **Zones** / **Bâtir**) : tout reste visible et cliquable en un seul coup, même à mesure que le jeu s'enrichit.

## 2026-07-25 — Les tombes

- **Nouvel outil ⚰ Tombe** : peignez une zone et les nains y portent les cadavres pour les enterrer — « Urist a enterré un mort. » L'enterrement **apaise le moral** des témoins.
- **Un cadavre laissé à l'air libre se putréfie** (« Un cadavre se putréfie à l'air libre… ») et ronge en continu le moral des nains alentour : enterrez vos morts, ou payez-en le prix.

## 2026-07-25 — Les stocks spécialisés

- **Deux nouvelles zones de stockage** : 🍞 **Nourriture** et 🪵 **Matériaux**, en plus du stockage général. Chaque objet rejoint la zone qui l'accepte ; la zone spécifique est préférée, la générale sert de repli.
- De quoi séparer les vivres des matériaux et raccourcir les trajets.

## 2026-07-25 — Les ateliers se construisent

- **Les ateliers ne sont plus gratuits** : la menuiserie (⚒) et la brasserie (🏺) se posent désormais comme un ordre de fabrication, **coûtent une bûche**, et la brasserie **exige une menuiserie** au préalable.

## 2026-07-25 — Deux plantages corrigés

- Fini le gel de la partie quand un nain **mourait dans l'instant même où le journal l'annonçait** (agonie de faim ou de soif, blessure fatale).
- Fini le gel quand un nain **livrait un objet ramassé pour un chantier abandonné** entre-temps.

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
