// IMPORTS
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');  // Ruta corregida

router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) return res.status(400).send("Faltan campos");
  if (!['cliente', 'vendedor'].includes(role)) {
    return res.status(400).send('Rol inválido');
  }

  // Verificar si el usuario ya existe
  const userDoc = await db.collection("users").doc(email).get();
  if (userDoc.exists) {
    return res.status(400).send("Ese correo ya está en uso");
  }

  const hashedPassword = await bcrypt.hash(password, 10); //hashed password

  await db.collection("users").doc(email).set({
    email,
    password: hashedPassword,
    role
  });

  res.status(201).send("Usuario registrado");
});

// LOGIN
router.post('/login', async (req, res) => { 
  const { email, password } = req.body; 

  const userDoc = await db.collection("users").doc(email).get(); 

  if (!userDoc.exists) return res.status(404).send("Usuario no existe"); 

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

  // Incluye el rol en la respuesta
  res.json({ token, role: user.role }); 
}); 

// Middleware de verificación de token
function verificarToken(req, res, next) {
  try {
    const bearerHeader = req.headers.authorization;

    if (!bearerHeader || !bearerHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = bearerHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Middleware unificado de verificación de roles
function verificarRol(rolesPermitidos) {
  return function(req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado',
        details: 'Se requiere autenticación para acceder a este recurso'
      });
    }

    const userRole = req.user.role.toLowerCase();
    if (!rolesPermitidos.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        details: `Rol requerido: ${rolesPermitidos.join(' o ')}`
      });
    }

    next();
  };
}

// Validadores
const validarDatosRegistro = (email, password, role) => {
  const errores = [];

  if (!email || !email.includes('@')) {
    errores.push('Email inválido');
  }

  if (!password || password.length < 6) {
    errores.push('La contraseña debe tener al menos 6 caracteres');
  }

  if (!['cliente', 'vendedor'].includes(role?.toLowerCase())) {
    errores.push('Rol inválido');
  }

  return errores;
};

// Rutas de autenticación
router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validación de datos
    const errores = validarDatosRegistro(email, password, role);
    if (errores.length > 0) {
      return res.status(400).json({ errores });
    }

    // Verificar si el usuario ya existe
    const userSnapshot = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (!userSnapshot.empty) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Crear nuevo usuario
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      userId,
      email,
      password: hashedPassword,
      role: role.toLowerCase(),
      createdAt: new Date().toISOString()
    };

    await db.collection('users').doc(userId).set(userData);

    // Generar token
    const token = jwt.sign(
      {
        userId,
        email,
        role: role.toLowerCase()
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Respuesta exitosa
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        userId,
        email,
        role: role.toLowerCase()
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario
    const usersRef = await db.collection('users')
      .where('email', '==', email)
      .get();

    if (usersRef.empty) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const userData = usersRef.docs[0].data();

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, userData.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign(
      {
        userId: userData.userId,
        email: userData.email,
        role: userData.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Respuesta exitosa
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        userId: userData.userId,
        email: userData.email,
        role: userData.role
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta protegida de ejemplo
router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userData = userDoc.data();
    delete userData.password; // No enviar la contraseña

    res.json(userData);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;

// Si necesitas los middlewares en otros archivos:
module.exports.verificarToken = verificarToken;
module.exports.verificarRol = verificarRol;