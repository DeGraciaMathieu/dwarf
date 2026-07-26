# PRD J33 — Progression des aptitudes par l'expérience

**Lot :** J — Profondeur · **Point :** 33 · **Statut :** 🔲 À faire · **Impact / Effort :** Moyen / Moyen

## Problème

Les aptitudes sont **figées au spawn**. Dans `workEffort.js`, le composant `skills` (`mining`, `woodcutting`, `crafting`, `building`, `farming`, `fishing`, déclaré dans `creatures.json`) est initialisé à 0, puis `assignAptitude(world, entityId)` tire une seule spécialité au hasard et lui pose le niveau `SPECIALIST_LEVEL` (2). Après cela, plus rien ne bouge : `workEffort(world, entityId, jobType)` combine moral + ivresse + `skillFactor` (`1 + SKILL_BONUS_PER_LEVEL * level`), mais le `level` ne monte jamais.

Conséquence : un nain qui creuse mille murs ne devient pas meilleur mineur qu'un débutant. Aucun **investissement à long terme** dans un individu n'est possible, alors que le mapping `SKILL_BY_JOB` relie déjà chaque type de job à une catégorie d'aptitude — l'infrastructure d'un gain à l'usage est presque là.

## Objectif

Faire **progresser les aptitudes par la pratique** : accomplir un job accroît la compétence correspondante, des **paliers de niveau** font émerger des spécialistes (mineur/forgeron vétéran) qui travaillent encore plus vite, ce qui rétro-alimente `workEffort`. Rendre cette progression visible dans le panneau d'inspection. La montée reste bornée et déterministe côté données.

## Périmètre

**Inclus**
- De l'**XP** gagnée à l'usage, mappée via `SKILL_BY_JOB` de `workEffort.js` (le même mapping qui sert déjà à `skillFactor`).
- Des **paliers** convertissant l'XP en niveaux de `skills`, réutilisés tels quels par `workEffort` (via `SKILL_BONUS_PER_LEVEL`).
- L'**affichage** des niveaux/de la progression dans `ui/inspectionPanel.js` (qui affiche déjà les aptitudes notables via `aptitudes()` et `SKILL_LABELS`).
- Un **plafond de niveau** pour borner l'accélération.

**Exclus**
- La refonte de `assignAptitude` : la spécialité de départ reste un bonus initial ; ce PRD ajoute la montée, il ne supprime pas le tirage au spawn (à trancher seulement s'il double emploi).
- L'entraînement militaire dédié : la compétence de combat n'est pas dans `SKILL_BY_JOB` aujourd'hui ; son entraînement relève de J32, qui se **branche** sur le mécanisme d'XP défini ici.
- Le chef-d'œuvre : ce PRD fournit la « haute compétence » ; sa consommation pour produire une pièce de maître est portée par H27 (crochet, pas implémenté ici).

## Exigences fonctionnelles

1. Accomplir un job d'un type présent dans `SKILL_BY_JOB` (dig→mining, chop→woodcutting, craft→crafting, build→building, plant/harvest→farming, fish→fishing) octroie de l'XP dans la catégorie correspondante au nain qui l'exécute.
2. L'XP accumulée franchit des **paliers** qui incrémentent le niveau de la catégorie dans `skills`.
3. Un niveau plus élevé accélère le travail **sans nouveau code de vitesse** : `workEffort` lit déjà `skills[category]` via `skillFactor` (`1 + SKILL_BONUS_PER_LEVEL * level`) ; il suffit que le niveau monte.
4. La progression est **bornée** par un plafond de niveau ; au-delà, l'XP n'a plus d'effet.
5. `ui/inspectionPanel.js` montre les niveaux atteints (et, si retenu, la progression vers le palier suivant), en réutilisant `SKILL_LABELS` et la section `aptitudes()`.
6. La progression **survit à la sauvegarde** : elle est stockée dans un composant persisté par `save.js`.
7. Un nain sans composant `skills` (créature non concernée) ne gagne pas d'XP et ne provoque aucune erreur (comme `skillFactor` qui renvoie 1 en l'absence de catégorie).

## Conception technique

