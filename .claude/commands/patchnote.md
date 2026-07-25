Met à jour `PATCHNOTES.md` avec les changements survenus depuis sa dernière mise à jour.

## Périmètre

1. Lis `PATCHNOTES.md` (format, ton et dernière entrée).
2. Détermine le point de couverture : `git log -1 --format="%H %ad" --date=short -- PATCHNOTES.md` (dernier commit ayant touché le patchnote).
3. Rassemble ce qui s'est passé depuis : `git log <sha>..HEAD --oneline`, `git diff <sha>..HEAD --stat -- src/ index.html`, plus les changements non commités (`git status --short`, `git diff HEAD --stat`).
4. S'il n'y a aucun changement visible joueur (rien, ou seulement tests/, .claude/, scripts/, doc, refactors internes), réponds « Rien à noter » et arrête-toi.

## Rédaction

5. Rédige une entrée par chantier identifiable (plusieurs chantiers depuis la dernière mise à jour → plusieurs entrées, la plus récente en premier). Format des entrées existantes :
   - `## <date du jour> — <titre court>` ;
   - 2 à 5 puces **orientées joueur** : nouvelles features d'abord (avec les mots du jeu : noms d'outils, messages du journal), équilibrage et corrections ensuite ;
   - une note `Technique :` seulement si le changement est structurant pour la suite.
6. Insère les entrées **en tête** de `PATCHNOTES.md` (sous le titre et l'intro, avant la première entrée existante).
7. Montre les entrées ajoutées et rappelle qu'il reste à commiter (`/git-committer`).

Ne commite rien toi-même. N'invente aucun changement : tout doit venir du log ou du diff.
