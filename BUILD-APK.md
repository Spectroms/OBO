# Build APK Android (OBO – V1)

L’application est wrappée avec **Capacitor** pour produire un APK Android à partir du build web.

---

## Guide pas à pas (si les commandes te parlent peu)

### C’est quoi « npm » et la ligne de commande ?

- **npm** = outil qui vient avec Node.js. Il permet d’installer des librairies et de lancer des scripts du projet (comme « construire le site » ou « synchroniser avec Android »).
- **Ligne de commande** = la fenêtre où tu tapes du texte (sans interface avec des boutons). Sous Windows c’est **PowerShell**, **CMD** ou le terminal intégré de Cursor/VS Code (onglet **Terminal** en bas).

### Où taper les commandes ?

1. Ouvre **Cursor** (ou VS Code) sur ton projet OBO.
2. En bas de la fenêtre, clique sur l’onglet **Terminal** (ou menu **Terminal → Nouveau terminal**).
3. Vérifie que tu es dans le bon dossier : le chemin doit se terminer par `OBO` ou `obo`. Si ce n’est pas le cas, tape :
   ```bash
   cd C:\Users\FlowUP\Desktop\OBO
   ```
   puis Entrée.

Tu peux aussi ouvrir **PowerShell** (menu Démarrer → taper « PowerShell »), puis taper :
```bash
cd C:\Users\FlowUP\Desktop\OBO
```
(adapter le chemin si ton projet n’est pas sur le Bureau).

### Étapes pour générer l’APK (dans l’ordre)

**Étape 1 – Mettre à jour le code web dans le projet Android**

Dans le terminal (dans le dossier OBO), tape :

```bash
npm run build:android
```

Appuie sur **Entrée**. Cela fait deux choses :
- construit le site (HTML/JS/CSS) à partir de ton code React ;
- copie le résultat dans le dossier `android` pour que l’app Android affiche cette version.

Attends que la commande se termine (pas d’erreur en rouge). Si tu vois des avertissements en jaune, ce n’est en général pas bloquant.

**Étape 2 – Ouvrir le projet dans Android Studio**

- Soit tu tapes dans le même terminal :
  ```bash
  npm run open:android
  ```
  (Android Studio s’ouvre sur le projet si tout est bien installé.)
- Soit tu ouvres **Android Studio** à la main, puis **Fichier → Ouvrir** et tu choisis le dossier **`android`** qui est **dans** ton projet OBO (donc `C:\Users\FlowUP\Desktop\OBO\android`).

**Étape 3 – Construire l’APK dans Android Studio**

1. Attends que Android Studio ait fini d’indexer le projet (barre de progression en bas).
2. Dans le menu : **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. Quand c’est terminé, une petite notification apparaît en bas à droite. Clique sur **Locate** pour ouvrir le dossier où se trouve l’APK.
4. L’APK s’appelle en général **`app-debug.apk`**. Tu peux le copier sur ton téléphone et l’installer (autoriser « Sources inconnues » si Android le demande).

### En résumé

| Où ? | Quoi faire ? |
|------|----------------|
| Terminal (dossier OBO) | `npm run build:android` → met à jour le code web dans Android |
| Android Studio (projet `android`) | **Build → Build APK(s)** → génère le fichier `.apk` |

Chaque fois que tu modifies le code de l’app (React, paramètres, etc.), refais au moins **Étape 1** puis **Étape 3** pour que l’APK contienne tes derniers changements.

---

## Prérequis

- **Node.js** 18+ et **npm**
- **Android Studio** (pour le SDK Android et le build)
  - [Télécharger Android Studio](https://developer.android.com/studio)
  - À la première ouverture : installer le SDK (Android 13 / API 33 recommandé) et accepter les licences

## Commandes utiles

```bash
# Installer les dépendances (déjà fait si vous avez lancé npm install)
npm install

# Build web + copie dans le projet Android
npm run build:android

# Ouvrir le projet Android dans Android Studio
npm run open:android
```

## Générer l’APK

### Option 1 : Avec Android Studio (recommandé)

1. Lancer un build à jour du web et le sync Android :
   ```bash
   npm run build:android
   ```
2. Ouvrir le projet Android :
   ```bash
   npm run open:android
   ```
   (ou dans Android Studio : **File → Open** → dossier `android` du projet)
3. Attendre la fin de l’indexation / sync Gradle.
4. Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. Une fois le build terminé, cliquer sur **Locate** dans la notification pour ouvrir le dossier contenant l’APK (souvent `android/app/build/outputs/apk/debug/`).
6. L’APK **debug** s’appelle en général `app-debug.apk`. Vous pouvez le copier sur un appareil et l’installer (autoriser « Sources inconnues » si demandé).

Pour une **version release** (signée, pour diffusion) : **Build → Generate Signed Bundle / APK** et suivre l’assistant (création d’un keystore si besoin).

### Option 2 : En ligne de commande (APK debug)

Depuis la racine du projet :

```bash
npm run build:android
cd android
./gradlew assembleDebug
```

Sous Windows (PowerShell ou CMD) :

```bash
npm run build:android
cd android
.\gradlew.bat assembleDebug
```

L’APK se trouve dans :  
`android/app/build/outputs/apk/debug/app-debug.apk`.

## Après modification du code web

À chaque fois que vous modifiez le code (React, CSS, etc.) :

1. Rebuilder le web et resynchroniser Android :
   ```bash
   npm run build:android
   ```
2. Puis soit rouvrir Android Studio et refaire **Build → Build APK(s)**, soit relancer `./gradlew assembleDebug` (ou `gradlew.bat assembleDebug`) dans `android/`.

## Identité de l’app

- **Nom affiché** : OBO  
- **Icône** : le logo de l’app (`public/logo.png`) est utilisé comme icône de l’APK (copié dans `android/app/src/main/res/drawable/ic_launcher_logo.png`).  
- **ID d’application** (package) : `app.obo.horaires`  

Si vous changez le logo dans `public/logo.png`, recopiez-le dans `android/app/src/main/res/drawable/ic_launcher_logo.png` avant de refaire le build APK. Pour changer le nom ou l’ID, modifier `capacitor.config.json` puis exécuter `npm run build:android` et refaire un build dans Android Studio / Gradle.
