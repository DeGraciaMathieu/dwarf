# PRD H26 — Pensées et humeurs stratifiées

**Lot :** H — Environnement & profondeur · **Point :** 26 · **Statut :** ✅ Fait (registre d'affichage : `morale.value` reste l'accumulateur — la dérive coexiste, proximité hors pile) · **Impact / Effort :** Moyen / Moyen

## Problème
Le moral est un scalaire opaque : `moraleSystem.js` applique directement des deltas (`EFFECTS.ate`=10, `deathWitnessed`=-25, `restedOnGround`=3…) sur `morale.value`, borné, avec une dérive lente vers `baseline`. On voit *que* le moral d'un nain baisse, jamais *pourquoi*. Quand `tantrumSystem.js` déclenche une crise de rage (moral ≤ `morale.tantrum`), le joueur ne peut pas diagnostiquer la cause : a-t-il vu un cadavre ? mal dormi ? eu faim ? La fiche d'inspection (`ui/inspectionPanel.js`) ne montre qu'une jauge. Le moral est difficile à déboguer et peu lisible.

## Objectif
Enrichir la représentation du moral en une **pile de pensées horodatées** : chaque source de moral (déjà présente dans la table `EFFECTS`) devient une pensée datée avec une durée de vie, qui expire avec le temps. Le moral courant se dérive de la somme des pensées actives (autour de la `baseline`). Les crises de rage deviennent lisibles (on voit la liste des pensées négatives), et la fiche d'inspection explique l'humeur du nain. **C'est une refonte de la représentation du moral, pas de ses sources** : les mêmes événements et les mêmes barèmes `EFFECTS` restent le point d'entrée.

## Périmètre
**Inclus**
- Un composant `thoughts` (données pures) sur les nains : liste de pensées `{ type, delta, addedAtTick, expiresAtTick }`.
- La conversion des sources de moral existantes (`EFFECTS`) en pensées : chaque événement déjà écouté par `moraleSystem.js` pousse une pensée au lieu d'ajuster directement le scalaire.
- Le calcul du `morale.value` courant comme `baseline + somme des deltas des pensées actives` (borné à `[0, max]`), avec expiration au fil des ticks.
- Un libellé français par type de pensée pour l'affichage.
- L'affichage des pensées actives (au moins les plus fortes) dans la fiche d'inspection.
- Rétrocompatibilité stricte avec `tantrumSystem.js` et `workEffort.js` qui lisent `morale.value`, `morale.low`, `morale.tantrum`.

**Exclus**
- Toute nouvelle *source* de moral (aucune émotion nouvelle ; on ne fait que restructurer les sources actuelles). Les sources ajoutées par d'autres PRD (H24 confort, H27 fierté) se brancheront naturellement sur ce mécanisme.
- La modification des seuils de crise ou de la logique de `tantrumSystem.js`.
- Une pondération d'intensité par personnalité/trait du nain.

## Exigences fonctionnelles
1. Chaque nain porte un composant `thoughts` : une liste de pensées, chacune avec un type, un delta de moral, un tick d'ajout et un tick d'expiration.
2. Les événements déjà consommés par `moraleSystem.js` (`DWARF_ATE`, `DWARF_DRANK`, `DWARF_DRANK_BEER`, `DWARF_WOKE`, `GOBLIN_SLAIN`, `DWARF_INJURED`, `DWARF_HUNGRY`, `DWARF_THIRSTY`, `DWARF_FLEES`, `DWARF_DIED`, `CORPSE_BURIED`) ajoutent une **pensée** dont le delta provient de la table `EFFECTS` inchangée, plutôt que d'ajuster directement `morale.value`.
3. À chaque tick, les pensées expirées sont purgées, et `morale.value` est recalculé : `baseline` + somme des deltas des pensées actives, borné à `[0, max]`.
4. Les effets **continus/de proximité** (brasero `comfortOfHome`, puanteur du cadavre `stenchOfDecay`) restent gérés comme aujourd'hui (ce sont des ajustements par tick, pas des événements ponctuels) — soit sous forme de pensée à durée courte rafraîchie tant que la source persiste, soit conservés en ajustement direct (voir décision).
5. La fiche d'inspection (`ui/inspectionPanel.js`) liste les pensées actives du nain sélectionné avec leur libellé français et leur signe (positif/négatif).
6. `tantrumSystem.js` et `workEffort.js` continuent de fonctionner sans modification : ils lisent `morale.value`/`morale.low`/`morale.tantrum` qui gardent leur sémantique.

