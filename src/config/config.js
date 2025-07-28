import dotenv from 'dotenv';
dotenv.config();

export default {
  port: Number(process.env.PORT) || 3000,
  logLevel: process.env.LOG_LEVEL || 'info',
  dbUri: process.env.DB_URI || 'mongodb://localhost:27017/mcp',
};
