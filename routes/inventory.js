const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

// Crear categoría
router.post('/categoria', async (req, res) => {
  const { nombreRestaurante, nuevaCategoria } = req.body;
  try {
    const restauranteRef = db.collection('restaurantes').doc(nombreRestaurante);
    await restauranteRef.collection('categorias').doc(nuevaCategoria.nombre).set(nuevaCategoria);
    res.status(201).send('Categoría creada');
  } catch (err) {
    res.status(500).send('Error al crear la categoría');
  }
});

// Eliminar categoría
router.delete('/categoria/:nombreCategoria', async (req, res) => {
  const { nombreRestaurante } = req.body;
  const { nombreCategoria } = req.params;
  try {
    const categoriaRef = db.collection('restaurantes').doc(nombreRestaurante).collection('categorias').doc(nombreCategoria);
    await categoriaRef.delete();
    res.status(200).send('Categoría eliminada');
  } catch (err) {
    res.status(500).send('Error al eliminar la categoría');
  }
});

// Crear producto
router.post('/producto', async (req, res) => {
  const { nombreRestaurante, nombreCategoria, nombre, descripcion, precio } = req.body;
  try {
    const categoriaRef = db.collection('restaurantes').doc(nombreRestaurante).collection('categorias').doc(nombreCategoria);
    const nuevoProducto = { nombre, descripcion, precio };
    await categoriaRef.collection('productos').doc(nombre).set(nuevoProducto);
    res.status(201).send('Producto creado');
  } catch (err) {
    res.status(500).send('Error al crear el producto');
  }
});

// Eliminar producto
router.delete('/producto/:nombreProducto', async (req, res) => {
  const { nombreRestaurante, nombreCategoria } = req.body;
  const { nombreProducto } = req.params;
  try {
    const productoRef = db.collection('restaurantes').doc(nombreRestaurante).collection('categorias').doc(nombreCategoria).collection('productos').doc(nombreProducto);
    await productoRef.delete();
    res.status(200).send('Producto eliminado');
  } catch (err) {
    res.status(500).send('Error al eliminar el producto');
  }
});

// Modificar producto
router.put('/producto/:nombreProducto', async (req, res) => {
  const { nombreRestaurante, nombreCategoria, datosActualizados } = req.body;
  const { nombreProducto } = req.params;
  try {
    const productoRef = db.collection('restaurantes').doc(nombreRestaurante).collection('categorias').doc(nombreCategoria).collection('productos').doc(nombreProducto);
    await productoRef.update(datosActualizados);
    res.status(200).send('Producto actualizado');
  } catch (err) {
    res.status(500).send('Error al actualizar el producto');
  }
});

// Obtener inventario completo
router.get('/inventario-completo', async (req, res) => {
  try {
    const resultado = [];
    const restaurantesSnap = await db.collection('restaurantes').get();

    for (const restDoc of restaurantesSnap.docs) {
      const restId = restDoc.id;
      const restData = restDoc.data();
      const categoriasSnap = await db.collection('restaurantes').doc(restId).collection('categorias').get();

      const categorias = [];
      for (const catDoc of categoriasSnap.docs) {
        const catId = catDoc.id;
        const catData = catDoc.data();
        const productosSnap = await db.collection('restaurantes').doc(restId).collection('categorias').doc(catId).collection('productos').get();

        const productos = [];
        for (const prodDoc of productosSnap.docs) {
          const prodData = prodDoc.data();
          productos.push({
            nombre: prodData.nombre,
            descripcion: prodData.descripcion,
            precio: prodData.precio
          });
        }

        categorias.push({
            nombre: catDoc.id,
            productos: productos
        });
      }

      resultado.push({
        nombreRestaurante: restDoc.id,
        categorias: categorias
      });
    }

    res.json(resultado);
  } catch (err) {
    res.status(500).send('Error al obtener el inventario completo');
  }
});
module.exports = router;