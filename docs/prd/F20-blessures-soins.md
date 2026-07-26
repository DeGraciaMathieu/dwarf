# PRD F20 — Blessures et soins

**Lot :** F — Vie sociale & santé · **Point :** 20 · **Statut :** ✅ Fait (réutilise `bed` + Zone `infirmary` ; soigneur requis, le lit accélère) · **Impact / Effort :** Fort / Moyen

## Problème
Le combat est aujourd'hui binaire : dans `combatSystem.js`, chaque coup retire des points au composant `health` (`{ value, max }`, cf. `creatures.json`), et dès que `health.value` atteint 0 le nain est détruit net par `kill` (`death.js`). Les rixes de taverne (`brawlSystem.js`, coups à mains nues via `combatSystem.strike`) peuvent donc tuer un nain sans étape intermédiaire, et un nain gravement touché n'a aucune chance d'être secouru ou soigné. Il n'existe ni état « blessé », ni activité de secours, ni rôle infirmerie ; les lits (`items.json`, propriété `bed` avec `recoveryMultiplier`/`heal`) ne servent qu'au sommeil (`sleepSystem.js`).

## Objectif
Insérer une couche de blessure entre « en bonne santé » et « mort » : un nain gravement touché tombe blessé/incapacité plutôt que de mourir net, et peut être secouru puis soigné par un autre nain.

## Périmètre
**Inclus**
- Un composant `injury` (données pures) marquant l'état blessé/incapacité et le saignement.
- Un seuil de blessure dans `combatSystem.js` : passer sous ce seuil incapacite au lieu de tuer.
- Un saignement/dégradation continue tant que le blessé n'est pas soigné.
- Deux activités arbitrées : `rescue` (traîner un blessé vers l'infirmerie) et `heal` (soigner un blessé).
- Une Zone `infirmary` où l'on dépose et soigne les blessés (réutilise `core/zones.js`).
- Les faits accomplis `dwarf.wounded`, `dwarf.healed` (et `dwarf.bled-out` si mort par saignement) dans `events.js`.
- Affichage de l'état blessé dans `inspectionPanel.js`.

**Exclus**
- Blessures localisées par membre, infections, amputations, cicatrices permanentes détaillées.
- Nouveau métier/aptitude dédié « médecin » (le soin reste une activité ouverte à tout nain ; l'articulation avec les aptitudes est hors lot).
- Nouveau meuble « lit d'infirmerie » distinct : on réutilise le `bed` existant placé dans la Zone `infirmary` (voir Décision à trancher).
- Refonte de l'attrition (`attritionSystem.js`) : la faim/soif continuent de tuer via leur propre chemin.

## Exigences fonctionnelles
1. Quand un coup fait passer la santé d'un nain sous un seuil de blessure (au lieu de 0), `combatSystem.js` n'appelle plus `kill` mais marque le nain d'un composant `injury` (incapacité) et émet `dwarf.wounded` (fait accompli).
2. Un nain blessé est incapacité : `arbiterSystem.js` ne lui attribue plus d'activité normale (il ne peut ni travailler, ni combattre, ni fuir par lui-même) et reste au sol.
3. Un nain blessé perd lentement de la santé (saignement) tant qu'il n'a pas reçu de soin ; s'il atteint 0, il meurt via `kill` (`death.js`) et l'on émet `dwarf.bled-out` en plus de `dwarf.died`.
4. Une nouvelle activité `rescue` permet à un nain valide de rejoindre un blessé et de le traîner jusqu'à la Zone `infirmary` la plus proche.
5. Une nouvelle activité `heal` permet à un nain valide, auprès d'un blessé (idéalement sur un `bed` dans l'`infirmary`), de restaurer progressivement sa santé ; quand le blessé repasse au-dessus du seuil, on retire `injury` et l'on émet `dwarf.healed`.
6. Les rixes de taverne (activité `brawl` dans `combatSystem.js`) peuvent désormais aboutir à un nain blessé (et non plus seulement à un mort ou à rien), avec la même mécanique de secours/soin.
7. `inspectionPanel.js` affiche l'état « blessé » (et le saignement) d'un nain, à côté des jauges de santé/moral existantes.

## Conception technique
- **Composant data pur `injury`** : p. ex. `{ bleeding: <taux>, incapacitated: true }`, ajouté au nain au moment où `combatSystem.strike` détecte le franchissement du seuil de blessure. Pures données ; toute la logique vit dans les systèmes.
- **Seuil de blessure dans `combatSystem.js`** : dans `strike`, remplacer la destruction immédiate par un test : si la cible est un `worker` et que `health.value` tombe sous le seuil sans être encore `injury`, la marquer `injury` + émettre `EVENTS.DWARF_WOUNDED` ; ne recourir à `kill` que pour les hostiles, ou pour un nain déjà blessé qui encaisse encore (ou dont le saignement atteint 0). L'event `dwarf.injured` existant (malus de moral) reste distinct de ce nouveau `dwarf.wounded` (bascule d'état).
- **Système `injurySystem.js`** (nouveau, registré dans `src/main.js`) : applique le saignement (décrément de `health` selon `injury.bleeding`), appelle `kill` (`death.js`) + émet `EVENTS.DWARF_BLED_OUT` si la santé atteint 0. État auto-réparable (purge du composant si le nain meurt ou guérit).
- **Nouveaux events** dans `src/events/events.js` : `DWARF_WOUNDED: 'dwarf.wounded'`, `DWARF_HEALED: 'dwarf.healed'`, `DWARF_BLED_OUT: 'dwarf.bled-out'`. Faits accomplis au passé, consommés par le journal (`eventLog.js`) et le moral (`moraleSystem.js`).
- **Activités arbitrées `rescue` et `heal`** : ajoutées à `arbiterSystem.pickActivity`. Un nain blessé (`injury`) n'obtient aucune activité active (il est incapacité) ; un nain valide obtient `rescue` s'il existe un blessé hors infirmerie, `heal` s'il existe un blessé dans l'infirmerie à soigner (scores dédiés, priorité à définir par rapport à `work`).
- **Systèmes exécutants** (nouveaux, registrés dans `src/main.js` près des autres exécutants) :
  - `rescueSystem.js` : filtre `activity.type === 'rescue'`, rejoint le blessé via `findPath` (`core/pathfinding.js`) et le déplace tick par tick vers une tuile de la Zone `infirmary` (déplacement de la `position` du blessé porté, à l'image du portage d'objets existant).
  - `healSystem.js` : filtre `activity.type === 'heal'`, se place auprès du blessé et restaure sa santé ; le bonus `bed.heal`/`recoveryMultiplier` déjà lu par `sleepSystem.js` peut accélérer la guérison si le blessé est sur un `bed`. Retire `injury` et émet `EVENTS.DWARF_HEALED` au franchissement du seuil.
