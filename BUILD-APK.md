# Build APK Android (OBO – V1)

L’application est wrappée avec **Capacitor** pour produire un APK Android à partir du build web.

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
