# Phase 02 Plan 01 : Réglage et visibilité joueur — Summary

**Le joueur pilote désormais les objectifs de stock depuis le panneau « Objectifs » (cible ±, stock, état bloqué) ; l'ordre manuel « Brasser » a disparu.**

## Accomplishments
- Le steward annote chaque objectif d'un `status = { stock, blocked }` volatil recalculé à chaque tick (`no-workshop`, `no-ingredient` ou `null`), donnée de restitution jamais relue par la simulation.
- Nouveau panneau `ObjectivesPanel` dans l'aside : libellé de recette, stock/cible, boutons − / + écrivant `objective.target` (borné à 0), mentions « bloqué : aucun atelier » / « bloqué : rien à produire ». Clics par délégation, re-render seulement quand le contenu change.
- Bouton `#brew-beer` et son listener supprimés ; la toolbar ne garde que les ordres spatiaux.
- Scénario macro des transitions de statut ajouté (`tests/steward.test.js`) — suite complète : 82/82.
- PATCHNOTES.md et skills `architecture`, `jobs`, `contenu` mis à jour.
- Checkpoint visuel navigateur vérifié et approuvé par le joueur.

## Files Created/Modified
- `src/ui/objectivesPanel.js` — nouveau panneau (création)
- `src/systems/stewardSystem.js` — calcul du `status` (`findBlocker`)
- `src/main.js` — instanciation du panneau, suppression du listener brasser
- `index.html` — section Objectifs dans l'aside, bouton Brasser retiré
- `style.css` — styles `#objectives` calqués sur `#inspection`
- `tests/steward.test.js` — scénario des transitions de statut
- `PATCHNOTES.md`, `.claude/skills/{architecture,jobs,contenu}/SKILL.md` — docs

## Decisions Made
- Le `status` vit sur l'objet d'intention (comme `target`), pas dans un composant ECS : c'est de la restitution pour l'UI, pas de la simulation.
- Écriture d'`objective.target` par l'UI sanctionnée comme canal d'intention joueur, au même titre que les `Zone`.

## Issues Encountered
Aucun.

## Next Step
Work item ID-01 complet — les deux phases sont livrées. Multi-objectifs et réservation d'ingrédients restent documentés comme hors périmètre dans le BRIEF.
