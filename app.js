/* ================= 工具 ================= */
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2,'0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function mondayOf(d){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function bilibili(kw){ return 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(kw); }

/* ================= 状态 ================= */
let weekOffset = 0; // 0=本周
const CHECK_KEY='train2026_checks_v1', BODY_KEY='train2026_body_v1', FOOD_KEY='train2026_food_v1';
const store = {
  get checks(){ try{return JSON.parse(localStorage.getItem(CHECK_KEY))||{}}catch(e){return{}} },
  set checks(v){ localStorage.setItem(CHECK_KEY, JSON.stringify(v)); },
  get body(){ try{return JSON.parse(localStorage.getItem(BODY_KEY))||null}catch(e){return null} },
  set body(v){ localStorage.setItem(BODY_KEY, JSON.stringify(v)); },
  get food(){ try{return JSON.parse(localStorage.getItem(FOOD_KEY))||{logs:{},targets:{}}}catch(e){return{logs:{},targets:{}}} },
  set food(v){ localStorage.setItem(FOOD_KEY, JSON.stringify(v)); }
};
// 首次写入体测基准记录
if(!store.body){
  store.body = [{date:'2026-07-24', weight:63.2, fat:16.5, muscle:30.0, bmr:1813, note:'体测报告基准'}];
}

function currentMonday(){ const m=mondayOf(new Date()); m.setDate(m.getDate()+weekOffset*7); return m; }

/* ================= 训练页渲染 ================= */
function renderTrain(){
  const mon = currentMonday();
  const sun = new Date(mon); sun.setDate(sun.getDate()+6);
  const isCur = weekOffset===0;
  $('#weekLabel').textContent = `${mon.getMonth()+1}月${mon.getDate()}日 – ${sun.getMonth()+1}月${sun.getDate()}日` + (isCur?'（本周）':'');
  const weekKey = fmt(mon);
  const checks = store.checks[weekKey] || {};
  const todayDow = ['mon','tue','wed','thu','fri','sat','sun'][(new Date().getDay()+6)%7];

  let total=0, done=0;
  const html = PLAN.map(day=>{
    const exHtml = day.ex.map((e,i)=>{
      const key = `${day.id}_${i}`; total++;
      const on = !!checks[key]; if(on) done++;
      const meta = [`<b>${e.sr}</b>`];
      if(e.w) meta.push(e.w);
      if(e.rest) meta.push('休 '+e.rest);
      return `<div class="ex ${e.tag} ${on?'checked':''}" data-key="${key}">
        <div class="chk"><svg viewBox="0 0 24 24"><polyline points="4 13 10 19 20 6"/></svg></div>
        <div class="ex-info">
          <div class="ex-name">${e.n}</div>
          <div class="ex-meta">${meta.join('<span>·</span>')}</div>
          ${e.tip?`<div class="ex-tip">💡 ${e.tip}</div>`:''}
        </div>
        <span class="tag ${e.tag}">${e.tag==='warm'?'热身':e.tag==='main'?'训练':'恢复'}</span>
        <a class="demo" href="${bilibili(e.demo)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">示范</a>
      </div>`;
    }).join('');
    const dayDone = day.ex.filter((e,i)=>checks[`${day.id}_${i}`]).length;
    return `<div class="card day-card ${isCur&&day.id===todayDow?'open':''}" data-day="${day.id}">
      <div class="day-head">
        <div class="l">
          <div class="dow">${day.dow}${isCur&&day.id===todayDow?'<span class="today-badge">今天</span>':''}</div>
          <div class="day-title">${day.title}</div>
          <div class="day-meta"><span>🕗 ${day.time}</span><span>🎒 ${day.equip}</span><span>🍚 ${day.diet}</span></div>
        </div>
        <span class="day-count ${dayDone===day.ex.length?'done':''}">${dayDone}/${day.ex.length}</span>
      </div>
      <div class="day-body">${exHtml}
        <span class="diet-link" data-diet="${day.dietId}">查看今日饮食安排 →</span>
      </div>
    </div>`;
  }).join('');
  $('#tab-train').innerHTML = html;
  const pct = total? Math.round(done/total*100):0;
  $('#pFill').style.width = pct+'%';
  $('#pText').textContent = `本周完成 ${done}/${total} 项 · ${pct}%`;
}

