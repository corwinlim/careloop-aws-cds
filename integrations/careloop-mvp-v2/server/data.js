/**
 * CareLoop MVP v2 - Backend Data Layer
 * 
 * Database Architecture:
 * - All entities stored in-memory (MVP demo, swap for PostgreSQL in production)
 * - Append-only audit log: NO update/delete paths exist on audit table
 * - Whitelist enforced at service layer (not just frontend)
 * - Approval gate: messages cannot be sent without approved status
 */

const { EventEmitter } = require('events');

// ==================== DATA STORES ====================

const db = {
  // Core entities
  careContexts: new Map(),       // id -> CareContext
  followUpMessages: new Map(),   // id -> FollowUpMessage
  whitelist: new Map(),          // id -> WhitelistEntry (email as key too)
  auditLog: [],                  // append-only array
  mockOutbox: [],                // append-only array of sent mock emails
  responses: new Map(),          // id -> Response
  merchantSettings: new Map(),   // merchantType -> settings
  
  // Counters
  counters: {
    careContext: 0,
    message: 0,
    whitelist: 0,
    audit: 0,
    response: 0,
  },
};

// Email -> whitelist entry index
const whitelistEmailIndex = new Map();

// Event emitter for audit hooks
const auditEmitter = new EventEmitter();
auditEmitter.setMaxListeners(20);

// ==================== ID GENERATION ====================

function nextId(prefix, counterKey) {
  db.counters[counterKey] += 1;
  return `${prefix}_${String(db.counters[counterKey]).padStart(4, '0')}`;
}

// ==================== AUDIT LOG (APPEND-ONLY) ====================

/**
 * Write an audit entry. APPEND-ONLY — no update or delete function exists.
 * This is called synchronously within state-changing operations.
 * 
 * @param {string} eventType - e.g. 'care_context.created', 'message.approved', 'message.whitelist_blocked'
 * @param {string} entityType - 'care_context' | 'message' | 'whitelist' | 'audit'
 * @param {string} entityId 
 * @param {string} actor - who performed the action
 * @param {object} metadata - additional context (from_state, to_state, reason, etc.)
 */
function writeAudit(eventType, entityType, entityId, actor = 'system', metadata = {}) {
  const entry = {
    id: nextId('aud', 'audit'),
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: JSON.parse(JSON.stringify(metadata)), // deep copy
  };
  db.auditLog.push(entry);
  auditEmitter.emit('audit:created', entry);
  return entry;
}

// Intentionally NOT exported: no update/delete functions for audit log
// These are commented out to document the architectural decision:
// function updateAudit() { throw new Error('Append-only audit cannot be updated'); }
// function deleteAudit() { throw new Error('Append-only audit cannot be deleted'); }

// ==================== WHITELIST SERVICE ====================

function addWhitelistEntry({ email, merchantType, status = 'active', addedBy = 'system', notes = '' }) {
  const id = nextId('wl', 'whitelist');
  const entry = {
    id,
    email: email.toLowerCase().trim(),
    merchant_type: merchantType,
    status, // 'active' | 'disabled'
    added_by: addedBy,
    added_at: new Date().toISOString(),
    notes,
  };
  db.whitelist.set(id, entry);
  whitelistEmailIndex.set(entry.email, id);
  writeAudit('whitelist.entry_added', 'whitelist', id, addedBy, { email: entry.email, merchant_type: merchantType });
  return entry;
}

function disableWhitelistEntry(id, actor = 'system') {
  const entry = db.whitelist.get(id);
  if (!entry) throw new Error('Whitelist entry not found');
  if (entry.status === 'disabled') return entry;
  entry.status = 'disabled';
  entry.disabled_at = new Date().toISOString();
  entry.disabled_by = actor;
  writeAudit('whitelist.entry_disabled', 'whitelist', id, actor, { email: entry.email });
  return entry;
}

