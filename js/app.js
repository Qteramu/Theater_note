// Theater Note - 共通処理と公演管理
const STORAGE_KEY = "theaterNote.performances.v1";
const STATUS_LABELS = { planned: "参加予定", attended: "参加済み", undecided: "未定", absent: "不参加" };

function loadPerformances() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function savePerformances(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
function makeId() {
  return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}
function normalizePerformance(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("公演データの形式が正しくありません。");
  const title = String(raw.title || raw.name || "").trim();
  if (!title) throw new Error("公演名がありません。");
  const dates = Array.isArray(raw.dates) ? raw.dates : (Array.isArray(raw.schedule) ? raw.schedule : []);
  return {
    id: String(raw.id || makeId()),
    title,
    venue: String(raw.venue || raw.location || "").trim(),
    periodStart: String(raw.periodStart || raw.startDate || "").slice(0, 10),
    periodEnd: String(raw.periodEnd || raw.endDate || "").slice(0, 10),
    themeColor: /^#[0-9a-fA-F]{6}$/.test(raw.themeColor || raw.color || "") ? (raw.themeColor || raw.color) : "#D8C5E8",
    generalEvents: String(raw.generalEvents || raw.events || "").trim(),
    memo: String(raw.memo || "").trim(),
    dates: dates.map(d => ({
      id: String(d.id || makeId()),
      date: String(d.date || d.day || "").slice(0, 10),
      startTime: String(d.startTime || d.time || "").slice(0, 5),
      events: String(d.events || d.event || "").trim(),
      status: Object.hasOwn(STATUS_LABELS, d.status) ? d.status : "undecided",
      memo: String(d.memo || "").trim()
    })).filter(d => d.date)
  };
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function setNotice(message, type = "info") {
  const node = document.getElementById("message");
  if (!node) return;
  node.hidden = false; node.className = "notice " + type; node.textContent = message;
}
function clearNotice() {
  const node = document.getElementById("message");
  if (node) { node.hidden = true; node.textContent = ""; }
}
function dateRowTemplate(data = {}) {
  const row = document.createElement("div");
  row.className = "date-row";
  row.innerHTML = `
    <label class="field"><span>日付</span><input type="date" class="date-value" value="${escapeHtml(data.date || "")}"></label>
    <label class="field"><span>開演</span><input type="time" class="time-value" value="${escapeHtml(data.startTime || "")}"></label>
    <label class="field"><span>追加イベント</span><input class="event-value" value="${escapeHtml(data.events || "")}" placeholder="アフタートークなど"></label>
    <label class="field"><span>参加状況</span><select class="status-value"><option value="undecided">未定</option><option value="planned">参加予定</option><option value="attended">参加済み</option><option value="absent">不参加</option></select></label>
    <label class="field date-memo"><span>日別メモ</span><input class="memo-value" value="${escapeHtml(data.memo || "")}" placeholder="記念日・座席など"></label>
    <button type="button" class="remove-date" aria-label="この日程を削除">×</button>`;
  row.querySelector(".status-value").value = Object.hasOwn(STATUS_LABELS, data.status) ? data.status : "undecided";
  row.querySelector(".remove-date").addEventListener("click", () => row.remove());
  return row;
}
function collectManualForm() {
  const dateRows = [...document.querySelectorAll("#dateRows .date-row")].map(row => ({
    id: makeId(),
    date: row.querySelector(".date-value").value,
    startTime: row.querySelector(".time-value").value,
    events: row.querySelector(".event-value").value.trim(),
    status: row.querySelector(".status-value").value,
    memo: row.querySelector(".memo-value").value.trim()
  })).filter(d => d.date);
  return normalizePerformance({
    id: document.getElementById("editingId").value || makeId(),
    title: document.getElementById("title").value,
    venue: document.getElementById("venue").value,
    periodStart: document.getElementById("periodStart").value,
    periodEnd: document.getElementById("periodEnd").value,
    themeColor: document.getElementById("themeColor").value,
    generalEvents: document.getElementById("generalEvents").value,
    memo: document.getElementById("memo").value,
    dates: dateRows
  });
}
function resetForm() {
  document.getElementById("performanceForm").reset();
  document.getElementById("editingId").value = "";
  document.getElementById("themeColor").value = "#D8C5E8";
  document.getElementById("dateRows").replaceChildren();
  document.getElementById("savePerformance").textContent = "公演を登録";
  document.getElementById("cancelEdit").hidden = true;
}
function editPerformance(id) {
  const item = loadPerformances().find(p => p.id === id);
  if (!item) return;
  document.getElementById("editingId").value = item.id;
  document.getElementById("title").value = item.title;
  document.getElementById("venue").value = item.venue;
  document.getElementById("periodStart").value = item.periodStart;
  document.getElementById("periodEnd").value = item.periodEnd;
  document.getElementById("themeColor").value = item.themeColor;
  document.getElementById("generalEvents").value = item.generalEvents;
  document.getElementById("memo").value = item.memo;
  const holder = document.getElementById("dateRows"); holder.replaceChildren();
  item.dates.forEach(d => holder.append(dateRowTemplate(d)));
  document.getElementById("savePerformance").textContent = "変更を保存";
  document.getElementById("cancelEdit").hidden = false;
  document.getElementById("manualPanel").hidden = false;
  document.getElementById("pastePanel").hidden = true;
  document.querySelectorAll(".mode-tab").forEach(b => b.classList.toggle("active", b.dataset.mode === "manual"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderPerformanceList() {
  const list = document.getElementById("performanceList");
  if (!list) return;
  const items = loadPerformances();
  document.getElementById("performanceCount").textContent = `${items.length}件`;
  if (!items.length) { list.innerHTML = '<div class="placeholder-note">まだ公演が登録されていません。</div>'; return; }
  list.innerHTML = items.map(p => `
    <article class="performance-card">
      <span class="performance-color" style="background:${escapeHtml(p.themeColor)}"></span>
      <div class="performance-card-main">
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.venue || "会場未設定")} · ${p.dates.length}公演日</p>
        <div class="performance-date-summary">${p.dates.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(d => `${escapeHtml(d.date)} ${escapeHtml(d.startTime)} <span class="status status-${d.status === "attended" ? "done" : d.status === "planned" ? "planned" : d.status === "absent" ? "no" : "pending"}">${STATUS_LABELS[d.status]}</span>`).join("　")}</div>
      </div>
      <div class="performance-actions"><button class="btn edit-item" data-id="${escapeHtml(p.id)}">編集</button><button class="btn delete-item" data-id="${escapeHtml(p.id)}">削除</button></div>
    </article>`).join("");
  list.querySelectorAll(".edit-item").forEach(b => b.addEventListener("click", () => editPerformance(b.dataset.id)));
  list.querySelectorAll(".delete-item").forEach(b => b.addEventListener("click", () => {
    const item = loadPerformances().find(p => p.id === b.dataset.id);
    if (!item) return;
    if (!confirm(`「${item.title}」を削除しますか？\\nこの公演情報と公演日が削除されます。この操作は取り消せません。`)) return;
    savePerformances(loadPerformances().filter(p => p.id !== item.id));
    renderPerformanceList(); setNotice("公演を削除しました。", "success");
  }));
}
function findDuplicate(candidate, items) {
  return items.find(p => p.id === candidate.id ||
    (p.title.trim().toLocaleLowerCase() === candidate.title.trim().toLocaleLowerCase() &&
     p.venue.trim().toLocaleLowerCase() === candidate.venue.trim().toLocaleLowerCase()));
}
function importCandidates(candidates) {
  let items = loadPerformances();
  let added = 0, replaced = 0, skipped = 0;
  for (const candidate of candidates) {
    const duplicate = findDuplicate(candidate, items);
    if (duplicate) {
      const choice = prompt(
        `同じ公演と思われるデータがあります。\\n\\n既存：${duplicate.title}（${duplicate.venue || "会場未設定"}）\\n取込：${candidate.title}（${candidate.venue || "会場未設定"}）\\n\\n上書きする場合は「上書き」、別公演として追加する場合は「別名追加」、変更しない場合は「スキップ」と入力してください。`,
        "スキップ"
      );
      if (choice === "上書き") {
        candidate.id = duplicate.id;
        items = items.map(p => p.id === duplicate.id ? candidate : p);
        replaced++;
      } else if (choice === "別名追加") {
        candidate.id = makeId(); items.push(candidate); added++;
      } else { skipped++; }
    } else { items.push(candidate); added++; }
  }
  savePerformances(items);
  renderPerformanceList();
  setNotice(`取り込み完了：新規 ${added}件／上書き ${replaced}件／スキップ ${skipped}件`, "success");
}
function initPerformancePage() {
  if (!document.getElementById("performanceForm")) return;
  const holder = document.getElementById("dateRows");
  holder.append(dateRowTemplate());
  document.getElementById("addDateRow").addEventListener("click", () => holder.append(dateRowTemplate()));
  document.getElementById("cancelEdit").addEventListener("click", resetForm);
  document.getElementById("performanceForm").addEventListener("submit", event => {
    event.preventDefault(); clearNotice();
    try {
      const candidate = collectManualForm();
      let items = loadPerformances();
      const editingId = document.getElementById("editingId").value;
      if (editingId) {
        const existing = items.find(p => p.id === editingId);
        if (existing && !confirm(`「${existing.title}」の内容を上書きしますか？\\n既存の公演情報・日程・メモが、今回の入力内容に置き換わります。`)) return;
        items = items.map(p => p.id === editingId ? candidate : p);
      } else {
        const duplicate = findDuplicate(candidate, items);
        if (duplicate) {
          const overwrite = confirm(`同じ公演名・会場のデータが既にあります。\\n「${duplicate.title}」を上書きしますか？\\n\\nキャンセルを押すと登録を中止します。`);
          if (!overwrite) return;
          candidate.id = duplicate.id;
          items = items.map(p => p.id === duplicate.id ? candidate : p);
        } else items.push(candidate);
      }
      savePerformances(items); resetForm(); renderPerformanceList();
      setNotice("公演情報を保存しました。", "success");
    } catch (error) { setNotice(error.message, "error"); }
  });
  document.querySelectorAll(".mode-tab").forEach(button => button.addEventListener("click", () => {
    const paste = button.dataset.mode === "paste";
    document.getElementById("manualPanel").hidden = paste;
    document.getElementById("pastePanel").hidden = !paste;
    document.querySelectorAll(".mode-tab").forEach(b => b.classList.toggle("active", b === button));
    clearNotice();
  }));
  document.getElementById("previewJson").addEventListener("click", () => {
    clearNotice();
    const preview = document.getElementById("importPreview");
    try {
      const parsed = JSON.parse(document.getElementById("jsonInput").value);
      const rawItems = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.performances) ? parsed.performances : [parsed]);
      const normalized = rawItems.map(normalizePerformance);
      if (!normalized.length) throw new Error("取り込める公演データがありません。");
      preview.hidden = false;
      preview.innerHTML = `<h3>取り込み内容の確認（${normalized.length}件）</h3>` + normalized.map(p => `
        <div class="preview-item"><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.venue || "会場未設定")} · ${p.dates.length}公演日</span>
        <small>${p.dates.map(d => `${escapeHtml(d.date)} ${escapeHtml(d.startTime)} ${escapeHtml(d.events)}`).join("<br>") || "公演日未登録"}</small></div>`).join("") +
        '<button type="button" class="btn btn-primary" id="confirmImport">この内容で取り込む</button>';
      document.getElementById("confirmImport").addEventListener("click", () => importCandidates(normalized));
    } catch (error) { preview.hidden = true; setNotice("JSONを読み取れませんでした：" + error.message, "error"); }
  });
  renderPerformanceList();
}
document.addEventListener("DOMContentLoaded", () => {
  const currentPage = document.body.dataset.page || "home";
  document.querySelectorAll(`[data-nav="${currentPage}"]`).forEach(link => {
    link.classList.add("active"); link.setAttribute("aria-current", "page");
  });
  const dateNode = document.querySelector("[data-today]");
  if (dateNode) dateNode.textContent = new Intl.DateTimeFormat("ja-JP", {year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(new Date());
  initPerformancePage();
});