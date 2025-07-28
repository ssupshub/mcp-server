import express from 'express';
import config from './config/config.js';
import mcpRoutes from './routes/mcpRoutes.js';

const app = express();
app.use(express.json());

app.use('/api', mcpRoutes);

app.listen(config.port, () => {
  console.log(`MCP Server running on port ${config.port}`);
});
