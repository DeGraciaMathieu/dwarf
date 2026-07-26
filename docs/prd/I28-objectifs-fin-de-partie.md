# PRD I28 — Objectifs, fin de partie et légende de la colonie

**Lot :** I — Rejouabilité · **Point :** 28 · **Statut :** ✅ Fait · **Impact / Effort :** Fort / Moyen

## Problème
La partie n'a ni but ni conclusion : on joue jusqu'à ce que tous les nains meurent, mais rien ne le signale. `main.js` lance une boucle infinie (`startLoop`) sans condition de fin ; quand `world.query('worker')` devient vide, la simulation continue à tourner à vide et aucun bilan n'est présenté. Le tableau `objectives` de `main.js` (piloté par `stewardSystem.js`) ne concerne que des paliers de production de recettes, pas des jalons de colonie. Toute la matière d'un récit de partie existe pourtant déjà : le bus émet en continu des faits accomplis (`dwarf.died` avec sa `cause`, `migrant.arrived`, `dwarf.befriended`, `dwarf.fell-out`, `goblin.slain`, `item.crafted`, `season.changed`) mais personne ne les agrège.

## Objectif
Donner un sens à la partie : introduire des jalons de colonie (survivre à N hivers, atteindre X nains), un score, et surtout une « légende » de fin — un récapitulatif narratif agrégé à partir des événements déjà émis, affiché quand la colonie s'éteint (ou à la demande).