// 事件委托：打卡 + 折叠
$('#tab-train').addEventListener('click', e=>{
  const exRow = e.target.closest('.ex');
  if(exRow && !e.target.closest('.demo')){
    const key = exRow.dataset.key;
    const weekKey = fmt(currentMonday());
    const all = store.checks; const wk = all[weekKey]||{};
    wk[key] = !wk[key]; if(!wk[key]) delete wk[key];
    all[weekKey]=wk; store.checks=all;
    changed();
    renderTrain();
    return;
  }
  const head = e.target.closest('.day-head');
  if(head){ head.closest('.day-card').classList.toggle('open'); return; }
  const link = e.target.closest('.diet-link');
  if(link){ switchTab('diet'); const id=link.dataset.diet;
    document.querySelectorAll('#dietList .card').forEach(c=>c.classList.toggle('open', c.dataset.diet===id));
    setTimeout(()=>{ const t=document.querySelector(`#dietList .card[data-diet="${id}"]`); t&&t.scrollIntoView({behavior:'smooth',block:'start'}); },60);
  }
});

/* ================= 周导航 ================= */
$('#prevWeek').onclick=()=>{weekOffset--;renderTrain();};
$('#nextWeek').onclick=()=>{weekOffset++;renderTrain();};
$('#curWeek').onclick=()=>{weekOffset=0;renderTrain();};

/* ================= 饮食页 ================= */
function renderDiet(){
  $('#dietList').innerHTML = DIETS.map(d=>`
    <div class="card" data-diet="${d.id}">
      <div class="diet-head"><div><span class="t">${d.name}</span></div>
        <div style="display:flex;align-items:center"><span class="kcal">${d.kcal}</span><span class="arrow" style="margin-left:8px">▼</span></div></div>
      <div class="diet-body"><div class="tbl-scroll"><table>
        <thead><tr><th>时间</th><th>食物</th><th>份量</th><th>热量</th><th>备注</th></tr></thead>
        <tbody>${d.meals.map(m=>`<tr><td class="k">${m[0]}</td><td>${m[1]}</td><td class="k">${m[2]}</td><td class="k">${m[3]}</td><td class="k">${m[4]}</td></tr>`).join('')}
        <tr><td class="k"><b>合计</b></td><td colspan="4" style="color:var(--sub)">${d.total}</td></tr></tbody>
      </table></div></div>
    </div>`).join('');
}
$('#dietList').addEventListener('click', e=>{
  const h=e.target.closest('.diet-head'); if(h) h.closest('.card').classList.toggle('open');
});

/* ================= 体测页 ================= */
$('#bcDate').value = fmt(new Date());
$('#bcSave').onclick = ()=>{
  const rec = {
    date: $('#bcDate').value || fmt(new Date()),
    weight: parseFloat($('#bcWeight').value)||null,
    fat: parseFloat($('#bcFat').value)||null,
    muscle: parseFloat($('#bcMuscle').value)||null,
    bmr: parseFloat($('#bcBmr').value)||null,
    note: $('#bcNote').value.trim()
  };
  if(!rec.weight && !rec.fat && !rec.muscle){ alert('至少填写一项数据'); return; }
  const arr = store.body; arr.push(rec); arr.sort((a,b)=>a.date<b.date?-1:1); store.body = arr;
  ['bcWeight','bcFat','bcMuscle','bcBmr','bcNote'].forEach(id=>$('#'+id).value='');
  changed();
  renderBody();
};
function renderBody(){
  const arr = store.body;
  // 表格（新→旧）
  $('#bcTable tbody').innerHTML = [...arr].reverse().map((r,i)=>`
    <tr><td class="k">${r.date}</td><td>${r.weight??'—'}</td><td>${r.fat??'—'}</td><td>${r.muscle??'—'}</td><td>${r.bmr??'—'}</td>
    <td class="k">${r.note||''}</td><td><span class="del" data-i="${arr.length-1-i}">删除</span></td></tr>`).join('');
  drawTrend(arr);
}
$('#bcTable').addEventListener('click', e=>{
  const d=e.target.closest('.del'); if(!d) return;
  if(!confirm('删除这条记录？')) return;
  const arr=store.body; arr.splice(+d.dataset.i,1); store.body=arr; changed(); renderBody();
});
$('#exportBtn').onclick=()=>{
  const data = { 打卡: store.checks, 体测: store.body, 饮食: store.food, 导出时间: new Date().toLocaleString('zh-CN') };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `训练数据_${fmt(new Date())}.json`; a.click();
  URL.revokeObjectURL(a.href);
};

