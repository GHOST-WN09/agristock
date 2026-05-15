# Guide de déploiement AgriStock

## Avant le déploiement

### 1. Configuration de sécurité

```bash
# Générer une clé secrète forte
openssl rand -base64 32
```

### 2. Créer le fichier `.env`

Copier `.env.example` vers `.env` et remplir :
```bash
cp .env.example .env
```

Éditer `.env` avec :
- `SECRET_KEY` : résultat de la commande `openssl` ci-dessus
- `CORS_ORIGIN` : URL du frontend (ex: `https://votredomaine.com`)
- `NODE_ENV` : `production`

### 3. Installer les dépendances avec npm

```bash
npm install
# Pas d'installation de devDependencies en prod
npm install --production
```

## Déploiement sur Heroku

```bash
# Créer l'app
heroku create agristock

# Ajouter les variables d'environnement
heroku config:set SECRET_KEY="votre_clé"
heroku config:set NODE_ENV="production"
heroku config:set CORS_ORIGIN="https://agristock.herokuapp.com"

# Déployer
git push heroku main
```

## Déploiement sur Netlify (Frontend) + Backend séparé

### Frontend (Netlify)
```bash
# Créer un repo git
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/agristock.git
git push -u origin main

# Connecter à Netlify et déployer automatiquement
# Backend API: https://votre-backend.herokuapp.com
```

### Backend (Heroku/Railway/Render)
Utiliser le guide Heroku ci-dessus

## Déploiement sur un serveur VPS

```bash
# 1. SSH sur votre serveur
ssh user@your-server.com

# 2. Cloner le repo
git clone https://github.com/username/agristock.git
cd agristock

# 3. Installer Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Installer PM2 pour la gestion des processus
sudo npm install -g pm2

# 5. Installer les dépendances
npm install --production

# 6. Créer .env
nano .env
# Ajouter les variables nécessaires

# 7. Démarrer avec PM2
pm2 start server.js --name "agristock"
pm2 save
pm2 startup

# 8. Configurer un reverse proxy (Nginx)
sudo nano /etc/nginx/sites-available/agristock
```

### Configuration Nginx exemple
```nginx
server {
    listen 80;
    server_name agristock.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Checklist pré-déploiement

- [ ] `.env` créé avec clé secrète forte
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN` défini correctement
- [ ] Base de données SQLite prête (ou Migration vers PostgreSQL)
- [ ] Tests de l'API effectués
- [ ] HTTPS configuré
- [ ] Logs activés
- [ ] Backup automatique de la base de données
- [ ] Monitoring en place

## Points d'amélioration pour la production

1. **Remplacer SQLite par PostgreSQL** pour meilleure scalabilité
2. **Ajouter un système de backup** pour la base de données
3. **Configurer HTTPS/SSL**
4. **Implémenter un système de logs** (Winston, Morgan)
5. **Ajouter des rate limiters** pour éviter les abus
6. **Mettre en place une authentification 2FA**
7. **Audit trail** pour les actions critiques
8. **Monitoring et alertes** (Sentry, DataDog, etc.)
