const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verificarToken, verificarRol } = require('./auth');
const cors = require('cors');

// Habilitar CORS con opciones
const corsOptions = {
  origin: [
    "http://localhost:3000", // Dominio del frontend
    "https://smart-line-mio.vercel.app/", // Dominio en producción
  ],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"], // Permitir el encabezado Authorization
};

router.use(cors(corsOptions));

// Crear feedback (solo clientes)
router.post('/', verificarToken, verificarRol(['cliente']), async (req, res) => {
  try {
    const { message, rating } = req.body;
    const { userId } = req.user;

    const feedbackRef = await db.collection('feedback').add({
      userId,
      message,
      rating,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ 
      message: 'Feedback enviado exitosamente',
      id: feedbackRef.id 
    });
  } catch (error) {
    console.error('Error al crear feedback:', error);
    res.status(500).json({ error: 'Error al procesar el feedback' });
  }
});

// Obtener todos los feedback (solo vendedores)
router.get('/', verificarToken, verificarRol(['vendedor']), async (req, res) => {
  try {
    const snapshot = await db.collection('feedback').get();
    const feedbacks = [];

    snapshot.forEach(doc => {
      const feedback = doc.data();
      feedbacks.push({
        id: doc.id,
        userId: feedback.userId,
        mensaje: feedback.message,
        calificacion: feedback.rating,
        fecha: feedback.createdAt
      });
    });

    res.json(feedbacks);
  } catch (error) {
    console.error('Error al obtener feedback:', error);
    res.status(500).json({ error: 'Error al obtener feedback' });
  }
});

module.exports = router;