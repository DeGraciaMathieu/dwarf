> **📋 Planning Instructions**
> When using `/create-plan` for this work:
> - Create plans in the `phases/` subdirectory
> - Reference this BRIEF.md for work context and scope
> - **Identifier:** `ID-01`
> - **Commits:**
>   - Subagent: Use `feat(ID-01-01):`, `fix(ID-01-02):`, etc.
>   - Manual: Use standard prefixes without identifier

---

# Work: objectifs-de-stock

**Identifier:** ID-01
**Type:** Feature

## Objective

Le joueur déclare un état désiré (« maintenir N bières en stock ») au lieu de poster des ordres de brassage un par un. Un système d'intendance compare en continu le stock observé à la cible et poste ou retire les jobs de craft nécessaires pour combler l'écart.

Motivation : la consommation de bière est déjà autonome (`drinkSystem` choisit la bière avant l'eau) mais la production est entièrement manuelle — une micro-gestion sans décision intéressante. La cible de stock déplace la décision du joueur au bon niveau : une politique de colonie, pas un clic par bière. La cible reste réglable (et non automatique) car le brassable est une ressource partagée — à terme, arbitrer entre objectifs concurrents (repas vs bières) est un levier de jeu.

## Scope

**Included:**
- Annulation dans `jobBoard` d'un job posté non réclamé (capacité manquante, nécessaire au retrait quand la cible baisse ou que le stock est atteint par ailleurs).
- Nouveau `stewardSystem` (intendance) dans l'ordre du tick : réconciliation `à poster = max(0, cible − stock − jobs de brassage en cours)`, en recomptant chaque tick l'état observé (convention d'état volatil auto-réparable — pas de comptabilité incrémentale).
- Garde-fou ingrédient : aucun job posté s'il n'existe pas d'ingrédient `brewable` libre et posé au sol — un objectif insatisfaisable attend silencieusement au lieu de faire tourner un nain dans le vide.
- Donnée d'objectif = intention du joueur, au même titre que les `Zone` : structure de données pure créée dans `main.js`, écrite par l'UI, lue par l'intendance. L'UI ne touche jamais aux composants de simulation.
- Générique sur les recettes `consumable` (pas de code spécifique bière), même si la bière est le seul cas au lancement.
- UI minimale : régler la cible N et voir l'état de l'objectif (stock actuel / cible, bloqué si rien à brasser).
- Scénarios macro dans `tests/` pour chaque comportement validé.
- Mise à jour des skills concernés (`jobs`, `comportements` si l'ordre du tick change, `contenu`) et de `PATCHNOTES.md`.

**Excluded:**
- Plusieurs objectifs simultanés et leur ordre de priorité (arbitrage repas vs bières) — pattern prévu pour l'accueillir, pas implémenté.
- Objectifs sur les crafts spatiaux (lit, porte, pont) : tout ce qui a une position reste un ordre impératif du joueur. La frontière est le flag `consumable` de `recipes.json`.
- Réservation d'ingrédients par objectif, files de production par atelier, ordres répétés à la Dwarf Fortress.
- Toute automatisation de la cible (« brasser tant qu'il y a du brassable ») : la cible est une décision du joueur.

## Extensibilité : préparer le multi-objectifs sans l'implémenter

Le multi-objectifs est exclu du périmètre, mais la phase 01 doit être écrite pour qu'il n'exige **aucune refonte**, seulement des ajouts. Contraintes concrètes sur l'implémentation :

- **La donnée d'objectif est une liste dès le premier jour** : `[{ recipe, target }]`, jamais un scalaire ni un singleton `beerTarget`. L'intendance itère sur la liste — avec un seul élément, le comportement est identique.
- **L'ordre de la liste est l'ordre de réconciliation.** Quand deux objectifs se disputeront le même ingrédient libre, l'ordre déclaré fera office de priorité naturelle et déterministe — le futur arbitrage repas vs bières est déjà ce mécanisme, sans concept nouveau.
- **Le comptage des jobs en cours se fait par recette**, jamais globalement : un job de craft porte déjà sa `recipe`, l'intendance filtre dessus. Indispensable dès aujourd'hui pour ne pas compter un lit en fabrication comme une bière, et c'est ce qui rend le multi-objectifs gratuit.
- **Aucune mention de `beer` dans le code** de l'intendance ni de l'UI : tout passe par la recette et son flag `consumable`.
- **L'UI affiche « les objectifs »**, pas « l'objectif bière » : une ligne par élément de la liste, même si la liste n'en a qu'un.

## Context

**Current State:**
Le joueur poste chaque job de brassage à la main via l'UI de désignation (`designation.js` → `jobBoard.post()`), un ordre par bière. `craftSystem` exécute : va chercher l'ingrédient, rejoint la brasserie, produit une bière posée au sol (`consumable: true` dans `recipes.json`). `drinkSystem` fait boire la bière de façon autonome au nain assoiffé. `jobBoard` sait poster, réclamer, relâcher, marquer inaccessible et compléter — mais pas annuler un job non réclamé.

**Key Files:**
- `src/core/jobBoard.js` — ajouter l'annulation d'un job non réclamé (service générique, pas de logique métier).
- `src/systems/stewardSystem.js` — nouveau système de réconciliation (n'écrit jamais `activity` : l'intendance décide *qu'il faut* produire, l'arbitre décide *qui* produit).
- `src/main.js` — enregistrement du système dans l'ordre du tick, création de la donnée d'objectif.
- `src/data/recipes.json` — le flag `consumable` existant délimite les recettes éligibles.
- `src/ui/designation.js` ou nouveau module UI — réglage de la cible, lecture de l'état.
- `src/systems/craftSystem.js` — référence (exécution inchangée).
- `tests/beer.test.js`, `tests/helpers.js` — scénarios macro et harnais.

**Tech Stack:**
JavaScript vanilla (modules ES), ECS strict, tick à pas fixe 5/s, `node --test`. Aucune dépendance.

## Success Criteria
- [ ] Le joueur règle une cible N ; sans autre action, le stock de bières converge vers N dès lors qu'une brasserie et du brassable existent.
- [ ] Jamais de sur-postage : à tout tick, jobs de brassage postés + en cours + stock ≤ cible (modulo la bière en cours de production).
- [ ] Baisser la cible (ou atteindre le stock par un autre chemin) retire les jobs postés non réclamés ; les jobs déjà réclamés vont à leur terme.
- [ ] Sans ingrédient disponible, aucun job n'est posté ; l'objectif redevient actif dès qu'un brassable apparaît (récolte).
- [ ] Les ordres impératifs existants (meubles, portes, ponts) sont inchangés.
- [ ] Chaque comportement ci-dessus a son scénario macro dans `tests/` et la suite complète passe.
