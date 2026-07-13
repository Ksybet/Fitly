const sql = require('mssql');
const env = require('./env');

const config = {
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  server: env.DB_SERVER,
  database: env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ MS SQL подключен');
    return pool;
  })
  .catch(err => {
    console.error('❌ Ошибка подключения к БД:', err);
    process.exit(1);
  });

module.exports = {
  sql,
  poolPromise,
};
