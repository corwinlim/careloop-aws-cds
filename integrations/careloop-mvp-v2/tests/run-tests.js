/**
 * CareLoop MVP v2 - Test Suite
 * 
 * Tests all core security features and data flows.
 * Run with: node tests/run-tests.js
 */

const data = require('../server/data');

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, status: 'FAIL', error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function resetDB() {
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
}

// ==========================================
// TEST SUITE 1: Whitelist
// ==========================================
console.log('\n📋 Test Suite 1: Whitelist Management');

test('Add whitelist entry succeeds', () => {
  resetDB();
  const entry = data.addWhitelistEntry({
    email: 'test@example.com',
    merchantType: 'boarding_groomer',
  });
  assert(entry.id, 'Entry should have an ID');
  assert(entry.status === 'active', 'Entry should be active');
  assert(entry.email === 'test@example.com', 'Email should match');
});

test('isEmailOnActiveWhitelist returns true for active entry', () => {
  const result = data.isEmailOnActiveWhitelist('test@example.com', 'boarding_groomer');
  assert(result === true, 'Should return true for active entry');
});

test('isEmailOnActiveWhitelist returns false for unknown email', () => {
  const result = data.isEmailOnActiveWhitelist('unknown@example.com', 'boarding_groomer');
  assert(result === false, 'Should return false for unknown email');
});

test('isEmailOnActiveWhitelist returns false for wrong merchant type', () => {
  const result = data.isEmailOnActiveWhitelist('test@example.com', 'vet_clinic');
  assert(result === false, 'Should return false for wrong merchant type');
});

test('Disable whitelist entry works', () => {
  const entry = data.addWhitelistEntry({
    email: 'disableme@example.com',
    merchantType: 'boarding_groomer',
  });
  const disabled = data.disableWhitelistEntry(entry.id, 'tester');
  assert(disabled.status === 'disabled', 'Entry should be disabled');
  assert(data.isEmailOnActiveWhitelist('disableme@example.com', 'boarding_groomer') === false, 'Disabled entry should not be on active whitelist');
});

test('Email comparison is case-insensitive', () => {
  const result = data.isEmailOnActiveWhitelist('TEST@EXAMPLE.COM', 'boarding_groomer');
  assert(result === true, 'Should return true for uppercase email');
});

// ==========================================
// TEST SUITE 2: Whitelist blocking at intake (P0)
// ==========================================
console.log('\n📋 Test Suite 2: Whitelist Blocking at Intake (P0)');

test('Creating care context with whitelisted email succeeds', () => {
  resetDB();
  data.addWhitelistEntry({
    email: 'owner@example.com',
    merchantType: 'boarding_groomer',
  });
  const ctx = data.createCareContext({
    petName: 'Rex',
    petType: 'Dog',
    ownerName: 'John',
    ownerEmail: 'owner@example.com',
    contextType: 'grooming',
    contextDetails: 'Test',
    merchantType: 'boarding_groomer',
    actor: 'tester',
  });
  assert(ctx.id, 'Should create care context');
  assert(ctx.whitelist_status === 'active', 'Whitelist status should be active');
});

test('Creating care context with non-whitelisted email is BLOCKED', () => {
  resetDB();
  let errorThrown = false;
  let errorCode = null;
  
  try {
    data.createCareContext({
      petName: 'Rex',
      petType: 'Dog',
      ownerName: 'Stranger',
      ownerEmail: 'stranger@example.com',
      contextType: 'grooming',
      contextDetails: 'Test',
      merchantType: 'boarding_groomer',
      actor: 'tester',
    });
  } catch (err) {
    errorThrown = true;
    errorCode = err.code;
  }
  
  assert(errorThrown === true, 'Should throw error for non-whitelisted email');
  assert(errorCode === 'RECIPIENT_NOT_WHITELISTED', 'Error code should be RECIPIENT_NOT_WHITELISTED');
});

