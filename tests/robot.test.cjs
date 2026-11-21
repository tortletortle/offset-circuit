const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function initialRobot(){');
const end=html.indexOf('const ChapterThree=',start);
assert.ok(start>=0&&end>start);
const context=vm.createContext({});
vm.runInContext(html.slice(start,end),context);
const {initialRobot,robotStep,robotValid}=context;
const route=['GRIP','LIFT','MOVE','LOWER','RELEASE','LIFT','HOME'];

test('robot requires the safe pick, lift, travel, place and return sequence',()=>{
 let state=initialRobot();
 for(const action of route){const result=robotStep(state,action);assert.equal(result.changed,true,action);state=result.state;assert.equal(robotValid(state),true);}
 assert.deepEqual({...state},{arm:'home',z:'high',gripper:'open',cargo:'target',done:true});
});

test('unsafe moves are rejected without mutating the current state',()=>{
 const initial=initialRobot();
 for(const action of ['LIFT','MOVE','LOWER','RELEASE','HOME','UNKNOWN']){
  const result=robotStep(initial,action);
  assert.equal(result.changed,false,action);
  assert.deepEqual({...result.state},{...initial});
  assert.match(result.message,/互锁|未知指令/);
 }
});

test('all reachable robot states preserve physical invariants',()=>{
 const queue=[initialRobot()],seen=new Set();
 while(queue.length){
  const state=queue.shift(),key=JSON.stringify(state);
  if(seen.has(key))continue;
  seen.add(key);assert.equal(robotValid(state),true);
  for(const action of ['GRIP','LIFT','MOVE','LOWER','RELEASE','HOME']){
   const result=robotStep(state,action);
   assert.equal(robotValid(result.state),true);
   if(result.changed&&!seen.has(JSON.stringify(result.state)))queue.push(result.state);
  }
 }
 assert.equal(seen.size,8);
});
