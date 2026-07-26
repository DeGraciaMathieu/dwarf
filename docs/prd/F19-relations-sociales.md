# PRD F19 — Relations sociales entre nains

**Lot :** F — Vie sociale & santé · **Point :** 19 · **Statut :** ✅ Fait (option a — rivalité descriptive) · **Impact / Effort :** Fort / Moyen

## Problème
Aujourd'hui les nains cohabitent sans se connaître : `arbiterSystem.js` n'arbitre aucune activité sociale et la seule interaction entre nains est la rixe d'ivrogne portée par `brawlSystem.js` (activité `brawl`, composant `provoked`/`brawling`). Les besoins gérés par `needsSystem.js` se limitent à `hunger`, `thirst` et `fatigue` (voir la configuration dans `src/main.js`). Un nain isolé ne souffre de rien, et la mort d'un compagnon (event `dwarf.died`) n'a aucun poids affectif : `moraleSystem.js` applique le même malus de témoin à tous, sans notion de proximité relationnelle.

## Objectif
Faire émerger des affinités (amitiés, rivalités) entre nains qui se côtoient, et donner un poids émotionnel à ces liens via le moral, sans introduire de nouveau service générique.

## Périmètre
**Inclus**
- Un besoin `social` géré par `needsSystem.js`, sur le même modèle que `hunger`/`thirst`/`fatigue`.
- Un composant `relationships` (données pures) portant les affinités par paire de nains.
- Une activité `socialize` arbitrée par `arbiterSystem.js` et son système exécutant.
- Le tissage d'affinités quand deux nains socialisent à proximité l'un de l'autre.
- Réaction relationnelle sur l'event `dwarf.died` dans `moraleSystem.js` (deuil renforcé pour les proches).
- Affichage des relations dans `inspectionPanel.js`.

