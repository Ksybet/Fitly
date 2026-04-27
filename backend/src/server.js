const app = require('./app');
const env = require('./config/env');

const PORT = env.PORT || process.env.PORT || 3000;
const HOST = env.HOST || process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
	console.log(`🚀 Сервер запущен на ${HOST}:${PORT}`);
});
