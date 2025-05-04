// IMPORTS
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { db } = require('../firebase');

// REGISTER
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) return res.status(400).send("Faltan campos");
  if (!['cliente', 'trabajador'].includes(role)) {
    return res.status(400).send('Rol inválido');
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

  res.json({ token });
});

// JWT VERIFICATION MIDDLEWARE
function verificarJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(403);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_clave_secreta');
    req.user = decoded;
    next();
  } catch (err) {
    res.sendStatus(401);
  }
}

// MIDDLEWARE TO CHECK IF USER IS WORKER
function soloTrabajador(req, res, next) {
  if (req.user.role !== 'trabajador') {
    return res.status(403).send('Acceso denegado');
  }
  next();
}

// PROFILE
router.get('/perfil', verificarJWT, (req, res) => {
  res.json({
    mensaje: 'Acceso concedido',
    usuario: req.user
  });
});

// GET INVENTARIO BY WORKER
router.get('/inventario', verificarJWT, soloTrabajador, (req, res) => {
  try {
    const inventario = JSON.parse(fs.readFileSync('./restaurants.json', 'utf8'));
    res.json(inventario);
  } catch (err) {
    res.status(500).send('Error al leer el inventario');
  }
});

// PUT UPDATE PRICE
router.put('/inventario', verificarJWT, soloTrabajador, (req, res) => {
  const { nombreRestaurante, nombreCategoria, nombreProducto, nuevoPrecio } = req.body;
  try {
    const inventario = JSON.parse(fs.readFileSync('./restaurants.json', 'utf8'));
    const restaurante = inventario.find(r => r.nombre === nombreRestaurante);
    const categoria = restaurante?.categorias.find(c => c.nombre === nombreCategoria);
    const producto = categoria?.productos.find(p => p.nombre === nombreProducto);

    if (producto) {
      producto.precio = nuevoPrecio;
      fs.writeFileSync('./restaurants.json', JSON.stringify(inventario, null, 2), 'utf8');
      res.status(200).send('Producto actualizado');
    } else {
      res.status(404).send('Producto no encontrado');
    }
  } catch (err) {
    res.status(500).send('Error al actualizar el inventario');
  }
});

// POST ADD PRODUCT
router.post('/inventario', verificarJWT, soloTrabajador, (req, res) => {
  const { nombreRestaurante, nombreCategoria, nuevoProducto } = req.body;
  try {
    const inventario = JSON.parse(fs.readFileSync('./restaurants.json', 'utf8'));
    const restaurante = inventario.find(r => r.nombre === nombreRestaurante);
    const categoria = restaurante?.categorias.find(c => c.nombre === nombreCategoria);

    if (categoria) {
      categoria.productos.push(nuevoProducto);
      fs.writeFileSync('./restaurants.json', JSON.stringify(inventario, null, 2), 'utf8');
      res.status(201).send('Producto registrado');
    } else {
      res.status(404).send('Categoría no encontrada');
    }
  } catch (err) {
    res.status(500).send('Error al registrar el producto');
  }
});

// DELETE PRODUCT
router.delete('/inventario', verificarJWT, soloTrabajador, (req, res) => {
  const { nombreRestaurante, nombreCategoria, nombreProducto } = req.body;
  try {
    const inventario = JSON.parse(fs.readFileSync('./restaurants.json', 'utf8'));
    const restaurante = inventario.find(r => r.nombre === nombreRestaurante);
    const categoria = restaurante?.categorias.find(c => c.nombre === nombreCategoria);

    if (categoria) {
      categoria.productos = categoria.productos.filter(p => p.nombre !== nombreProducto);
      fs.writeFileSync('./restaurants.json', JSON.stringify(inventario, null, 2), 'utf8');
      res.status(200).send('Producto eliminado');
    } else {
      res.status(404).send('Categoría no encontrada');
    }
  } catch (err) {
    res.status(500).send('Error al eliminar el producto');
  }
});

// LOGOUT CLIENT-SIDE
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

module.exports = router;