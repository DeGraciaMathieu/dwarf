# PRD J36 — Niveaux verticaux et cavernes (z-levels)

**Lot :** J — Profondeur · **Point :** 36 · **Statut :** 🔲 À faire · **Impact / Effort :** Très fort / Très élevé (architectural)

## Problème
Le monde est une **grille 2D unique**. Tout le moteur le suppose : `main.js` déclare `GRID {width:40, height:25}` et `generateTerrain(width, height, tiles)` construit un `Terrain(width, height, tiles, tileDefinitions)` dont `this.tiles` est un **tableau 2D** (`get(x,y)` → `tiles[y][x]`, `set(x,y,type)`, `isWalkable(x,y,{hostile})`). `core/pathfinding.js` fait un A* **strictement 2D** (`findPath(terrain, from, to, movement)`, clé `y * terrain.width + x`). Le `renderer.js` dessine tout le terrain sur un canvas 2D dimensionné à `terrain.width × terrain.height × tileSize`. `ui/designation.js` mappe un clic pixel → tuile `(x, y)` via `tileSize`. `save.js` sérialise `terrain.tiles` tel quel (2D) et le restaure en copiant chaque ligne. On ne creuse donc qu'à l'horizontale : la verticalité — descendre vers des couches de plus en plus riches **et** dangereuses — qui est le cœur de Dwarf Fortress et le plus fort multiplicateur de profondeur, est absente.

## Objectif
Introduire des **niveaux verticaux (z-levels)** : une surface plus N niveaux de cavernes reliés par escaliers/rampes, les couches profondes portant davantage de minerai/gemmes et des créatures plus dangereuses. C'est un **chantier architectural** : `Terrain` devient une **pile de niveaux** (indexée par `z`), le pathfinding gère le passage entre niveaux via des tuiles de liaison (escaliers), le `renderer` affiche **un niveau à la fois** avec un sélecteur, et `designation.js`/`save.js`/la plupart des systèmes opèrent par niveau. Le PRD est **phasé** : un premier incrément volontairement restreint (structure verticale + navigation + rendu mono-niveau), puis des couches plus tard (fluides/magma/éboulements) explicitement exclues du premier jet.

