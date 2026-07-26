# PRD — Dwarf

Index des documents d'exigences produit, issus de l'analyse du jeu. Un PRD par point actionnable. Chaque document est autonome et respecte l'architecture ECS (nouveau système ou data, jamais de refonte du socle).

Convention de nommage : `<Lot><NN>-slug.md`.

## Lot A — Lisibilité (rapide, fort impact)

| # | PRD | Impact / Effort |
|---|-----|-----------------|
| 1 | [A01 — Afficher le job et l'intention du nain](A01-inspection-job-intention.md) | Fort / Faible |
| 2 | [A02 — Alertes de crise (eau, nourriture, job inaccessible)](A02-alertes-crise.md) | Fort / Faible |
| 3 | [A03 — Détail des blocages d'objectifs](A03-blocages-objectifs.md) | Moyen / Faible |
| 4 | [A04 — HUD minimal (horloge, population, vague, jobs)](A04-hud-minimal.md) | Fort / Faible |
| 5 | [A05 — Barre de moral/santé sur le canvas](A05-barres-canvas.md) | Moyen / Faible |

## Lot B — Tension de combat

| # | PRD | Impact / Effort |
|---|-----|-----------------|
| 6 | [B06 — Rééquilibrage des vagues](B06-reequilibrage-vagues.md) | Fort / Moyen |
| 7 | [B07 — Variété d'ennemis](B07-variete-ennemis.md) | Fort / Moyen |
| 8 | [B08 — Mémoire de la cible (IA gobeline)](B08-memoire-cible.md) | Moyen / Faible |
| 9 | [B09 — Fuite avec destination sûre](B09-fuite-destination.md) | Moyen / Moyen |

## Lot C — Contrôle joueur

| # | PRD | Impact / Effort |
|---|-----|-----------------|
| 10 | [C10 — Priorité de jobs](C10-priorite-jobs.md) | Fort / Moyen |
| 11 | [C11 — Spécialisation et aptitudes](C11-specialisation-aptitudes.md) | Fort / Moyen |
| 12 | [C12 — Contrôle de l'immigration](C12-controle-immigration.md) | Moyen / Faible |

## Lot D — Robustesse

| # | PRD | Impact / Effort |
|---|-----|-----------------|
| 13 | [D13 — resetUnreachable ciblé](D13-reset-unreachable-cible.md) | Moyen / Moyen |
| 14 | [D14 — Garde-fou pathfinding besoins](D14-garde-fou-besoins.md) | Fort / Faible |
| 15 | [D15 — Scénarios de test des lots](D15-scenarios-test.md) | Moyen / Moyen |

## Lot E — Richesse de contenu

| # | PRD | Impact / Effort |
|---|-----|-----------------|
| 16 | [E16 — Armes et armures supplémentaires](E16-armes-armures.md) | Moyen / Faible |
| 17 | [E17 — Deuxième source de moral](E17-source-moral.md) | Moyen / Moyen |
| 18 | [E18 — Progression par paliers](E18-progression-paliers.md) | Fort / Moyen |

## Lot F — Vie sociale & santé

| # | PRD | Impact / Effort |
|---|-----|-----------------|
| 19 | [F19 — Relations sociales entre nains](F19-relations-sociales.md) | Fort / Moyen |
| 20 | [F20 — Blessures et soins](F20-blessures-soins.md) | Fort / Moyen |

## Lot G — Chaîne économique

| # | PRD | Impact / Effort |
|---|-----|-----------------|
| 21 | [G21 — Cuisine et variété alimentaire](G21-cuisine-alimentation.md) | Moyen / Moyen |
| 22 | [G22 — Élevage et chasse](G22-elevage-chasse.md) | Fort / Moyen |
| 23 | [G23 — Caravanes et troc](G23-caravanes-troc.md) | Fort / Élevé |

## Lot H — Environnement & profondeur

| # | PRD | Impact / Effort |
|---|-----|-----------------|
| 24 | [H24 — Qualité des pièces et confort](H24-qualite-pieces-confort.md) | Moyen / Moyen |
| 25 | [H25 — Saisons et température](H25-saisons-temperature.md) | Moyen / Élevé |
| 26 | [H26 — Pensées et humeurs stratifiées](H26-pensees-humeurs.md) | Moyen / Moyen |
| 27 | [H27 — Chef-d'œuvre et inspiration](H27-chef-doeuvre-inspiration.md) | Faible / Faible |

## Lot I — Rejouabilité

Issus d'une analyse « profondeur & rejouabilité » : donner un but, de la variété entre parties, de l'imprévu.

| # | PRD | Impact / Effort |
|---|-----|-----------------|
| 28 | [I28 — Objectifs, fin de partie et légende](I28-objectifs-fin-de-partie.md) | Fort / Moyen |
| 29 | [I29 — Choix d'embarquement (profils, difficulté, graine)](I29-embarquement.md) | Fort / Moyen |
| 30 | [I30 — Événements aléatoires](I30-evenements-aleatoires.md) | Fort / Moyen |
| 31 | [I31 — Variété de biomes et de ressources](I31-biomes-ressources.md) | Moyen / Moyen |
| — | Contrôle de l'immigration → voir [C12](C12-controle-immigration.md) | Moyen / Faible |

## Lot J — Profondeur

Des décisions qui s'entrelacent au-delà de la survie.

| # | PRD | Impact / Effort |
|---|-----|-----------------|
| 32 | [J32 — Couche militaire (soldats, entraînement, pièges)](J32-militaire.md) | Fort / Élevé |
| 33 | [J33 — Progression des aptitudes par l'expérience](J33-progression-aptitudes.md) | Moyen / Moyen |
| 34 | [J34 — Santé approfondie (maladies et séquelles)](J34-sante-approfondie.md) | Moyen / Moyen |
| 35 | [J35 — Gouvernance : chef et mandats](J35-gouvernance.md) | Moyen / Moyen |
| 36 | [J36 — Niveaux verticaux et cavernes (z-levels)](J36-z-levels.md) | Très fort / Très élevé |
| — | Élevage & chasse → voir [G22](G22-elevage-chasse.md) · Caravanes & troc → voir [G23](G23-caravanes-troc.md) · Chef-d'œuvre → voir [H27](H27-chef-doeuvre-inspiration.md) | — |

## Ordre recommandé

1. **Lot A** en premier — rend le jeu jouable et débogable.
2. **Lot B** — transforme l'expérience (tension).
3. **Lots C → E** — approfondissement une fois la boucle nerveuse en place.
4. **Lot F** — attachement du joueur (relations, blessures se renforcent mutuellement).
5. **Lot G** — chaîne économique cohérente (cuisine → élevage → caravanes).
6. **Lot H** — profondeur d'ambiance ; H26 (pensées) et H27 (chef-d'œuvre) sont les meilleurs ratios plaisir/effort.
7. **Lot I** — rejouabilité : I28 (objectifs & légende) et I30 (événements) d'abord, ils se branchent sans risque sur l'existant.
8. **Lot J** — profondeur au long cours ; J33 (XP) est le gain rapide, J36 (z-levels) le grand pari architectural, à garder pour la fin.
