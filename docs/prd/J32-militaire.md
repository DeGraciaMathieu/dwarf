# PRD J32 — Couche militaire (soldats, entraînement, pièges)

**Lot :** J — Profondeur · **Point :** 32 · **Statut :** 🔲 À faire · **Impact / Effort :** Fort / Élevé

## Problème

La défense est entièrement passive. C'est `arbiterSystem.js` qui décide seul, pour chaque nain, de `fight` ou `flee` : `fightScore` renvoie un score élevé uniquement si le nain est « brave » (`isBrave` = `health/max ≥ combat.courage`) et qu'un `hostile` est proche (`dangerNear`, `FLEE_RANGE`) ; sinon `fleeScore` gagne et le nain fuit via `fleeSystem.js`. Les vagues sont produites par `goblinSpawnSystem.js`, les gobelins poursuivent via `hostileSystem.js` (`chaseMemory`).

Le joueur ne peut **rien organiser** : pas de soldats désignés, pas de point de ralliement, pas de ligne à tenir, aucune préparation possible avant une invasion. Le courage est une donnée de `creatures.json` (`combat.courage`), figée, que le joueur ne contrôle pas. Face à une vague, il assiste au combat sans levier.

## Objectif

Ajouter une **couche de contrôle défensif** pilotée par le joueur, tout en respectant le modèle « l'arbitre décide, l'exécutant obéit » : le joueur exprime des intentions (qui est soldat, où l'escouade se rassemble, où poser un piège) via des composants et des Zones ; `arbiterSystem.js` apprend à traiter un soldat autrement qu'un civil ; des systèmes exécutants réalisent le ralliement, l'entraînement et le déclenchement des pièges.

## Périmètre

**Inclus**
- Un moyen de **désigner un nain comme soldat** (composant `soldier`, éventuellement regroupé en `squad`).
- Une **Zone de rassemblement / patrouille** militaire (nouvelle Zone via `core/zones.js`, instanciée dans `src/main.js` comme `infirmary`, `bedrooms`, `farms`).
- Un comportement d'arbitrage distinct pour les soldats : tenir la ligne / rejoindre le point de ralliement au lieu de fuir.
- Un **entraînement** qui améliore la compétence de combat des soldats (crochet vers la progression d'aptitudes J33).
- 1 à 2 **pièges mécaniques** : tuile ou entité déclenchée quand un `hostile` marche dessus.

**Exclus**
- La progression générale des aptitudes civiles (portée par J33) : ce PRD ne fait que se **brancher** dessus pour le combat.
- Toute IA d'escouade avancée (formations, ordres tactiques multiples, ciblage manuel) : on vise rassemblement + tenir la ligne, pas un mode RTS.
- Les armes/armures nouvelles : on réutilise `equipment`, `equipSystem.js` et l'atténuation d'armure de `combatSystem.js`/`fightSystem.js` tels quels.

## Exigences fonctionnelles

1. Le joueur peut marquer/démarquer un nain comme **soldat** (composant `soldier`), et le retirer du service.
2. Le joueur peut définir une **Zone de rassemblement** militaire ; en l'absence de menace, les soldats hors service se comportent normalement, mais une bascule « au poste » les envoie s'y rassembler / patrouiller.
3. Face à une menace (`hostile` proche, `dangerNear`), un **soldat ne fuit pas** : `arbiterSystem.js` doit produire pour lui une activité de combat / de tenue de ligne, là où un **civil** garde le comportement actuel (fuir si non brave via `fleeScore`).
4. Un système d'exécution de ralliement fait converger les soldats vers la Zone de rassemblement (réutilise le pathfinding `core/pathfinding.js` et le mouvement des systèmes de jobs existants).
5. Un soldat en **entraînement** voit sa compétence de combat progresser (crochet J33), ce qui se répercute sur son efficacité au combat.
6. Au moins un **piège** peut être posé (désignation → tuile/entité) ; quand un `hostile` entre sur sa case, il se déclenche et inflige un effet (dégâts / immobilisation), lu au niveau du mouvement des hostiles (`hostileSystem.js` / `movementSystem.js`).
7. Les pièges ne se déclenchent que sur les `hostile`, jamais sur les `worker`.

## Conception technique

- **Composants (données pures)** : `soldier` (marqueur, éventuel `squad` id / état « au poste »). Comme tout composant persisté génériquement par `save.js` (hors `VOLATILE_COMPONENTS`), il survit au save sans code dédié. L'état volatil de ciblage/ralliement (ex. cible courante) reste auto-réparable : le posséder dans le système et le reconstruire chaque tick, sur le modèle de `chaseMemory` (`hostileSystem.js`) ou des marqueurs `fleeing`/`fighting` déjà volatils.
- **Zone de rassemblement** : nouvelle instance `Zone` de `core/zones.js`, créée dans `src/main.js` à côté de `infirmary`/`bedrooms`/`farms`, passée aux systèmes concernés et au renderer / à la sauvegarde comme les autres Zones.
- **Arbitrage** : dans `arbiterSystem.js`, la décision fight/flee doit distinguer `soldier` de civil. Aujourd'hui `fightScore`/`fleeScore` reposent sur `isBrave`/`dangerNear` ; pour un soldat, la présence d'une menace (ou l'ordre « au poste ») produit une activité de combat/ralliement plutôt qu'une fuite. **L'arbitre reste le seul à écrire `activity`** ; on ajoute au plus de nouveaux types d'activité (ex. `garrison`) que des systèmes exécutants filtrent sur `activity.type`.
- **Exécutants** : un système de ralliement/garnison (nouveau, dans `src/systems/`) filtre sur l'activité militaire et déplace le soldat vers la Zone via `core/pathfinding.js`. Le combat lui-même continue de passer par `fightSystem.js`/`combatSystem.js` (arme via `equipment`, atténuation d'armure) et `equipSystem.js` pour s'armer.
- **Entraînement** : un système d'entraînement fait progresser la compétence de combat des soldats postés. Le stockage de cette progression suit la décision de J33 (dans `skills` ou un composant `experience`) ; ce PRD consomme le mécanisme, il ne le définit pas.
- **Pièges** : au choix, une tuile de `tiles.json` (à la façon de `door`/`bridge`) ou une entité-composant `trap`. Le déclenchement se lit au moment où un `hostile` occupe la case — au plus près du mouvement des hostiles (`hostileSystem.js`) ou du `movementSystem.js` — et n'affecte que les entités portant `hostile`. Le désarmement/réarmement (si piège à usage unique) est un état auto-réparable ou un composant persisté.
- **Ordre du tick** : tout nouveau système s'insère dans l'ordre déterministe déclaré une seule fois dans `src/main.js`, après l'arbitre (qui écrit `activity`) et cohérent avec la place actuelle de `fightSystem`/`fleeSystem`/`hostileSystem`.
- **Événements** : n'émettre que des faits accomplis (`domaine.verbe-au-passé`) dans `src/events/events.js` (ex. un piège déclenché, un soldat enrôlé) pour le journal / le moral ; jamais d'événement impératif.

## Décision à trancher avant implémentation

Deux forks à trancher :
1. **Enrôlement** : draft par bascule/Zone (marquer les nains présents dans la Zone de rassemblement comme soldats) vs **panneau d'escouade** dédié (sélection explicite, roster). Le premier est data/Zone-first et léger ; le second offre plus de contrôle mais demande de l'UI.
2. **Entraînement** : entraînement passif tant que le soldat est « au poste » sur la Zone vs entraînement actif sous forme de job dédié (comme `equip`). Impacte le rythme de progression et le couplage à J33.

## Critères d'acceptation

- Un nain peut être enrôlé puis renvoyé à la vie civile ; l'état survit à une sauvegarde/rechargement.
- Un soldat face à un `hostile` proche n'exécute jamais `flee` ; un civil non brave, lui, fuit toujours comme aujourd'hui.
- Sur ordre « au poste », les soldats convergent vers la Zone de rassemblement.
- Un soldat entraîné combat mieux qu'un soldat fraîchement enrôlé (efficacité liée à la compétence de combat).
- Un `hostile` traversant une case piégée subit l'effet du piège ; un `worker` sur la même case ne subit rien.

## Tests

- Scénario `tests/` : placer un `soldier` et un `hostile` à portée, faire tourner l'arbitre, vérifier que l'activité du soldat est du combat/ralliement et non `flee` — et qu'un civil non brave dans la même situation obtient `flee`.
- Scénario `tests/` : activer « au poste » avec une Zone de rassemblement et vérifier que les soldats s'y rendent (position finale dans la Zone).
- Scénario `tests/` : faire marcher un `hostile` sur une case piégée et vérifier l'effet (dégâts/immobilisation) ; vérifier qu'un `worker` sur la même case n'est pas affecté.
- Scénario `tests/` : entraîner un soldat sur N ticks et vérifier que sa compétence de combat a augmenté et améliore son efficacité au combat.
