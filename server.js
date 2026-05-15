const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'agristock_secret_key_2026_default_unsafe';
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Connexion DB
let db;
try {
  db = new Database('./agristock.db');
  console.log('Connected to SQLite database.');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// Configuration CORS
const corsOptions = NODE_ENV === 'production' ? {
  origin: CORS_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 200
} : {};

app.use(cors(NODE_ENV === 'production' ? corsOptions : {}));
app.use(bodyParser.json());

// Log de configuration
if (NODE_ENV === 'development') {
  console.log('⚠️ Mode développement actif');
} else {
  console.log('✅ Mode production');
}

// Création tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    initials TEXT,
    role TEXT DEFAULT 'staff'
  );

  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    nom TEXT,
    quantite REAL,
    unite TEXT,
    prix REAL,
    date_ajout TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ventes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    client_id INTEGER,
    produit TEXT,
    quantite REAL,
    prix_unitaire REAL,
    total REAL,
    date_vente TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS depenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    description TEXT,
    montant REAL,
    date_depense TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    nom TEXT,
    contact TEXT,
    adresse TEXT,
    date_ajout TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Utilisateurs par défaut
const defaultUsers = [
  { username: 'demo', password: bcrypt.hashSync('agri2024', 10), name: 'Demo Agriculteur', initials: 'DA', role: 'manager' },
  { username: 'boubacar', password: bcrypt.hashSync('boubs2026', 10), name: 'Boubacar Sow', initials: 'BS', role: 'manager' },
  { username: 'aminata', password: bcrypt.hashSync('aminata136', 10), name: 'Aminata Diallo', initials: 'AD', role: 'staff' },
  { username: 'oumou', password: bcrypt.hashSync('oumoudiallo100#', 10), name: 'Oumou Diallo', initials: 'OD', role: 'admin' }
];

const insertUser = db.prepare(`INSERT OR IGNORE INTO users (username, password, name, initials, role) VALUES (?, ?, ?, ?, ?)`);
defaultUsers.forEach(user => {
  insertUser.run(user.username, user.password, user.name, user.initials, user.role);
});

// Middleware auth
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalide' });
    req.user = user;
    next();
  });
}

// Routes Auth
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`[LOGIN] Tentative connexion : ${username}`);
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      console.log(`[LOGIN] Utilisateur non trouvé: ${username}`);
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    console.log(`[LOGIN] Password check for ${username}: ${isPasswordValid}`);
    if (!isPasswordValid) return res.status(401).json({ error: 'Identifiants invalides' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY);
    console.log(`[LOGIN] ✓ Connexion réussie: ${username}`);
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, initials: user.initials, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes Users (admin only)
app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
  try {
    const rows = db.prepare('SELECT id, username, name, initials, role FROM users').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
  const { username, password, name, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  try {
    const result = db.prepare('INSERT INTO users (username, password, name, initials, role) VALUES (?, ?, ?, ?, ?)').run(username, hashedPassword, name, initials, role);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
  try {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ deleted: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes Stocks
app.get('/api/stocks', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM stocks WHERE user_id = ?').all(req.user.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stocks', authenticateToken, (req, res) => {
  const { nom, quantite, unite, prix } = req.body;
  try {
    const result = db.prepare('INSERT INTO stocks (user_id, nom, quantite, unite, prix, date_ajout) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, nom, quantite, unite, prix, new Date().toISOString());
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/stocks/:id', authenticateToken, (req, res) => {
  const { nom, quantite, unite, prix } = req.body;
  try {
    const result = db.prepare('UPDATE stocks SET nom = ?, quantite = ?, unite = ?, prix = ? WHERE id = ? AND user_id = ?').run(nom, quantite, unite, prix, req.params.id, req.user.id);
    res.json({ updated: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stocks/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM stocks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ deleted: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes Ventes
app.get('/api/ventes', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM ventes WHERE user_id = ?').all(req.user.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ventes', authenticateToken, (req, res) => {
  const { client_id, produit, quantite, prix_unitaire, total } = req.body;
  try {
    const result = db.prepare('INSERT INTO ventes (user_id, client_id, produit, quantite, prix_unitaire, total, date_vente) VALUES (?, ?, ?, ?, ?, ?, ?)').run(req.user.id, client_id, produit, quantite, prix_unitaire, total, new Date().toISOString());
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ventes/:id', authenticateToken, (req, res) => {
  const { produit, quantite, prix_unitaire, total } = req.body;
  try {
    const result = db.prepare('UPDATE ventes SET produit = ?, quantite = ?, prix_unitaire = ?, total = ? WHERE id = ? AND user_id = ?').run(produit, quantite, prix_unitaire, total, req.params.id, req.user.id);
    res.json({ updated: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ventes/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM ventes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ deleted: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes Dépenses
app.get('/api/depenses', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM depenses WHERE user_id = ?').all(req.user.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/depenses', authenticateToken, (req, res) => {
  const { description, montant } = req.body;
  try {
    const result = db.prepare('INSERT INTO depenses (user_id, description, montant, date_depense) VALUES (?, ?, ?, ?)').run(req.user.id, description, montant, new Date().toISOString());
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/depenses/:id', authenticateToken, (req, res) => {
  const { description, montant } = req.body;
  try {
    const result = db.prepare('UPDATE depenses SET description = ?, montant = ? WHERE id = ? AND user_id = ?').run(description, montant, req.params.id, req.user.id);
    res.json({ updated: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/depenses/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM depenses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ deleted: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes Clients
app.get('/api/clients', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM clients WHERE user_id = ?').all(req.user.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', authenticateToken, (req, res) => {
  const { nom, contact, adresse } = req.body;
  try {
    const result = db.prepare('INSERT INTO clients (user_id, nom, contact, adresse, date_ajout) VALUES (?, ?, ?, ?, ?)').run(req.user.id, nom, contact, adresse, new Date().toISOString());
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id', authenticateToken, (req, res) => {
  const { nom, contact, adresse } = req.body;
  try {
    const result = db.prepare('UPDATE clients SET nom = ?, contact = ?, adresse = ? WHERE id = ? AND user_id = ?').run(nom, contact, adresse, req.params.id, req.user.id);
    res.json({ updated: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clients/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM clients WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ deleted: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servir l'app HTML statique
app.use(express.static('.'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
  console.log(`AgriStock server running on port ${PORT}`);
});