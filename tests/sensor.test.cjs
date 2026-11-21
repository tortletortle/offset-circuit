const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function sensorInitialState(){');
const end=html.indexOf('const ChapterFive=',start);
assert.ok(start>=0&&end>start);
const context=vm.createContext({});
vm.runInContext(html.slice(start,end),context);
const {sensorInitialState,sensorReadings,sensorDiagnose,sensorConsensus,sensorValidState,sensorApply}=context;

test('two calibration states expose the inverted pressure sensor',()=>{
 const s=sensorInitialState();
 assert.deepEqual(Array.from(sensorReadings(1)),[1,1,0]);
 assert.deepEqual(Array.from(sensorReadings(0)),[0,0,1]);
 let r=sensorApply(s,'RECORD');assert.equal(r.changed,true);
 r=sensorApply(r.state,'TOGGLE');assert.equal(r.state.pressure,0);
 r=sensorApply(r.state,'RECORD');
 assert.equal(sensorDiagnose(r.state.records),2);
 assert.equal(sensorValidState(r.state),true);
});

test('isolating a healthy sensor leaves a conflict and cannot pass verification',()=>{
 let s=sensorInitialState();
 s=sensorApply(s,'RECORD').state;
 s=sensorApply(s,'TOGGLE').state;
 s=sensorApply(s,'RECORD').state;
 s=sensorApply(s,'ISOLATE',0).state;
 s=sensorApply(s,'VOTE').state;
 assert.equal(sensorConsensus(s.records,0).ok,false);
 const r=sensorApply(s,'VERIFY');
 assert.equal(r.changed,false);
 assert.match(r.message,/冲突|错误/);
 assert.equal(s.verified,false);
});

test('isolate the inverted channel, restore two-channel agreement and verify both states',()=>{
 let s=sensorInitialState();
 for(const action of ['RECORD','TOGGLE','RECORD'])s=sensorApply(s,action).state;
 s=sensorApply(s,'ISOLATE',2).state;
 s=sensorApply(s,'VOTE').state;
 assert.equal(sensorConsensus(s.records,2).ok,true);
 s=sensorApply(s,'VERIFY').state;
 assert.equal(s.verified,true);
 assert.equal(sensorValidState(s),true);
});

test('failed operations do not mutate state and invalid completion cannot be restored',()=>{
 const s=sensorInitialState();
 const r=sensorApply(s,'ISOLATE',2);
 assert.equal(r.changed,false);
 assert.deepEqual({...r.state},{...s});
 const forged={...s,verified:true};
 assert.equal(sensorValidState(forged),false);
});
