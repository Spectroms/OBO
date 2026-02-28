# Spécification : format des horaires

Document de référence pour la future app, basé sur le format actuel d’envoi des horaires (responsable, comptable, etc.).

---

## 0. Plateformes cibles

- **Base : application web (HTML)**  
  L’app est d’abord une application web (HTML/JS), utilisable dans le navigateur sur ordinateur et mobile. C’est le cœur commun à toutes les plateformes.

- **Android : version APK**  
  À prévoir une version **APK** pour Android (app installable sur le téléphone). On peut faire un « wrapper » autour du web (ex. WebView ou outil type Capacitor / PWA en APK) pour garder le même code HTML.

- **iOS : rester en web (HTML)**  
  Pas de soumission à l’App Store pour l’instant : la validation et la publication d’une app native sur iOS sont trop lourdes. Sur iPhone/iPad, on utilise la **version web** (même HTML dans le navigateur, ou « ajouter à l’écran d’accueil » pour un accès type app). Comme pour l’ancienne approche : pas d’app native iOS, juste le web.

### Thème clair / sombre

- L’application propose un **mode clair** et un **mode sombre**, comme la plupart des apps actuelles.
- L’utilisateur peut choisir son préférence (paramètres ou commutateur dans l’interface) ; le choix est mémorisé (localStorage ou préférence système).
- **Mode clair** : fond type `#EAECEF`, texte et logo en bleu `#223E7E` (identité OBO horaires).
- **Mode sombre** : fond sombre, textes clairs, accents conservant le bleu ou une variante adaptée pour rester lisible. L’app peut aussi suivre la préférence « thème système » du téléphone ou du navigateur (optionnel).

---

## 1. Données à enregistrer par jour

### Calendrier et choix de la date

- **Vraies dates, vrai calendrier** : l’app s’appuie sur un calendrier réel (dates, jours de la semaine).
- **Saisie du jour J** : quand la personne note ses heures, la date du jour est proposée par défaut (pas besoin de la sélectionner).
- **Rattrapage** : si la saisie n’a pas pu se faire le jour même, elle peut **naviguer dans le calendrier** (mois précédent, etc.) pour ouvrir une date passée (ou à venir) et y saisir ou modifier les horaires.
- Objectif : éviter les erreurs de date et faciliter la saisie rapide, tout en permettant de compléter après coup.

### Jour « normal » (travail avec horaires)
- **Date** : fournie par le calendrier (date du jour par défaut, ou date choisie en naviguant dans le calendrier pour rattraper une saisie).
- **Créneaux horaires** :
  - Un ou plusieurs créneaux (ex. `8h-12h` puis `13h-16h30`)
  - Format 24h, à la demi-heure près (7h, 7h30, 8h, 16h30, etc.)
- **Durée du jour** : calculée automatiquement (ex. 7h30, 8h, 8h30)
- **Activité / contexte** (optionnel) : en plus du travail « habituel », pouvoir indiquer ce qui diffère ce jour-là, par ex. :
  - **Dépôt** (être au dépôt)
  - **Déménagement**
  - **Déplacement** (avec lieu en note si besoin)
  - Ou autre type d’activité selon le besoin (liste à compléter ou à personnaliser dans l’app)
- **Note / lieu** (optionnel) : ex. VILLENEUVE, AVIGNON, MONTPELLIER, BEZIER — pour préciser le lieu quand c’est utile

### Types de jours particuliers (à prendre en compte)

| Type | Signification | À faire dans l’app |
|------|----------------|---------------------|
| **FÉRIÉ** | Jour férié | Toujours référencé comme « jour férié » dans le récap. Si des horaires sont saisis ce jour-là → « jour férié **travaillé** ». Détection : calendrier des jours fériés (France) et/ou marquage manuel. |
| **CP** | Congés payés | Pouvoir marquer le jour comme congés payés (pas d’heures). |
| **Récup** | Journée de récupération | Pouvoir marquer le jour comme « récup » (journée de récup, pas d’heures). À faire apparaître dans l’export pour que le destinataire et la comptable sachent que **ce jour ne doit pas être compté comme un congé payé** (c’est un jour de récup, pas un CP). |
| **Dimanche travaillé** | Travail un dimanche | Détection automatique : date = dimanche + horaires saisis → compté comme « dimanche travaillé » dans le récap du mois. |

---

## 2. Structure par semaine et par mois

- **Bloc « semaine »** : 5 à 7 jours avec un **total hebdo** (ex. Total : 39h30, ou Total : 7h30 + 1 FÉRIÉ).
- **Fin de mois** : **total du mois** en heures (ex. 162h30) + **récap des jours spéciaux** : jours fériés (dont X travaillés), CP, **récup**, dimanches travaillés (ex. + 1 FÉRIÉ dont 0 travaillé, + 2 CONGÉS PAYÉS, + 1 RÉCUP, + 1 DIMANCHE).

L’app n’a pas besoin de produire exactement ce rendu texte, mais doit permettre :
- de saisir les horaires jour par jour ;
- de marquer ou détecter les jours fériés (avec distinction férié / férié travaillé), CP, **récup** (journée de récup, à distinguer des CP pour la comptabilité), et les dimanches travaillés ;
- d’avoir des totaux par semaine et par mois ;
- d’exporter un fichier (ou rapport) contenant tout ça pour envoi au responsable ou à la comptable.

---

## 3. Exemples tirés de tes horaires

