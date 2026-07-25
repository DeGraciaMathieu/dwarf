---
name: jobs
description: Use when travaillant sur les jobs de Dwarf (dig, chop, haul, build, craft, plant, harvest) — cycle de vie, file, réservations, ou ajout d'un nouveau type de job.
auto_invoke: true
---

# Le système de jobs

File partagée (`src/core/jobBoard.js`) + assignation générique (`src/systems/jobAssignmentSystem.js`) + un système exécutant par type de job.

## Cycle de vie d'un job

| Étape | Qui | Détail |
|---|---|---|
| `post({type, target, ...})` | UI (`designation.js`) ou un système (haul, farm, steward pour les `craft` d'objectif de stock) | le job entre en file, `claimedBy: null` |
| `claim(entityId, position)` | `JobAssignmentSystem` | le job disponible le plus prioritaire, puis le plus proche (`job.priority`, défaut 0 ; l'outil « Urgent » de `designation.js` pose à 1) ; devient un composant `currentJob {job, path, progress}` sur le nain |
| `release(job)` | `JobAssignmentSystem` (activité ≠ work), `CombatSystem` (mort) | retour en file, un autre nain le reprendra |
| `cancel(job)` | `StewardSystem` (cible atteinte ou baissée) | retire un job **non réclamé** de la file ; un job réclamé va à son terme |
| `markUnreachable(job)` | l'exécutant (cible/matériau/atelier inaccessible) | job en pause, ignoré par `claim` |
| `resetUnreachable()` | `DigSystem`/`ChopSystem`/`FarmSystem` (récolte) à chaque complétion, `designation.js` à la pose d'un atelier | le monde a changé : tout redevient tentable |
| `complete(job)` | l'exécutant | retiré de la file |

## Règles non négociables

- **L'assignation ne connaît aucun type de job.** `JobAssignmentSystem` claim/release sur la seule base de `activity === 'work'` — ne jamais y ajouter de logique spécifique.
- **L'état durable vit sur le job, pas sur `currentJob`.** `currentJob` disparaît à chaque release (fuite, faim, mort) ; ce qui doit survivre à une interruption (ex. `job.producedId` du meuble déjà fabriqué dans `craftSystem.js`) se stocke sur l'objet job.
- **Boucle claim/release interdite.** Un job impossible *maintenant* → `markUnreachable`, jamais `release` (sinon le nain le réclame en boucle à chaque tick). `release` = « un autre peut le faire », `markUnreachable` = « personne ne peut, attendre un changement du monde ».
- **Progression** : `currentJob.progress += workEffort(world, entityId)` (`src/systems/workEffort.js`) — jamais `progress++`, le moral bas ralentit le travail.
- **Déplacement** : via `approach()` de `jobMovement.js`, mode `'adjacent'` pour agir sur une case non praticable (mur, arbre), `'onto'` pour se rendre sur une case.

## Exemples de référence

| Job | Système | Particularité à imiter |
|---|---|---|
| `dig` | `digSystem.js` | approche adjacente, progression, mutation du terrain, événement + spawn d'une pierre — ou de minerai si la tuile creusée est une veine `ore` (`spawnFromDefinition`) |
| `chop` | `chopSystem.js` | idem + spawn d'une bûche (`spawnFromDefinition`) |
| `haul` | `haulSystem.js` | auto-posté avec capacité bornée par pools de zones, deux phases, réservations auto-réparées (`pruneReservations`), lâcher générique (`dropOrphanedItems`) ; zones de stockage typées via `kind` (`food` : composants `food`/`drink`, `materials` : `buildMaterial`, sans étiquette : tout) — la zone spécifique est préférée, la générale sert de repli |
| `build` | `buildSystem.js` | matériau requis (`nearestFreeMaterial` de `materials.js`), attente si case cible occupée |
| `bury` | `graveSystem.js` | calqué sur `haul` (deux phases, réservations auto-réparées) mais dédié aux `corpse` vers la zone `graves` ; l'arrivée enterre le corps (`buried`) et émet `corpse.buried`. Le système gère aussi la putréfaction (`decay` → `rotten` + `corpse.rotted`) |
| `equip` | `equipSystem.js` | auto-posté (comme le haul) pour chaque arme/armure libre s'il reste un nain sans ce slot ; le nain s'y rend et l'équipe (`equipment[slot]`, l'objet perd sa `position`), émet `dwarf.equipped`. Un nain au slot déjà plein complète sans se déplacer |
| `craft` | `craftSystem.js` | quatre phases, état durable sur le job (`producedId`) ; atelier typé (`recipe.workshop`) et ingrédient configurable (`recipe.ingredient`, défaut `buildMaterial`) ; recette `consumable` (bière) : produit posé au sol à l'atelier, pas de phase d'installation |
| `plant`/`harvest` | `farmSystem.js` | jobs auto-postés par le système lui-même selon l'état des cases de champ |
| `fish` | `fishSystem.js` | auto-posté par case de zone de pêche (revérifie que la case est toujours de l'eau — un pont l'annule), produit un poisson aux pieds du pêcheur |
| `demolish` | `demolishSystem.js` | posté par l'outil « Démolir » (`designation.js`) ; `targetId` défini → entité (meuble, atelier, objet) détruite ; sinon tuile intégrée (porte → sol, pont → eau) repérée par sa `target`. Disparition pure. Le haul ignore les objets ayant un job `demolish` |

## Ajouter un nouveau type de job

1. Créer `src/systems/<type>System.js` : classe avec `update(world, eventBus)` qui itère `world.query('currentJob', 'position')` et filtre `currentJob.job.type === '<type>'`. S'inspirer de `digSystem.js` (simple) ou `buildSystem.js` (avec matériau).
2. Gérer les trois issues : `unreachable` → `markUnreachable` + `removeComponent(entityId, 'currentJob')` ; progression via `workEffort` ; complétion → `complete` + événement.
3. Déclarer l'événement de complétion dans `src/events/events.js` et son message dans `src/ui/eventLog.js`.
4. Enregistrer le système dans `src/main.js` (zone des jobs : entre `Dig` et `Farm`).
5. Le poster : mode dans `src/ui/designation.js` + bouton `data-tool` dans `index.html` (avec `ghost` sur le job si un fantôme doit s'afficher — `renderer.js` le dessine automatiquement), OU auto-post par un système (modèle : `postHaulJobs`, borné et dédupliqué via `hasJobAt`).
6. Libellé du job dans `JOB_LABELS` de `src/ui/inspectionPanel.js`.
7. Tests macro dans `tests/jobs.test.js` : cas nominal, cas inaccessible, cas interrompu (voir skill `testing`).
