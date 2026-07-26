# PRD J34 — Santé approfondie (maladies et séquelles)

**Lot :** J — Profondeur · **Point :** 34 · **Statut :** 🔲 À faire · **Impact / Effort :** Moyen / Moyen

## Problème
La santé d'un nain est quasi binaire. La seule chose qui abîme `health {value, max}` durablement, c'est le combat : sous `WOUND_THRESHOLD` (`combatSystem.js`), le nain reçoit un composant `injury {bleeding, incapacitated}` et l'event `dwarf.wounded`, puis `injurySystem.js` fait descendre `health` (issue : mort par `dwarf.bled-out` via `death.js`, ou secours à l'infirmerie par `rescueSystem.js` puis soin par `healSystem.js`). En dehors du combat, seul `attritionSystem.js` érode `health` quand un besoin (`hunger`/`thirst`) est au maximum, jusqu'à la mort. Résultat : un nain est soit intact, soit en train de mourir. Aucune **maladie** ne naît de l'environnement pourtant déjà hostile (cadavres `rotten` via `stenchOfDecay` dans `moraleSystem.js`, hiver via `seasonSystem.isWinter`, faim durablement haute), et aucune **séquelle** ne subsiste après une blessure grave. La convalescence n'a pas de poids : soit on meurt, soit on redevient neuf.

