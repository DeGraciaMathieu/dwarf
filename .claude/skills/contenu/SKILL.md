---
name: contenu
description: Use when ajoutant ou modifiant du contenu de Dwarf (créatures, objets, meubles, tuiles, plantes, recettes) — tout vit dans src/data/*.json.
auto_invoke: true
---

# Contenu piloté par les données

Une définition = `{glyph, color, components: {...}}`. `spawnFromDefinition` (`src/core/spawn.js`) instancie position + renderable + un `structuredClone` de chaque composant. **Le comportement découle des composants présents** — pas du fichier d'origine.

## Les cinq fichiers

| Fichier | Contient | Chargé par |
|---|---|---|
| `creatures.json` | `dwarf` (+ pool `names`, composant `skills` d'aptitudes), archétypes hostiles `goblin`, `brute` (coriace), `archer` (`combat.range`), `chief` (`leader`, aura de dégâts) | `main.js` (spawn initial), `goblinSpawnSystem.js`, `migrantSystem.js` |
| `items.json` | `bread`, `log`, `stone`, `ore`, `mushroom`, `fish`, `beer`, `corpse`, `workshop`, `brewery`, `masonry`, `forge`, `bed`, `brazier`, `door`, `bridge`, `stoneBed`, `stoneDoor`, armes `sword`/`axe`/`spear`, armures `mail`/`plate`/`shield` | `main.js`, systèmes producteurs |
| `tiles.json` | `floor`, `wall`, `ore`, `tree`, `door`, `water`, `bridge` — `{glyph, color, walkable, blocksHostiles?}` | `terrain.js`, `renderer.js` |
| `plants.json` | `mushroom` — `{young, mature, growthTicks}` | `farmSystem.js` |
| `recipes.json` | ateliers/meubles/équipements — `{label, ghost?, craftTicks, produces, workshop?, installsTile?, site?, ingredient?, consumable?, requires?}` ; `requires: { workshop }` = palier de progression (`recipeGate.js`, lu par steward et `designation.js`) | `craftSystem.js`, `designation.js`, `stewardSystem.js` |

## Quel composant déclenche quel système

| Composant | Effet |
|---|---|
| `hunger`, `thirst`, `fatigue` | besoins qui montent (`needsSystem`), activités eat/drink/sleep ; faim et soif au maximum tuent (`attritionSystem`) |
| `morale` | humeur, ralentissement, crises (`moraleSystem`, `tantrumSystem`) |
| `health` + `combat` | peut frapper/mourir (`combatSystem`) ; `combat.courage` (nains) départage fight/flee ; `combat.range` (défaut 1) porte l'attaque à distance (archer) |
| `leader` | aura : tant qu'un porteur vivant existe, les hostiles frappent plus fort (`combatSystem.commandBonus`) |
| `worker` | arbitré par l'arbitre, prend des jobs, ciblé par les gobelins |
| `skills` | niveaux d'aptitude par catégorie (`mining`, `woodcutting`…) ; accélèrent le job correspondant via `workEffort` (mapping `SKILL_BY_JOB`) ; une spécialité est tirée au spawn (`assignAptitude`) |
| `wander` | erre quand `activity === 'wander'` |
| `hostile` | poursuit les workers (`hostileSystem`) ; garde une `chaseMemory` (dernière position vue + TTL) pour poursuivre hors de vue avant d'oublier ; déclenche fuite/combat |
| `item` | transportable au stock, cassable en crise de nerfs |
| `food` | mangeable (détruit au repas) |
| `drink` | buvable : un assoiffé le préfère à la berge, +15 de moral (`drinkSystem`) |
| `buildMaterial` | consommé par les jobs `build` et `craft` (ingrédient par défaut) |
| `brewable` | ingrédient des recettes `ingredient: 'brewable'` (bière) |
| `stone` | pierre lâchée en creusant : à la fois `buildMaterial` (murs) et ingrédient des recettes `ingredient: 'stone'` (atelier de taille) |
| `ore` | minerai lâché en creusant une tuile `ore` (veine) : rangé au stock, ingrédient des recettes `ingredient: 'ore'` (forge) |
| `weapon` / `armor` | équipement forgé (`weapon {damage}`, `armor {defense}`) ; sans `item` (non haulé) ; ramassé par un job `equip` et référencé par `equipment` |
| `equipment` | slots d'un nain `{weapon, armor}` (ids des objets portés) ; lu par `combatSystem` (bonus d'arme, atténuation d'armure), lâché au sol à la mort |
| `bed` | dortoir : récupération ×`recoveryMultiplier`, soin `heal`/tick (`sleepSystem`) |
| `comfort` | meuble de confort (brasero) : `{range, bonus}` ; réchauffe en drift le moral des nains à portée (`moraleSystem.comfortOfHome`), un seul bonus par nain |
| `workshop` | site de fabrication requis par les jobs `craft` ; `type` (`carpentry`, `brewery`, `masonry`, `forge`) doit correspondre au champ `workshop` de la recette (un atelier sans type accepte tout — anciennes sauvegardes). L'atelier lui-même se construit via une recette `craft` : `workshop` (sans champ `workshop` → fabriqué sur le chantier), `brewery`/`masonry`/`forge` (`workshop: carpentry` → exigent un atelier de menuiserie) |
| `corpse` | dépouille qui vieillit (`decay`) : au seuil elle passe `rotten` (malus de moral de proximité) ; un job `bury` vers la zone `graves` la transforme en `buried`. Portée par `item` mais ignorée du haul générique (`graveSystem`) |
| `crop` | pousse puis se récolte (`farmSystem`) |
| `identity` | nom affiché (journal, inspection) — nains uniquement |

## Procédures

**Ajouter une créature** : entrée dans `creatures.json` avec les composants voulus (voir table). Hostile : `hostile` + `health` + `combat` — le spawn périodique est propre aux gobelins (`goblinSpawnSystem.js`), à généraliser si besoin. Amicale : `worker` + besoins + `identity` au spawn.

**Ajouter un objet/aliment** : entrée dans `items.json` (`item` pour qu'il soit rangé au stock, `food` pour qu'il soit mangé, `buildMaterial` pour la construction). Rien d'autre à faire si un système le produit déjà.

**Ajouter un meuble fabricable** :
1. `items.json` : le meuble, avec `item` (retiré à l'installation par `craftSystem.js`) + son composant fonctionnel (modèle : `bed`).
2. `recipes.json` : `{label (avec article : « un lit »), ghost, craftTicks, produces}`. Si le produit s'installe comme **tuile** au lieu d'un meuble (modèles : porte, pont), ajouter `installsTile: '<type de tuile>'` — le kit porté est détruit, `terrain.set()` pose la tuile et `resetUnreachable()` réveille les chantiers que le nouveau passage ouvre. Si la désignation vise autre chose que du sol (modèle : le pont sur l'eau), ajouter `site: '<type de tuile>'` ; l'installation se fait alors depuis une case adjacente.
3. `index.html` : bouton `data-tool="craft:<recette>"` — `designation.js` gère tous les modes `craft:*` génériquement.
4. Si le composant fonctionnel est nouveau, écrire le système qui l'exploite (modèle : lits dans `sleepSystem.js`).

**Ajouter un consommable fabriqué** (modèle : la bière) :
1. `items.json` : le produit (`item` + composant consommé, ex. `drink`) et l'atelier typé si nouveau (`workshop: {type}`, sans `item` : il n'est pas rangé au stock). Le poser passe par une recette `craft` (`produces: <atelier>`, sans champ `workshop` s'il se construit sur le chantier) + un bouton `data-tool="craft:<atelier>"`.
2. `recipes.json` : `{label, craftTicks, produces, ingredient (composant du matériau), workshop, consumable: true}` — pas de phase d'installation : le produit est posé au sol à l'atelier (événement `ITEM_CRAFTED`) puis rangé au stock par le haul.
3. Le piloter par objectif de stock : ajouter `{recipe, target}` à la liste `objectives` de `main.js` — le `StewardSystem` poste/retire les jobs `craft` pour maintenir la cible, réglable dans le panneau Objectifs (`objectivesPanel.js`). Aucun nouveau code : toute recette `consumable: true` est éligible. Le comptage (`countStock`) ignore `position`, donc un objet **porté/équipé** (épée, cotte de mailles) compte dans le stock — l'intendant ne surproduit pas.

Les **armes/armures** suivent ce modèle : recettes `consumable: true` (forgées et déposées à la forge, sans case à désigner), pilotées par un objectif ; un nain oisif les ramasse ensuite via un job `equip`. Elles n'ont pas de bouton d'outil manuel.

**Ajouter un type de tuile** : `tiles.json` (`walkable` correct ; `blocksHostiles: true` pour bloquer les hostiles seulement — `isWalkable(x, y, {hostile})` et `findPath(..., {hostile: true})` en tiennent compte) + le placer dans la génération (`terrain.js`) ou via une recette `installsTile`.

**Ajouter une culture** : `plants.json` + l'aliment produit dans `items.json`. `farmSystem.js` est mono-culture (champignon) — le paramétrer par champ serait l'extension à faire.

Après tout ajout : vérifier l'équilibrage en le testant dans un scénario (`tests/`), pas à l'œil.
