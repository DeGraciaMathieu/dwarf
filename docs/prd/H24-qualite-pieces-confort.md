# PRD H24 — Qualité des pièces et confort

**Lot :** H — Environnement & profondeur · **Point :** 24 · **Statut :** 🔲 À faire · **Impact / Effort :** Moyen / Moyen

## Problème
Aujourd'hui, dormir dans un coin de couloir vaut autant que dormir dans une vraie chambre. Le repos ne dépend que du lit : `sleepSystem.js` applique `bed.recoveryMultiplier`/`bed.heal` si le nain dort sur une tuile de lit, et `moraleSystem.js` accorde `EFFECTS.rested` (10) en lit contre `EFFECTS.restedOnGround` (3) au sol — mais rien ne distingue un lit posé en plein couloir d'un lit dans une pièce close et meublée. Le seul confort spatial existant est le brasero (`comfort` : `range`, `bonus`) via `comfortOfHome()`. Résultat : le joueur n'a aucune incitation à construire de vraies chambres ; l'aménagement (murs, porte, brasero) n'a pas de récompense mécanique claire.

## Objectif
Introduire une notion de **qualité d'espace** : un nain qui se repose dans une zone chambre/dortoir aménagée (fermée et équipée) reçoit un meilleur moral au réveil qu'à l'air libre. Réutiliser l'infrastructure `Zone` et les meubles existants (`bed`, `brazier`) pour donner du sens à la construction, sans nouvelle mécanique de besoin.

## Périmètre
**Inclus**
- Une nouvelle `Zone` « chambres » (comme `farms`/`graves`), désignable via l'UI de placement.
- Un bonus de moral au réveil modulé par la qualité de la zone où le nain se réveille.
- Une évaluation de qualité fondée sur des faits déjà présents : la tuile de repos est-elle dans une zone chambre, cette zone contient-elle un lit, un brasero à portée, est-elle bordée de murs/portes.
- Affichage lisible : la fiche d'inspection d'un nain indique la qualité de son dernier repos (ou la zone où il dort).

**Exclus**
- Toute notion de température, de saison ou d'isolation thermique (voir H25).
- Toute pile de pensées horodatée (voir H26) — ici on reste sur le moral scalaire existant.
- Une détection géométrique fine « pièce close » par flood-fill : la qualité s'appuie sur la zone désignée par le joueur et son contenu, pas sur une reconnaissance automatique de salle.
- Nouveaux meubles ou nouvelles recettes.

## Exigences fonctionnelles
1. Le joueur peut désigner une zone « chambre » sur des tuiles marchables, exactement comme les zones `farms`/`graves` existantes (`core/zones.js`).
2. Au réveil d'un nain (`sleepSystem.js` émet déjà `DWARF_WOKE` avec `rested`/`inBed`), le moral gagné dépend d'un **niveau de qualité** calculé à partir de la tuile de réveil :
   - sol nu, hors zone → niveau minimal (équivalent `restedOnGround` actuel) ;
   - lit hors zone chambre → niveau intermédiaire (équivalent `rested` actuel) ;
   - lit dans une zone chambre équipée (brasero à portée) → niveau supérieur.
3. Le calcul de qualité n'introduit aucun composant sur le nain : il lit la zone, les meubles présents et le brasero via des requêtes de composants au moment du réveil.
4. La qualité est **bornée et déterministe** : mêmes conditions ⇒ même bonus.
5. La fiche d'inspection (`ui/inspectionPanel.js`) montre au joueur la qualité de repos du nain sélectionné (au minimum : dort-il dans une zone chambre, avec lit, avec brasero).
6. Aucune régression : sans zone chambre désignée, le comportement de moral au repos reste strictement identique à l'actuel (`rested`=10 en lit, `restedOnGround`=3 au sol).

## Conception technique
- **Zone** : instancier `const bedrooms = new Zone();` dans `src/main.js` à côté de `stockpiles`/`farms`/`graves`, la passer au renderer et aux outils de désignation `ui/designation.js` comme les autres zones. `ui/` n'expose qu'une intention de placement via la `Zone`, sans toucher aux composants de simulation.
- **Évaluation de la qualité** : implémentée dans `sleepSystem.js` au point de réveil (là où `inBed` est déjà calculé via `bedAt(...)`). Le système reçoit `bedrooms` en dépendance de constructeur (comme `FarmSystem` reçoit `farms`). Une fonction pure `roomQuality(world, bedrooms, position)` :
  - vérifie `bedrooms.has(x, y)` ;
  - réutilise `bedAt(world, position)` pour l'existence du lit ;
  - réutilise le calcul de proximité de `moraleSystem.comfortOfHome()` (distance Chebyshev ≤ `comfort.range`) pour détecter un brasero à portée ;
  - renvoie un niveau discret.
- **Application du moral** : deux options (voir décision). Le plus simple respecte l'ECS : `sleepSystem.js` enrichit l'événement `DWARF_WOKE` avec le niveau de qualité (`{ entityId, rested, inBed, roomQuality }`), et `moraleSystem.js` (déjà abonné à `DWARF_WOKE`) choisit l'effet correspondant. On ajoute des entrées à la table `EFFECTS` (ex. `restedInRoom`) plutôt que des nombres en dur. Le moral reste un fait accompli : l'événement décrit un réveil, pas un ordre.
- **Respect ECS** : aucune méthode sur composants ; la qualité n'est pas stockée en composant mais recalculée à chaque réveil (état auto-réparable — rien à purger si une zone est effacée ou un brasero détruit). `ui/` ne lit le monde que pour l'afficher.
- **Rétrocompatibilité** : `roomQuality` par défaut au niveau « sol/lit » existant si `bedrooms` est vide ; les sauvegardes sans zone chambre restent valides.

## Décision à trancher avant implémentation
Où décider du montant de moral : (a) `sleepSystem.js` enrichit `DWARF_WOKE` avec `roomQuality` et `moraleSystem.js` mappe qualité → `EFFECTS.*` (garde toutes les valeurs de moral centralisées dans `moraleSystem`, cohérent avec le reste), ou (b) `sleepSystem.js` calcule et émet directement le delta. L'option (a) est recommandée pour garder `moraleSystem` seul propriétaire des barèmes de moral.

## Critères d'acceptation
- Une zone chambre peut être désignée puis effacée via l'UI, comme les farms.
- Un nain qui se réveille dans un lit situé dans une zone chambre avec brasero à portée gagne strictement plus de moral qu'un nain réveillé dans un lit hors zone, lui-même strictement plus qu'un nain réveillé au sol.
- Sans aucune zone chambre, les gains de moral au réveil sont identiques à l'existant.
- La fiche d'inspection affiche la qualité de repos du nain sélectionné.
- Détruire le brasero ou effacer la zone n'entraîne aucune erreur et réduit le bonus au réveil suivant (auto-réparable).

## Tests
- Scénario `tests/comfort.test.js` (ou nouveau `tests/rooms.test.js`) : trois nains fatigués réveillés respectivement au sol, dans un lit hors zone, et dans un lit d'une zone chambre avec brasero ; asserter l'ordre strict des gains de moral au réveil.
- Scénario : avec `bedrooms` vide, un réveil en lit produit exactement le même moral qu'avant l'ajout (garde-fou de non-régression).
- Scénario : effacer la zone chambre après désignation puis réveiller un nain sur cette tuile ne lève aucune erreur et retombe au niveau lit-hors-zone.
