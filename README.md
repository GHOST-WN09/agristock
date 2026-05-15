# AgriStock - Gestion Agricole Intelligente

## Installation et démarrage

### 1. Installer les dépendances
```bash
npm install
```

### 2. Démarrer le serveur
```bash
npm start
# ou pour le mode développement avec rechargement automatique:
npm run dev
```

Le serveur démarre sur **http://localhost:3000**

### 3. Ouvrir l'application
Ouvrez `index.html` dans votre navigateur (ou servez-le via un serveur HTTP local):
```bash
# Option simple : ouvrir directement
open index.html

# Ou avec un serveur Python (recommandé)
python3 -m http.server 8000
# Puis accédez à http://localhost:8000/index.html
```

## Identifiants de démonstration

Utilisateurs disponibles dans la base de données :

| Identifiant | Mot de passe | Nom | Rôle |
|---|---|---|---|
| `demo` | `agri2024` | Demo Agriculteur | Gestionnaire |
| `boubacar` | `boubs2026` | Boubacar Sow | Gestionnaire |
| `aminata` | `aminata136` | Aminata Diallo | Utilisateur |
| `oumou` | `oumoudiallo100#` | Oumou Diallo | Administrateur |

## ⚠️ Problème courant : "Identifiants incorrects"

**Cause** : Le serveur Node.js n'est pas lancé.

**Solution** : 
1. Assurez-vous d'avoir lancé `npm start` ou `npm run dev`
2. Vérifiez que le serveur est accessible à `http://localhost:3000`
3. Consultez les logs du serveur pour les erreurs

## Architecture

- **Frontend** : HTML5 + CSS3 + JavaScript vanilla (index.html)
- **Backend** : Node.js + Express (server.js)
- **Database** : SQLite (agristock.db - créée automatiquement)
- **Auth** : JWT + bcryptjs

## Fonctionnalités

- ✅ Gestion des stocks
- ✅ Suivi des ventes
- ✅ Enregistrement des dépenses
- ✅ Base de clients
- ✅ Statistiques et graphiques
- ✅ Gestion multi-utilisateurs (admin)
- ✅ Export de données (JSON, CSV, PDF)
