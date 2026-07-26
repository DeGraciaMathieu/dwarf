# PRD G23 — Caravanes et troc

**Lot :** G — Chaîne économique · **Point :** 23 · **Statut :** 🔲 À faire · **Impact / Effort :** Fort / Élevé

## Problème

La colonie n'a **aucun débouché pour son surplus** : une fois les objectifs de production atteints (bière, équipement, plats de G21, viande/cuir de G22), `stewardSystem` cesse simplement de poster des jobs et le stock excédentaire dort. Symétriquement, certaines ressources sont **inaccessibles localement** (minerai rare, animaux, objets qu'on ne sait pas produire). Il n'existe aucun *sink* économique ni moyen d'acquérir ce qui manque. Les seuls arrivants extérieurs sont hostiles (`goblinSpawnSystem`) ou des migrants (`migrantSystem`) ; personne ne vient commercer.

## Objectif

Introduire un **marchand périodique** (caravane) qui arrive à un point de rendez-vous, **achète le surplus** de production et **vend ce qui manque**. C'est le premier vrai *sink* économique : le surplus acquiert un but. La caravane réutilise le modèle temporel d'apparition des vagues/migrants et le portage existant (`haulSystem`) pour amener les marchandises au marchand.

## Périmètre

**Inclus**
- Un marchand qui apparaît périodiquement à un bord de carte, gagne un point de rendez-vous (zone dépôt), reste un temps limité, puis repart.
- Une **valeur** attachée aux objets (data, `items.json`) permettant d'évaluer ventes et achats.
- Une **zone de dépôt commercial** (`Zone`, comme fermes/tombes) désignée par le joueur, où le surplus est amené.
- Une activité/portage des marchandises vendues vers le dépôt/marchand (via `jobBoard.post()`/`haulSystem`).
- L'échange : le surplus déposé est troqué contre des biens demandés (minerai rare, animaux, objets), qui apparaissent au dépôt.

