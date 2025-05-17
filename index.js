require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const { verificarToken, verificarRol } = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const feedbackRouter = require('./routes/feedback');


const app = express();

const corsOptions = {
  origin: ['https://smart-line-mio.vercel.app', 'http://localhost:3809', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.options('*', cors(corsOptions));

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas
app.use('/api/inventory', verificarToken, verificarRol(['vendedor']), inventoryRoutes);
app.use('/api/feedback', verificarToken, verificarRol(['cliente']), feedbackRouter);

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