function isEmailOnActiveWhitelist(email, merchantType = null) {
  const normalized = email.toLowerCase().trim();
  const id = whitelistEmailIndex.get(normalized);
  if (!id) return false;
  const entry = db.whitelist.get(id);
  if (!entry || entry.status !== 'active') return false;
  if (merchantType && entry.merchant_type !== merchantType) return false;
  return true;
}

function getWhitelistEntryByEmail(email) {
  const normalized = email.toLowerCase().trim();
  const id = whitelistEmailIndex.get(normalized);
  if (!id) return null;
  return db.whitelist.get(id) || null;
}

function listWhitelist(merchantType = null) {
  const entries = Array.from(db.whitelist.values());
  if (merchantType) return entries.filter(e => e.merchant_type === merchantType);
  return entries;
}

// ==================== CARE CONTEXT SERVICE ====================

/**
 * Create a care context. ENFORCES WHITELIST at intake.
 * If owner email is not on active whitelist, creation is BLOCKED
 * and a whitelist_blocked audit event is written.
 */
function createCareContext({ 
  petName, petType, ownerName, ownerEmail, 
  contextType, contextDetails, merchantType, 
  riskLevel = 'normal', actor = 'system' 
}) {
  // WHITELIST CHECK 1: Intake gate
  if (!isEmailOnActiveWhitelist(ownerEmail, merchantType)) {
    // Block creation + write audit
    const tempId = `blocked_${Date.now()}`;
    writeAudit(
      'care_context.whitelist_blocked',
      'care_context',
      tempId,
      actor,
      {
        reason: 'RECIPIENT_NOT_WHITELISTED',
        owner_email: ownerEmail,
        merchant_type: merchantType,
        pet_name: petName,
        context_type: contextType,
        check_point: 'intake',
        blocked_action: 'create_care_context',
      }
    );
    const error = new Error('RECIPIENT_NOT_WHITELISTED: Owner email is not on the active whitelist.');
    error.code = 'RECIPIENT_NOT_WHITELISTED';
    error.statusCode = 403;
    throw error;
  }

  const id = nextId('ctx', 'careContext');
  const now = new Date().toISOString();
  const ctx = {
    id,
    pet_name: petName,
    pet_type: petType,
    owner_name: ownerName,
    owner_email: ownerEmail.toLowerCase().trim(),
    context_type: contextType,
    context_details: contextDetails,
    merchant_type: merchantType,
    risk_level: riskLevel,
    status: 'active',
    created_at: now,
    updated_at: now,
    whitelist_status: 'active', // confirmed at creation
  };
  db.careContexts.set(id, ctx);
  writeAudit('care_context.created', 'care_context', id, actor, {
    from_state: null,
    to_state: 'active',
    merchant_type: merchantType,
  });
  return ctx;
}

function getCareContext(id) {
  return db.careContexts.get(id) || null;
}

