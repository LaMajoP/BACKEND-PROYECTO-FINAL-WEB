const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');  // Ruta corregida
const { verificarToken, verificarRol } = require('./auth'); // Actualizar la ruta de importación

router.use(verificarToken);  // Protege todas las rutas

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


// Ruta accesible para clientes y vendedores
router.get('/producto/:nombreProducto', 
  verificarToken, 
  verificarRol(['cliente', 'vendedor']), 
  async (req, res) => {
  try {
    const { nombreRestaurante, nombreCategoria } = req.query;
    const { nombreProducto } = req.params;

    if (!nombreRestaurante || !nombreCategoria || !nombreProducto) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const productoRef = db.collection('restaurantes').doc(nombreRestaurante)
                         .collection('categorias').doc(nombreCategoria)
                         .collection('productos').doc(nombreProducto);

    const productoDoc = await productoRef.get();
    if (!productoDoc.exists) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.status(200).json(productoDoc.data());
  } catch (err) {
    console.error('Error al obtener producto:', err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// Crear producto
router.post('/producto', 
  verificarToken, 
  verificarRol(['vendedor']), 
  async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, restaurante, stock } = req.body;

    if (!nombre || !precio || !categoria || !restaurante) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const productoData = { 
      nombre, 
      descripcion: descripcion || '',
      precio: Number(precio),
      categoria,
      restaurante,
      stock: Number(stock) || 0 // <-- Guardar el stock recibido
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

// Modificar producto
router.put('/producto/:nombreProducto', 
  verificarToken, 
  verificarRol(['vendedor']), 
  async (req, res) => {
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
      stock: Number(datosActualizados.stock) || 0, // <-- Guardar el stock actualizado
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

// Eliminar producto
router.delete('/producto/:nombreProducto', 
  verificarToken, 
  verificarRol(['vendedor']), 
  async (req, res) => {
  try {
    const { nombreRestaurante, nombreCategoria } = req.query;
    const { nombreProducto } = req.params;

    if (!nombreRestaurante || !nombreCategoria || !nombreProducto) {
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

// Ruta accesible para clientes y vendedores
router.get('/inventario-completo', 
  verificarToken, 
  verificarRol(['cliente', 'vendedor']), 
  async (req, res) => {
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

// Rutas protegidas
router.get('/', verificarToken, verificarRol(['vendedor']), async (req, res) => {
    try {
        const { nombreRestaurante } = req.query;

        if (!nombreRestaurante) {
            return res.status(400).json({ error: 'Nombre de restaurante requerido' });
        }

        const categoriasSnap = await db.collection('restaurantes').doc(nombreRestaurante)
            .collection('categorias').get();

        const categorias = [];
        for (const catDoc of categoriasSnap.docs) {
            const catId = catDoc.id;
            const productosSnap = await db.collection('restaurantes').doc(nombreRestaurante)
                .collection('categorias').doc(catId)
                .collection('productos').get();

            const productos = [];
            for (const prodDoc of productosSnap.docs) {
                productos.push({
                    ...prodDoc.data(),
                    categoria: catId,
                    restaurante: nombreRestaurante
                });
            }

            categorias.push({
                nombre: catId,
                productos
            });
        }

        res.status(200).json(categorias);
    } catch (err) {
        console.error('Error al obtener inventario:', err);
        res.status(500).json({ error: 'Error al obtener el inventario' });
    }
});

router.post('/', verificarToken, verificarRol(['vendedor']), async (req, res) => {
    try {
        const { nombreRestaurante, nombreCategoria, nuevoProducto } = req.body;

        if (!nombreRestaurante || !nombreCategoria || !nuevoProducto) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        const productoRef = db.collection('restaurantes').doc(nombreRestaurante)
            .collection('categorias').doc(nombreCategoria)
            .collection('productos').doc(nuevoProducto.nombre);

        await productoRef.set(nuevoProducto);
        res.status(201).json({ message: 'Producto creado', producto: nuevoProducto });
    } catch (err) {
        console.error('Error al crear producto:', err);
        res.status(500).json({ error: 'Error al crear el producto' });
    }
});

module.exports = router;