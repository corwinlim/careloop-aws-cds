const assert = require('node:assert/strict');
const {sendVerifiedSES,getConfig,safeOperatorToken} = require('../server/ses-provider');
async function test() {
  const env={SES_LIVE_ENABLED:'true',SES_TEST_RECIPIENTS:'verified@example.com',SES_FROM_EMAIL:'sender@example.com',AWS_REGION:'ap-southeast-2'};
  let calls=0;
  const client={send:async(cmd)=>{calls++;assert.equal(cmd.input.Destination.ToAddresses[0],'verified@example.com');return {MessageId:'synthetic-id',$metadata:{httpStatusCode:200}};}};
  await assert.rejects(sendVerifiedSES({to:'verified@example.com',subject:'test',body:'body'},{env:{...env,SES_LIVE_ENABLED:'false'},client}),/SES_LIVE_DISABLED/);
  await assert.rejects(sendVerifiedSES({to:'other@example.com',subject:'test',body:'body'},{env,client}),/SES_TEST_RECIPIENT_NOT_ALLOWED/);
  assert.equal(calls,0);
  const result=await sendVerifiedSES({to:'verified@example.com',subject:'test',body:'body'},{env,client});
  assert.equal(result.MessageId,'synthetic-id');
  assert.equal(calls,1);
  assert.equal(getConfig({}).enabled,false);
  assert.equal(safeOperatorToken('a'.repeat(32),'a'.repeat(32)),true);
  assert.equal(safeOperatorToken('bad','a'.repeat(32)),false);
  console.log('SES provider tests passed (mock only; no AWS send)');
}
test().catch(e=>{console.error(e);process.exit(1);});