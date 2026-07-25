# PRD D15 — Scénarios de test des lots

**Lot :** D — Robustesse · **Point :** 15 · **Statut :** À faire · **Impact / Effort :** Moyen / Moyen

## Problème

Le projet impose des **tests macro de comportement** dans `tests/` pour toute nouvelle mécanique (cf. CLAUDE.md et skill `testing`). Les lots A→E introduisent de nombreux comportements ; sans scénarios dédiés, les régressions passeront inaperçues et les PRD resteront invérifiables.

## Objectif

Fournir une suite de scénarios macro couvrant les comportements clés introduits par les autres PRD, exécutable via `npm test`.

## Périmètre

**Inclus**
- Un scénario macro par comportement observable listé dans les critères d'acceptation des PRD A→E.
- Réutilisation du harnais `tests/helpers.js`.
- Scénarios déterministes (pas de dépendance à l'aléatoire non contrôlé).

**Exclus**
- Tests unitaires d'implémentation (contraire à la philosophie du projet).
- Tests de rendu Canvas (validation manuelle, cf. A05).

## Exigences fonctionnelles

1. Chaque PRD comportemental (A02, A03, A04-helpers, B06-B09, C10-C12, D13, D14, E16-E18) dispose d'au moins un scénario dans `tests/`.
2. Les scénarios suivent le style existant (monde minimal, avancer N ticks, asserter l'état).
3. `npm test` passe intégralement.

## Conception technique

- Ajouter des fichiers de scénario dans `tests/` en s'appuyant sur `tests/helpers.js`.
- Contrôler l'aléatoire là où nécessaire (spawn, vagues) pour rendre les scénarios déterministes.
- Aligner chaque scénario sur la section « Tests » du PRD correspondant.

## Critères d'acceptation

- Chaque comportement des PRD A→E est couvert par au moins un scénario.
- `npm test` s'exécute sans échec.
- Un scénario échoue si l'on régresse volontairement le comportement ciblé (validation de sensibilité).

## Tests

- Ce PRD **est** la couche de test ; sa validation est l'exécution verte de `npm test` avec la couverture décrite.