## Conception technique
- **Composant** : ajouter `thoughts` (liste vide par défaut) au `dwarf` dans `src/data/creatures.json`, à côté de `morale`. Données pures, aucune méthode.
- **Refonte de `moraleSystem.js`** : les handlers d'événements (constructeur) cessent d'empiler dans `this.pending` pour un `adjust()` immédiat ; ils empilent des **pensées** à appliquer (type + entityId, ou position pour les effets de zone `death`/`buried`). Dans `update()`, on : (a) matérialise les pensées en attente dans le composant `thoughts` de la cible, avec `addedAtTick`/`expiresAtTick` calculés depuis un compteur de ticks du système ; (b) purge les pensées expirées ; (c) recalcule `morale.value` à partir de `baseline` + somme des deltas actifs.
- **Barèmes conservés** : la table `EFFECTS` reste la source des deltas ; on lui associe une **durée de vie** par type (nouvelle table `THOUGHT_TTL` ou champ), pour que « a vu un cadavre » pèse plus longtemps que « a bu ». La dérive `drift`/`baseline` actuelle est remplacée par l'expiration naturelle des pensées (retour spontané vers `baseline` quand plus rien n'est actif).
- **Effets de proximité** : `comfortOfHome()` et `stenchOfDecay()` s'exécutent par tick tant que la source est présente. Les représenter en pensées à TTL très court, ré-ajoutées/rafraîchies chaque tick tant que la source est à portée, garantit l'auto-réparation (le brasero détruit ⇒ pensée non rafraîchie ⇒ expire). Alternative : les laisser en ajustement direct additionné au recalcul. Voir décision.
- **Libellés** : une table type → texte français (« a bien mangé », « a vu un cadavre », « a dormi à même le sol », « a fêté une victoire »…), lue par `ui/inspectionPanel.js`. `ui/` reste en lecture seule.
- **Respect ECS et auto-réparation** : `thoughts` est un état volatil auto-purgeant ; à chaque tick il se reconstruit (purge des expirées, recalcul du moral) sans dépendre d'un nettoyage exhaustif des cas de sortie. `moraleSystem` reste le seul à écrire `morale.value`.
- **Rétrocompatibilité sauvegardes** : un nain chargé sans composant `thoughts` (ancienne sauvegarde) doit se voir doter d'une liste vide et repartir de son `morale.value` sauvegardé comme base neutre.

## Décision à trancher avant implémentation
- **Durées de vie par pensée** : fixer un TTL par type d'`EFFECTS`. La dérive `morale.drift`/`baseline` actuelle devient-elle caduque (remplacée par l'expiration) ou coexiste-t-elle ? Recommandé : l'expiration remplace la dérive pour éviter un double mécanisme de retour à la baseline.
- **Effets de proximité continus (brasero, puanteur)** : les convertir en pensées à TTL court rafraîchies chaque tick, ou les garder en ajustement direct hors pile de pensées ? La première option unifie la représentation et rend l'inspection complète ; la seconde est plus simple mais laisse deux mécanismes.
- **Profondeur d'affichage** : montrer toutes les pensées actives ou seulement les N plus marquantes dans la fiche d'inspection.

## Critères d'acceptation
- Un nain qui mange, boit puis voit un cadavre porte trois pensées distinctes, chacune horodatée ; son `morale.value` égale `baseline` + somme de leurs deltas (borné).
- Une pensée s'efface après sa durée de vie, et le moral remonte vers `baseline` sans elle, sans intervention.
- Les valeurs de `EFFECTS` restent le barème unique des deltas ; changer une valeur d'`EFFECTS` change l'ampleur de la pensée correspondante.
- `tantrumSystem.js` déclenche toujours une crise au même seuil ; la fiche d'inspection permet alors de voir les pensées négatives responsables.
- Une sauvegarde antérieure (nain sans `thoughts`) se charge sans erreur et le nain repart d'un moral cohérent.
- Détruire un brasero à portée d'un nain fait retomber son moral au tick suivant (auto-réparation), sans pensée fantôme persistante.

## Tests
- Scénario `tests/comfort.test.js` (enrichi) ou nouveau `tests/thoughts.test.js` : empiler plusieurs sources (manger, cadavre témoin, réveil au sol) et vérifier que `morale.value` correspond à `baseline` + somme des deltas actifs.
- Scénario : après expiration d'une pensée négative, le moral remonte ; asserter l'état de la liste `thoughts` avant/après.
- Scénario de non-régression : un enchaînement d'événements produisant une chute de moral sous `morale.tantrum` déclenche toujours `DWARF_TANTRUM` (comportement `tantrumSystem` inchangé).
- Scénario : chargement d'un nain sans composant `thoughts` — pas d'erreur, moral cohérent, pile initialisée vide.
