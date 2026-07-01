# Analyse Financière — appli perso (PWA)

Outil personnel d'aide à la décision boursière : « investir ou attendre » et
détection de potentiel de croissance. Tes données restent **en local sur ton
appareil** (aucun serveur, aucun compte).

C'est une **PWA** : tu peux l'installer sur ton téléphone et ton ordinateur, et
elle fonctionne **hors-ligne**.

## Lancer en local

```bash
npm install
npm run dev      # développement (http://localhost:5173)
```

## Build + utilisation comme appli

```bash
npm run build    # génère dist/ (app + service worker + manifest)
npm run preview  # sert le build en local pour tester l'install
```

### Installer sur ton appareil

Une fois l'app ouverte dans le navigateur :

- **Android / Chrome / Edge (bureau)** : un bandeau « Installer » apparaît en
  bas, ou via le menu ⋮ → « Installer l'application ».
- **iPhone / iPad (Safari)** : bouton **Partager** ⬆️ → **« Sur l'écran
  d'accueil »**.

Pour l'utiliser depuis ton téléphone, héberge le dossier `dist/` sur n'importe
quel hébergement statique gratuit (Netlify, Vercel, GitHub Pages, Cloudflare
Pages…) — l'installation PWA nécessite HTTPS.

## Régénérer les icônes

```bash
node scripts/gen-icons.mjs
```

---

Ceci n'est pas un conseil financier — outil indicatif à usage personnel.
