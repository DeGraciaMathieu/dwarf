# PRD G22 — Élevage et chasse

**Lot :** G — Chaîne économique · **Point :** 22 · **Statut :** 🔲 À faire · **Impact / Effort :** Fort / Moyen

## Problème

La seule filière nourriture actuelle est végétale/aquatique : agriculture (`farmSystem`, `mushroom`) et pêche (`fishSystem`, `fish`). La surface n'a aucun intérêt propre — les seules créatures non-naines sont hostiles (`goblin`, `brute`, `archer`, `chief` dans `creatures.json`), traitées par `hostileSystem`/`combatSystem`. Il n'existe ni animal neutre, ni source de **viande** ni de **cuir**, et donc rien pour alimenter la future cuisine (G21) au-delà des champignons et du poisson, ni pour occuper/explorer la surface autrement qu'en subissant les invasions.

## Objectif

Introduire des **animaux** : du **gibier sauvage** à chasser en surface (nouvelle activité `hunt` arbitrée, réutilisant le combat existant) et, en option, du **bétail** exploitable. La chasse produit une carcasse à rapporter (`haulSystem`) qui donne de la **viande** (ingrédient pour la cuisine de G21) et du **cuir** (piste d'armure légère). La surface gagne une raison d'être occupée. Le contenu reste piloté par les données autant que possible.

## Périmètre

**Inclus**
- Un ou plusieurs animaux **neutres** (gibier) dans `creatures.json`, non hostiles, se déplaçant en surface.
- Une activité de chasse `hunt` décidée par l'arbitre (`arbiterSystem`), exécutée en réutilisant `combatSystem` (frappe) et le déplacement existant.
- Une **carcasse** laissée à la mort de l'animal, rapportable par `haulSystem`, transformable en viande (+ cuir) — sur le modèle du `corpse` déjà produit à la mort.
- La **viande** comme item `food` (et ingrédient cuisinable pour G21) ; le **cuir** comme matériau.

**Exclus**
- Reproduction/croissance de troupeau, gestion de pâturage complexe (au plus un enclos zone simple si retenu).
- Domestication dynamique d'animaux sauvages.
- Écosystème (prédateurs entre animaux, faim des animaux).
- Nouvelles pièces d'armure : le cuir peut n'être qu'un matériau produit, sa recette d'armure relevant d'un PRD ultérieur (voir E16 armes/armures).

## Exigences fonctionnelles

1. Un animal gibier existe comme définition de créature neutre : présent sur la carte, non ciblé par les nains sauf ordre de chasse, et ne ciblant pas les nains (pas de composant `hostile`).
2. Le joueur peut déclencher la chasse (désignation d'une cible ou d'une zone de chasse), traduite en intention par le flux joueur autorisé (`jobBoard.post()` ou `Zone`), jamais par un accès direct de l'UI aux composants.
3. L'arbitre (`arbiterSystem`) attribue l'activité `hunt` à un nain disponible ; l'exécution filtre sur `activity.type === 'hunt'`, comme `fight` filtre déjà dans `combatSystem`.
4. À la mort du gibier, une carcasse apparaît (item avec `position`), rapportée par `haulSystem` comme n'importe quel item.
5. La carcasse rendue donne de la viande (item `food`, marquée cuisinable pour G21) et, optionnellement, du cuir (matériau).
6. Aucune régression sur les hostiles : la distinction gibier neutre / ennemi hostile passe uniquement par la présence ou l'absence du composant `hostile`.

## Conception technique

- **Gibier = donnée.** Ajouter dans `creatures.json` un archétype neutre (ex. `deer`) avec `health`, `combat` (pour pouvoir être frappé/tué, éventuellement une faible riposte ou aucune), `wander`, **sans** `hostile`. `hostileSystem` ne le ciblera pas (il ne query que `hostile`), et `combatSystem` ne le fera attaquer personne. Réutiliser `spawnFromDefinition`.
- **Apparition du gibier.** Faire apparaître le gibier en surface via un petit système d'apparition sur le modèle temporel de `goblinSpawnSystem`/`migrantSystem` (compteur + `randomEdgeTile`/tuile de surface), ou en peuplement initial. Garder la logique métier hors de `core/`.
- **Activité `hunt` dans l'arbitre.** Ajouter le score/branche `hunt` dans `arbiterSystem` (seul écrivain d'`activity`), déclenché par une intention joueur (job de chasse ou appartenance à une zone de chasse). L'exécutant lit `activity.type === 'hunt'`, se déplace vers la cible via le pathfinding, et laisse `combatSystem` porter les coups quand la cible est à portée — comme la branche `fight` existante. Réutiliser au maximum la mécanique de ciblage/`targetInRange` de `combatSystem`.
- **Mort et carcasse.** À la mort du gibier, produire une carcasse comme `combatSystem`/`death.js` produit déjà un `corpse` (item avec `position`) — définir une carcasse d'animal (item) plutôt que réutiliser le cadavre nain. `haulSystem` la rapporte car il poste un job `haul` pour tout item avec `position` (hors `corpse` de nain).
- **Boucherie / rendu de la carcasse.** Transformer la carcasse en viande + cuir : soit via une recette de découpe (`craftSystem` + atelier, éventuellement la cuisine de G21), soit à la dépose. Privilégier une recette data pour rester piloté par les données ; trancher ci-dessous.
- **Viande & cuir = items data.** `meat` : composant `food` (nutrition) + `item` + marqueur cuisinable (aligné sur G21). `leather` : `item` + `buildMaterial`/matériau, réutilisable comme ingrédient d'une future armure de cuir (recette relevant de E16). Ajouts dans `items.json`.
- **Croisement G21.** La viande alimente directement la cuisine de G21 (ingrédient cuisinable → plat de qualité). Ce PRD fournit l'ingrédient carné que G21 consomme.
- **Bétail (optionnel).** Si retenu : un animal domestique dans une zone enclos (`Zone`, comme les fermes/tombes), abattable pour viande/cuir. À traiter en second temps pour ne pas alourdir la première livraison.
- Respect ECS et état auto-réparable : réservations de cible de chasse purgées/reconstruites au tick comme les réservations de jobs existantes ; aucune méthode sur les composants.