**Exclus**
- Économie de marché dynamique (prix fluctuants selon l'offre/la demande sur plusieurs visites).
- Diplomatie, réputation, factions marchandes multiples.
- Interface de négociation fine (choix objet par objet) au-delà d'une sélection de surplus/besoins simple.
- Monnaie persistante entre visites, si l'option troc direct est retenue (voir décision).

## Exigences fonctionnelles

1. Une caravane apparaît périodiquement, sur le modèle temporel de `goblinSpawnSystem`/`migrantSystem` (compteur de ticks + apparition à un `randomEdgeTile`), avec une fenêtre de présence limitée avant départ.
2. Le joueur désigne une **zone de dépôt commercial** (`Zone`) servant de point de rendez-vous ; sans dépôt, le commerce est impossible (état lisible, pas de crash).
3. Chaque objet échangeable porte une **valeur** en donnée (`items.json`), utilisée pour équilibrer un échange.
4. Le surplus destiné à la vente est **transporté** vers le dépôt via des jobs de portage (`haulSystem`), sans que l'UI touche aux composants de simulation.
5. À l'échange, la valeur du surplus livré est convertie en biens rendus par le marchand (apparition au dépôt), selon la règle de valorisation retenue.
6. Le départ de la caravane (fin de fenêtre) est propre : marchandises non échangées restent au dépôt, état auto-réparable, aucun job orphelin.

## Conception technique

- **Marchand = créature/entité data + système d'apparition.** Sur le modèle de `goblinSpawnSystem` (compteur, `invasion`-like state auto-réparable, `randomEdgeTile`, `spawnFromDefinition`), créer un système d'apparition de caravane avec son propre état de compteur/fenêtre. Définition possible du marchand dans `creatures.json` (neutre, sans `hostile`). Logique métier hors de `core/`.
- **Point de rendez-vous = `Zone`.** Réutiliser l'infrastructure `Zone` (comme les fermes, tombes, `fishingSpots`) pour la zone de dépôt commercial, désignée par le joueur via les outils de placement UI autorisés. Le marchand se rend au dépôt (pathfinding existant).
- **Valeur des objets = donnée.** Ajouter une valeur dans `items.json` (ex. composant/champ `value`), lue par le système de commerce. Aucune valeur en dur dans le code : ajouter un objet échangeable ne doit demander que de la data.
- **Portage du surplus.** Réutiliser `haulSystem` : poster des jobs `haul` amenant les items « à vendre » vers la zone de dépôt, comme le stockage existant. Le choix du surplus (au-delà des cibles d'objectifs) peut s'appuyer sur la logique de stock déjà présente dans `stewardSystem` (stock vs cible), sans dupliquer le comptage.
- **Échange.** Au tick de commerce (marchand présent + surplus au dépôt), évaluer la valeur totale livrée et matérialiser les biens rendus par `spawnFromDefinition` au dépôt. Émettre des événements *faits accomplis* (`domaine.verbe-au-passé`, ex. `trade.completed`) déclarés dans `events.js`, consommés par le journal/HUD ; jamais d'événement impératif.
- **Croisement G21/G22.** Le surplus vendable inclut naturellement les plats/bière (G21) et la viande/cuir (G22) ; les biens achetés peuvent inclure le minerai rare (`ore`) qui alimente la forge, ou des animaux (gibier/bétail de G22). Ce PRD est le débouché des chaînes G21/G22.
- **État auto-réparable.** L'état de la caravane (compteur, fenêtre de présence, réservations de portage vers le dépôt) est possédé par le système de commerce et purgé/reconstruit au tick, comme les réservations de jobs et l'état d'invasion existants. Le départ ne doit laisser aucun job `haul` orphelin (reposté/annulé au tick suivant).
- Respect ECS : composants de valeur/commerce en données pures, toute la logique dans le système ; l'UI n'exprime que des intentions (`Zone`, `jobBoard.post`).

## Décision à trancher avant implémentation

- **Monnaie vs troc direct.** (a) *Troc direct* : la valeur du surplus livré est immédiatement convertie en biens rendus lors de la visite, rien ne persiste entre visites (plus simple, pas de composant monnaie). (b) *Monnaie persistante* : les ventes créditent une réserve conservée entre caravanes, dépensable plus tard (plus riche, nécessite un état colonie persistant). Recommandation : commencer par le troc direct.
- **Comment fixer la valeur.** Valeur fixe par item en data (simple, prévisible) vs valeur dérivée d'un coût (ingrédients + temps de craft, plus cohérente mais plus lourde à maintenir). Recommandation : valeur fixe en data pour la première livraison.
- **Ce que le marchand demande/offre.** Liste fixe par visite vs liste variant selon les besoins de la colonie (ce qui manque) et le surplus disponible. Recommandation : commencer par une offre/demande simple et data-pilotée.
- **Portée du dépôt.** Zone dépôt obligatoire (pas de commerce sans elle) vs point de rendez-vous automatique. Recommandation : zone désignée par le joueur, cohérente avec le reste des zones.

## Critères d'acceptation

- Une caravane apparaît à intervalle régulier, rejoint la zone de dépôt, reste une fenêtre limitée, puis repart.
- Sans zone de dépôt, le commerce est impossible mais l'état reste stable (aucune erreur, information lisible).
- Le surplus destiné à la vente est transporté au dépôt par des jobs `haul` classiques.
- Un échange convertit la valeur du surplus livré en biens rendus, apparaissant au dépôt selon la règle retenue.
- Au départ de la caravane, aucun job de portage n'est laissé orphelin et les marchandises non échangées demeurent au dépôt.

## Tests

- Scénario `tests/` : caravane + zone de dépôt + surplus au dépôt → après échange, le surplus a diminué et des biens achetés (de valeur cohérente) sont apparus au dépôt.
- Scénario `tests/` : surplus produit mais aucune zone de dépôt désignée → aucun crash, aucun échange, état stable.
- Scénario `tests/` : caravane présente puis fenêtre écoulée → la caravane repart, aucun job `haul` orphelin ne subsiste, les invendus restent au dépôt.
- Scénario `tests/` : apparition périodique → sur une longue simulation, les caravanes se succèdent à l'intervalle attendu, sur le modèle des vagues/migrants.
