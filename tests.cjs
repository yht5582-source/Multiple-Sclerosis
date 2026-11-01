// node tests.cjs — checks teaching content against the page's own engine.
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const block=n=>{const m=html.match(new RegExp('/\\*'+n+'-START\\*/([\\s\\S]*?)/\\*'+n+'-END\\*/'));if(!m)throw new Error('missing block '+n);return m[1];};
const ctx=vm.createContext({});
vm.runInContext(`let S,VER;${block('ENGINE')}${block('CASES')}${block('QUIZ')}${block('MAP')}
const caseState=st=>({age:null,course:'rel',attacks:1,lesions:1,hist:false,typical:true,prog1y:false,sc2:false,sim:false,newles:false,ocb:false,kflc:false,cvs:false,prl:false,...st,reg:new Set(st.reg||[]),flags:new Set(st.flags||[])});
globalThis.run=(st,ver)=>{S=caseState(st);VER=ver;const r=evaluate();return r.flag?'需先排除其他診斷':r.verdict;};
globalThis.D={CASES,QUIZ,MAP};`,ctx);
const {run,D}=ctx;
let pass=0,fail=0;
const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m);}};
const REG=['pv','cjc','inf','sc','on'],FL=['aqp4','mog','letm','ap','on','sys','old'];

ok(D.CASES.length===8,'8 cases');
ok(new Set(D.CASES.map(c=>c.id)).size===8,'case ids unique');
D.CASES.forEach(c=>{
  ['title','stem','ask','cite'].forEach(k=>ok(c[k],c.id+' has '+k));
  ok(c.reason.length&&c.next.length&&c.data.length,c.id+' lists');
  (c.state.reg||[]).forEach(r=>ok(REG.includes(r),c.id+' reg '+r));
  (c.state.flags||[]).forEach(f=>ok(FL.includes(f),c.id+' flag '+f));
  ['2017','2024'].forEach(v=>{const got=run(c.state,v);ok(got===c.expect[v],`${c.id} ${v}: expected ${c.expect[v]}, got ${got}`);});
});

ok(D.QUIZ.length===20,'20 questions');
ok(D.QUIZ.filter(q=>q.lv==='basic').length===10,'10 basic');
ok(D.QUIZ.filter(q=>q.lv==='adv').length===10,'10 advanced');
[0,1,2,3].forEach(a=>ok(D.QUIZ.filter(q=>q.a===a).length===5,'answer '+'ABCD'[a]+' appears 5 times'));
D.QUIZ.forEach((q,i)=>{
  ok(q.o.length===4&&new Set(q.o).size===4,`Q${i+1} four distinct options`);
  ok(q.e&&q.s,`Q${i+1} explanation and source`);
  if(q.check)Object.entries(q.check.expect).forEach(([v,e])=>{const got=run(q.check.state,v);ok(got===e,`Q${i+1} ${v}: expected ${e}, got ${got}`);});
});
// The correct option must not give itself away by being the single longest one.
const longest=D.QUIZ.filter(q=>q.o.every((x,j)=>j===q.a||x.length<q.o[q.a].length)).length;
ok(longest<=7,`correct option is the single longest in ${longest}/20`);
console.log('longest-option count',longest);

ok(D.MAP.left.length>=5&&D.MAP.right.length>=5,'map has both sides');
[...D.MAP.left,...D.MAP.right].forEach(([t,l])=>{ok(l.length>=2,'map branch '+t);l.forEach(([x,s])=>ok(x&&s,'map leaf source '+x));});

['cases','quiz','map'].forEach(t=>ok(html.includes(`id="tab-${t}"`)&&html.includes(`id="${t}"`),'pane '+t));
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