/* 趋势图（原生 canvas） */
function drawTrend(arr){
  const cv = $('#trendCanvas');
  const dpr = window.devicePixelRatio||1;
  const W = cv.clientWidth, H = 220;
  cv.width = W*dpr; cv.height = H*dpr;
  const ctx = cv.getContext('2d'); ctx.scale(dpr,dpr); ctx.clearRect(0,0,W,H);
  const series = [
    {k:'weight', c:'#2563eb', label:'体重'},
    {k:'fat',    c:'#16a34a', label:'体脂率'},
    {k:'muscle', c:'#d97706', label:'骨骼肌'}
  ];
  const pts = arr.map(r=>({date:r.date, vals:series.map(s=>r[s.k])}));
  if(pts.length<1){ ctx.fillStyle='#94a3b8'; ctx.font='13px sans-serif'; ctx.fillText('暂无数据',20,30); return; }
  const padL=14, padR=14, padT=16, padB=30;
  const iw = W-padL-padR, ih = H-padT-padB;
  const x = i => pts.length===1 ? padL+iw/2 : padL + iw*i/(pts.length-1);
  // 网格
  ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=1;
  for(let g=0; g<=3; g++){ const y=padT+ih*g/3; ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke(); }
  series.forEach((s,si)=>{
    const vs = pts.map(p=>p.vals[si]).filter(v=>v!=null);
    if(!vs.length) return;
    let min=Math.min(...vs), max=Math.max(...vs);
    if(min===max){min-=1;max+=1;} const m=(max-min)*0.15; min-=m; max+=m;
    const y = v => padT + ih*(1-(v-min)/(max-min));
    ctx.strokeStyle=s.c; ctx.lineWidth=2; ctx.beginPath();
    let started=false;
    pts.forEach((p,i)=>{ const v=p.vals[si]; if(v==null) return;
      if(!started){ctx.moveTo(x(i),y(v));started=true;} else ctx.lineTo(x(i),y(v)); });
    ctx.stroke();
    pts.forEach((p,i)=>{ const v=p.vals[si]; if(v==null) return;
      ctx.fillStyle=s.c; ctx.beginPath(); ctx.arc(x(i),y(v),3,0,Math.PI*2); ctx.fill();
      ctx.font='10px sans-serif'; ctx.textAlign='center';
      ctx.fillText(v, x(i), y(v)-7);
    });
  });
  // 日期标签
  ctx.fillStyle='#94a3b8'; ctx.font='10px sans-serif'; ctx.textAlign='center';
  pts.forEach((p,i)=>{
    if(pts.length>6 && i%Math.ceil(pts.length/6)!==0 && i!==pts.length-1) return;
    ctx.fillText(p.date.slice(5), x(i), H-10);
  });
}
window.addEventListener('resize', ()=>{ if(!$('#tab-body').classList.contains('hidden')) renderBody(); });

/* ================= Tab 切换 ================= */
function switchTab(name){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  ['train','diet','food','body','rules'].forEach(n=>$('#tab-'+n).classList.toggle('hidden', n!==name));
  if(name==='body') renderBody();
  if(name==='food') renderFood();
  window.scrollTo({top:0});
}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>switchTab(t.dataset.tab));

/* ================= 云同步（Supabase REST） ================= */
const META_KEY='train2026_meta_v1', SYNC_KEY='train2026_sync_cfg';
const meta = {
  get(){ try{return JSON.parse(localStorage.getItem(META_KEY))||{updated:null}}catch(e){return{updated:null}} },
  set(v){ localStorage.setItem(META_KEY, JSON.stringify(v)); }
};
const syncCfg = {
  get(){ try{return JSON.parse(localStorage.getItem(SYNC_KEY))}catch(e){return null} },
  set(v){ v?localStorage.setItem(SYNC_KEY,JSON.stringify(v)):localStorage.removeItem(SYNC_KEY); }
};
function setSyncStatus(txt, color){ const el=$('#syncPill'); el.textContent=txt; el.style.color=color||'#94a3b8'; }
// URL 归一化：去掉末尾斜杠和 /rest/v1 后缀（Supabase 新界面复制的地址自带该后缀）
function sbBase(u){ return (u||'').trim().replace(/\/+$/,'').replace(/\/rest\/v1$/i,''); }

