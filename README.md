# BrazzaEats

Marketplace multi-restaurant pour Brazzaville (Congo).
Stack : **React 18 + Vite + Tailwind CSS + Supabase**

---

## Partie A — Lancer en version web

### Prérequis
- Node.js ≥ 18
- Un projet Supabase (gratuit sur [supabase.com](https://supabase.com))

### Étapes

**1. Cloner le dépôt**
```bash
git clone https://github.com/votre-compte/brazzaeats.git
cd brazzaeats
```

**2. Installer les dépendances**
```bash
npm install
```

**3. Configurer les variables d'environnement**
```bash
cp .env.example .env
```
Ouvrir `.env` et renseigner :
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Ces valeurs se trouvent dans **Supabase → Settings → API**.

**4. Initialiser la base de données**

Dans le dashboard Supabase, aller dans **SQL Editor** et exécuter le fichier `schema.sql` à la racine du projet.

Ce fichier crée :
- 9 tables (profiles, restaurants, menu_categories, menu_items, orders, order_items, reviews, deliveries, platform_settings)
- Les 6 enums PostgreSQL
- 28 politiques RLS
- Les triggers `updated_at`
- Les index de performance

**5. Lancer le serveur de développement**
```bash
npm run dev
```
L'application est accessible sur [http://localhost:3000](http://localhost:3000)

### Commandes utiles
```bash
npm run dev      # Développement avec HMR
npm run build    # Build de production (dossier dist/)
npm run preview  # Prévisualiser le build de production
```

---

## Partie B — Compiler en APK Android avec Capacitor

Capacitor permet d'empaqueter l'application web dans une application Android native (APK).

### Prérequis supplémentaires
- [Android Studio](https://developer.android.com/studio) installé
- JDK 17+
- SDK Android (API 33+)

### Étapes

**1. Construire l'application**
```bash
npm run build
```

**2. Initialiser Capacitor**
```bash
npx cap init BrazzaEats com.brazzaeats.app --web-dir dist
```

**3. Ajouter la plateforme Android**
```bash
npx cap add android
```

**4. Copier les fichiers web dans le projet Android**
```bash
npx cap copy android
```

**5. Ouvrir Android Studio**
```bash
npx cap open android
```

**6. Générer l'APK signé**

Dans Android Studio :
1. Menu **Build → Generate Signed Bundle / APK**
2. Choisir **APK**
3. Créer ou utiliser un keystore existant
4. Sélectionner le variant **release**
5. Cliquer **Finish**

L'APK est généré dans `android/app/release/app-release.apk`

### Distribution de l'APK

L'APK peut être distribué :
- **Par WhatsApp** : envoyer le fichier `.apk` directement dans un groupe
- **Lien de téléchargement** : héberger sur Google Drive, Dropbox ou un serveur et partager le lien
- **Firebase App Distribution** : pour des tests en équipe
- **Google Play Store** : pour une distribution officielle (compte développeur requis)

> Sur Android, activer **Paramètres → Sécurité → Sources inconnues** pour installer un APK hors Play Store.

---

## Structure du projet

```
brazzaeats/
├── public/
│   ├── manifest.json       # Manifest PWA
│   ├── sw.js               # Service Worker (géré par VitePWA)
│   └── icons/              # Icônes PWA (192x192, 512x512…)
├── src/
│   ├── components/
│   │   ├── layout/         # Navbar, BottomNav, Sidebar, RestaurantLayout
│   │   ├── shared/         # RestaurantCard, MenuItemCard, OrderCard
│   │   └── ui/             # Button, Badge, Modal, Spinner, Skeleton, InstallBanner
│   ├── hooks/              # useAuth, useCart, useMyRestaurant, useRealtime
│   ├── pages/
│   │   ├── auth/           # Login, Register
│   │   ├── client/         # Home, Restaurant, Cart, Checkout, Tracking, Orders
│   │   ├── restaurant/     # Dashboard, Orders, Menu, Profile, Reviews
│   │   ├── livreur/        # Dashboard, Available, History
│   │   └── admin/          # Dashboard, Restaurants, Users, Settings
│   ├── services/           # restaurantService, orderService, menuService, livreurService, adminService
│   ├── supabase/           # client.js
│   └── utils/              # constants, formatCurrency, notificationSound, whatsappMessage
├── schema.sql              # Schéma complet Supabase
├── .env.example            # Variables d'environnement à copier
└── vite.config.js          # Config Vite + PWA
```

---

## Rôles utilisateurs

| Rôle | Accès | Assignation |
|------|-------|-------------|
| `client` | Interface de commande | Auto à l'inscription |
| `restaurant` | Dashboard vendeur | Par l'admin |
| `livreur` | App de livraison | Par l'admin |
| `admin` | Back-office complet | Manuellement en base |

Pour créer un compte admin manuellement :
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'uuid-de-l-utilisateur';
```
