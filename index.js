require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const router = express();
router.use(cors());
router.use(express.json());

router.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3001;
router.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});