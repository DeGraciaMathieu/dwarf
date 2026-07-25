# PRD A01 — Afficher le job et l'intention du nain

**Lot :** A — Lisibilité · **Point :** 1 · **Statut :** ✅ Fait · **Impact / Effort :** Fort / Faible

## Problème

Le panneau d'inspection (`src/ui/inspectionPanel.js`) affiche les barres de besoins (santé, moral, faim, soif, fatigue) mais **jamais ce que le nain est en train de faire ni pourquoi**. Quand un nain « patine » (cherche un chemin, aucun lit libre, job inaccessible), le joueur n'a aucun moyen de comprendre la situation. C'est le premier frein au débogage et à la lisibilité du jeu.

## Objectif

Rendre lisible, au clic sur un nain, son **activité courante** (décidée par l'arbitre) et le **job en cours** avec sa cible, afin que le joueur comprenne le comportement observé.

## Périmètre

**Inclus**
- Lecture de `activity.type` et affichage d'un libellé français lisible (ex. « Travaille », « Va manger », « Fuit », « Dort », « Crise »).
- Si `currentJob` existe : type de job (dig/chop/haul/build/craft/…), position cible, et étape si disponible (`approche`, `en cours`, `livre`).
- Affichage de l'état « oisif » quand aucune activité productive n'est possible.

**Exclus**
- Historique des décisions (hors périmètre).
- Toute écriture dans les composants (l'UI reste en lecture seule, cf. CLAUDE.md).

## Exigences fonctionnelles

1. Le panneau lit `world.getComponent(id, 'activity')` et `world.getComponent(id, 'currentJob')`.
2. Une table de correspondance `activity.type → libellé FR` centralise les textes.
3. Le job affiche `job.type` traduit + coordonnées `job.x/y` (ou `job.target`).
4. Rafraîchissement à chaque `render()` (déjà appelé dans la boucle de `main.js`).

## Conception technique

- Modifier uniquement `src/ui/inspectionPanel.js`. Aucune modification de système.
- Ajouter une constante `ACTIVITY_LABELS` et `JOB_LABELS` (textes UI en français, code en anglais — cf. conventions).
- Respecter la règle « l'UI ne touche jamais aux composants de simulation » : lecture seule.

## Critères d'acceptation

- Cliquer sur un nain qui creuse affiche « Travaille — creuse (x, y) ».
- Cliquer sur un nain affamé qui se déplace affiche « Va manger ».
- Un nain sans job ni besoin affiche « Oisif ».
- Le libellé se met à jour en direct quand l'activité change.

## Tests

- Test macro dans `tests/` : après post d'un job de dig et arbitrage, le nain assigné expose `activity.type === 'work'` et un `currentJob` de type `dig` avec la bonne cible (valide la source de données lue par l'UI).
