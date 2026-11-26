# Brancher les tâches HomeFlow à la tablette

La fonction `tabletTasks` (fichier `tablette.js`) est déjà adaptée à HomeFlow :
- elle lit `families/{famille}/tasks` ;
- elle reprend exactement la logique de `getTasksForDate` (DashboardScreen.tsx) et de `getEffectiveStatus` (taskStatus.ts), vérifiée jour par jour sur plus de deux ans ;
- cocher une tâche répétitive écrit seulement `completions[AAAA-MM-JJ]`, comme le modal « Changer le statut » de l'app. Une tâche ponctuelle change son `status`.

Elle a son propre jeton (`TABLET_TOKEN`). `groceryList` et le jeton de Muse ne sont pas touchés.

## 1. Mettre le fichier dans le projet
1. Copie `tablette.js` dans `HomeFlow\functions\`.
2. Ajoute cette ligne **à la toute fin** de `HomeFlow\functions\index.js` :
   ```js
   Object.assign(exports, require("./tablette"));
   ```
3. Dans `HomeFlow\functions\.env`, ajoute une ligne avec **la même valeur** que `MUSE_FAMILY_ID` :
   ```
   TABLET_FAMILY_ID=la-même-valeur-que-MUSE_FAMILY_ID
   ```

## 2. Créer le jeton et déployer (PowerShell, dans le dossier HomeFlow)
```powershell
cd "$HOME\Desktop\ReactNative Project\HomeFlow"

# Génère un jeton aléatoire : copie le résultat et garde-le pour l'iPad
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")

# Enregistre-le dans Firebase (colle-le quand c'est demandé)
firebase functions:secrets:set TABLET_TOKEN

# Déploie seulement la nouvelle fonction (groceryList n'est pas touchée)
firebase deploy --only functions:tabletTasks
```

## 3. Tester
Remplace `TON_JETON` par ton jeton :
```powershell
curl.exe -H "Authorization: Bearer TON_JETON" "https://us-central1-homeflow-2924f.cloudfunctions.net/tabletTasks/tasks?date=$(Get-Date -Format yyyy-MM-dd)"
```
Tu dois voir les mêmes tâches que sur l'écran d'accueil de l'app aujourd'hui.

## 4. Sur l'iPad (⚙︎)
- **Adresse de l'API des tâches** : `https://us-central1-homeflow-2924f.cloudfunctions.net/tabletTasks`
- **Jeton de la tablette** : le jeton de l'étape 2

## Sécurité
- Le jeton est enregistré seulement dans Safari sur l'iPad : ni dans la page publique, ni sur GitHub.
- Il permet seulement de lire les tâches du jour et de les cocher ou décocher : pas de suppression, pas de listes.
- Si l'iPad est perdu, refais `firebase functions:secrets:set TABLET_TOKEN` avec un nouveau jeton, puis redéploie.
