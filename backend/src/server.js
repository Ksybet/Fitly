const app = require('./app');
const env = require('./config/env');

app.listen(env.PORT, env.HOST, () => {
	console.log(`🚀 Сервер запущен на ${env.HOST}:${env.PORT}`);
});
