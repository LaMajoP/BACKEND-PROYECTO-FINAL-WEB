require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const ventasRoutes = require('./routes/ventasRoutes');
const inventoryRoutes = require('./routes/inventory');
const feedbackRouter = require('./routes/feedback');

const app = express(); // Inicialización de app

// Configuración de CORS para aceptar desde Vercel y permitir preflight
const corsOptions = {
  origin: ['https://smart-line-mio.vercel.app', 'http://localhost:3809', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Aceptar OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization']     // Permitir headers personalizados
};

app.use(cors(corsOptions));
app.use(express.json());

app.options('*', cors(corsOptions)); // <-- esto asegura que OPTIONS responda

// Tus rutas
app.use('/api/auth', authRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/feedback', feedbackRouter);

// Agrega manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
