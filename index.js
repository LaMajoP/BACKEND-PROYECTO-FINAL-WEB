require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar rutas y middlewares
const authRoutes = require('./routes/auth');
const { verificarToken, verificarRol } = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const feedbackRouter = require('./routes/feedback');
const ordersRoutes = require('./routes/orders');

// Inicializa Firebase Admin si usas Firestore
const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const app = express();

// Opciones de CORS para aceptar desde Vercel, localhost, etc.
const corsOptions = {
  origin: [
    'https://smart-line-mio.vercel.app',
    'http://localhost:3809',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Permitir preflight OPTIONS para todas las rutas
app.options('*', cors(corsOptions));

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas
app.use('/api/inventory', verificarToken, verificarRol(['cliente', 'vendedor']), inventoryRoutes);
app.use('/inventory/inventario-completo', verificarToken, verificarRol(['cliente', 'vendedor']), inventoryRoutes);
app.use('/api/feedback', feedbackRouter);
app.use('/api/orders', verificarToken, verificarRol(['cliente']), ordersRoutes);


// Otra ruta

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API funcionando correctamente");
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});