**Exclus**
- Familles, mariages, lignées, généalogie.
- Conversations/dialogues textuels ou bulles.
- Nouveaux meubles ou nouvelles Zone dédiés (on réutilise l'existant, cf. Conception).
- Refonte de la rixe (`brawlSystem.js`) : elle reste déclenchée par l'ivresse ; les rivalités sociales ne font qu'ajouter du contexte (voir Décision à trancher).

## Exigences fonctionnelles
1. Chaque nain possède un besoin `social` qui décroît avec le temps, à l'image de `hunger`/`thirst`/`fatigue` dans `needsSystem.js`, et émet un event `dwarf.lonely` (fait accompli) quand il passe sous son seuil.
2. Quand le besoin `social` est bas, `arbiterSystem.js` peut choisir l'activité `socialize` (score intermédiaire, en dessous des activités de survie et de combat, au-dessus de `work`/`wander`).
3. Un nain en `socialize` rejoint un autre nain proche disponible ; à portée l'un de l'autre, tous deux voient leur besoin `social` remonter.
4. Socialiser côte à côte augmente l'affinité mutuelle enregistrée dans `relationships` ; au-delà d'un palier positif, la paire devient « amie ».
5. Les affinités peuvent devenir négatives (rivalité) sur les faits accomplis conflictuels déjà émis (au minimum `dwarf.brawls` entre les deux nains) ; au-delà d'un palier négatif, la paire devient « rivale ».
6. À la mort d'un nain (`dwarf.died`), `moraleSystem.js` applique un malus de moral supplémentaire aux nains ayant une affinité positive forte avec le défunt, proportionné à l'affinité.
7. `inspectionPanel.js` affiche les relations marquantes du nain inspecté (amis et rivaux, avec leur nom).

## Conception technique
- **Composant data pur `social`** : `{ value, max }` sur chaque nain, ajouté à la définition `dwarf` de `creatures.json` (comme `health`). Décroissance et seuil câblés dans `needsSystem.js` via l'entrée `{ component: 'social', event: EVENTS.DWARF_LONELY }` déclarée dans `src/main.js`.
- **Composant data pur `relationships`** : par nain, une table d'affinités indexée par identifiant de partenaire, p. ex. `{ affinities: { <entityId>: <score> } }`. Pures données, aucune méthode ; toute la logique de lecture/écriture vit dans le système `socialize`.
- **Nouvel event** dans `src/events/events.js` : `DWARF_LONELY: 'dwarf.lonely'` (et éventuellement `DWARF_BEFRIENDED: 'dwarf.befriended'` / `DWARF_FELL_OUT: 'dwarf.fell-out'` si l'on veut journaliser les paliers franchis — faits accomplis au passé, pour réaction transverse du journal). Aucun event impératif.
- **Activité arbitrée `socialize`** : ajoutée à la liste de scores de `arbiterSystem.pickActivity` avec une constante de score dédiée (entre `WORK_SCORE` et les besoins de survie). Le score dépend de la valeur du besoin `social` avec hystérésis, sur le modèle des scores `eat`/`drink`/`sleep` existants.
- **Système exécutant `socializeSystem.js`** (nouveau, registré dans `src/main.js` à côté de `EatingSystem`/`DrinkSystem`/`SleepSystem`) : filtre sur `activity.type === 'socialize'`, déplace le nain vers un partenaire proche via `findPath` (`core/pathfinding.js`), remonte le besoin `social` des deux nains à portée et met à jour leur composant `relationships`. Il ne décide jamais de changer d'activité (l'arbitre décide, l'exécutant obéit).
- **Deuil relationnel** : dans `moraleSystem.js`, l'abonnement existant à `EVENTS.DWARF_DIED` est enrichi pour appliquer, en plus du malus de témoin actuel, un malus additionnel aux nains dont `relationships` référence le défunt avec une affinité positive forte. Comme `dwarf.died` ne transporte pas l'`entityId` du mort (voir `death.js`), il faut l'ajouter au payload (`kill` dans `death.js` a l'`entityId` cible) pour permettre à `moraleSystem.js` de retrouver les proches.
- **Affichage** : `inspectionPanel.js` lit `relationships` (UI en lecture seule) et affiche amis/rivaux par nom en résolvant les `identity` correspondantes. L'UI ne modifie aucun composant.
- **État auto-réparable** : les affinités vers un nain détruit doivent être ignorées/purgées à la lecture (comme `brawlSystem.js` purge `provoked` quand la cible n'a plus de `position`), plutôt que de compter sur un nettoyage exhaustif à la mort.

## Décision à trancher avant implémentation
La rivalité sociale doit-elle **influencer** l'arbitrage de la rixe (`brawlSystem.js`/score `brawl` de l'arbitre), ou rester purement descriptive au départ ? Deux options : (a) la rivalité n'est qu'un affichage/malus de moral et n'altère pas le déclenchement des rixes (ivresse seule) ; (b) une forte rivalité augmente la probabilité qu'un nain ivre choisisse son rival comme cible. Option (a) recommandée pour ce lot afin de ne pas déstabiliser l'équilibre existant des rixes.

## Critères d'acceptation
- Un nain dont le besoin `social` est au plancher finit par adopter l'activité `socialize` quand aucun besoin de survie ni danger n'est prioritaire.
- Deux nains qui socialisent à proximité voient leur besoin `social` remonter et leur affinité mutuelle croître dans `relationships`.
- Deux nains qui se battent en rixe (`dwarf.brawls`) voient leur affinité mutuelle décroître.
- À la mort d'un nain, un ami proche subit un malus de moral strictement supérieur à celui d'un simple témoin.
- La fiche d'inspection d'un nain lié affiche au moins un ami ou un rival nommé.
- L'affinité vers un nain mort ne provoque ni erreur ni entrée fantôme dans l'UI.

## Tests
- Scénario `tests/` (macro de comportement, sur le harnais `tests/helpers.js`) : deux nains dont le besoin `social` est bas, sans danger ni besoin de survie, se rejoignent, remontent leur besoin `social` et voient leur affinité mutuelle augmenter au fil des ticks jusqu'au palier « ami ».
- Scénario `tests/` : après plusieurs ticks d'affinité positive forte, la mort de l'un (via `kill`/`dwarf.died`) inflige à l'autre un malus de moral supérieur à celui appliqué à un nain témoin non lié.
