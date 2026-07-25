# PRD E17 — Deuxième source de moral

**Lot :** E — Richesse de contenu · **Point :** 17 · **Statut :** À faire · **Impact / Effort :** Moyen / Moyen

## Problème

Le moral positif dépend presque uniquement de la **bière** (`drankBeer: +15` dans `moraleSystem.js`), les autres gains étant marginaux ou réactifs (repas, repos, victoire, enterrement). La bière est donc le seul vrai levier stratégique de moral, ce qui appauvrit la gestion.

## Objectif

Introduire une **seconde source de moral durable et pilotable** par le joueur, hors boisson — par exemple un mobilier de confort ou une salle commune.

## Périmètre

**Inclus**
- Un facteur de moral lié à l'environnement construit (ex. présence d'un meuble de confort à proximité, ou d'une zone « salle commune »).
- Effet appliqué via `moraleSystem.js` en cohérence avec les effets existants (à la transition ou en drift local, sans spam).

**Exclus**
- Système de « besoins sociaux » complet (relations entre nains).
- Art/décoration à valeur variable (pourrait être un PRD ultérieur).

## Exigences fonctionnelles

1. Définir la source : soit un item meuble de confort (data), soit une zone joueur dédiée.
2. `moraleSystem.js` accorde un bonus de moral aux nains bénéficiant de cette source (proximité ou appartenance de zone), sans double comptage ni oscillation.
3. Le gain est visible et cohérent avec la table `EFFECTS` existante.
4. Le contenu (meuble/recette) passe par `items.json`/`recipes.json` si applicable.

## Conception technique

- Selon l'option retenue :
  - **Meuble** : nouvel item dans `items.json` + recette, et lecture de proximité dans `moraleSystem.js`.
  - **Zone** : réutiliser l'infrastructure `Zone` (comme farms/graves) + lecture d'appartenance.
- Rester aligné sur le modèle événementiel/drift du moral ; état auto-réparable.

## Décision à trancher avant implémentation

Choisir **meuble de proximité** vs **zone salle commune** (impacte l'UI et le calcul). À valider avec le porteur produit.

## Critères d'acceptation

- Les nains bénéficiant de la nouvelle source voient leur moral progresser indépendamment de la bière.
- Pas de double application ni d'oscillation du moral.
- La source est constructible/désignable par le joueur.

## Tests

- Scénario `tests/` : nain à portée de la source → moral supérieur, sur N ticks, à un nain témoin hors portée, toutes choses égales par ailleurs.
