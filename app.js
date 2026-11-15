'use strict';
const KEY='dex_budget_guided_beta_v1';
const $=id=>document.getElementById(id);
const today=()=>{let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const cents=v=>Math.round(Number(v)*100);
const fmt=c=>(c/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
const newId=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaultState=()=>({version:1,startingCash:0,mode:'variable',nextPay:'',taxPct:25,funDaily:1650,saveDaily:0,essentialDaily:3000,bills:[],transactions:[],approvals:[],protectedTax:0,protectedEssential:0,protectedSavings:0,protectedFun:0});
let state;try{state=JSON.parse(localStorage.getItem(KEY))||defaultState()}catch{state=defaultState()}
function persist(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function totalCash(){return state.startingCash+state.transactions.reduce((a,t)=>a+(t.type==='income'?t.amount:-t.amount),0)}
function daysUntil(date){const a=new Date(today()+'T12:00:00'),b=new Date(date+'T12:00:00');return Math.round((b-a)/86400000)}
function horizon(){if(state.nextPay){const n=daysUntil(state.nextPay);if(n>=0)return Math.max(1,n+1)}return 7}
function funding(){const h=horizon(),due=state.bills.filter(b=>daysUntil(b.date)<h).sort((a,b)=>a.date.localeCompare(b.date));const obligations=due.map(b=>({...b,gap:Math.max(0,b.amount-b.funded)}));const billsGap=obligations.reduce((a,b)=>a+b.gap,0);const essentialGap=Math.max(0,state.essentialDaily*h-state.protectedEssential);const tax=state.protectedTax;const allocated=state.bills.reduce((a,b)=>a+b.funded,0)+tax+state.protectedEssential+state.protectedSavings+state.protectedFun;const cash=totalCash();const unassigned=cash-allocated;const shortfall=Math.max(0,billsGap+essentialGap-unassigned);const safe=Math.max(0,Math.min(state.protectedFun+Math.max(0,unassigned-billsGap-essentialGap),Math.max(0,cash-allocated+state.protectedFun)));return {h,due,obligations,billsGap,essentialGap,allocated,cash,unassigned,shortfall,safe}}
function recommend(f){const spare=Math.max(0,f.unassigned),needs=f.billsGap+f.essentialGap;const cutFun=Math.min(state.protectedFun,Math.max(0,f.shortfall));const cutSavings=Math.min(state.protectedSavings,Math.max(0,f.shortfall-cutFun));const still=Math.max(0,f.shortfall-cutFun-cutSavings);return {cutFun,cutSavings,still,needs,spare}}
function render(){const f=funding(),r=recommend(f);const isNew=!state.setupComplete&&!state.bills.length&&!state.transactions.length&&state.startingCash===0;$('startBanner').classList.toggle('hidden',!isNew);$('horizonText').textContent=isNew?'':`Planning window: next ${f.h} day${f.h===1?'':'s'}.`; $('safe').textContent=isNew?'—':fmt(f.safe);$('status').innerHTML=isNew?'<p>First, enter the money you have and your basic expenses in Plan. Dex will then show your estimated spending balance.</p>':f.unassigned<0?`<p class="critical">Approved allocations exceed tracked cash. Reconcile your balance and review allocations.</p>`:f.shortfall?`<p class="critical">${fmt(f.shortfall)} in near-term essentials is not yet covered. This needs attention, but it is a funding issue—not a personal failure.</p>`:`<p class="good">No uncovered essentials detected within the ${f.h}-day planning window, based on your entries.</p>`;if(!isNew&&!state.bills.length){$('status').innerHTML+='<p class="warning">No bills entered yet. Add rent, phone, and other obligations before relying on this estimate.</p><button class="secondary" id="quickAddBills">Add a bill</button>';$('quickAddBills').onclick=()=>{showTab('bills');showBillsSection('edit')}}
$('breakdown').innerHTML=isNew?'<p>After you set up your budget, you’ll see how much money is accounted for, what still needs funding, and what may be available.</p>':[['Tracked cash',f.cash],['Already allocated',f.allocated],['Unassigned cash',f.unassigned],['Upcoming bill gaps',f.billsGap],['Essential spending gap',f.essentialGap],['Uncovered essentials',f.shortfall]].map(([k,v])=>`<div class="row"><span>${esc(k)}</span><b>${fmt(v)}</b></div>`).join('');
let msg;if(isNew){msg='<p>Start with <strong>Plan</strong> to enter your existing cash and upcoming expenses. Dex will then calculate suggestions from your entries.</p><button id="goPlanFromRecommendation">Open Plan</button>'}else if(f.unassigned<0){msg=`<p class="critical">Allocations exceed tracked cash by ${fmt(-f.unassigned)}. Correct the cash balance or review approved reserves before making a new allocation.</p>`}else if(f.shortfall){msg=`<p>First consider reducing flexible allocations by ${fmt(r.cutFun+r.cutSavings)}. ${r.still?`Even after that, ${fmt(r.still)} remains unfunded. Review bill timing, expenses or income options; Dex cannot promise this gap will close.`:'This would cover the calculated gap.'}</p><div class="row"><span>Reduce fun reserve</span><b>${fmt(r.cutFun)}</b></div><div class="row"><span>Reduce optional savings</span><b>${fmt(r.cutSavings)}</b></div><div class="actions"><button id="approve" ${r.cutFun+r.cutSavings<=0?'disabled':''}>Approve adjustment</button><button class="secondary" id="later">Review later</button></div>`}else{const optional=Math.max(0,f.unassigned-f.billsGap-f.essentialGap);msg=`<p>Your essential funding plan is currently covered in this window. ${optional?`${fmt(optional)} remains unassigned after those needs. You can choose to protect some for savings or discretionary spending.`:'There is no extra unassigned cash to allocate right now.'}</p>${optional?`<div class="grid"><div><label>Protect for savings ($)</label><input id="allocateSave" type="number" min="0" max="${optional/100}" step="0.01" value="${(optional/200).toFixed(2)}"></div><div><label>Protect for fun ($)</label><input id="allocateFun" type="number" min="0" max="${optional/100}" step="0.01" value="${(optional/200).toFixed(2)}"></div></div><button id="approveAllocation">Approve allocation</button>`:''}`}
$('recommendation').innerHTML=msg;if($('goPlanFromRecommendation'))$('goPlanFromRecommendation').onclick=()=>showTab('plan');
if($('approve'))$('approve').onclick=()=>{const now=funding(),next=recommend(now);state.protectedFun-=next.cutFun;state.protectedSavings-=next.cutSavings;state.approvals.unshift({date:new Date().toISOString(),note:`Released ${fmt(next.cutFun)} fun and ${fmt(next.cutSavings)} optional savings for essentials`,undo:{fun:next.cutFun,savings:next.cutSavings}});persist()};
if($('later'))$('later').onclick=()=>alert('No changes made. You can review this recommendation any time.');
if($('approveAllocation'))$('approveAllocation').onclick=()=>{const s=cents($('allocateSave').value),v=cents($('allocateFun').value);const now=funding();const max=Math.max(0,now.unassigned-now.billsGap-now.essentialGap);if(!Number.isSafeInteger(s)||!Number.isSafeInteger(v)||s<0||v<0||s+v>max)return alert('Amounts exceed the available allocation.');state.protectedSavings+=s;state.protectedFun+=v;state.approvals.unshift({date:new Date().toISOString(),note:`Protected ${fmt(s)} savings and ${fmt(v)} discretionary`,undo:{fun:-v,savings:-s}});persist()};
renderBills();
$('transactions').innerHTML=state.transactions.slice().reverse().map(t=>`<div class="row"><div><b>${esc(t.note||t.type)}</b><br><small>${esc(t.date)}</small></div><div><b>${t.type==='income'?'+':'−'}${fmt(t.amount)}</b> <button class="danger" data-delete="${t.id}">×</button></div></div>`).join('')||'<p>No transactions yet.</p>';
document.querySelectorAll('[data-delete]').forEach(el=>el.onclick=()=>{if(!confirm('Delete this transaction? This recalculates cash and may affect reserves.'))return;state.transactions=state.transactions.filter(t=>t.id!==el.dataset.delete);persist()});
$('audit').innerHTML=state.approvals.map((a,i)=>`<div class="row"><div><small>${new Date(a.date).toLocaleString()}</small><br>${esc(a.note)}</div>${a.undo?`<button class="secondary" data-undo="${i}">Undo</button>`:''}</div>`).join('')||'<p>No approved adjustments yet.</p>';
document.querySelectorAll('[data-undo]').forEach(el=>el.onclick=()=>{const a=state.approvals[Number(el.dataset.undo)];if(!a.undo)return;const nf=state.protectedFun+a.undo.fun,ns=state.protectedSavings+a.undo.savings;if(nf<0||ns<0||a.undo.fun+a.undo.savings>funding().unassigned)return alert('Cannot undo safely with current allocations.');state.protectedFun=nf;state.protectedSavings=ns;state.approvals.unshift({date:new Date().toISOString(),note:'Reversed: '+a.note});delete a.undo;persist()});
}
function fillSettings(){$('mode').value=state.mode;$('cash').value=(state.startingCash/100).toFixed(2);$('nextPay').value=state.nextPay;$('tax').value=state.taxPct;$('fun').value=(state.funDaily/100).toFixed(2);$('saveGoal').value=(state.saveDaily/100).toFixed(2);$('essential').value=(state.essentialDaily/100).toFixed(2)}
function validMoney(n){return Number.isSafeInteger(n)&&n>=0&&n<1e12}
$('record').onclick=()=>{const amount=cents($('amount').value);if(!validMoney(amount)||amount===0)return alert('Enter a valid positive amount.');const type=$('type').value;state.transactions.push({id:newId(),date:new Date().toISOString(),type,amount,note:$('note').value.slice(0,120)});if(type==='income'){const tax=Math.round(amount*state.taxPct/100);const unassigned=totalCash()-(state.bills.reduce((a,b)=>a+b.funded,0)+state.protectedTax+state.protectedEssential+state.protectedSavings+state.protectedFun);state.protectedTax+=Math.min(tax,Math.max(0,unassigned))}else{ // Spend from discretionary reserve first, then essential reserve; never reduce protected bill or tax allocations silently.
let left=amount;const fromFun=Math.min(left,state.protectedFun);state.protectedFun-=fromFun;left-=fromFun;const fromEssential=Math.min(left,state.protectedEssential);state.protectedEssential-=fromEssential;
} $('amount').value='';$('note').value='';persist();showTab('home');toast('Transaction saved. Your dashboard is updated.')};
$('saveSettings').onclick=()=>{const start=cents($('cash').value),fun=cents($('fun').value),save=cents($('saveGoal').value),tax=Number($('tax').value);if(![start,fun,save].every(validMoney)||!Number.isFinite(tax)||tax<0||tax>70)return alert('Check your amounts.');state.startingCash=start;state.setupComplete=true;state.mode=$('mode').value;state.nextPay=$('nextPay').value;state.taxPct=tax;state.funDaily=fun;state.saveDaily=save;persist();toast('Your financial basics were saved.')};
$('saveEssential').onclick=()=>{const n=cents($('essential').value);if(!validMoney(n))return alert('Enter a valid amount.');state.essentialDaily=n;persist();toast('Everyday costs saved.')};
$('addBill').onclick=saveBill;
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`dex-budget-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(obj.version!==1||!Array.isArray(obj.transactions)||!Array.isArray(obj.bills)||!Array.isArray(obj.approvals)||!Number.isSafeInteger(obj.startingCash))throw Error('Unsupported backup');if(!confirm('Replace all current app data with this backup?'))return;state=obj;state.appearance=normalizeAppearance(obj.appearance);applyAppearance();persist();fillSettings();renderAppearance()}catch(err){alert('Could not restore backup: '+err.message)}};
$('reconcile').onclick=()=>{const actual=prompt('Enter your actual combined cash balance ($):',(totalCash()/100).toFixed(2));if(actual===null)return;const n=cents(actual);if(!validMoney(n))return alert('Invalid balance');const diff=n-totalCash();state.startingCash+=diff;state.approvals.unshift({date:new Date().toISOString(),note:`Cash reconciled by ${fmt(diff)}. Review protected allocations.`});persist()};
function showTab(tab){
  document.querySelectorAll('.app-panel').forEach(s=>s.classList.add('hidden'));
  $(tab).classList.remove('hidden');
  document.querySelectorAll('.nav-btn[data-tab]').forEach(x=>{
    const active=x.dataset.tab===tab;
    x.classList.toggle('active',active);
    if(active)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');
  });
  if(tab==='plan')fillSettings();
  if(tab==='bills')renderBills();
  if(tab==='more')renderAppearance();
  window.scrollTo({top:0,behavior:'auto'});
}
function showPlanSection(which){
  document.querySelectorAll('#plan .subpanel').forEach(x=>x.classList.add('hidden'));
  $('plan-'+which).classList.remove('hidden');
  document.querySelectorAll('[data-plan]').forEach(x=>{
    const active=x.dataset.plan===which;
    x.classList.toggle('active',active);x.setAttribute('aria-selected',String(active));
  });
  $('plan-'+which).style.animation='none';void $('plan-'+which).offsetWidth;$('plan-'+which).style.animation='';
}
function showHistorySection(which){
  document.querySelectorAll('#activity .subpanel').forEach(x=>x.classList.add('hidden'));
  $('history-'+which).classList.remove('hidden');
  document.querySelectorAll('[data-history]').forEach(x=>{
    const active=x.dataset.history===which;
    x.classList.toggle('active',active);x.setAttribute('aria-selected',String(active));
  });
}
let toastTimer;
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3400)}
document.querySelectorAll('.nav-btn[data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
document.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>showPlanSection(b.dataset.plan));
document.querySelectorAll('[data-next-plan]').forEach(b=>b.onclick=()=>{showPlanSection(b.dataset.nextPlan);window.scrollTo({top:0,behavior:'smooth'})});
document.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>showHistorySection(b.dataset.history));
$('goHomeFromPlan').onclick=()=>showTab('home');
$('goBillsFromPlan').onclick=()=>{showTab('bills');showBillsSection('edit')};
$('goBillsFromEssentials').onclick=()=>showTab('bills');
$('homeBillsLink').onclick=()=>showTab('bills');
$('homeAddIncome').onclick=()=>{showTab('add');$('type').value='income';updateEntryTip();$('amount').focus()};
$('homeAddExpense').onclick=()=>{showTab('add');$('type').value='expense';updateEntryTip();$('amount').focus()};
function updateEntryTip(){
  $('entryTip').textContent=$('type').value==='income'
    ? 'Only enter income after you receive it. Dex estimates a tax reserve using your chosen rate.'
    : 'Only enter money that you already spent. This reduces tracked cash, but does not automatically mark a bill paid.';
}
$('type').addEventListener('change',updateEntryTip);



/* Bills v1.3 — preserve legacy bill entries and financial ledger compatibility. */
let editingBillId=null;
const repeatNames={none:'One-time',weekly:'Weekly',biweekly:'Every 2 weeks',monthly:'Monthly',yearly:'Yearly'};
function billRepeat(b){return Object.prototype.hasOwnProperty.call(repeatNames,b.repeat)?b.repeat:'none'}
function dateLabel(d){try{return new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}catch{return d}}
function dueText(date){const n=daysUntil(date);return !Number.isFinite(n)?'Date needs review':n<0?`${-n} day${n===-1?'':'s'} overdue`:n===0?'Due today':n===1?'Due tomorrow':`Due in ${n} days`}
function nextBillDate(date,repeat,anchor){
  const d=new Date(date+'T12:00:00');if(!Number.isFinite(d.getTime()))return date;
  if(repeat==='weekly'||repeat==='biweekly')d.setDate(d.getDate()+(repeat==='weekly'?7:14));
  else if(repeat==='monthly'||repeat==='yearly'){
    const y=d.getFullYear()+(repeat==='yearly'?1:0),m=d.getMonth()+(repeat==='monthly'?1:0);
    const base=new Date(y,m,1,12);const day=Math.min(anchor||d.getDate(),new Date(base.getFullYear(),base.getMonth()+1,0).getDate());
    base.setDate(day);return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function renderBills(){
  const active=state.bills.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const near=active.filter(b=>daysUntil(b.date)<=30);
  const dueTotal=near.reduce((n,b)=>n+b.amount,0), funded=near.reduce((n,b)=>n+b.funded,0);
  $('billsSummary').innerHTML=`<div class="bills-stat"><div><b>${active.length}</b><small>Active bills</small></div><div><b>${fmt(dueTotal)}</b><small>Due within 30 days*</small></div><div><b>${fmt(Math.max(0,dueTotal-funded))}</b><small>Not yet funded</small></div></div>${near.length?`<div class="tiny" style="margin-top:11px">Next: ${esc(near[0].name)} · ${dateLabel(near[0].date)} · ${dueText(near[0].date)}</div>`:''}<div class="tiny" style="margin-top:9px">*Includes overdue bills. Recurring totals show only the next occurrence per bill, not every future payment.</div>`;
  $('homeBillPreview').innerHTML=active.length?active.slice(0,2).map(b=>`<div class="row"><div><b>${esc(b.name)}</b><small>${dateLabel(b.date)} · ${dueText(b.date)}</small></div><b>${fmt(b.amount)}</b></div>`).join(''):'<p class="tiny">No bills added yet. Open Bills to enter recurring payments and due dates.</p>';
  $('billsList').innerHTML=active.length?active.map(b=>{
    const percent=b.amount?Math.min(100,Math.round(b.funded/b.amount*100)):0,days=daysUntil(b.date);
    return `<div class="bill-tile"><div class="bill-tile-head"><div><div class="bill-title">${esc(b.name)}</div><small>${esc(repeatNames[billRepeat(b)])} · ${dateLabel(b.date)}</small></div><div class="bill-amount">${fmt(b.amount)}</div></div>
    <span class="due-pill ${days<0?'overdue':days<=3?'urgent':''}">${dueText(b.date)}</span><div class="fund-track"><div class="fund-fill" style="width:${percent}%"></div></div>
    <div class="row" style="padding:3px 0 8px"><small>${fmt(b.funded)} protected</small><small>${percent}% · ${fmt(Math.max(0,b.amount-b.funded))} left</small></div>
    <div class="actions"><button class="secondary" type="button" data-fund="${esc(b.id)}">Set aside</button><button type="button" data-bill-pay="${esc(b.id)}">Mark paid</button><button class="secondary" type="button" data-edit-bill="${esc(b.id)}">Edit</button></div></div>`;
  }).join(''):'<p>You have no upcoming bills. Add rent, subscriptions, utilities, or any payment you want Dex to track.</p><button id="emptyAddBill" type="button">+ Add my first bill</button>';
  $('paidBillsList').innerHTML=state.transactions.filter(t=>t.billId).slice().reverse().map(t=>`<div class="row"><div><b>${esc(t.billName||t.note||'Bill')}</b><small>${new Date(t.date).toLocaleDateString()} · Recorded payment</small></div><b>−${fmt(t.amount)}</b></div>`).join('')||'<p>No bill payments recorded through the Bills tab yet.</p>';
  const empty=$('emptyAddBill');if(empty)empty.onclick=()=>{clearBillForm();showBillsSection('edit')};
  document.querySelectorAll('[data-fund]').forEach(el=>el.onclick=()=>fundBill(el.dataset.fund));
  document.querySelectorAll('[data-bill-pay]').forEach(el=>el.onclick=()=>markBillPaid(el.dataset.billPay));
  document.querySelectorAll('[data-edit-bill]').forEach(el=>el.onclick=()=>openBillEditor(el.dataset.editBill));
}
function fundBill(id){
  const b=state.bills.find(x=>x.id===id);if(!b)return;
  const value=prompt(`How much additional money should Dex set aside for ${b.name}?`,'0');if(value===null)return;
  const n=cents(value),f=funding();if(!Number.isSafeInteger(n)||n<0||n>b.amount-b.funded||n>f.unassigned)return alert('Enter an amount no greater than the unpaid bill and available unassigned cash.');
  if(!n)return; b.funded+=n;state.approvals.unshift({date:new Date().toISOString(),note:`Set aside ${fmt(n)} for ${b.name}.`});persist();toast('Bill funding updated.');
}
function markBillPaid(id){
  const b=state.bills.find(x=>x.id===id);if(!b)return;
  const next=billRepeat(b)!=='none'?nextBillDate(b.date,billRepeat(b),b.anchorDay):null;
  if(!confirm(`Have you already paid ${fmt(b.amount)} for ${b.name}?\n\nThis records one real expense in Dex${next?' and moves the next due date to '+dateLabel(next):' and completes this one-time bill'}. Do not also enter the same payment in Add.`))return;
  if(next===b.date)return alert('Could not calculate the next due date. Edit the bill date first.');
  state.transactions.push({id:newId(),date:new Date().toISOString(),type:'expense',amount:b.amount,note:`Bill: ${b.name}`,billId:b.id,billName:b.name});
  const oldDate=b.date;
  if(next){b.date=next;b.funded=0;b.lastPaidDate=today();}
  else state.bills=state.bills.filter(x=>x.id!==id);
  state.approvals.unshift({date:new Date().toISOString(),note:`Recorded ${fmt(b.amount)} payment for ${b.name} (due ${oldDate}). ${next?'Next date '+next+'.':'One-time bill completed.'}`});
  persist();toast('Bill payment recorded.');
}
function clearBillForm(){editingBillId=null;$('billFormTitle').textContent='Add a bill';$('billFormSubtitle').textContent='Set up one bill, then Dex will show it in Upcoming.';$('addBill').textContent='Save bill';$('billName').value='';$('billAmount').value='';$('billDate').value='';$('billRepeat').value='monthly';$('billFunded').value='0';$('cancelBillEdit').classList.add('hidden')}
function openBillEditor(id){const b=state.bills.find(x=>x.id===id);if(!b)return;editingBillId=id;$('billFormTitle').textContent='Edit bill';$('billFormSubtitle').textContent='Update this bill, including its repeat schedule.';$('addBill').textContent='Save changes';$('billName').value=b.name;$('billAmount').value=(b.amount/100).toFixed(2);$('billDate').value=b.date;$('billRepeat').value=billRepeat(b);$('billFunded').value=(b.funded/100).toFixed(2);$('cancelBillEdit').classList.remove('hidden');showBillsSection('edit')}
function saveBill(){
  const name=$('billName').value.trim(),amount=cents($('billAmount').value),funded=cents($('billFunded').value),date=$('billDate').value,repeat=$('billRepeat').value;
  if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!validMoney(amount)||amount<=0||!validMoney(funded)||funded>amount||!Object.prototype.hasOwnProperty.call(repeatNames,repeat))return alert('Please check the bill name, amount, date, and protected amount.');
  const old=editingBillId?state.bills.find(b=>b.id===editingBillId):null;
  const delta=funded-(old?old.funded:0);
  if(delta>funding().unassigned)return alert('That protected amount exceeds the cash currently available for allocation.');
  if(old){const dateChanged=date!==old.date;Object.assign(old,{name:name.slice(0,80),amount,date,funded,repeat});if(dateChanged||!old.anchorDay)old.anchorDay=Number(date.slice(-2));state.approvals.unshift({date:new Date().toISOString(),note:`Edited ${name} bill details.`});}
  else state.bills.push({id:newId(),name:name.slice(0,80),amount,date,funded,repeat,anchorDay:Number(date.slice(-2))});
  clearBillForm();persist();showBillsSection('upcoming');toast(old?'Bill updated.':'Bill added.');
}
function showBillsSection(which){document.querySelectorAll('#bills .subpanel').forEach(x=>x.classList.add('hidden'));$('bills-'+which).classList.remove('hidden');document.querySelectorAll('[data-bills]').forEach(x=>{const active=x.dataset.bills===which;x.classList.toggle('active',active);x.setAttribute('aria-selected',String(active))});if(which==='edit')$('billName').focus({preventScroll:true});}
document.querySelectorAll('[data-bills]').forEach(b=>b.onclick=()=>{if(b.dataset.bills==='edit'&&!editingBillId)clearBillForm();showBillsSection(b.dataset.bills)});
$('newBillShortcut').onclick=()=>{clearBillForm();showBillsSection('edit')};
$('cancelBillEdit').onclick=()=>{clearBillForm();showBillsSection('upcoming')};

/* Appearance — deliberately separate from any financial calculation. */
const WALLPAPERS=[['classic','Original','wp-classic'],['bubbles','Bubbles · live','wp-bubbles'],['aurora','Aurora · motion','wp-aurora'],['tide','Ocean · motion','wp-tide'],['stars','Starlight · motion','wp-stars'],['neon','Graffiti · Neon','wp-neon'],['ink','Graffiti · Ink','wp-ink']];
const PALETTES={
  dex:{name:'Dex mint',accent:'#54d7b0',soft:'#7edbc0',bg:'#0b1220',surface:'#152136',surface2:'#0d1a2d',line:'#28384f'},
  ice:{name:'Ice blue',accent:'#6cbfff',soft:'#a2d6ff',bg:'#081427',surface:'#13253c',surface2:'#0d1b30',line:'#29465f'},
  violet:{name:'Amethyst',accent:'#ba96ff',soft:'#d5bfff',bg:'#100e25',surface:'#211a38',surface2:'#19142c',line:'#40345b'},
  sunset:{name:'Coral',accent:'#ffa88a',soft:'#ffceba',bg:'#1b1422',surface:'#30213a',surface2:'#231a2e',line:'#584051'},
  gold:{name:'Gold',accent:'#ffce75',soft:'#ffe5aa',bg:'#191922',surface:'#2a2937',surface2:'#20202b',line:'#4b4958'}
};
const SUGGESTED={classic:'dex',bubbles:'ice',aurora:'violet',tide:'ice',stars:'ice',neon:'dex',ink:'sunset'};
const DEFAULT_APPEARANCE={wallpaper:'classic',palette:'dex',lastPreset:'dex',customAccent:'#54d7b0',autoMatch:false,motion:true};
function normalizeAppearance(v){
  const x=v&&typeof v==='object'?v:{};
  return {wallpaper:WALLPAPERS.some(p=>p[0]===x.wallpaper)?x.wallpaper:'classic',palette:PALETTES[x.palette]||x.palette==='custom'?x.palette:'dex',lastPreset:PALETTES[x.lastPreset]?x.lastPreset:'dex',customAccent:/^#[0-9a-f]{6}$/i.test(x.customAccent||'')?x.customAccent:'#54d7b0',autoMatch:!!x.autoMatch,motion:x.motion!==false};
}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
function hex(rgbv){return '#'+rgbv.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
function mix(a,b,r){const aa=rgb(a),bb=rgb(b);return hex(aa.map((v,i)=>v*(1-r)+bb[i]*r))}
function readableText(c){const xs=rgb(c).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});const L=xs[0]*.2126+xs[1]*.7152+xs[2]*.0722;return L>.25?'#071a22':'#ffffff'}
function applyAppearance(){
  const a=state.appearance||DEFAULT_APPEARANCE,base=PALETTES[a.palette==='custom'?a.lastPreset:a.palette]||PALETTES.dex;
  const accent=a.palette==='custom'?a.customAccent:base.accent;
  const soft=a.palette==='custom'?mix(accent,'#ffffff',.30):base.soft;
  const root=document.documentElement;
  for(const [k,v]of Object.entries({'--bg':base.bg,'--surface':base.surface,'--surface-2':base.surface2,'--line':base.line,'--mint':accent,'--mint-soft':soft,'--soft-highlight':accent+'24','--on-accent':readableText(accent),'--hero-bg':`linear-gradient(125deg,${mix(base.surface,accent,.20)} 0%,${base.surface} 78%)`}))root.style.setProperty(k,v);
  document.body.dataset.wallpaper=a.wallpaper;document.body.dataset.motion=a.motion?'on':'off';
  const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.setAttribute('content',base.bg);
}
function saveAppearance(){applyAppearance();persist();renderAppearance()}
function renderAppearance(){
  const a=state.appearance;if(!a)return;
  $('wallpaperOptions').innerHTML=WALLPAPERS.map(([key,label,cls])=>`<button type="button" class="wallpaper-choice ${a.wallpaper===key?'active':''}" data-wallpaper-choice="${key}" aria-pressed="${a.wallpaper===key}"><span class="wallpaper-image ${cls}"></span><span class="wallpaper-name">${label}</span></button>`).join('');
  $('paletteOptions').innerHTML=Object.entries(PALETTES).map(([key,p])=>`<button type="button" class="palette-choice ${a.palette===key?'active':''}" data-palette-choice="${key}" aria-pressed="${a.palette===key}"><span class="palette-swatch" style="background:linear-gradient(135deg,${p.accent} 0 52%,${p.surface} 52%)"></span>${p.name}</button>`).join('');
  const suggested=SUGGESTED[a.wallpaper],pal=PALETTES[suggested];
  $('paletteSuggestion').innerHTML=`<b>✦ Recommended match: ${pal.name}</b><p class="tiny">${a.wallpaper==='classic'?'The original Dex colors are balanced for the default background.':'A matching accent keeps the wallpaper and controls looking consistent.'}</p><div class="actions"><button type="button" class="secondary" id="useSuggestedPalette">Use ${pal.name}</button></div>`;
  $('autoMatch').checked=a.autoMatch;$('enableMotion').checked=a.motion;
  $('customAccent').value=a.customAccent;$('colorCode').textContent=a.customAccent.toUpperCase();
  document.querySelectorAll('[data-wallpaper-choice]').forEach(el=>el.onclick=()=>{a.wallpaper=el.dataset.wallpaperChoice;if(a.autoMatch){a.palette=SUGGESTED[a.wallpaper];a.lastPreset=a.palette}saveAppearance()});
  document.querySelectorAll('[data-palette-choice]').forEach(el=>el.onclick=()=>{a.palette=el.dataset.paletteChoice;a.lastPreset=a.palette;saveAppearance()});
  $('useSuggestedPalette').onclick=()=>{a.palette=suggested;a.lastPreset=suggested;saveAppearance();toast('Suggested color palette applied.')};
}
$('customAccent').addEventListener('input',()=>{$('colorCode').textContent=$('customAccent').value.toUpperCase()});
$('useCustomColor').onclick=()=>{const a=state.appearance;a.customAccent=$('customAccent').value;a.palette='custom';saveAppearance();toast('Custom accent applied.')};
$('autoMatch').onchange=e=>{state.appearance.autoMatch=e.target.checked;saveAppearance()};
$('enableMotion').onchange=e=>{state.appearance.motion=e.target.checked;saveAppearance()};
$('resetAppearance').onclick=()=>{state.appearance={...DEFAULT_APPEARANCE};saveAppearance();toast('Original Dex colors restored.')};
function showMoreSection(which){document.querySelectorAll('#more .subpanel').forEach(x=>x.classList.add('hidden'));$('more-'+which).classList.remove('hidden');document.querySelectorAll('[data-more]').forEach(x=>{const active=x.dataset.more===which;x.classList.toggle('active',active);x.setAttribute('aria-selected',String(active))});}
document.querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>showMoreSection(b.dataset.more));
state.appearance=normalizeAppearance(state.appearance);applyAppearance();fillSettings();render();renderAppearance();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});


// UX-only onboarding. Saved financial entries and the v1 backup schema are unchanged.
const TOUR_KEY='dex_budget_walkthrough_seen_1_1';
const tourSteps=[
  {tag:'WELCOME',title:'A budget that adjusts when life does.',body:'Dex helps you see what you have, what needs to be protected, and what your options are when income or expenses change.',preview:'<strong>The idea</strong><p>Know what needs attention, without guilt or guesswork.</p>'},
  {tag:'STEP 1 OF 4',title:'Start with the money you really have.',body:'Open Plan to choose how you get paid and enter your actual cash. Open Bills to enter your upcoming payments and repeat schedules. Expected pay is not money you already have.',preview:'<div class="row"><span>Income mode</span><b>Variable or regular</b></div><div class="row"><span>Starting balance</span><b>Money on hand</b></div><div class="row"><span>Bills</span><b>Amount + due date</b></div>'},
  {tag:'STEP 2 OF 4',title:'Record income and purchases.',body:'On Add, record earnings after they arrive and expenses after you pay them. Dex updates the dashboard based on what you enter.',preview:'<div class="row"><span>Income received</span><b>+$200.00</b></div><div class="row"><span>Groceries paid</span><b>−$24.00</b></div><small>Illustration only — these are not real entries.</small>'},
  {tag:'STEP 3 OF 4',title:'See the reality. Choose the response.',body:'On Home, Dex explains gaps and suggests adjustments. You can approve or review later. No bank money moves, and no plan is changed without approval.',preview:'<strong>Example:</strong><p>Rent still needs $60. Reducing optional spending could help; Dex will also show any shortfall that remains.</p><small>“Safe to spend” is only an estimate. Always check actual balances and due dates.</small>'},
  {tag:'STEP 4 OF 4',title:'Make it feel like yours.',body:'Open More → Appearance to choose real floating bubbles, drifting lights, graffiti artwork, and matching colors. Dex suggests matching colors but never changes your choice unless you ask.',preview:'<strong>Your look, your choice</strong><p>Try wallpapers and colors. You can always reset to the original navy and mint theme.</p>'}
];
let tourIndex=0;
const tourModal=$('tourModal');
function drawTour(){
  const s=tourSteps[tourIndex];
  $('tourCount').textContent=s.tag;
  $('tourTitle').textContent=s.title;
  $('tourBody').innerHTML=`<p>${s.body}</p><div class="illustration">${s.preview}</div>`;
  $('tourDots').innerHTML=tourSteps.map((_,i)=>`<span class="dot ${i===tourIndex?'active':''}" aria-hidden="true"></span>`).join('');
  $('tourBack').style.visibility=tourIndex===0?'hidden':'visible';
  $('tourNext').textContent=tourIndex===tourSteps.length-1?'Start my setup':'Next';
}
function openTour(){tourIndex=0;drawTour();if(!tourModal.open)tourModal.showModal()}
function finishTour(goToPlan){localStorage.setItem(TOUR_KEY,'1');tourModal.close();if(goToPlan){showTab('plan');showPlanSection('basics')}}
$('tourBack').onclick=()=>{tourIndex=Math.max(0,tourIndex-1);drawTour()};
$('tourNext').onclick=()=>{if(tourIndex<tourSteps.length-1){tourIndex++;drawTour()}else finishTour(true)};
$('tourSkip').onclick=()=>finishTour(false);
tourModal.addEventListener('close',()=>localStorage.setItem(TOUR_KEY,'1'));
$('openTour').onclick=openTour;
$('startTour').onclick=openTour;
$('replayTour').onclick=openTour;
$('startSetup').onclick=()=>showTab('plan');
const helpTopics={
  safe:['Estimated safe to spend','Dex estimates money potentially available after allocations you have protected and essential needs inside its planning window. It is not your account balance and not a guarantee that all future bills are covered.'],
  record:['Record what happened','Select Income received only for money you actually got. Select Expense paid when money left your account. This changes tracked cash; it does not move real funds or automatically pay a bill.'],
  funding:['Current funding picture','Tracked cash is what you entered plus income minus expenses. Allocated cash is what you already set aside in Dex. Unassigned cash may still be needed for bills. A funding gap means an obligation is not fully covered in the current plan.'],
  recommend:['Dex recommends','Dex proposes an adjustment when something changes. It does not modify your approved allocations until you tap Approve. If a gap remains after the suggestion, Dex shows it instead of claiming everything is fine.'],
  incomeMode:['How you get paid','Variable is for unpredictable deposits, like gig work. Regular modes describe weekly, biweekly, twice-monthly, or monthly pay. This beta records the choice, but does not yet automatically forecast paychecks.'],
  cash:['Starting cash','Enter the money you already have across accounts you want Dex to track. Do not count expected future earnings. This is a one-time baseline; use Activity → Reconcile cash for corrections later.'],
  tax:['Tax reserve','Dex sets aside your selected percentage of newly recorded income in its planning ledger. It is only an estimate, not a tax calculation or money automatically transferred to a tax account.'],
  bills:['Bills and recurring payments','Add the next due date, amount, and how often the bill repeats. Mark paid only after you actually make that payment: Dex records one expense and advances the due date for recurring bills. Payments entered on Add are not matched to bills automatically.']
};
function openHelp(topic){const x=helpTopics[topic];if(!x)return;$('infoTitle').textContent=x[0];$('helpBody').textContent=x[1];$('infoModal').showModal()}
document.addEventListener('click',e=>{const el=e.target.closest('[data-help]');if(el)openHelp(el.dataset.help)});
$('closeInfo').onclick=()=>$('infoModal').close();
if(!localStorage.getItem(TOUR_KEY)){openTour()}
