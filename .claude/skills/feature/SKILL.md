---
name: feature
description: Use when implémentant une fonctionnalité de Dwarf de bout en bout — workflow complet de la compréhension à la synthèse.
user_invocable: true
---

# Workflow : implémenter une fonctionnalité

## 1. Comprendre

- Reformuler la demande en une phrase et identifier le périmètre exact.
- Invoquer le skill `architecture` (et `jobs`/`comportements`/`contenu` selon le sujet) pour situer la mécanique dans l'existant.
- Poser les questions de clarification **avant de coder** si la demande ne tranche pas : valeurs numériques (seuils, durées en ticks, portées), interactions avec l'existant (que fait un nain occupé/affamé/en fuite pendant X ?), cas limites (ressource absente, cible détruite en route, interruption). Sinon, choisir des valeurs cohérentes avec `src/data/*.json` et les annoncer.

## 2. Implémenter

- Respecter `CLAUDE.md` : composants purs, l'arbitre décide, événements au passé, contenu en JSON, UI sans logique métier.
- Réutiliser les patterns en place (`approach`, `workEffort`, marqueur + événement, `markUnreachable`) plutôt qu'en inventer.
- Brancher l'UI : journal (`eventLog.js`), inspection (`inspectionPanel.js`), outil (`designation.js` + `index.html`) si le joueur interagit.

## 3. Tester

- Écrire les scénarios macro dans `tests/` (voir skill `testing`) : nominal, empêché, interrompu.
- `npm test` jusqu'au vert — corriger le code, pas le test, sauf si l'attente du test était fausse (le dire explicitement).

## 4. Synchroniser

- Si le périmètre d'un skill change (nouveau job, nouvelle activité, nouveau composant fonctionnel, nouveau système dans le tick) : mettre à jour le skill concerné, `CLAUDE.md` si une convention naît, et **l'ordre des systèmes dans `tests/helpers.js`**.
- Ajouter l'entrée du chantier en tête de `PATCHNOTES.md` (format et ton : voir les entrées existantes — orienté joueur, court).

## 5. Résumer

- Fichiers modifiés et pourquoi, tests ajoutés, valeurs choisies et leurs raisons, limites assumées, résultat de `npm test`.
