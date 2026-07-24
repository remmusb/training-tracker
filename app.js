/* ================= 工具 ================= */
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2,'0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function mondayOf(d){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function bilibili(kw){ return 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(kw); }

/* ================= 状态 ================= */
let weekOffset = 0; // 0=本周
const CHECK_KEY='train2026_checks_v1', BODY_KEY='train2026_body_v1';
const store = {
  get checks(){ try{return JSON.parse(localStorage.getItem(CHECK_KEY))||{}}catch(e){return{}} },
  set checks(v){ localStorage.setItem(CHECK_KEY, JSON.stringify(v)); },
  get body(){ try{return JSON.parse(localStorage.getItem(BODY_KEY))||null}catch(e){return null} },
  set body(v){ localStorage.setItem(BODY_KEY, JSON.stringify(v)); }
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
  const data = { 打卡: store.checks, 体测: store.body, 导出时间: new Date().toLocaleString('zh-CN') };
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
  ['train','diet','body','rules'].forEach(n=>$('#tab-'+n).classList.toggle('hidden', n!==name));
  if(name==='body') renderBody();
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
    const res = await fetch(cfg.url.replace(/\/$/,'')+'/rest/v1/training_data', {
      method:'POST',
      headers:{ 'apikey':cfg.key, 'Authorization':'Bearer '+cfg.key,
        'Content-Type':'application/json', 'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify({ id:'main', data:{ checks:store.checks, body:store.body, updated:meta.get().updated } })
    });
    if(!res.ok) throw new Error(res.status);
    setSyncStatus('☁️ 已同步 '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}), '#4ade80');
  }catch(e){ setSyncStatus('⚠️ 同步失败，数据已存本地，联网后自动重试', '#fbbf24'); }
}
async function pullNow(showAlerts){
  const cfg=syncCfg.get(); if(!cfg) return false;
  setSyncStatus('☁️ 同步中…');
  try{
    const res = await fetch(cfg.url.replace(/\/$/,'')+'/rest/v1/training_data?id=eq.main&select=data', {
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
        meta.set({updated:ru});
        renderTrain(); renderBody();
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
  const url=$('#sbUrl').value.trim(), key=$('#sbKey').value.trim();
  if(!url || !key){ alert('请填写完整的 URL 和 key'); return; }
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co/.test(url)){ alert('URL 格式应为 https://xxxx.supabase.co'); return; }
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
      if(!d.打卡 && !d.体测) throw new Error('格式不对');
      if(d.打卡) localStorage.setItem(CHECK_KEY, JSON.stringify(d.打卡));
      if(d.体测) localStorage.setItem(BODY_KEY, JSON.stringify(d.体测));
      changed(); renderTrain(); renderBody();
      alert('导入成功');
    }catch(err){ alert('导入失败：文件格式不正确'); }
    e.target.value='';
  };
  rd.readAsText(f);
});

/* ================= 初始化 ================= */
renderTrain();
renderDiet();
renderBody();
(function initSync(){
  const cfg=syncCfg.get();
  if(cfg){ $('#sbUrl').value=cfg.url; $('#sbKey').value=cfg.key; pullNow(false); }
  else setSyncStatus('本地模式 · 未开启云同步');
})();
