# PRD H27 — Chef-d'œuvre et inspiration

**Lot :** H — Environnement & profondeur · **Point :** 27 · **Statut :** 🔲 À faire · **Impact / Effort :** Faible / Faible

## Problème
Toutes les pièces fabriquées sont identiques : `craftSystem.js` produit un objet strictement défini par sa recette (`recipes.json`) et sa définition (`items.json`), quel que soit le talent de l'artisan. Or `workEffort.js` module déjà la *vitesse* de fabrication selon `skills.crafting` (`SKILL_BONUS_PER_LEVEL`), mais le talent ne se traduit jamais par une *qualité* de résultat. Un maître forgeron et un débutant sortent la même épée. Il manque le petit moment de fierté et de récompense qui distingue un artisan d'exception.

## Objectif
Permettre qu'un artisan très qualifié (`skills.crafting` élevé) produise **parfois** une pièce « de maître » : bonus de statistiques (dégâts d'arme / défense d'armure) et/ou valeur supérieure, accompagné d'un petit gain de moral (fierté) via un événement `craft.masterwork`. Pur bonus additif sur `craftSystem.js` et les aptitudes existantes, à fort ratio plaisir/effort.

## Périmètre
**Inclus**
- Une chance de chef-d'œuvre au moment où `craftSystem.craft()` termine une production, croissante avec `skills.crafting` de l'artisan.
- Un effet mesurable sur la pièce produite : marquage « chef-d'œuvre » + bonus de stats (ex. `weapon.damage`/`armor.defense`) et/ou de valeur marchande.
- Un événement `craft.masterwork` (fait accompli) alimentant le journal et un petit gain de moral pour l'artisan.
- La reconnaissance visuelle/textuelle d'une pièce de maître à l'inspection.

**Exclus**
- Toute pénalité inverse (pièce ratée / de mauvaise qualité).
- Les chefs-d'œuvre sur les productions consommables non-équipables (bière, etc.) : réservé aux pièces persistantes équipables (armes/armures), voir décision.
- Un système de niveaux de qualité multiples (fin, supérieur, exceptionnel…) : ici, binaire — normal vs. chef-d'œuvre.
- La progression d'aptitude (`skills.crafting` monte-t-il ?) : hors périmètre, on lit l'aptitude existante.

## Exigences fonctionnelles
1. Quand `craftSystem.craft()` achève une pièce, une **chance de chef-d'œuvre** est évaluée, fonction croissante du `skills.crafting` de l'artisan (0 si aptitude nulle).
2. En cas de succès, la pièce produite reçoit un marqueur de chef-d'œuvre et un **bonus de statistiques** : augmentation de `weapon.damage` pour une arme, `armor.defense` pour une armure (et/ou une valeur marchande si G23 existe).
3. Le succès émet `craft.masterwork` (déclaré dans `src/events/events.js`, forme `domaine.verbe-au-passé`) avec l'artisan et le libellé de la recette.
4. `moraleSystem.js` réagit à `craft.masterwork` par un gain de moral de fierté pour l'artisan (nouvelle entrée dans la table `EFFECTS`).
5. Le journal (`ui/eventLog.js`) signale la création du chef-d'œuvre ; la fiche d'inspection (`ui/inspectionPanel.js`) distingue une pièce de maître.
6. La mécanique est **déterministe à seed près** et sans effet de bord si l'artisan n'est pas assez qualifié (chance nulle ⇒ comportement actuel inchangé).

## Conception technique
- **Point d'accroche** : dans `craftSystem.craft()`, juste après la création du produit (`this.createProduct(...)`) et avant l'émission de `ITEM_CRAFTED`. La pièce persistante passe par la branche `carrying`/`producedId` ; les recettes `consumable` (bière) sont exclues (voir décision).
- **Chance liée à l'aptitude** : lire `skills.crafting` de l'artisan (comme `workEffort.skillFactor` lit `skills[category]`). Définir une probabilité croissante (ex. proportionnelle au niveau), plafonnée. Réutiliser le mapping existant plutôt que de dupliquer la logique d'aptitude.
- **Effet sur la pièce** : la pièce a des composants `weapon`/`armor` (cf. `items.json` : `sword.weapon.damage`, `mail.armor.defense`). En cas de chef-d'œuvre, ajouter un composant `masterwork` (données pures, ex. `{ }` ou `{ tier: 'master' }`) et majorer le stat pertinent (`weapon.damage` / `armor.defense`). Si G23 (valeur marchande) est implémenté, majorer aussi la valeur ; sinon, la valeur est hors périmètre.
- **Événement & moral** : ajouter `CRAFT_MASTERWORK: 'craft.masterwork'` à `src/events/events.js`. `moraleSystem.js` s'abonne à cet événement (comme il le fait pour `GOBLIN_SLAIN`→`victory`) et pousse un gain via une nouvelle entrée `EFFECTS.masterwork`. Le bus sert ici de réaction transverse (journal + moral), l'événement décrit un fait accompli.
- **Rendu/inspection** : le composant `masterwork` permet à `ui/inspectionPanel.js` d'annoter la pièce (lecture seule). Éventuellement une couleur/glyphe distincte à l'affichage, sans toucher aux composants de simulation depuis `ui/`.
- **Respect ECS et auto-réparation** : le chef-d'œuvre est un fait figé sur la pièce (composant `masterwork` + stat majoré), sans état volatil à purger. Le tirage n'a lieu qu'une fois, à l'achèvement.
- **Croisements** : E16 (armes/armures) fournit les composants `weapon`/`armor` déjà présents dans `items.json` ; G23 (valeur marchande) est l'endroit naturel pour le bonus de valeur si ce PRD existe.

## Décision à trancher avant implémentation
- **Nature exacte du bonus** : bonus de stats seul (`weapon.damage`/`armor.defense`), bonus de valeur seul (dépend de G23), ou les deux. Recommandé : stats maintenant, valeur conditionnée à l'existence de G23.
- **Éligibilité** : limiter les chefs-d'œuvre aux pièces équipables persistantes (armes/armures), ou étendre à d'autres productions non-consommables (lit, brasero, porte) avec un effet symbolique. Recommandé : armes/armures d'abord.
- **Courbe de probabilité** : formule et plafond exacts liant `skills.crafting` à la chance de maîtrise.

## Critères d'acceptation
- Un artisan à `skills.crafting` nul ne produit jamais de chef-d'œuvre ; le comportement de `craftSystem` est identique à l'actuel.
- Un artisan très qualifié produit occasionnellement une pièce marquée `masterwork` dont le stat pertinent (`weapon.damage` ou `armor.defense`) dépasse la valeur de base de `items.json`.
- Chaque chef-d'œuvre émet `craft.masterwork`, apparaît au journal, et accorde un gain de moral à l'artisan.
- La fiche d'inspection distingue une pièce de maître d'une pièce normale.
- Aucune régression sur les recettes consommables (la bière ne devient jamais un chef-d'œuvre).

## Tests
- Scénario `tests/skills.test.js` (enrichi) ou nouveau `tests/masterwork.test.js` : forcer le tirage (seed/stub aléatoire) pour un artisan très qualifié fabriquant une arme, vérifier le composant `masterwork`, le `weapon.damage` majoré, l'événement `craft.masterwork` et le gain de moral.
- Scénario : un artisan à `skills.crafting` nul, tirage forcé au maximum, ne produit jamais de chef-d'œuvre.
- Scénario : une recette consommable (bière) ne produit jamais de chef-d'œuvre même pour un artisan qualifié.
