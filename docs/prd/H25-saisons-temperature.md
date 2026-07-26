# PRD H25 — Saisons et température

**Lot :** H — Environnement & profondeur · **Point :** 25 · **Statut :** ✅ Fait (entité-composant `season` ; gel logique — suspension des cultures, berges gelées, migration suspendue) · **Impact / Effort :** Moyen / Élevé

## Problème
La colonie vit dans un temps homogène : les cultures poussent toujours au même rythme (`farmSystem.growCrops()`), l'eau de surface est toujours accessible (`drinkSystem.reachableBankTarget()` cherche en permanence une berge `water`), et les migrants arrivent selon un simple compteur de ticks (`migrantSystem.js`). Rien ne pousse le joueur à anticiper, à stocker des vivres ou de la boisson, ni à planifier au-delà de l'instant. Il manque une pression cyclique qui donne du poids à la préparation.

## Objectif
Introduire un **cycle de saisons** rythmé par la boucle de jeu, dont l'hiver dégrade l'environnement : gel des cultures (arrêt de croissance et/ou perte) et gel de l'eau de surface (berges temporairement inaccessibles à la boisson). Le joueur doit alors s'appuyer sur ses stocks (nourriture, bière). Impact fort sur la planification, en réutilisant `farmSystem`, `drinkSystem` et éventuellement `migrantSystem`.

## Périmètre
**Inclus**
- Un compteur de saison global, dérivé d'un compteur de ticks (comme `migrantSystem` compte déjà ses ticks).
- Un état de saison lisible par les systèmes concernés (au minimum : hiver vs. non-hiver).
- Effet hiver sur les cultures : suspension de la croissance dans `farmSystem.growCrops()` (et/ou destruction des cultures immatures — voir décision).
- Effet hiver sur l'eau : `drinkSystem` cesse de proposer les berges gelées, forçant le recours à la bière stockée.
- Un signalement au joueur du changement de saison (journal via le bus + affichage HUD).

**Exclus**
- Une carte de température par tuile ou une propagation thermique fine.
- L'isolation des pièces / le chauffage par brasero contre le froid (le brasero reste un confort de moral, cf. H24).
- Les dégâts de froid sur les nains (gelures, besoin « chaleur »).
- Toute météo hors saisons (pluie, tempêtes ponctuelles).

