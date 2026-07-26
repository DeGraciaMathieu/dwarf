# PRD I31 — Variété de biomes et de ressources

**Lot :** I — Rejouabilité · **Point :** 31 · **Statut :** 🔲 À faire · **Impact / Effort :** Moyen / Moyen

## Problème

Le générateur `generateTerrain(width, height, tileDefinitions)` de `core/terrain.js` produit toujours la même carte : une montagne à droite (via `mountainBoundary`, ratios `MOUNTAIN_MIN/MAX/START_RATIO`), une plaine à gauche parsemée de bosquets (`GROVE_FILL`), de rochers (`OUTCROP_FILL`) et de lacs (`LAKE_FILL`), une rivière (`carveRiver`, `RIVER_START_RATIO`) et des veines de minerai (`scatterVeins`, tuile `ore`). Toutes les parties partent donc du même paysage.

Côté ressources, `plants.json` ne contient qu'une seule plante (`mushroom`, cultivée par `farmSystem.js` sur la Zone `farms`) et `digSystem.js` ne lâche que deux drops : `items.stone` (roche) ou `items.ore` (minerai, quand la tuile creusée vaut `ore`). Il n'existe donc aucun choix stratégique lié au terrain : chaque carte offre le même arbre de décision.

## Objectif

Introduire de la variété d'embarquement sans nouveau moteur : (a) plusieurs **biomes**, chacun étant un jeu de RATIOS et une palette de tuiles distincts appliqués dans `generateCandidate` ; (b) plus de **ressources** exploitables (nouvelles plantes cultivables, second matériau minier / gemme) déclarées en data. La cible est le « data-first » : ajouter un biome ou une culture ne doit toucher qu'un fichier `src/data/*.json` ou une table de presets, pas la logique de systèmes.

## Périmètre

