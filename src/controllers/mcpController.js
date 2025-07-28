export const healthCheck = (req, res) => {
  res.json({ status: 'UP', uptime: process.uptime() });
};
