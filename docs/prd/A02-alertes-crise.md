# PRD A02 — Alertes de crise (eau, nourriture, job inaccessible)

**Lot :** A — Lisibilité · **Point :** 2 · **Statut :** ✅ Fait · **Impact / Effort :** Fort / Faible

## Problème

Plusieurs situations mortelles sont **silencieuses** :
- Un nain isolé de l'eau reçoit le marqueur `noWaterAccess` et meurt de soif en ~24 s sans aucun signal.
- Si le pathfinding vers la nourriture échoue, aucune cible n'est posée → famine sans alerte.
- Un job marqué `unreachable` ne produit aucune trace ; le joueur ignore qu'une zone est piégée.

Le joueur découvre les crises uniquement en voyant un nain mourir.

## Objectif

Émettre des **faits accomplis** journalisables quand une crise de survie ou d'accessibilité survient, pour que le joueur soit averti à temps.

## Périmètre

**Inclus**
- Nouveaux événements : `dwarf.isolated-from-water`, `dwarf.cannot-reach-food`, `job.unreachable`.
- Abonnement du journal (`src/ui/eventLog.js`) avec rendu visuellement distinct (crise).
- Émission **uniquement à la transition** (entrée dans l'état), pas à chaque tick.

**Exclus**
- Résolution automatique des crises (autres PRD : D13, D14).
- Alertes sonores.

## Exigences fonctionnelles

1. `job.unreachable` émis quand un job passe pour la première fois en `unreachable` (dans `jobBoard.markUnreachable` ou le système appelant).
2. `dwarf.isolated-from-water` émis à la pose du marqueur `noWaterAccess` (dans `drinkSystem.js`), pas à chaque retry.
3. `dwarf.cannot-reach-food` émis quand un nain affamé ne trouve aucune cible atteignable (dans `eatingSystem.js`).
4. Le journal affiche ces événements avec un style d'alerte (rouge) et un message FR clair.

## Conception technique

- Déclarer les constantes dans `src/events/events.js` (nom `domaine.verbe-au-passé`).
- Émettre via `eventBus.emit()` depuis les systèmes concernés, **à la transition** (pattern marqueur + événement).
- Le style d'alerte est ajouté dans `eventLog.js` + `style.css`.
- Respecter « événements = faits accomplis » : ces événements décrivent un état constaté, pas un ordre.

## Critères d'acceptation

- Un nain enfermé loin de l'eau déclenche exactement **une** entrée de journal en rouge, pas une par tick.
- Une désignation de dig dans une poche isolée déclenche `job.unreachable` visible au journal.
- Aucun spam : re-déclenchement seulement après sortie puis nouvelle entrée dans l'état.

## Tests

- Scénario `tests/` : nain sans accès à l'eau → un seul événement `dwarf.isolated-from-water` sur N ticks.
- Scénario : dig désigné dans une région isolée → `job.unreachable` émis une fois.
