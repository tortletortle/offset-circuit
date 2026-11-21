const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

async function launchPage(initScript,viewport={width:1280,height:900}) {
 const server=http.createServer((req,res)=>{
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  res.end(html);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport});
 if(initScript)await context.addInitScript(initScript);
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+address.port,{waitUntil:'load'});
 return {server,browser,context,page,errors};
}
async function cleanup(env){
 await env.context.close();
 await env.browser.close();
 await new Promise(resolve=>env.server.close(resolve));
}

test('airlock chapter plays safely, saves, resumes and fits mobile viewport',async()=>{
 const env=await launchPage(()=>localStorage.setItem('offset-v1','{"0":1}'));
 try {
  const {page,errors}=env;
  await page.locator('#chapterScene:not([hidden])').waitFor();
  await page.locator('#chLab').click();
  await page.locator('#commsEntry').waitFor();
  assert.equal(await page.locator('#commsEntry').isDisabled(),true,'final mission must remain locked before chapter five');
  await page.locator('#airEntry').click();
  await page.locator('#airScene:not([hidden])').waitFor();

  await page.locator('#airPump').click();
  assert.match(await page.locator('#airNotice').innerText(),/均压泵拒绝启动/);
  await page.locator('#airInner').click();
  assert.match(await page.locator('#airInnerStatus').innerText(),/内门 · 关闭/);
  await page.locator('#airOuter').click();
  assert.match(await page.locator('#airNotice').innerText(),/安全制动/);
  await page.locator('#airPump').click();
  assert.match(await page.locator('#airPressureStatus').innerText(),/低压 · 已均衡/);
  await page.locator('#airOuter').click();
  assert.match(await page.locator('#airNotice').innerText(),/自检发现联锁/);

  await page.locator('[data-air-gate="AND"]').click();
  await page.locator('#airOuter').click();
  await page.locator('#airNext').waitFor({state:'visible'});
  assert.match(await page.locator('#airOuterStatus').innerText(),/外门 · 打开/);

  await page.locator('#airUndo').click();
  await page.locator('#airNext').waitFor({state:'hidden'});
  assert.match(await page.locator('#airOuterStatus').innerText(),/外门 · 关闭/);
  await page.locator('#airOuter').click();
  await page.locator('#airNext').waitFor({state:'visible'});

  await page.reload({waitUntil:'load'});
  await page.locator('#airScene:not([hidden])').waitFor();
  await page.locator('#airNext').waitFor({state:'visible'});
  await page.setViewportSize({width:390,height:844});
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(dimensions.scroll<=dimensions.width,'mobile page must not overflow horizontally: '+JSON.stringify(dimensions));
  assert.deepEqual(errors,[]);
 } finally {await cleanup(env);}
});

test('corrupt and unavailable storage do not crash the chapter',async()=>{
 const env=await launchPage(()=>{
  localStorage.setItem('offset-v1','{"0":1}');
  localStorage.setItem('offset-airlock-v1','not-json');
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(key==='offset-airlock-v1')throw new DOMException('quota exceeded','QuotaExceededError');
   return original.call(this,key,value);
  };
 });
 try {
  const {page,errors}=env;
  await page.locator('#chapterScene:not([hidden])').waitFor();
  await page.locator('#chLab').click();
  await page.locator('#airEntry').click();
  await page.locator('#airScene:not([hidden])').waitFor();
  assert.match(await page.locator('#airSave').innerText(),/无法保存/);
  assert.match(await page.locator('#airNotice').innerText(),/观察气压/);
  await page.locator('#airInner').click();
  assert.match(await page.locator('#airInnerStatus').innerText(),/内门 · 关闭/);
  assert.deepEqual(errors,[]);
 } finally {await cleanup(env);}
});


