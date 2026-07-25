# Dwarf

https://github.com/user-attachments/assets/351cf1ab-29ed-4331-ad60-41c1feef10e6

Une simulation de colonie inspirée de **Dwarf Fortress**, en JavaScript vanilla, rendue en ASCII sur un canvas.

Des nains autonomes creusent la montagne, abattent des arbres, cultivent des champignons, pêchent, fabriquent des meubles, mangent, boivent, dorment — et fuient ou affrontent les gobelins qui attaquent en vagues de plus en plus dures. Vous ne contrôlez personne directement : vous désignez des chantiers et des zones, et la colonie s'organise. Les nains ont un moral, se battent, meurent de faim, de soif ou au combat — et le journal raconte leurs histoires.

## Lancer le jeu

Aucune dépendance, aucun build. Il faut juste un serveur local (modules ES) :

```bash
python3 scripts/serve.py
```

Puis ouvrir http://localhost:8000.

## Jouer

- **⛏ Creuser / Couper** : cliquez-glissez sur les murs (`#`) et les arbres (`♣`).
- **▦ Stockage**, **♠ Champ** : peignez des zones au sol ; **🎣 Pêche** : sur l'eau.
- **🧱 Construire**, **⚒ Atelier**, **🛏 Lit**, **🚪 Porte**, **🌉 Pont** : bâtissez votre forteresse — les portes arrêtent les gobelins, pas les ponts.
- Cliquez sur un nain pour l'inspecter, ⏸/▶/▶▶ pour le rythme, 💾/📂 pour sauvegarder.

Les nouveautés sont consignées dans [PATCHNOTES.md](PATCHNOTES.md).

## Tests

```bash
npm test
```
