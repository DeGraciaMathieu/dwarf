# PRD I30 — Événements aléatoires

**Lot :** I — Rejouabilité · **Point :** 30 · **Statut :** 🔲 À faire · **Impact / Effort :** Fort / Moyen

## Problème
Hors des vagues de gobelins (`goblinSpawnSystem.js`), rien d'imprévu n'arrive jamais. Le déroulé d'une partie est entièrement dicté par les besoins des nains, la migration régulière (`migrantSystem.js`) et les invasions : deux parties se ressemblent car aucun aléa ponctuel ne vient les secouer. Il manque des surprises — bonnes ou mauvaises — qui obligent le joueur à réagir et donnent à chaque colonie son histoire propre.

## Objectif
Introduire un système d'événements aléatoires piloté par une table de données pondérée qui fait survenir périodiquement des événements ponctuels (caravane, épidémie, bête errante, récolte abondante/gâchée, arrivée spéciale, éboulement), en réutilisant l'infrastructure temporelle et les systèmes existants pour leurs effets.

## Périmètre
**Inclus**
- Un système d'événements aléatoires cadencé (compteur de ticks + RNG injectable + entité-composant d'état sérialisée), sur le modèle de `seasonSystem`/`goblinSpawnSystem`.
- Une table de données pondérée : chaque événement a un poids, un cooldown et des conditions de déclenchement.
- Un lot initial d'événements dont les effets se branchent sur des systèmes existants.
- L'annonce de chaque événement au journal (`ui/eventLog.js`) via un fait accompli.

**Exclus**
- Les événements à choix du joueur (dilemmes interactifs) : hors périmètre initial (voir décision).
- Les vagues de gobelins, qui restent gérées par `goblinSpawnSystem` (un événement peut au plus déclencher une arrivée hostile ponctuelle, sans remplacer la courbe de menace).
- L'implémentation complète de la caravane marchande : I30 ne fournit qu'un crochet vers G23 (caravanes/troc), pas le troc lui-même.
- La légende de fin (I28) et l'écran d'embarquement (I29).

