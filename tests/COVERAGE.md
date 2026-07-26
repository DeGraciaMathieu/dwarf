# Couverture des PRD par les scénarios de test (PRD D15)

Chaque PRD comportemental doit disposer d'au moins un scénario macro dans `tests/`,
exécuté par `npm test`. Cette table est l'invariant à maintenir : implémenter un
nouveau PRD comportemental = ajouter sa ligne ici avec son fichier de scénario.

| PRD | Comportement vérifié | Fichier |
|---|---|---|
| A01 — inspection | job/intention affichés, état « Oisif » | `inspection.test.js` |
| A02 — alertes de crise | `dwarf.isolated-from-water`, `dwarf.cannot-reach-food`, `job.unreachable` (une seule fois) | `alerts.test.js` |
| A03 — blocages d'objectifs | `blocker`/`detail` (atelier, ingrédient), note « en production » (`status.pending`) | `steward.test.js` |
| A04 — HUD (helpers) | compteurs `JobBoard`, getter de prochaine vague | `hud.test.js` |
| A05 — barres canvas | rendu only → validation manuelle (hors périmètre macro) | — |
| B06 — vagues | taille (population + richesse), plafond, tick de première vague | `invasions.test.js` |
| B07 — variété d'ennemis | portée d'archer, aura de chef, composition de vague, PV de brute | `enemies.test.js` |
| B08 — mémoire de cible | poursuite hors de vue puis oubli (TTL) | `memory.test.js` |
| B09 — fuite refuge | repli derrière une porte, fallback `stepAway` | `flee.test.js` |
| C10 — priorité de jobs | `claim` priorité puis distance, outil urgent | `priority.test.js` |
| C11 — aptitudes | vitesse de creuse par aptitude, moral × aptitude | `skills.test.js` |
| C12 — immigration | _à couvrir à l'implémentation_ | — |
| D13 — resetUnreachable ciblé | accès (proche) vs supply (global) | `unreachable.test.js` |
| D14 — garde-fou besoins | marqueur + une alerte, levé à l'ouverture (eau, nourriture) | `needs-access.test.js` |
| E16 — armes/armures | hache tue plus vite, plates encaissent mieux, recettes forge | `equipment.test.js` |
| E17 — source de moral | _à couvrir à l'implémentation_ | — |
| E18 — progression paliers | _à couvrir à l'implémentation_ | — |

Hors PRD mais couvert : outil « Démolir » (`demolish.test.js`).

Style attendu (cf. skill `testing`) : monde minimal via `helpers.js`, avancer N ticks,
asserter l'état observable. Pas d'aléatoire non contrôlé (les nains de test viennent
d'`addDwarf`, sans aptitude tirée au sort). Un scénario doit échouer si l'on régresse
volontairement le comportement ciblé.
