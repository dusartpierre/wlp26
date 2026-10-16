# Whisky Knights · l'appli du club

Deux modules qui partagent la même connexion (prénom + code club), la même base Firestore et le même hébergement :
- **La Cave des Knights** (`cave.html`) : les bouteilles des soirées du club, notées par chaque membre.
- **WLP 26** (`index.html`) : le carnet du Whisky Live Paris 2026 (décrit plus bas).

On passe de l'un à l'autre avec le bouton en haut à droite (« 🥃 Cave » / « WLP 26 › »).

---

# La Cave des Knights

| Onglet | Contenu |
|---|---|
| **Cave** | Galerie des bouteilles (photo, drapeau, note du club), recherche, filtres type / pays / saison, « ✍️ À noter » (celles que je n'ai pas notées), tri par date, note, qualité/prix ou A–Z. En haut, la **bouteille du moment** (soirée de moins de 7 jours) avec un bouton « Noter ». |
| **Fiche** | Note du club /10, barres packaging / nez / goût, qualité/prix et rang, accueil / bouteille / culture, tableau des notes de chaque membre, commentaires, histoire, lien vers la présentation, photos de la soirée. |
| **Noter** | 3 curseurs de 0 à 10 au dixième (boutons − / + pour ajuster), note globale en direct, commentaire. Une seule note par membre et par bouteille, modifiable. |
| **＋** | Ajouter la bouteille de la soirée (marque, nom, type, pays, région, degrés, prix, date, saison, accueil, bouteille, culture, photo). |
| **Classement** | Par note (avec podium), par qualité/prix, par pays, par type ; filtre par saison. |
| **Knights** | Distinctions (meilleur dénicheur, le plus sévère, le plus généreux, le plus raccord avec le club), notes mises et bouteilles apportées par chaque membre, fiche détaillée par membre. |
| **Saisons** | Le calendrier des soirées par saison, avec accueil 🏠, bouteille 🍾 et culture 🎓. |

**Calcul des notes (comme dans Notion)**
- Note globale d'une fiche = 10 % packaging + 30 % nez + 60 % goût. Si un critère manque (anciennes saisons), le calcul se fait sur les critères présents.
- Note du club = la même pondération appliquée aux moyennes de chaque critère.
- Qualité/prix = note du club ÷ prix × 100.

**Soirée à l'aveugle** : pendant 2 jours après la date de la soirée, on ne voit pas les notes des autres tant qu'on n'a pas donné la sienne (🙈).

## Mise en place de la Cave (≈ 10 min)
1. **Règles Firestore** : collez le nouveau `firestore.rules` dans *Firestore Database > Règles*. **Remettez votre code club à la place de `CODE_CLUB`**, puis cliquez sur **Publier**. Deux collections s'ajoutent : `bottles` et `ratings`.
2. **GitHub** : déposez dans le dépôt les nouveaux fichiers `cave.html`, `cave.js`, `cave.css`, ainsi que les fichiers modifiés `index.html`, `app.js`, `store.js`, `style.css`, `sw.js`, `manifest.webmanifest` et `README.md`.
3. **Import de l'historique Notion** (une seule fois, de préférence depuis un ordinateur connecté) : ouvrez `…/cave.html`, connectez-vous, puis allez dans le menu prénom > **📥 Importer l'historique Notion** et choisissez `cave-import.json`. L'import ignore ce qui existe déjà, on peut donc le relancer sans créer de doublons.
   > ⚠️ Ne mettez **pas** `cave-import.json` sur GitHub : le dépôt est public, alors que ce fichier contient les notes et les commentaires du club.

Les prénoms Notion ont été convertis vers ceux de l'appli (Johann → John, Thomas A → Tom, Valerio → Valério). Thomas G apparaît comme « ancien membre ». Pour changer cette correspondance, modifiez `MEMBER_MAP` dans `build_import.py` et regénérez le fichier.

Les photos de bouteilles qui étaient des liens vers des sites marchands sont affichées depuis ces sites. Si un lien ne marche plus, touchez « 📷 Ajouter une photo » sur la fiche.

---

# WLP 26 · Carnet de dégustation du club

Application mobile (PWA) pour le Whisky Live Paris 2026 : les 216 stands du plan, les fiches de dégustation notées sur 100, les photos, le classement du club et un journal de souvenirs, partagés en temps réel entre les membres du club.

- **Hébergement** : GitHub Pages (gratuit)
- **Données** : Firebase Firestore, offre gratuite Spark (pas de carte bancaire)
- **Fonctionne hors ligne** : le réseau est souvent saturé dans le hall. Les notes sont enregistrées sur le téléphone et envoyées dès que le réseau revient (⏳ dans l'en-tête).

## Fonctions

| Onglet | Contenu |
|---|---|
| **Stands** | Recherche (nom, n°, bouteille), filtre par zone, ⭐ « ma liste à visiter » (les autres voient vos étoiles), ✓ stands déjà faits, pastilles des membres qui y ont goûté et note moyenne |
| **Plan** | Le plan officiel, zoomable au doigt (pincer, double-tap, boutons + / − / ⤢) |
| **＋** | Nouvelle fiche : stand, bouteille, âge, degré, prix, fût, note /100, profils aromatiques, ❤️ coup de cœur, 🛒 à acheter, photo, nez / bouche / finale / commentaire |
| **Club** | Fil de toutes les dégustations · Top (consensus ≥ 2 dégustateurs, coups de cœur, meilleures notes) · Stats par membre (le plus sévère, le plus généreux…) |
| **Souvenirs** | Journal photo + texte, liste d'achats personnelle |
| **Menu prénom** | Export CSV (Excel) et sauvegarde JSON, changement de membre |

« **Je le goûte aussi** » : sur la fiche d'un ami, crée votre propre fiche déjà pré-remplie pour comparer vos notes.

---

## Mise en ligne (≈ 20 min, une seule fois)

### 1. Firebase
1. Sur <https://console.firebase.google.com>, cliquez sur **Ajouter un projet** (Google Analytics n'est pas nécessaire).
2. **Build > Authentication > Commencer > Anonyme > Activer**.
3. **Build > Firestore Database > Créer une base**. Choisissez la région `eur3` (Europe) et démarrez **en mode production**.
4. Dans l'onglet **Règles**, collez le contenu de `firestore.rules`. **Remplacez `CODE_CLUB`** par votre code secret (ex. `Uigeadail2026`), puis cliquez sur **Publier**.
5. Allez dans **⚙️ Paramètres du projet > Vos applications > icône Web `</>`**. Donnez un nom à l'app, puis copiez l'objet `firebaseConfig`.

### 2. Configuration
Ouvrez `config.js` :
- collez votre `firebaseConfig` ;
- remplacez les prénoms dans `MEMBERS`.

> La clé `apiKey` Firebase n'est pas un secret : ce sont les règles Firestore qui protègent les données. Le code club est vérifié côté serveur et n'apparaît donc pas dans le code publié sur GitHub.

### 3. GitHub Pages
1. Créez un dépôt (public, ou privé avec un compte Pro) et poussez-y tous les fichiers de ce dossier, à la racine.
2. Allez dans **Settings > Pages > Source : Deploy from a branch > `main` / `(root)`**, puis cliquez sur **Save**.
3. L'app est en ligne à l'adresse `https://<votre-compte>.github.io/<depot>/`.
4. Retournez dans Firebase : **Authentication > Paramètres > Domaines autorisés > Ajouter** `<votre-compte>.github.io`.

### 4. Sur les téléphones
Ouvrez l'URL. Sur iPhone : **Safari > Partager > Sur l'écran d'accueil**. Sur Android : **Chrome > ⋮ > Installer l'application**. Choisissez ensuite votre prénom et saisissez le code club.
**Conseil** : ouvrez l'app une fois la veille, avec du réseau, pour qu'elle soit en cache (plan compris).

---

## Tester sans Firebase
Tant que `apiKey` vaut `A_REMPLIR`, l'app tourne en **mode DÉMO** : n'importe quel code est accepté et les données restent sur le téléphone. Pour tester en local :
```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

## Personnaliser
- **Exposants** : `stands.js`. La liste a été transcrite depuis l'image du plan, qui est en basse résolution, donc quelques numéros sont à vérifier sur le plan papier du salon. Certains numéros sont partagés par plusieurs marques (ex. 126 : Bankhall / Aber Falls / Crabbie ; 130 : Benromach / Gordon & MacPhail). Évitez de renommer un stand déjà noté, car l'identifiant dérive du numéro et du nom.
- **Plan** : remplacez `plan-wlp26.webp` par une version haute définition si vous en trouvez une (même nom de fichier).
- **Mise à jour du code** : après une modification, incrémentez `VERSION` dans `sw.js` pour que les téléphones rechargent la nouvelle version.

## Données & quotas
- Les photos sont compressées sur le téléphone : une miniature d'environ 30 Ko dans la fiche, et la version complète (< 700 Ko) dans `photos/`, chargée seulement à l'ouverture de la fiche.
- Estimation pour 5 personnes × 40 drams avec photos : environ 100 Mo. L'offre gratuite Spark prévoit 1 Go de stockage et 50 000 lectures par jour, donc la marge est large.
- Collections : `members`, `drams`, `moments`, `photos`, `wishlists` (WLP 26), et `bottles`, `ratings` (Cave). L'historique Notion pèse environ 7 Mo. Chaque membre ne peut modifier ou supprimer que ses propres fiches.

## Structure
Tous les fichiers sont à plat, à la racine du dépôt (aucun dossier).
```
index.html  style.css  app.js  store.js  stands.js     ← WLP 26
cave.html   cave.css   cave.js                         ← La Cave
config.js         ← Firebase + prénoms
sw.js  manifest.webmanifest  icon-192.png  icon-512.png  plan-wlp26.webp
firestore.rules   ← à coller dans Firebase (avec votre code club)
```
