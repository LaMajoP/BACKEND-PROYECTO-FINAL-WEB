//REGISTER
    const express = require('express');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const { db } = require('../firebase');
    const router = express.Router();

    router.post('/register', async (req, res) => {
    const { email, password, role } = req.body;
  
    if (!['cliente', 'trabajador'].includes(role)) {
      return res.status(400).send('Rol inválido');
    }
  
    //HASHING WITH BCRYPT
    const hashedPassword = await bcrypt.hash(password, 10);
  
    await setDoc(doc(db, "users", email), {
      email,
      password: hashedPassword,
      role
    });
  
    res.status(201).send("Usuario registrado");
  });
  
//LOGIN
    router.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    const docSnap = await getDoc(doc(db, "users", email)); //obtiene el documento del usuario desde la base de datos
    if (!docSnap.exists()) return res.status(404).send("Usuario no existe");
  
    const user = docSnap.data(); //obtiene los datos del usuario
  
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).send("Contraseña incorrecta");
  
    const token = jwt.sign( //creamos un JWT
      {
        email: user.email,
        role: user.role
      },
      'mi_clave_secreta',
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

  import jwtDecode from "jwt-decode";

const token = localStorage.getItem('token');
const decoded = jwtDecode(token); // { email: ..., role: 'cliente' }

if (decoded.role === 'cliente') {
  window.location.href = '/cliente/dashboard';
} else if (decoded.role === 'trabajador') {
  window.location.href = '/trabajador/dashboard';
}