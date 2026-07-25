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
| `creatures.json` | `dwarf`, `goblin` | `main.js` (spawn initial), `goblinSpawnSystem.js` |
| `items.json` | `bread`, `log`, `mushroom`, `corpse`, `workshop`, `bed` | `main.js`, systèmes producteurs |
| `tiles.json` | `floor`, `wall`, `tree` — `{glyph, color, walkable}` | `terrain.js`, `renderer.js` |
| `plants.json` | `mushroom` — `{young, mature, growthTicks}` | `farmSystem.js` |
| `recipes.json` | `bed` — `{label, ghost, craftTicks, produces}` | `craftSystem.js`, `designation.js` |

## Quel composant déclenche quel système

| Composant | Effet |
|---|---|
| `hunger`, `fatigue` | besoins qui montent (`needsSystem`), activités eat/sleep |
| `morale` | humeur, ralentissement, crises (`moraleSystem`, `tantrumSystem`) |
| `health` + `combat` | peut frapper/mourir (`combatSystem`) ; `combat.courage` (nains) départage fight/flee |
| `worker` | arbitré par l'arbitre, prend des jobs, ciblé par les gobelins |
| `wander` | erre quand `activity === 'wander'` |
| `hostile` | poursuit les workers (`hostileSystem`), déclenche fuite/combat |
| `item` | transportable au stock, cassable en crise de nerfs |
| `food` | mangeable (détruit au repas) |
| `buildMaterial` | consommé par les jobs `build` et `craft` |
| `bed` | dortoir : récupération ×`recoveryMultiplier`, soin `heal`/tick (`sleepSystem`) |
| `workshop` | site de fabrication requis par les jobs `craft` |
| `crop` | pousse puis se récolte (`farmSystem`) |
| `identity` | nom affiché (journal, inspection) — nains uniquement |

## Procédures

**Ajouter une créature** : entrée dans `creatures.json` avec les composants voulus (voir table). Hostile : `hostile` + `health` + `combat` — le spawn périodique est propre aux gobelins (`goblinSpawnSystem.js`), à généraliser si besoin. Amicale : `worker` + besoins + `identity` au spawn.

**Ajouter un objet/aliment** : entrée dans `items.json` (`item` pour qu'il soit rangé au stock, `food` pour qu'il soit mangé, `buildMaterial` pour la construction). Rien d'autre à faire si un système le produit déjà.

**Ajouter un meuble fabricable** :
1. `items.json` : le meuble, avec `item` (retiré à l'installation par `craftSystem.js`) + son composant fonctionnel (modèle : `bed`).
2. `recipes.json` : `{label, ghost, craftTicks, produces}`.
3. `index.html` : bouton `data-tool` ; `designation.js` : le mode qui poste `{type:'craft', recipe, ghost, target}`.
4. Si le composant fonctionnel est nouveau, écrire le système qui l'exploite (modèle : lits dans `sleepSystem.js`).

**Ajouter un type de tuile** : `tiles.json` (`walkable` correct) + le placer dans la génération (`terrain.js`).

**Ajouter une culture** : `plants.json` + l'aliment produit dans `items.json`. `farmSystem.js` est mono-culture (champignon) — le paramétrer par champ serait l'extension à faire.

Après tout ajout : vérifier l'équilibrage en le testant dans un scénario (`tests/`), pas à l'œil.
