# PRD J35 — Gouvernance — chef et mandats

**Lot :** J — Profondeur · **Point :** 35 · **Statut :** 🔲 À faire · **Impact / Effort :** Moyen / Moyen

## Problème
La colonie est un ensemble plat de travailleurs. Chaque nain porte une `identity {name}`, mais aucun rôle collectif ni contrainte politique n'existe. La production est pilotée uniquement par le joueur via le tableau `objectives` de `main.js` : `stewardSystem.js` réconcilie les recettes marquées `consumable` (compare stock/cible, poste ou annule des jobs `craft`, restitue les blocages) et `ui/objectivesPanel.js` laisse le joueur régler les cibles. Rien ne pousse la colonie de l'intérieur : pas de figure qui impose un objectif avec une échéance, pas de conséquence collective à la réussite ou à l'échec. Le moral (`moraleSystem.js`, pile `thoughts` + table `EFFECTS`, crise de rage via `tantrumSystem.js`) ne reçoit aucun signal d'ordre politique.

## Objectif
Introduire une couche de gouvernance minimale : un **chef** (rôle attribué à un nain via un composant `role`/`noble` posé sur son `identity`) qui émet des **mandats de production** — fabriquer X unités de Y avant une échéance. La satisfaction ou l'échec d'un mandat influence le **moral collectif** via `moraleSystem.js`. Les mandats se branchent sur l'infrastructure existante : un mandat est un **objectif temporaire imposé**, avec échéance et conséquence morale, injecté dans le mécanisme d'objectifs que `stewardSystem.js` sait déjà réconcilier, et affiché via `ui/objectivesPanel.js` / le journal.

## Périmètre
**Inclus**
- Un rôle de **chef** : un composant `role` (ou `noble`) de données pures posé sur un nain existant (celui-ci a déjà `identity {name}`), avec au plus un chef à la fois (voir décision).
- L'émission de **mandats** par le chef : un mandat = recette cible + quantité + échéance (en ticks ou en saisons via `seasonSystem`).
- La réconciliation du mandat via le mécanisme d'objectifs : le mandat devient un objectif temporaire consommé par `stewardSystem.js` (post/annulation de jobs `craft`).
- Une conséquence sur le **moral collectif** à l'échéance : mandat satisfait → pensée positive ; mandat échoué → pensée négative, sur les nains via `moraleSystem.js` (pile `thoughts` + `EFFECTS`).
- Un affichage : le mandat en cours et son échéance dans `ui/objectivesPanel.js` et/ou le journal (`ui/eventLog.js`) au moment de l'émission et du verdict.

**Exclus**
- L'arbre complet de noblesse de Dwarf Fortress (baron, comte, roi, dépendances de titres, appartements exigés).
- Les élections, la succession, la destitution du chef.
- Une justice élaborée (procès, prison) au-delà, éventuellement, d'une conséquence simple sur les dégâts de crise (`tantrumSystem.js`) — voir décision.
- Les mandats non productifs (interdictions d'export, réquisitions d'objets précieux, taxes).

## Exigences fonctionnelles
1. Un nain peut recevoir un rôle de chef via un composant de données pures (`role`/`noble`), en s'appuyant sur son `identity` existant.
2. Le chef émet périodiquement (ou à un déclenchement défini) un mandat de production : recette `consumable` déclarée, quantité cible, échéance.
3. Le mandat est réconcilié par `stewardSystem.js` comme un objectif temporaire : tant qu'il est actif, le steward compare stock/cible et poste/annule des jobs `craft` en conséquence, en réutilisant sa logique existante (dont la restitution des blocages).
4. À l'échéance, le système évalue le mandat (cible atteinte ou non) et émet un event de fait accompli distinct pour la réussite et pour l'échec (`domaine.verbe-au-passé`, déclaré dans `src/events/events.js`).
5. Le verdict alimente le moral collectif : `moraleSystem.js` inscrit une pensée positive (satisfait) ou négative (échoué) dans la pile `thoughts` des nains, via une entrée de la table `EFFECTS`.
6. Le mandat en cours (recette, quantité, échéance restante) et son verdict sont visibles pour le joueur via `ui/objectivesPanel.js` et/ou le journal, sans que `ui/` touche aux composants de simulation.
7. L'état est auto-réparable : un mandat expiré est retiré du jeu d'objectifs ; l'absence de chef (aucun nain avec le rôle) n'empêche pas la colonie de tourner (aucun mandat émis).

