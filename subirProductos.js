const { db } = require("./firebase");
const fs = require("fs");

const data = JSON.parse(fs.readFileSync("restaurants.json", "utf8"));

const subirDatos = async () => {
  for (const restaurante of data) {
    const restId = restaurante.nombre;
    const restauranteRef = db.collection("restaurantes").doc(restId);

    // Verifica si el documento del restaurante existe y crea si está vacío
    const restSnap = await restauranteRef.get();
    if (!restSnap.exists || Object.keys(restSnap.data() || {}).length === 0) {
      await restauranteRef.set({ activo: true }, { merge: true });
      console.log(`✅ Restaurante creado: ${restId}`);
    }

    for (const categoria of restaurante.categorias) {
      const catId = categoria.nombre;
      const categoriaRef = restauranteRef.collection("categorias").doc(catId);

      // Verifica si la categoría tiene campos; si no, la crea con activo
      const catSnap = await categoriaRef.get();
      if (!catSnap.exists || Object.keys(catSnap.data() || {}).length === 0) {
        await categoriaRef.set({ activo: true }, { merge: true });
        console.log(`📂 Categoría creada: ${restId}/${catId}`);
      }

      for (const producto of categoria.productos) {
        const prodId = producto.nombre;
        const productoRef = categoriaRef.collection("productos").doc(prodId);

        const productoSnapshot = await productoRef.get();

        if (!productoSnapshot.exists) {
          await productoRef.set({
            ...producto,
            stock: 10,
            fechaRegistro: new Date().toISOString()
          });

          console.log(`✅ Producto subido: ${restId}/${catId}/${prodId}`);
        } else {
          console.log(`⏭️  Ya existe: ${restId}/${catId}/${prodId}`);
        }
      }
    }
  }
};

subirDatos();
