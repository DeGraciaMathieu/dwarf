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
| `tantrum` | 150 | `tantrumSystem.js` | `morale.value <= morale.tantrum` (hystérésis : sort à `tantrum + 15`) |
| `eat` | valeur de faim (≤ 100) | `eatingSystem.js` | faim ≥ seuil ET nourriture existante ET pas de marqueur `noFoodAccess` (posé quand aucune nourriture n'est atteignable — évite le gel, réévalué ~50 ticks, levé dès qu'un chemin réapparaît) |
| `drink` | valeur de soif (≤ 100) | `drinkSystem.js` | soif ≥ seuil ET pas de marqueur `noWaterAccess` (posé quand aucune berge n'est atteignable — évite le gel, réévalué ~50 ticks, levé dès que l'eau redevient accessible) |
| `sleep` | `max(fatigue, seuil)` (≤ 120) | `sleepSystem.js` | fatigue ≥ seuil, hystérésis via composant `sleeping` (dort jusqu'à fatigue 0) |
| `work` | 10 | `jobAssignmentSystem.js` + systèmes de jobs (dont `equipSystem.js` : s'armer/s'armurer est un job `equip` fait en temps de travail) | a un `currentJob` OU `jobBoard.hasAvailableJobs()` |
| `wander` | 1 | `movementSystem.js` | toujours (repli) |

Les gobelins ont aussi une `activity` (`chase`/`wander`), écrite par `hostileSystem.js` — mini-arbitre séparé.

## Ce que la bascule d'activité déclenche automatiquement (ne pas recoder)

- `activity ≠ work` → `JobAssignmentSystem` relâche le `currentJob` (le job retourne en file).
- `activity ≠ eat` → `EatingSystem` retire le `foodTarget`.
- `activity ≠ sleep` → `SleepSystem` retire `sleeping` (+ événement réveil) et `bedTarget`.
- Un porteur qui perd son job → `HaulSystem.dropOrphanedItems` dépose sa charge au sol.

## Pièges connus (appris en les corrigeant)

- **Anti-famine** : l'activité `eat` n'est proposée que si de la nourriture *existe* — sinon un affamé continue de travailler (sinon : famine circulaire, personne ne récolte). Ne pas « simplifier » ce test.
- **Anti-thrash** : le score `work` doit rester vrai pour un nain qui *a déjà* un job même si la file est vide — sinon il relâche son propre job en boucle sans jamais le finir.
- **Hystérésis obligatoire** pour tout état à seuil qui décroît pendant l'état (sommeil, crise) : sans seuil de sortie distinct, l'état s'interrompt dès le seuil refranchi.

## Besoins et moral

- Besoins (faim, soif, fatigue) : composants data (`creatures.json`) + `needsSystem.js` générique (configuré dans `main.js` : composant → événement de seuil). **Ajouter un besoin = une entrée JSON + une ligne de config**, pas un nouveau système.
- **Attrition** (`attritionSystem.js`, configuré dans `main.js`) : un besoin au maximum érode santé et moral jusqu'à la mort via `kill()` avec sa cause — faim (`starving`, 0,15/tick, `starvation`) et soif (`dehydrated`, 0,25/tick, `dehydration`). Satisfaire le besoin stoppe l'érosion. Ajouter une cause d'attrition = une entrée de config.
- **Boire** (`drinkSystem.js`) : préfère une **bière** atteignable (composant `drink`, détruite en buvant, événement `dwarf.drank-beer`, +15 de moral), sinon la berge atteignable la plus proche (tri par distance + `findPath` de vérification — jamais la plus proche aveuglément, ça gèle le nain). Une berge = case praticable touchant l'eau ; un pont compte. La cible bière est revalidée chaque tick — un hauler ou un autre buveur peut l'avoir déplacée/détruite.
- Moral : `moraleSystem.js` consomme les événements du bus (repas +10, boire +5, **bière +15**, réveil complet **+10 en lit / +3 au sol** — l'événement `dwarf.woke` porte `{rested, inBed}`, victoire +15, blessure −10, faim −5, soif −5, fuite −5, mort vue à ≤ 8 cases −25 / apprise −8) puis dérive vers `baseline`. Moral < `low` → travail à mi-vitesse (`workEffort.js`). Moral ≤ `tantrum` → crise.
- **N'ajoute jamais un effet de moral en modifiant un émetteur** : abonne `moraleSystem.js` à l'événement existant.

## Ajouter une activité

1. Score dans `arbiterSystem.js` : une entrée dans `pickActivity()` + une méthode `<type>Score()`. Choisir le rang : survie (≥ 200) > crise (150) > besoins (≤ 120) > travail (10) > errance (1).
2. Exécutant `src/systems/<type>System.js` : filtre `activity.type`, motif marqueur + événement de transition si le journal doit raconter l'entrée/sortie (modèles : `fleeSystem.js`, `tantrumSystem.js`).
3. Enregistrer dans `main.js` (zone des exécutants : entre `Sleep` et `Dig`).
4. Libellé dans `ACTIVITY_LABELS` de `src/ui/inspectionPanel.js` ; messages dans `eventLog.js`.
5. Tests dans `tests/behaviors.test.js` : déclenchement, préemption (lâche job/sommeil), retour à la normale.
