const assert = require('node:assert/strict');
const { sendVerifiedSES, liveConfiguration } = require('../server/ses-provider');
async function main() {
  const env = { SES_LIVE_ENABLED: 'true', SES_TEST_RECIPIENTS: 'verified@example.com', SES_FROM_EMAIL: 'sender@example.com', AWS_REGION: 'ap-southeast-2' };
  let calls=0;
  const fake={send: async (command)=> { calls++; assert.equal(command.input.Destination.ToAddresses[0], 'verified@example.com'); return { MessageId: 'synthetic-msg-id', $metadata: { httpStatusCode: 200 } }; }};
  await assert.rejects(sendVerifiedSES({to:'verified@example.com',subject:'test',body:'demo'}, {env:{...env, SES_LIVE_ENABLED:'false'},client:fake}), /SES_LIVE_DISABLED/);
  await assert.rejects(sendVerifiedSES({to:'unverified@example.com',subject:'test',body:'demo'}, {env,client:fake}), /SES_TEST_RECIPIENT_NOT_ALLOWED/);
  assert.equal(calls,0);
  const result=await sendVerifiedSES({to:'verified@example.com',subject:'test',body:'synthetic body'}, {env,client:fake});
  assert.equal(result.MessageId,'synthetic-msg-id');
  assert.equal(calls,1);
  assert.equal(liveConfiguration({}).enabled,false);
  console.log('SES provider tests: 4 PASS (mock client, no AWS network)');
}
main().catch(e=>{console.error(e);process.exit(1)});
