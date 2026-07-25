---
name: testing
description: Use when écrivant ou lançant des tests pour Dwarf — commande, philosophie macro, harnais partagé, et où placer un nouveau test.
auto_invoke: true
---

# Tests de Dwarf

- **Commande** : `npm test` (alias de `node --test tests/`). Rapide (~2 s), lancé aussi par le hook Stop du projet.
- **Philosophie : tests macro de comportement.** On monte une colonie sur un terrain contrôlé, on la fait tourner N ticks, on vérifie les *faits observables* : terrain muté, événements émis, entités vivantes, séquences (`['récolte', 'repas']`). On ne teste **pas** les détails d'implémentation (pas de test de getter, pas d'assertion sur la forme interne d'un composant).
- Le hasard (`Math.random` dans l'errance, la génération) est toléré : scénarios contraints (terrains étroits, taux à 0) et bornes tolérantes (`> fast * 1.6`, moyenne sur 5 cartes) plutôt que valeurs exactes.

## Harnais partagé — `tests/helpers.js`

| Helper | Rôle |
|---|---|
| `setupColony(terrain, {goblinSpawner})` | monde complet avec tous les systèmes dans l'ordre de `main.js` ; retourne `{world, bus, jobBoard, stockpiles, farms, terrain, run(ticks), collect(event)}` |
| `makeTerrain(rows)` | terrain depuis un dessin ASCII : `#` mur, `T` arbre, autre sol |
| `openTerrain(w, h)` | plaine vide |
| `addDwarf(world, x, y, overrides)` | nain complet ; overrides : `name, hunger, hungerRate, fatigue, fatigueRate, health, morale, courage` (taux à 0 par défaut → besoins figés, scénarios déterministes) |
| `addGoblin / addBread / addLog / addBed` | entités usuelles |
| `entitiesAt(world, component, x, y)` | requête positionnelle |
| `data` | les cinq JSON de `src/data/` chargés |
| `colony.collect(EVENTS.X)` | tableau vivant des payloads reçus — l'outil principal d'assertion |

**Important** : `setupColony` duplique l'ordre des systèmes de `main.js`. Tout nouveau système enregistré dans `main.js` doit l'être aussi dans `helpers.js`, au même rang.

## Mapping fichier → périmètre

| Fichier | Couvre |
|---|---|
| `tests/core.test.js` | ECS, bus, A*, génération de terrain, régions connexes |
| `tests/jobs.test.js` | dig, chop, haul, build, craft : nominal, inaccessible, interruption |
| `tests/survival.test.js` | faim/repas, sommeil/lits/soins, priorités de l'arbitre côté besoins |
| `tests/behaviors.test.js` | poursuite, fuite, combat, mort, moral, crise de nerfs |
| `tests/colony.test.js` | intégration : colonie complète sur carte générée, bataille, boucle de nourriture |
| `tests/save.test.js` | sauvegarde : aller-retour, objets portés, volatils vs hystérésis, reprise de simulation |
| `tests/doors.test.js` | portes : marchabilité selon l'allégeance, fabrication en tuile, forteresse étanche |

## Ajouter un test

1. Choisir le fichier selon la table (nouvelle feature transverse → scénario d'intégration dans `colony.test.js` *en plus* du test ciblé).
2. Terrain minimal qui contraint le scénario (couloir 1 case de haut pour forcer un trajet, taux de besoin à 0 sauf celui étudié).
3. Poser les `collect()` **avant** `run()`.
4. Trois cas pour une mécanique : nominal, empêché (inaccessible/occupé/pénurie), interrompu (gobelin ou faim en cours de route).
5. `npm test` doit être vert avant de déclarer la tâche finie — et les scénarios de validation d'un chantier restent dans la suite, ils ne sont jamais jetés.
