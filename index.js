require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const ventasRoutes = require('./routes/ventasRoutes');
app.use('/api/ventas', ventasRoutes);


const app = express();

// Configuración de CORS para aceptar desde Vercel y permitir preflight
const corsOptions = {
  origin: 'https://smart-line-mio.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Aceptar OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization']     // Permitir headers personalizados
};

app.use(cors(corsOptions));
app.use(express.json());

app.options('*', cors(corsOptions)); // <-- esto asegura que OPTIONS responda

// Tus rutas
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
