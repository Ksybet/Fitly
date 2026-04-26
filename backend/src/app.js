const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const authRoutes = require('./modules/auth/auth.routes');
const goalsRoutes = require('./modules/goals/goals.routes');
const profileRoutes = require('./modules/profile/profile.routes');
const waterRoutes = require('./modules/water/water.routes');
const sleepRoutes = require('./modules/sleep/sleep.routes');
const moodRoutes = require('./modules/mood/mood.routes');
const favoritesRoutes = require('./modules/favorites/favorites.routes');
const dailyRoutes = require('./modules/daily/daily.routes');

const { errorMiddleware } = require('./middlewares/error.middleware');

const app = express();

app.use(express.json());

app.use(
	cors({
		origin: true,
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
app.use('/api/v1/goals', goalsRoutes);
app.use('/api/v1/water', waterRoutes);
app.use('/api/v1/sleep', sleepRoutes);
app.use('/api/v1/mood', moodRoutes);
app.use('/api/v1/favorites', favoritesRoutes);
app.use('/api/v1/daily', dailyRoutes);

app.use(errorMiddleware);

module.exports = app;

