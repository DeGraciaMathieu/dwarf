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
| `src/core/zones.js` | `Zone` : ensembles de cases peintes avec étiquette optionnelle `kind` (stockages typés, champs, tombes, infirmerie) | aucun |
| `src/core/spawn.js` | `spawnFromDefinition(world, def, position)` — instancie une définition JSON | world |
| `src/systems/*` | Toute la logique de jeu (voir ordre du tick ci-dessous) | core, events, data |
| `src/events/events.js` | Constantes des types d'événements | aucun |
| `src/data/*.json` | Contenu : créatures, objets, tuiles, plantes, recettes | — |
| `src/ui/*` | Rendu, journal, inspection, désignation, barre d'outils, objectifs de stock (`objectivesPanel.js` — lit `objective.status`, écrit `objective.target`) | world (lecture), jobBoard/zones/objectifs (intentions joueur) |
| `src/save.js` | Sauvegarde/chargement : instantané JSON de l'état durable (composants, terrain, zones, jobs) ; purge les composants volatils sauf les hystérésis (`sleeping`, `tantruming`), repose les objets portés au sol, déclaime les jobs | world, terrain, jobBoard, zones |
| `src/main.js` | Assemblage : fetch des data, ordre des systèmes, spawn initial, UI, boucle, boutons 💾/📂 (localStorage `dwarf.save`) | tout |

## Ordre du tick (déclaré dans `src/main.js` — ne pas réordonner sans raison)

`Needs → Attrition → Morale → Intoxication → GoblinSpawn → Migrant → Steward → Arbiter → JobAssignment → Eating → Drink → Sleep → Socialize → Rescue → Heal → Flee → Fight → Brawl → Tantrum → Dig → Chop → Haul → Grave → Equip → Build → Craft → Demolish → Farm → Fish → Hostile → Combat → Injury → Movement → JobAlert`

Logique : les besoins montent, le moral encaisse, l'intendance réconcilie les objectifs de stock (poste/retire les jobs de craft avant l'arbitrage, pour qu'ils soient réclamables au même tick), l'arbitre décide, les exécutants agissent, les hostiles répliquent, l'errance en dernier.

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
