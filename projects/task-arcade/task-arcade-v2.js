const taskKey = 'taskArcadeTasks', statsKey = 'taskArcadeStats';
const $ = id => document.getElementById(id);
const reward = { easy: 50, medium: 100, hard: 150 };
const defaults = [['Clear your inbox','easy','✉'],['Plan tomorrow','easy','▣'],['Take a quick walk','easy','↗'],['Deep work sprint','hard','⚡'],['Reply to one message','medium','✦'],['Tidy your space','medium','⌂'],['Learn something new','hard','★'],['Journal for 5 minutes','easy','✎']];
const colors = {easy:'#56c9ee',medium:'#ffd166',hard:'#ff668c'};
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
let stats = { ...read(statsKey, {}) };
for (const key of ['points','done','spins','streak','highScore','todaySpins']) stats[key] = Number.isFinite(stats[key]) ? Math.max(0, Math.floor(stats[key])) : 0;
let tasks = read(taskKey, null);
if (!Array.isArray(tasks)) tasks = defaults.map(([name,level,icon],i) => ({id:`default-${i}`,name,level,icon,done:false}));
tasks = tasks.filter(t => t && typeof t.name === 'string').map(t => ({id:typeof t.id==='string'&&/^[\w-]+$/.test(t.id)?t.id:crypto.randomUUID(),name:t.name.slice(0,60),level:Object.hasOwn(reward,t.level)?t.level:'easy',icon:typeof t.icon==='string'?t.icon:'✦',done:Boolean(t.done),rewarded:Boolean(t.rewarded||t.done)}));
let current=tasks.find(t=>t.id===stats.currentTaskId&&!t.done)||null, editingId=null, busy=false, rotation=0, returnFocus=null;
const canvas=$('wheel'), ctx=canvas.getContext('2d'), dialog=$('celebration');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true'); dialog.setAttribute('aria-labelledby','result-title'); dialog.hidden=true;
document.querySelector('.hero .intro').textContent='Spin for a random task, finish it, and earn points based on difficulty.';
document.querySelector('.panel-top span:first-child').innerHTML='<i class="live-dot"></i> YOUR NEXT TASK';
document.querySelector('.wheel-center small').textContent='FOR A TASK';
$('wheel-play').setAttribute('aria-label','Spin for a random task');
document.querySelector('.hint').id='wheel-hint'; $('spin-button').setAttribute('aria-describedby','wheel-hint');
$('empty-tasks').textContent='Your quest deck is empty. Add a task to put it on the wheel.';
const balance=document.createElement('p'); balance.className='wheel-summary'; balance.id='wheel-summary'; balance.setAttribute('aria-live','polite'); $('spin-button').before(balance);
function dayKey(date=new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function save() {
  stats.highScore=Math.max(stats.points,stats.highScore);
  stats.currentTaskId=current&&!current.done?current.id:null;
  try { localStorage.setItem(taskKey,JSON.stringify(tasks)); localStorage.setItem(statsKey,JSON.stringify(stats)); }
  catch { $('save-status').hidden=false; $('save-status').textContent='Browser storage is unavailable. Progress will last for this visit only.'; }
  for (const [id,value] of Object.entries({points:stats.points,'high-score':stats.highScore,spins:stats.spinDay===dayKey()?stats.todaySpins:0,'done-count':stats.done,streak:stats.streak})) $(id).textContent=String(value||0).padStart(id.includes('score')||id==='points'?3:2,'0');
  const level=Math.min(5,1+Math.floor(stats.done/10)); document.querySelector('.level').innerHTML=`LEVEL ${String(level).padStart(2,'0')} <b>${'●'.repeat(level)}${'○'.repeat(5-level)}</b>`;
  const count=tasks.filter(t=>!t.done).length;
  balance.textContent=`${count} UNFINISHED ${count===1?'TASK':'TASKS'} · EASY 50 / MEDIUM 100 / HARD 150 POINTS`;
  $('spin-button').disabled=busy||!count;
  $('wheel-play').disabled=busy||!count;
  $('spin-button').innerHTML=`<span class="spin-icon">↻</span> ${busy?'CHOOSING YOUR TASK…':count?'CHOOSE MY NEXT TASK':'ADD A TASK TO SPIN'} <kbd>SPACE</kbd>`;
  document.querySelector('.hint').textContent='Spin to get a random unfinished task. Complete it to collect its difficulty points!';
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function draw() {
  const available=tasks.filter(t=>!t.done);
  // Reset the orientation when the deck changes, without animating a new assignment.
  rotation=0;canvas.style.transition='none';canvas.style.transform='rotate(0deg)';void canvas.offsetWidth;canvas.style.transition='';
  ctx.clearRect(0,0,560,560);
  canvas.setAttribute('aria-label',available.length?`Task wheel: ${available.map(t=>`${t.name}, ${t.level}, ${reward[t.level]} points`).join('; ')}`:'Task wheel is empty. Add a task to spin.');
  if(!available.length){ctx.beginPath();ctx.arc(280,280,250,0,Math.PI*2);ctx.fillStyle='#dff8ff';ctx.fill();ctx.fillStyle='#102f53';ctx.textAlign='center';ctx.font='bold 18px monospace';ctx.fillText('ADD TASKS TO SPIN',280,380);return;}
  const arc=Math.PI*2/available.length;
  available.forEach((task,i)=>{
    const start=i*arc-Math.PI/2;ctx.beginPath();ctx.moveTo(280,280);ctx.arc(280,280,250,start,start+arc);ctx.fillStyle=colors[task.level];ctx.fill();ctx.strokeStyle='#102f53';ctx.lineWidth=4;ctx.stroke();
    ctx.save();ctx.translate(280,280);ctx.rotate(start+arc/2);ctx.textAlign='right';ctx.fillStyle='#102f53';ctx.font=`bold ${available.length>12?11:14}px monospace`;
    let label=task.name;while(ctx.measureText(label).width>155&&label.length>1)label=label.slice(0,-1);if(label!==task.name)label=label.slice(0,-1)+'…';
    ctx.fillText(label,232,-3);ctx.font='11px monospace';if(available.length<=18)ctx.fillText(`${task.level.toUpperCase()} · ${reward[task.level]} PTS`,232,15);ctx.restore();
  });
}
function updateMission() {
  current=tasks.find(t=>t.id===current?.id&&!t.done)||null;
  const hasOpen=tasks.some(t=>!t.done);
  $('mission-title').textContent=current?current.name:hasOpen?'Let the wheel choose.':tasks.length?'Quest deck cleared!':'Your next win starts here.';
  $('mission-icon').textContent=current?.icon||'★'; $('mission-type').textContent=current?current.level.toUpperCase():'READY';
  $('mission-copy').textContent=current?current.rewarded?'Finish this reopened task. Its reward has already been collected.':`The wheel picked this task for you. Complete it to earn ${reward[current.level]} points!`:hasOpen?'Spin the wheel to be randomly assigned an unfinished task.':'Add a new task to put your next win on the wheel.';
  $('complete-button').disabled=!current;
}
function renderTasks() {
  $('empty-tasks').hidden=tasks.length>0;
  $('task-list').innerHTML=tasks.map(t=>`<article class="task-item ${t.level} ${t.done?'is-done':''}"><span class="task-icon">${escapeHtml(t.icon)}</span><span class="task-name"><b title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</b><small>${t.done?'Completed':t.rewarded?'Reward already earned':`${t.level} · ${reward[t.level]} points`}</small></span><span class="task-actions"><button type="button" data-action="toggle" data-id="${t.id}" aria-label="${t.done?'Reopen':'Complete'} ${escapeHtml(t.name)}" title="${t.done?'Reopen task (no repeat reward)':'Mark task done'}">${t.done?'↺':'✓'}</button><button type="button" data-action="edit" data-id="${t.id}" aria-label="Edit ${escapeHtml(t.name)}" title="Edit task">✎</button><button type="button" data-action="delete" data-id="${t.id}" aria-label="Delete ${escapeHtml(t.name)}" title="Delete task">×</button></span></article>`).join('');
  updateMission();draw();
}
function showForm(task) { editingId=task?.id||null; $('task-name').setCustomValidity(''); $('task-name').value=task?.name||''; $('task-level').value=task?.level||'easy'; document.querySelector('.save-task').textContent=task?'SAVE CHANGES':'ADD TASK'; $('task-form').hidden=false; $('task-name').focus(); }
function hideForm() { editingId=null; $('task-form').hidden=true; $('task-form').reset(); $('add-task-button').focus(); }
function celebrate(title,text,kind) {
  returnFocus=document.activeElement; dialog.querySelector('.celebration-box p').textContent=kind; $('result-title').textContent=title; $('result-level').textContent=text; dialog.hidden=false; dialog.setAttribute('aria-hidden','false');
  document.querySelector('.shell').querySelectorAll(':scope > :not(.celebration)').forEach(el=>el.inert=true); $('close-celebration').focus();
}
function closeCelebration() {
  dialog.hidden=true; dialog.setAttribute('aria-hidden','true'); document.querySelector('.shell').querySelectorAll(':scope > :not(.celebration)').forEach(el=>el.inert=false);
  (returnFocus?.isConnected&&!returnFocus.disabled?returnFocus:$('add-task-button')).focus();
}
function completeTask(task) {
  if (!task||task.done) return; task.done=true;
  if (!task.rewarded) {
    task.rewarded=true; stats.done++; stats.points+=reward[task.level];
    const today=dayKey(), yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
    stats.streak=stats.lastCompleted===today?stats.streak:stats.lastCompleted===dayKey(yesterday)?stats.streak+1:1; stats.lastCompleted=today;
    save(); renderTasks(); celebrate(task.name,`+${reward[task.level]} POINTS`,'TASK COMPLETE · YOU EARNED THIS');
  } else { save(); renderTasks(); }
}
function spin() {
  const available=tasks.filter(t=>!t.done);
  if (busy||!available.length||!dialog.hidden) return; busy=true;
  const index=Math.floor(Math.random()*available.length), selected=available[index];
  // Wedges begin at -90 degrees; the pointer sits at the right edge (0 degrees).
  const target=90-(index+.5)*360/available.length; rotation+=1800+(target-rotation%360+360)%360;
  stats.spins++; const today=dayKey(); stats.todaySpins=stats.spinDay===today?stats.todaySpins+1:1; stats.spinDay=today;
  document.querySelector('.side-stack').inert=true;
  $('mission-title').textContent='Choosing your next task…';$('mission-copy').textContent='Let the wheel decide!';
  save(); canvas.style.transform=`rotate(${rotation}deg)`;
  setTimeout(()=>{current=selected;busy=false;document.querySelector('.side-stack').inert=false;updateMission();save();$('complete-button').focus();},reducedMotion?0:5000);
}
$('task-form').addEventListener('submit',e=>{
  e.preventDefault(); const name=$('task-name').value.trim(); if(!name){$('task-name').setCustomValidity('Enter a task name.');$('task-name').reportValidity();return;}
  const level=$('task-level').value;
  if(editingId){const task=tasks.find(t=>t.id===editingId);if(task)Object.assign(task,{name,level});}
  else tasks.push({id:crypto.randomUUID(),name,level,icon:'✦',done:false,rewarded:false});
  hideForm(); save(); renderTasks();
});
$('task-name').addEventListener('input',()=>$('task-name').setCustomValidity(''));
$('add-task-button').addEventListener('click',()=>showForm()); $('cancel-task').addEventListener('click',hideForm);
$('task-list').addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;const task=tasks.find(t=>t.id===button.dataset.id);if(!task)return;
  if(button.dataset.action==='edit'){showForm(task);return;}
  if(button.dataset.action==='delete'){if(!confirm(`Delete “${task.name}”?`))return;tasks=tasks.filter(t=>t.id!==task.id);if(current?.id===task.id)current=null;if(editingId===task.id)hideForm();}
  else if(task.done)task.done=false;else{completeTask(task);return;}
  save();renderTasks();$('add-task-button').focus();
});
$('spin-button').addEventListener('click',spin); $('wheel-play').addEventListener('click',spin); $('complete-button').addEventListener('click',()=>completeTask(current)); $('close-celebration').addEventListener('click',closeCelebration);
document.addEventListener('keydown',e=>{
  if(!dialog.hidden){if(e.key==='Escape')closeCelebration();if(e.key==='Tab'){e.preventDefault();$('close-celebration').focus();}return;}
  if(e.code==='Space'&&!e.repeat&&!e.target.closest('input,select,textarea,button,a,[contenteditable]')){e.preventDefault();spin();}
});
const previousDay=new Date();previousDay.setDate(previousDay.getDate()-1);if(stats.lastCompleted!==dayKey()&&stats.lastCompleted!==dayKey(previousDay))stats.streak=0;
save();renderTasks();
