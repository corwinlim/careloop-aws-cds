'use strict';
// Vercel Express entry point. Demonstration data is seeded on cold start.
// WARNING: in-memory approval/outbox/audit state is NOT durable across instances.
const { app } = require('./server/index');
const { seedAll } = require('./server/seed');
seedAll();
module.exports = app;
