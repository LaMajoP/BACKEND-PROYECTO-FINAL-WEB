const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

// GET /api/ventas/buscar?nombre=pollo&categoria=sushi&restaurante=Punto%20Wok&precioMin=5000&precioMax=20000
router.get('/buscar', async (req, res) => {
  const { nombre, categoria, restaurante, precioMin, precioMax } = req.query;
  const resultados = [];

  try {
    const restaurantesSnap = await db.collection('restaurantes').get();

    for (const restDoc of restaurantesSnap.docs) {
      const restId = restDoc.id;

      if (restaurante && restId.toLowerCase() !== restaurante.toLowerCase()) continue;

      const categoriasSnap = await db.collection('restaurantes').doc(restId).collection('categorias').get();

      for (const catDoc of categoriasSnap.docs) {
        const catId = catDoc.id;

        if (categoria && !catId.toLowerCase().includes(categoria.toLowerCase())) continue;

        const productosSnap = await db
          .collection('restaurantes')
          .doc(restId)
          .collection('categorias')
          .doc(catId)
          .collection('productos')
          .get();

        for (const prodDoc of productosSnap.docs) {
          const prod = prodDoc.data();

          const cumpleNombre = !nombre || prod.nombre.toLowerCase().includes(nombre.toLowerCase());
          const cumpleMin = !precioMin || prod.precio >= parseFloat(precioMin);
          const cumpleMax = !precioMax || prod.precio <= parseFloat(precioMax);

          if (cumpleNombre && cumpleMin && cumpleMax) {
            resultados.push({
              restaurante: restId,
              categoria: catId,
              ...prod
            });
          }
        }
      }
    }

    res.json(resultados.length ? resultados : 'No se encontraron productos.');
  } catch (error) {
    console.error('❌ Error al buscar productos:', error.message);
    res.status(500).send('Error al consultar los productos');
  }
});

module.exports = router;
