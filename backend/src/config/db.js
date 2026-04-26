const sql = require('mssql');

const config = {
	user: 'sa',
	password: 'StrongPassword123!',
	server: '127.0.0.1',
	port: 1433,
	database: 'Fitly',
	options: {
		trustServerCertificate: true,
		encrypt: false,
	},
};

const poolPromise = new sql.ConnectionPool(config)
	.connect()
	.then((pool) => {
		console.log('Connected to MS SQL');
		return pool;
	})
	.catch((err) => {
		console.error('DB Connection Failed:', err);
	});

module.exports = {
	sql,
	poolPromise,
};
