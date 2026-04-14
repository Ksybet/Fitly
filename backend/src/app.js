const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const authRoutes = require('./modules/auth/auth.routes');
const profileRoutes = require('./modules/profile/profile.routes');
const { errorMiddleware } = require('./middlewares/error.middleware');

const app = express();

app.use(express.json());

app.use(
	cors({
		origin: env.clientUrl,
		credentials: true,
	}),
);

app.get('/', (req, res) => {
	res.send('Fitly API работает');
});

app.get('/health', (req, res) => {
	res.status(200).json({
		success: true,
		data: 'OK',
	});
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);

app.use(errorMiddleware);

module.exports = app;
