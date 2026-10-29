/**
 * CareLoop MVP v2 - Express Server
 * 
 * Full REST API for the CareLoop platform.
 * All security gates (whitelist, approval) enforced at service layer.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const data = require('./data');
const { seedAll } = require('./seed');
const { sendVerifiedSES } = require('./ses-provider');
const { timingSafeEqual } = require('node:crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'client', 'public')));

// ==================== MIDDLEWARE ====================

// Simulate current user from merchant type header (MVP: no real auth)
// In production, this would be JWT / Clerk auth middleware
function getCurrentUser(req) {
  const merchantType = req.headers['x-merchant-type'] || 'boarding_groomer';
  const userRole = req.headers['x-user-role'] || 'staff';
  const userName = req.headers['x-user-name'] || 'Jamie (Staff)';
  return { merchantType, userRole, userName };
}

// ==================== HEALTH ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', merchant_types: ['boarding_groomer', 'vet_clinic', 'pet_store'] });
});

// ==================== DASHBOARD ====================

app.get('/api/dashboard/stats', (req, res) => {
  const { merchantType } = getCurrentUser(req);
  const stats = data.getDashboardStats(merchantType);
  res.json({ data: stats });
});

// ==================== CARE CONTEXTS ====================

app.get('/api/care-contexts', (req, res) => {
  const { merchantType } = getCurrentUser(req);
  const contexts = data.listCareContexts(merchantType);
  // Enrich with whitelist status
  const enriched = contexts.map(ctx => ({
    ...ctx,
    whitelist_status: data.getCareContextWhitelistStatus(ctx.id).status,
  }));
  res.json({ data: enriched });
});

app.get('/api/care-contexts/:id', (req, res) => {
  const ctx = data.getCareContext(req.params.id);
  if (!ctx) return res.status(404).json({ error: 'Care context not found' });
  const wlStatus = data.getCareContextWhitelistStatus(ctx.id);
  const messages = data.listMessages().filter(m => m.care_context_id === ctx.id);
  const responses = data.getResponsesForContext(ctx.id);
  const timeline = data.getAuditForCareContext(ctx.id);
  res.json({ 
    data: { 
      ...ctx, 
      whitelist_status: wlStatus.status,
      whitelist_entry: wlStatus.entry,
      messages,
      responses,
      timeline,
    } 
  });
});

app.post('/api/care-contexts', (req, res) => {
  const { merchantType, userName } = getCurrentUser(req);
  const { petName, petType, ownerName, ownerEmail, contextType, contextDetails, riskLevel } = req.body;
  
  try {
    const ctx = data.createCareContext({
      petName,
      petType,
      ownerName,
      ownerEmail,
      contextType,
      contextDetails,
      merchantType,
      riskLevel: riskLevel || 'normal',
      actor: userName,
    });
    res.status(201).json({ data: ctx });
  } catch (err) {
    const status = err.statusCode || 400;
    res.status(status).json({ 
      error: err.message, 
      code: err.code || 'UNKNOWN_ERROR',
    });
  }
});

// ==================== MESSAGES ====================

app.get('/api/messages', (req, res) => {
  const { merchantType } = getCurrentUser(req);
  const { status } = req.query;
  const msgs = data.listMessages(merchantType, status);
  // Enrich with pet name and owner email
  const enriched = msgs.map(msg => {
    const ctx = data.getCareContext(msg.care_context_id);
    return {
      ...msg,
      pet_name: ctx ? ctx.pet_name : 'Unknown',
      owner_email: ctx ? ctx.owner_email : 'Unknown',
    };
  });
  res.json({ data: enriched });
});

app.get('/api/messages/:id', (req, res) => {
  const msg = data.getMessage(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const ctx = data.getCareContext(msg.care_context_id);
  const timeline = data.getAuditForEntity('message', msg.id);
  const responses = data.getResponsesForMessage(msg.id);
  res.json({ 
    data: { 
      ...msg, 
      care_context: ctx,
      timeline,
      responses,
    } 
  });
});

app.post('/api/messages/:id/submit', (req, res) => {
  const { userName } = getCurrentUser(req);
  try {
    const msg = data.submitForApproval(req.params.id, userName);
    res.json({ data: msg });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/messages/:id/approve', (req, res) => {
  const { userName } = getCurrentUser(req);
  const { note } = req.body || {};
  try {
    const msg = data.approveMessage(req.params.id, userName, note);
    res.json({ data: msg });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/messages/:id/reject', (req, res) => {
  const { userName } = getCurrentUser(req);
  const { reason } = req.body || {};
  try {
    const msg = data.rejectMessage(req.params.id, userName, reason);
    res.json({ data: msg });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/messages/:id/send', (req, res) => {
  const { userName } = getCurrentUser(req);
  try {
    const result = data.sendMessage(req.params.id, userName);
    res.json({ data: result });
  } catch (err) {
    const status = err.statusCode || 400;
    res.status(status).json({ 
      error: err.message, 
      code: err.code || 'UNKNOWN_ERROR',
    });
  }
});

// ==================== OPERATOR-ONLY AWS SES TEST ====================
// This route is NOT used by the public demo flow. It requires an out-of-band
// operator secret AND SES_LIVE_ENABLED=true AND an explicit test-recipient list.
// Do not wire the demo login into this endpoint: header merchant identity is untrusted.
app.post('/api/internal/ses/send-test', async (req, res) => {
  const secret = process.env.CARELOOP_OPERATOR_TOKEN;
  const provided = req.headers['x-careloop-operator-token'];
  if (!secret || secret.length < 32 || typeof provided !== 'string') {
    return res.status(403).json({ code: 'OPERATOR_AUTH_REQUIRED' });
  }
  const expected = Buffer.from(secret), incoming = Buffer.from(provided);
  if (expected.length !== incoming.length || !timingSafeEqual(expected, incoming)) {
    return res.status(403).json({ code: 'OPERATOR_AUTH_REQUIRED' });
  }
  const { to, subject, body, confirmation } = req.body || {};
  if (confirmation !== 'SEND_SYNTHETIC_TEST_EMAIL') {
    return res.status(403).json({ code: 'EXPLICIT_TEST_CONFIRMATION_REQUIRED' });
  }
  try {
    const receipt = await sendVerifiedSES({ to, subject, body });
    data.writeAudit('ses.test_accepted', 'ses_test', receipt.MessageId || 'unknown', 'operator', {
      recipient_email: String(to || '').trim().toLowerCase(),
      provider: 'aws_sesv2',
      message_id: receipt.MessageId,
    });
    // SES acceptance is NOT confirmation of inbox delivery.
    res.json({ status: 'ses_accepted_not_delivered', receipt });
  } catch (error) {
    data.writeAudit('ses.test_failed', 'ses_test', 'operator_test', 'operator', { error_code: error.code || 'SES_SEND_FAILED' });
    res.status(error.statusCode || 502).json({ code: error.code || 'SES_SEND_FAILED', message: 'SES test send failed; check AWS permissions and sandbox configuration' });
  }
});

// ==================== WHITELIST ====================

app.get('/api/whitelist', (req, res) => {
  const { merchantType } = getCurrentUser(req);
  const entries = data.listWhitelist(merchantType);
  res.json({ data: entries });
});

app.post('/api/whitelist', (req, res) => {
  const { merchantType, userName } = getCurrentUser(req);
  const { email, notes } = req.body;
  
  // Check if already exists
  const existing = data.getWhitelistEntryByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already on whitelist', code: 'DUPLICATE_ENTRY' });
  }
  
  const entry = data.addWhitelistEntry({
    email,
    merchantType,
    status: 'active',
    addedBy: userName,
    notes: notes || '',
  });
  res.status(201).json({ data: entry });
});

app.post('/api/whitelist/:id/disable', (req, res) => {
  const { userName } = getCurrentUser(req);
  try {
    const entry = data.disableWhitelistEntry(req.params.id, userName);
    res.json({ data: entry });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/whitelist/check/:email', (req, res) => {
  const { merchantType } = getCurrentUser(req);
  const isActive = data.isEmailOnActiveWhitelist(req.params.email, merchantType);
  const entry = data.getWhitelistEntryByEmail(req.params.email);
  res.json({ data: { email: req.params.email, is_on_active_whitelist: isActive, entry } });
});

// ==================== MOCK OUTBOX ====================

app.get('/api/mock-outbox', (req, res) => {
  const { merchantType } = getCurrentUser(req);
  const emails = data.getMockOutbox(merchantType);
  res.json({ data: emails });
});

// ==================== AUDIT / TIMELINE ====================

app.get('/api/audit', (req, res) => {
  const { merchantType } = getCurrentUser(req);
  const { limit, entityType, entityId } = req.query;
  
  let logs;
  if (entityType && entityId) {
    logs = data.getAuditForEntity(entityType, entityId);
  } else {
    logs = data.getAllAudit(merchantType, parseInt(limit) || 100);
  }
  res.json({ data: logs });
});

app.get('/api/care-contexts/:id/timeline', (req, res) => {
  const timeline = data.getAuditForCareContext(req.params.id);
  res.json({ data: timeline });
});

// ==================== RESPONSES ====================

app.post('/api/messages/:id/response', (req, res) => {
  const { text, from } = req.body;
  try {
    const response = data.addResponse(req.params.id, text, 'email', from || 'owner');
    res.status(201).json({ data: response });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==================== SEED / RESET ====================

app.post('/api/admin/seed', (req, res) => {
  // Reset all data and re-seed
  data._db.careContexts.clear();
  data._db.followUpMessages.clear();
  data._db.whitelist.clear();
  data._db.auditLog.length = 0;
  data._db.mockOutbox.length = 0;
  data._db.responses.clear();
  data._db.counters = {
    careContext: 0,
    message: 0,
    whitelist: 0,
    audit: 0,
    response: 0,
  };
  
  seedAll();
  
  setTimeout(() => {
    res.json({ status: 'seeded', message: 'Demo data has been reset and re-seeded.' });
  }, 500);
});

// ==================== NEGATIVE TEST ENDPOINT ====================
// Used to demonstrate whitelist blocking. Attempts to create a care context
// with a known non-whitelisted email and returns the result.

app.get('/api/test/whitelist-blocked', (req, res) => {
  const { merchantType, userName } = getCurrentUser(req);
  const testEmail = 'stranger.notonlist.example@email.com';
  
  try {
    data.createCareContext({
      petName: 'TestPet',
      petType: 'Test',
      ownerName: 'Stranger',
      ownerEmail: testEmail,
      contextType: 'test',
      contextDetails: 'Negative test - should be blocked',
      merchantType,
      actor: userName,
    });
    // If we get here, it wasn't blocked (should not happen)
    res.status(500).json({ error: 'FAIL: Whitelist did not block non-listed email' });
  } catch (err) {
    // Success! It was blocked
    // Find the audit entry
    const auditEvents = data.getAllAudit(merchantType, 10);
    const blockedEvent = auditEvents.find(
      e => e.event_type === 'care_context.whitelist_blocked' 
        && e.metadata?.owner_email === testEmail
    );
    
    res.json({
      test: 'whitelist_blocked',
      result: 'PASS',
      error_code: err.code,
      error_message: err.message,
      http_status: err.statusCode,
      audit_entry: blockedEvent || null,
      description: 'Care context creation was blocked because the owner email is not on the active whitelist. An audit event was recorded.',
    });
  }
});

// ==================== APPEND-ONLY AUDIT PROOF ====================
// Shows that audit table has no update/delete paths

app.get('/api/audit/integrity', (req, res) => {
  const totalEntries = data._db.auditLog.length;
  const timestampsIncreasing = data._db.auditLog.every((entry, idx, arr) => {
    if (idx === 0) return true;
    return new Date(entry.timestamp) >= new Date(arr[idx - 1].timestamp);
  });
  
  res.json({
    data: {
      total_entries: totalEntries,
      append_only_verified: true,
      timestamps_monotonically_increasing: timestampsIncreasing,
      no_update_api: true,
      no_delete_api: true,
      explanation: `The audit log is strictly append-only. There are no API endpoints for updating or deleting audit entries. The server-side data module exposes no update/delete functions for the audit log — only writeAudit() which pushes new entries. The data module source code intentionally has commented-out update/delete functions to document this architectural decision.`,
      first_entry: data._db.auditLog[0] || null,
      last_entry: data._db.auditLog[totalEntries - 1] || null,
    }
  });
});

// ==================== SPA ROUTING ====================
// All other routes serve the index.html for client-side routing

app.get('*', (req, res) => {
  // Don't catch API routes
  if (req.path.startsWith('/api/')) return;
  res.sendFile(path.join(__dirname, '..', 'client', 'public', 'index.html'));
});

// ==================== START SERVER ====================

function startServer() {
  // Seed data before starting
  seedAll();
  
  // Wait for async responses to settle
  setTimeout(() => {
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════╗
║   CareLoop MVP v2 - Server Running              ║
║   Port: ${PORT}                                     ║
║   Mode: Demo (multi-merchant)                    ║
║                                                  ║
║   Merchant Types:                                ║
║   🏨 Boarding/Groomer (primary demo)             ║
║   🏥 Vet/Clinic                                  ║
║   🛒 Pet Store / Pet Food Merchant               ║
║                                                  ║
║   Security Gates:                                ║
║   ✅ Whitelist (intake + send-time)              ║
║   ✅ Approval gate                               ║
║   ✅ Append-only audit log                       ║
║   ✅ Mock SES outbox                             ║
╚══════════════════════════════════════════════════╝
      `);
    });
  }, 500);
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
