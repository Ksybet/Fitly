const express = require('express');
const authRoutes = require('./modules/auth/auth.routes');
const { errorMiddleware } = require('./middlewares/error.middleware');

const app = express();

app.set('trust proxy', 'loopback');
app.use(express.json());

app.use('/api/v1/auth', authRoutes);

app.use(errorMiddleware);

module.exports = app;
