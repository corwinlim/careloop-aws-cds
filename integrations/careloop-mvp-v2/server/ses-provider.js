'use strict';
/** Real SESv2 provider. Never called unless live mode and operator gating succeeded. */
function liveConfiguration(env = process.env) {
  const recipients = new Set((env.SES_TEST_RECIPIENTS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean));
  return {
    enabled: env.SES_LIVE_ENABLED === 'true',
    region: env.AWS_REGION || 'ap-southeast-2',
    from: env.SES_FROM_EMAIL || '',
    recipients,
  };
}
function redactResponse(response) {
  return { MessageId: response.MessageId || null, requestId: response.$metadata?.requestId || null, httpStatusCode: response.$metadata?.httpStatusCode || null };
}
async function sendVerifiedSES({ to, subject, body }, { env = process.env, client } = {}) {
  const config = liveConfiguration(env);
  if (!config.enabled) throw Object.assign(new Error('SES_LIVE_DISABLED'), { statusCode: 503, code: 'SES_LIVE_DISABLED' });
  const recipient = String(to || '').trim().toLowerCase();
  if (!recipient || !config.recipients.has(recipient)) throw Object.assign(new Error('SES_TEST_RECIPIENT_NOT_ALLOWED'), { statusCode: 403, code: 'SES_TEST_RECIPIENT_NOT_ALLOWED' });
  if (!config.from || !subject?.trim() || !body?.trim()) throw Object.assign(new Error('SES_CONFIG_INVALID'), { statusCode: 503, code: 'SES_CONFIG_INVALID' });
  // Lazy import keeps the mock-only offline demo usable without AWS SDK.
  const aws = client ? { SendEmailCommand: class { constructor(input) { this.input = input; } } } : require('@aws-sdk/client-sesv2');
  const ses = client || new aws.SESv2Client({ region: config.region });
  const { SendEmailCommand } = aws;
  const result = await ses.send(new SendEmailCommand({
    FromEmailAddress: config.from,
    Destination: { ToAddresses: [recipient] },
    Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Text: { Data: body, Charset: 'UTF-8' } } } },
  }));
  return redactResponse(result);
}
module.exports = { sendVerifiedSES, liveConfiguration };
