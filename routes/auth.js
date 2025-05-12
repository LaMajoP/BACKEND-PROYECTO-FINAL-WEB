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
function soloVendedor(req, res, next) {
  if (req.user.role !== 'vendedor') {
    return res.status(403).send('Acceso denegado');
  }
  next();
}
// MIDDLEWARE TO CHECK IF USER IS CLIENT
function soloCliente(req, res, next) {
  if (req.user.role !== 'cliente') {
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
router.get('/inventario', verificarJWT, soloVendedor, (req, res) => {
  try {
    const inventario = JSON.parse(fs.readFileSync('./restaurants.json', 'utf8'));
    res.json(inventario);
  } catch (err) {
    res.status(500).send('Error al leer el inventario');
  }
});

// MANAGE OF PRODUCST AND INVENTORY BY WORKER

// PUT UPDATE PRICE
router.put('/inventario', verificarJWT, soloVendedor, (req, res) => {
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
router.post('/inventario', verificarJWT, soloVendedor, (req, res) => {
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
router.delete('/inventario', verificarJWT, soloVendedor, async (req, res) => {
  const { nombreRestaurante, nombreCategoria, nombreProducto } = req.body;
  try {
    const restauranteRef = db.collection('restaurantes').doc(nombreRestaurante);
    const categoriaRef = restauranteRef.collection('categorias').doc(nombreCategoria);
    const productoRef = categoriaRef.collection('productos').doc(nombreProducto);

    const productoSnapshot = await productoRef.get();

    if (productoSnapshot.exists) {
      await productoRef.delete();
      res.status(200).send('Producto eliminado');
    } else {
      res.status(404).send('Categoría o producto no encontrado');
    }
  } catch (err) {
    res.status(500).send('Error al eliminar el producto');
  }
});

// GET INVENTORY BEING CLIENT
router.get('/inventario-cliente', verificarJWT, soloCliente, async (req, res) => {
  try {
    const resultado = [];
    const restaurantesSnap = await db.collection('restaurantes').get();

    for (const restDoc of restaurantesSnap.docs) {
      const restId = restDoc.id;
      const categoriasSnap = await db.collection('restaurantes').doc(restId).collection('categorias').get();

      for (const catDoc of categoriasSnap.docs) {
        const catId = catDoc.id;
        const productosSnap = await db
          .collection('restaurantes')
          .doc(restId)
          .collection('categorias')
          .doc(catId)
          .collection('productos')
          .get();

        for (const prodDoc of productosSnap.docs) {
          const prod = prodDoc.data();
          resultado.push({ restaurante: restId, categoria: catId, ...prod });
        }
      }
    }

    res.json(resultado);
  } catch (err) {
    res.status(500).send('Error al obtener el inventario desde Firestore');
  }
});

module.exports = router;