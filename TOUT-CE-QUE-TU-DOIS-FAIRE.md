# Tout ce que tu dois faire – une seule liste

Tu as peut-être l’impression d’avoir sauté des étapes ou de ne plus savoir où tu en es. Ce fichier est **la liste complète**, dans l’ordre. Tu peux cocher au fur et à mesure.

**Pour savoir si une étape est déjà faite :** sous chaque étape, une section **« Comment vérifier ? »** te dit exactement quoi regarder (fichier, écran Supabase, etc.). Tu vérifies → si c’est bon, tu coches ; sinon, tu fais l’étape.

---

## En deux mots

- **Supabase** = le service qui garde tes comptes (email / mot de passe) et les données (nom, horaires). Tu fais tout ça sur le site **supabase.com**.
- **Vercel** = un service pour mettre ton app **en ligne** (pour que d’autres y accèdent par une adresse web). Tu peux le faire plus tard, ou ne jamais le faire si tu utilises l’app seulement sur ton PC en local.

---

# PARTIE 1 : Indispensable (sans ça l’app ne marche pas bien)

À faire **une seule fois**. Tout se passe sur **supabase.com** et dans ton projet sur ton PC.

---

## 1. Le fichier `.env` sur ton PC

Sur ton ordinateur, dans le dossier du projet OBO, tu dois avoir un fichier nommé **`.env`** avec deux lignes (avec *tes* vraies valeurs, fournies par Supabase) :

- `VITE_SUPABASE_URL=https://xxxxx.supabase.co`
- `VITE_SUPABASE_ANON_KEY=une longue clé`

**Où trouver ces valeurs ?** Supabase → ton projet → **Settings** (ou Paramètres) → **API** : tu y vois l’URL du projet et une clé nommée **anon public**. Tu les copies dans `.env`.

**Comment vérifier ?** Dans le dossier OBO, regarde s’il existe un fichier nommé **`.env`** (sans rien avant le point). Ouvre-le : tu dois voir au moins deux lignes qui commencent par `VITE_SUPABASE_URL=` et `VITE_SUPABASE_ANON_KEY=`, avec des valeurs non vides (une URL en https et une longue clé). Si le fichier n’existe pas ou qu’il manque une ligne → l’étape n’est pas faite.