test('robot arm command sequence enforces safety, supports undo and resumes',async()=>{
 const env=await launchPage(()=>{
  localStorage.setItem('offset-v1','{"0":1}');
  localStorage.setItem('offset-airlock-v1',JSON.stringify({version:1,state:{inner:false,outer:true,low:true,gate:'AND',done:true},undo:[],active:false}));
 });
 try {
  const {page,errors}=env;
  await page.locator('#chapterScene:not([hidden])').waitFor();
  await page.locator('#chLab').click();
  await page.locator('#robotEntry').click();
  await page.locator('#robotScene:not([hidden])').waitFor();

  await page.locator('[data-robot-add="MOVE"]').click();
  await page.locator('#robotStep').click();
  assert.match(await page.locator('#robotNotice').innerText(),/平移互锁/);
  await page.locator('[data-robot-step="0"]').click();

  const route=['GRIP','LIFT','MOVE','LOWER','RELEASE','LIFT','HOME'];
  for(const action of route)await page.locator('[data-robot-add="'+action+'"]').click();
  assert.equal(await page.locator('#robotCounter').innerText(),'程序 0 / 7');
  const startX=await page.locator('#robotTrolley').evaluate(el=>el.getBoundingClientRect().x);
  const startY=await page.locator('#robotGripper').evaluate(el=>el.getBoundingClientRect().y);
  await page.locator('#robotStep').click(); // grip
  await page.locator('#robotStep').click(); // lift
  await page.waitForTimeout(700);
  const liftedY=await page.locator('#robotGripper').evaluate(el=>el.getBoundingClientRect().y);
  assert.ok(liftedY<startY-25,'gripper must visibly lift: '+startY+' -> '+liftedY);
  await page.locator('#robotStep').click(); // move
  await page.waitForTimeout(700);
  const movedX=await page.locator('#robotTrolley').evaluate(el=>el.getBoundingClientRect().x);
  assert.ok(movedX>startX+100,'trolley must visibly move to B: '+startX+' -> '+movedX);
  for(let i=3;i<route.length;i++)await page.locator('#robotStep').click();
  await page.locator('#robotFinish').waitFor({state:'visible'});
  assert.match(await page.locator('#robotArmStatus').innerText(),/待机位/);
  assert.match(await page.locator('#robotCargoStatus').innerText(),/B 点/);

  await page.locator('#robotUndo').click();
  await page.locator('#robotFinish').waitFor({state:'hidden'});
  await page.locator('#robotReset').click();
  await page.locator('#robotUndo').click();
  await page.locator('#robotStep').click();
  await page.locator('#robotFinish').waitFor({state:'visible'});

  await page.reload({waitUntil:'load'});
  await page.locator('#robotScene:not([hidden])').waitFor();
  await page.locator('#robotFinish').waitFor({state:'visible'});
  await page.setViewportSize({width:390,height:844});
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(dimensions.scroll<=dimensions.width,'mobile page must not overflow horizontally: '+JSON.stringify(dimensions));
  assert.deepEqual(errors,[]);
 } finally {await cleanup(env);}
});


test('timing chapter reproduces the glitch, fixes it and verifies delay robustness',async()=>{
 const env=await launchPage(()=>{
  localStorage.setItem('offset-v1','{"0":1}');
  localStorage.setItem('offset-airlock-v1',JSON.stringify({version:1,state:{inner:false,outer:true,low:true,gate:'AND',done:true},undo:[],active:false}));
  localStorage.setItem('offset-robot-v1',JSON.stringify({version:1,state:{arm:'home',z:'high',gripper:'open',cargo:'target',done:true},program:['GRIP','LIFT','MOVE','LOWER','RELEASE','LIFT','HOME'],cursor:7,history:[],active:false}));
 });
 try {
  const {page,errors}=env;
  await page.locator('#chapterScene:not([hidden])').waitFor();
  await page.locator('#chLab').click();
  await page.locator('#hazardEntry').click();
  await page.locator('#hazardScene:not([hidden])').waitFor();
  assert.match(await page.locator('#hazardResult').innerText(),/5 ns/);
  assert.match(await page.locator('#hazardPulseCount').innerText(),/1 个/);

  await page.locator('#hazardFix').click();
  assert.match(await page.locator('#hazardPulseCount').innerText(),/0 个/);
  await page.locator('#hazardVerify').click();
  await page.locator('#hazardNext').waitFor({state:'visible'});
  assert.ok((await page.locator('#hazardNotice').innerText()).includes('54/54'));

  await page.locator('#hazardFix').click();
  await page.locator('#hazardNext').waitFor({state:'hidden'});
  await page.locator('#hazardUndo').click();
  await page.locator('#hazardNext').waitFor({state:'visible'});

  await page.reload({waitUntil:'load'});
  await page.locator('#hazardScene:not([hidden])').waitFor();
  await page.locator('#hazardNext').waitFor({state:'visible'});
  await page.setViewportSize({width:390,height:844});
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(dimensions.scroll<=dimensions.width,'mobile page must not overflow horizontally: '+JSON.stringify(dimensions));
  assert.deepEqual(errors,[]);
 } finally {await cleanup(env);}
});


test('first chapter solves its real truth table and transitions into the airlock',async()=>{
 const env=await launchPage(null);
 try {
  const {page,errors}=env;
  await page.locator('#chapterScene:not([hidden])').waitFor();
  await page.setViewportSize({width:390,height:844});
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(dimensions.scroll<=dimensions.width,'chapter one must fit mobile viewport: '+JSON.stringify(dimensions));

  await page.locator('#chGate0').click();
  await page.locator('#chGate1').click();
  assert.match(await page.locator('#chControllerState').innerText(),/已修复/);
  await page.locator('#chPowerA').click();
  await page.locator('#chNext').waitFor({state:'visible'});
  assert.match(await page.locator('#chDoorState').innerText(),/通道已打开/);
  await page.locator('#chNext').click();
  await page.locator('#airScene:not([hidden])').waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('offset-v1')||'{}'));
  assert.ok(Object.hasOwn(saved,0),'chapter one completion must persist its unlock');
  assert.deepEqual(errors,[]);
 } finally {await cleanup(env);}
});


