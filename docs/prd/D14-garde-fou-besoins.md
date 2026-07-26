# PRD D14 — Garde-fou pathfinding besoins (eau, nourriture)

**Lot :** D — Robustesse · **Point :** 14 · **Statut :** ✅ Fait · **Impact / Effort :** Fort / Faible

## Problème

Deux boucles silencieuses potentiellement mortelles :
- `eatingSystem.js` : si aucun chemin vers la nourriture n'est trouvé, aucune cible n'est posée et le nain reste affamé indéfiniment sans signal.
- `drinkSystem.js` : un nain sans accès à l'eau reçoit `noWaterAccess`, retente périodiquement, et peut mourir sans que le joueur en soit informé.

Le système « échoue en silence » au lieu de marquer clairement l'impasse.

## Objectif

Détecter proprement l'**impossibilité d'assouvir un besoin** (aucune cible atteignable) et la matérialiser par un marqueur + une alerte, plutôt que par une boucle muette.

## Périmètre

**Inclus**
- Marquage explicite d'un nain qui ne peut atteindre ni nourriture ni eau.
- Émission d'un fait accompli (aligné sur PRD A02 : `dwarf.cannot-reach-food`, `dwarf.isolated-from-water`) à la transition.
- Réévaluation régulière pour lever le marqueur dès qu'une cible redevient atteignable.

**Exclus**
- Résolution automatique (déplacer une réserve, creuser un puits).
- Refonte de la recherche de cible (on ajoute un garde-fou, on ne réécrit pas la boucle).

## Exigences fonctionnelles

1. Quand aucune cible atteignable n'existe pour un besoin critique, poser un marqueur volatil et émettre l'événement de crise **une seule fois** (transition).
2. Réessayer périodiquement (cooldown) ; lever le marqueur et l'état de crise dès qu'une cible redevient atteignable.
3. Ne pas empêcher le nain de continuer d'autres activités possibles (le garde-fou signale, il ne fige pas).

## Conception technique

- Modifier `src/systems/eatingSystem.js` et `src/systems/drinkSystem.js`.
- Réutiliser le marqueur `noWaterAccess` existant côté soif ; ajouter l'équivalent côté faim.
- Émettre les événements déclarés en A02 (pattern marqueur + événement à la transition).
- État auto-réparable : purge/réévaluation chaque cycle.

## Critères d'acceptation

- Un nain enfermé sans eau est marqué et déclenche exactement une alerte, pas une par tick.
- Un nain sans chemin vers la nourriture est marqué et signalé au lieu de rester affamé en silence.
- Rouvrir l'accès (creuser un passage) lève le marqueur et l'alerte au cycle suivant.

## Tests

- Scénario `tests/` : nain isolé de la nourriture → marqueur posé + un seul événement ; après ouverture d'un chemin, marqueur levé.
- Scénario équivalent pour l'eau.
