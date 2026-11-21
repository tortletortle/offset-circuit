const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function commsInitialState(){');
const end=html.indexOf('const ChapterSix=(()=>',start);
assert.ok(start>=0&&end>start,'final mission state machine must exist');
const context=vm.createContext({});
vm.runInContext(html.slice(start,end),context);
const {commsInitialState,commsPowerCases,commsValidState,commsApply}=context;
function apply(state,action,value){const result=commsApply(state,action,value);assert.equal(result.changed,true,result.message);return result.state;}

test('OR is the only gate that passes the four-case redundant power truth table',()=>{
 const cases=commsPowerCases('OR');
 assert.deepEqual(Array.from(cases,x=>x.actual),[0,1,1,1]);
 assert.ok(cases.every(x=>x.actual===x.expected));
 assert.deepEqual(Array.from(commsPowerCases('AND').filter(x=>x.actual!==x.expected),x=>[x.a,x.b]),[[0,1],[1,0]]);
 assert.deepEqual(Array.from(commsPowerCases('XOR').filter(x=>x.actual!==x.expected),x=>[x.a,x.b]),[[1,1]]);
 let state=commsInitialState();
 assert.equal(commsApply(state,'TEST_POWER').changed,false);
 state=apply(state,'SET_GATE','OR');
 state=apply(state,'TEST_POWER');
 assert.equal(state.powerVerified,true);
 assert.equal(commsValidState(state),true);
});

test('manipulator rejects unsafe order and only reaches park through raise, retract, lock',()=>{
 let state=commsInitialState();
 assert.equal(commsApply(state,'ARM_RETRACT').changed,false);
 state=apply(state,'SET_GATE','OR');
 state=apply(state,'TEST_POWER');
 assert.equal(commsApply(state,'ARM_LOCK').changed,false);
 state=apply(state,'ARM_RAISE');
 assert.equal(commsApply(state,'ARM_LOCK').changed,false);
 state=apply(state,'ARM_RETRACT');
 state=apply(state,'ARM_LOCK');
 assert.equal(state.armStep,3);
 assert.equal(commsValidState(state),true);
});

test('sensor and antenna interlocks block deployment until every prerequisite is satisfied',()=>{
 let state=commsInitialState();
 state=apply(state,'SET_GATE','OR');
 state=apply(state,'TEST_POWER');
 assert.equal(commsApply(state,'ANTENNA_UNLOCK').changed,false);
 state=apply(state,'ARM_RAISE');
 state=apply(state,'ARM_RETRACT');
 state=apply(state,'ARM_LOCK');
 assert.equal(commsApply(state,'ANTENNA_UNLOCK').changed,false);
 state=apply(state,'SENSOR_CHECK');
 for(const action of ['ANTENNA_UNLOCK','ANTENNA_DEPLOY','ANTENNA_ALIGN','ANTENNA_LATCH'])state=apply(state,action);
 assert.equal(state.antennaStep,4);
 assert.equal(commsValidState(state),true);
});

test('timing repair requires a reproduced hazard, consensus path and robustness verification',()=>{
 let state=commsInitialState();
 state=apply(state,'SET_GATE','OR');state=apply(state,'TEST_POWER');
 state=apply(state,'ARM_RAISE');state=apply(state,'ARM_RETRACT');state=apply(state,'ARM_LOCK');state=apply(state,'SENSOR_CHECK');
 for(const action of ['ANTENNA_UNLOCK','ANTENNA_DEPLOY','ANTENNA_ALIGN','ANTENNA_LATCH'])state=apply(state,action);
 assert.equal(commsApply(state,'TIMING_FIX').changed,false);
 state=apply(state,'TIMING_OBSERVED');
 state=apply(state,'TIMING_FIX');
 assert.equal(commsApply(state,'TRANSMIT').changed,false);
 state=apply(state,'TIMING_VERIFIED');
 assert.equal(state.timingVerified,true);
});

test('SOS transmission requires all subsystems and locks the completed mission',()=>{
 let state=commsInitialState();
 for(const action of ['SET_GATE','TEST_POWER','ARM_RAISE','ARM_RETRACT','ARM_LOCK','SENSOR_CHECK','ANTENNA_UNLOCK','ANTENNA_DEPLOY','ANTENNA_ALIGN','ANTENNA_LATCH','TIMING_OBSERVED','TIMING_FIX','TIMING_VERIFIED']) {
  state=action==='SET_GATE'?apply(state,action,'OR'):apply(state,action);
 }
 state=apply(state,'TRANSMIT');
 assert.equal(state.transmitted,true);
 assert.equal(commsValidState(state),true);
 const blocked=commsApply(state,'SET_GATE','AND');
 assert.equal(blocked.changed,false);
 assert.match(blocked.message,/已送达/);
 assert.equal(commsValidState({...commsInitialState(),transmitted:true}),false);
});
