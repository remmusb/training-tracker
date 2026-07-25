/* ================= 训练迁移 ================= */
const DOW_LIST = [['mon','周一'],['tue','周二'],['wed','周三'],['thu','周四'],['fri','周五'],['sat','周六'],['sun','周日']];
let mvSrc = null;

// 底部弹出选择器
const mvSheet = document.createElement('div');
mvSheet.id = 'mvSheet';
mvSheet.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:99;display:none;align-items:flex-end;justify-content:center';
mvSheet.innerHTML = `
  <div style="background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:780px;padding:18px 16px 26px">
    <div style="font-weight:800;font-size:15px;margin-bottom:12px" id="mvTitle">迁移到哪天？</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px" id="mvDays"></div>
    <button class="btn ghost" id="mvCancel" style="width:100%;margin-top:12px">取消</button>
  </div>`;
document.body.appendChild(mvSheet);
mvSheet.addEventListener('click', e=>{ if(e.target===mvSheet || e.target.id==='mvCancel') mvSheet.style.display='none'; });

function openMovePicker(srcId){
  mvSrc = srcId;
  const weekKey = fmt(currentMonday());
  const moves = store.moves[weekKey] || {};
  const taken = new Set(Object.values(moves)); // 已被占用的目标日
  const srcDay = PLAN.find(p=>p.id===srcId);
  $('#mvTitle').textContent = `把「${srcDay.dow} ${srcDay.title}」迁移到：`;
  $('#mvDays').innerHTML = DOW_LIST.filter(([id])=>id!==srcId).map(([id,name])=>{
    const disabled = taken.has(id);
    return `<button class="btn ${disabled?'ghost':''} small" data-mvto="${id}" ${disabled?'disabled style="opacity:.4"':''}>${name}</button>`;
  }).join('');
  mvSheet.style.display = 'flex';
}

// 捕获阶段拦截迁移按钮（避免触发卡片折叠）
document.addEventListener('click', e=>{
  const mv = e.target.closest('.mv-btn');
  if(mv){ e.stopPropagation(); e.preventDefault(); openMovePicker(mv.dataset.mv); return; }
  const um = e.target.closest('[data-unmove]');
  if(um){
    e.stopPropagation(); e.preventDefault();
    const weekKey = fmt(currentMonday());
    const all = store.moves; const wk = all[weekKey]||{};
    delete wk[um.dataset.unmove];
    all[weekKey]=wk; store.moves=all; changed(); renderTrain();
    return;
  }
  const to = e.target.closest('[data-mvto]');
  if(to && mvSrc){
    const weekKey = fmt(currentMonday());
    const all = store.moves; const wk = all[weekKey]||{};
    wk[mvSrc] = to.dataset.mvto;
    all[weekKey]=wk; store.moves=all; changed();
    mvSheet.style.display='none'; mvSrc=null;
    renderTrain();
  }
}, true);

/* ================= 运动记录 ================= */
let actDate = fmt(new Date());
let rnImgData = null;   // 跑步截图（1张）
let fbImgsData = [];    // 足球图（最多3张）

function compressForStorage(file){
  return new Promise((res,rej)=>{
    const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=()=>{
      let w=img.width, h=img.height; const max=900;
      if(w>max||h>max){ const r=Math.min(max/w,max/h); w=Math.round(w*r); h=Math.round(h*r); }
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg',0.72));
    };
    img.onerror=()=>rej(new Error('图片读取失败'));
    img.src=url;
  });
}

