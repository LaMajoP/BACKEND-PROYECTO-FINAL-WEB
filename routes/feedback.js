const express = require('express');
const router = express.Router();
const { db } = require('../firebase');  // Importa db en lugar de admin
const cors = require('cors');

// Habilitar CORS
router.use(cors());

// La ruta debe ser '/' ya que '/feedback' ya está en la ruta base
router.post('/', async (req, res) => {
  try {
    const { rating, comment, restaurant, userId } = req.body;

    // Validaciones
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5' });
    }

    if (!restaurant) {
      return res.status(400).json({ error: 'El restaurante es requerido' });
    }

    // Crear documento en Firestore
    const feedbackRef = db.collection('feedback');
    
    await feedbackRef.add({
      rating,
      comment,
      restaurant,
      userId,
      timestamp: new Date()
    });

    res.status(201).json({ message: 'Feedback guardado exitosamente' });

  } catch (error) {
    console.error('Error al guardar feedback:', error);
    res.status(500).json({ error: 'Error al procesar el feedback' });
  }
});

// Obtener feedbacks por restaurante
router.get('/:restaurant', async (req, res) => {
  try {
    const { restaurant } = req.params;
    
    const feedbackSnapshot = await db
      .collection('feedback')
      .where('restaurant', '==', restaurant)
      .orderBy('timestamp', 'desc')
      .get();

    const feedbacks = [];
    feedbackSnapshot.forEach(doc => {
      feedbacks.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(feedbacks);

  } catch (error) {
    console.error('Error al obtener feedbacks:', error);
    res.status(500).json({ error: 'Error al obtener feedbacks' });
  }
});

module.exports = router;