## Périmètre
**Inclus (premier incrément)**
- Une **pile de niveaux** : surface (z=0) + N niveaux de cavernes en dessous, chacun une grille 2D de même largeur/hauteur.
- Des **tuiles de liaison verticale** : escaliers montants/descendants (et/ou rampes) permettant de passer d'un niveau à l'autre à une position `(x, y)` donnée.
- Un **pathfinding inter-niveaux** : l'A* trouve un chemin qui emprunte les escaliers pour relier `(x, y, z)` à `(x', y', z')`.
- Un **rendu mono-niveau** : le `renderer` affiche un seul niveau à la fois, avec un **sélecteur de niveau** (monter/descendre) dans l'UI.
- Le **creusement par niveau** : la désignation (`designation.js`) agit sur le niveau actif ; les couches profondes offrent plus de minerai/gemmes.
- Des **créatures plus dangereuses** en profondeur (via le contenu `src/data/creatures.json` et l'apparition existante).
- La **sauvegarde** de la pile de niveaux complète (`save.js`).

**Exclus (repoussés à des incréments ultérieurs)**
- Les **fluides** (eau, magma), l'écoulement et la pression entre niveaux.
- Les **éboulements**, effondrements de plafond, gestion du support structurel.
- La **visibilité multi-niveaux** (voir le niveau du dessous en transparence sous les trous).
- La génération procédurale élaborée des cavernes profondes (biomes souterrains, veines complexes) au-delà d'une distribution de minerai enrichie par profondeur.
- Le pathfinding de vol / créatures volantes traversant les niveaux hors escaliers.

## Exigences fonctionnelles
1. Le monde comporte plusieurs niveaux empilés verticalement (surface + N cavernes), chacun de dimensions `width × height`, adressables par une coordonnée de profondeur `z`.
2. Des tuiles de liaison (escaliers/rampes) relient deux niveaux adjacents à une position ; un nain ne change de niveau qu'en empruntant une telle liaison.
3. Le pathfinding relie une origine et une destination situées sur des niveaux différents en passant par les liaisons ; il échoue proprement (aucun chemin) si les niveaux ne sont pas reliés — cohérent avec la gestion `unreachable` existante des jobs.
4. Le joueur voit un seul niveau à la fois et peut changer de niveau actif via un sélecteur ; le rendu reflète le niveau sélectionné.
5. La désignation de creusement (`designation.js`) s'applique au niveau actif ; creuser vers le bas peut créer/révéler la liaison vers le niveau inférieur.
6. Les niveaux profonds portent une distribution plus riche de minerai/gemmes et peuvent faire apparaître des créatures plus dangereuses.
7. La sauvegarde et le rechargement restituent l'intégralité de la pile de niveaux et le niveau actif ; les autres composants sérialisés (positions, zones, jobs) restent cohérents avec leur niveau.
8. L'ordre du tick reste déterministe ; les systèmes opèrent par niveau sans qu'un système ne modifie `activity` en dehors d'`arbiterSystem.js`.

## Conception technique
- **`core/terrain.js`** — `Terrain` devient une **pile de grilles 2D** plutôt qu'une seule. Deux formes possibles (voir décision) : soit un tableau 3D `this.tiles[z][y][x]`, soit une pile de `Terrain` 2D (une instance par niveau) coiffée d'un conteneur `WorldMap`. Les accesseurs deviennent `get(x, y, z)` / `set(x, y, z, type)` / `isWalkable(x, y, z, {hostile})`, ou restent 2D par niveau si on garde une instance par niveau. `generateTerrain` génère la pile (surface + N cavernes) et pose les liaisons initiales éventuelles.
- **`core/pathfinding.js`** — l'A* passe d'un espace d'états 2D (`key = y * width + x`) à un espace **3D** (`key = z * width * height + y * width + x`). Le voisinage d'un nœud inclut, en plus des 8 voisins planaires, les nœuds `z±1` **uniquement** au-dessus/en-dessous d'une tuile de liaison (escalier/rampe). `findPath` prend des coordonnées incluant `z`. L'heuristique intègre un coût de changement de niveau.
- **`ui/renderer.js`** — actuellement dimensionne le canvas à `terrain.width × terrain.height × tileSize` et parcourt le terrain 2D. Il devient **mono-niveau** : il dessine le niveau actif (une coupe `z` de la pile) et n'affiche zones/entités que si elles appartiennent à ce niveau. Un **sélecteur de niveau** (monter/descendre) pilote le `z` affiché ; à confirmer si c'est dans le HUD (`ui/hud.js`) ou un contrôle dédié.
- **`ui/designation.js`** — `tileAt(event)` mappe déjà pixel → `(x, y)` via `tileSize` ; il faut y adjoindre le `z` du niveau actif pour produire `(x, y, z)`. Les désignations et le `onDwarfClick` opèrent sur le niveau visible.
- **`save.js`** — `serializeGame` sérialise `terrain.tiles` (2D) ; il doit sérialiser la **pile complète** (chaque niveau) plus le niveau actif. `restoreGame` reconstruit la pile (aujourd'hui : `snapshot.terrain.map((row) => [...row])`). Les positions d'entités doivent porter/retrouver leur `z` (le composant `position` gagne une coordonnée `z`, ou reste 2D avec un composant de niveau — voir décision). Les zones (`core/zones.js`) doivent elles aussi être qualifiées par niveau.
- **Systèmes** — la plupart lisent `terrain`/`position` et deviennent conscients du `z` : les exécutants de jobs (`digSystem`, `chopSystem`, `haulSystem`, `buildSystem`, etc.), le mouvement (`movementSystem`, `jobMovement`), les apparitions (`goblinSpawnSystem`, `migrantSystem`, `hostileSystem`) et la détection de proximité (combat, moral). L'ordre du tick de `main.js` reste inchangé dans sa séquence ; c'est la dimension `z` qui s'ajoute aux données, pas de nouveaux points d'insertion majeurs.
- **Contenu** — la distribution de minerai/gemmes par profondeur et les créatures dangereuses profondes passent par `src/data/tiles.json` et `src/data/creatures.json` + la génération de terrain, sans nouveau code si les composants existent déjà.

### Phasage explicite
- **Phase 1 (ce PRD)** : structure verticale (surface + N niveaux), escaliers/rampes, pathfinding inter-niveaux, rendu mono-niveau + sélecteur, creusement par niveau, minerai enrichi en profondeur, sérialisation de la pile.
- **Phase 2 (plus tard)** : fluides (eau/magma) et écoulement entre niveaux.
- **Phase 3 (plus tard)** : éboulements / support structurel, visibilité multi-niveaux en transparence.
Les phases 2 et 3 sont **exclues** du premier jet.

## Décision à trancher avant implémentation
- **Refonte 3D complète vs surface + pile limitée** : représenter le terrain comme un vrai tableau 3D `tiles[z][y][x]` avec accesseurs `(x, y, z)` partout, ou conserver des instances `Terrain` 2D empilées sous un conteneur (moins invasif pour les systèmes existants qui reçoivent déjà `terrain`). Ce choix conditionne la signature de `get/set/isWalkable`, de `findPath`, et la forme sérialisée dans `save.js`.
- **Où vit le `z` d'une entité** : ajouter une coordonnée `z` au composant `position` (impacte tous les systèmes qui lisent la position) vs un composant `level`/`depth` séparé. Idem pour les zones (`core/zones.js`) qui doivent être qualifiées par niveau.
- **Portée du premier incrément** : nombre de niveaux N, présence de rampes en plus des escaliers, et si creuser vers le bas révèle dynamiquement le niveau inférieur ou si tous les niveaux sont générés d'emblée.

## Critères d'acceptation
- Le monde comporte au moins la surface + un niveau de caverne, chacun une grille `width × height`.
- Un nain relie deux positions sur des niveaux différents en empruntant un escalier ; sans liaison, le pathfinding échoue proprement (job `unreachable`).
- Le rendu affiche un seul niveau ; le sélecteur change le niveau visible et le rendu suit.
- Creuser sur un niveau profond peut fournir plus de minerai/gemmes qu'en surface.
- Des créatures plus dangereuses peuvent apparaître en profondeur.
- Sauvegarde/rechargement restitue toute la pile, le niveau actif, et les positions/zones cohérentes par niveau.
- L'ordre du tick reste déterministe ; `activity` n'est écrit que par `arbiterSystem.js`.

## Tests
- Scénario `tests/` : construire une pile à deux niveaux reliés par un escalier ; `findPath` renvoie un chemin traversant l'escalier entre `(x, y, z=0)` et `(x', y', z=1)`.
- Scénario `tests/` : deux niveaux non reliés → `findPath` échoue, et un job posé sur l'autre niveau devient `unreachable` (cohérent avec le mécanisme existant).
- Scénario `tests/` : sérialiser puis restaurer un monde multi-niveaux ; la pile, le niveau actif et les positions d'entités par niveau sont identiques après rechargement.
- Scénario `tests/` : creuser une tuile riche sur un niveau profond produit plus de minerai/gemmes qu'une tuile équivalente en surface (distribution pilotée par les données).
