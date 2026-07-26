# PRD G21 — Cuisine et variété alimentaire

**Lot :** G — Chaîne économique · **Point :** 21 · **Statut :** 🔲 À faire · **Impact / Effort :** Moyen / Moyen

## Problème

Manger est un acte quasi binaire : dans `eatingSystem.js`, un nain affamé consomme la première nourriture atteignable et sa faim baisse de `food.nutrition` (valeur unique par item : `bread` 100, `mushroom` 80, `fish` 60 dans `items.json`). Une récolte crue vaut autant qu'un plat préparé, et le repas n'a **aucun effet moral différencié** (`moraleSystem.js` accorde un `ate: 10` fixe, quel que soit ce qui est mangé). Développer l'agriculture (`farmSystem`) ou la pêche (`fishSystem`) au-delà du strict besoin de survie n'apporte donc rien. La seule vraie source de moral pilotable reste la bière (`drankBeer: 15`).

## Objectif

Ajouter un **atelier de cuisine** qui transforme les récoltes et le poisson en **plats préparés** (nourriture de meilleure qualité), et faire dépendre le gain de moral du repas de la qualité et de la variété de ce qui est mangé. La cuisine devient une raison de développer l'agriculture et une deuxième source de moral pilotable, sur le modèle de la brasserie déjà pilotée par l'intendance (`stewardSystem`).

## Périmètre

**Inclus**
- Un atelier de cuisine (item + recette d'atelier, sur le modèle de `brewery`/`masonry`/`forge` dans `items.json` et `recipes.json`).
- Une ou plusieurs recettes de plats consommant des ingrédients existants (`mushroom`, `fish`, futur `meat` de G22) et produisant des items `food` à nutrition supérieure.
- Un effet moral du repas différencié selon la qualité du plat mangé, appliqué dans `moraleSystem.js`.
- Pilotage de la production par l'intendance (`stewardSystem`) via un objectif/cible, comme la bière.

**Exclus**
- Nouveaux types de tuiles, garde-manger dédié ou logistique de stockage spécifique aux plats.
- Système de périssabilité/décomposition des plats.
- Notion de « repas préféré » par nain, ou historique alimentaire individuel (une simple règle de qualité suffit).
- Boissons (déjà couvertes par la brasserie).

## Exigences fonctionnelles

1. Un atelier de cuisine est constructible par le joueur via le flux d'ateliers existant (recette d'atelier dans `recipes.json`, item `workshop` typé dans `items.json`).
2. Une recette de plat consomme un ingrédient de nourriture existant et produit un item porteur d'un composant `food` dont la `nutrition` est strictement supérieure à celle de l'ingrédient cru.
3. Manger un plat préparé donne un gain de moral supérieur à manger une récolte crue, sans casser le gain `ate` actuel pour la nourriture ordinaire.
4. La production de plats est pilotable via le panneau Objectifs (une cible traitée par `stewardSystem`, exactement comme `beer`).
5. La cuisine reste facultative : un nain affamé sans plat disponible mange toujours du cru (pas de blocage de la survie).

## Conception technique

- **Contenu data d'abord.** Ajouter dans `recipes.json` la recette de l'atelier `kitchen` (sur le modèle de `brewery` : `workshop: "carpentry"`, `produces: "kitchen"`) et la ou les recettes de plats (`workshop: "kitchen"`, `ingredient: <composant>`, `produces: <plat>`, `consumable: true`). Ajouter dans `items.json` l'atelier `kitchen` (composant `workshop.type = "kitchen"`) et le ou les plats (composant `food` + `item`). Aucune règle de cuisine spécifique ne doit vivre en dur : `craftSystem` fabrique déjà tout item via sa recette et son atelier.
- **Ingrédients par composant.** Les recettes ciblent un composant d'ingrédient (comme `brewable` pour la bière, `ore` pour la forge). Introduire un composant marqueur d'ingrédient cuisinable (ex. `cookable`) posé sur `mushroom`, `fish` (et la future `meat` de G22) dans `items.json`, plutôt que de coder en dur une liste d'items.
- **Qualité = donnée sur le composant `food`.** Distinguer plat et cru par une donnée pure portée par `food` (ex. `food.quality` ou un simple `food.cooked`), lue au moment de manger. Rester en composant-données pur, aucune méthode.
- **Effet moral dans `moraleSystem.js`.** `eatingSystem.js` émet déjà `EVENTS.DWARF_ATE` à la consommation ; enrichir la charge utile de l'événement avec la qualité du repas (fait accompli, `domaine.verbe-au-passé` respecté) et faire choisir à `moraleSystem` un delta selon la qualité, dans la table `EFFECTS` existante (ex. `ateMeal` > `ate`). Pas de nouvel événement impératif.
- **Pilotage par l'intendance.** `stewardSystem` réconcilie déjà toute recette `consumable` déclarée comme objectif (stock vs cible, post/annulation de jobs `craft`) ; une cible sur le plat suffit, sans code dédié. Le blocage « pas d'ingrédient » / « pas d'atelier » est déjà restitué par `findBlocker`.
- **Variété.** Traiter la « variété » par la donnée : plusieurs recettes de plats distinctes, chacune de qualité, plutôt qu'un suivi d'historique par nain. Si un vrai bonus de variété est souhaité, le trancher ci-dessous.
- Respect ECS et état auto-réparable : aucune réservation nouvelle, la consommation détruit l'entité plat comme aujourd'hui.

## Décision à trancher avant implémentation

- **Portée de la « variété ».** Deux options : (a) *variété implicite* — plusieurs plats de qualité, le gain moral dépend seulement de la qualité du plat mangé (simple, sans état par nain) ; (b) *variété explicite* — bonus supplémentaire si un nain mange des plats différents sur une fenêtre de temps (nécessite un composant mémoire alimentaire par nain, plus lourd). Recommandation : commencer par (a).
- **Représentation de la qualité.** Booléen `cooked` (deux niveaux : cru/cuisiné) vs échelle `quality` (plusieurs paliers). Recommandation : booléen suffisant pour un premier jet, extensible ensuite.

## Critères d'acceptation

- Un atelier de cuisine est constructible et une recette de plat y est fabriquée, consommant un ingrédient cru et produisant un item `food` de nutrition supérieure.
- Un nain qui mange un plat préparé gagne davantage de moral qu'un nain qui mange une récolte crue, toutes choses égales par ailleurs.
- La production de plats se pilote depuis le panneau Objectifs et se comporte comme la bière (montée en stock vers la cible, arrêt une fois atteinte, blocage restitué si ingrédient/atelier manquant).
- Aucun nain ne meurt de faim faute de plat s'il reste de la nourriture crue atteignable.

## Tests

- Scénario `tests/` : atelier de cuisine + stock d'ingrédient cuisinable + objectif de plat → au bout de N ticks, des plats préparés existent en stock et le nombre de jobs `craft` se stabilise à la cible.
- Scénario `tests/` : deux nains affamés, l'un mange un plat préparé, l'autre une récolte crue → le mangeur de plat a un moral strictement supérieur après le repas.
- Scénario `tests/` : nain affamé sans plat mais avec récolte crue atteignable → il mange le cru et survit (pas de blocage).