function changed(){
  meta.set({updated:new Date().toISOString()});
  schedulePush();
}
let pushTimer=null;
function schedulePush(){
  if(!syncCfg.get()) return;
  clearTimeout(pushTimer);
  pushTimer=setTimeout(pushNow, 800);
}
async function pushNow(){
  const cfg=syncCfg.get(); if(!cfg) return;
  setSyncStatus('☁️ 同步中…');
  try{
    const res = await fetch(sbBase(cfg.url)+'/rest/v1/training_data', {
      method:'POST',
      headers:{ 'apikey':cfg.key, 'Authorization':'Bearer '+cfg.key,
        'Content-Type':'application/json', 'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({ id:'main', data:{ checks:store.checks, body:store.body, food:store.food, updated:meta.get().updated } })
    });
    if(!res.ok) throw new Error(res.status);
    setSyncStatus('☁️ 已同步 '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}), '#4ade80');
  }catch(e){ setSyncStatus('⚠️ 同步失败，数据已存本地，联网后自动重试', '#fbbf24'); }
}
async function pullNow(showAlerts){
  const cfg=syncCfg.get(); if(!cfg) return false;
  setSyncStatus('☁️ 同步中…');
  try{
    const res = await fetch(sbBase(cfg.url)+'/rest/v1/training_data?id=eq.main&select=data', {
      headers:{ 'apikey':cfg.key, 'Authorization':'Bearer '+cfg.key }
    });
    if(!res.ok) throw new Error(res.status);
    const rows = await res.json();
    const remote = rows && rows[0] && rows[0].data;
    if(remote){
      const ru = remote.updated || '', lu = meta.get().updated || '';
      if(ru > lu){ // 云端更新 → 覆盖本地
        localStorage.setItem(CHECK_KEY, JSON.stringify(remote.checks||{}));
        localStorage.setItem(BODY_KEY, JSON.stringify(remote.body||[]));
        if(remote.food) localStorage.setItem(FOOD_KEY, JSON.stringify(remote.food));
        meta.set({updated:ru});
        renderTrain(); renderBody();
        if(!$('#tab-food').classList.contains('hidden')) renderFood();
      } else if(lu > ru){ // 本地更新 → 推上去
        await pushNow(); return true;
      }
      setSyncStatus('☁️ 已同步 '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}), '#4ade80');
    } else {
      await pushNow(); // 云端还没有数据 → 把本地推上去
    }
    return true;
  }catch(e){
    setSyncStatus('⚠️ 同步失败，当前使用本地数据', '#fbbf24');
    if(showAlerts) alert('同步失败，请检查 URL 和 key 是否正确，以及网络能否访问 Supabase。');
    return false;
  }
}
// 同步配置界面
$('#sbSave').onclick = async ()=>{
  const url=sbBase($('#sbUrl').value), key=$('#sbKey').value.trim();
  if(!url || !key){ alert('请填写完整的 URL 和 key'); return; }
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)){ alert('URL 格式应为 https://xxxx.supabase.co'); return; }
  $('#sbUrl').value=url;
  syncCfg.set({url, key});
  await pullNow(true);
};
$('#sbClear').onclick = ()=>{
  if(!confirm('断开后本设备数据保留，但不再与云端同步。继续？')) return;
  syncCfg.set(null); setSyncStatus('未开启云同步'); $('#sbUrl').value=''; $('#sbKey').value='';
};
window.addEventListener('online', ()=>pullNow(false));

/* ================= 导入 ================= */
$('#importBtn').onclick=()=>$('#importFile').click();
$('#importFile').addEventListener('change', e=>{
  const f=e.target.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const d=JSON.parse(rd.result);
      if(!d.打卡 && !d.体测 && !d.饮食) throw new Error('格式不对');
      if(d.打卡) localStorage.setItem(CHECK_KEY, JSON.stringify(d.打卡));
      if(d.体测) localStorage.setItem(BODY_KEY, JSON.stringify(d.体测));
      if(d.饮食) localStorage.setItem(FOOD_KEY, JSON.stringify(d.饮食));
      changed(); renderTrain(); renderBody();
      alert('导入成功');
    }catch(err){ alert('导入失败：文件格式不正确'); }
    e.target.value='';
  };
  rd.readAsText(f);
});

