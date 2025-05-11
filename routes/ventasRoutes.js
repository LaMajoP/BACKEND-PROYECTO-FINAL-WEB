const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Función de búsqueda reutilizable
function buscarProducto(nombre, categoria, producto) {
  const rawData = fs.readFileSync(path.join(__dirname, '../restaurants.json'), 'utf8');
  const menu = JSON.parse(rawData);
  let resultados = [];

  menu.forEach(restaurante => {
    restaurante.categorias.forEach(cat => {
      if ((!categoria || cat.nombre.toLowerCase().includes(categoria.toLowerCase())) &&
          (!producto || cat.productos.some(prod => prod.nombre.toLowerCase().includes(producto.toLowerCase())))) {
        cat.productos.forEach(prod => {
          if (!nombre || prod.nombre.toLowerCase().includes(nombre.toLowerCase())) {
            resultados.push({
              restaurante: restaurante.nombre,
              categoria: cat.nombre,
              ...prod
            });
          }
        });
      }
    });
  });

  return resultados.length ? resultados : "No se encontraron productos.";
}

// Ruta GET para buscar productos
router.get('/buscar', (req, res) => {
  const { nombre, categoria, producto } = req.query;
  const resultado = buscarProducto(nombre, categoria, producto);
  res.json(resultado);
});

module.exports = router;