function renderAct(){
  const d = new Date(actDate+'T12:00:00');
  $('#actDow').textContent = DOW_LIST[(d.getDay()+6)%7][1];
  $('#actDateLabel').textContent = `${d.getMonth()+1}月${d.getDate()}日`;
  const arr = store.act[actDate] || [];
  $('#actList').innerHTML = arr.length ? arr.map((a,i)=>{
    const isRun = a.type==='run';
    const f = a.data||{};
    const metrics = isRun
      ? [f.dist&&`${f.dist} km`, f.dur&&`${f.dur} 分钟`, f.pace&&`配速 ${f.pace}`, f.hr&&`心率 ${f.hr}`, f.kcal&&`${f.kcal} kcal`].filter(Boolean).join(' · ')
      : [f.dur&&`${f.dur} 分钟`, f.format, f.pos, f.dist&&`${f.dist} km`, f.hi&&`高强度 ${f.hi}m`, f.sprint&&`冲刺 ${f.sprint}`, f.max&&`${f.max} m/s`, f.score&&`评分 ${f.score}`, (f.goal||f.assist)&&`${f.goal||0}球 ${f.assist||0}助`].filter(Boolean).join(' · ');
    const thumbs = (a.imgs||[]).map((s,j)=>`<img src="${s}" data-actimg="${i}_${j}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;cursor:pointer">`).join('');
    return `<div class="ex" style="cursor:default;align-items:flex-start">
      <div class="ex-info">
        <div class="ex-name">${isRun?'🏃 跑步':'⚽ 足球'}${a.note?` <span style="font-weight:400;color:var(--sub);font-size:12.5px">${a.note}</span>`:''}</div>
        <div class="ex-meta">${metrics||'—'}</div>
        ${thumbs?`<div style="display:flex;gap:6px;margin-top:6px">${thumbs}</div>`:''}
      </div>
      <span class="del" data-ai="${i}">删除</span>
    </div>`;
  }).join('') : '<div class="note" style="padding-top:10px">当天还没有运动记录。</div>';
}
$('#actPrev').onclick=()=>{ const d=new Date(actDate+'T12:00:00'); d.setDate(d.getDate()-1); actDate=fmt(d); renderAct(); };
$('#actNext').onclick=()=>{ const d=new Date(actDate+'T12:00:00'); d.setDate(d.getDate()+1); actDate=fmt(d); renderAct(); };
$('#actToday').onclick=()=>{ actDate=fmt(new Date()); renderAct(); };
$('#actList').addEventListener('click', e=>{
  const d = e.target.closest('.del');
  if(d){ const all=store.act; const arr=all[actDate]||[]; arr.splice(+d.dataset.ai,1); all[actDate]=arr; store.act=all; changed(); renderAct(); return; }
  const t = e.target.closest('[data-actimg]');
  if(t){ const w=window.open('','_blank'); w.document.write(`<img src="${t.src}" style="max-width:100%">`); }
});

// ---- 图片选择 ----
$('#rnImgBtn').onclick=()=>$('#rnImg').click();
$('#rnImg').addEventListener('change', async e=>{
  const f=e.target.files[0]; e.target.value=''; if(!f) return;
  $('#rnStatus').textContent='处理图片…';
  rnImgData = await compressForStorage(f);
  $('#rnPreview').innerHTML=`<img src="${rnImgData}" style="width:84px;border-radius:10px">`;
  $('#rnStatus').textContent='已添加截图';
});
$('#fbImgBtn').onclick=()=>$('#fbImgs').click();
$('#fbImgs').addEventListener('change', async e=>{
  const files=[...e.target.files].slice(0,3); e.target.value=''; if(!files.length) return;
  $('#fbStatus').textContent='处理图片…';
  for(const f of files){ fbImgsData.push(await compressForStorage(f)); }
  fbImgsData = fbImgsData.slice(0,3);
  $('#fbPreview').innerHTML = fbImgsData.map((s,i)=>`<span style="position:relative;display:inline-block"><img src="${s}" style="width:84px;border-radius:10px"><span data-fbrm="${i}" style="position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border-radius:50%;width:20px;height:20px;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer">×</span></span>`).join(' ');
  $('#fbStatus').textContent=`已添加 ${fbImgsData.length} 张`;
});
$('#fbPreview').addEventListener('click', e=>{
  const rm = e.target.closest('[data-fbrm]'); if(!rm) return;
  fbImgsData.splice(+rm.dataset.fbrm,1);
  $('#fbPreview').innerHTML = fbImgsData.map((s,i)=>`<span style="position:relative;display:inline-block"><img src="${s}" style="width:84px;border-radius:10px"><span data-fbrm="${i}" style="position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border-radius:50%;width:20px;height:20px;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer">×</span></span>`).join(' ');
  $('#fbStatus').textContent = fbImgsData.length?`已添加 ${fbImgsData.length} 张`:'';
});

