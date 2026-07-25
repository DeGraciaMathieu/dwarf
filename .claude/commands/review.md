Revue complète des changements en cours.

## Périmètre

1. Lis `CLAUDE.md` (conventions et comportement).
2. Récupère le périmètre : `git diff`, `git diff --cached`, `git status --short`, `git log --oneline -5`.
3. S'il n'y a aucun changement (diffs vides, rien d'untracked pertinent), réponds « Rien à revoir » et arrête-toi.

## Vérifications — pour chaque point, statut OK / VIOLATION / N/A avec fichier:ligne

**Conventions (`CLAUDE.md`)**
- Composants = données pures, logique dans les systèmes uniquement.
- Événements au passé, déclarés dans `src/events/events.js`, émis pour des faits accomplis (pas d'événement impératif).
- Seul l'arbitre écrit `activity` des nains ; les exécutants filtrent.
- `ui/` sans logique métier — intentions joueur via jobBoard/zones/spawn uniquement.
- `core/` sans règle de jeu.
- Contenu en JSON (pas de valeurs de gameplay codées en dur qui auraient leur place dans `src/data/`).
- Code en anglais, textes UI/journal en français.
- Patterns : `approach()` pour les déplacements de jobs, `workEffort()` pour la progression, `markUnreachable` vs `release`, état durable sur le job.

**Couverture de tests**
- Chaque mécanique nouvelle/modifiée a ses scénarios macro dans `tests/` (nominal, empêché, interrompu).
- Nouveau système enregistré dans `main.js` → aussi dans `tests/helpers.js`, même rang.

**Maintenabilité**
- Responsabilité unique par système ; pas de duplication avec un helper existant (`jobMovement`, `materials`, `workEffort`).
- Fonctions courtes, à un seul niveau d'abstraction ; nommage qui dit l'intention.
- Pas de magic values : les nombres de gameplay vont dans `src/data/`, les constantes techniques en tête de fichier.
- Pas de code mort : imports, constantes, classes CSS inutilisés.

**Cohérence système**
- Ordre du tick respecté et justifié si modifié.
- La bascule d'activité déclenche les nettoyages existants (job relâché, cible retirée, charge déposée) — pas de nettoyage recodé.
- UI synchronisée : journal, inspection (labels), désignation/boutons si nouvel outil.
- Skills mis à jour si le périmètre a changé.

## Finalisation

- Lance `npm test` et rapporte le résultat (nombre de tests, échecs éventuels).
- Termine par un rapport : liste des points avec statut, puis verdict global — **CONFORME** ou **À CORRIGER** avec la liste priorisée des corrections.
