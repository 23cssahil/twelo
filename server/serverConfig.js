const compression = require('compression');

function setupOptimizations(app, server) {
  // 1. Gzip/Brotli Compression Middleware
  app.use(compression());

  // 2. Fast Health Check API for Load Balancing & Autocannon
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 3. HTTP Keep-Alive & Timeout Tuning
  if (server) {
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    server.requestTimeout = 30000;
  }
}

// 4. Mongoose High-Concurrency Connection Settings
const mongoOptions = {
  maxPoolSize: 50,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

module.exports = {
  setupOptimizations,
  mongoOptions,
};