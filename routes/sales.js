const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Registrar una venta y descontar stock
router.post('/', async (req, res) => {
  try {
    const { productos, total } = req.body;

    if (!productos || !Array.isArray(productos) || typeof total !== "number") {
      return res.status(400).json({ error: 'Datos de venta inválidos' });
    }

    // Registrar la venta (colección "ventas")
    const ventaData = {
      productos,
      total,
      fecha: new Date().toISOString(),
    };
    await db.collection('ventas').add(ventaData);

    // 1. Leer todos los productos primero
    const productosConRef = await Promise.all(productos.map(async (prod) => {
      if (
        !prod.nombre ||
        !prod.restaurante ||
        !prod.categoria ||
        typeof prod.cantidad !== "number"
      ) {
        return null;
      }
      const productoRef = db
        .collection('restaurantes').doc(prod.restaurante)
        .collection('categorias').doc(prod.categoria)
        .collection('productos').doc(prod.nombre);

      const productoDoc = await productoRef.get();
      if (!productoDoc.exists) return null;

      const stockActual = productoDoc.data().stock || 0;
      const nuevoStock = Math.max(stockActual - prod.cantidad, 0);

      return { productoRef, nuevoStock };
    }));

    // 2. Armar el batch solo con los productos válidos
    const batch = db.batch();
    productosConRef.forEach((item) => {
      if (item) {
        batch.update(item.productoRef, { stock: item.nuevoStock });
      }
    });

    await batch.commit();

    res.status(200).json({ ok: true, venta: ventaData });
  } catch (err) {
    console.error('Error al registrar la venta:', err);
    res.status(500).json({ error: 'Error al registrar la venta' });
  }
});

module.exports = router;