**Inclus**
- Un ensemble de **presets de biome** (au moins 3 : forêt dense, aride/rocailleux, gelé) exprimés comme jeux de ratios de génération + palette de tuiles, consommés par `generateCandidate`.
- La sélection d'un biome au démarrage d'une partie (crochet vers l'embarquement I29).
- 1 à 2 **nouvelles plantes/cultures** dans `plants.json`, cultivables via `farmSystem.js` et la Zone `farms` existante.
- Un **second matériau minier ou une gemme** : nouvelle tuile dans `tiles.json`, dispersée façon veine, et son drop via `digSystem.js`, avec un débouché (forge / troc) cohérent avec `recipes.json` / `items.json`.

**Exclus**
- Les biomes de cavernes en profondeur et la stratification verticale (couverts par le PRD z-levels J36).
- Toute refonte du moteur de génération (pas de bruit de Perlin, pas de nouveau squelette d'algorithme) : on paramètre l'existant.
- Nouveaux systèmes de récolte : les cultures ajoutées réutilisent `farmSystem.js` sans code neuf.

## Exigences fonctionnelles

1. La génération accepte un **biome** en paramètre : les constantes de ratio aujourd'hui figées en tête de `core/terrain.js` (`MOUNTAIN_MIN/MAX/START_RATIO`, `OUTCROP_DENSITY/FILL`, `GROVE_DENSITY/FILL`, `VEIN_DENSITY/FILL`, `LAKE_DENSITY/FILL`, `RIVER_START_RATIO`) deviennent des valeurs fournies par le preset de biome retenu.
2. Au moins 3 biomes visuellement et stratégiquement distincts (ex. « forêt dense » = fort `GROVE_FILL`, faible montagne ; « aride » = beaucoup de rochers, peu d'arbres, pas de rivière ou rivière étroite ; « gelé » = palette froide, lacs plus larges).
3. Chaque biome reste **jouable** : la garantie de `isPlayable` (grande région connexe ≥ `MIN_CONNECTIVITY`, accès à l'eau, contact plaine/montagne pour creuser) doit tenir pour tous les presets ; un preps qui échoue `GENERATION_ATTEMPTS` fois retombe sur un candidat valide comme aujourd'hui.
4. Le joueur voit / choisit le biome au lancement (voir Décision) ; à défaut de choix, un biome est tiré au sort par carte.
5. Au moins une nouvelle culture est plantable et récoltable via la Zone `farms` et `farmSystem.js`, avec ses stades `young`/`mature` et son `growthTicks` en data comme `mushroom`.
6. Une nouvelle tuile de ressource minière (gemme ou 2ᵉ minerai) apparaît dans la montagne d'au moins un biome, est creusable, et `digSystem.js` en lâche l'item correspondant.
7. Le nouvel item minier possède un débouché : entrée d'une recette de `recipes.json` (forge) ou valeur de troc, sans quoi il n'a pas d'intérêt.

## Conception technique

- **Presets de biome** : une table (data ou constante module) associant un nom de biome à l'ensemble des ratios + à la palette de tuiles. `generateTerrain` et `generateCandidate` reçoivent ce preset au lieu de lire les constantes de module. Les fonctions existantes (`mountainBoundary`, `carveRiver`, `scatterPatches`, `scatterVeins`, `carveFords`) prennent leurs seuils depuis le preset. La contrainte « code en anglais, data/UI en français » impose des noms de biome anglais côté clé, libellés français côté UI.
- **Palette** : les tuiles restent déclarées dans `tiles.json` (`floor`/`wall`/`ore`/`tree`/`door`/`water`/`bridge`) ; un biome peut réaffecter couleurs/glyphes via des variantes de tuile en data. La nouvelle ressource minière est une **nouvelle clé de tuile** (avec `walkable:false`, comme `ore`) dispersée par une variante de `scatterVeins`.
- **Point d'entrée** : `generateTerrain(...)` est appelé une seule fois dans `src/main.js` (avec `tiles`) ; c'est là que le biome choisi/tiré est passé. Aucun changement d'ordre du tick n'est requis (la génération est hors boucle).
- **Cultures data-first** : ajouter une plante à `plants.json` (stades `young`/`mature`, `growthTicks`) suffit dès lors que `farmSystem.js` sait en instancier une culture ; réutiliser la Zone `farms` déjà instanciée dans `main.js`. Ne pas dupliquer de logique de croissance.
- **Drop minier** : sur le modèle de `digSystem.js` (`dug === 'ore' ? oreDefinition : stoneDefinition`), généraliser le choix du drop selon le type de tuile creusée pour couvrir la nouvelle ressource, en injectant sa définition d'item comme `oreDefinition` l'est aujourd'hui.
- **Persistance** : `save.js` sérialise `terrain.tiles` génériquement ; une nouvelle clé de tuile et un nouvel item (entité-composant) sont persistés sans code dédié. Le biome retenu, s'il doit survivre au save, se range dans le snapshot au même titre que le terrain.
- **État auto-réparable** : rien de volatil n'est introduit ; la génération est déterministe pour un preset donné et un tirage `Math.random`.

## Décision à trancher avant implémentation

Le biome est-il **choisi par le joueur à l'embarquement** (crochet UI vers I29, un écran de sélection de site) ou **tiré au sort par carte** (rejouabilité passive, zéro UI) ? Le premier renforce l'agentivité et se combine à I29 ; le second est livrable seul et immédiatement. Trancher conditionne l'ampleur du travail UI.

## Critères d'acceptation

- Lancer plusieurs parties produit des cartes reconnaissablement différentes selon le biome (densité d'arbres, de rochers, présence/largeur de rivière, palette).
- Chaque biome disponible génère une carte jouable (région connexe suffisante, eau accessible, front montagne creusable).
- Au moins une nouvelle culture peut être désignée sur une Zone `farms`, pousse, et se récolte.
- Au moins un biome contient la nouvelle ressource minière ; la creuser lâche l'item attendu, utilisable dans une recette ou un troc.
- Une partie sauvegardée puis rechargée retrouve son terrain et ses items neufs à l'identique.

## Tests

- Scénario `tests/` : pour chaque preset de biome, générer un terrain et vérifier via les helpers de `core/terrain.js` (`largestWalkableRegion`) qu'il satisfait `MIN_CONNECTIVITY` et touche l'eau (mêmes garanties que `isPlayable`).
- Scénario `tests/` : creuser une tuile de la nouvelle ressource minière et vérifier que l'item correspondant est bien apparu (à la manière du drop `ore` de `digSystem.js`).
- Scénario `tests/` : planter et laisser mûrir la nouvelle culture sur une Zone `farms`, puis vérifier la récolte via `farmSystem.js`.
