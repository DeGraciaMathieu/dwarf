---
name: architecture
description: Use when modifiant ou explorant la structure du projet Dwarf — pour savoir quel dossier/fichier porte quelle responsabilité et où placer du nouveau code.
auto_invoke: true
---

# Architecture de Dwarf

ECS + bus d'événements + services partagés. Un tick = tous les systèmes dans l'ordre déclaré dans `src/main.js`, puis livraison des événements (`eventBus.flush()`).

## Carte des modules

| Module | Rôle | Dépendances clés |
|---|---|---|
| `src/core/world.js` | Registre ECS : entités, composants (`Map` nom → `Map` id → données), `query()`, `tick()` | aucun |
| `src/core/eventBus.js` | Bus : `emit()` met en file, `flush()` livre en fin de tick | aucun |
| `src/core/loop.js` | Boucle à pas fixe (5 t/s), retourne `{speed}` pour pause/vitesse | `performance`, `requestAnimationFrame` |
| `src/core/terrain.js` | Grille 2D hors ECS (`get/set/isWalkable`), génération (montagne, rivière à gués, lacs, bosquets, veines de minerai — avec validation de jouabilité et retirage), `largestWalkableRegion` | `tiles.json` |
| `src/core/pathfinding.js` | `findPath(terrain, from, to)` — A* 8-directionnel, Chebyshev | terrain |
| `src/core/jobBoard.js` | File de jobs : `post/claim/release/cancel/markUnreachable/resetUnreachable/complete/hasJobAt/hasAvailableJobs` | aucun |
| `src/core/zones.js` | `Zone` : ensembles de cases peintes avec étiquette optionnelle `kind` (stockages typés, champs, tombes, infirmerie, chambres) | aucun |
| `src/core/spawn.js` | `spawnFromDefinition(world, def, position)` — instancie une définition JSON | world |
| `src/systems/*` | Toute la logique de jeu (voir ordre du tick ci-dessous) | core, events, data |
| `src/events/events.js` | Constantes des types d'événements | aucun |
| `src/data/*.json` | Contenu : créatures, objets, tuiles, plantes, recettes | — |
| `src/ui/*` | Rendu, journal, inspection, désignation, barre d'outils, objectifs de stock (`objectivesPanel.js` — lit `objective.status`, écrit `objective.target`) | world (lecture), jobBoard/zones/objectifs (intentions joueur) |
| `src/save.js` | Sauvegarde/chargement : instantané JSON de l'état durable (composants, terrain, zones, jobs) ; purge les composants volatils sauf les hystérésis (`sleeping`, `tantruming`), repose les objets portés au sol, déclaime les jobs | world, terrain, jobBoard, zones |
| `src/main.js` | Assemblage : fetch des data, ordre des systèmes, spawn initial, UI, boucle, boutons 💾/📂 (localStorage `dwarf.save`) | tout |

## Ordre du tick (déclaré dans `src/main.js` — ne pas réordonner sans raison)

`Season → Freeze → Needs → Attrition → Morale → Intoxication → GoblinSpawn → Migrant → RandomEvent → Steward → Arbiter → JobAssignment → Eating → Drink → Sleep → Socialize → Rescue → Heal → Flee → Fight → Brawl → Tantrum → Dig → Chop → Haul → Perish → Grave → Equip → Build → Craft → Demolish → Farm → Fish → Hostile → Combat → Injury → Movement → JobAlert → Chronicle`

Logique : la saison avance, les besoins montent, le moral encaisse, l'intendance réconcilie les objectifs de stock (poste/retire les jobs de craft avant l'arbitrage, pour qu'ils soient réclamables au même tick), l'arbitre décide, les exécutants agissent, les hostiles répliquent, l'errance en dernier.

**Saisons** (`seasonSystem.js`, en tête du tick) : un compteur sur une entité-composant singleton `season {ticks, index}` (sérialisée nativement) cycle printemps→été→automne→hiver (600 ticks chacune) et émet `season.changed`. L'helper `isWinter(world)` (lecture seule) est lu par `farmSystem` (croissance suspendue), `freezeSystem` (gel des berges) et `migrantSystem` (arrivées suspendues). Aucun état persistant sur les nains : tout redevient normal au dégel.

**Gel hivernal** (`freezeSystem.js`, juste après `seasonSystem`) : à l'entrée de l'hiver, une fraction (`FREEZE_RATIO = 0,6`) des cases `water` du terrain devient `ice` (non marchable, non buvable, non pêchable, glyphe/couleur distincts) ; le reste demeure de l'eau libre. Au dégel, toute la glace redevient `water`. L'état vit **dans le terrain** (sérialisé) : la présence de glace fait office de marqueur « déjà gelé cet hiver », donc le gel ne se rejoue qu'une fois. RNG injectable (dernier argument). `drinkSystem` ne bloque plus l'hiver globalement : on boit à toute eau libre atteignable (`touchesWater` ignore la glace), le puits restant toujours sûr.

