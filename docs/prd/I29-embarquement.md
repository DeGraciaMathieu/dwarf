# PRD I29 — Choix d'embarquement (profils, difficulté, graine)

**Lot :** I — Rejouabilité · **Point :** 29 · **Statut :** ✅ Fait (hors graine reproductible, reportée) · **Impact / Effort :** Fort / Moyen

## Problème
Chaque partie démarre à l'identique. `main.js` code en dur `STARTING_DWARVES = 5` et `BREAD_COUNT = 8`, fait apparaître les cinq premiers noms de `creatures.dwarf.names`, dote la colonie de pains, puis lance la boucle directement — sans écran ni choix. La carte, générée par `generateTerrain(GRID.width, GRID.height, tiles)`, repose entièrement sur `Math.random` (dans `mountainBoundary`, `carveRiver`, `scatterPatches`, `scatterVeins`…) : elle est donc différente à chaque lancement mais jamais reproductible. La difficulté est fixe : la courbe de vagues de `goblinSpawnSystem.js` et la migration de `migrantSystem.js` sont invariables. Rien ne permet de varier ou de rejouer une même partie.

## Objectif
Ajouter un écran d'embarquement avant le lancement, permettant de choisir un profil de départ (nains, aptitudes, vivres — piloté par les données), une difficulté (qui module vagues, ressources et migration) et, si retenu, une graine de carte reproductible.

## Périmètre
**Inclus**
- Un écran d'embarquement affiché avant `main()`/le démarrage de la boucle, où le joueur choisit son profil et sa difficulté.
- Des profils de départ décrits par les données : nombre de nains, aptitudes/objets/vivres initiaux.
- Des niveaux de difficulté qui modulent les paramètres de `goblinSpawnSystem` (courbe de menace) et les ressources de départ, éventuellement la migration.
- Le câblage : le choix d'embarquement remplace la boucle de spawn codée en dur de `main.js`.
- (Selon décision) une graine de carte reproductible via un PRNG seedable injecté.

**Exclus**
- La légende de fin de partie et les jalons (I28).
- Les événements aléatoires (I30).
- Tout nouveau contenu de créatures/objets non nécessaire à un profil : les profils se composent à partir de `creatures.json`/`items.json` existants.
- La refonte du rendu du jeu : l'écran d'embarquement est une surcouche UI de préparation, pas une modification du canvas.

## Exigences fonctionnelles
1. Un écran d'embarquement s'affiche avant le lancement de la boucle ; tant qu'aucun choix n'est validé, la simulation ne démarre pas.
2. Le joueur choisit un profil de départ décrit dans les données : nombre de nains, aptitudes attribuées (`assignAptitude`), objets/vivres initiaux (remplace `STARTING_DWARVES` et `BREAD_COUNT`).
3. Le joueur choisit une difficulté qui module au moins la courbe de vagues de `goblinSpawnSystem` (constantes de menace) et les ressources de départ ; optionnellement la migration.
4. Le lancement construit le monde à partir des choix : spawn des nains du profil (`spawnFromDefinition` + `assignAptitude` + `assignPersonality` + `identity`), placement des vivres/objets, instanciation de `GoblinSpawnSystem` avec les paramètres de difficulté.
5. (Selon décision) le joueur saisit/obtient une graine ; deux parties avec la même graine et le même profil produisent la même carte et le même déroulé aléatoire initial.
6. Les valeurs par défaut de l'écran reproduisent la partie actuelle (5 nains, 8 pains, difficulté médiane) : ne rien choisir revient au comportement historique.

