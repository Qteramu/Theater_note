// Theater Note - 公演管理
const STORAGE_KEY = "theaterNote.performances.v1";
const STATUS_LABELS = { planned:"参加予定", attended:"参加済み", undecided:"未定", absent:"不参加" };
const TAGS_KEY = "theaterNote.tags.v1";
const DEFAULT_TAGS = ["日替わりA","日替わりB","日替わりC","日替わりD","日替わりE","初日","東京千秋楽","大千秋楽","シャッフルトーク","アフタートーク","お見送り会","カーテンコール撮影会","ライブパート全力応援回"];
function loadTagCatalog(){
 let saved=[];try{saved=JSON.parse(localStorage.getItem(TAGS_KEY)||"[]")}catch{}
 const fromShows=loadPerformances().flatMap(p=>(p.dates||[]).flatMap(d=>d.tags||[]));
 return [...new Set([...DEFAULT_TAGS,...saved,...fromShows].map(t=>String(t).trim()).filter(Boolean))];
}
function saveTagCatalog(tags){localStorage.setItem(TAGS_KEY,JSON.stringify([...new Set(tags.map(t=>t.trim()).filter(Boolean))]));}

function loadPerformances(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return []}}
function savePerformances(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items))}
function makeId(){return "p_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function normalizePerformance(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("公演データの形式が正しくありません。");
 const title=String(raw.title||raw.name||"").trim(); if(!title)throw new Error("公演名がありません。");
 const dates=Array.isArray(raw.dates)?raw.dates:(Array.isArray(raw.schedule)?raw.schedule:[]);
 return {id:String(raw.id||makeId()),title,venue:String(raw.venue||raw.location||"").trim(),
 periodStart:String(raw.periodStart||raw.startDate||"").slice(0,10),periodEnd:String(raw.periodEnd||raw.endDate||"").slice(0,10),
 themeColor:/^#[0-9a-fA-F]{6}$/.test(raw.themeColor||raw.color||"")?(raw.themeColor||raw.color):"#D8C5E8",
 generalEvents:String(raw.generalEvents||raw.events||"").trim(),memo:String(raw.memo||"").trim(),
 dates:dates.map(d=>({id:String(d.id||makeId()),date:String(d.date||d.day||"").slice(0,10),startTime:String(d.startTime||d.time||"").slice(0,5),
 tags:Array.isArray(d.tags)?[...new Set(d.tags.map(t=>String(t).trim()).filter(Boolean))]:String(d.tags||"").split(/[、,，]/).map(t=>t.trim()).filter(Boolean),status:Object.hasOwn(STATUS_LABELS,d.status)?d.status:"undecided",memo:String(d.memo||"").trim()})).filter(d=>d.date)};
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function notice(msg,type="info"){const n=document.getElementById("message");if(n){n.hidden=false;n.className="notice "+type;n.textContent=msg}}
function dateRowTemplate(d={}){
 const row=document.createElement("div");row.className="date-row";
 row.innerHTML=`<label class="field"><span>日付</span><input type="date" class="date-value" value="${esc(d.date||"")}"></label>
 <label class="field"><span>開演</span><input type="time" class="time-value" value="${esc(d.startTime||"")}"></label>
 <div class="field full tag-picker-field"><span>タグ（タップして選択・複数可）</span><div class="tag-picker"></div>
 <div class="tag-create"><input class="new-tag-value" placeholder="新しいタグを追加"><button type="button" class="btn add-tag">追加</button></div></div>
 <label class="field"><span>参加状況</span><select class="status-value"><option value="undecided">未定</option><option value="planned">参加予定</option><option value="attended">参加済み</option><option value="absent">不参加</option></select></label>
 <label class="field date-memo"><span>日別メモ</span><input class="memo-value" value="${esc(d.memo||"")}" placeholder="記念日・座席など"></label>
 <button type="button" class="remove-date" aria-label="この日程を削除">×</button>`;
 row.dataset.selectedTags=JSON.stringify(Array.isArray(d.tags)?d.tags:[]);
 const picker=row.querySelector(".tag-picker");
 function drawTags(){
  const selected=JSON.parse(row.dataset.selectedTags||"[]");
  picker.innerHTML="";
  loadTagCatalog().forEach(tag=>{
   const b=document.createElement("button");b.type="button";b.className="tag-choice"+(selected.includes(tag)?" selected":"");b.textContent=tag;
   b.setAttribute("aria-pressed",selected.includes(tag)?"true":"false");
   b.addEventListener("click",()=>{const current=JSON.parse(row.dataset.selectedTags||"[]");row.dataset.selectedTags=JSON.stringify(current.includes(tag)?current.filter(t=>t!==tag):[...current,tag]);drawTags()});
   picker.append(b);
  });
 }
 drawTags();
 row.querySelector(".add-tag").addEventListener("click",()=>{
  const input=row.querySelector(".new-tag-value"),tag=input.value.trim();if(!tag)return;
  saveTagCatalog([...loadTagCatalog(),tag]);
  const selected=JSON.parse(row.dataset.selectedTags||"[]");if(!selected.includes(tag))selected.push(tag);row.dataset.selectedTags=JSON.stringify(selected);
  input.value="";drawTags();
 });
 row.querySelector(".new-tag-value").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();row.querySelector(".add-tag").click()}});
 row.querySelector(".status-value").value=Object.hasOwn(STATUS_LABELS,d.status)?d.status:"undecided";
 row.querySelector(".remove-date").addEventListener("click",()=>row.remove());return row;
}
function collectForm(){
 const dates=[...document.querySelectorAll("#dateRows .date-row")].map(r=>({id:makeId(),date:r.querySelector(".date-value").value,startTime:r.querySelector(".time-value").value,
 tags:JSON.parse(r.dataset.selectedTags||"[]"),status:r.querySelector(".status-value").value,memo:r.querySelector(".memo-value").value.trim()})).filter(d=>d.date);
 return normalizePerformance({id:document.getElementById("editingId").value||makeId(),title:document.getElementById("title").value,venue:document.getElementById("venue").value,
 periodStart:document.getElementById("periodStart").value,periodEnd:document.getElementById("periodEnd").value,themeColor:document.getElementById("themeColor").value,
 generalEvents:document.getElementById("generalEvents").value,memo:document.getElementById("memo").value,dates});
}
function fillForm(p){
 document.getElementById("editingId").value=p?.id||"";
 for(const key of ["title","venue","periodStart","periodEnd","themeColor","memo"])document.getElementById(key).value=p?.[key]??(key==="themeColor"?"#D8C5E8":"");
 const holder=document.getElementById("dateRows");holder.replaceChildren();(p?.dates?.length?p.dates:[{}]).forEach(d=>holder.append(dateRowTemplate(d)));
 document.getElementById("savePerformance").textContent=p?"変更を保存":"公演を登録";
 document.getElementById("editPageTitle").textContent=p?"公演を編集":"公演を登録";
}
function initEditPage(){
 const form=document.getElementById("performanceForm");if(!form)return;
 const id=new URLSearchParams(location.search).get("id");const existing=id?loadPerformances().find(p=>p.id===id):null;
 if(id&&!existing){notice("公演情報が見つかりません。","error");return}
 fillForm(existing);document.getElementById("addDateRow").addEventListener("click",()=>document.getElementById("dateRows").append(dateRowTemplate()));
 document.getElementById("cancelEdit").addEventListener("click",()=>location.href=existing?`show-detail.html?id=${encodeURIComponent(existing.id)}`:"performances.html");
 form.addEventListener("submit",e=>{e.preventDefault();try{
 const candidate=collectForm();let items=loadPerformances();const duplicate=items.find(p=>p.id!==candidate.id&&p.title.toLowerCase()===candidate.title.toLowerCase()&&p.venue.toLowerCase()===candidate.venue.toLowerCase());
 if(duplicate){notice("同じ公演名・会場の公演がすでにあります。別の公演として登録する場合は、公演名や会場を確認してください。","error");return}
 if(existing&&!confirm("この公演情報を上書き保存しますか？"))return;
 if(existing)items=items.map(p=>p.id===existing.id?candidate:p);else items.push(candidate);
 savePerformances(items);location.href=`show-detail.html?id=${encodeURIComponent(candidate.id)}`;
 }catch(err){notice(err.message,"error")}});
}
function formatPeriod(p){if(p.periodStart&&p.periodEnd)return `${p.periodStart} ～ ${p.periodEnd}`;if(p.periodStart)return `${p.periodStart} ～`;if(p.periodEnd)return `～ ${p.periodEnd}`;const ds=p.dates.map(d=>d.date).sort();return ds.length?`${ds[0]} ～ ${ds[ds.length-1]}`:"期間未設定"}
function initListPage(){
 const list=document.getElementById("performanceList");if(!list)return;
 function render(){
 const items=loadPerformances();document.getElementById("performanceCount").textContent=`${items.length}件`;
 if(!items.length){list.innerHTML='<div class="placeholder-note">まだ公演が登録されていません。</div>';return}
 list.innerHTML=items.map(p=>`<a class="performance-card performance-card-link" href="show-detail.html?id=${encodeURIComponent(p.id)}">
 <span class="performance-color" style="background:${esc(p.themeColor)}"></span><div class="performance-card-main">
 <h3>${esc(p.title)}</h3><p>${esc(p.venue||"会場未設定")}</p><div class="performance-period">${esc(formatPeriod(p))}</div>
 <div class="performance-card-foot"><span>${p.dates.length}公演</span><span>詳細を見る　›</span></div></div></a>`).join("");
 }
 render();
 const toggle=document.getElementById("toggleImport"),panel=document.getElementById("importPanel");
 toggle?.addEventListener("click",()=>{panel.hidden=!panel.hidden;toggle.textContent=panel.hidden?"開く":"閉じる"});
 document.getElementById("previewJson")?.addEventListener("click",()=>{
 const preview=document.getElementById("importPreview");try{
 const parsed=JSON.parse(document.getElementById("jsonInput").value);const raws=Array.isArray(parsed)?parsed:(Array.isArray(parsed.performances)?parsed.performances:[parsed]);const candidates=raws.map(normalizePerformance);
 if(!candidates.length)throw new Error("取り込める公演データがありません。");
 preview.hidden=false;preview.innerHTML=`<h3>取り込み内容の確認（${candidates.length}件）</h3>`+candidates.map(p=>`<div class="preview-item"><strong>${esc(p.title)}</strong><span>${esc(p.venue||"会場未設定")} · ${p.dates.length}公演</span><small>${esc(formatPeriod(p))}</small></div>`).join("")+'<button type="button" class="btn btn-primary" id="confirmImport">この内容で取り込む</button>';
 document.getElementById("confirmImport").addEventListener("click",()=>{let all=loadPerformances(),added=0,replaced=0,skipped=0;
 for(const c of candidates){const dup=all.find(p=>p.id===c.id||(p.title.toLowerCase()===c.title.toLowerCase()&&p.venue.toLowerCase()===c.venue.toLowerCase()));
 if(dup){const choice=prompt(`「${dup.title}」と同じ公演が登録済みです。\\n上書き／別名追加／スキップ のいずれかを入力してください。`,"スキップ");
 if(choice==="上書き"){c.id=dup.id;all=all.map(p=>p.id===dup.id?c:p);replaced++}else if(choice==="別名追加"){c.id=makeId();all.push(c);added++}else skipped++;
 }else{all.push(c);added++}}
 savePerformances(all);render();notice(`取り込み完了：新規 ${added}件／上書き ${replaced}件／スキップ ${skipped}件`,"success");preview.hidden=true;
 });
 }catch(err){preview.hidden=true;notice("JSONを読み取れませんでした："+err.message,"error")}
 });
}
function initDetailPage(){
 const root=document.getElementById("showDetail");if(!root)return;const id=new URLSearchParams(location.search).get("id");const p=loadPerformances().find(x=>x.id===id);
 if(!p){root.innerHTML='<div class="placeholder-note">公演情報が見つかりません。公演一覧から選び直してください。</div>';return}
 const dates=p.dates.slice().sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime));
 const groups=dates.reduce((acc,d)=>{(acc[d.date]??=[]).push(d);return acc},{});
 root.innerHTML=`<section class="card detail-card"><div class="detail-title-row"><span class="performance-color" style="background:${esc(p.themeColor)}"></span><div><h2>${esc(p.title)}</h2><p>${esc(p.venue||"会場未設定")}</p><div class="performance-period">${esc(formatPeriod(p))}</div></div></div>
 <div class="detail-meta"><span>${dates.length}公演</span></div>
 ${p.memo?`<div class="detail-memo"><strong>公演メモ</strong><p>${esc(p.memo).replace(/\\n/g,"<br>")}</p></div>`:""}
 <div class="detail-actions"><a class="btn btn-primary" href="show-edit.html?id=${encodeURIComponent(p.id)}">編集する</a><button class="btn delete-detail" type="button">公演を削除</button></div></section>
 <section class="card schedule-card"><h2 class="card-title">公演日程</h2><p class="help-text">日付をタップすると、その日の公演情報が開きます。</p>
 ${Object.keys(groups).length?Object.entries(groups).map(([day,ds],i)=>`<details class="schedule-day" ${i===0?"":""}><summary><strong>${esc(day)}</strong><span>${ds.length}公演</span></summary><div class="schedule-day-content">${ds.map(d=>`<div class="schedule-item"><div class="schedule-time">${esc(d.startTime||"時間未定")}</div><div class="schedule-item-main"><strong>${esc(d.tags?.[0]||"公演")}</strong>${d.tags?.length?`<div class="tag-list">${d.tags.map(t=>`<span class="show-tag">${esc(t)}</span>`).join("")}</div>`:""}${d.memo?`<p>${esc(d.memo)}</p>`:""}</div><span class="status status-${d.status==="attended"?"done":d.status==="planned"?"planned":d.status==="absent"?"no":"pending"}">${STATUS_LABELS[d.status]}</span></div>`).join("")}</div></details>`).join(""):'<div class="placeholder-note">公演日程はまだ登録されていません。</div>'}</section>`;
 root.querySelector(".delete-detail").addEventListener("click",()=>{if(confirm(`「${p.title}」を削除しますか？この操作は取り消せません。`)){savePerformances(loadPerformances().filter(x=>x.id!==p.id));location.href="performances.html"}});
}

