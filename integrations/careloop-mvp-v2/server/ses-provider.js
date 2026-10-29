'use strict';
const { timingSafeEqual } = require('node:crypto');
function safeOperatorToken(got, expected) {
  if (typeof got !== 'string' || typeof expected !== 'string' || expected.length < 32) return false;
  const a = Buffer.from(got), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a,b);
}
function getConfig(env = process.env) {
  return {
    enabled: env.SES_LIVE_ENABLED === 'true',
    region: env.AWS_REGION || 'ap-southeast-2',
    from: env.SES_FROM_EMAIL || '',
    recipients: new Set((env.SES_TEST_RECIPIENTS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)),
  };
}
async function sendVerifiedSES({to,subject,body}, {env=process.env,client}={}) {
  const conf=getConfig(env);
  if(!conf.enabled) throw Object.assign(new Error('SES_LIVE_DISABLED'),{code:'SES_LIVE_DISABLED',statusCode:503});
  const recipient=String(to||'').trim().toLowerCase();
  if(!conf.recipients.has(recipient)||!recipient) throw Object.assign(new Error('SES_TEST_RECIPIENT_NOT_ALLOWED'),{code:'SES_TEST_RECIPIENT_NOT_ALLOWED',statusCode:403});
  if(!conf.from || !subject?.trim() || !body?.trim()) throw Object.assign(new Error('SES_CONFIG_INVALID'),{code:'SES_CONFIG_INVALID',statusCode:503});
  // Lazy SDK load for offline mock tests.
  const aws=client ? {SendEmailCommand:class{constructor(input){this.input=input;}}} : require('@aws-sdk/client-sesv2');
  const ses=client || new aws.SESv2Client({region:conf.region});
  const r=await ses.send(new aws.SendEmailCommand({
    FromEmailAddress:conf.from,
    Destination:{ToAddresses:[recipient]},
    Content:{Simple:{Subject:{Data:subject,Charset:'UTF-8'},Body:{Text:{Data:body,Charset:'UTF-8'}}}}
  }));
  return {MessageId:r.MessageId||null,requestId:r.$metadata?.requestId||null,httpStatusCode:r.$metadata?.httpStatusCode||null};
}
module.exports={sendVerifiedSES,getConfig,safeOperatorToken};