## Exigences fonctionnelles
1. Le jeu maintient une saison courante qui progresse de façon déterministe avec les ticks (cycle : printemps → été → automne → hiver → …).
2. En hiver, la croissance des cultures est suspendue : `farmSystem.growCrops()` n'incrémente plus `crop.growth`. (Sort exact du gel : voir décision.)
3. En hiver, les berges d'eau de surface ne sont plus retenues comme cibles de boisson par `drinkSystem` ; les nains se rabattent sur la bière (`drink` items) via `nearestBeerTarget()`. Sans bière atteignable, la mécanique existante d'isolement (`DWARF_ISOLATED_FROM_WATER`, marqueur `noWaterAccess`) s'applique naturellement.
4. Le retour du dégel (fin de l'hiver) rétablit la croissance et l'accès aux berges sans intervention du joueur (état auto-réparable).
5. Le changement de saison émet un événement de fait accompli (`season.changed`) alimentant le journal (`ui/eventLog.js`) et un indicateur de saison dans le HUD (`ui/hud.js`).
6. Aucune règle métier dans `core/` : la boucle (`core/loop.js`) reste un simple cadenceur ; la saison est portée par un système dans `src/systems/`.

## Conception technique
- **Porteur de la saison** : un nouveau système `seasonSystem.js` dans `src/systems/`, enregistré tôt dans l'ordre du tick (`src/main.js`), qui compte les ticks (modèle `migrantSystem.js` : champ `this.ticks`) et expose la saison courante. Il émet `season.changed` (à déclarer dans `src/events/events.js`, forme `domaine.verbe-au-passé`) au franchissement de seuil, et flag l'hiver.
- **Diffusion de l'état** : deux voies possibles (voir décision) — soit une entité/composant unique `season` interrogeable par requête (`world.query('season')`), soit une référence partagée passée en constructeur aux systèmes concernés (comme `farms`/`terrain`). L'entité-composant est plus ECS et se sauvegarde naturellement.
- **Gel des cultures** : dans `farmSystem.growCrops()`, court-circuiter l'incrément quand la saison est l'hiver. Si le sort retenu est destructif, détruire les entités `crop` immatures au passage à l'hiver (une seule fois, sur `season.changed`), en réutilisant la boucle sur `world.query('crop', ...)`.
- **Gel de l'eau** : dans `drinkSystem.reachableBankTarget()`/`touchesWater()`, ignorer les berges en hiver pour ne renvoyer que des cibles de bière. Ne pas modifier `tiles.json` en dur si le gel est logique (drapeau de saison) plutôt que physique. Si l'on veut un rendu de gel visible, introduire une tuile `ice` dans `tiles.json` et basculer les tuiles `water` de surface ↔ `ice` au tick de changement de saison — mais cela touche le terrain et doit être réversible (voir décision).
- **Migration** : optionnellement, `migrantSystem.js` peut refuser les arrivées en hiver (les caravanes ne passent pas) — lecture seule de la saison, pas de couplage fort.
- **Respect ECS et auto-réparation** : l'hiver n'imprime aucun état persistant sur les nains ; croissance et accès à l'eau redeviennent normaux dès que la saison change. Si le gel bascule le terrain, le dégel doit reconstruire l'état d'eau exactement (mémoriser les tuiles gelées dans le système, les restaurer au dégel).

## Décision à trancher avant implémentation
- **Durée d'une saison** : combien de ticks par saison (référence : `migrantSystem` vérifie tous les 600 ticks, première vérif à 900 ; à 5 ticks/s, 600 ticks ≈ 2 min). Choisir une durée qui rende l'hiver pénible mais pas punitif.
- **Sort du gel des cultures** : suspension pure (croissance figée, reprise au dégel) vs. destruction des cultures immatures (perte sèche, plus punitif et plus fidèle à Dwarf Fortress).
- **Gel de l'eau : drapeau logique ou tuile `tiles.json`** : (a) `drinkSystem` ignore les berges en hiver sans toucher au terrain (simple, invisible), ou (b) bascule `water` → `ice` dans `tiles.json` (visible à l'écran, mais impose une restauration exacte au dégel et un impact sur le pathfinding/rendu). Trancher selon l'importance du feedback visuel.
- **Effet sur la migration** : suspendre ou non les arrivées de migrants en hiver.

## Critères d'acceptation
- La saison progresse automatiquement et cycliquement ; le passage à l'hiver et le dégel émettent chacun `season.changed` et apparaissent au journal et au HUD.
- En hiver, une culture immature ne progresse plus (ou est détruite selon la décision) ; au dégel, la croissance reprend normalement.
- En hiver, les nains assoiffés ne ciblent plus les berges et consomment la bière stockée ; sans bière, le flux d'isolement existant se déclenche sans erreur.
- Le dégel rétablit l'accès à l'eau sans intervention, y compris si le gel bascule des tuiles (restauration exacte).
- Rejouer plusieurs cycles complets ne dérive pas (pas de fuite d'état, cultures et eau cohérentes à chaque saison).

## Tests
- Scénario `tests/seasons.test.js` : avancer le temps jusqu'à l'hiver, vérifier qu'une culture immature ne gagne pas de croissance, puis dégeler et vérifier la reprise.
- Scénario : en hiver, un nain assoiffé avec bière stockée boit la bière et non l'eau ; sans bière, il déclenche l'isolement (`DWARF_ISOLATED_FROM_WATER`).
- Scénario : le passage à l'hiver puis au printemps émet `season.changed` deux fois et laisse l'accès aux berges identique à l'avant-hiver (garde-fou de restauration).
- Scénario (si migration suspendue) : aucun migrant n'arrive pendant l'hiver, les arrivées reprennent ensuite.
