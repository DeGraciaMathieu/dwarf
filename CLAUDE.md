# Dwarf

Simulation de colonie à la Dwarf Fortress dans le navigateur : des nains autonomes creusent, cultivent, fabriquent et se défendent sur une grille rendue en ASCII sur Canvas.

## Stack

- JavaScript vanilla (modules ES), HTML, CSS. Aucune dépendance, aucun build.
- Rendu : Canvas 2D. Boucle à pas fixe (5 ticks/s) découplée du rendu (`src/core/loop.js`).
- Lancer : `python3 -m http.server 8000` à la racine puis http://localhost:8000 (les modules ES et `fetch` exigent un serveur).
- Tests : `npm test` (runner natif `node --test`, suite dans `tests/`).
- Pas de linter ni de formateur configurés : suivre le style en place (indentation 4 espaces, points-virgules).

## Conventions de code

- **Code en anglais, textes UI / journal / commits en français.**
- **ECS strict** : les composants sont des données pures (jamais de méthodes) ; toute la logique vit dans les systèmes ; les entités ne sont que des identifiants.
- **Ordre des systèmes déterministe**, déclaré une seule fois dans `src/main.js`. Un tick = tous les systèmes dans l'ordre, puis `eventBus.flush()`.
- **Événements = faits accomplis uniquement** (`wall.dug`, `dwarf.died`), nommés `domaine.verbe-au-passé`, déclarés dans `src/events/events.js`. La logique de tick lit et écrit les composants directement ; le bus sert aux réactions transverses (journal, moral). Jamais d'événement impératif (« fais ceci »).
- **L'arbitre décide, les exécutants obéissent** : seul `arbiterSystem.js` écrit `activity` pour les nains. Un système exécutant filtre sur `activity.type` et ne décide jamais lui-même d'un changement de comportement.
- **Contenu piloté par les données** : créatures, objets, tuiles, plantes et recettes vivent dans `src/data/*.json`. Ajouter du contenu ne doit pas demander de nouveau code si les composants existent déjà.
- **`ui/` ne touche jamais aux composants de simulation.** L'UI lit le monde pour l'afficher et exprime les intentions du joueur uniquement via `jobBoard.post()`, les `Zone` ou `spawnFromDefinition` (outils de placement).
- **Jamais de logique métier dans `core/`** : `core/` contient les services génériques (ECS, bus, A*, file de jobs, zones). Les règles du jeu vivent dans `systems/`.
- État volatil (réservations, tampons d'événements) : toujours auto-réparable — le posséder dans le système et le reconstruire/purger à chaque tick plutôt que de compter sur un nettoyage exhaustif des cas de sortie.

## Comportement

- Toute nouvelle mécanique validée par des scénarios doit laisser ses scénarios dans `tests/` (tests macro de comportement, pas de tests unitaires d'implémentation).
- Si une approche échoue après 2 tentatives, reprendre le plan avant de continuer.
- Si le périmètre d'un skill change (nouveau système, nouveau type de job, nouvelle activité), mettre à jour le skill concerné dans la même passe.

## Skills disponibles

- `architecture` — carte du projet : rôles des dossiers, ordre du tick, où placer du nouveau code.
- `jobs` — cycle de vie d'un job (post/claim/release/unreachable) et procédure « ajouter un type de job ».
- `comportements` — l'arbitre d'activités, les scores, l'hystérésis, et « ajouter une activité ».
- `contenu` — les fichiers `src/data/*.json`, quel composant déclenche quel système, « ajouter une créature/un objet/une recette ».
- `testing` — commande, philosophie des tests macro, harnais `tests/helpers.js`, où placer un nouveau test.
- `feature` — workflow d'implémentation d'une fonctionnalité de bout en bout.