- **Une plage** : `8h-16h30` → 8h30  
- **Deux plages (pause déjeuner)** : `8h-12h 13h-16h30` → 7h30  
- **Journée spéciale** : `14/samedi 5h-17h (12h) VILLENEUVE` → samedi, 12h, avec lieu  
- **Activité différente** : ex. jour au dépôt, déménagement, déplacement → à pouvoir indiquer en plus des horaires (pour le suivi et l’export)  
- **Dimanche** : `15/dimanche 6h30-18h (11h30) BEZIER` → à compter comme « dimanche travaillé »  
- **Férié non travaillé** : `1/jeudi FÉRIÉ` → pas d’heures, compté comme « 1 jour férié » dans le récap  
- **Férié travaillé** : si horaires saisis un jour férié → compté comme « 1 jour férié travaillé » (heures dans le total + mention dans le récap)  
- **CP** : `4/mercredi CP` → pas d’heures, compté dans le récap  
- **Récup** : `10/mercredi RÉCUP` → pas d’heures, compté dans le récap ; à part des CP pour le destinataire / comptable  

---

## 4. Résumé pour l’app

À prévoir dans l’application :

1. **Saisie par jour** : **calendrier réel** — date du jour par défaut, possibilité de naviguer (passé / futur) pour saisir ou modifier les horaires d’un autre jour. Par jour : type (normal / férié / CP / **récup**), créneaux (début–fin), **activité/contexte** si différent, note/lieu éventuelle.
2. **Calcul auto** : durée du jour à partir des créneaux ; totaux par semaine et par mois.
3. **Jours spéciaux** :
   - **Jours fériés** : toujours présents dans le récap (calendrier France et/ou marquage manuel). Si horaires saisis ce jour-là → « jour férié travaillé » (heures comptées + mention dans le récap).
   - **CP** : congés payés (sans horaires).
   - **Récup** : journée de récupération (sans horaires) — à afficher clairement dans l’export pour que le destinataire et la comptable sachent que ce n’est **pas** un congé payé.
   - **Dimanche travaillé** : détection automatique (date = dimanche + horaires saisis) → comptage dans le récap du mois.
4. **Rappel en fin de journée** : une notification ou un rappel (ex. en fin d’après-midi / en fin de journée) pour penser à saisir les horaires du jour — objectif initial de l’app.
5. **Export** : un fichier ou rapport lisible (PDF, Excel ou texte) avec, pour envoi (responsable, comptable), les horaires de chaque jour + activité/contexte si renseigné + totaux + récap : jours fériés (dont X travaillés), CP, **récup**, dimanches travaillés. **Choix de la période** : exporter un mois donné ou une plage de dates.
6. **Sauvegarde** : voir section 4b ci‑dessous (local + serveur gratuit).
7. **Thème clair / sombre** : l’utilisateur peut choisir un fond clair ou sombre ; le choix est mémorisé (voir section 0).

---

## 4b. Sauvegarde sur serveur (gratuit) — pour ne pas perdre les données si le téléphone est perdu ou cassé

**Objectif** : en plus du stockage local, envoyer les données sur un serveur. Ainsi, en changeant de téléphone ou en réinstallant l’app, on peut récupérer ses horaires.

**Choix retenu : Supabase**

- Base de données PostgreSQL (tables, requêtes SQL), API simple, forfait gratuit généreux (500 Mo).
- Idéal pour la saisie des horaires, le tableau de bord vue équipe (tableau de bord) et l’auth sans compte Google (email + mot de passe).

**Fonctionnement prévu**

- **Local** : l’app enregistre aussi en local (navigateur / appareil) pour réactivité et usage hors ligne.
- **Serveur** : à chaque modification (ou à l’ouverture), envoi des données vers **Supabase**. En cas de perte ou casse du téléphone, connexion sur un nouvel appareil → récupération des données depuis le serveur.
- **Identification** : identifiant simple (ex. email + mot de passe, ou code utilisateur). Pas besoin de compte Google.

**Hébergement : tout en cloud, rien en local**

- App (site web) hébergée sur **Vercel** (gratuit), données sur **Supabase** (gratuit). Aucun serveur à installer ou à faire tourner en local.

---

## 5. Suggestions (optionnel, v1 ou plus tard)

| Idée | Utilité |
|------|--------|
| **RTT** | Si tu utilises des jours RTT, on peut ajouter un type de jour « RTT » (comme récup), à prévoir si besoin. |
| **Format des heures à l’export** | Certaines comptabilités préfèrent les heures en décimal (ex. 7,5 h au lieu de 7h30). On peut prévoir une option à l’export. |
| **Jours fériés France** | Intégrer la liste officielle (dates fixes + Pâques etc.) pour pré-remplir les fériés ; tu pourras toujours corriger ou ajouter manuellement. |
| **Nom sur l’export** | Si l’export est : ajouter le nom de l'employé (ou un champ « Employé ») en en-tête du rapport pour l'envoi au responsable ou à la comptable. |
| **Vue équipe / Tableau de bord** | Une vue dédiée (page ou mode « admin ») pour consulter les horaires de l’équipe : liste des personnes, horaires par jour / semaine / mois, totaux, export global ou par personne. Plus besoin de collecter un fichier par personne. Faisable avec Supabase (droits d’accès : chaque employé ne voit que ses données ; utilisateurs avec accès « vue équipe » voient tout. Aucune mention « patronne » ni « chef de dépôt » dans l'app — libellés neutres uniquement. À prévoir si plusieurs personnes utilisent l’app. |
