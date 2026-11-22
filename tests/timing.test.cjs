const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('const Timing=(()=>{');
const end=html.indexOf('const timingUI=',start);
assert.ok(start>=0&&end>start);
const context=vm.createContext({});
vm.runInContext(html.slice(start,end)+'\nthis.Timing=Timing;',context);
const Timing=context.Timing;

test('original two-path circuit reproduces a 5 ns low hazard on falling A',()=>{
 const circuit=Timing.circuit('static1',[3,2,4],false,1,1);
 const result=Timing.simulate({...circuit,mode:'transport'});
 const pulses=Timing.pulses(result.traces.Y,result.horizon);
 assert.equal(pulses.length,1);
 assert.equal(pulses[0].width,5);
});

test('consensus BC term prevents the hazard in both input directions',()=>{
 for(const from of [0,1]){
  const circuit=Timing.circuit('static1',[3,2,4],true,from,1);
  const result=Timing.simulate({...circuit,mode:'transport'});
  assert.equal(Timing.pulses(result.traces.Y,result.horizon).length,0);
 }
});

test('redundant path survives every enumerated propagation-delay perturbation',()=>{
 const fixed=Timing.robust('static1',[3,2,4],true,'transport',1);
 assert.equal(fixed.cases,54);
 assert.equal(fixed.failures,0);
 const broken=Timing.robust('static1',[3,2,4],false,'transport',1);
 assert.ok(broken.failures>0);
});