/* ================= 饮食记录 ================= */
const MEAL_ORDER = ['跑前餐','早餐','跑步补给','上午加餐','午餐','下午加餐','练前餐','练后餐','晚餐','足球补给','睡前','其他'];
const DOW_INFO = [ // 周一=0 … 周日=6
  {name:'力量日', target:2650, dietId:'strength'},
  {name:'跑步日', target:2850, dietId:'run'},
  {name:'力量日', target:2650, dietId:'strength'},
  {name:'力量日', target:2650, dietId:'strength'},
  {name:'力量日', target:2650, dietId:'strength'},
  {name:'恢复日', target:2250, dietId:'recovery'},
  {name:'长距离日', target:3100, dietId:'lsd'}
];
let foodDate = fmt(new Date());

function guessMeal(t){
  if(/跑前/.test(t)) return '跑前餐';
  if(/跑后|跑中/.test(t)) return '跑步补给';
  if(/早餐/.test(t)) return '早餐';
  if(/午餐/.test(t)) return '午餐';
  if(/练前/.test(t)) return '练前餐';
  if(/练后/.test(t)) return '练后餐';
  if(/晚餐/.test(t)) return '晚餐';
  if(/睡前/.test(t)) return '睡前';
  if(/足球/.test(t)) return '足球补给';
  if(/加餐/.test(t)) return '下午加餐';
  return '其他';
}

function renderFood(){
  const d = new Date(foodDate+'T12:00:00');
  const dow = (d.getDay()+6)%7;
  const info = DOW_INFO[dow];
  const fd = store.food;
  const entries = fd.logs[foodDate] || [];
  const target = fd.targets[foodDate] ?? info.target;

  $('#foodDow').textContent = ['周一','周二','周三','周四','周五','周六','周日'][dow] + ' · ' + info.name;
  $('#foodDateLabel').textContent = `${d.getMonth()+1}月${d.getDate()}日`;
  $('#foodTargetHint').textContent = `计划类型：${info.name} · 默认目标 ${info.target} kcal`;
  $('#foodTarget').value = target;

  const totK = entries.reduce((s,e)=>s+(+e.kcal||0),0);
  const totP = entries.reduce((s,e)=>s+(+e.p||0),0);
  const pct = target? Math.min(100, Math.round(totK/target*100)) : 0;
  const fill = $('#foodFill');
  fill.style.width = pct+'%';
  fill.style.background = totK<=target ? 'linear-gradient(90deg,#4ade80,#22c55e)' : (totK<=target*1.1 ? '#f59e0b' : '#ef4444');
  $('#foodSummary').innerHTML = `已摄入 <b style="color:var(--ink)">${Math.round(totK)}</b> / ${target} kcal（${pct}%） · 蛋白质约 <b style="color:var(--ink)">${Math.round(totP)}</b> g · 还差 <b style="color:var(--ink)">${Math.max(0,Math.round(target-totK))}</b> kcal`;

  // 明细：按餐次分组
  const groups = {};
  entries.forEach((e,i)=>{ (groups[e.meal]=groups[e.meal]||[]).push({...e,i}); });
  const order = [...MEAL_ORDER, ...Object.keys(groups).filter(k=>!MEAL_ORDER.includes(k))];
  const html = order.filter(m=>groups[m]).map(m=>{
    const sub = groups[m].reduce((s,e)=>s+(+e.kcal||0),0);
    return `<div style="padding:8px 14px 2px;font-size:12.5px;font-weight:700;color:var(--sub)">${m} · ${Math.round(sub)} kcal</div>` +
      groups[m].map(e=>`<div class="ex" style="cursor:default">
        <div class="ex-info">
          <div class="ex-name">${e.name}</div>
          <div class="ex-meta"><b>${e.qty} × ${e.unit||'份'}</b><span>·</span>${Math.round(e.kcal)} kcal${e.p?`<span>·</span>蛋白质 ${Math.round(e.p*10)/10} g`:''}</div>
        </div>
        <span class="del" data-fi="${e.i}">删除</span>
      </div>`).join('');
  }).join('');
  $('#foodList').innerHTML = html || '<div class="note" style="padding-top:10px">还没有记录，点上方「添加」或「按模板预填」。</div>';
}