- [ ] J’ai un fichier `.env` avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`

---

## 2. Créer les tables dans Supabase

1. Va sur **https://supabase.com** → connecte-toi → ouvre **ton projet**.
2. À gauche, clique sur **SQL Editor**.
3. Ouvre le fichier **`supabase/migrations/001_initial.sql`** (dans ton projet OBO).
4. Copie **tout** le fichier (Ctrl+A, Ctrl+C).
5. Colle dans la zone de texte du SQL Editor sur Supabase.
6. Clique sur **Run** (ou Exécuter).
7. En bas, il ne doit pas y avoir d’erreur en rouge (vert ou “Success” = c’est bon).

**Comment vérifier ?** Dans Supabase, menu de **gauche** → **Table Editor**. Tu dois voir deux tables : **`profiles`** et **`entries`**. Si tu les vois (même vides), l’étape est faite. Si tu ne vois pas ces tables → il faut exécuter `001_initial.sql`.

- [ ] J’ai exécuté `001_initial.sql` dans le SQL Editor (Run, pas d’erreur)

---

## 3. Autoriser l’enregistrement du nom

Sans ça, le nom et prénom ne s’enregistrent pas (ou tu as une erreur “infinite recursion”).

1. Toujours dans **SQL Editor** sur Supabase, efface la zone de texte (ou “New query”).
2. Copie **tout** le bloc SQL ci-dessous.
3. Colle dans la zone de texte.
4. Clique sur **Run**.
5. Pas d’erreur en rouge.

```sql
create or replace function public.update_my_display_name(new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
begin
  select email into user_email from auth.users where id = auth.uid() limit 1;
  insert into public.profiles (id, email, display_name, role)
  values (auth.uid(), coalesce(user_email, ''), new_name, 'employee')
  on conflict (id) do update set display_name = new_name;
end;
$$;

grant execute on function public.update_my_display_name(text) to authenticated;
grant execute on function public.update_my_display_name(text) to anon;
```

**Comment vérifier ?** Dans Supabase, menu de **gauche** → **Database** → **Functions** (ou « Fonctions »). Tu dois voir une fonction nommée **`update_my_display_name`**. Si elle est là, l’étape est faite. Sinon → exécute le bloc SQL ci-dessus.

- [ ] J’ai exécuté ce bloc SQL dans le SQL Editor (Run, pas d’erreur)

---

## 3b. Afficher le nom (Paramètres + export PDF)

Sans cette étape, le nom peut ne pas s’afficher dans Paramètres ni dans le PDF.

1. Dans **SQL Editor**, clique sur **New query**.
2. Ouvre le fichier **`supabase/migrations/006_get_my_display_name.sql`** dans ton projet OBO.
3. Copie tout le contenu, colle dans le SQL Editor, clique sur **Run**.
4. Pas d’erreur en rouge.

**Comment vérifier ?** Dans Supabase → **Database** → **Functions**, tu dois voir une fonction **`get_my_display_name`**.

- [ ] J’ai exécuté `006_get_my_display_name.sql` dans le SQL Editor (Run, pas d’erreur)

---

## 4. Activer la connexion par email

1. Dans Supabase, menu de **gauche** → **Authentication**.
2. Clique sur **Providers** (ou “Sign in / Providers”).
3. Trouve **Email** et **active-le** (bouton ou case à cocher).
4. Enregistre si besoin.

**Comment vérifier ?** Dans Supabase → **Authentication** → **Providers**. Regarde la ligne **Email** : elle doit être **activée** (bouton vert ou case cochée). Si Email est désactivé → active-le.

- [ ] J’ai activé le provider Email dans Authentication

---

## 5. Lancer l’app sur ton PC

Dans le dossier du projet OBO, ouvre un terminal (PowerShell ou l’invite de commandes) et tape :

```bash
npm install
npm run dev
```

Une page s’ouvre (souvent http://localhost:5173). Tu peux t’inscrire avec un email et un mot de passe, renseigner ton nom, et utiliser l’app.

**Comment vérifier ?** Dans le dossier OBO, ouvre un terminal et tape `npm run dev`. Si une page s’ouvre dans le navigateur (avec « OBO horaires », formulaire de connexion), l’étape est faite. Si tu as une erreur « Supabase n’est pas configuré » → revois l’étape 1 (fichier `.env`). Si tu as une autre erreur, vérifie d’abord que tu as bien fait `npm install` une fois.

- [ ] J’ai fait `npm install` et `npm run dev` et l’app s’ouvre dans le navigateur

---

# Récap PARTIE 1

Si tu as coché **toutes** les cases de la partie 1, ton app peut :

- s’inscrire / se connecter avec email et mot de passe ;
- enregistrer ton nom et prénom ;
- enregistrer tes horaires.

Tu n’as **rien sauté** d’indispensable tant que ces 5 points sont faits.

---

# PARTIE 2 : Optionnel (tu peux le faire plus tard ou jamais)

---

## Supprimer son compte (pour se réinscrire)

- Dans l’app : **Paramètres** → **Compte** → **Supprimer mon compte** → tu confirmes en tapant « supprimer ».
- Tes **données** (profil, horaires) sont supprimées. Ton **compte** (email / mot de passe) reste dans Supabase, donc tu peux encore te reconnecter.
- Pour **supprimer complètement** le compte et réutiliser le même email : après la déconnexion, un **lien** s’affiche sur la page de connexion ; en cliquant dessus tu arrives dans Supabase, liste des utilisateurs, et tu peux supprimer ton utilisateur (Delete user).

Si tu veux que “Supprimer mon compte” supprime tout en un clic sans aller sur Supabase, il faudra plus tard mettre l’app en ligne sur **Vercel** et ajouter une variable (voir INSTRUCTIONS-SUPABASE.md). Ce n’est pas obligatoire.

**Comment vérifier (optionnel) ?** Si tu as exécuté `005_delete_my_profile_rpc.sql`, dans Supabase → **Database** → **Functions** tu dois voir une fonction **`delete_my_profile`**. Sinon, exécute le contenu de `supabase/migrations/005_delete_my_profile_rpc.sql` dans le SQL Editor.

- [ ] (Optionnel) J’ai exécuté `005_delete_my_profile_rpc.sql` dans le SQL Editor pour que “Supprimer mon compte” supprime au moins les données

---

## Mettre l’app en ligne (Vercel)

**Vercel** = un site qui héberge ton app pour que tu (ou d’autres) puissiez y accéder par une adresse web (ex. `mon-app.vercel.app`). Ce n’est **pas obligatoire** pour utiliser l’app sur ton PC en local.

Si un jour tu veux la mettre en ligne :

1. Tu crées un compte sur **https://vercel.com**.
2. Tu connectes ton projet (par exemple en poussant le code sur GitHub puis en reliant ce dépôt à Vercel).
3. Tu ajoutes dans Vercel les mêmes variables que dans ton `.env` : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
4. Vercel déploie l’app ; tu reçois une URL.

Tu peux ignorer Vercel pour l’instant si tu utilises seulement l’app en local.

- [ ] (Optionnel) J’ai mis l’app en ligne sur Vercel

---

# Où j’en suis ?

Repasse sur la **PARTIE 1** et coche ce que tu as **déjà fait**. Ce qui n’est pas coché, ce sont les étapes qu’il te reste à faire. Tu n’as pas besoin de faire la PARTIE 2 pour que l’app marche au quotidien.
