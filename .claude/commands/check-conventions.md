Vérification rapide des conventions sur les changements en cours.

1. Lis `CLAUDE.md`.
2. Périmètre : `git diff`, `git diff --cached`, `git status --short`, `git log --oneline -5`. Rien à vérifier → « Rien à vérifier », stop.
3. Vérifie point par point (statut OK / VIOLATION / N/A, avec fichier:ligne) :
   - Composants purs, logique dans les systèmes, arbitre seul décideur d'`activity`.
   - Événements au passé dans `src/events/events.js` ; réactions transverses via le bus, logique de tick via les composants.
   - `ui/` sans logique métier, `core/` sans règle de jeu, contenu de gameplay dans `src/data/*.json`.
   - Code anglais / UI et journal français ; style en place (4 espaces, points-virgules).
   - Patterns partagés utilisés (`approach`, `workEffort`, `markUnreachable`/`release`, `nearestFreeMaterial`).
4. Cohérence tests/doc : nouveaux comportements couverts dans `tests/`, `tests/helpers.js` aligné sur `main.js`, skills à jour si le périmètre a bougé.
5. Lance `npm test` et rapporte le résultat.
6. Verdict global : **CONFORME** ou **À CORRIGER** + corrections priorisées.