**Événements aléatoires** (`randomEventSystem.js`, parmi les systèmes de « monde », après `MigrantSystem`) : calqué sur `goblinSpawnSystem` — entité-composant singleton `randomEvents {ticks, countdown, cooldowns}` (sérialisée nativement), intervalle jitteré, RNG injectable en dernier argument. À chaque rendez-vous, tirage pondéré dans une table de données (`src/data/events.json`) filtrée par conditions (`minPopulation`/`maxPopulation`/`minCrops`) et cooldown par événement ; sans événement éligible, rien ne se passe. Chaque effet se branche sur l'existant (santé, cultures, `spawnFromDefinition` d'hostile/nain, `terrain.set`) et émet un fait accompli dédié (`event.*`) annoncé par `eventLog`. Placé tôt car il peut faire apparaître hostiles/migrants et modifier le terrain avant les systèmes qui les traitent.

**Chronique** (`chronicleSystem.js`, en fin de tick) : tient la « légende » de la colonie sur une entité-composant singleton `chronicle` (compteurs + hauts faits bornés + jalons franchis + `ended`, sérialisée nativement, survit au save/load). Deux modes : (a) s'abonne dans son constructeur aux faits accomplis du bus (`migrant.arrived`, `dwarf.died`, `goblin.slain`, `item.crafted`, `dwarf.befriended`/`fell-out`, `season.changed`) pour l'agrégation narrative ; (b) son `update` lit le monde chaque tick pour les jalons dérivés (pic de population, richesse) et émet `colony.ended` une seule fois à l'extinction (plus aucun `worker`, garanti par le flag `ended`). `chronicleScore(chronicle)` donne le score agrégé (lecture seule). L'UI `legendPanel.js` lit `chronicle` sans jamais l'écrire.

## Où placer du nouveau code

| Type de changement | Où |
|---|---|
| Nouveau service générique (sans règle de jeu) | `src/core/` |
| Nouvelle mécanique / règle de jeu | nouveau système dans `src/systems/` + enregistrement dans `main.js` |
| Nouveau type de job | voir skill `jobs` |
| Nouvelle activité (comportement de nain) | voir skill `comportements` |
| Nouveau contenu (créature, objet, recette…) | `src/data/*.json`, voir skill `contenu` |
| Nouvel événement | constante dans `src/events/events.js` + abonné (journal : `src/ui/eventLog.js`) |
| Nouvel outil joueur | bouton dans `index.html` + mode dans `src/ui/designation.js` |
| Helper partagé entre systèmes | module dans `src/systems/` (ex. `jobMovement.js`, `workEffort.js`, `materials.js`) |

## Patterns transverses à respecter

- **Déplacement de job** : toujours via `approach(world, terrain, entityId, currentJob, destination, 'onto'|'adjacent')` de `src/systems/jobMovement.js` — jamais de pathfinding ad hoc dans un système de job.
- **Marqueur + événement de transition** : pour signaler l'entrée/sortie d'un état (fuite, rage, sommeil), poser/retirer un composant-marqueur (`fleeing`, `tantruming`, `sleeping`) et n'émettre l'événement qu'à la transition.
- **Hystérésis** : un état qui ne doit pas osciller (sommeil, crise) a un seuil d'entrée et un seuil de sortie distincts, arbitrés dans `arbiterSystem.js`.
- **Objets portés** : composant `carrying {itemId, destination?}` ; l'objet porté perd son composant `position`. Le lâcher générique est géré par `HaulSystem.dropOrphanedItems` — un job qui légitime un port doit exposer l'id via `job.itemId`, `job.producedId` ou `currentJob.materialId`.
- **La mort passe par `kill()` de `src/systems/death.js`** quelle qu'en soit la cause (combat, inanition, causes futures) : cadavre (composant `corpse`), job relâché, charge lâchée, **équipement lâché au sol**, événement `dwarf.died {name, x, y, cause}` (ou `goblin.slain`). Ne jamais dupliquer cette logique.
- **L'équipement** (`src/systems/equipSystem.js`) : le composant `equipment {weapon, armor}` référence les items portés (arme/armure, sans `position` tant qu'ils sont équipés). Un job `equip` auto-posté (comme le haul) envoie un nain oisif ramasser une arme/armure libre. `combatSystem` lit `equipment` : dégâts = base + arme, encaissés = `max(1, dégâts − armure)`.
- **Les cadavres pourrissent et s'enterrent** (`src/systems/graveSystem.js`) : le composant `corpse` vieillit (`decay`), passe `rotten` au seuil (`corpse.rotted` + malus de moral de proximité dans `moraleSystem`), et un job `bury` vers une case de la zone `graves` le transforme en `buried` (`corpse.buried` + apaisement du moral). Le haul générique ignore les `corpse`.
