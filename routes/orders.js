const express = require("express");
const router = express.Router();
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const db = getFirestore();

// GUARDAR COMPRA (POST /api/orders/historial)
router.post("/historial", async (req, res) => {
  try {
    const { userId, productos } = req.body;
    if (!userId || !productos || !Array.isArray(productos)) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // Descontar stock de cada producto
    for (const prod of productos) {
      // restaurantes/{restaurante}/categorias/{categoria}/productos/{nombre}
      const productoRef = db
        .collection("restaurantes")
        .doc(prod.restaurante)
        .collection("categorias")
        .doc(prod.categoria)
        .collection("productos")
        .doc(prod.nombre);

      const productoDoc = await productoRef.get();
      if (productoDoc.exists) {
        const data = productoDoc.data();
        const stockActual = data.stock || 0;
        const cantidadComprada = prod.cantidad || 1;
        const nuevoStock = Math.max(stockActual - cantidadComprada, 0);
        await productoRef.update({ stock: nuevoStock });
      } else {
        console.log(`Producto no encontrado:`, prod);
      }
    }

    // Guardar la orden
    const fecha = Timestamp.now();
    await db.collection("orders").add({
      userId,
      productos: productos.map(p => ({ ...p, fechaCompra: fecha })),
      fecha,
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Error al guardar la compra y descontar stock:", err);
    res.status(500).json({ error: "Error al guardar la compra" });
  }
});

// OBTENER HISTORIAL (GET /api/orders/historial?userId=...)
router.get("/historial", async (req, res) => {
  try {
    // Cambiado: obtener userId del query string
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "Falta userId" });

    const snapshot = await db.collection("orders").where("userId", "==", userId).get();

    // Agrupa por restaurante y categoría
    const agrupado = {};
    snapshot.forEach((doc) => {
      const { productos } = doc.data();
      productos.forEach((prod) => {
        if (!agrupado[prod.restaurante]) agrupado[prod.restaurante] = {};
        if (!agrupado[prod.restaurante][prod.categoria]) agrupado[prod.restaurante][prod.categoria] = [];
        agrupado[prod.restaurante][prod.categoria].push(prod);
      });
    });

    const resultado = Object.entries(agrupado).map(([nombreRestaurante, categoriasObj]) => ({
      nombreRestaurante,
      categorias: Object.entries(categoriasObj).map(([nombre, productos]) => ({
        nombre,
        productos,
      })),
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener historial" });
  }
});

module.exports = router;