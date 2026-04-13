const app = require('./app');
const env = require('./config/env');

app.listen(env.port, env.host, () => {
	console.log(`Fitly backend started on http://${env.host}:${env.port}`);
});
