const express = require('express');
const cors = require('cors');
const env = require('./config/env');

const authRoutes = require('./modules/auth/auth.routes');
const goalsRoutes = require('./modules/goals/goals.routes');
const profileRoutes = require('./modules/profile/profile.routes');
const accountRoutes = require('./modules/account/account.routes');
const waterRoutes = require('./modules/water/water.routes');
const sleepRoutes = require('./modules/sleep/sleep.routes');
const moodRoutes = require('./modules/mood/mood.routes');
const favoritesRoutes = require('./modules/favorites/favorites.routes');
const dailyRoutes = require('./modules/daily/daily.routes');
const systemRoutes = require('./modules/system/system.routes');
const settingsRoutes = require('./modules/settings/settings.routes');

const {
	authMiddleware,
	requireRole,
} = require('./modules/auth/auth.middleware');
const { ApiError } = require('./utils/api-error');
const { errorMiddleware } = require('./middlewares/error.middleware');
const {
	requestContextMiddleware,
} = require('./middlewares/request-context.middleware');

const app = express();

app.set('trust proxy', env.TRUST_PROXY_HOPS);
app.use(requestContextMiddleware);

app.use(
	cors({
		origin: true,
		credentials: true,
	}),
);

app.use(express.json());

app.use(systemRoutes);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api/v1/goals', goalsRoutes);
app.use('/api/v1/water', waterRoutes);
app.use('/api/v1/sleep', sleepRoutes);
app.use('/api/v1/mood', moodRoutes);
app.use('/api/v1/favorites', favoritesRoutes);
app.use('/api/v1/daily', dailyRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/admin', authMiddleware, requireRole('admin'));

app.use((req, res, next) => {
	next(new ApiError(404, 'Route not found'));
});

app.use(errorMiddleware);

module.exports = app;