## Conception technique
- **Écran d'embarquement** : nouvelle surcouche `ui/` (ex. `ui/embarkScreen.js`) affichée avant l'instanciation du monde. Conformément à la règle « `ui/` n'exprime que des intentions », elle ne fait que collecter des choix et retourner une configuration ; c'est `main.js` qui construit le monde. Le corps de `main()` est réorganisé pour attendre cette configuration avant `startLoop`.
- **Profils & difficulté pilotés par les données** : décrire les profils et difficultés dans un fichier `src/data/*.json` (ex. `src/data/embark.json`) — liste de profils `{ dwarves, aptitudes, startingItems: [...] }` et de difficultés `{ waveParams, startingResources, migration }`. Cohérent avec la règle « contenu piloté par les données » : ajouter un profil ne demande pas de code neuf.
- **Câblage des vivres/nains** : remplacer les boucles codées en dur de `main.js` (`creatures.dwarf.names.slice(0, STARTING_DWARVES)` et la boucle `BREAD_COUNT`) par une itération sur le profil choisi, en réutilisant `spawnFromDefinition`, `assignAptitude`, `assignPersonality` et l'ajout d'`identity`.
- **Difficulté → vagues** : `goblinSpawnSystem.js` code aujourd'hui ses paramètres en constantes de module (`FIRST_WAVE_DELAY`, `BASE_INTERVAL`, `MIN_INTERVAL`, `MAX_WAVE_SIZE`, `POPULATION_COMFORT`…). Pour les moduler par difficulté, les rendre injectables via le constructeur (paramètre de config optionnel, valeurs actuelles par défaut) — extension rétrocompatible du constructeur, qui accepte déjà `terrain, archetypes, random`.
- **Graine reproductible (contrainte technique forte)** : `generateTerrain` et toute la génération de `terrain.js` reposent sur `Math.random`, non seedable en l'état. Une graine exige un **PRNG seedable injecté** partout où `terrain.js` tire de l'aléa, plus l'injection du même RNG dans `GoblinSpawnSystem` (3ᵉ argument déjà prévu) et là où `main.js` tire au sort (placement des nains via `spawnRegion[Math.floor(Math.random()*...)]`, choix de noms de `migrantSystem`). Le RNG injectable de `goblinSpawnSystem` est le précédent : généraliser ce contrat de « `random = Math.random` en dernier argument » à `generateTerrain(width, height, tiles, random)` et aux fonctions internes.
- **État** : la graine et le profil retenus peuvent être stockés dans une entité-composant singleton `embark` (données pures) pour figurer dans la sauvegarde et l'affichage ; sérialisée nativement par `save.js`.

## Décision à trancher avant implémentation
- **Graine reproductible ou non** : implémenter le PRNG seedable propagé à `terrain.js` + tous les points d'aléa de démarrage (coût réel : refactor de `terrain.js` pour accepter un `random` injecté partout) ; **ou** se limiter aux profils + difficulté et laisser la carte non reproductible. Recommandé : livrer profils + difficulté d'abord (valeur immédiate, faible risque), et traiter la graine comme un incrément séparé une fois `terrain.js` prêt à recevoir un RNG injecté.
- **Portée de la difficulté** : se limiter aux vagues + ressources de départ, ou inclure aussi la migration (`migrantSystem` : `MAX_POPULATION`, seuils de nourriture/lits, actuellement en constantes de module non injectables).
- **Format des profils** : profils fixes prédéfinis vs. paramétrage libre par le joueur (curseurs). Recommandé : quelques profils prédéfinis d'abord.

## Critères d'acceptation
- Un écran d'embarquement précède le démarrage ; la boucle ne tourne qu'après validation d'un choix.
- Choisir un profil modifie effectivement le nombre de nains, leurs aptitudes et les vivres de départ par rapport au démarrage actuel.
- Choisir une difficulté modifie la courbe de vagues (intervalle et/ou taille) produite par `goblinSpawnSystem` et les ressources de départ.
- Les valeurs par défaut reproduisent la partie historique (5 nains, 8 pains).
- (Si graine retenue) deux lancements avec la même graine et le même profil produisent une carte identique et un déroulé initial identique.

## Tests
- Scénario `tests/` (macro, harnais `tests/helpers.js`) : instancier `GoblinSpawnSystem` avec des paramètres de difficulté « facile » vs. « difficile » et un `random` déterministe injecté, faire tourner assez de ticks, et vérifier que l'intervalle/la taille des vagues diffèrent conformément à la difficulté.
- Scénario : appliquer un profil de départ (données) et vérifier après construction le nombre de `worker`, leurs aptitudes attribuées et le stock d'items initiaux.
- Scénario (si graine retenue) : générer deux terrains avec le même RNG seedable et vérifier que les grilles `terrain.tiles` sont identiques ; puis avec deux graines différentes, vérifier qu'elles diffèrent.
