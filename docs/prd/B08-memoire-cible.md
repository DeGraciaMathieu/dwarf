# PRD B08 — Mémoire de la cible (IA gobeline)

**Lot :** B — Tension de combat · **Point :** 8 · **Statut :** À faire · **Impact / Effort :** Moyen / Faible

## Problème

`src/systems/hostileSystem.js` recalcule sa cible **à chaque tick** et n'a aucune mémoire : dès qu'un nain sort de la portée de vision (8), le gobelin l'oublie instantanément et se remet à errer. Exploit trivial : un nain court hors de portée et la menace s'annule.

## Objectif

Donner aux ennemis une **mémoire de la dernière position connue** de leur cible pour poursuivre brièvement au-delà de la ligne de vue, supprimant l'oubli instantané.

## Périmètre

**Inclus**
- Composant de mémoire (ex. `chaseMemory { x, y, ttl }`) posé quand une cible est vue.
- Poursuite vers la dernière position connue tant que le TTL n'est pas épuisé, même sans ligne de vue.
- Oubli propre à l'expiration du TTL → retour à `wander`.

**Exclus**
- Coordination entre ennemis.
- Pathfinding agressif ou flanquement (hors périmètre).

## Exigences fonctionnelles

1. À la détection d'une cible dans `visionRange`, mémoriser sa position et (ré)armer un TTL.
2. Sans cible visible mais mémoire active : se déplacer vers la position mémorisée, décrémenter le TTL.
3. Arrivé sur la position mémorisée sans retrouver de cible, ou TTL épuisé : effacer la mémoire, revenir à `wander`.
4. La mémoire est un état volatil auto-réparable (reconstruit/purgé par le système).

## Conception technique

- Modifier `src/systems/hostileSystem.js` uniquement.
- Pattern marqueur volatil possédé par le système (cf. conventions d'état volatil).
- Réutiliser `findPath` existant vers la position mémorisée.

## Critères d'acceptation

- Un nain qui sort du champ de vision est poursuivi pendant la durée du TTL au lieu d'être oublié au tick suivant.
- Après expiration sans nouvelle détection, l'ennemi cesse la poursuite.
- Aucune poursuite éternelle (le TTL borne le comportement).

## Tests

- Scénario `tests/` : cible détectée puis retirée du champ de vision → l'ennemi continue vers la dernière position pendant TTL ticks, puis errance.