test('complete campaign flows from chapter one through final SOS without seeded progress',async()=>{
 const env=await launchPage(null);
 try {
  const {page,errors}=env;
  await page.locator('#chapterScene:not([hidden])').waitFor();
  await page.locator('#chGate0').click();
  await page.locator('#chGate1').click();
  await page.locator('#chPowerA').click();
  await page.locator('#chNext').waitFor({state:'visible'});
  await page.locator('#chNext').click();
  await page.locator('#airScene:not([hidden])').waitFor();

  await page.locator('#airInner').click();
  await page.locator('#airOuter').click();
  assert.match(await page.locator('#airNotice').innerText(),/安全制动/);
  await page.locator('#airPump').click();
  await page.locator('#airOuter').click();
  assert.match(await page.locator('#airNotice').innerText(),/自检发现联锁/);
  await page.locator('[data-air-gate="AND"]').click();
  await page.locator('#airOuter').click();
  await page.locator('#airNext').waitFor({state:'visible'});
  await page.locator('#airNext').click();
  await page.locator('#robotScene:not([hidden])').waitFor();

  for(const action of ['GRIP','LIFT','MOVE','LOWER','RELEASE','LIFT','HOME'])await page.locator('[data-robot-add="'+action+'"]').click();
  for(let i=0;i<7;i++)await page.locator('#robotStep').click();
  await page.locator('#robotFinish').waitFor({state:'visible'});
  await page.locator('#robotFinish').click();
  await page.locator('#hazardScene:not([hidden])').waitFor();

  assert.match(await page.locator('#hazardResult').innerText(),/5 ns/);
  await page.locator('#hazardFix').click();
  await page.locator('#hazardVerify').click();
  await page.locator('#hazardNext').waitFor({state:'visible'});
  await page.reload({waitUntil:'load'});
  await page.locator('#hazardScene:not([hidden])').waitFor();
  await page.locator('#hazardNext').waitFor({state:'visible'});
  await page.locator('#hazardNext').click();
  await page.locator('#sensorScene:not([hidden])').waitFor();

  await page.locator('#sensorRecord').click();
  await page.locator('#sensorToggle').click();
  await page.locator('#sensorRecord').click();
  await page.locator('#sensorSelectors [data-sensor-select="2"]').click();
  await page.locator('#sensorConfigure').click();
  await page.locator('#sensorVerify').click();
  await page.locator('#sensorNext').waitFor({state:'visible'});
  await page.locator('#sensorNext').click();
  await page.locator('#commsScene:not([hidden])').waitFor();
  assert.equal(await page.locator('#commsEntry').isDisabled(),false);

  await page.locator('[data-comms-gate="OR"]').click();
  await page.locator('#commsPowerTest').click();
  for(const action of ['RAISE','RETRACT','LOCK'])await page.locator('[data-comms-arm="'+action+'"]').click();
  await page.locator('#commsSensorCheck').click();
  for(const action of ['UNLOCK','DEPLOY','ALIGN','LATCH'])await page.locator('[data-comms-antenna="'+action+'"]').click();
  await page.locator('#commsObserve').click();
  assert.match(await page.locator('#commsTimingStatus').innerText(),/5 ns/);
  await page.locator('#commsFix').click();
  await page.locator('#commsVerifyTiming').click();
  assert.match(await page.locator('#commsTimingStatus').innerText(),/54\/54/);
  await page.locator('#commsTransmit').click();
  await page.locator('#commsNext').waitFor({state:'visible'});
  assert.match(await page.locator('#commsHeroStatus').innerText(),/ACK RECEIVED/);
  await page.reload({waitUntil:'load'});
  await page.locator('#commsScene:not([hidden])').waitFor();
  await page.locator('#commsNext').waitFor({state:'visible'});
  assert.deepEqual(errors,[]);
 } finally {await cleanup(env);}
});


