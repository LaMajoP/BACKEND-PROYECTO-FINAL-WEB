const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../firebase');
const router = express.Router();

// REGISTRARSE
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const doc = await db.collection('users').doc(email).get();

  if (doc.exists) return res.status(400).json({ error: 'Usuario ya existe' });

  const hashedPassword = await bcrypt.hash(password, 10);
  await db.collection('users').doc(email).set({
    email,
    password: hashedPassword
  });

  res.status(201).json({ message: 'Usuario registrado' });
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const doc = await db.collection('users').doc(email).get();

  if (!doc.exists) return res.status(404).json({ error: 'Usuario no encontrado' });

  const user = doc.data();
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// RUTA PROTEGIDA
router.get('/perfil', verificarToken, async (req, res) => {
  res.json({ mensaje: `Hola ${req.user.email}, este es tu perfil privado` });
});

// MIDDLEWARE
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'Token requerido' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = router;