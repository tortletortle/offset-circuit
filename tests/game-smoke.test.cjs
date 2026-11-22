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
 for(const id of ['chapterScene','chapterEntry','chNext','airScene','airEntry','airInner','airPump','airOuter','airUndo','airReset','airNext','airNotice','robotScene','robotEntry','robotTutorialProgress','robotTutorialBar','robotTutorialPhase','robotTutorialTitle','robotTutorialText','robotTutorialTip','robotCounter','robotProgram','robotProgramHelp','robotStep','robotUndo','robotReset','robotFinish','hazardScene','hazardEntry','hazardRun','hazardFix','hazardVerify','hazardUndo','hazardNext','sensorScene','sensorEntry','sensorToggle','sensorRecord','sensorConfigure','sensorVerify','sensorUndo','sensorReset','sensorNext','sensorNotice','commsScene','commsEntry','commsAckBeam','commsGroundBeacon','commsGroundAckText','commsPowerTest','commsPowerTable','commsAirCheck','commsSensorCheck','commsObserve','commsFix','commsVerifyTiming','commsTransmit','commsAck','commsReadyAirlock','commsUndo','commsReset','commsNext','commsNotice']) {
  assert.equal(ids.filter(x=>x===id).length,1,'expected exactly one #'+id);
 }
});

test('robot chapter teaches actions through scene hotspots instead of a permanent command deck',()=>{
 assert.match(html,/id="robotTutorialProgress"/);
 assert.match(html,/id="robotTutorialText"/);
 assert.doesNotMatch(html,/data-robot-add=/,'permanent command buttons must be removed');
 assert.doesNotMatch(html,/class="robot-command-deck"/,'command deck must not occupy the scene');
 for(const action of ['GRIP','LIFT','MOVE','LOWER','RELEASE','HOME']) {
  assert.match(html,new RegExp('data-robot-hotspot="'+action+'"'),'missing scene hotspot '+action);
 }
 assert.match(html,/const tutorialSteps=\[[\s\S]*?action:"GRIP"[\s\S]*?action:"LIFT"[\s\S]*?action:"MOVE"[\s\S]*?action:"LOWER"[\s\S]*?action:"RELEASE"[\s\S]*?action:"LIFT"[\s\S]*?action:"HOME"/,'tutorial must preserve the seven-action safety sequence');
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
 for(const key of ['offset-drafts-v1','offset-airlock-v1','offset-robot-v1','offset-hazard-v1','offset-sensor-v1','offset-comms-v2'])assert.ok(html.includes(key),key);
 assert.match(html,/function robotStep\(s,action\)/);
 assert.match(html,/function airStep\(s,action\)/);
 assert.ok(html.includes('const Timing=(()=>'),'event-driven timing engine must be present');
 assert.match(html,/function sensorApply\(s,action,value\)/);
 assert.match(html,/function commsApply\(s,action,value,prerequisites\)/);
 assert.match(html,/if\(s\.inner\|\|s\.outer\)return fail/);
 assert.match(html,/if\(!a\|\|!b\)return fail/);
});