function listCareContexts(merchantType = null) {
  const ctxs = Array.from(db.careContexts.values());
  if (merchantType) return ctxs.filter(c => c.merchant_type === merchantType);
  return ctxs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getCareContextWhitelistStatus(ctxId) {
  const ctx = getCareContext(ctxId);
  if (!ctx) return { status: 'unknown', entry: null };
  const entry = getWhitelistEntryByEmail(ctx.owner_email);
  return {
    status: entry ? entry.status : 'not_found',
    entry,
  };
}

// ==================== FOLLOW-UP MESSAGE SERVICE ====================

const MESSAGE_STATES = [
  'suggested',
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'sending',
  'sent',
  'send_failed',
  'send_blocked',
  'awaiting_response',
  'responded',
  'resolved',
];

function createFollowUpMessage({
  careContextId,
  title,
  body,
  templateId,
  riskFlags = [],
  merchantType,
  actor = 'system',
}) {
  const ctx = getCareContext(careContextId);
  if (!ctx) throw new Error('Care context not found');

  const id = nextId('msg', 'message');
  const now = new Date().toISOString();
  const msg = {
    id,
    care_context_id: careContextId,
    title,
    body,
    template_id: templateId,
    risk_flags: riskFlags,
    merchant_type: merchantType,
    status: 'draft',
    approval_id: null,
    approval_by: null,
    approval_at: null,
    rejection_reason: null,
    rejected_by: null,
    rejected_at: null,
    sent_at: null,
    sender: actor,
    created_at: now,
    updated_at: now,
  };
  db.followUpMessages.set(id, msg);
  writeAudit('follow_up.draft_created', 'message', id, actor, {
    from_state: null,
    to_state: 'draft',
    care_context_id: careContextId,
  });
  return msg;
}

function getMessage(id) {
  return db.followUpMessages.get(id) || null;
}

function listMessages(merchantType = null, status = null) {
  let msgs = Array.from(db.followUpMessages.values());
  if (merchantType) msgs = msgs.filter(m => m.merchant_type === merchantType);
  if (status) msgs = msgs.filter(m => m.status === status);
  return msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function submitForApproval(messageId, actor = 'system') {
  const msg = getMessage(messageId);
  if (!msg) throw new Error('Message not found');
  if (msg.status !== 'draft') {
    throw new Error(`Cannot submit message in state: ${msg.status}`);
  }
  const fromState = msg.status;
  msg.status = 'pending_approval';
  msg.updated_at = new Date().toISOString();
  writeAudit('follow_up.submitted_for_approval', 'message', messageId, actor, {
    from_state: fromState,
    to_state: 'pending_approval',
  });
  return msg;
}

function approveMessage(messageId, actor = 'system', approvalNote = '') {
  const msg = getMessage(messageId);
  if (!msg) throw new Error('Message not found');
  if (msg.status !== 'pending_approval') {
    throw new Error(`Cannot approve message in state: ${msg.status}`);
  }
  const fromState = msg.status;
  msg.status = 'approved';
  msg.approval_id = `appr_${Date.now()}`;
  msg.approval_by = actor;
  msg.approval_at = new Date().toISOString();
  msg.updated_at = msg.approval_at;
  writeAudit('follow_up.approved', 'message', messageId, actor, {
    from_state: fromState,
    to_state: 'approved',
    approval_id: msg.approval_id,
    approval_note: approvalNote,
  });
  return msg;
}

function rejectMessage(messageId, actor = 'system', reason = 'No reason provided') {
  const msg = getMessage(messageId);
  if (!msg) throw new Error('Message not found');
  if (msg.status !== 'pending_approval' && msg.status !== 'draft') {
    throw new Error(`Cannot reject message in state: ${msg.status}`);
  }
  const fromState = msg.status;
  msg.status = 'rejected';
  msg.rejection_reason = reason;
  msg.rejected_by = actor;
  msg.rejected_at = new Date().toISOString();
  msg.updated_at = msg.rejected_at;
  writeAudit('follow_up.rejected', 'message', messageId, actor, {
    from_state: fromState,
    to_state: 'rejected',
    reason,
  });
  return msg;
}

/**
 * Send a message. ENFORCES:
 * 1. Approval gate: message must be in 'approved' state
 * 2. Whitelist check: recipient must be on active whitelist at send time
 * Both gates write audit events on failure.
 */
function sendMessage(messageId, actor = 'system') {
  const msg = getMessage(messageId);
  if (!msg) throw new Error('Message not found');

  // APPROVAL GATE: must be approved
  if (msg.status !== 'approved') {
    writeAudit('follow_up.send_blocked_approval', 'message', messageId, actor, {
      reason: 'NOT_APPROVED',
      current_status: msg.status,
      blocked_action: 'send_message',
    });
    const error = new Error('MESSAGE_NOT_APPROVED: Message must be approved before sending.');
    error.code = 'MESSAGE_NOT_APPROVED';
    error.statusCode = 403;
    throw error;
  }

  // Get care context for recipient email
  const ctx = getCareContext(msg.care_context_id);
  if (!ctx) throw new Error('Care context not found');

  // WHITELIST CHECK 2: Send-time gate
  if (!isEmailOnActiveWhitelist(ctx.owner_email, ctx.merchant_type)) {
    const fromState = msg.status;
    msg.status = 'send_blocked';
    msg.updated_at = new Date().toISOString();
    writeAudit('follow_up.whitelist_blocked', 'message', messageId, actor, {
      reason: 'RECIPIENT_NOT_WHITELISTED',
      from_state: fromState,
      to_state: 'send_blocked',
      recipient_email: ctx.owner_email,
      merchant_type: ctx.merchant_type,
      check_point: 'send_time',
      blocked_action: 'send_message',
    });
    const error = new Error('RECIPIENT_NOT_WHITELISTED: Recipient is not on the active whitelist at send time.');
    error.code = 'RECIPIENT_NOT_WHITELISTED';
    error.statusCode = 403;
    throw error;
  }

  // All gates passed — proceed with send (Mock SES)
  const fromState = msg.status;
  msg.status = 'sending';
  msg.updated_at = new Date().toISOString();

  // Mock SES: write to outbox (simulating async send)
  const mockEmail = {
    id: `mock_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message_id: messageId,
    care_context_id: ctx.id,
    to: ctx.owner_email,
    from: `care@careloop.app`,
    subject: msg.title,
    body: msg.body,
    merchant_type: ctx.merchant_type,
    sent_at: new Date().toISOString(),
    status: 'delivered', // mock always succeeds
  };
  db.mockOutbox.push(mockEmail);

  // Update message state
  msg.status = 'sent';
  msg.sent_at = new Date().toISOString();
  msg.updated_at = msg.sent_at;

  writeAudit('follow_up.sent', 'message', messageId, actor, {
    from_state: fromState,
    to_state: 'sent',
    recipient_email: ctx.owner_email,
    mock_email_id: mockEmail.id,
  });

  // Transition to awaiting_response (for demo, immediately after send)
  setTimeout(() => {
    const m = getMessage(messageId);
    if (m && m.status === 'sent') {
      m.status = 'awaiting_response';
      m.updated_at = new Date().toISOString();
      writeAudit('follow_up.awaiting_response', 'message', messageId, 'system', {
        from_state: 'sent',
        to_state: 'awaiting_response',
      });
    }
  }, 100);

  return { message: msg, mock_email: mockEmail };
}

function getMockOutbox(merchantType = null) {
  let outbox = [...db.mockOutbox];
  if (merchantType) outbox = outbox.filter(e => e.merchant_type === merchantType);
  return outbox.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
}

// ==================== RESPONSE SERVICE ====================

function addResponse(messageId, responseText, responseType = 'email', actor = 'owner') {
  const msg = getMessage(messageId);
  if (!msg) throw new Error('Message not found');
  
  const ctx = getCareContext(msg.care_context_id);
  if (!ctx) throw new Error('Care context not found');

  const id = nextId('resp', 'response');
  const now = new Date().toISOString();
  const response = {
    id,
    message_id: messageId,
    care_context_id: msg.care_context_id,
    response_text: responseText,
    response_type: responseType,
    from: ctx.owner_email,
    received_at: now,
    sentiment: analyzeResponseSentiment(responseText),
  };
  db.responses.set(id, response);

  // Update message status
  const fromState = msg.status;
  msg.status = 'responded';
  msg.updated_at = now;

  writeAudit('response.received', 'message', messageId, actor, {
    from_state: fromState,
    to_state: 'responded',
    response_id: id,
    sentiment: response.sentiment,
  });

  return response;
}

function analyzeResponseSentiment(text) {
  const lower = text.toLowerCase();
  if (/still (an issue|a problem|bad|worse)|not better|no improvement|persists|continued|keeps|still scratching|still having|won't|can't|abnormal|not eating|poor/.test(lower)) {
    return 'concerning';
  }
  if (/better|improved|good|great|fine|okay|resolved|back to normal|doing well|happy|eating well/.test(lower)) {
    return 'positive';
  }
  return 'neutral';
}

function getResponsesForContext(ctxId) {
  return Array.from(db.responses.values())
    .filter(r => r.care_context_id === ctxId)
    .sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
}

function getResponsesForMessage(messageId) {
  return Array.from(db.responses.values())
    .filter(r => r.message_id === messageId)
    .sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
}

// ==================== AUDIT READ ====================

function getAuditForEntity(entityType, entityId) {
  return db.auditLog
    .filter(a => a.entity_type === entityType && a.entity_id === entityId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getAuditForCareContext(ctxId) {
  const msgIds = listMessages().filter(m => m.care_context_id === ctxId).map(m => m.id);
  return db.auditLog
    .filter(a => 
      (a.entity_type === 'care_context' && a.entity_id === ctxId) ||
      (a.entity_type === 'message' && msgIds.includes(a.entity_id))
    )
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function getAllAudit(merchantType = null, limit = 100) {
  let logs = [...db.auditLog];
  if (merchantType) {
    // Filter by merchant type through entity lookup or metadata
    logs = logs.filter(entry => {
      // Check metadata first (some blocked entries have merchant_type in metadata)
      if (entry.metadata && entry.metadata.merchant_type === merchantType) {
        return true;
      }
      if (entry.entity_type === 'care_context') {
        const ctx = db.careContexts.get(entry.entity_id);
        return ctx && ctx.merchant_type === merchantType;
      }
      if (entry.entity_type === 'message') {
        const msg = db.followUpMessages.get(entry.entity_id);
        return msg && msg.merchant_type === merchantType;
      }
      if (entry.entity_type === 'whitelist') {
        const wl = db.whitelist.get(entry.entity_id);
        return wl && wl.merchant_type === merchantType;
      }
      return false;
    });
  }
  return logs
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

// ==================== DASHBOARD STATS ====================

function getDashboardStats(merchantType = null) {
  const ctxs = listCareContexts(merchantType);
  const msgs = listMessages(merchantType);
  const outbox = getMockOutbox(merchantType);
  const wl = listWhitelist(merchantType);
  const pendingApproval = msgs.filter(m => m.status === 'pending_approval').length;
  const sentCount = outbox.length; // Count actual sent (mock) emails
  const activeCtxs = ctxs.filter(c => c.status === 'active').length;
  const highRisk = ctxs.filter(c => c.risk_level === 'high').length;

  return {
    total_care_contexts: ctxs.length,
    active_care_contexts: activeCtxs,
    pending_approval: pendingApproval,
    messages_sent: sentCount,
    awaiting_response: msgs.filter(m => m.status === 'awaiting_response' || m.status === 'responded').length,
    whitelist_entries: wl.filter(w => w.status === 'active').length,
    high_risk_contexts: highRisk,
    total_audit_events: getAllAudit(merchantType, 10000).length,
  };
}

// ==================== EXPORTS ====================

module.exports = {
  // Stores (for debugging/testing only - not exposed via API)
  _db: db,

  // Whitelist
  addWhitelistEntry,
  disableWhitelistEntry,
  isEmailOnActiveWhitelist,
  getWhitelistEntryByEmail,
  listWhitelist,

  // Care contexts
  createCareContext,
  getCareContext,
  listCareContexts,
  getCareContextWhitelistStatus,

  // Messages
  createFollowUpMessage,
  getMessage,
  listMessages,
  submitForApproval,
  approveMessage,
  rejectMessage,
  sendMessage,
  getMockOutbox,

  // Responses
  addResponse,
  getResponsesForContext,
  getResponsesForMessage,

  // Audit (read-only access)
  getAuditForEntity,
  getAuditForCareContext,
  getAllAudit,

  // Dashboard
  getDashboardStats,

  // Constants
  MESSAGE_STATES,
  writeAudit, // exported for seed script
};
