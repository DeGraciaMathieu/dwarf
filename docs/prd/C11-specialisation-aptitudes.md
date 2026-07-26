# PRD C11 — Spécialisation et aptitudes

**Lot :** C — Contrôle joueur · **Point :** 11 · **Statut :** ✅ Fait · **Impact / Effort :** Fort / Moyen

## Problème

Tous les nains sont interchangeables : n'importe qui fait n'importe quel job à la même vitesse. Il n'y a aucune raison de gérer sa population, ni de valoriser un nain particulier. Le seul modulateur d'effort est le moral (`workEffort.js`, binaire 0.5/1).

## Objectif

Introduire des **aptitudes par nain** (ex. mineur, bûcheron, artisan) influençant la vitesse de travail et, optionnellement, la préférence de job — donnant de la profondeur à la gestion de colonie.

## Périmètre

**Inclus**
- Composant `skills` (données pures : niveau par catégorie de tâche).
- Modulation de `workEffort()` par l'aptitude correspondant au type de job en cours.
- Optionnel : léger biais de l'arbitre/assignation vers les jobs correspondant aux aptitudes.
- Affichage des aptitudes dans le panneau d'inspection.

**Exclus**
- Montée en niveau par l'expérience (peut faire l'objet d'un PRD ultérieur).
- Interdiction stricte de tâches (on garde des généralistes capables).

## Exigences fonctionnelles

1. Ajouter `skills` aux nains via `creatures.json` (valeurs initiales, éventuellement variées par nain).
2. `workEffort()` combine le multiplicateur de moral existant et un multiplicateur d'aptitude selon le type de job.
3. Le mapping « type de job → catégorie d'aptitude » est centralisé.
4. Le panneau d'inspection (PRD A01) affiche les aptitudes.

## Conception technique

- Contenu dans `src/data/creatures.json` ; logique dans `src/systems/workEffort.js` (signature étendue pour connaître le type de job).
- Les systèmes exécutants passent le type de job à `workEffort()`.
- Respect ECS : `skills` est de la donnée pure ; la logique reste dans les systèmes.

## Critères d'acceptation

- Un nain avec forte aptitude minière creuse plus vite qu'un nain sans aptitude.
- Le moral bas reste un malus cumulable avec l'aptitude.
- Les aptitudes sont visibles à l'inspection.

## Tests

- Scénario `tests/` : deux nains avec aptitudes minières différentes → progression de dig différente sur un même nombre de ticks.
- Scénario : moral bas + aptitude → effort résultant conforme à la combinaison attendue.