// ---- AI 读图 ----
async function kimiVision(prompt, dataUrl){
  if(!localStorage.getItem(KIMI_LS)) throw new Error('请先在「饮食记录」页配置 Moonshot API Key');
  const j = await kimiChat({
    messages:[
      {role:'system', content:'你是运动数据提取助手，从App截图中提取数字。只输出JSON，找不到的字段填null。'},
      {role:'user', content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:dataUrl}}]}
    ]
  }, true);
  const txt=(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||'';
  return parseJsonLoose(txt);
}
$('#rnAi').onclick=async ()=>{
  if(!rnImgData){ alert('先上传记录截图'); return; }
  $('#rnStatus').textContent='AI 读图中…';
  try{
    const j = await kimiVision('这是跑步App的记录截图。提取：{"dist":距离km数字,"dur":时长分钟数字（如1:24:48填85）,"pace":"平均配速如5\'30\\"","hr":平均心率数字,"kcal":消耗kcal数字}', rnImgData);
    if(j.dist!=null) $('#rnDist').value=j.dist;
    if(j.dur!=null) $('#rnDur').value=j.dur;
    if(j.pace) $('#rnPace').value=j.pace;
    if(j.hr!=null) $('#rnHr').value=j.hr;
    if(j.kcal!=null) $('#rnKcal').value=j.kcal;
    $('#rnStatus').textContent='已填入，请核对';
  }catch(err){ $('#rnStatus').textContent='⚠️ '+err.message; }
};
$('#fbAi').onclick=async ()=>{
  if(!fbImgsData.length){ alert('先上传记录图'); return; }
  $('#fbStatus').textContent='AI 读图中…';
  try{
    const j = await kimiVision('这是足球运动数据App（Possiball神仙球）的记录截图。提取：{"dur":本场总用时分钟数字,"format":"几人制如11人制","pos":"位置","dist":本场距离km数字（7261m填7.3）,"hi":高强度距离m数字,"sprint":冲刺次数,"max":最大瞬时速度m/s数字,"score":五维评分数字}', fbImgsData[0]);
    if(j.dur!=null) $('#fbDur').value=j.dur;
    if(j.format) $('#fbFormat').value=j.format;
    if(j.pos) $('#fbPos').value=j.pos;
    if(j.dist!=null) $('#fbDist').value=j.dist;
    if(j.hi!=null) $('#fbHi').value=j.hi;
    if(j.sprint!=null) $('#fbSprint').value=j.sprint;
    if(j.max!=null) $('#fbMax').value=j.max;
    if(j.score!=null) $('#fbScore').value=j.score;
    $('#fbStatus').textContent='已填入，请核对';
  }catch(err){ $('#fbStatus').textContent='⚠️ '+err.message; }
};