## Conception technique
- **Rôle** : composant `role`/`noble` de données pures posé sur un nain déjà porteur d'`identity {name}`, sérialisé par `save.js`. L'attribution (qui devient chef) se fait par un nouveau système ou à l'initialisation dans `main.js` (voir décision « chef unique »).
- **Système** `governanceSystem.js` (nom à confirmer) dans `src/systems/`, enregistré dans l'ordre du tick de `src/main.js`, **avant** `stewardSystem` de façon que le mandat soit visible du steward au même tick, et après `seasonSystem` s'il compte l'échéance en saisons. Il ne touche jamais `activity` (réservé à `arbiterSystem.js`) : il agit sur le jeu d'objectifs et sur le moral, pas sur le comportement individuel.
- **Mandat = objectif temporaire** : réutiliser la structure `objectives` de `main.js` que `stewardSystem.js` consomme déjà (recette `consumable`, `target`). Le mandat est ajouté/retiré de ce jeu par le système de gouvernance ; `stewardSystem.js` n'a pas besoin de connaître la notion de mandat — il continue de réconcilier stock/cible et de poster/annuler des jobs `craft`. Il faut décider si le mandat étend `objectives` en place ou vit dans une liste parallèle fusionnée (état auto-réparable, purgé à échéance).
- **Échéance** : comptée en ticks (modèle des compteurs existants) ou en saisons via `seasonSystem` (`isWinter`/`season.changed`) — voir décision.
- **Conséquence morale** : à l'échéance, émettre l'event de verdict ; `moraleSystem.js` réagit via sa table `EFFECTS` + pile `thoughts` (nouvelles entrées), touchant les nains concernés. Optionnellement, un mandat échoué peut aggraver la probabilité/l'ampleur des crises de `tantrumSystem.js` (voir décision).
- **UI** : `ui/objectivesPanel.js` affiche le mandat comme un objectif marqué « imposé » avec son échéance restante ; le journal (`ui/eventLog.js`) relaie émission et verdict via le bus. `ui/` reste en lecture seule sur la simulation.
- **Événements** : déclarer dans `src/events/events.js` les faits accomplis d'émission et de verdict (`domaine.verbe-au-passé`).

## Décision à trancher avant implémentation
- **Un chef unique vs plusieurs rôles** : se limiter à un seul chef (un composant `role`/`noble` au plus) au premier jet, ou prévoir dès maintenant plusieurs rôles distincts.
- **Comment le mandat est imposé et surveillé** : échéance en **ticks** (compteur, comme les systèmes existants) ou en **saisons** (`seasonSystem`) ; et si un mandat échoué se contente d'une pénalité morale ou déclenche aussi une justice simple sur les dégâts de crise (`tantrumSystem.js`).

## Critères d'acceptation
- Un nain peut porter le rôle de chef ; en l'absence de chef, aucun mandat n'est émis et la colonie fonctionne normalement.
- Le chef émet un mandat (recette `consumable`, quantité, échéance) qui devient un objectif consommé par `stewardSystem.js` : des jobs `craft` sont postés jusqu'à la cible.
- À l'échéance atteinte cible remplie, un event de réussite est émis et les nains reçoivent une pensée positive.
- À l'échéance non remplie, un event d'échec est émis et les nains reçoivent une pensée négative (moral collectif dégradé).
- Le mandat et son échéance sont visibles via `ui/objectivesPanel.js` et/ou le journal.
- Un mandat expiré est retiré du jeu d'objectifs ; sauvegarde/rechargement conserve le rôle et le mandat en cours sans erreur.

## Tests
- Scénario `tests/` : attribuer le rôle de chef, laisser émettre un mandat, vérifier que `stewardSystem` poste des jobs `craft` pour la recette du mandat.
- Scénario `tests/` : mandat satisfait avant l'échéance → event de réussite + pensée positive dans la pile `thoughts` des nains.
- Scénario `tests/` : mandat non satisfait à l'échéance → event d'échec + pensée négative (moral collectif en baisse).
- Scénario `tests/` : mandat expiré retiré du jeu d'objectifs ; aucun chef → aucun mandat émis, aucune régression sur la production pilotée par le joueur.
