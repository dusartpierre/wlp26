# WLP 26 · Carnet de dégustation du club

Application mobile (PWA) pour le Whisky Live Paris 2026 : les 216 stands du plan, les fiches de dégustation notées sur 100, les photos, le classement du club et un journal de souvenirs, partagés en temps réel entre les 5 membres.

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
Ouvrez `js/config.js` :
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
- **Exposants** : `js/stands.js`. La liste a été transcrite depuis l'image du plan, qui est en basse résolution, donc quelques numéros sont à vérifier sur le plan papier du salon. Certains numéros sont partagés par plusieurs marques (ex. 126 : Bankhall / Aber Falls / Crabbie ; 130 : Benromach / Gordon & MacPhail). Évitez de renommer un stand déjà noté, car l'identifiant dérive du numéro et du nom.
- **Plan** : remplacez `img/plan-wlp26.webp` par une version haute définition si vous en trouvez une (même nom de fichier).
- **Mise à jour du code** : après une modification, incrémentez `VERSION` dans `sw.js` pour que les téléphones rechargent la nouvelle version.

## Données & quotas
- Les photos sont compressées sur le téléphone : une miniature d'environ 30 Ko dans la fiche, et la version complète (< 700 Ko) dans `photos/`, chargée seulement à l'ouverture de la fiche.
- Estimation pour 5 personnes × 40 drams avec photos : environ 100 Mo. L'offre gratuite Spark prévoit 1 Go de stockage et 50 000 lectures par jour, donc la marge est large.
- Collections : `members`, `drams`, `moments`, `photos`, `wishlists`. Chaque membre ne peut modifier ou supprimer que ses propres fiches.

## Structure
```
index.html            coquille de l'app
css/style.css
js/config.js          ← à remplir (Firebase + prénoms)
js/stands.js          exposants par zone
js/store.js           Firestore / mode démo (cache hors ligne)
js/app.js             interface
sw.js                 cache hors ligne (PWA)
firestore.rules       ← à coller dans Firebase (avec votre code club)
img/                  plan + icônes
```
