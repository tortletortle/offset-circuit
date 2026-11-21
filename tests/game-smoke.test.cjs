const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

test('single-file game has unique element IDs and all chapter controls',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
 assert.deepEqual(duplicates,[]);
 for(const id of ['chapterScene','chapterEntry','chNext','airScene','airEntry','airInner','airPump','airOuter','airUndo','airReset','airNext','airNotice','robotScene','robotEntry','robotStep','robotUndo','robotReset','robotFinish','hazardScene','hazardEntry','hazardRun','hazardFix','hazardVerify','hazardUndo','hazardNext','sensorScene','sensorEntry','sensorToggle','sensorRecord','sensorConfigure','sensorVerify','sensorUndo','sensorReset','sensorNext','sensorNotice','commsScene','commsEntry','commsPowerTest','commsPowerTable','commsSensorCheck','commsObserve','commsFix','commsVerifyTiming','commsTransmit','commsUndo','commsReset','commsNext','commsNotice']) {
  assert.equal(ids.filter(x=>x===id).length,1,'expected exactly one #'+id);
 }
});

test('inline JavaScript parses without syntax errors',()=>{
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1,'expected one inline game script');
 assert.doesNotMatch(scripts[0][1],/\bsrc=/i,'game should not depend on a remote script');
 assert.doesNotThrow(()=>new vm.Script(scripts[0][2]),'inline script must parse');
});

test('game remains offline-first and has mobile/reduced-motion styling',()=>{
 assert.doesNotMatch(html,/<script\b[^>]*\bsrc=/i);
 assert.doesNotMatch(html,/<link\b[^>]*href=["']https?:/i);
 assert.match(html,/@media\s*\(max-width:\s*730px\)/);
 assert.match(html,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('chapter saves are isolated and all safety/timing engines are present',()=>{
 for(const key of ['offset-drafts-v1','offset-airlock-v1','offset-robot-v1','offset-hazard-v1','offset-sensor-v1','offset-comms-v1'])assert.ok(html.includes(key),key);
 assert.match(html,/function robotStep\(s,action\)/);
 assert.match(html,/function airStep\(s,action\)/);
 assert.ok(html.includes('const Timing=(()=>'),'event-driven timing engine must be present');
 assert.match(html,/function sensorApply\(s,action,value\)/);\n assert.match(html,/function commsApply\(s,action,value\)/);
 assert.match(html,/if\(s\.inner\|\|s\.outer\)return fail/);
 assert.match(html,/if\(!a\|\|!b\)return fail/);
});
