const { db } = require("./firebase");
const fs = require("fs");

const data = JSON.parse(fs.readFileSync("restaurants.json", "utf8"));

const subirDatos = async () => {
  for (const restaurante of data) {
    const restId = restaurante.nombre;

    for (const categoria of restaurante.categorias) {
      const catId = categoria.nombre;

      for (const producto of categoria.productos) {
        const prodId = producto.nombre;
        const productoRef = db.collection("restaurantes").doc(restId).collection("categorias").doc(catId).collection("productos").doc(prodId);

        const productoSnapshot = await productoRef.get();

        if (!productoSnapshot.exists) {
          await productoRef.set({
            ...producto,
            stock: 10,
            fechaRegistro: new Date().toISOString()
          });

          console.log(`✅ Subido: ${restId}/${catId}/${prodId}`);
        } else {
          console.log(`⏭️  Ya existe: ${restId}/${catId}/${prodId}`);
        }
      }
    }
  }
};

subirDatos();
