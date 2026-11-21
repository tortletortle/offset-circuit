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
const deps=(extra={})=>({airlockComplete:true,sensorComplete:true,...extra});
function apply(state,action,value,prerequisites){const result=commsApply(state,action,value,deps(prerequisites));assert.equal(result.changed,true,result.message);return result.state;}
function prepareSubsystems(){
 let s=commsInitialState();
 for(const [a,v] of [['SET_GATE','OR'],['TEST_POWER'],['ARM_RAISE'],['ARM_RETRACT'],['ARM_LOCK'],['AIRLOCK_CHECK'],['SENSOR_CHECK']])s=apply(s,a,v);
 return s;
}
function prepareAntenna(){
 let s=prepareSubsystems();
 for(const action of ['ANTENNA_UNLOCK','ANTENNA_DEPLOY','ANTENNA_ALIGN','ANTENNA_LATCH'])s=apply(s,action);
 return s;
}
function prepareTiming(){
 let s=prepareAntenna();
 s=apply(s,'TIMING_OBSERVED',5);
 s=apply(s,'TIMING_FIX');
 return s;
}

test('OR is the only gate that passes the four-case redundant power truth table',()=>{
 const cases=commsPowerCases('OR');
 assert.deepEqual(Array.from(cases,x=>x.actual),[0,1,1,1]);
 assert.ok(cases.every(x=>x.actual===x.expected));
 assert.deepEqual(Array.from(commsPowerCases('AND').filter(x=>x.actual!==x.expected),x=>[x.a,x.b]),[[0,1],[1,0]]);
 assert.deepEqual(Array.from(commsPowerCases('XOR').filter(x=>x.actual!==x.expected),x=>[x.a,x.b]),[[1,1]]);
 let s=commsInitialState();
 assert.equal(commsApply(s,'TEST_POWER',undefined,deps()).changed,false);
 s=apply(s,'SET_GATE','OR');s=apply(s,'TEST_POWER');
 assert.equal(s.powerVerified,true);assert.equal(commsValidState(s),true);
});

test('manipulator rejects unsafe order and only reaches park through raise, retract, lock',()=>{
 let s=commsInitialState();
 assert.equal(commsApply(s,'ARM_RETRACT',undefined,deps()).changed,false);
 s=apply(s,'SET_GATE','OR');s=apply(s,'TEST_POWER');
 assert.equal(commsApply(s,'ARM_LOCK',undefined,deps()).changed,false);
 s=apply(s,'ARM_RAISE');assert.equal(commsApply(s,'ARM_LOCK',undefined,deps()).changed,false);
 s=apply(s,'ARM_RETRACT');s=apply(s,'ARM_LOCK');
 assert.equal(s.armStep,3);assert.equal(commsValidState(s),true);
});

test('the real previous-chapter airlock and sensor completions are required for explicit reviews',()=>{
 let s=commsInitialState();
 for(const [a,v] of [['SET_GATE','OR'],['TEST_POWER'],['ARM_RAISE'],['ARM_RETRACT'],['ARM_LOCK']])s=apply(s,a,v);
 assert.equal(commsApply(s,'AIRLOCK_CHECK',undefined,deps({airlockComplete:false})).changed,false);
 s=apply(s,'AIRLOCK_CHECK');
 assert.equal(commsApply(s,'SENSOR_CHECK',undefined,deps({sensorComplete:false})).changed,false);
 s=apply(s,'SENSOR_CHECK');
 assert.equal(s.airlockChecked,true);assert.equal(s.sensorChecked,true);assert.equal(commsValidState(s),true);
});

test('antenna interlock requires power, parked arm, airlock review and sensor review in order',()=>{
 let s=commsInitialState();
 assert.equal(commsApply(s,'ANTENNA_UNLOCK',undefined,deps()).changed,false);
 s=prepareSubsystems();
 assert.equal(commsApply(s,'ANTENNA_DEPLOY',undefined,deps()).changed,false);
 for(const action of ['ANTENNA_UNLOCK','ANTENNA_DEPLOY','ANTENNA_ALIGN','ANTENNA_LATCH'])s=apply(s,action);
 assert.equal(s.antennaStep,4);assert.equal(commsValidState(s),true);
});

test('timing evidence is measured and robust verification requires all 54 passing cases',()=>{
 let s=prepareAntenna();
 assert.equal(commsApply(s,'TIMING_OBSERVED',undefined,deps()).changed,false);
 s=apply(s,'TIMING_OBSERVED',5);
 assert.equal(s.observedPulseNs,5);
 s=apply(s,'TIMING_FIX');
 assert.equal(commsApply(s,'TIMING_VERIFIED',{cases:54,failures:1},deps()).changed,false);
 assert.equal(commsApply(s,'TIMING_VERIFIED',{cases:53,failures:0},deps()).changed,false);
 s=apply(s,'TIMING_VERIFIED',{cases:54,failures:0});
 assert.equal(s.timingVerified,true);assert.equal(s.timingCases,54);assert.equal(s.timingFailures,0);
 assert.equal(commsValidState(s),true);
});

test('SOS transmission and ground-station acknowledgement are separate gated states',()=>{
 let s=prepareTiming();
 s=apply(s,'TIMING_VERIFIED',{cases:54,failures:0});
 assert.equal(commsApply(s,'ACK',undefined,deps()).changed,false);
 assert.equal(commsApply(s,'TRANSMIT',undefined,deps({airlockComplete:false})).changed,false);
 s=apply(s,'TRANSMIT');
 assert.equal(s.transmitted,true);assert.equal(s.ackReceived,false);assert.equal(commsValidState(s),true);
 assert.equal(commsApply(s,'SET_GATE','AND',deps()).changed,false);
 s=apply(s,'ACK');
 assert.equal(s.ackReceived,true);assert.equal(commsValidState(s),true);
 assert.equal(commsApply(s,'SET_GATE','AND',deps()).changed,false);
 assert.match(commsApply(s,'SET_GATE','AND',deps()).message,/确认收到/);
 assert.equal(commsValidState({...commsInitialState(),transmitted:true}),false);
 assert.equal(commsValidState({...commsInitialState(),ackReceived:true}),false);
});
