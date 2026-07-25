# PRD C12 — Contrôle de l'immigration

**Lot :** C — Contrôle joueur · **Point :** 12 · **Statut :** À faire · **Impact / Effort :** Moyen / Faible

## Problème

`src/systems/migrantSystem.js` fait arriver des migrants automatiquement (check à tick 900 puis tous les 600 ticks, plafond 12), sous la seule condition d'un stock de nourriture suffisant. Le joueur subit la croissance : il ne peut ni la freiner quand la colonie n'est pas prête, ni l'accélérer.

## Objectif

Donner au joueur un **levier sur l'immigration** : autoriser, mettre en pause, ou plafonner l'arrivée de nouveaux nains.

## Périmètre

**Inclus**
- Interrupteur UI « accueil ouvert / fermé ».
- Optionnel : réglage d'un plafond de population cible côté joueur.
- Journalisation claire des arrivées (et des refus pour cause de famine, cf. A02).

**Exclus**
- Système de réputation/attractivité de la colonie.
- Choix nominatif des migrants.

## Exigences fonctionnelles

1. Un état « immigration autorisée » (booléen) contrôlé par l'UI, lu par `MigrantSystem`.
2. Quand fermé, aucune arrivée même si les conditions sont réunies.
3. Un plafond de population ajustable par le joueur (dans les limites du `MAX_POPULATION`).
4. Chaque arrivée émet un événement journalisé ; un refus pour famine émet un événement dédié.

## Conception technique

- Exposer un réglage lu par `migrantSystem.js` (fourni au constructeur ou via un petit objet de config partagé, comme les `objectives` du steward).
- Bouton/toggle dans `index.html` + câblage dans `main.js` / un module UI.
- L'UI exprime une intention via ce réglage, sans toucher aux composants de simulation.

## Critères d'acceptation

- Immigration fermée → aucun migrant n'arrive, même avec nourriture et lits suffisants.
- Immigration ouverte → comportement actuel préservé, dans la limite du plafond joueur.
- Les arrivées et refus apparaissent au journal.

## Tests

- Scénario `tests/` : accueil fermé → population stable sur N ticks malgré conditions remplies.
- Scénario : accueil ouvert mais plafond joueur atteint → pas d'arrivée.