## Exigences fonctionnelles
1. Un système `RandomEventSystem` évalue périodiquement (compteur de ticks + intervalle jitteré) l'opportunité de déclencher un événement, en utilisant un RNG injectable.
2. Le choix de l'événement se fait par tirage pondéré dans une table de données ; seuls les événements dont les conditions sont satisfaites et dont le cooldown est écoulé sont éligibles.
3. Chaque déclenchement applique un effet en s'appuyant sur les systèmes/composants existants et émet un fait accompli propre (`domaine.verbe-au-passé`) annoncé au journal.
4. Un cooldown par événement empêche la répétition immédiate ; l'état (compteur global, derniers déclenchements) est persisté.
5. Le lot initial couvre au minimum : une caravane de passage (crochet vers G23), une épidémie (dégradation de santé/besoins), une bête sauvage errante (`spawnFromDefinition` d'une créature hostile isolée), une récolte abondante ou gâchée (interaction avec `farmSystem`), une arrivée spéciale (nain ou migrant), un éboulement (transformation de terrain / dégât localisé).
6. Sans événement éligible à un rendez-vous donné, il ne se passe rien (comportement inchangé) — comme l'accalmie de `goblinSpawnSystem`.

## Conception technique
- **Modèle temporel** : nouveau `src/systems/randomEventSystem.js` calqué sur `seasonSystem.js`/`goblinSpawnSystem.js` : une entité-composant singleton `randomEvents` (données pures : `{ ticks, countdown, cooldowns: {...} }`, sérialisée nativement), un compteur de ticks, un intervalle jitteré, et un RNG injectable en dernier argument du constructeur (`constructor(terrain, table, ..., random = Math.random)`), exactement comme `GoblinSpawnSystem(terrain, archetypes, random)`. L'état volatil est auto-réparable : `randomEvents` est créé s'il manque et réarmé à chaque rendez-vous.
- **Table pilotée par les données** : les définitions vivent dans un `src/data/*.json` (ex. `src/data/events.json`) — liste `{ id, weight, cooldown, conditions, effect }`. Ajouter un événement ne doit pas demander de code neuf tant que son `effect` réutilise un type d'effet déjà câblé. Le tirage pondéré filtre par conditions + cooldown puis pioche selon les poids.
- **Effets branchés sur l'existant** :
  - caravane → crochet vers G23 (émission d'un fait accompli que G23 consommera ; à défaut, une arrivée neutre annoncée).
  - épidémie → dégradation via les composants de besoins/santé lus par `needsSystem`/`attritionSystem` (baisse de `health`/hausse d'un besoin sur des nains).
  - bête errante → `spawnFromDefinition` d'une créature `hostile` (comme `goblinSpawnSystem`), reprise ensuite par `hostileSystem`/`combatSystem`.
  - récolte abondante/gâchée → interaction avec `farmSystem` (bonus/malus sur les cultures des zones `farms`).
  - arrivée spéciale → `spawnFromDefinition` + `assignAptitude`/`assignPersonality` comme `migrantSystem`.
  - éboulement → modification localisée du `terrain` (ex. `terrain.set(x, y, 'wall')`) et/ou dégât sur ce qui s'y trouve.
- **Événements du bus** : ajouter les faits accomplis correspondants dans `src/events/events.js` (ex. `EVENT_TRIGGERED: 'event.triggered'` générique, ou un par type). `ui/eventLog.js` s'y abonne pour l'annonce FR. Le bus reste un canal de réactions transverses ; le système applique lui-même l'effet sur les composants et n'émet que des faits accomplis.
- **Ordre du tick** : enregistrer `RandomEventSystem` dans `src/main.js` parmi les systèmes de « monde » (près de `GoblinSpawnSystem`/`MigrantSystem`), en lui passant `terrain`, la table chargée depuis les données et le RNG. Comme il peut faire apparaître des hostiles/migrants et modifier le terrain, il doit s'exécuter avant les systèmes qui les traitent dans le tick (mouvement, combat).
- **Persistance** : `randomEvents` (compteur + cooldowns) est sérialisé nativement par `save.js` sans code dédié.

## Décision à trancher avant implémentation
- **Automatiques vs. à choix du joueur** : événements purement automatiques (l'effet s'applique, annonce au journal) — **recommandé d'abord** ; ou événements à dilemme (le joueur choisit une réponse), qui exigeraient une couche UI d'interaction et une pause. Recommander : automatiques d'abord, dilemmes en incrément ultérieur.
- **Granularité des faits accomplis** : un seul événement générique `event.triggered { id }` (journal générique) vs. un événement dédié par type (messages plus riches, plus d'entrées dans `events.js`).
- **Dépendance à G23** : livrer la caravane comme simple annonce tant que G23 n'existe pas, ou reporter l'événement caravane jusqu'à ce que le troc soit implémenté.

## Critères d'acceptation
- Avec un RNG déterministe injecté, la séquence d'événements déclenchés est reproductible.
- Un événement respecte son cooldown : il ne se redéclenche pas avant l'écoulement du délai défini dans la table.
- Un événement dont les conditions ne sont pas remplies n'est jamais tiré.
- Chaque déclenchement produit un effet observable sur l'état (santé, culture, terrain, apparition d'entité) et une annonce au journal.
- Aucun événement éligible à un rendez-vous laisse la simulation strictement inchangée.
- Un save/load conserve le compteur et les cooldowns de `randomEvents`.

## Tests
- Scénario `tests/` (macro, harnais `tests/helpers.js`) : monter une colonie via `setupColony`, enregistrer `RandomEventSystem` avec une table minimale et un `random` déterministe, faire tourner (`run`) au-delà d'un rendez-vous et vérifier via `collect(...)` qu'un événement a été déclenché et son effet appliqué (ex. une bête hostile apparue, `world.query('hostile')` non vide).
- Scénario : forcer le tirage d'un événement, vérifier que son cooldown bloque un second déclenchement immédiat, puis qu'il redevient éligible une fois le cooldown écoulé.
- Scénario : un événement avec une condition non satisfaite n'est jamais sélectionné même quand il est le seul de la table.
- Scénario : sérialiser/désérialiser (`serializeGame`/`restoreGame`) et vérifier que `randomEvents` (ticks + cooldowns) est intact.