## Objectif
Ajouter une couche de santé intermédiaire et durable via un composant de données pures `condition` (posé/retiré par un nouveau système `conditionSystem.js`), couvrant deux familles :
- des **maladies** aux causes environnementales déjà présentes (puanteur des cadavres `rotten`, froid de l'hiver, malnutrition quand `hunger` reste haute) ;
- des **séquelles** après une blessure grave (ex. membre affaibli → vitesse et effort réduits).
La condition se résorbe par le repos et l'infirmerie existante (`healSystem.js`, Zone `infirmary`, composant `bed`), et son effet est lu par les systèmes existants (`workEffort.js`, mouvement, moral). L'état reste auto-réparable (reconstruit/purgé chaque tick).

## Périmètre
**Inclus**
- Un composant `condition` (données pures) portant l'état de santé durable d'un nain (type de mal, sévérité, éventuelle échéance de guérison).
- Un système `conditionSystem.js` qui pose la condition selon des causes ancrées : proximité prolongée de cadavres `rotten`, `seasonSystem.isWinter`, `hunger` maintenue à `max`, et blessure grave passée (via l'event `dwarf.wounded` ou la levée d'un composant `injury`).
- Un effet lisible : malus de vitesse de déplacement et/ou malus d'effort réutilisant la chaîne de `workEffort.js`, et pénalité de moral via `moraleSystem.js` (pile `thoughts` + table `EFFECTS`).
- Une guérison par le repos / l'infirmerie : `healSystem.js` (ou son itération) réduit puis retire la condition, plus vite avec un `bed`.
- Un signalement au joueur : event de fait accompli (journal `ui/eventLog.js`) à l'apparition et à la disparition de la condition, et affichage dans `ui/inspectionPanel.js`.

**Exclus**
- L'anatomie détaillée par membre (blessures localisées, infections chirurgicales, amputations) — déjà exclue par F20.
- La contagion entre nains (épidémie, quarantaine).
- Une carte de température/hygiène par tuile.
- Tout nouveau métier de soin (médecin, diagnostic) au-delà de l'infirmerie existante.

## Exigences fonctionnelles
1. Un nain peut porter un composant `condition` décrivant un mal durable de santé, distinct de `injury` (saignement de combat) et des besoins (`hunger`/`thirst`).
2. `conditionSystem.js` pose une maladie quand une cause environnementale ancrée persiste : exposition prolongée à un cadavre `rotten` proche (même détection que `moraleSystem.stenchOfDecay`), hiver (`seasonSystem.isWinter`), ou faim maintenue au maximum (malnutrition, lue depuis `hunger`).
3. Une séquelle peut être posée à la sortie d'une blessure grave (à la levée du composant `injury` par `healSystem.js`, ou en réaction à `dwarf.wounded`).
4. Tant que la condition est active, elle applique un effet mesurable : réduction de vitesse de déplacement et/ou réduction de l'effort de travail (via `workEffort.js`), et une pensée négative dans `moraleSystem.js`.
5. La condition se résorbe par le repos et l'infirmerie (`healSystem.js`, Zone `infirmary`, `bed` accélère), puis le composant est retiré une fois guérie.
6. L'apparition et la disparition émettent chacune un event de fait accompli (`domaine.verbe-au-passé`, déclaré dans `src/events/events.js`) alimentant le journal ; `ui/inspectionPanel.js` affiche l'état de santé courant.
7. L'état est auto-réparable : le système reconstruit/purge son suivi de causes à chaque tick et gère les nains issus d'anciennes sauvegardes sans composant `condition`.

## Conception technique
- **Composant** `condition` : données pures uniquement (ex. `{ type, severity, expiresAtTick? }`), sérialisé nativement par `save.js` (sauf s'il doit rejoindre `VOLATILE_COMPONENTS`, ce qui n'est pas souhaité ici puisqu'on veut conserver maladie/séquelle en sauvegarde).
- **Système** `conditionSystem.js` dans `src/systems/`, enregistré dans l'ordre du tick de `src/main.js`. Placement à discuter : après `moraleSystem`/`needsSystem`/`seasonSystem` (dont il lit les états) et avant les exécutants dont l'effet dépend de la condition. Il ne décide jamais d'`activity` : seul `arbiterSystem.js` écrit `activity` ; le système se contente de poser/retirer `condition` et de laisser l'arbitre pousser vers le repos/l'infirmerie via les scores existants.
- **Détection des causes** (auto-réparable) : réutiliser la détection de proximité de cadavres `rotten` de `moraleSystem.stenchOfDecay`, `seasonSystem.isWinter(world)`, et la lecture de `hunger` (composant data configuré dans `main.js`). Le compteur d'exposition par nain se reconstruit chaque tick plutôt que de dépendre d'un nettoyage exhaustif.
- **Effet** : brancher un facteur `condition` dans `workEffort.js` (qui cumule déjà moral × ivresse × aptitude) pour le malus d'effort ; le malus de vitesse s'applique côté déplacement en lisant `condition`. La pénalité de moral passe par la pile `thoughts` + `EFFECTS` de `moraleSystem.js` (nouvelle entrée d'effet).
- **Guérison** : `healSystem.js` (Zone `infirmary`, `bed.recoveryMultiplier`) décrémente la sévérité de `condition` en plus de traiter `injury`, puis retire le composant à guérison ; ou une échéance `expiresAtTick` pour les maladies temporaires (voir décision).
- **Événements** : déclarer les faits accomplis d'apparition/guérison dans `src/events/events.js` (forme `domaine.verbe-au-passé`) ; le journal et l'inspection réagissent sans que `ui/` touche aux composants de simulation.

## Décision à trancher avant implémentation
Maladies **temporaires** (guérison automatique par échéance `expiresAtTick` et/ou repos, retour à l'état neuf) vs **séquelles permanentes** (effet résiduel qui subsiste malgré les soins, ex. membre affaibli à vie). Choix possible : maladies temporaires guérissables + séquelles permanentes issues des blessures graves — ce qui fixe si `condition` porte ou non une échéance et comment `healSystem` la traite.

## Critères d'acceptation
- Un nain exposé durablement à un cadavre `rotten`, à l'hiver, ou à la faim maximale finit par recevoir un composant `condition`.
- Tant que `condition` est présente, le nain se déplace plus lentement et/ou produit moins (effet visible via `workEffort.js`), et porte une pensée négative.
- Un nain sorti d'une blessure grave peut conserver une séquelle avec effet mesurable.
- Le repos à l'infirmerie (avec `bed`) résorbe une maladie temporaire plus vite qu'ailleurs ; le composant est retiré une fois guéri.
- L'apparition et la guérison apparaissent au journal ; `ui/inspectionPanel.js` montre l'état de santé.
- Une sauvegarde/rechargement conserve la condition en cours ; un nain sans composant `condition` (ancienne save) ne provoque aucune erreur.

## Tests
- Scénario `tests/` : forcer une cause (cadavre `rotten` proche prolongé, ou hiver via `seasonSystem`, ou `hunger` à `max`) et vérifier l'apparition du composant `condition` puis l'émission de l'event correspondant.
- Scénario `tests/` : un nain porteur d'une `condition` a un `workEffort` et/ou une vitesse mesurablement réduits par rapport à un nain sain.
- Scénario `tests/` : un nain blessé (composant `injury`) soigné à l'infirmerie ressort avec une séquelle (si l'option séquelle permanente est retenue).
- Scénario `tests/` : repos à l'infirmerie avec `bed` — la sévérité de `condition` décroît puis le composant est retiré (guérison).
