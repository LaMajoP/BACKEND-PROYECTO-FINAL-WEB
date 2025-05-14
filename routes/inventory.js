const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

// Crear categoría
router.post('/categoria', async (req, res) => {
  try {
    const { nombreRestaurante, nuevaCategoria } = req.body;
    
    if (!nombreRestaurante || !nuevaCategoria?.nombre) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const restauranteRef = db.collection('restaurantes').doc(nombreRestaurante);
    await restauranteRef.collection('categorias').doc(nuevaCategoria.nombre).set({
      nombre: nuevaCategoria.nombre
    });

    res.status(201).json({ 
      message: 'Categoría creada',
      categoria: { nombre: nuevaCategoria.nombre, productos: [] }
    });
  } catch (err) {
    console.error('Error al crear categoría:', err);
    res.status(500).json({ error: 'Error al crear la categoría' });
  }
});

// Eliminar categoría
router.delete('/categoria/:nombreCategoria', async (req, res) => {
  try {
    const { nombreRestaurante } = req.body;
    const { nombreCategoria } = req.params;

    if (!nombreRestaurante) {
      return res.status(400).json({ error: 'Nombre de restaurante requerido' });
    }

    const categoriaRef = db.collection('restaurantes').doc(nombreRestaurante)
                         .collection('categorias').doc(nombreCategoria);
    
    await categoriaRef.delete();
    res.status(200).json({ message: 'Categoría eliminada' });
  } catch (err) {
    console.error('Error al eliminar categoría:', err);
    res.status(500).json({ error: 'Error al eliminar la categoría' });
  }
});

// Modificar nombre de categoría (renombrar documento y conservar productos)
router.put('/categoria/modificarCategoria', async (req, res) => {
  try {
    const { nombreRestaurante, nombreCategoriaActual, nuevoNombreCategoria } = req.body;

    if (!nombreRestaurante || !nombreCategoriaActual || !nuevoNombreCategoria) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const dbRest = db.collection('restaurantes').doc(nombreRestaurante);
    const categoriasRef = dbRest.collection('categorias');
    const categoriaActualRef = categoriasRef.doc(nombreCategoriaActual);
    const nuevaCategoriaRef = categoriasRef.doc(nuevoNombreCategoria);

    const categoriaDoc = await categoriaActualRef.get();
    if (!categoriaDoc.exists) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Copiar datos del documento original
    const data = categoriaDoc.data();
    await nuevaCategoriaRef.set({
      ...data,
      nombre: nuevoNombreCategoria
    });

    // Copiar subcolección "productos"
    const productosSnap = await categoriaActualRef.collection('productos').get();
    const batch = db.batch();
    productosSnap.forEach(doc => {
      const productoData = doc.data();
      const newDocRef = nuevaCategoriaRef.collection('productos').doc(doc.id);
      batch.set(newDocRef, {
        ...productoData,
        categoria: nuevoNombreCategoria
      });      
    });

    // Ejecutar batch y eliminar categoría original
    await batch.commit();
    await categoriaActualRef.delete();

    res.status(200).json({ message: 'Categoría renombrada correctamente' });
  } catch (error) {
    console.error('Error al renombrar la categoría:', error);
    res.status(500).json({ error: 'Error al modificar la categoría' });
  }
});


// Crear producto
router.post('/producto', async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, restaurante } = req.body;

    if (!nombre || !precio || !categoria || !restaurante) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const productoData = { 
      nombre, 
      descripcion: descripcion || '',
      precio: Number(precio),
      categoria,
      restaurante
    };

    const categoriaRef = db.collection('restaurantes').doc(restaurante)
                         .collection('categorias').doc(categoria);
    
    await categoriaRef.collection('productos').doc(nombre).set(productoData);
    
    res.status(201).json({
      message: 'Producto creado',
      producto: productoData
    });
  } catch (err) {
    console.error('Error al crear producto:', err);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

// Eliminar producto
router.delete('/producto/modificarProducto', async (req, res) => {
  try {
    const { nombreRestaurante, nombreCategoria } = req.body;
    const { nombreProducto } = req.params;

    if (!nombreRestaurante || !nombreCategoria) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const productoRef = db.collection('restaurantes').doc(nombreRestaurante)
                         .collection('categorias').doc(nombreCategoria)
                         .collection('productos').doc(nombreProducto);
    
    await productoRef.delete();
    res.status(200).json({ message: 'Producto eliminado' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

// Modificar producto
router.put('/producto/:nombreProducto', async (req, res) => {
  try {
    const { nombreRestaurante, nombreCategoria, datosActualizados } = req.body;
    const { nombreProducto } = req.params;

    if (!nombreRestaurante || !nombreCategoria || !datosActualizados) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const productoRef = db.collection('restaurantes').doc(nombreRestaurante)
                         .collection('categorias').doc(nombreCategoria)
                         .collection('productos').doc(nombreProducto);

    const productoDoc = await productoRef.get();
    if (!productoDoc.exists) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const updateData = {
      ...datosActualizados,
      precio: Number(datosActualizados.precio || 0),
      categoria: nombreCategoria,
      restaurante: nombreRestaurante
    };

    await productoRef.update(updateData);
    
    const productoActualizado = (await productoRef.get()).data();
    res.status(200).json({
      message: 'Producto actualizado',
      producto: productoActualizado
    });
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ 
      error: 'Error al actualizar el producto',
      detalles: err.message 
    });
  }
});

// Obtener inventario completo
router.get('/inventario-completo', async (req, res) => {
  try {
    const resultado = [];
    const restaurantesSnap = await db.collection('restaurantes').get();

    for (const restDoc of restaurantesSnap.docs) {
      const restId = restDoc.id;
      const categoriasSnap = await db.collection('restaurantes').doc(restId)
                                   .collection('categorias').get();

      const categorias = [];
      for (const catDoc of categoriasSnap.docs) {
        const catId = catDoc.id;
        const productosSnap = await db.collection('restaurantes').doc(restId)
                                    .collection('categorias').doc(catId)
                                    .collection('productos').get();

        const productos = [];
        for (const prodDoc of productosSnap.docs) {
          productos.push({
            ...prodDoc.data(),
            categoria: catId,
            restaurante: restId
          });
        }

        categorias.push({
          nombre: catId,
          productos
        });
      }

      resultado.push({
        nombreRestaurante: restId,
        categorias
      });
    }

    res.status(200).json(resultado);
  } catch (err) {
    console.error('Error al obtener inventario:', err);
    res.status(500).json({ error: 'Error al obtener el inventario' });
  }
});

module.exports = router;