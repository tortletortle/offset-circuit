const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function initialAirlock(){');
const end=html.indexOf('const ChapterTwo=',start);
assert.ok(start>=0&&end>start);
const c=vm.createContext({});
vm.runInContext(html.slice(start,end),c);
const {initialAirlock,airStep,airValid}=c;
test('unsafe commands are blocked and preserve state',()=>{
 let s=initialAirlock();
 for(const cmd of ['pressure','outer']){const r=airStep(s,cmd);assert.equal(r.changed,false);assert.equal(r.state,s);}
 s=airStep(s,'inner').state;
 assert.equal(airStep(s,'outer').changed,false);
 s=airStep(s,'pressure').state;
 assert.equal(airStep(s,'outer').changed,false);
});
test('repair then pass, without bypassing independent safety interlock',()=>{
 let s=initialAirlock();
 for(const cmd of ['inner','pressure','AND','outer']){const r=airStep(s,cmd);assert.equal(r.changed,true);s=r.state;}
 assert.equal(s.done,true);
 assert.equal(s.outer,true);
 assert.equal(s.inner,false);
 assert.equal(s.low,true);
});
test('all valid discrete states preserve door and pressure invariants',()=>{
 for(const inner of [false,true])for(const outer of [false,true])for(const low of [false,true])for(const gate of ['AND','OR','XOR'])for(const done of [false,true]){
   const s={inner,outer,low,gate,done};if(!airValid(s))continue;
   for(const cmd of ['inner','pressure','outer','AND','OR','XOR']){
      const {state}=airStep(s,cmd);assert.ok(airValid(state));assert.ok(!state.outer||(!state.inner&&state.low));
   }
 }
});
