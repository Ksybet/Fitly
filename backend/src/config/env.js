require('dotenv').config();

module.exports = {
	port: process.env.PORT || 3000,
	host: process.env.HOST || '127.0.0.1',
	jwtSecret: process.env.JWT_SECRET || 'default_secret',
	db: {
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		server: process.env.DB_SERVER,
		database: process.env.DB_DATABASE,
		port: Number(process.env.DB_PORT || 1433),
		options: {
			encrypt: false,
			trustServerCertificate: true,
		},
	},
};