- **Zone `infirmary`** : nouvelle instance de `Zone` (`core/zones.js`) créée dans `src/main.js` comme `stockpiles`/`farms`/`graves`, désignable via `ui/designation.js` (nouveau mode de désignation, l'UI n'agit que via la Zone). C'est la destination du `rescue` et le lieu privilégié du `heal`.
- **Respect ECS et état auto-réparable** : aucune méthode sur les composants ; les réservations implicites (qui soigne/qui traîne qui) sont reconstruites à chaque tick par les systèmes plutôt que stockées durablement, sur le modèle des états volatils existants (`provoked` dans `brawlSystem.js`).

## Décision à trancher avant implémentation
Faut-il un **lit d'infirmerie distinct** ou réutiliser le `bed` existant placé dans une Zone `infirmary` ? Recommandation : réutiliser `bed` + Zone `infirmary` (moins de contenu neuf, cohérent avec les Zone existantes). À trancher aussi : un blessé sur un lit d'infirmerie **se soigne-t-il seul** plus vite (repos assisté) ou exige-t-il **toujours** un nain soigneur en activité `heal` ? Recommandation : soigneur requis pour l'essentiel, le lit ne faisant qu'accélérer.

## Critères d'acceptation
- Un coup qui ferait passer un nain sous le seuil de blessure le rend `injury` et émet `dwarf.wounded` au lieu de le tuer.
- Un nain blessé non secouru perd de la santé au fil des ticks et finit par mourir (`dwarf.died` + `dwarf.bled-out`) s'il n'est pas soigné.
- Un nain valide traîne un blessé jusqu'à la Zone `infirmary` (activité `rescue`), puis un nain valide le soigne (activité `heal`) jusqu'à retrait de `injury` + émission de `dwarf.healed`.
- Une rixe de taverne peut laisser un nain blessé (et non systématiquement mort) susceptible d'être secouru.
- La fiche d'inspection affiche l'état blessé/saignement du nain concerné.

## Tests
- Scénario `tests/` (macro, harnais `tests/helpers.js`) : un nain amené sous le seuil de blessure devient `injury` (event `dwarf.wounded`) et n'est pas détruit ; laissé seul, son saignement le tue au bout de N ticks (`dwarf.bled-out`).
- Scénario `tests/` : un blessé déposé, un nain valide en `rescue` le traîne dans la Zone `infirmary`, puis un nain valide en `heal` le remet au-dessus du seuil ; `injury` est retiré et `dwarf.healed` émis, le blessé ne meurt pas.