test('three-backup chapter calibrates, isolates the faulty sensor, saves and resumes',async()=>{
 const env=await launchPage(()=>{
  localStorage.setItem('offset-v1','{"0":1}');
  localStorage.setItem('offset-airlock-v1',JSON.stringify({version:1,state:{inner:false,outer:true,low:true,gate:'AND',done:true},undo:[],active:false}));
  localStorage.setItem('offset-robot-v1',JSON.stringify({version:1,state:{arm:'home',z:'high',gripper:'open',cargo:'target',done:true},program:['GRIP','LIFT','MOVE','LOWER','RELEASE','LIFT','HOME'],cursor:7,history:[],active:false}));
  localStorage.setItem('offset-hazard-v1',JSON.stringify({version:1,state:{consensus:true,from:1,observedHazard:true,verified:true},history:[],active:false}));
 });
 try {
  const {page,errors}=env;
  await page.locator('#chapterScene:not([hidden])').waitFor();
  await page.locator('#chLab').click();
  await page.locator('#hazardEntry').click();
  await page.locator('#hazardScene:not([hidden])').waitFor();
  await page.locator('#hazardNext').waitFor({state:'visible'});
  await page.locator('#hazardNext').click();
  await page.locator('#sensorScene:not([hidden])').waitFor();

  await page.locator('#sensorRecord').click(); // high reference = 1
  await page.locator('#sensorToggle').click(); // low reference = 0
  await page.locator('#sensorRecord').click();
  assert.match(await page.locator('#sensorTable tbody tr:nth-child(1)').innerText(),/正常 · 2\/2/);
  assert.match(await page.locator('#sensorTable tbody tr:nth-child(2)').innerText(),/正常 · 2\/2/);
  assert.match(await page.locator('#sensorTable tbody tr:nth-child(3)').innerText(),/异常 · 0\/2/);
  assert.match(await page.locator('#sensorReadings [data-sensor-select="2"]').innerText(),/响应异常/);
  assert.ok((await page.locator('#sensorPod2').getAttribute('class')).includes('fault'));
  assert.equal(await page.locator('#sensorNeedle').getAttribute('transform'),'rotate(-60 0 48)');

  await page.locator('#sensorSelectors [data-sensor-select="0"]').click();
  await page.locator('#sensorConfigure').click();
  assert.match(await page.locator('#sensorOutput').innerText(),/冲突/);
  await page.locator('#sensorVerify').click();
  assert.match(await page.locator('#sensorNotice').innerText(),/冲突/);

  await page.locator('#sensorSelectors [data-sensor-select="2"]').click();
  await page.locator('#sensorConfigure').click();
  await page.locator('#sensorVerify').click();
  await page.locator('#sensorNext').waitFor({state:'visible'});
  assert.match(await page.locator('#sensorOutput').innerText(),/0/);

  await page.locator('#sensorUndo').click();
  await page.locator('#sensorNext').waitFor({state:'hidden'});
  await page.locator('#sensorVerify').click();
  await page.locator('#sensorNext').waitFor({state:'visible'});

  await page.reload({waitUntil:'load'});
  await page.locator('#sensorScene:not([hidden])').waitFor();
  await page.locator('#sensorNext').waitFor({state:'visible'});
  await page.setViewportSize({width:390,height:844});
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(dimensions.scroll<=dimensions.width,'chapter five must fit mobile viewport: '+JSON.stringify(dimensions));

  // The sixth chapter is reached only after the fifth chapter is complete.
  await page.locator('#sensorNext').click();
  await page.locator('#commsScene:not([hidden])').waitFor();
  await page.locator('#commsPowerTest').click();
  assert.match(await page.locator('#commsPowerStatus').innerText(),/不符/);
  await page.locator('[data-comms-gate="XOR"]').click();
  await page.locator('#commsPowerTest').click();
  assert.match(await page.locator('#commsPowerStatus').innerText(),/不符/);
  await page.locator('[data-comms-gate="OR"]').click();
  await page.locator('#commsPowerTest').click();
  assert.match(await page.locator('#commsPowerStatus').innerText(),/四组真值全部通过/);

  for(const action of ['RAISE','RETRACT','LOCK'])await page.locator('[data-comms-arm="'+action+'"]').click();
  await page.locator('#commsSensorCheck').click();
  for(const action of ['UNLOCK','DEPLOY','ALIGN','LATCH'])await page.locator('[data-comms-antenna="'+action+'"]').click();
  await page.locator('#commsObserve').click();
  assert.match(await page.locator('#commsTimingStatus').innerText(),/5 ns/);
  await page.locator('#commsFix').click();
  await page.locator('#commsVerifyTiming').click();
  assert.match(await page.locator('#commsTimingStatus').innerText(),/54\/54/);
  await page.locator('#commsTransmit').click();
  await page.locator('#commsNext').waitFor({state:'visible'});
  assert.match(await page.locator('#commsHeroStatus').innerText(),/ACK RECEIVED/);

  await page.locator('#commsUndo').click();
  await page.locator('#commsNext').waitFor({state:'hidden'});
  await page.locator('#commsTransmit').click();
  await page.reload({waitUntil:'load'});
  await page.locator('#commsScene:not([hidden])').waitFor();
  await page.locator('#commsNext').waitFor({state:'visible'});
  const finalDimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(finalDimensions.scroll<=finalDimensions.width,'chapter six must fit mobile viewport: '+JSON.stringify(finalDimensions));
  assert.deepEqual(errors,[]);
 } finally {await cleanup(env);}
});
