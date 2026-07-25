Analyse de la couverture de tests des changements en cours.

1. Lis `CLAUDE.md` et le skill `testing` (`.claude/skills/testing/SKILL.md`).
2. Périmètre : `git diff`, `git diff --cached`, `git status --short`, `git log --oneline -5`. Rien à analyser → « Rien à analyser », stop.
3. Pour chaque mécanique nouvelle ou modifiée dans le périmètre, vérifie (OK / MANQUANT / N/A) la présence des trois scénarios macro dans `tests/` :
   - **nominal** — le comportement attendu se produit (événements, mutations observables) ;
   - **empêché** — ressource absente, cible inaccessible, case occupée : pas de gel ni de boucle ;
   - **interrompu** — gobelin ou faim en cours de route : état nettoyé, reprise possible.
4. Propose la liste des tests manquants : fichier cible (selon le mapping du skill `testing`), nom du test, scénario en deux phrases. **N'écris rien — attends ma validation.**
5. Après validation : écris les tests validés en réutilisant `tests/helpers.js`, puis lance `npm test` et rapporte le résultat.
6. Verdict global : couverture **SUFFISANTE** ou **INCOMPLÈTE** + le récapitulatif.
