require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const ventasRoutes = require('./routes/ventasRoutes');
const inventoryRoutes = require('./routes/inventory');
const feedbackRouter = require('./routes/feedback');
const ordersRoutes = require('./routes/orders');

// Inicializa Firebase Admin si usas Firestore
const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // O usa admin.credential.cert(require("./ruta/credenciales.json"))
    // databaseURL: "https://<TU_PROJECT_ID>.firebaseio.com" // solo si usas RTDB
  });
}

const app = express();

// Opciones de CORS para aceptar desde Verc , localhost, etc.
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

const salesRouter = require('./routes/sales');
app.use('/api/sales', salesRouter);

app.use(cors(corsOptions));
app.use(express.json());

// Permitir preflight OPTIONS para todas las rutas
app.options('*', cors(corsOptions));

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/feedback', feedbackRouter);
app.use('/api/orders', ordersRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API funcionando correctamente");
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});