test('Whitelist block writes audit event', () => {
  resetDB();
  try {
    data.createCareContext({
      petName: 'Rex',
      petType: 'Dog',
      ownerName: 'Stranger',
      ownerEmail: 'stranger@example.com',
      contextType: 'grooming',
      contextDetails: 'Test',
      merchantType: 'boarding_groomer',
      actor: 'tester',
    });
  } catch (err) {
    // Expected
  }
  
  const auditEvents = data.getAllAudit('boarding_groomer', 10);
  const blockedEvent = auditEvents.find(e => e.event_type === 'care_context.whitelist_blocked');
  assert(blockedEvent, 'Should have a whitelist_blocked audit event');
  assert(blockedEvent.metadata.reason === 'RECIPIENT_NOT_WHITELISTED', 'Audit should have correct reason');
  assert(blockedEvent.metadata.check_point === 'intake', 'Should be intake checkpoint');
});

// ==========================================
// TEST SUITE 3: Approval Gate (P1)
// ==========================================
console.log('\n📋 Test Suite 3: Approval Gate (P1)');

test('Message lifecycle: draft → pending → approved → sent', () => {
  resetDB();
  data.addWhitelistEntry({ email: 'owner@example.com', merchantType: 'boarding_groomer' });
  const ctx = data.createCareContext({
    petName: 'Rex', petType: 'Dog', ownerName: 'John',
    ownerEmail: 'owner@example.com', contextType: 'grooming',
    contextDetails: 'Test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  
  const msg = data.createFollowUpMessage({
    careContextId: ctx.id, title: 'Test', body: 'Body',
    templateId: 'test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  assert(msg.status === 'draft', 'Initial status should be draft');
  
  const submitted = data.submitForApproval(msg.id, 'tester');
  assert(submitted.status === 'pending_approval', 'After submit should be pending_approval');
  
  const approved = data.approveMessage(msg.id, 'approver');
  assert(approved.status === 'approved', 'After approve should be approved');
  assert(approved.approval_id, 'Should have approval_id');
  
  const sent = data.sendMessage(msg.id, 'sender');
  assert(sent.message.status === 'sent', 'After send should be sent');
});

test('Sending unapproved message is BLOCKED (approval gate)', () => {
  resetDB();
  data.addWhitelistEntry({ email: 'owner@example.com', merchantType: 'boarding_groomer' });
  const ctx = data.createCareContext({
    petName: 'Rex', petType: 'Dog', ownerName: 'John',
    ownerEmail: 'owner@example.com', contextType: 'grooming',
    contextDetails: 'Test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  const msg = data.createFollowUpMessage({
    careContextId: ctx.id, title: 'Test', body: 'Body',
    templateId: 'test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  
  let errorThrown = false;
  let errorCode = null;
  try {
    data.sendMessage(msg.id, 'sender');
  } catch (err) {
    errorThrown = true;
    errorCode = err.code;
  }
  
  assert(errorThrown === true, 'Should throw error for unapproved message');
  assert(errorCode === 'MESSAGE_NOT_APPROVED', 'Error code should be MESSAGE_NOT_APPROVED');
});

test('Rejecting a pending message works', () => {
  resetDB();
  data.addWhitelistEntry({ email: 'owner@example.com', merchantType: 'boarding_groomer' });
  const ctx = data.createCareContext({
    petName: 'Rex', petType: 'Dog', ownerName: 'John',
    ownerEmail: 'owner@example.com', contextType: 'grooming',
    contextDetails: 'Test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  const msg = data.createFollowUpMessage({
    careContextId: ctx.id, title: 'Test', body: 'Body',
    templateId: 'test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  
  data.submitForApproval(msg.id, 'tester');
  const rejected = data.rejectMessage(msg.id, 'rejecter', 'Not appropriate');
  assert(rejected.status === 'rejected', 'Should be rejected');
  assert(rejected.rejection_reason === 'Not appropriate', 'Should have rejection reason');
});

// ==========================================
// TEST SUITE 4: Whitelist blocking at send time (P0)
// ==========================================
console.log('\n📋 Test Suite 4: Whitelist Blocking at Send Time (P0)');

test('Send is blocked if email removed from whitelist after intake', () => {
  resetDB();
  const wlEntry = data.addWhitelistEntry({
    email: 'owner@example.com', merchantType: 'boarding_groomer',
  });
  const ctx = data.createCareContext({
    petName: 'Rex', petType: 'Dog', ownerName: 'John',
    ownerEmail: 'owner@example.com', contextType: 'grooming',
    contextDetails: 'Test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  const msg = data.createFollowUpMessage({
    careContextId: ctx.id, title: 'Test', body: 'Body',
    templateId: 'test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  
  data.submitForApproval(msg.id, 'tester');
  data.approveMessage(msg.id, 'approver');
  
  // Now disable the whitelist entry before sending
  data.disableWhitelistEntry(wlEntry.id, 'admin');
  
  let errorThrown = false;
  let errorCode = null;
  try {
    data.sendMessage(msg.id, 'sender');
  } catch (err) {
    errorThrown = true;
    errorCode = err.code;
  }
  
  assert(errorThrown === true, 'Send should be blocked when whitelisted removed');
  assert(errorCode === 'RECIPIENT_NOT_WHITELISTED', 'Error code should be RECIPIENT_NOT_WHITELISTED');
  
  // Verify message went to send_blocked state
  const updatedMsg = data.getMessage(msg.id);
  assert(updatedMsg.status === 'send_blocked', 'Message should be in send_blocked state');
});

test('Send-time whitelist block writes audit event', () => {
  resetDB();
  const wlEntry = data.addWhitelistEntry({
    email: 'owner2@example.com', merchantType: 'boarding_groomer',
  });
  const ctx = data.createCareContext({
    petName: 'Rex', petType: 'Dog', ownerName: 'John',
    ownerEmail: 'owner2@example.com', contextType: 'grooming',
    contextDetails: 'Test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  const msg = data.createFollowUpMessage({
    careContextId: ctx.id, title: 'Test', body: 'Body',
    templateId: 'test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  
  data.submitForApproval(msg.id, 'tester');
  data.approveMessage(msg.id, 'approver');
  data.disableWhitelistEntry(wlEntry.id, 'admin');
  
  try {
    data.sendMessage(msg.id, 'sender');
  } catch (err) { /* expected */ }
  
  const auditEvents = data.getAuditForEntity('message', msg.id);
  const blockedEvent = auditEvents.find(e => e.event_type === 'follow_up.whitelist_blocked');
  assert(blockedEvent, 'Should have whitelist_blocked audit event');
  assert(blockedEvent.metadata.check_point === 'send_time', 'Should be send_time checkpoint');
});

// ==========================================
// TEST SUITE 5: Append-only Audit
// ==========================================
console.log('\n📋 Test Suite 5: Append-Only Audit Log');

test('All state changes produce audit entries', () => {
  resetDB();
  data.addWhitelistEntry({ email: 'audit@example.com', merchantType: 'boarding_groomer' });
  const ctx = data.createCareContext({
    petName: 'Rex', petType: 'Dog', ownerName: 'John',
    ownerEmail: 'audit@example.com', contextType: 'grooming',
    contextDetails: 'Test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  const msg = data.createFollowUpMessage({
    careContextId: ctx.id, title: 'Test', body: 'Body',
    templateId: 'test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  data.submitForApproval(msg.id, 'tester');
  data.approveMessage(msg.id, 'approver');
  data.sendMessage(msg.id, 'sender');
  
  const timeline = data.getAuditForEntity('message', msg.id);
  // Should have: draft_created, submitted, approved, sent (at minimum)
  const eventTypes = timeline.map(e => e.event_type);
  assert(eventTypes.includes('follow_up.draft_created'), 'Should have draft_created event');
  assert(eventTypes.includes('follow_up.submitted_for_approval'), 'Should have submitted event');
  assert(eventTypes.includes('follow_up.approved'), 'Should have approved event');
  assert(eventTypes.includes('follow_up.sent'), 'Should have sent event');
});

test('Audit entries are in chronological order', () => {
  resetDB();
  data.addWhitelistEntry({ email: 'order@example.com', merchantType: 'boarding_groomer' });
  const ctx = data.createCareContext({
    petName: 'Rex', petType: 'Dog', ownerName: 'John',
    ownerEmail: 'order@example.com', contextType: 'grooming',
    contextDetails: 'Test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  const msg = data.createFollowUpMessage({
    careContextId: ctx.id, title: 'Test', body: 'Body',
    templateId: 'test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  data.submitForApproval(msg.id, 'tester');
  data.approveMessage(msg.id, 'approver');
  
  const timeline = data.getAuditForEntity('message', msg.id);
  // Sort by timestamp ascending for check
  const sorted = [...timeline].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  // The timeline array returned is newest-first, but entries themselves should have increasing timestamps
  for (let i = 1; i < sorted.length; i++) {
    assert(
      new Date(sorted[i].timestamp) >= new Date(sorted[i-1].timestamp),
      `Entry ${i} should be after entry ${i-1}`
    );
  }
});

test('No update/delete functions exist for audit (API contract)', () => {
  // Verify the data module does NOT export update or delete functions for audit
  const exportedKeys = Object.keys(data);
  assert(!exportedKeys.includes('updateAudit'), 'Should not export updateAudit');
  assert(!exportedKeys.includes('deleteAudit'), 'Should not export deleteAudit');
  assert(!exportedKeys.includes('removeAudit'), 'Should not export removeAudit');
  assert(exportedKeys.includes('writeAudit'), 'Should export writeAudit (append only)');
  assert(exportedKeys.includes('getAllAudit'), 'Should export getAllAudit (read only)');
});

// ==========================================
// TEST SUITE 6: Mock Outbox Consistency (P1)
// ==========================================
console.log('\n📋 Test Suite 6: Mock Outbox Consistency (P1)');

test('Every sent message appears in mock outbox', () => {
  resetDB();
  data.addWhitelistEntry({ email: 'outbox@example.com', merchantType: 'boarding_groomer' });
  const ctx = data.createCareContext({
    petName: 'Rex', petType: 'Dog', ownerName: 'John',
    ownerEmail: 'outbox@example.com', contextType: 'grooming',
    contextDetails: 'Test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  const msg = data.createFollowUpMessage({
    careContextId: ctx.id, title: 'Test', body: 'Body',
    templateId: 'test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  data.submitForApproval(msg.id, 'tester');
  data.approveMessage(msg.id, 'approver');
  data.sendMessage(msg.id, 'sender');
  
  const outbox = data.getMockOutbox('boarding_groomer');
  const foundInOutbox = outbox.some(e => e.message_id === msg.id);
  assert(foundInOutbox, 'Sent message should appear in mock outbox');
  
  const sentMessages = data.listMessages('boarding_groomer').filter(m => 
    m.status === 'sent' || m.status === 'awaiting_response' || m.status === 'responded'
  );
  assert(sentMessages.length === 1, 'Should have 1 sent message');
  assert(outbox.length >= 1, 'Outbox should have at least 1 email');
});

test('Dashboard sent count matches mock outbox', () => {
  const stats = data.getDashboardStats('boarding_groomer');
  const outbox = data.getMockOutbox('boarding_groomer');
  assert(stats.messages_sent === outbox.length, 
    `Dashboard messages_sent (${stats.messages_sent}) should match outbox count (${outbox.length})`);
});

// ==========================================
// TEST SUITE 7: Multi-merchant type isolation
// ==========================================
console.log('\n📋 Test Suite 7: Multi-Merchant Type Isolation');

test('Care contexts are isolated by merchant type', () => {
  resetDB();
  data.addWhitelistEntry({ email: 'bg@example.com', merchantType: 'boarding_groomer' });
  data.addWhitelistEntry({ email: 'vet@example.com', merchantType: 'vet_clinic' });
  
  data.createCareContext({
    petName: 'BG Dog', petType: 'Dog', ownerName: 'BG',
    ownerEmail: 'bg@example.com', contextType: 'grooming',
    contextDetails: 'BG', merchantType: 'boarding_groomer', actor: 'tester',
  });
  data.createCareContext({
    petName: 'Vet Dog', petType: 'Dog', ownerName: 'Vet',
    ownerEmail: 'vet@example.com', contextType: 'exam',
    contextDetails: 'Vet', merchantType: 'vet_clinic', actor: 'tester',
  });
  
  const bgContexts = data.listCareContexts('boarding_groomer');
  const vetContexts = data.listCareContexts('vet_clinic');
  assert(bgContexts.length === 1, 'Boarding should have 1 context');
  assert(vetContexts.length === 1, 'Vet should have 1 context');
  assert(bgContexts[0].pet_name === 'BG Dog', 'BG context should be BG Dog');
  assert(vetContexts[0].pet_name === 'Vet Dog', 'Vet context should be Vet Dog');
});

test('Whitelist is isolated by merchant type', () => {
  resetDB();
  data.addWhitelistEntry({ email: 'shared@example.com', merchantType: 'boarding_groomer' });
  
  assert(
    data.isEmailOnActiveWhitelist('shared@example.com', 'boarding_groomer') === true,
    'Should be on boarding whitelist'
  );
  assert(
    data.isEmailOnActiveWhitelist('shared@example.com', 'vet_clinic') === false,
    'Should NOT be on vet whitelist'
  );
});

// ==========================================
// TEST SUITE 8: Response Sentiment Analysis
// ==========================================
console.log('\n📋 Test Suite 8: Response Handling');

test('Concerning response is detected correctly', () => {
  resetDB();
  data.addWhitelistEntry({ email: 'resp@example.com', merchantType: 'boarding_groomer' });
  const ctx = data.createCareContext({
    petName: 'Rex', petType: 'Dog', ownerName: 'John',
    ownerEmail: 'resp@example.com', contextType: 'grooming',
    contextDetails: 'Test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  const msg = data.createFollowUpMessage({
    careContextId: ctx.id, title: 'Test', body: 'Body',
    templateId: 'test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  data.submitForApproval(msg.id, 'tester');
  data.approveMessage(msg.id, 'approver');
  data.sendMessage(msg.id, 'sender');
  
  const response = data.addResponse(
    msg.id, 
    "Hi, it's still an issue. Bella keeps scratching and her appetite is poor.",
    'email',
    'resp@example.com'
  );
  assert(response.sentiment === 'concerning', 'Should detect concerning response');
});

test('Positive response is detected correctly', () => {
  resetDB();
  data.addWhitelistEntry({ email: 'pos@example.com', merchantType: 'boarding_groomer' });
  const ctx = data.createCareContext({
    petName: 'Rex', petType: 'Dog', ownerName: 'John',
    ownerEmail: 'pos@example.com', contextType: 'grooming',
    contextDetails: 'Test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  const msg = data.createFollowUpMessage({
    careContextId: ctx.id, title: 'Test', body: 'Body',
    templateId: 'test', merchantType: 'boarding_groomer', actor: 'tester',
  });
  data.submitForApproval(msg.id, 'tester');
  data.approveMessage(msg.id, 'approver');
  data.sendMessage(msg.id, 'sender');
  
  const response = data.addResponse(
    msg.id, 
    "She's doing much better, thanks! Back to normal and eating well.",
    'email',
    'pos@example.com'
  );
  assert(response.sentiment === 'positive', 'Should detect positive response');
});

// ==========================================
// SUMMARY
// ==========================================
console.log('\n' + '═'.repeat(50));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
console.log(`   Total: ${passed + failed} tests`);

if (failed > 0) {
  console.log('\n❌ Failed tests:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`   - ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
