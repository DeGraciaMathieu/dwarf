# PRD E18 — Progression par paliers

**Lot :** E — Richesse de contenu · **Point :** 18 · **Statut :** ✅ Fait · **Impact / Effort :** Fort / Moyen

## Problème

Toutes les recettes sont disponibles d'emblée (`recipes.json`) : le joueur peut viser directement la forge et l'équipement. Il n'y a pas de **courbe de progression** ni de sentiment de déblocage ; le contenu s'épuise vite une fois la chaîne forge en place.

## Objectif

Étaler la progression en **conditionnant certaines recettes/ateliers** à des prérequis (paliers), pour créer un rythme de déblocage et donner du sens à la montée en puissance.

## Périmètre

**Inclus**
- Un mécanisme de prérequis déclaratif sur les recettes (ex. `requires: [...]` : atelier existant, item déjà produit, ou palier atteint).
- Filtrage des recettes disponibles à l'UI/au steward selon les prérequis remplis.
- Feedback : recette verrouillée affichée avec sa condition de déblocage.

**Exclus**
- Arbre technologique complexe à branches multiples (une chaîne linéaire simple suffit pour v1).
- Recherche/points de science.

## Exigences fonctionnelles

1. Ajouter un champ de prérequis dans `recipes.json`, interprété par un point unique (steward et/ou UI de désignation craft).
2. Une recette non débloquée n'est ni proposée à la construction ni postée par le steward.
3. L'UI indique la condition manquante (cohérent avec PRD A03).
4. Les prérequis sont data-driven (ajouter un palier ne demande pas de code neuf).

## Conception technique

- Contenu dans `src/data/recipes.json` (champ prérequis).
- Un helper partagé évalue « recette débloquée ? » à partir de l'état du monde (ateliers présents, items produits), consommé par `stewardSystem.js` et `designation.js`.
- Rester déclaratif : la logique lit les prérequis, elle ne les code pas en dur par recette.

## Critères d'acceptation

- Une recette avancée est indisponible tant que son prérequis n'est pas rempli.
- Remplir le prérequis (ex. construire l'atelier requis) débloque la recette sans redémarrage.
- L'UI explique pourquoi une recette est verrouillée.

## Tests

- Scénario `tests/` : recette avec prérequis non rempli → absente des recettes disponibles et non postée par le steward ; après satisfaction du prérequis → disponible.
