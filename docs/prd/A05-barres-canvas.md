# PRD A05 — Barre de moral/santé sur le canvas

**Lot :** A — Lisibilité · **Point :** 5 · **Statut :** ✅ Fait · **Impact / Effort :** Moyen / Faible

## Problème

L'état d'un nain (santé, moral) n'est visible qu'en le sélectionnant. Pendant un combat ou une crise de moral, le joueur ne peut pas repérer d'un coup d'œil **quels** nains sont en danger sur la grille. Seul un « z » bleu signale le sommeil.

## Objectif

Afficher un indicateur visuel léger au-dessus des nains **blessés ou en rage/bas moral**, pour un repérage immédiat sans clic.

## Périmètre

**Inclus**
- Micro-barre ou pastille de santé au-dessus d'un nain quand `health.value < health.max`.
- Indicateur distinct (couleur/glyphe) quand le moral est bas (`morale.value <= morale.low`) ou en crise (`tantruming`).
- Rendu uniquement quand pertinent (pas de barre pleine sur nains en pleine forme, pour éviter le bruit).

**Exclus**
- Barres de faim/soif/fatigue sur le canvas (réservées au panneau d'inspection).
- Animation.

## Exigences fonctionnelles

1. `renderer.js` lit `health` et `morale` des entités `worker` et dessine l'indicateur au-dessus du glyphe.
2. Barre de santé proportionnelle `value/max`, couleur virant au rouge sous un seuil.
3. Indicateur de moral bas/rage discret (ex. pastille) uniquement en état critique.

## Conception technique

- Modifier uniquement `src/ui/renderer.js`.
- Réutiliser `TILE_SIZE` pour dimensionner la micro-barre.
- Lecture seule des composants ; aucun impact simulation.

## Critères d'acceptation

- Un nain blessé en combat montre une barre de santé qui diminue.
- Un nain à plein moral et pleine santé n'affiche aucun indicateur superflu.
- Un nain en crise (`tantruming`) est visuellement distinct.

## Tests

- Vérification manuelle (rendu). Pas de test macro dédié : le rendu n'altère pas l'état de simulation.
