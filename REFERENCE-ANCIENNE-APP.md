# Référence : ancienne application Horaires

> **Repo source :** [Spectroms/horaires-app](https://github.com/Spectroms/horaires-app)  
> **Déploiement :** [horaires-app.vercel.app](https://horaires-app.vercel.app)

Ce document sert uniquement de **référence** pour la nouvelle application. L’ancienne app ne marchait pas correctement et posait trop de problèmes techniques — on repart de zéro en s’inspirant des objectifs ci‑dessous.

---

## Objectifs métier (à garder)

- **Enregistrer les heures de travail** au quotidien (horaires variables, parfois au-delà des horaires « fixes »).
- **Rappel en fin de journée** pour penser à saisir les horaires du jour.
- **Export simple** : un fichier (ou rapport) à envoyer à la patronne.

---

## Ce que faisait l’ancienne app (pour inspiration)

D’après le README et le CHANGELOG du repo :

- Gestion des horaires de travail
- Interface moderne et responsive
- Mode sombre / clair
- Export Excel et PDF
- Authentification Google
- Sauvegarde cloud avec Firebase
- Calcul automatique des durées
- Gestion des jours fériés et congés

**Stack technique :** React, Vite, Firebase (Auth + Firestore), React Router, XLSX, jsPDF, HTML2Canvas.

---

## Ce qu’on simplifie pour la nouvelle app

| À garder / viser | À éviter ou repousser |
|------------------|------------------------|
| Saisie des horaires (début / fin, durée calculée) | Firebase, Auth Google (complexité, problèmes techniques) |
| Rappel en fin de journée | Dépendances lourdes (Firestore, etc.) |
| Export simple pour la patronne (fichier lisible / envoyable) | Trop de features d’un coup (jours fériés, congés en v1) |
| Interface claire, responsive | Build et config trop complexes |

---

## Prochaines étapes

1. Définir la stack de la **nouvelle** app (ex. simple web app, stockage local ou minimal).
2. Implémenter en priorité : **saisie horaires** → **rappel** → **export fichier**.
3. Déployer sur Vercel (ou autre) une fois que la base fonctionne bien.

---

*Document créé à partir du dépôt GitHub pour servir de référence uniquement.*
