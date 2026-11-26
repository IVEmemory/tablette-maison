# Tablette maison

Tableau de bord pour un vieil iPad dans l'entrée ou la cuisine : heure, météo, calendrier familial TimeTree (3 ou 5 jours), tâches du jour HomeFlow à cocher (synchronisées avec l'app), graphique météo sur 24 h, soleil et lune.

> Pour brancher les tâches HomeFlow, voir `firebase/BRANCHER-HOMEFLOW.md`. Sans ce branchement, la section affiche des tâches de démonstration.

Toutes les 30 minutes, GitHub récupère le calendrier TimeTree et publie la page. Tout se fait avec un compte GitHub gratuit, sans serveur à la maison.

## Mise en place (environ 15 minutes, sur un ordinateur)

### 1. Créer le dépôt
1. Crée un compte sur github.com si tu n'en as pas.
2. Clique sur **+** (en haut à droite), puis **New repository**.
3. Nom : `tablette-maison`. Choisis **Public** : c'est nécessaire pour la page gratuite. Ton mot de passe et ton calendrier ne sont pas dans le dépôt.
4. Clique sur **Create repository**.

### 2. Ajouter les fichiers
1. Clique sur **uploading an existing file**.
2. Glisse `index.html`, `README.md` et le dossier `scripts`, puis clique sur **Commit changes**.
3. Le dossier `.github` est caché sur Mac et sur Windows, alors crée-le à la main : **Add file**, puis **Create new file**.
4. Comme nom, tape exactement `.github/workflows/tablette.yml`.
5. Colle le contenu du fichier `tablette.yml`, puis clique sur **Commit changes**.

### 3. Trouver le code de ton calendrier TimeTree
1. Sur l'ordinateur, connecte-toi à timetreeapp.com et ouvre ton calendrier familial.
2. L'adresse ressemble à `timetreeapp.com/calendars/AbCdEf123`. Le code, c'est la partie après `/calendars/`.

> Si tu te connectes à TimeTree avec Apple ou Google, il faut probablement d'abord te créer un mot de passe TimeTree (dans les réglages du compte), parce que l'outil se connecte par courriel et mot de passe.

### 4. Ajouter les secrets
Va dans **Settings**, puis **Secrets and variables**, puis **Actions**, puis **New repository secret**. Crée ces 4 secrets :

| Nom | Valeur |
|---|---|
| `TIMETREE_EMAIL` | ton courriel TimeTree |
| `TIMETREE_PASSWORD` | ton mot de passe TimeTree |
| `TIMETREE_CALENDAR_CODE` | le code trouvé à l'étape 3 |
| `CLE_CALENDRIER` | un mot inventé difficile à deviner, ex. `frigo-k7p2q9x` (lettres, chiffres, tirets) |

La clé sert de nom au fichier du calendrier. Sans elle, personne ne peut trouver ce fichier.

### 5. Activer la page
1. Va dans **Settings**, puis **Pages**.
2. Sous **Source**, choisis **GitHub Actions**.

### 6. Lancer la première mise à jour
1. Va dans l'onglet **Actions**, puis **Tablette maison**.
2. Clique sur **Run workflow**, puis attends environ 1 minute.
3. Une coche verte veut dire que tout est en place. Avec un X rouge, ouvre l'exécution pour voir l'étape qui a échoué. Le plus souvent, c'est un secret mal copié.

Ta page est à l'adresse `https://TON-NOM-GITHUB.github.io/tablette-maison/`

### 7. Sur l'iPad
1. Ouvre l'adresse dans **Safari**.
2. Touche **⚙︎** (en bas à droite), entre la **clé du calendrier** et choisis **3 ou 5 jours**.
3. Touche Partager, puis **Sur l'écran d'accueil**, puis ouvre la page avec l'icône « Maison » : elle s'affiche en plein écran.
4. Dans Réglages, puis Luminosité et affichage, mets le verrouillage automatique sur **Jamais**.
5. Pour bloquer l'iPad sur la page : Réglages, puis Accessibilité, puis **Accès guidé**. Ensuite, appuie 3 fois sur le bouton principal.

## Bon à savoir
- Les nouveaux événements ajoutés dans TimeTree apparaissent dans les 30 à 40 minutes.
- L'outil qui lit TimeTree n'est pas officiel (projet `timetree-exporter`). Si TimeTree change son site, il peut arrêter de fonctionner. La page continue alors d'afficher la dernière version récupérée.
- GitHub met en pause les tâches planifiées après 60 jours sans activité. La tâche fait un petit commit vide tous les 50 jours pour l'éviter.
- Pour changer ton mot de passe TimeTree, mets aussi à jour le secret `TIMETREE_PASSWORD`.
