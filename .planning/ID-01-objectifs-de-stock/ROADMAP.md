# Roadmap: objectifs-de-stock

**Identifier:** ID-01

## Phases

### Phase 01: Boucle de réconciliation
**Status:** ✅ Done

**Goals:**
- `jobBoard.cancel()` (ou équivalent) pour retirer un job non réclamé.
- `stewardSystem` : recomptage par tick (stock, jobs de brassage en cours), postage de l'écart, retrait du surplus, garde-fou ingrédient.
- Donnée d'objectif créée dans `main.js`, cible codée en dur pour cette phase.
- Scénarios macro : convergence vers la cible, pas de sur-postage, retrait à la baisse, attente sans ingrédient.

**Plans:**
- `phases/01-01-PLAN.md` — exécuté, voir `phases/01-01-SUMMARY.md`

### Phase 02: Réglage et visibilité joueur
**Status:** ✅ Done

**Goals:**
- UI de réglage de la cible N (remplace l'ordre manuel « brasser » pour les recettes `consumable`).
- Affichage de l'état de l'objectif : stock / cible, bloqué si rien à brasser.
- Mise à jour des skills concernés et de `PATCHNOTES.md`.

**Plans:**
- `phases/02-01-PLAN.md` — exécuté, voir `phases/02-01-SUMMARY.md`

---

## Next Steps

1. Review and refine this roadmap
2. Create detailed phase plans with `/create-plan`
3. Execute plans with `/run-plan`