// ---- 保存 ----
$('#rnSave').onclick=()=>{
  const data={ dist:$('#rnDist').value, dur:$('#rnDur').value, pace:$('#rnPace').value.trim(), hr:$('#rnHr').value, kcal:$('#rnKcal').value };
  if(!Object.values(data).some(v=>v)){ alert('至少填写一项数据'); return; }
  const all=store.act; (all[actDate]=all[actDate]||[]).push({ type:'run', data, imgs:rnImgData?[rnImgData]:[], note:$('#rnNote').value.trim(), ts:Date.now() });
  store.act=all; changed();
  ['rnDist','rnDur','rnPace','rnHr','rnKcal','rnNote'].forEach(id=>$('#'+id).value='');
  rnImgData=null; $('#rnPreview').innerHTML=''; $('#rnStatus').textContent='已保存 ✓';
  renderAct();
};
$('#fbSave').onclick=()=>{
  const data={ dur:$('#fbDur').value, format:$('#fbFormat').value.trim(), pos:$('#fbPos').value.trim(), dist:$('#fbDist').value, hi:$('#fbHi').value, sprint:$('#fbSprint').value, max:$('#fbMax').value, score:$('#fbScore').value, goal:$('#fbGoal').value, assist:$('#fbAssist').value };
  if(!Object.values(data).some(v=>v)){ alert('至少填写一项数据'); return; }
  const all=store.act; (all[actDate]=all[actDate]||[]).push({ type:'football', data, imgs:fbImgsData, note:$('#fbNote').value.trim(), ts:Date.now() });
  store.act=all; changed();
  ['fbDur','fbFormat','fbPos','fbDist','fbHi','fbSprint','fbMax','fbScore','fbGoal','fbAssist','fbNote'].forEach(id=>$('#'+id).value='');
  fbImgsData=[]; $('#fbPreview').innerHTML=''; $('#fbStatus').textContent='已保存 ✓';
  renderAct();
};

