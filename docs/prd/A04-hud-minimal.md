# PRD A04 — HUD minimal (horloge, population, vague, jobs)

**Lot :** A — Lisibilité · **Point :** 4 · **Statut :** ✅ Fait · **Impact / Effort :** Fort / Faible

## Problème

Le jeu n'affiche **aucun repère global** : pas d'horloge/compteur de ticks, pas de population, pas d'indication sur la prochaine vague de gobelins, pas de nombre de jobs en attente. Le joueur ne peut ni mesurer sa progression ni anticiper la menace.

## Objectif

Afficher un bandeau d'état permanent avec les indicateurs macro essentiels, mis à jour en temps réel.

## Périmètre

**Inclus**
- Compteur de temps (ticks écoulés, ou converti en « jours/heures » de colonie).
- Population de nains vivants.
- Compte à rebours ou estimation avant la prochaine vague (depuis `GoblinSpawnSystem`).
- Nombre de jobs disponibles / en cours / inaccessibles (depuis `JobBoard`).

**Exclus**
- Graphiques ou historiques.
- Contrôle (le HUD est en lecture seule).

## Exigences fonctionnelles

1. Un conteneur HUD dans `index.html`, rendu par un petit module UI (ex. `src/ui/hud.js`).
2. Le HUD lit : le nombre de ticks (exposé par la boucle ou un compteur simple), `world.query('worker').length`, l'état de `GoblinSpawnSystem` (prochain spawn), et des compteurs `JobBoard`.
3. Rafraîchissement dans `onRender`.

## Conception technique

- Nouveau module `src/ui/hud.js`, câblé dans `main.js` (comme `objectivesPanel`).
- Exposer le prochain tick de spawn : ajouter un getter lisible sur `GoblinSpawnSystem` (lecture seule) et/ou un compteur de ticks global.
- Ajouter au besoin des helpers de comptage sur `JobBoard` (`countAvailable`, `countUnreachable`) sans changer sa logique.
- Respecter « pas de logique métier dans l'UI » : le HUD agrège et affiche, il ne décide rien.

## Critères d'acceptation

- Le HUD affiche la population qui décroît immédiatement à la mort d'un nain.
- Le compte à rebours de vague diminue et se réinitialise après un spawn.
- Le compteur de jobs reflète les désignations posées/consommées.

## Tests

- Test macro `tests/` sur les helpers `JobBoard.countAvailable/countUnreachable` (valeurs correctes après post/claim/markUnreachable).
- Test sur le getter « prochain spawn » du `GoblinSpawnSystem`.
