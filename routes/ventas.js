const fs = require('fs');
const path = require('path');

function buscarProducto(nombre, categoria, producto) {
    const rawData = fs.readFileSync(path.join(__dirname, '../data/restaurants.json'), 'utf8');
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

module.exports = buscarProducto;