function initCalendarPage(){
 const grid=document.getElementById("calendarGrid");if(!grid)return;
 const title=document.getElementById("calendarMonthTitle");
 const empty=document.getElementById("calendarEmpty");
 const today=new Date();let view=new Date(today.getFullYear(),today.getMonth(),1);
 const weekdayNames=["日","月","火","水","木","金","土"];
 function render(){
  const year=view.getFullYear(),month=view.getMonth();
  title.textContent=`${year}年${month+1}月`;
  const all=loadPerformances();const byDate={};
  for(const p of all)for(const d of (p.dates||[])){
   if(!d.date)continue;(byDate[d.date]??=[]).push({performance:p,date:d});
  }
  const first=new Date(year,month,1),start=new Date(year,month,1-first.getDay());
  const lastDay=new Date(year,month+1,0).getDate();
  const cells=Math.ceil((first.getDay()+lastDay)/7)*7;
  let monthHasEvent=false;grid.innerHTML="";
  for(let i=0;i<cells;i++){
   const day=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
   const key=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`;
   const entries=(byDate[key]||[]).sort((a,b)=>(a.date.startTime||"").localeCompare(b.date.startTime||""));
   if(day.getMonth()===month&&entries.length)monthHasEvent=true;
   const cell=document.createElement("div");cell.className="live-calendar-day"+(day.getMonth()!==month?" outside":"")+(day.toDateString()===today.toDateString()?" is-today":"");
   const num=document.createElement("div");num.className="calendar-day-number";num.textContent=day.getDate();cell.append(num);
   const eventWrap=document.createElement("div");eventWrap.className="calendar-day-events";
   entries.forEach(({performance,date})=>{
    const a=document.createElement("a");a.className="calendar-event-link";a.href=`show-detail.html?id=${encodeURIComponent(performance.id)}`;
    a.style.setProperty("--event-color",performance.themeColor||"#b8c8b9");
    const time=date.startTime?`${date.startTime} `:"";
    a.innerHTML=`<span class="calendar-event-main">${esc(time+performance.title)}</span>${date.tags?.length?`<span class="calendar-event-tags">${date.tags.slice(0,2).map(t=>`<i>${esc(t)}</i>`).join("")}</span>`:""}`;
    a.title=`${time}${performance.title}${date.events?"｜"+date.events:""}`;
    eventWrap.append(a);
   });
   cell.append(eventWrap);grid.append(cell);
  }
  empty.hidden=monthHasEvent;
 }
 document.getElementById("prevMonth").addEventListener("click",()=>{view=new Date(view.getFullYear(),view.getMonth()-1,1);render()});
 document.getElementById("nextMonth").addEventListener("click",()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);render()});
 document.getElementById("todayMonth").addEventListener("click",()=>{view=new Date(today.getFullYear(),today.getMonth(),1);render()});
 // 登録データの最初の公演月を初期表示。予定がなければ今月を表示。
 const dates=loadPerformances().flatMap(p=>(p.dates||[]).map(d=>d.date).filter(Boolean)).sort();
 if(dates.length){const [y,m]=dates[0].split("-").map(Number);view=new Date(y,m-1,1)}
 render();
}

document.addEventListener("DOMContentLoaded",()=>{
 const rawPage=document.body.dataset.page||"home";const pg=["show-edit","show-detail"].includes(rawPage)?"performances":rawPage;document.querySelectorAll(`[data-nav="${pg}"]`).forEach(a=>{a.classList.add("active");a.setAttribute("aria-current","page")});
 const today=document.querySelector("[data-today]");if(today)today.textContent=new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(new Date());
 initListPage();initEditPage();initDetailPage();initCalendarPage();
});