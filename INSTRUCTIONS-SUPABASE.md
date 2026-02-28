# Ce que tu dois faire dans Supabase (une seule fois)

> **Tu te sens perdu ?** Ouvre le fichier **`TOUT-CE-QUE-TU-DOIS-FAIRE.md`** à la racine du projet : c’est une seule liste (avec cases à cocher) de tout ce qu’il faut faire, dans l’ordre. Tu peux t’y référer pour voir ce que tu as fait ou sauté.

Pour que l’app fonctionne (connexion, enregistrement du nom, horaires), il faut faire **3 choses** dans le tableau de bord Supabase. Tout se fait en copier-coller dans le **SQL Editor**.

---

## Étape 1 : Ouvrir le SQL Editor

1. Va sur **https://supabase.com** et connecte-toi.
2. Ouvre **ton projet** (celui dont l’adresse est dans ton fichier `.env`).
3. Dans le menu **à gauche**, clique sur **SQL Editor**.

Tu as maintenant une page avec une grosse zone de texte pour écrire du SQL.

---

## Étape 2 : Créer les tables (première fois uniquement)

1. Ouvre le fichier **`supabase/migrations/001_initial.sql`** (dans ton projet OBO, dossier `supabase` puis `migrations`).
2. **Sélectionne tout** le contenu (Ctrl+A) et **copie** (Ctrl+C).
3. Dans Supabase, **colle** ce contenu dans la zone de texte du SQL Editor.
4. Clique sur le bouton **Run** (ou **Exécuter**).
5. En bas, vérifie qu’il n’y a **pas de message d’erreur en rouge**. Si c’est vert ou « Success », c’est bon.

→ Les tables (profiles, entries) et les règles de sécurité sont créées.

---

## Étape 3 : Autoriser l’enregistrement du nom

Sans cette étape, le nom et prénom ne s’enregistrent pas (ou tu as une erreur « infinite recursion »).

1. Toujours dans **SQL Editor**, efface ce qu’il y a dans la zone de texte (ou clique sur **New query**).
2. **Copie tout** le bloc SQL ci-dessous.
3. **Colle-le** dans la zone de texte.
4. Clique sur **Run**.
5. Vérifie qu’il n’y a pas d’erreur en rouge.

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

→ Désormais, le nom et prénom peuvent être enregistrés à l’inscription et dans Paramètres.

---

## Étape 4 : Activer la connexion par email

1. Dans le menu **à gauche** de Supabase, clique sur **Authentication** (icône cadenas).
2. Clique sur **Providers** (ou **Sign in / Providers**).
3. Repère **Email** et active-le (bouton ou case à cocher).
4. Enregistre si besoin.

→ Tu peux t’inscrire et te connecter avec email + mot de passe.

---

## Récap : tu as fait tout ça ?

- [ ] Étape 1 : Tu as ouvert le SQL Editor dans ton projet Supabase.
- [ ] Étape 2 : Tu as exécuté le contenu de `001_initial.sql` (Run, pas d’erreur).
- [ ] Étape 3 : Tu as exécuté le bloc SQL « update_my_display_name » ci-dessus (Run, pas d’erreur).
- [ ] Étape 4 : Tu as activé le provider Email dans Authentication.

Si les 4 sont faits, l’app peut : créer un compte, enregistrer le nom, sauvegarder les horaires.

---

## (Optionnel) Supprimer son compte pour se réinscrire

Dans l’app : **Paramètres** → **Compte** → **Supprimer mon compte** → confirmer en tapant « supprimer ».

- Tes **données** (profil, horaires) sont supprimées et tu es déconnecté.
- Ton **compte** (email / mot de passe) reste dans Supabase, donc tu peux encore te reconnecter.
- Pour **supprimer complètement** le compte et te réinscrire avec le même email : après la déconnexion, un **lien** s’affiche sur la page de connexion (« Ouvrir le tableau de bord Supabase → Auth / Users »). Ouvre ce lien, va dans la liste des utilisateurs, trouve ton email et supprime l’utilisateur (Delete user).

---

## Pour que « Supprimer mon compte » fonctionne pour tous les utilisateurs (sans passer par Supabase)

L’app contient une **route API** (`api/delete-account.js`) qui supprime le compte côté serveur. Si ton app est hébergée sur **Vercel**, il suffit d’ajouter **une variable d’environnement** une seule fois : après ça, **tout utilisateur** pourra supprimer son compte en un clic, sans aller dans le tableau de bord Supabase.

### Ce que tu fais une seule fois (toi, propriétaire du projet)

1. Va sur **https://supabase.com** → ton projet → **Settings** (Paramètres) → **API**.
2. Repère la clé **`service_role`** (secret, ne jamais la mettre dans le code ou l’app publique). Clique sur **Reveal** puis **copie** la valeur.
3. Va sur **https://vercel.com** → ton projet OBO → **Settings** → **Environment Variables**.
4. Ajoute une variable :
   - **Name** : `SUPABASE_SERVICE_ROLE_KEY`
   - **Value** : colle la clé `service_role` copiée à l’étape 2.
   - Coche **Production** (et **Preview** si tu veux que ça marche aussi en préview). Ne coche pas « Expose to Browser » (elle doit rester côté serveur).
5. **Redéploie** le projet (par ex. un nouveau déploiement depuis Git, ou **Redeploy** sur la dernière version).

C’est tout. Ensuite, **tout utilisateur** qui utilise l’app en production pourra cliquer sur « Supprimer mon compte », confirmer, et son compte sera bien supprimé ; il pourra se réinscrire avec le même email sans passer par Supabase.

### (Optionnel) Si tu n’es pas sur Vercel

Si tu héberges ailleurs, il faudrait exposer une route (ou une Edge Function Supabase) qui appelle l’API Admin Supabase avec la clé `service_role` pour supprimer l’utilisateur. Sur Vercel, c’est déjà en place via `api/delete-account.js`.

---

## (Optionnel) Si tu n’as pas déployé la fonction

Exécute une fois dans le SQL Editor le contenu du fichier **`supabase/migrations/005_delete_my_profile_rpc.sql`** (copier, coller, Run). Ainsi, quand tu cliques sur « Supprimer mon compte », au moins tes **données** (profil + horaires) sont supprimées et tu es déconnecté ; pour supprimer le compte et réutiliser le même email, il faudra encore passer par le lien affiché sur la page de connexion (tableau de bord Supabase → Auth / Users).
