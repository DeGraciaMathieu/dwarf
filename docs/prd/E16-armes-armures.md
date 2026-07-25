# PRD E16 — Armes et armures supplémentaires

**Lot :** E — Richesse de contenu · **Point :** 16 · **Statut :** À faire · **Impact / Effort :** Moyen / Faible

## Problème

Le jeu ne propose qu'**une arme** (épée, +6 dégâts) et **une armure** (cotte de mailles, +3 défense) dans `items.json`. Le combat lit déjà `equipment.weapon`/`equipment.armor` et applique `base + arme − armure` (`combatSystem.js`), mais l'absence de variété rend l'équipement trivial et sans arbitrage.

## Objectif

Élargir l'arsenal via du **contenu pur** (armes et armures aux profils variés), sans nouveau code — en exploitant les composants et recettes existants.

## Périmètre

**Inclus**
- Nouvelles armes (ex. hache, lance, masse) avec `weapon.damage` distincts.
- Nouvelles armures (ex. casque, bouclier) avec `armor.defense` distincts.
- Recettes associées dans `recipes.json` (atelier forge, ingrédient minerai).

**Exclus**
- Slots d'équipement supplémentaires (main gauche/droite, tête) → nécessiterait du code (`equipment` n'a que `weapon`/`armor`) : hors périmètre, à évaluer séparément.
- Effets spéciaux (allonge, dégâts de zone) sortant du modèle `base + arme − armure`.

## Exigences fonctionnelles

1. Ajouter des définitions d'items dans `src/data/items.json` réutilisant les composants `weapon`/`armor`.
2. Ajouter les recettes correspondantes dans `src/data/recipes.json` (workshop `forge`, `ingredient: ore`, `consumable`).
3. Les nouveaux items sont équipables via le job `equip` existant sans modification de `equipSystem.js`.
4. Éventuellement, exposer certains comme objectifs de stock via la config `objectives`.

## Conception technique

- 100 % data (`items.json`, `recipes.json`), conformément au principe « ajouter du contenu ne doit pas demander de nouveau code si les composants existent déjà ».
- Vérifier la contrainte de slot : un seul `weapon` et un seul `armor` à la fois → si l'on veut casque **et** cotte simultanés, cela relève d'un PRD de code séparé (hors périmètre ici).

## Critères d'acceptation

- Plusieurs armes/armures sont fabricables à la forge et équipables.
- Le combat reflète correctement les nouvelles valeurs (`base + arme − armure`, min 1).
- Aucun code de système modifié.

## Tests

- Scénario `tests/` : nain équipé d'une arme à dégâts supérieurs tue plus vite qu'avec l'épée ; armure supérieure encaisse davantage.
