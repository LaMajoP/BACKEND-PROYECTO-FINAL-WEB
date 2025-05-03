//REGISTER
    const express = require('express');
    const router = express.Router();
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const { db } = require('../firebase');

    router.post('/register', async (req, res) => {
        const { email, password, role } = req.body;
      
        if (!email || !password) return res.status(400).send("Faltan campos");
        if (!['cliente', 'trabajador'].includes(role)) {
          return res.status(400).send('Rol inválido');
        }
      
        const hashedPassword = await bcrypt.hash(password, 10);
      
        await db.collection("users").doc(email).set({
          email,
          password: hashedPassword,
          role
        });
      
        res.status(201).send("Usuario registrado");
      });      
  
//LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    const userDoc = await db.collection("users").doc(email).get();
  
    if (!userDoc.exists) {
      return res.status(404).send("Usuario no existe");
    }
  
    const user = userDoc.data();
  
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).send("Contraseña incorrecta");
  
    const token = jwt.sign(
      {
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'mi_clave_secreta',
      { expiresIn: '1h' }
    );
  
    res.json({ token });
  });

  
  
//TOKEN CON JWT
function verificarJWT(req, res, next) { //middleware to verificate tokens JWT
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.sendStatus(403);
  
    try {
      const decoded = jwt.verify(token, 'mi_clave_secreta');
      req.user = decoded;
      next();
    } catch (err) {
      res.sendStatus(401);
    }
  }
  
  // Middleware para rutas solo de trabajadores
  function soloTrabajador(req, res, next) {
    if (req.user.role !== 'trabajador') {
      return res.status(403).send('Acceso denegado');
    }
    next();
  }

    // Ruta protegida
router.get('/perfil', verificarJWT, (req, res) => {
    res.json({
      mensaje: 'Acceso concedido',
      usuario: req.user
    });
  });

//CLOSE SESSION
function logout() {
    localStorage.removeItem('token'); // Elimina el token del almacenamiento local
    window.location.href = '/login'; // Redirige al usuario a la página de inicio de sesión
  }

  module.exports = router;