/* ================= 本周总结 ================= */
function weekReportCardHtml(weekKey){
  const s = store.summ[weekKey];
  return `<div class="card">
    <div class="sec-title">📈 本周总结 <button class="btn small" id="genSumm">${s?'重新生成':'生成本周总结'}</button></div>
    ${s
      ? `<div class="note">${s.text.replace(/\n/g,'<br>')}</div><div class="note" style="padding-top:0">生成于 ${s.ts}</div>`
      : `<div class="note">汇总本周训练打卡、饮食记录和运动数据，给出分析和下周建议。${localStorage.getItem(KIMI_LS)?'已配置 Kimi Key，将由大模型深度分析。':'配置 Kimi Key 后可由大模型深度分析，当前为本地统计模板。'}</div>`}
  </div>`;
}
function collectWeekStats(weekKey){
  const mon = new Date(weekKey+'T12:00:00');
  const checks = store.checks[weekKey]||{};
  const moves = store.moves[weekKey]||{};
  const lines=[]; let tTotal=0,tDone=0;
  PLAN.forEach(day=>{
    const dn=day.ex.length, dd=day.ex.filter((e,i)=>checks[`${day.id}_${i}`]).length;
    tTotal+=dn; tDone+=dd;
    const mv = moves[day.id] ? `（迁至${DOW_LIST.find(x=>x[0]===moves[day.id])[1]}）` : '';
    lines.push(`${day.dow}${day.title}${mv} ${dd}/${dn}`);
  });
  let kcalSum=0,pSum=0,days=0;
  const dayKcal=[];
  for(let i=0;i<7;i++){ const d=new Date(mon); d.setDate(d.getDate()+i); const k=fmt(d);
    const arr=(store.food.logs||{})[k]||[];
    if(arr.length){ days++; const kk=arr.reduce((s,e)=>s+(+e.kcal||0),0); kcalSum+=kk; pSum+=arr.reduce((s,e)=>s+(+e.p||0),0); dayKcal.push(`${DOW_LIST[i][1]}${Math.round(kk)}kcal`); }
  }
  let runDist=0,runCount=0,fbCount=0; const actLines=[];
  for(let i=0;i<7;i++){ const d=new Date(mon); d.setDate(d.getDate()+i); const k=fmt(d);
    ((store.act||{})[k]||[]).forEach(a=>{
      if(a.type==='run'){ runCount++; runDist+=+a.data.dist||0; actLines.push(`${DOW_LIST[i][1]}跑步${a.data.dist||'?'}km`); }
      if(a.type==='football'){ fbCount++; actLines.push(`${DOW_LIST[i][1]}足球${a.data.dur||'?'}分钟/${a.data.dist||'?'}km${a.data.score?'/评分'+a.data.score:''}`); }
    });
  }
  const pct=tTotal?Math.round(tDone/tTotal*100):0;
  const text = `【训练】完成 ${tDone}/${tTotal} 项（${pct}%）。${lines.join('；')}
【饮食】记录 ${days} 天${days?`，日均 ${Math.round(kcalSum/days)} kcal、蛋白质 ${Math.round(pSum/days)} g（${dayKcal.join('，')}）`:''}
【运动】跑步 ${runCount} 次共 ${runDist.toFixed(1)} km；足球 ${fbCount} 场${actLines.length?'（'+actLines.join('，')+'）':''}`;
  return {text, pct, tDone, tTotal, days, avgKcal:days?Math.round(kcalSum/days):0, avgP:days?Math.round(pSum/days):0, runCount, runDist, fbCount};
}
function localSummary(st){
  const tips=[];
  if(st.pct>=80) tips.push('训练完成率优秀，保持当前节奏');
  else if(st.pct>=50) tips.push(`训练完成率 ${st.pct}%，下周先保证力量训练日出勤`);
  else tips.push(`训练完成率仅 ${st.pct}%，建议下周降低预期、优先完成主项动作`);
  if(st.days>0){
    if(st.avgP<90) tips.push(`蛋白质日均 ${st.avgP}g 偏低（增肌建议 100-120g），练后餐和睡前餐别省`);
    if(st.avgKcal>3000) tips.push('日均热量偏高，结合血糖情况注意精制碳水比例');
  } else tips.push('本周没有饮食记录，建议至少记录训练日饮食');
  if(st.fbCount>0) tips.push('足球日后第二天务必做波速球恢复+泡沫轴');
  if(st.runCount===0) tips.push('本周无跑步记录，周中节奏跑和周日LSD对血糖和心肺很关键');
  return `本周训练完成 ${st.tDone}/${st.tTotal} 项（${st.pct}%），饮食记录 ${st.days} 天${st.days?`（日均 ${st.avgKcal} kcal、蛋白质 ${st.avgP}g）`:''}，跑步 ${st.runCount} 次 ${st.runDist.toFixed(1)}km，足球 ${st.fbCount} 场。\n建议：${tips.map((t,i)=>`${i+1}.${t}`).join('；')}。`;
}
async function kimiText(prompt){
  const j = await kimiChat({ messages:[{role:'user', content:prompt}] }, false);
  return (j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||'';
}
// 生成按钮（事件委托）
document.addEventListener('click', async e=>{
  if(e.target.id!=='genSumm') return;
  const btn=e.target; btn.disabled=true; btn.textContent='生成中…';
  try{
    const weekKey = fmt(currentMonday());
    const st = collectWeekStats(weekKey);
    let text;
    if(localStorage.getItem(KIMI_LS)){
      text = await kimiText(`你是用户的健身教练兼营养师。用户38岁，有血糖偏高问题，目标增肌+提升足球/跑步表现。根据以下本周数据，输出200-300字中文总结：1）训练完成情况点评（点名完成差的日子）2）饮食分析（热量、蛋白质是否达标，结合控糖）3）下周3条具体可执行的建议。语气直接具体，不空谈。\n\n${st.text}`);
      text = text.trim();
    } else {
      text = localSummary(st);
    }
    const all=store.summ; all[weekKey]={text, ts:new Date().toLocaleString('zh-CN')}; store.summ=all; changed();
  }catch(err){ alert('生成失败：'+err.message); }
  renderTrain();
});

/* ================= 初始化补充 ================= */
renderTrain(); // app.js 初始化时周报函数尚未加载，这里补渲染周报卡片