// 日期导航
$('#foodPrev').onclick=()=>{ const d=new Date(foodDate+'T12:00:00'); d.setDate(d.getDate()-1); foodDate=fmt(d); renderFood(); };
$('#foodNext').onclick=()=>{ const d=new Date(foodDate+'T12:00:00'); d.setDate(d.getDate()+1); foodDate=fmt(d); renderFood(); };
$('#foodToday').onclick=()=>{ foodDate=fmt(new Date()); renderFood(); };

// 目标修改
$('#foodTarget').addEventListener('change', ()=>{
  const v = parseInt($('#foodTarget').value); if(!v) return;
  const fd = store.food; fd.targets[foodDate]=v; store.food=fd; changed(); renderFood();
});

// 食物库联动
$('#foodNames').innerHTML = FOOD_DB.map(f=>`<option value="${f[0]}">`).join('');
function foodAutoCalc(){
  const f = FOOD_DB.find(x=>x[0]===$('#fName').value.trim());
  const qty = parseFloat($('#fQty').value)||1;
  if(f){
    $('#fUnit').textContent = '× ' + f[1];
    $('#fKcal').value = Math.round(f[2]*qty);
    $('#fProtein').textContent = '蛋白质约 ' + (Math.round(f[3]*qty*10)/10) + ' g';
  } else {
    $('#fUnit').textContent = ''; $('#fProtein').textContent = '';
  }
}
$('#fName').addEventListener('input', foodAutoCalc);
$('#fQty').addEventListener('input', foodAutoCalc);

// 添加
$('#foodAdd').onclick=()=>{
  const name = $('#fName').value.trim();
  const kcal = parseFloat($('#fKcal').value)||0;
  if(!name){ alert('请填写食物名称'); return; }
  if(kcal<=0){ alert('请填写热量（选库中食物会自动算）'); return; }
  const f = FOOD_DB.find(x=>x[0]===name);
  const qty = parseFloat($('#fQty').value)||1;
  const entry = {
    meal: $('#fMeal').value, name, qty,
    unit: f? f[1] : '份',
    kcal, p: f? Math.round(f[3]*qty*10)/10 : 0
  };
  const fd = store.food; (fd.logs[foodDate]=fd.logs[foodDate]||[]).push(entry); store.food=fd;
  $('#fName').value=''; $('#fKcal').value=''; $('#fQty').value=1; foodAutoCalc();
  changed(); renderFood();
};

// 删除
$('#foodList').addEventListener('click', e=>{
  const d = e.target.closest('.del'); if(!d) return;
  const fd = store.food; const arr = fd.logs[foodDate]||[];
  arr.splice(+d.dataset.fi,1); fd.logs[foodDate]=arr; store.food=fd;
  changed(); renderFood();
});

// 按模板预填
$('#prefillBtn').onclick=()=>{
  const d = new Date(foodDate+'T12:00:00');
  const info = DOW_INFO[(d.getDay()+6)%7];
  const tpl = DIETS.find(x=>x.id===info.dietId);
  if(!tpl) return;
  const fd = store.food; const arr = fd.logs[foodDate]=fd.logs[foodDate]||[];
  tpl.meals.forEach(m=>{
    const k = parseInt(m[3])||0;
    arr.push({ meal: guessMeal(m[0]), name: m[1], qty:1, unit:m[2]||'份', kcal:k, p:0 });
  });
  store.food=fd; changed(); renderFood();
  alert(`已按「${tpl.name}」模板预填 ${tpl.meals.length} 条，可逐条删改`);
};

/* ================= 初始化 ================= */
renderTrain();
renderDiet();
renderBody();
renderFood();
(function initSync(){
  const cfg=syncCfg.get();
  if(cfg){ $('#sbUrl').value=cfg.url; $('#sbKey').value=cfg.key; pullNow(false); }
  else setSyncStatus('本地模式 · 未开启云同步');
})();
