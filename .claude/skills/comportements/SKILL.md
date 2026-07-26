---
name: comportements
description: Use when travaillant sur le comportement des nains de Dwarf — l'arbitre d'activités, les besoins, le moral, la fuite/le combat, ou l'ajout d'une nouvelle activité.
auto_invoke: true
---

# L'arbitre d'activités

Toute la politique comportementale des nains vit dans `src/systems/arbiterSystem.js` : chaque tick, il note les activités possibles et écrit la gagnante dans le composant `activity {type}`. **Aucun autre système ne décide** — les exécutants filtrent sur `activity.type` et obéissent.

## Table des activités

| Activité | Score | Exécutant | Condition |
|---|---|---|---|
| `fight` | 200 | `fightSystem.js` (+ frappes dans `combatSystem.js`, modulées par l'`equipment` : arme = bonus de dégâts, armure = atténuation `max(1, dégâts − défense)`) | gobelin ≤ 6 cases ET courageux (`health/max >= combat.courage`) |
| `flee` | 200 | `fleeSystem.js` (fuit vers le refuge sûr le plus proche via une carte de menace BFS — case que les hostiles ne peuvent atteindre, typiquement derrière une porte `blocksHostiles` ; repli sur l'éloignement glouton `stepAway` si aucun refuge) | gobelin ≤ 6 cases ET pas courageux |
| `brawl` | 190 (riposte) / 90 (ivresse) | `brawlSystem.js` (+ frappes à mains nues dans `combatSystem.js`) | `provoked` (frappé au poing par un pair, on se défend) OU `drunk` + un nain à ≤ 5 cases (ivre, on cherche la bagarre). Létal, sans arme |
| `tantrum` | 150 | `tantrumSystem.js` | `morale.value <= morale.tantrum` (hystérésis : sort à `tantrum + 15`) |
| `eat` | valeur de faim (≤ 100) | `eatingSystem.js` | faim ≥ seuil ET nourriture existante ET pas de marqueur `noFoodAccess` (posé quand aucune nourriture n'est atteignable — évite le gel, réévalué ~50 ticks, levé dès qu'un chemin réapparaît) |
| `drink` | valeur de soif (≤ 100) | `drinkSystem.js` | soif ≥ seuil ET pas de marqueur `noWaterAccess` (posé quand aucune berge n'est atteignable — évite le gel, réévalué ~50 ticks, levé dès que l'eau redevient accessible) |
| `sleep` | `max(fatigue, seuil)` (≤ 120) | `sleepSystem.js` | fatigue ≥ seuil, hystérésis via composant `sleeping` (dort jusqu'à fatigue 0) |
| `incapacitated` | — (renvoyé d'office) | aucun (le nain gît au sol) | le nain porte `injury` : il ne peut ni travailler, ni combattre, ni fuir ; il saigne (`injurySystem.js`) et attend d'être secouru/soigné |
| `heal` | 62 | `healSystem.js` | un blessé (`injury`) se trouve **dans** la Zone `infirmary` ; le soigneur restaure sa santé (lit = plus vite), retire `injury` au-dessus du seuil (`dwarf.healed`) |
| `rescue` | 60 | `rescueSystem.js` | un blessé gît **hors** infirmerie ET une infirmerie existe ; le sauveteur le traîne case par case jusqu'à une tuile `infirmary` |
| `socialize` | 50 | `socializeSystem.js` | besoin `social` ≥ seuil (hystérésis via composant `socializing`, jusqu'à `social` 0) ET au moins un autre nain existe. Rejoint le camarade le plus proche ; à ≤ 1 case, les deux comblent leur besoin `social` et tissent une affinité (composant `relationships`) |
| `work` | 10 | `jobAssignmentSystem.js` + systèmes de jobs (dont `equipSystem.js` : s'armer/s'armurer est un job `equip` fait en temps de travail) | a un `currentJob` OU `jobBoard.hasAvailableJobs()` |
| `wander` | 1 | `movementSystem.js` | toujours (repli) |

Les gobelins ont aussi une `activity` (`chase`/`wander`), écrite par `hostileSystem.js` — mini-arbitre séparé.

## Ce que la bascule d'activité déclenche automatiquement (ne pas recoder)

- `activity ≠ work` → `JobAssignmentSystem` relâche le `currentJob` (le job retourne en file).
- `activity ≠ eat` → `EatingSystem` retire le `foodTarget`.
- `activity ≠ sleep` → `SleepSystem` retire `sleeping` (+ événement réveil) et `bedTarget`.
- `activity ≠ socialize` → `SocializeSystem` retire `socializing`.
- Un porteur qui perd son job → `HaulSystem.dropOrphanedItems` dépose sa charge au sol.

## Pièges connus (appris en les corrigeant)

- **Anti-famine** : l'activité `eat` n'est proposée que si de la nourriture *existe* — sinon un affamé continue de travailler (sinon : famine circulaire, personne ne récolte). Ne pas « simplifier » ce test.
- **Anti-thrash** : le score `work` doit rester vrai pour un nain qui *a déjà* un job même si la file est vide — sinon il relâche son propre job en boucle sans jamais le finir.
- **Hystérésis obligatoire** pour tout état à seuil qui décroît pendant l'état (sommeil, crise) : sans seuil de sortie distinct, l'état s'interrompt dès le seuil refranchi.

## Besoins et moral

- Besoins (faim, soif, fatigue, **social**) : composants data (`creatures.json`) + `needsSystem.js` générique (configuré dans `main.js` : composant → événement de seuil). **Ajouter un besoin = une entrée JSON + une ligne de config**, pas un nouveau système. Le besoin `social` monte comme la faim ; le combler passe par l'activité `socialize` (voir la table).
- **Relations** (`socializeSystem.js`) : composant data pur `relationships {affinities: {entityId: score}}`. On socialise **de préférence avec ses amis** (`pickCompanion` : score `affinité − distance` → des cliques se forment) ; côte à côte l'affinité monte (palier ami à +30, `dwarf.befriended`), une rixe (`provoked`) la fait chuter (palier rival à −30, `dwarf.fell-out`). L'affinité est écrite dans les deux sens ; l'UI purge à la lecture les liens vers un nain disparu (auto-réparable, jamais de nettoyage à la mort). Seul `socializeSystem.js` lit/écrit `relationships`.
- **Personnalité** (`personality {sociability, temper}`, tirée au spawn par `assignPersonality`, 0,5 = neutre) : `sociability` accélère le besoin social (`social.rate` ajusté au spawn) et la formation des liens (`BOND_STEP`) ; `temper` module la vitesse des rancunes (`RIVAL_STEP`) et **conditionne la bagarre d'ivrogne** (arbitre : seul un ivrogne `temper ≥ 0,5` cherche la rixe). Un ivrogne belliqueux cible **de préférence un rival proche** (`brawlSystem.pickRival`), à défaut le plus proche.
- **Attrition** (`attritionSystem.js`, configuré dans `main.js`) : un besoin au maximum érode santé et moral jusqu'à la mort via `kill()` avec sa cause — faim (`starving`, 0,15/tick, `starvation`) et soif (`dehydrated`, 0,25/tick, `dehydration`). Satisfaire le besoin stoppe l'érosion. Ajouter une cause d'attrition = une entrée de config.
- **Blessures** (`combatSystem.js` + `injurySystem.js`) : un coup qui fait tomber un nain sous le seuil de blessure (santé ≤ 8) ne le tue plus net — il reçoit le composant `injury {bleeding, incapacitated}` et l'événement `dwarf.wounded`. Il devient `incapacitated` (voir table), **saigne** (`injurySystem.js` décrémente la santé selon `injury.bleeding` ; à 0 → `kill` cause `bleeding` + `dwarf.bled-out`). Il est sauvé par les activités `rescue` (traîné à l'infirmerie) puis `heal` (soigné, `dwarf.healed`). Un nain déjà `injury` qui encaisse encore, ou un hostile, meurt normalement via `kill`. La Zone `infirmary` (comme `graves`) est la destination du secours et le lieu du soin ; le composant `bed` accélère la guérison. `dwarf.injured` (coup encaissé au-dessus du seuil, −10 moral) reste distinct de `dwarf.wounded` (bascule d'état, −20).
- **Boire** (`drinkSystem.js`) : préfère une **bière** atteignable (composant `drink`, détruite en buvant, événement `dwarf.drank-beer`, +15 de moral), sinon la berge atteignable la plus proche (tri par distance + `findPath` de vérification — jamais la plus proche aveuglément, ça gèle le nain). Une berge = case praticable touchant l'eau ; un pont compte. Ordre de préférence : **bière** (remontant de moral) > **puits** (meuble `well`, eau sans ivresse, **ne gèle jamais**) > **berge**. La cible bière est revalidée chaque tick — un hauler ou un autre buveur peut l'avoir déplacée/détruite. **En hiver** (`seasonSystem.isWinter`) les berges sont gelées : seuls la bière et les puits abreuvent ; sans eux la crise d'isolement (`DWARF_ISOLATED_FROM_WATER`) se déclenche naturellement.
- Moral : `moraleSystem.js` consomme les événements du bus (repas cru +10 / **plat préparé +20**, boire +5, **bière +15**, réveil complet selon le couchage **+3 au sol / +10 en lit / +18 en chambre équipée** (lit dans une Zone `bedrooms` avec brasero à portée) — `sleepSystem.roomQuality()` calcule le niveau au réveil et l'événement `dwarf.woke` le porte (`{rested, inBed, roomQuality}`), `moraleSystem` mappe vers `EFFECTS`, victoire +15, coup encaissé −10, **blessure grave −20 / soigné +12**, faim −5, soif −5, fuite −5, mort vue à ≤ 8 cases −25 / apprise −8, **deuil d'un ami** −`affinité × 0,4` en plus si `relationships` lie le témoin au défunt au-delà du palier ami — d'où l'`entityId` du mort ajouté au payload `dwarf.died`) puis dérive vers `baseline`. Moral < `low` → travail à mi-vitesse (`workEffort.js`). Moral ≤ `tantrum` → crise.
- **N'ajoute jamais un effet de moral en modifiant un émetteur** : abonne `moraleSystem.js` à l'événement existant.
- **Pensées** (`thoughts {list}`, composant data pur) : chaque effet d'événement dépose en parallèle une **pensée horodatée expirante** (`{type, delta, expiresAtTick}`, delta issu de `EFFECTS`, TTL par type) via `moraleSystem.remember()`, pour rendre l'humeur lisible (fiche d'inspection, libellés `THOUGHT_LABELS`). C'est un **registre d'affichage** : `morale.value` reste l'accumulateur (dérive/proximité/défoulement inchangés), la purge élague seulement les pensées expirées (le retour à la baseline reste géré par la dérive). Ajouter un effet de moral = un abonnement + son entrée `EFFECTS`/TTL/libellé ; aucune régression sur `tantrumSystem`/`workEffort` qui lisent `morale.value`.

## Ajouter une activité

1. Score dans `arbiterSystem.js` : une entrée dans `pickActivity()` + une méthode `<type>Score()`. Choisir le rang : survie (≥ 200) > crise (150) > besoins (≤ 120) > travail (10) > errance (1).
2. Exécutant `src/systems/<type>System.js` : filtre `activity.type`, motif marqueur + événement de transition si le journal doit raconter l'entrée/sortie (modèles : `fleeSystem.js`, `tantrumSystem.js`).
3. Enregistrer dans `main.js` (zone des exécutants : entre `Sleep` et `Dig`).
4. Libellé dans `ACTIVITY_LABELS` de `src/ui/inspectionPanel.js` ; messages dans `eventLog.js`.
5. Tests dans `tests/behaviors.test.js` : déclenchement, préemption (lâche job/sommeil), retour à la normale.
