# PRD A03 — Détail des blocages d'objectifs

**Lot :** A — Lisibilité · **Point :** 3 · **Statut :** À faire · **Impact / Effort :** Moyen / Faible

## Problème

Le panneau d'objectifs (`src/ui/objectivesPanel.js`) affiche un objectif bloqué avec un message générique (« bloqué : aucun atelier », « bloqué : rien à produire »). Le joueur ne sait pas **quel** atelier ni **quel** ingrédient manque, ni combien. Le `StewardSystem` calcule déjà un `blocker` (`no-workshop`, `no-ingredient`) mais l'information est trop pauvre pour agir.

## Objectif

Enrichir le blocage affiché pour qu'il soit **directement actionnable** : nommer l'atelier requis et l'ingrédient manquant, avec le compte disponible vs requis.

## Périmètre

**Inclus**
- Enrichir `objective.status` produit par `StewardSystem` : type de blocage + détail (nom d'atelier, nom d'ingrédient, quantité libre).
- Affichage FR lisible dans `objectivesPanel.js`.

**Exclus**
- Résolution automatique (ne pas auto-poster l'atelier manquant).
- Changement de la logique de priorité entre objectifs (voir C10).

## Exigences fonctionnelles

1. `StewardSystem` expose dans `objective.status` : `{ stock, blocker, detail }` où `detail` contient le nom d'atelier requis (depuis la recette) et/ou l'ingrédient + quantité libre.
2. Le panneau traduit : « Bloqué : brasserie manquante » ou « Bloqué : minerai insuffisant (0 disponible) ».
3. Si non bloqué mais production en cours, afficher « en production (n en file) ».

## Conception technique

- Modifier `src/systems/stewardSystem.js` (calcul du `detail`) et `src/ui/objectivesPanel.js` (rendu).
- Réutiliser les libellés de recette existants (`recipes.json`, champ `label`, `workshop`, `ingredient`).
- L'UI reste en lecture seule ; le steward reste seul à écrire `objective.status`.

## Critères d'acceptation

- Objectif « épée » sans forge → « Bloqué : forge manquante ».
- Objectif « épée » avec forge mais 0 minerai → « Bloqué : minerai insuffisant (0 disponible) ».
- Objectif atteignable avec jobs en file → « en production (n en file) ».

## Tests

- Scénario `tests/` : objectif épée, aucune forge → `objective.status.blocker === 'no-workshop'` et `detail.workshop === 'forge'`.
- Scénario : forge présente, aucun minerai → `blocker === 'no-ingredient'`, `detail.ingredient === 'ore'`, `detail.free === 0`.
