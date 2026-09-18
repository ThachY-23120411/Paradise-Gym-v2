const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { errorHandler, pool } = require('./modules/core/http');
const { router: authRoutes, authenticate } = require('./modules/core/auth');

const app = express();

// Security and utility middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use('/api/v1/mobile/avatar',express.json({limit:'7mb'}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req,res,next)=>{
  if(req.headers['x-branch-id']==='ALL')delete req.headers['x-branch-id'];
  if(req.query.branch_id==='ALL')delete req.query.branch_id;
  next();
});
app.use('/uploads/avatars',express.static(require('./modules/core/avatar').storage,{dotfiles:'deny',index:false,setHeaders:res=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'");
}}));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
    status: 'UP', database: 'POSTGRESQL',
    service: 'Paradise Gym Core REST API',
    timestamp: new Date().toISOString()
    });
  } catch { res.status(503).json({ status: 'DOWN', database: 'UNAVAILABLE' }); }
});

// API Routes mounting
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(API_PREFIX, authenticate);
app.use(API_PREFIX, require('./modules/core/avatar').router);
app.use(API_PREFIX, require('./modules/core/mobile').router);
app.use(API_PREFIX, require('./modules/core/devices').router);
app.use(API_PREFIX, require('./modules/core/notifications').router);
app.use(API_PREFIX, require('./modules/core/catalog').router);
app.use(API_PREFIX, require('./modules/core/commerce').router);
app.use(API_PREFIX, require('./modules/core/bookings').router);
app.use(API_PREFIX, require('./modules/core/operations').router);
app.use((req,res)=>res.status(404).json({success:false,message:'Route not found',code:'NOT_FOUND'}));

// Centralized error handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  require('./modules/core/jobs').startNotificationScheduler();
  app.listen(env.PORT, () => {
    console.log(`==================================================`);
    console.log(`🏋️‍♂️ PARADISE GYM REST API SERVER RUNNING ON PORT ${env.PORT}`);
    console.log(`📡 Base URL: http://localhost:${env.PORT}${API_PREFIX}`);
    console.log(`✅ Health Check: http://localhost:${env.PORT}/health`);
    console.log(`==================================================`);
  });
}

module.exports = app;