## Périmètre
**Inclus**
- Un système « chronicle » qui écoute les événements faits accomplis du bus et tient un journal de colonie sérialisé (naissances/arrivées, morts + causes, amitiés/rivalités, chefs-d'œuvre, vagues repoussées, hivers traversés).
- Des jalons de colonie évalués tick après tick (nombre d'hivers survécus via `seasonSystem`, pic de population, richesse).
- Un score agrégé dérivé de ces compteurs.
- La détection de la fin de partie (plus aucun `worker`) et l'affichage du bilan « légende » dans l'UI.
- Un accès au bilan à la demande (le joueur consulte la légende en cours de partie).

**Exclus**
- Toute condition de victoire imposée qui stopperait la partie (voir décision — la victoire par jalon reste optionnelle et n'interrompt pas la simulation).
- Un classement/persistance inter-parties (tableau des scores entre plusieurs colonies).
- De nouveaux événements de gameplay : le chronicle ne fait qu'agréger des événements existants.
- Le contenu du choix d'embarquement (profils/difficulté/graine) : c'est I29.

## Exigences fonctionnelles
1. Un système `ChronicleSystem` s'abonne aux événements du bus (via `eventBus.on`) et accumule des compteurs et une liste de hauts faits sur une entité-composant singleton `chronicle` (données pures, sérialisée nativement).
2. Sont comptabilisés au minimum : arrivées (`migrant.arrived`), morts avec leur `cause` (`dwarf.died`), amitiés (`dwarf.befriended`) et brouilles (`dwarf.fell-out`), chefs-d'œuvre (`item.crafted`, ou l'événement dédié si H27 est implémenté), gobelins tués (`goblin.slain`), et hivers traversés (comptés sur `season.changed` avec `isWinter`).
3. Des jalons de colonie sont évalués chaque tick : nombre d'hivers survécus, pic de population (`world.query('worker').length`), richesse (mêmes agrégats que `goblinSpawnSystem.richness` : armes + armures + ateliers). Chaque jalon franchi est marqué une fois dans `chronicle`.
4. Un score est calculé à partir de ces compteurs (formule à fixer), consultable en lecture seule.
5. La fin de partie est détectée quand il ne reste plus aucun `worker` : un fait accompli `colony.ended` est émis une seule fois.
6. À la fin de partie, l'UI présente la « légende » : durée, hivers survécus, pic de population, gobelins repoussés, morts et leurs causes, amitiés/rivalités marquantes, chefs-d'œuvre, et score final.
7. La légende est aussi consultable à la demande en cours de partie (bilan intermédiaire).

## Conception technique
- **État persistant** : une entité-composant singleton `chronicle` (données pures : compteurs + tableau de hauts faits + jalons franchis + `ended`), sur le modèle de `season` (`seasonSystem.js`) et `invasion` (`goblinSpawnSystem.js`). Aucune méthode dans le composant. Sérialisée automatiquement par `save.js` (aucune entrée à ajouter dans `VOLATILE_COMPONENTS` : la chronique doit survivre au save/load).
- **Système** : nouveau `src/systems/chronicleSystem.js`. Deux modes complémentaires respectant la règle « événements = réactions transverses » : (a) il s'abonne dans son constructeur aux événements du bus pour l'agrégation narrative (comme `moraleSystem`/`eventLog` réagissent aux faits accomplis) ; (b) son `update(world, eventBus)` lit le monde chaque tick pour les jalons dérivés de l'état (population, richesse, hivers via `isWinter(world)`) et émet `colony.ended` quand `world.query('worker').length === 0`. L'état volatil de détection de fin est auto-réparable : le flag `ended` vit dans le composant `chronicle` et garantit une émission unique.
- **Événement** : ajouter `COLONY_ENDED: 'colony.ended'` dans `src/events/events.js` (forme `domaine.verbe-au-passé`), avec la charge utile du bilan (durée, compteurs). Fait accompli uniquement.
- **Ordre du tick** : enregistrer `ChronicleSystem` dans `src/main.js`, en toute fin d'ordre (après `JobAlertSystem`), pour que la détection de fin observe l'état déjà stabilisé du tick. Il reçoit `eventBus` à la construction pour ses abonnements.
- **UI** : un panneau de légende (nouveau composant `ui/`, ou extension d'`objectivesPanel.js`) lit `chronicle` en lecture seule et l'affiche à la demande ; `eventLog.js` peut s'abonner à `colony.ended` pour signaler la fin. L'UI ne touche aucun composant de simulation (elle lit `chronicle`, ne l'écrit pas).
- **Jalons** : purement dérivés (hivers, pop, richesse) et marqués une fois dans `chronicle` ; pas de nouveau contenu data requis. Les libellés des jalons sont des textes FR.

## Décision à trancher avant implémentation
- **Ce qui déclenche la fin** : extinction seule (plus aucun `worker`) — recommandé, seule fin « dure » ; ou ajouter une victoire optionnelle par jalon (ex. survivre à N hivers) qui affiche une légende de triomphe **sans stopper** la simulation. Recommandé : extinction seule pour la fin ; les jalons de victoire restent des paliers célébrés au journal, jamais un arrêt forcé.
- **Formule de score** : pondération exacte entre hivers survécus, pic de population, gobelins repoussés, chefs-d'œuvre et morts évitées.
- **Périmètre des hauts faits stockés** : tout conserver (liste potentiellement longue) vs. ne garder que des compteurs + quelques faits marquants (morts nommées, meilleures amitiés) pour borner la taille sérialisée.

## Critères d'acceptation
- Après plusieurs arrivées, morts, amitiés et vagues repoussées, le composant `chronicle` reflète des compteurs cohérents avec les événements émis.
- Quand le dernier `worker` disparaît, `colony.ended` est émis exactement une fois, même si des ticks continuent de s'écouler ensuite.
- La légende affiche durée, hivers survécus, pic de population, gobelins repoussés, morts (avec causes), amitiés/rivalités et score.
- Un save/load en cours de partie conserve intégralement la chronique (compteurs et jalons franchis).
- Le comportement de simulation est inchangé tant que la colonie vit : le chronicle n'écrit jamais de composant de simulation ni `activity`.

## Tests
- Scénario `tests/` (macro, harnais `tests/helpers.js`) : monter une colonie via `setupColony`, provoquer des faits (mort d'un nain, arrivée de migrant, gobelin tué) et vérifier que `chronicle` compte correctement chaque catégorie après `run(...)`.
- Scénario : faire mourir tous les `worker` puis continuer à `run(...)` quelques ticks ; vérifier que `colony.ended` est émis une seule fois (via `collect(EVENTS.COLONY_ENDED)`).
- Scénario : positionner la saison avec `seasonTicks` pour franchir plusieurs hivers et vérifier le compteur d'hivers survécus dans `chronicle`.
- Scénario : sérialiser/désérialiser (`serializeGame`/`restoreGame`) une partie en cours et vérifier que la chronique est intacte.
