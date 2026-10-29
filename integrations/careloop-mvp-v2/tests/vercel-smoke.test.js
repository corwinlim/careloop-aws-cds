'use strict';
// Test the actual exported Vercel Express entrypoint over HTTP without cloud
// credentials. Does NOT hit the operator SES send-test endpoint.
const assert = require('node:assert/strict');
const http = require('node:http');
const { app } = { app: require('../app') };
async function get(server, path) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: address.port, path }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        contentType: response.headers['content-type'] || '',
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    }).on('error', reject);
  });
}
async function main() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const health = await get(server, '/api/health');
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.body).version, '2.0.0');

    const page = await get(server, '/');
    assert.equal(page.status, 200);
    assert.match(page.contentType, /text\/html/);
    assert.match(page.body, /CareLoop/i);

    const asset = await get(server, '/app.jsx');
    assert.equal(asset.status, 200);
    assert.match(asset.body, /MERCHANT_CONFIG/);
    console.log('Vercel Express HTTP smoke: health, homepage, app.jsx PASS (local-only).');
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