- **Où gagner l'XP** : les systèmes de jobs appellent déjà `workEffort(world, entityId, jobType)` à chaque tick de progrès (ex. `digSystem.js` : `currentJob.progress += workEffort(...)`, idem chop/craft/build/farm/fish). C'est le point d'accroche naturel. Deux options selon la décision : incrémenter l'XP **à chaque tick de progrès** (granulaire, favorise les longues tâches) ou **à la complétion du job** (une prime forfaitaire par job fini).
- **Où stocker l'XP** (voir Décision) : soit dans le composant `skills` existant (ajouter des champs d'XP à côté des niveaux) soit dans un nouveau composant `experience` séparé (niveaux dans `skills`, XP brute à part). Dans les deux cas, `save.js` le persiste génériquement dès lors qu'il n'est pas dans `VOLATILE_COMPONENTS`.
- **Paliers** : une table de seuils (constante dans `workEffort.js`, à côté de `SKILL_BONUS_PER_LEVEL`, `SPECIALIST_LEVEL`, `SKILL_BY_JOB`) convertit l'XP cumulée en niveau, plafonnée. Le gain de vitesse reste porté par le `skillFactor` existant — **ne pas dupliquer** la logique d'effort.
- **Fonction de gain** : ajouter dans `workEffort.js` (module propriétaire du mapping et de `skillFactor`) une fonction de gain d'XP (ex. `gainExperience(world, entityId, jobType)`) appelée par les systèmes de jobs, symétrique de `workEffort`. Cela garde la logique d'aptitude centralisée dans un seul module.
- **ECS strict** : `skills`/`experience` restent des **données pures** ; toute la logique de conversion XP→niveau vit dans le système/fonction, jamais dans le composant.
- **Affichage** : `ui/inspectionPanel.js` lit `skills` (et l'XP) pour l'affichage — l'UI **lit** le monde, ne touche pas aux composants de simulation. Étendre `aptitudes()` sans introduire d'écriture.
- **Crochets** : J32 (militaire) réutilise le même mécanisme d'XP pour la compétence de combat (qu'il faudra alors ajouter au périmètre des catégories) ; H27 (chef-d'œuvre) lit un niveau élevé pour produire une pièce de maître. Ce PRD ne code ni l'un ni l'autre.
- **Événement** : un franchissement de palier peut émettre un fait accompli (`domaine.verbe-au-passé`) dans `src/events/events.js` pour le journal (ex. un nain devenu vétéran), au bus, en fin de tick — jamais impératif. Optionnel.

## Décision à trancher avant implémentation

1. **Moment du gain** : XP au **tick de progrès** (via l'appel `workEffort` déjà présent) vs XP **à la complétion du job**. Le premier récompense l'effort brut et est trivial à brancher ; le second récompense l'achèvement et évite d'accumuler de l'XP sur des jobs abandonnés.
2. **Stockage** : étendre le composant `skills` (XP + niveau ensemble) vs nouveau composant `experience` (séparation données/dérivé). Le premier est minimal ; le second sépare l'état brut du dérivé consommé par `skillFactor`.
3. **Plafond** : valeur du niveau max (borne le facteur `1 + SKILL_BONUS_PER_LEVEL * level`).

## Critères d'acceptation

- Un nain qui répète un job voit le niveau de la catégorie associée augmenter au fil du temps.
- Une fois un niveau gagné, le même job progresse plus vite (mesurable via `workEffort` / le nombre de ticks pour compléter).
- Le niveau ne dépasse jamais le plafond ; au plafond, l'XP supplémentaire n'a plus d'effet.
- Le panneau d'inspection affiche les niveaux (et éventuellement la progression) via `SKILL_LABELS`.
- Une sauvegarde/rechargement conserve niveaux et XP.
- Une créature sans `skills` ne gagne pas d'XP et ne déclenche aucune erreur.

## Tests

- Scénario `tests/` : faire accomplir N jobs de dig au même nain et vérifier que `skills.mining` a augmenté d'au moins un niveau.
- Scénario `tests/` : comparer le nombre de ticks pour compléter un job avant et après montée de niveau, et vérifier l'accélération (cohérente avec `skillFactor`).
- Scénario `tests/` : pousser l'XP au-delà du plafond et vérifier que le niveau est borné.
- Scénario `tests/` : sauvegarder puis restaurer une partie et vérifier que niveaux et XP sont préservés.
