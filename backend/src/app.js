const express = require('express');
const authRoutes = require('./modules/auth/auth.routes');
const { errorMiddleware } = require('./middlewares/error.middleware');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Fitly API работает');
});

app.use('/api/v1/auth', authRoutes);

app.use(errorMiddleware);

module.exports = app;