## Décision à trancher avant implémentation

- **Déclenchement de la chasse.** Désignation ponctuelle d'une cible (job `hunt` sur un animal) vs **zone de chasse** (`Zone` de surface où tout gibier est chassé). La zone est plus cohérente avec farms/graves/fishingSpots ; la cible ponctuelle est plus directe.
- **Où découper la carcasse.** Recette de découpe dans un atelier existant (cuisine G21 ? menuiserie ?) vs rendu direct viande+cuir à la dépose de la carcasse. Recommandation : recette data dans la cuisine, pour cohérence avec G21.
- **Bétail dans ce lot ou plus tard.** Livrer d'abord chasse + gibier + carcasse + viande/cuir, puis l'élevage enclos si le besoin se confirme.
- **Riposte du gibier.** Gibier totalement passif (fuit/ignore) vs riposte faible s'il est frappé. Passif est plus simple et suffisant pour un premier jet.

## Critères d'acceptation

- Un animal neutre apparaît en surface, n'attaque aucun nain et n'est pas pris pour cible par les hostiles.
- Sur ordre de chasse, un nain reçoit l'activité `hunt`, rejoint le gibier et le tue en réutilisant le combat existant.
- La mort du gibier laisse une carcasse que `haulSystem` rapporte automatiquement au stock.
- La carcasse rendue produit de la viande (item `food` cuisinable) et, si retenu, du cuir.
- Aucune régression sur les invasions : les hostiles restent ciblés et ciblent les nains comme avant.

## Tests

- Scénario `tests/` : gibier + nains, aucun ordre → le gibier ne subit rien et n'attaque personne ; les hostiles présents ciblent toujours les nains.
- Scénario `tests/` : ordre de chasse sur un gibier → un nain passe en activité `hunt`, l'atteint, le tue, et une carcasse apparaît à sa position.
- Scénario `tests/` : carcasse au sol → `haulSystem` la rapporte au stock, puis la découpe produit de la viande (et du cuir si retenu).
- Scénario `tests/` : la viande produite est acceptée comme ingrédient de cuisine (croisement G21) et donne un plat de qualité.
