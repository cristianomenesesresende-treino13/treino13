/* Treino 12 — controlador: estado, rotas, ações, backup/restauração, service worker e inicialização. */
(function (root) {
'use strict';
const T12 = root.T12, U = T12.U, M = T12.M, UI = T12.UI, V = T12.V, Store = T12.Store, ic = T12.ic;
const esc = U.esc, num = U.num, fmt = U.fmt, $ = UI.$, $$ = UI.$$;

T12.S = M.emptyState();
T12.ui = { week: {}, tab: 'semana', open: {}, period: 'mes', anchor: null, exKey: null, histLimit: 60, storeInfo: null };
T12.route = { name: 'hoje', args: [] };
T12.prof = () => T12.S.profiles.find(p => p.id === T12.S.active);
T12.save = now => Store.save(T12.S, now);
Store.onError = msg => UI.toast(msg);
Store.onExternalChange = async () => { if ($('#overlay')) return; const st = await Store.load(); T12.S = st; render(); };
window.addEventListener('pagehide', () => Store.flush());
document.addEventListener('visibilitychange', () => { if (document.hidden) Store.flush(); });

/* ---------------- rotas ---------------- */
T12.go = h => { if (location.hash === h) render(); else location.hash = h; };
function readRoute() { const parts = (location.hash.replace(/^#\/?/, '') || 'hoje').split('/'); T12.route = { name: parts[0] || 'hoje', args: parts.slice(1).map(decodeURIComponent) }; }
let lastSession = null;
window.addEventListener('hashchange', () => {
  UI.closeSheet(true);
  if (lastSession) { cleanupSession(lastSession); lastSession = null; }
  readRoute(); render(); window.scrollTo(0, 0);
});
/** Sessões abertas e abandonadas sem nenhum registro não poluem o histórico. */
function cleanupSession(id) {
  const p = T12.prof(); if (!p) return;
  const s = p.sessions.find(x => x.id === id);
  if (s && !M.hasData(s) && !s.finishedAt) { p.sessions.splice(p.sessions.indexOf(s), 1); T12.save(); }
}
const SCREEN = { treinos: 'treinos', progresso: 'progresso', mais: 'mais' };
function render() {
  UI.applyTheme(); UI.wakeOff();
  const app = $('#app'), S = T12.S, r = T12.route;
  if (!S.profiles.length || r.name === 'novo') { app.innerHTML = V.welcome(); V.bindWelcome(); return; }
  const p = T12.prof() || (S.active = S.profiles[0].id, T12.prof());
  if (!p.consent && r.name !== 'privacidade') { app.innerHTML = V.consentGate(p); bindConsent(p); return; }
  let html;
  switch (r.name) {
    case 'treinos': html = V.treinos(p) + UI.nav('treinos'); break;
    case 'sessao': { const s = p.sessions.find(x => x.id === r.args[0]); html = V.sessao(p, s); if (s) lastSession = s.id; break; }
    case 'checkin': html = V.checkin(p, r.args[0] || U.iso(U.mondayOf(U.today()))); break;
    case 'progresso': html = V.progresso(p) + UI.nav('progresso'); break;
    case 'mais': html = V.mais(p) + UI.nav('mais'); break;
    case 'programas': html = V.programas(p); break;
    case 'programa': html = V.programa(p, M.prog(p, r.args[0])); break;
    case 'dados': html = V.dados(p); loadDataInfo(); break;
    case 'privacidade': html = V.privacidade(); break;
    case 'ajuda': html = V.ajuda(); break;
    default: html = V.hoje(p) + UI.nav('hoje');
  }
  app.innerHTML = html;
  if (r.name === 'sessao') { UI.wakeOn(); tickElapsed(); }
  const hw = $('.heatwrap'); if (hw) hw.scrollLeft = hw.scrollWidth;
  UI.renderRest();
  document.title = 'Treino 12' + ({ treinos: ' · Treinos', progresso: ' · Progresso', mais: ' · Mais', sessao: ' · Treino' }[r.name] || '');
}
T12.render = render;
function bindConsent(p) {
  const mi = $('#g-minor'); mi.onchange = () => $('#g-guard-wrap').classList.toggle('hidden', !mi.checked);
}
async function loadDataInfo() {
  const [inf, snaps] = await Promise.all([Store.info(), Store.listSnapshots()]);
  T12.ui.storeInfo = inf;
  const si = $('#storeinfo'); if (si) si.innerHTML = V.storeInfo(inf);
  const box = $('#snaps'); if (!box) return;
  box.innerHTML = snaps.length ? snaps.map(s => `<button type="button" class="li" data-a="snap" data-id="${esc(s.id)}"><span class="ic">${ic('history')}</span><div class="grow"><div class="t">${esc(s.label)}</div><div class="s">${new Date(s.at).toLocaleString('pt-BR')}</div></div><span class="linkbtn">Restaurar</span></button>`).join('') : '<div class="li"><div class="grow small muted">Nenhum ainda — o primeiro é criado no próximo registro.</div></div>';
}

/* ---------------- sessão: helpers ---------------- */
let elapsedT;
function tickElapsed() {
  clearInterval(elapsedT);
  const upd = () => {
    const el = $('#elapsed'); if (!el) return clearInterval(elapsedT);
    const s = T12.prof().sessions.find(x => x.id === T12.route.args[0]);
    el.textContent = s && s.startedAt && !s.finishedAt ? '· ' + U.mmss((Date.now() - s.startedAt) / 1000) : s && s.finishedAt ? '· concluído' : '';
  };
  upd(); elapsedT = setInterval(upd, 1000);
}
const curSession = () => { const p = T12.prof(); return p && p.sessions.find(x => x.id === T12.route.args[0]); };
const entry = (s, id) => s && s.ex.find(e => e.id === id);
function touch(s) { if (!s.startedAt) s.startedAt = Date.now(); s.updatedAt = Date.now(); }
function refreshEntry(s, eid) {
  const el = $('#ex-' + eid); if (!el) return;
  const i = s.ex.findIndex(e => e.id === eid); if (i < 0) return el.remove();
  const a = document.activeElement, keep = a && a.dataset && a.dataset.i === eid && a.dataset.f ? `[data-i="${eid}"][data-f="${a.dataset.f}"]${a.dataset.k ? `[data-k="${a.dataset.k}"]` : ''}` : null;
  el.outerHTML = V.entryCard(T12.prof(), s, s.ex[i], i, M.bests(T12.prof(), s));
  if (keep) { const f = $(keep); f && f.focus(); }
  const done = s.ex.filter(e => M.entryStatus(e) === 'done').length;
  const pr = $('#prog'); if (pr) { pr.style.width = (s.ex.length ? done / s.ex.length * 100 : 0) + '%'; pr.parentElement.setAttribute('aria-valuenow', done); }
  const pt = $('#progtxt'); if (pt) pt.textContent = `${done}/${s.ex.length}`;
}
function openTreino(p, tid, w) {
  const prog = M.activeProgram(p), t = prog && prog.treinos.find(x => x.id === tid); if (!t) return;
  let s = M.weekSession(p, prog, t.id, M.weekStart(prog, w));
  if (!s) { s = M.newSession(prog, t, M.plannedDate(prog, t, w, U.today())); p.sessions.push(s); }
  T12.go('#/sessao/' + s.id);
}

/* ---------------- ações (delegação de eventos) ---------------- */
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a, p = T12.prof(), S = T12.S;
  const s = curSession(), e = entry(s, b.dataset.i);
  switch (a) {
    case 'back': if (history.length > 1) history.back(); else T12.go('#/hoje'); break;
    case 'policy': ev.preventDefault(); policySheet(); break;
    case 'profiles': profilesSheet(); break;
    case 'switch': S.active = b.dataset.id; T12.ui.week = {}; T12.save(); render(); UI.toast('Perfil: ' + T12.prof().name); break;
    case 'tab': T12.ui.tab = b.dataset.v; render(); break;
    case 'histmore': T12.ui.histLimit += 60; render(); break;
    case 'wk': { const prog = M.activeProgram(p); const d = +b.dataset.d; T12.ui.week[prog.id] = d === 0 ? null : (T12.ui.week[prog.id] || M.programWeek(prog, U.today())) + d; render(); break; }
    case 'open': openTreino(p, b.dataset.t, +b.dataset.w); break;
    case 'free': { const sn = M.newSession(null, null, b.dataset.date || U.iso(U.today())); p.sessions.push(sn); T12.go('#/sessao/' + sn.id); setTimeout(() => addEntrySheet(sn), 150); break; }
    case 'activity': activitySheet(p, b.dataset.id, b.dataset.date); break;
    case 'period': T12.ui.period = b.dataset.v; render(); break;
    case 'anchor': T12.ui.anchor = b.dataset.v; render(); break;
    case 'goyear': T12.ui.period = 'ano'; T12.ui.anchor = b.dataset.v + '-06-01'; render(); window.scrollTo(0, 0); break;

    /* sessão */
    case 'set': {
      UI.unlockAudio(); if (!e) return;
      const k = +b.dataset.k, r = e.rows[k];
      if (!r.ok && e.type !== 'mob') {
        const prev = M.prevEntry(p, e.key, s), ps = prev ? prev.e.rows.filter(x => x.ok) : [], pv = ps[k] || ps[ps.length - 1], above = k > 0 ? e.rows[k - 1] : null;
        if (r.kg === '') r.kg = above && above.kg !== '' ? above.kg : pv ? pv.kg : '';
        if (r.r === '') r.r = above && above.r !== '' ? above.r : pv ? pv.r : '';
        if (r.r === '') { UI.toast(e.type === 'tempo' ? 'Informe os segundos' : 'Informe as repetições'); const f = $(`[data-i="${e.id}"][data-f="r"][data-k="${k}"]`); f && f.focus(); return; }
      }
      r.ok = !r.ok; touch(s);
      if (e.type === 'mob' && r.ok && e.rows.every(x => x.ok) && !e.mins) e.mins = String(e.target || '');
      T12.save(); refreshEntry(s, e.id);
      if (r.ok) { try { navigator.vibrate && navigator.vibrate(15); } catch (_) {} if (e.type !== 'mob' && S.settings.rest && !(M.sessionStatus(s) === 'done')) UI.startRest(S.settings.rest); }
      break; }
    case 'addset': if (e) { const last = e.rows[e.rows.length - 1]; e.rows.push({ kg: last ? last.kg : '', r: '', ok: false }); T12.save(); refreshEntry(s, e.id); } break;
    case 'delset': if (e && e.rows.length > 1) { e.rows.pop(); T12.save(); refreshEntry(s, e.id); } break;
    case 'more': T12.ui.open[b.dataset.i] = !T12.ui.open[b.dataset.i]; refreshEntry(s, b.dataset.i); break;
    case 'scale': if (e) { const v = +b.dataset.v; e[b.dataset.f] = e[b.dataset.f] === v ? null : v; touch(s); T12.save(); refreshEntry(s, e.id); } break;
    case 'feel': if (e) { e.feel = e.feel === b.dataset.v ? null : b.dataset.v; T12.save(); refreshEntry(s, e.id); } break;
    case 'step': case 'setmin': if (e) { e.mins = String(a === 'setmin' ? +b.dataset.m : Math.max(0, (num(e.mins) == null ? (e.target || 0) : num(e.mins)) + +b.dataset.d)); touch(s); T12.save(); refreshEntry(s, e.id); } break;
    case 'delentry': if (e) { const i = s.ex.indexOf(e); s.ex.splice(i, 1); T12.save(); render(); UI.toast('Exercício removido', 'Desfazer', () => { s.ex.splice(i, 0, e); T12.save(); render(); }); } break;
    case 'addentry': addEntrySheet(s); break;
    case 'sdate': dateSheet(s); break;
    case 'smenu': sessionMenu(p, s); break;
    case 'finish': finishSheet(p, s); break;
    case 'rest+': UI.addRest(15); break;
    case 'restskip': UI.stopRest(); break;

    /* check-in */
    case 'energy': { const c = checkinFor(p, b.dataset.mon, true); c.energy = c.energy === b.dataset.v ? null : b.dataset.v; T12.save(); $$('[data-a="energy"]').forEach(x => { const on = x === b && !!c.energy; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); break; }
    case 'delcheckin': { const c = checkinFor(p, b.dataset.mon); if (c && await UI.confirm('Excluir check-in?', 'As medidas desta semana serão apagadas.', 'Excluir', true)) { p.checkins.splice(p.checkins.indexOf(c), 1); T12.save(); history.back(); } break; }

    /* programas */
    case 'prog-new': programSheet(p); break;
    case 'prog-edit': programSheet(p, M.prog(p, b.dataset.id)); break;
    case 'prog-activate': { const g = M.prog(p, b.dataset.id); delete g.archivedAt; const old = M.activeProgram(p); if (old && old !== g && !old.archivedAt) old.archivedAt = U.iso(U.today()); p.activeProgram = g.id; T12.save(); render(); UI.toast('Programa ativado'); break; }
    case 'prog-dup': { const g = M.prog(p, b.dataset.id); const c = M.copyProgram(g, { name: g.name + ' (cópia)', start: U.iso(U.mondayOf(U.today())) }); c.archivedAt = U.iso(U.today()); p.programs.push(c); T12.save(); render(); UI.toast('Programa duplicado (inativo)'); break; }
    case 'prog-del': { const g = M.prog(p, b.dataset.id); if (await UI.confirm('Excluir programa?', `“${esc(g.name)}” será removido. Os treinos já registrados continuam no histórico e no Progresso.`, 'Excluir', true)) { p.programs.splice(p.programs.indexOf(g), 1); T12.save(); render(); } break; }
    case 'prog-repeat': { const g = M.activeProgram(p); const c = M.copyProgram(g, { name: g.name, start: U.iso(U.mondayOf(U.today())) }); g.archivedAt = U.iso(U.today()); p.programs.push(c); p.activeProgram = c.id; T12.ui.week = {}; T12.save(); render(); UI.toast('Novo ciclo iniciado'); break; }
    case 'prog-continuous': { const g = M.activeProgram(p); g.weeks = null; T12.save(); render(); UI.toast('Programa sem data de fim'); break; }
    case 'editt': treinoSheet(p, M.prog(p, b.dataset.p), b.dataset.t); break;
    case 'addtreino': treinoSheet(p, M.prog(p, b.dataset.p)); break;
    case 'editex': { const g = M.prog(p, b.dataset.p), t = g.treinos.find(x => x.id === b.dataset.t); exSheet(t, t.ex.find(x => x.id === b.dataset.e)); break; }
    case 'addex': { const g = M.prog(p, b.dataset.p); exSheet(g.treinos.find(x => x.id === b.dataset.t)); break; }

    /* preferências */
    case 'restset': S.settings.rest = +b.dataset.v; T12.save(); render(); break;
    case 'goal': S.settings.goal = +b.dataset.v; T12.save(); render(); break;
    case 'sound': S.settings.sound = !S.settings.sound; T12.save(); render(); break;
    case 'theme': S.settings.theme = b.dataset.v; T12.save(); render(); break;
    case 'editprof': profileSheet(p); break;

    /* dados */
    case 'backup': doBackup(); break;
    case 'restore': doRestore(); break;
    case 'csv': exportCSV(p); break;
    case 'persist': { const ok = await Store.persist(); UI.toast(ok ? 'Proteção ativada' : 'O navegador não liberou a proteção agora. Instalar o app ajuda.'); render(); break; }
    case 'snap': restoreSnapshot(b.dataset.id); break;
    case 'delprof': case 'revoke': case 'consent-no': deleteProfile(p, a); break;
    case 'wipe': wipeAll(); break;
    case 'consent-ok': {
      const minor = $('#g-minor').checked;
      if (!$('#g-consent').checked) return UI.toast('Marque a autorização para continuar');
      if (minor && !$('#g-guardian').checked) return UI.toast('Falta o consentimento do responsável');
      p.consent = { at: Date.now(), version: T12.POLICY_VERSION }; p.minor = minor; p.guardian = minor ? { at: Date.now() } : null;
      T12.save(true); render(); UI.toast('Obrigado! Tudo pronto.'); break; }
    case 'install': installFlow(); break;
    case 'about': aboutSheet(); break;
  }
});
document.addEventListener('change', ev => { const el = ev.target; if (el.dataset.a === 'exkey') { T12.ui.exKey = el.value; render(); } });
document.addEventListener('input', ev => {
  const el = ev.target, f = el.dataset.f; if (!f) return;
  const p = T12.prof();
  if (f === 'ck') { const c = checkinFor(p, el.dataset.mon, true); c[el.dataset.k] = el.value.slice(0, 1000); T12.save(); return; }
  const s = p.sessions.find(x => x.id === el.dataset.s); if (!s) return;
  if (f === 'snotes') { s.notes = el.value.slice(0, 4000); T12.save(); return; }
  const e = entry(s, el.dataset.i); if (!e) return;
  if (f === 'kg' || f === 'r') {
    const r = e.rows[+el.dataset.k]; let v = el.value.replace(',', '.').replace(/[^\d.]/g, '');
    if (f === 'r') v = v.replace(/\..*/, '');
    r[f] = v.slice(0, 7); if (f === 'r' && el.value !== r[f]) el.value = r[f];
  } else if (f === 'mins') { e.mins = el.value.replace(/[^\d]/g, '').slice(0, 4); touch(s); clearTimeout(root.__rf); root.__rf = setTimeout(() => refreshEntry(s, e.id), 800); }
  else if (f === 'km') e.km = el.value.replace(',', '.').replace(/[^\d.]/g, '').slice(0, 6);
  else e[f] = el.value.slice(0, 2000);
  T12.save();
});
document.addEventListener('focusin', ev => { if (ev.target.classList && ev.target.classList.contains('inp')) setTimeout(() => { try { ev.target.select(); } catch (_) {} }, 30); });
/* Enter no campo de carga pula para repetições (teclado numérico) */
document.addEventListener('keydown', ev => {
  const el = ev.target; if (ev.key !== 'Enter' || !el.dataset || !el.dataset.f) return;
  if (el.dataset.f === 'kg') { ev.preventDefault(); const n = $(`[data-i="${el.dataset.i}"][data-f="r"][data-k="${el.dataset.k}"]`); n && n.focus(); }
  else if (el.dataset.f === 'r') { ev.preventDefault(); el.blur(); }
});
function checkinFor(p, monIso, create) {
  const mon = U.parseISO(monIso); let c = M.checkinOfWeek(p, mon);
  if (!c && create) { const t0 = U.today(), cur = U.diffDays(mon, t0) >= 0 && U.diffDays(mon, t0) < 7; c = { id: U.uid(), date: U.iso(cur ? t0 : mon), weight: '', waist: '', muscle: '', fat: '', sleep: '', energy: null, notes: '' }; p.checkins.push(c); }
  return c;
}

/* ---------------- folhas (sheets) ---------------- */
function profilesSheet() {
  const el = UI.sheet(`<h3>Quem vai treinar?</h3><p>Cada pessoa tem seus próprios registros.</p><div class="list">
    ${T12.S.profiles.map(x => `<button type="button" class="li" data-id="${x.id}">${UI.avatar(x)}<div class="grow"><div class="t">${esc(x.name)}</div><div class="s">${x.sessions.filter(M.hasData).length} treinos</div></div>${x.id === T12.S.active ? `<span class="status-ic done">${ic('check')}</span>` : ''}</button>`).join('')}</div>
    <div class="actions"><a class="btn ghost block" href="#/novo">${ic('plus')} Adicionar pessoa</a></div>`, null, { label: 'Trocar pessoa' });
  el.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { T12.S.active = b.dataset.id; T12.ui.week = {}; T12.save(); UI.closeSheet(); render(); UI.toast('Olá, ' + T12.prof().name.split(' ')[0] + '!'); });
}
function policySheet() { UI.sheet(`<div class="policy-sheet">${V.privacidade().replace(/<header[\s\S]*?<\/header>/, '<h3>Política de privacidade</h3>').replace(/<section class="card"><h2>Consentimentos[\s\S]*<\/section>/, '')}</div><div class="actions"><button type="button" class="btn primary block" data-close>Entendi</button></div>`, el => el.querySelector('[data-close]').onclick = () => UI.closeSheet(), { label: 'Política de privacidade' }); }
function profileSheet(p) {
  let color = p.color;
  const el = UI.sheet(`<h3>Editar perfil</h3><label class="field"><span>Nome</span><input class="input" id="e-name" value="${esc(p.name)}" maxlength="40" autofocus></label>
    <span class="flabel">Cor</span><div class="colors" id="e-colors" role="radiogroup" aria-label="Cor">${T12.COLORS.map((c, i) => `<button type="button" role="radio" aria-checked="${c === p.color}" aria-label="Cor ${i + 1}" data-c="${c}" class="${c === p.color ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
    <p class="small muted" style="margin-top:14px">Para mudar datas e treinos, use Mais → Programas.</p>
    <div class="actions"><button type="button" class="btn primary block" id="e-save">Salvar</button></div>`, null, { label: 'Editar perfil' });
  el.querySelector('#e-colors').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; color = b.dataset.c; $$('#e-colors button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); };
  el.querySelector('#e-save').onclick = () => { const n = $('#e-name').value.trim(); if (n) p.name = n.slice(0, 40); p.color = color; T12.save(); UI.closeSheet(); render(); UI.toast('Perfil salvo'); };
}
function activitySheet(p, id, date) {
  const isNew = !id, a = isNew ? { id: U.uid(), date: date || U.iso(U.today()), type: 'Caminhada', mins: '', km: '', rpe: null, notes: '' } : p.activities.find(x => x.id === id);
  if (!a) return;
  let type = a.type;
  const el = UI.sheet(`<h3>${isNew ? 'Registrar atividade' : 'Editar atividade'}</h3><p>Caminhadas, esportes e outras atividades contam nos minutos aeróbicos e no Progresso.</p>
    <div class="chips wrap" id="a-types" role="radiogroup" aria-label="Tipo">${T12.ATIVIDADES.map(t => `<button type="button" role="radio" aria-checked="${t === type}" class="chip ${t === type ? 'on' : ''}" data-v="${t}">${t}</button>`).join('')}</div>
    <div class="grid2" style="margin-top:12px"><label class="field"><span>Data</span><input class="input" type="date" id="a-date" value="${a.date}" max="${U.iso(U.today())}"></label>
    <label class="field"><span>Minutos</span><input class="input" id="a-min" inputmode="numeric" value="${esc(a.mins)}" placeholder="Ex.: 30" autofocus></label></div>
    <div class="chips" style="margin:-4px 0 10px">${[15, 20, 30, 45, 60, 90].map(m => `<button type="button" class="chip" data-m="${m}">${m} min</button>`).join('')}</div>
    <label class="field"><span>Distância (km, opcional)</span><input class="input" id="a-km" inputmode="decimal" value="${esc(a.km)}"></label>
    <label class="field"><span>Observação (opcional)</span><input class="input" id="a-notes" value="${esc(a.notes)}" maxlength="200"></label>
    <div class="actions"><button type="button" class="btn primary block" id="a-save">Salvar</button>${isNew ? '' : '<button type="button" class="btn danger block" id="a-del">Excluir atividade</button>'}</div>`, null, { label: 'Atividade' });
  el.querySelector('#a-types').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; type = b.dataset.v; $$('#a-types .chip').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); };
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { $('#a-min').value = b.dataset.m; });
  el.querySelector('#a-save').onclick = () => {
    const m = num($('#a-min').value); if (!(m > 0)) { $('#a-min').focus(); return UI.toast('Informe os minutos'); }
    Object.assign(a, { type, date: $('#a-date').value || a.date, mins: String(Math.round(m)), km: $('#a-km').value.replace(',', '.').replace(/[^\d.]/g, ''), notes: $('#a-notes').value.trim() });
    if (isNew) p.activities.push(a);
    T12.save(); UI.closeSheet(); render(); UI.toast(`${type}: ${Math.round(m)} min registrados`);
  };
  const del = el.querySelector('#a-del'); if (del) del.onclick = () => { const i = p.activities.indexOf(a); p.activities.splice(i, 1); T12.save(); UI.closeSheet(); render(); UI.toast('Atividade excluída', 'Desfazer', () => { p.activities.splice(i, 0, a); T12.save(); render(); }); };
}
function dateSheet(s) {
  const el = UI.sheet(`<h3>Data do treino</h3><p>Use para registrar um treino feito em outro dia.</p><label class="field"><span>Data</span><input class="input" type="date" id="sd" value="${s.date}" max="${U.iso(U.today())}" autofocus></label><div class="actions"><button type="button" class="btn primary block" id="sd-ok">Salvar</button></div>`, null, { label: 'Data do treino' });
  el.querySelector('#sd-ok').onclick = () => { const v = $('#sd').value; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { s.date = v; T12.save(); } UI.closeSheet(); render(); };
}
function sessionMenu(p, s) {
  const el = UI.sheet(`<h3>${esc(s.name)}</h3><div class="actions">
    <button type="button" class="btn ghost block" id="m-date">${ic('calendar')} Alterar data</button>
    <button type="button" class="btn ghost block" id="m-add">${ic('plus')} Adicionar exercício</button>
    <button type="button" class="btn danger block" id="m-del">${ic('trash')} Excluir este treino</button></div>`, null, { label: 'Opções do treino' });
  el.querySelector('#m-date').onclick = () => dateSheet(s);
  el.querySelector('#m-add').onclick = () => addEntrySheet(s);
  el.querySelector('#m-del').onclick = async () => {
    if (!(await UI.confirm('Excluir treino?', 'Todos os registros deste treino serão apagados.', 'Excluir', true))) return;
    const i = p.sessions.indexOf(s); p.sessions.splice(i, 1); T12.save(); lastSession = null; history.back();
    setTimeout(() => UI.toast('Treino excluído', 'Desfazer', () => { p.sessions.splice(i, 0, s); T12.save(); render(); }), 100);
  };
}
function addEntrySheet(s) {
  const p = T12.prof(), prog = M.activeProgram(p), seen = new Set(), lib = [];
  (prog ? prog.treinos : []).forEach(t => t.ex.forEach(x => { if (!seen.has(x.key)) { seen.add(x.key); lib.push({ x, t: t.short }); } }));
  M.exerciseList(p).forEach(r => { if (!seen.has(r.key)) { const src = p.sessions.find(ss => ss.ex.some(e => e.key === r.key)).ex.find(e => e.key === r.key); seen.add(r.key); lib.push({ x: src, t: '•' }); } });
  const el = UI.sheet(`<h3>Adicionar exercício</h3><p>Escolha da sua lista ou crie um novo. Ele entra só neste treino.</p>
    <label class="field"><span>Buscar</span><input class="input" id="ae-q" placeholder="Ex.: supino" autofocus></label>
    <div class="list" id="ae-list" style="max-height:38dvh;overflow:auto">${lib.map((o, i) => `<button type="button" class="li" data-i="${i}" data-n="${esc(U.slug(o.x.name))}"><span class="ex-idx">${esc(o.t)}</span><div class="grow"><div class="t">${esc(o.x.name)}</div><div class="s">${esc(o.x.cat)} · ${esc(o.x.presc)}</div></div>${ic('plus', 'class="chev"')}</button>`).join('')}</div>
    <div class="actions"><button type="button" class="btn ghost block" id="ae-new">${ic('edit')} Criar exercício novo</button></div>`, null, { label: 'Adicionar exercício' });
  el.querySelector('#ae-q').oninput = ev => { const q = U.slug(ev.target.value); $$('#ae-list .li').forEach(x => x.classList.toggle('hidden', q && !x.dataset.n.includes(q))); };
  el.querySelectorAll('#ae-list [data-i]').forEach(b => b.onclick = () => { const src = lib[+b.dataset.i].x; const ex = M.makeEx(src.name, src.cat, src.presc, src.video); ex.key = src.key; s.ex.push(M.entryFromEx(ex)); T12.save(); UI.closeSheet(); render(); });
  el.querySelector('#ae-new').onclick = () => exSheet(null, null, ex => { s.ex.push(M.entryFromEx(ex)); T12.save(); render(); });
}
function finishSheet(p, s) {
  if (!M.hasData(s)) { UI.confirm('Nada registrado ainda', 'Você ainda não marcou nenhuma série ou minuto. Quer sair mesmo assim?', 'Sair').then(ok => { if (ok) T12.go('#/hoje'); }); return; }
  const el0 = M.elapsedMinutes(Object.assign({}, s, { finishedAt: s.finishedAt || Date.now() }));
  const sug = num(s.durationMin) || (el0 != null && el0 >= 5 && el0 <= 240 ? Math.round(el0) : M.estimateMinutes(s));
  const el = UI.sheet(`<h3>${s.finishedAt ? 'Salvar alterações' : 'Finalizar treino'}</h3><p>${el0 != null && el0 >= 5 && el0 <= 240 ? 'Duração cronometrada pelo app — ajuste se precisar.' : 'Duração estimada pelos exercícios — ajuste se precisar.'}</p>
    <div class="grid2"><label class="field"><span>Duração (min)</span><input class="input" id="f-dur" inputmode="numeric" value="${sug}"></label><label class="field"><span>Data</span><input class="input" type="date" id="f-date" value="${s.date}" max="${U.iso(U.today())}"></label></div>
    <div class="actions"><button type="button" class="btn primary block" id="f-ok">${ic('check')} Concluir</button></div>`, null, { label: 'Finalizar treino' });
  el.querySelector('#f-ok').onclick = () => {
    const d = num($('#f-dur').value); s.durationMin = d > 0 ? Math.min(600, Math.round(d)) : null;
    const dt = $('#f-date').value; if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) s.date = dt;
    s.finishedAt = s.finishedAt || Date.now(); if (!s.startedAt) s.startedAt = s.finishedAt;
    UI.stopRest(); T12.save(true); UI.closeSheet(); summarySheet(p, s);
  };
}
function summarySheet(p, s) {
  const b = M.breakdown(s), st = M.sessionStatus(s), before = M.bests(p, s), prs = [];
  s.ex.forEach(e => { if (e.type !== 'forca') return; const v = M.maxKg(e); const bb = before[e.key]; if (v != null && bb && v > bb.kg) prs.push(`${e.name}: ${fmt(v)} kg`); });
  const el = UI.sheet(`<div class="center"><div class="logo sm" style="margin:4px auto 14px;background:${st === 'done' ? 'var(--ok)' : 'var(--warn)'}">${ic(st === 'done' ? 'check' : 'minus', 'width="34" height="34" style="color:#0B0D10"')}</div>
    <h3>${st === 'done' ? 'Treino concluído!' : 'Treino salvo (parcial)'}</h3><p>${esc(s.name)} · ${U.dm(U.parseISO(s.date))} · ${U.hm(b.total)}</p></div>
    <div class="tiles three"><div class="tile flat"><div class="v num">${b.sets}</div><div class="k">Séries</div></div>
    <div class="tile flat"><div class="v num">${b.vol ? fmt(b.vol, 0) : '—'}${b.vol ? '<small>kg</small>' : ''}</div><div class="k">Volume</div></div>
    <div class="tile flat"><div class="v num">${fmt(b.cardio + b.flex, 0)}<small>min</small></div><div class="k">Cardio + flex.</div></div></div>
    ${prs.length ? `<div class="hint up" style="margin:0 0 12px">${ic('trophy', 'width="18" height="18"')}<div>Novo recorde! ${prs.map(esc).join(' · ')}</div></div>` : ''}
    <div class="actions"><button type="button" class="btn primary block" id="sm-ok">Fechar</button></div>`, null, { label: 'Resumo do treino' });
  el.querySelector('#sm-ok').onclick = () => { UI.closeSheet(); T12.go('#/hoje'); };
}
function exSheet(t, e, onNew) {
  const isNew = !e; e = e || { name: '', cat: 'Força', presc: '3 x 10–12', video: '' };
  const el = UI.sheet(`<h3>${isNew ? 'Novo exercício' : 'Editar exercício'}</h3>${t ? `<p>${esc(t.name)}${t.foco ? ' · ' + esc(t.foco) : ''}</p>` : ''}
    <label class="field"><span>Nome</span><input class="input" id="f-name" value="${esc(e.name)}" placeholder="Ex.: Cadeira extensora" maxlength="80" autofocus></label>
    <div class="grid2"><label class="field"><span>Tipo</span><select class="input" id="f-cat">${T12.CATS.map(c => `<option ${c === e.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="field"><span>Prescrição</span><input class="input" id="f-presc" value="${esc(e.presc)}" maxlength="40"></label></div>
    <p class="tiny faint" style="margin-top:-6px">Exemplos: 3 x 8–12 · 3 x 20–40 s · 2 x 30 s por lado · 25 min</p>
    <label class="field"><span>Link de vídeo (opcional)</span><input class="input" id="f-video" type="url" inputmode="url" value="${esc(e.video)}" placeholder="Se vazio, abre busca no YouTube"></label>
    <div class="actions"><button type="button" class="btn primary block" id="f-save">Salvar</button>
    ${isNew ? '' : `<div class="row"><button type="button" class="btn ghost grow" id="f-up">↑ Subir</button><button type="button" class="btn ghost grow" id="f-down">↓ Descer</button></div><button type="button" class="btn danger block" id="f-del">${ic('trash')} Remover do plano</button>`}</div>`, null, { label: 'Exercício' });
  el.querySelector('#f-save').onclick = () => {
    const name = $('#f-name').value.trim(); if (!name) return $('#f-name').focus();
    const cat = $('#f-cat').value, presc = $('#f-presc').value.trim() || '3 x 10', vid = $('#f-video').value.trim();
    const video = /^https:\/\//i.test(vid) ? vid : '';
    if (isNew) { const ex = M.makeEx(name, cat, presc, video); if (t) t.ex.push(ex); else if (onNew) { UI.closeSheet(); return onNew(ex); } }
    else Object.assign(e, { name, key: U.slug(name), cat, presc, video }, M.parsePresc(cat, presc));
    T12.save(); UI.closeSheet(); render(); UI.toast('Plano atualizado');
  };
  if (!isNew) {
    const mv = d => { const i = t.ex.indexOf(e), j = i + d; if (j < 0 || j >= t.ex.length) return; t.ex.splice(i, 1); t.ex.splice(j, 0, e); T12.save(); UI.closeSheet(); render(); };
    el.querySelector('#f-up').onclick = () => mv(-1); el.querySelector('#f-down').onclick = () => mv(1);
    el.querySelector('#f-del').onclick = async () => { if (await UI.confirm('Remover exercício?', `“${esc(e.name)}” sai do plano. Registros antigos continuam no histórico.`, 'Remover', true)) { t.ex.splice(t.ex.indexOf(e), 1); T12.save(); render(); } };
  }
}
function treinoSheet(p, g, tid) {
  const t = tid ? g.treinos.find(x => x.id === tid) : null, isNew = !t;
  const cur = t || { short: M.nextShort(g), name: 'Treino ' + M.nextShort(g), foco: '', days: [], color: g.treinos.length % 7, ex: [] };
  let days = (cur.days || []).slice(), color = cur.color || 0;
  const el = UI.sheet(`<h3>${isNew ? 'Novo treino' : 'Editar treino'}</h3>
    <div class="grid2" style="grid-template-columns:80px 1fr"><label class="field"><span>Letra</span><input class="input center" id="t-short" maxlength="2" value="${esc(cur.short)}"></label><label class="field"><span>Nome</span><input class="input" id="t-name" maxlength="40" value="${esc(cur.name)}" autofocus></label></div>
    <label class="field"><span>Foco (opcional)</span><input class="input" id="t-foco" maxlength="60" value="${esc(cur.foco)}" placeholder="Ex.: Pernas e core"></label>
    <span class="flabel">Dias da semana</span><div class="daychips" id="t-days" role="group" aria-label="Dias da semana">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" aria-pressed="${days.includes(d)}" class="${days.includes(d) ? 'on' : ''}" data-d="${d}">${U.DIAS_ABREV[d]}</button>`).join('')}</div>
    <span class="flabel" style="margin-top:12px">Cor</span><div class="colors" id="t-colors">${T12.TREINO_COLORS.map((c, i) => `<button type="button" aria-label="Cor ${i + 1}" data-c="${i}" class="${i === color ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
    <div class="actions" style="margin-top:16px"><button type="button" class="btn primary block" id="t-save">Salvar</button>
    ${isNew ? '' : `<div class="row"><button type="button" class="btn ghost grow" id="t-up">↑ Subir</button><button type="button" class="btn ghost grow" id="t-down">↓ Descer</button></div><button type="button" class="btn danger block" id="t-del">${ic('trash')} Excluir treino</button>`}</div>`, null, { label: 'Treino' });
  el.querySelector('#t-days').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; const d = +b.dataset.d; days = days.includes(d) ? days.filter(x => x !== d) : days.concat(d); b.classList.toggle('on'); b.setAttribute('aria-pressed', days.includes(d)); };
  el.querySelector('#t-colors').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; color = +b.dataset.c; $$('#t-colors button').forEach(x => x.classList.toggle('on', x === b)); };
  el.querySelector('#t-save').onclick = () => {
    const tt = t || { id: U.uid(), ex: [] };
    Object.assign(tt, { short: ($('#t-short').value.trim() || cur.short).toUpperCase().slice(0, 2), name: $('#t-name').value.trim() || cur.name, foco: $('#t-foco').value.trim(), days: days.sort(), color });
    if (isNew) g.treinos.push(tt);
    T12.save(); UI.closeSheet(); render(); UI.toast(isNew ? 'Treino criado — adicione os exercícios' : 'Treino salvo');
  };
  if (!isNew) {
    const mv = d => { const i = g.treinos.indexOf(t), j = i + d; if (j < 0 || j >= g.treinos.length) return; g.treinos.splice(i, 1); g.treinos.splice(j, 0, t); T12.save(); UI.closeSheet(); render(); };
    el.querySelector('#t-up').onclick = () => mv(-1); el.querySelector('#t-down').onclick = () => mv(1);
    el.querySelector('#t-del').onclick = async () => { if (await UI.confirm('Excluir treino?', `“${esc(t.name)}” sai do programa. Os registros já feitos continuam no histórico.`, 'Excluir', true)) { g.treinos.splice(g.treinos.indexOf(t), 1); T12.save(); render(); } };
  }
}
function programSheet(p, g) {
  const isNew = !g, act = M.activeProgram(p), monday = U.iso(U.mondayOf(U.today()));
  const cur = g || { name: '', start: monday, weeks: 12 };
  const el = UI.sheet(`<h3>${isNew ? 'Novo programa' : 'Configurações do programa'}</h3>${isNew ? '<p>Um novo período de treino. O programa atual é encerrado e fica no histórico.</p>' : ''}
    <label class="field"><span>Nome</span><input class="input" id="g-name" maxlength="60" value="${esc(cur.name)}" placeholder="Ex.: Hipertrofia 2027 — fase 1" autofocus></label>
    <div class="grid2"><label class="field"><span>Início (segunda-feira)</span><input class="input" type="date" id="g-start" value="${cur.start}"></label>
    <label class="field"><span>Duração</span><select class="input" id="g-weeks">${[4, 6, 8, 10, 12, 16, 20, 24, 52].map(w => `<option value="${w}" ${cur.weeks === w ? 'selected' : ''}>${w} semanas</option>`).join('')}<option value="0" ${!cur.weeks ? 'selected' : ''}>Contínuo (sem fim)</option></select></label></div>
    ${isNew ? `<span class="flabel">Começar a partir de</span><div class="radios" id="g-base">
      ${act ? `<label class="chk"><input type="radio" name="base" value="copy" checked><span><b>Copiar o programa atual</b> — mesmos treinos e exercícios; ajuste depois.</span></label>` : ''}
      <label class="chk"><input type="radio" name="base" value="tpl" ${act ? '' : 'checked'}><span><b>Modelo base de 12 semanas</b> — o plano da planilha original.</span></label>
      <label class="chk"><input type="radio" name="base" value="blank"><span><b>Em branco</b> — monte treinos do zero.</span></label></div>` : ''}
    <div class="actions"><button type="button" class="btn primary block" id="g-save">${isNew ? 'Criar e ativar' : 'Salvar'}</button></div>`, null, { label: 'Programa' });
  el.querySelector('#g-save').onclick = () => {
    const name = $('#g-name').value.trim(), start = U.iso(U.mondayOf(U.parseISO($('#g-start').value || monday))), weeks = +$('#g-weeks').value || null;
    if (isNew) {
      const base = (el.querySelector('input[name=base]:checked') || {}).value || 'tpl';
      let ng = base === 'copy' && act ? M.copyProgram(act, { name: name || act.name + ' (novo ciclo)', start, weeks }) : base === 'blank' ? M.blankProgram({ name: name || 'Novo programa', start, weeks }) : Object.assign(M.templatePadrao(start), { weeks });
      if (base === 'tpl') { ng.name = name || ng.name; if (weeks !== 12) ng.phases = []; }
      if (act && !act.archivedAt) act.archivedAt = U.iso(U.addDays(U.parseISO(start), -1)) < act.start ? act.start : U.iso(U.addDays(U.parseISO(start), -1));
      p.programs.push(ng); p.activeProgram = ng.id; T12.ui.week = {};
      T12.save(); UI.closeSheet();
      T12.go(base === 'blank' ? '#/programa/' + ng.id : '#/programas'); UI.toast('Programa criado e ativado');
    } else {
      g.name = name || g.name; g.start = start; g.weeks = weeks; if (g.phases && g.phases.length && weeks !== 12) g.phases = [];
      T12.save(); UI.closeSheet(); render(); UI.toast('Programa salvo');
    }
  };
}

/* ---------------- exclusão / LGPD ---------------- */
async function deleteProfile(p, why) {
  const title = why === 'delprof' ? `Excluir ${p.name}?` : `Revogar consentimento de ${p.name}?`;
  if (!(await UI.confirm(title, `Todos os treinos, programas, atividades e medidas de <b>${esc(p.name)}</b> serão apagados deste aparelho de forma definitiva. Se quiser guardar, faça um backup antes.`, 'Apagar definitivamente', true))) return;
  T12.S.profiles = T12.S.profiles.filter(x => x.id !== p.id); T12.S.active = T12.S.profiles[0] ? T12.S.profiles[0].id : null;
  await T12.save(true);
  // pontos de restauração podem conter os dados apagados → são descartados para cumprir a eliminação
  await Store.clearSnapshots(); if (T12.S.profiles.length) await Store.daily(T12.S, true);
  T12.go('#/hoje'); UI.toast('Dados apagados');
}
async function wipeAll() {
  const v = await UI.ask('Apagar tudo?', 'Isto apaga <b>todas as pessoas, registros, pontos de restauração e preferências</b> deste aparelho. Não há como desfazer. Digite <b>APAGAR</b> para confirmar.', [{ id: 'c', label: 'Confirmação', placeholder: 'APAGAR', auto: 'off' }], 'Apagar tudo', v => v.c.trim().toUpperCase() === 'APAGAR' ? null : 'Digite APAGAR para confirmar.');
  if (!v) return;
  await Store.wipe(); T12.S = M.emptyState(); T12.go('#/hoje'); render(); UI.toast('Todos os dados foram apagados');
}
async function restoreSnapshot(id) {
  const snap = await Store.getSnapshot(id);
  if (!snap || !snap.state) return UI.toast('Este ponto de restauração foi descartado.');
  if (!(await UI.confirm('Restaurar este ponto?', `O app volta ao estado de <b>${esc(snap.label)}</b>. O estado atual é guardado como um novo ponto, por segurança.`, 'Restaurar'))) return;
  await Store.putSnapshot({ id: 'antes-' + Date.now(), label: 'Antes de restaurar (' + new Date().toLocaleString('pt-BR') + ')', at: Date.now(), state: JSON.parse(JSON.stringify(T12.S)) });
  const settings = T12.S.settings;
  T12.S = M.upgrade(snap.state); T12.S.settings = Object.assign(T12.S.settings, { lastBackup: settings.lastBackup });
  await T12.save(true); T12.go('#/hoje'); render(); UI.toast('Restaurado');
}

/* ---------------- backup / restauração / CSV ---------------- */
async function doBackup() {
  const S = T12.S, p = T12.prof(); if (!p) return;
  const canCrypt = T12.Crypto.available();
  const opt = await new Promise(res => {
    const el = UI.sheet(`<h3>Fazer backup</h3><p>Gera um arquivo com seus registros para guardar fora do celular.</p>
      ${S.profiles.length > 1 ? `<span class="flabel">Incluir</span><div class="radios"><label class="chk"><input type="radio" name="sc" value="all" checked><span>Todas as pessoas (${S.profiles.length})</span></label><label class="chk"><input type="radio" name="sc" value="one"><span>Só ${esc(p.name)}</span></label></div>` : ''}
      ${canCrypt ? `<label class="toggle" style="margin-top:12px"><input type="checkbox" id="b-enc" checked><span><b>Proteger com senha</b> (recomendado: o arquivo contém dados de saúde)</span></label>
      <div id="b-pw"><label class="field" style="margin-top:10px"><span>Senha (mín. 6 caracteres)</span><input class="input" type="password" id="b-p1" autocomplete="new-password"></label><label class="field"><span>Repita a senha</span><input class="input" type="password" id="b-p2" autocomplete="new-password"></label><p class="tiny warnt">Anote a senha. Sem ela o backup não pode ser aberto — não há como recuperá-la.</p></div>` : `<p class="tiny faint">Proteção por senha disponível quando o app estiver publicado (HTTPS).</p>`}
      <p class="formerr" role="alert"></p><div class="actions"><button type="button" class="btn primary block" id="b-go">Gerar arquivo</button></div>`, null, { label: 'Backup' });
    const enc = el.querySelector('#b-enc'); if (enc) enc.onchange = () => el.querySelector('#b-pw').classList.toggle('hidden', !enc.checked);
    el.querySelector('#b-go').onclick = () => {
      const scope = (el.querySelector('input[name=sc]:checked') || {}).value || 'all', useEnc = enc && enc.checked;
      if (useEnc) { const a = $('#b-p1').value, b = $('#b-p2').value; if (a.length < 6) return el.querySelector('.formerr').textContent = 'A senha precisa ter pelo menos 6 caracteres.'; if (a !== b) return el.querySelector('.formerr').textContent = 'As senhas não conferem.'; }
      const pw = useEnc ? el.querySelector('#b-p1').value : null;
      UI.closeSheet(true); res({ scope, pw });
    };
  });
  if (!opt) return;
  const profiles = opt.scope === 'one' ? [p] : S.profiles;
  let data = { app: 'treino12', schema: T12.SCHEMA, appVersion: T12.VERSION, exportedAt: new Date().toISOString(), profiles };
  if (opt.pw) { try { data = await T12.Crypto.encrypt(data, opt.pw); } catch (e) { return UI.toast('Falha ao criptografar: ' + e.message); } }
  const name = `treino12-backup-${opt.scope === 'one' ? U.slug(p.name) + '-' : ''}${U.iso(new Date())}${opt.pw ? '-protegido' : ''}.json`;
  const ok = await UI.deliverFile(name, JSON.stringify(data), 'application/json', 'Backup pronto', opt.pw ? 'Protegido com senha (AES-256).' : 'Atenção: sem senha — guarde em local seguro, ele contém dados de saúde.');
  if (ok) { S.settings.lastBackup = new Date().toISOString(); T12.save(); render(); UI.toast('Backup feito ✓'); }
}
async function doRestore() {
  const f = await UI.pickFile('.json,application/json'); if (!f) return;
  if (f.size > 60 * 1048576) return UI.toast('Arquivo grande demais para ser um backup.');
  let obj; try { obj = JSON.parse(await f.text()); } catch (e) { return UI.toast('Arquivo inválido (não é JSON).'); }
  if (obj && obj.app === 'treino12' && obj.encrypted) {
    if (!T12.Crypto.available()) return UI.toast('Abra o app publicado (HTTPS) para restaurar backups com senha.');
    let plain = null;
    while (!plain) {
      const v = await UI.ask('Backup protegido', 'Digite a senha usada ao criar este backup.', [{ id: 'p', label: 'Senha', type: 'password', auto: 'current-password' }], 'Abrir');
      if (!v) return;
      try { plain = await T12.Crypto.decrypt(obj, v.p); } catch (e) { UI.toast('Senha incorreta.'); }
    }
    obj = plain;
  }
  const r = M.readBackup(obj);
  if (r.error) return UI.toast(r.error);
  const names = r.profiles.map(x => esc(x.name)).join(', ');
  const el = UI.sheet(`<h3>Restaurar backup</h3><p>Backup de <b>${r.exportedAt ? U.dmy(new Date(r.exportedAt)) : '?'}</b>${r.schema === 1 ? ' (versão 1 — será convertido)' : ''} com ${r.profiles.length} pessoa(s): ${names}.</p>
    <div class="actions"><button type="button" class="btn primary block" data-v="merge">Juntar com este aparelho</button>
    ${T12.S.profiles.length ? `<button type="button" class="btn danger block" data-v="replace">Substituir tudo deste aparelho</button>` : ''}<button type="button" class="btn ghost block" data-v="no">Cancelar</button></div>
    <p class="tiny faint" style="margin-top:12px">“Juntar” atualiza as pessoas que já existem e adiciona as novas. Antes de qualquer mudança, o app guarda um ponto de restauração.</p>`, null, { label: 'Restaurar backup' });
  el.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => {
    const v = b.dataset.v; UI.closeSheet(true); if (v === 'no') return;
    if (T12.S.profiles.length) await Store.putSnapshot({ id: 'antes-' + Date.now(), label: 'Antes de restaurar backup', at: Date.now(), state: JSON.parse(JSON.stringify(T12.S)) });
    if (v === 'replace') T12.S.profiles = r.profiles;
    else r.profiles.forEach(x => { const i = T12.S.profiles.findIndex(y => y.id === x.id); if (i >= 0) T12.S.profiles[i] = x; else T12.S.profiles.push(x); });
    T12.S.active = r.profiles[0].id;
    await T12.save(true); Store.persist(); T12.go('#/hoje'); UI.toast('Dados restaurados ✓');
  });
}
function exportCSV(p) {
  const q = v => { const s = v == null ? '' : String(v); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const br = v => v == null || v === '' ? '' : String(v).replace('.', ',');
  const rows = [['TREINOS — ' + p.name], ['Data', 'Treino', 'Programa', 'Exercício', 'Tipo', 'Prescrição', 'Séries planejadas', 'Carga (kg)', 'Reps/tempo', 'Esforço (1–10)', 'Concluído?', 'Min. cardio', 'Min. flexibilidade', 'Modalidade', 'Distância (km)', 'Dor (0–10)', 'Observações', 'Duração do treino (min)']];
  p.sessions.filter(M.hasData).sort((a, b) => a.date < b.date ? -1 : 1).forEach(s => {
    const prog = s.programId ? M.prog(p, s.programId) : null;
    s.ex.forEach(e => { const st = M.entryStatus(e), ok = (e.rows || []).filter(r => r.ok);
      rows.push([U.dmy(U.parseISO(s.date)), s.name, prog ? prog.name : '—', e.name, e.cat, e.presc, e.type === 'cardio' ? '—' : e.sets,
        ok.map(r => br(r.kg)).filter(Boolean).join(' / '), e.type === 'cardio' ? '' : ok.map(r => r.r).filter(Boolean).join(' / '), e.rpe == null ? '' : e.rpe,
        st === 'done' ? 'Sim' : st === 'partial' ? 'Parcial' : 'Não', e.type === 'cardio' ? br(e.mins) : '', e.type === 'mob' ? br(M.entryMinutes(e) || '') : '',
        e.type === 'cardio' ? e.mod : '', br(e.km), e.pain == null ? '' : e.pain, [e.feel, e.notes].filter(Boolean).join(' · '), M.sessionMinutes(s)]); });
  });
  rows.push([], ['ATIVIDADES'], ['Data', 'Tipo', 'Minutos', 'Distância (km)', 'Observações']);
  p.activities.slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(a => rows.push([U.dmy(U.parseISO(a.date)), a.type, a.mins, br(a.km), a.notes]));
  rows.push([], ['CHECK-INS'], ['Data', 'Peso (kg)', 'Cintura (cm)', 'Massa muscular (kg)', 'Gordura (%)', 'Sono (h)', 'Energia', 'Notas']);
  p.checkins.slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(c => rows.push([U.dmy(U.parseISO(c.date)), br(c.weight), br(c.waist), br(c.muscle), br(c.fat), br(c.sleep), c.energy, c.notes]));
  rows.push([], ['RESUMO POR ANO'], ['Ano', 'Treinos', 'Horas ativas', 'Min. aeróbicos', 'Min. flexibilidade', 'Volume (kg)', 'Dias ativos']);
  M.byYear(p, U.today()).forEach(r => rows.push([r.year, r.sessions, br((r.minutes / 60).toFixed(1)), Math.round(r.aerobic), Math.round(r.flex), Math.round(r.vol), r.days]));
  const csv = '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n');
  UI.deliverFile(`treino12-${U.slug(p.name)}-${U.iso(new Date())}.csv`, csv, 'text/csv', 'Planilha pronta', 'Abre no Excel e no Google Planilhas. Contém dados de saúde — guarde com cuidado.');
}

/* ---------------- instalação / sobre ---------------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); deferredPrompt = ev; });
window.addEventListener('appinstalled', () => { T12.S.settings.installDismissed = true; T12.save(); UI.toast('App instalado ✓'); });
async function installFlow() {
  if (deferredPrompt) { deferredPrompt.prompt(); const r = await deferredPrompt.userChoice; deferredPrompt = null; if (r.outcome === 'accepted') { T12.S.settings.installDismissed = true; T12.save(); render(); } return; }
  const ios = UI.isIOS();
  const steps = ios ? [['Abra no Safari', 'No iOS 16.4 ou mais novo também funciona pelo Chrome ou Edge, no mesmo menu Compartilhar.'], ['Toque em Compartilhar', 'O quadrado com a seta para cima (barra inferior ou menu “•••”).'], ['“Adicionar à Tela de Início”', 'Role as opções. Se aparecer “Abrir como App Web”, deixe ligado.'], ['Toque em Adicionar', 'Abra sempre pelo ícone “Treino 12”.']]
    : [['Abra no Chrome', 'Ou Samsung Internet / Edge.'], ['Toque no menu ⋮', 'Três pontinhos no canto superior direito.'], ['“Instalar app” ou “Adicionar à tela inicial”', 'O nome varia conforme o aparelho.'], ['Confirme', 'O ícone “Treino 12” aparece com seus apps.']];
  UI.sheet(`<h3>Instalar no ${ios ? 'iPhone' : 'Android'}</h3><p>Fica como um app: ícone próprio, tela cheia e funciona sem internet.</p>
    ${steps.map((s, i) => `<div class="feat"><span class="ic num-ic">${i + 1}</span><div><b>${s[0]}</b><div class="muted small">${s[1]}</div></div></div>`).join('')}
    <div class="actions"><button type="button" class="btn primary block" data-close>Entendi</button>${!T12.S.settings.installDismissed ? `<button type="button" class="btn ghost block" data-hide>Não mostrar o aviso de novo</button>` : ''}</div>`,
    el => { el.querySelector('[data-close]').onclick = () => UI.closeSheet(); const h = el.querySelector('[data-hide]'); if (h) h.onclick = () => { T12.S.settings.installDismissed = true; T12.save(); UI.closeSheet(); render(); }; }, { label: 'Instalar' });
}
function aboutSheet() {
  UI.sheet(`<h3>Treino 12</h3><p>Versão ${T12.VERSION} · dados no formato ${T12.SCHEMA}. Aplicativo gratuito para acompanhar treinos por toda a vida.</p>
    <div class="feat"><span class="ic">${ic('shield')}</span><div><b>Privado por padrão</b><div class="muted small">Nada é enviado a servidores. Sem conta, sem anúncios, sem rastreamento.</div></div></div>
    <div class="feat"><span class="ic">${ic('download')}</span><div><b>Backup é com você</b><div class="muted small">Faça backup toda semana. Use senha: o arquivo contém dados de saúde.</div></div></div>
    <div class="feat"><span class="ic">${ic('info')}</span><div><b>Não substitui orientação profissional</b><div class="muted small">Com doença, lesão ou restrição clínica, valide o plano com profissional de saúde.</div></div></div>
    <div class="actions"><button type="button" class="btn ghost block" data-close>Fechar</button></div>`, el => el.querySelector('[data-close]').onclick = () => UI.closeSheet(), { label: 'Sobre' });
}

/* ---------------- service worker ---------------- */
function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const notify = wk => UI.toast('Nova versão disponível', 'Atualizar', () => { Store.flush().then(() => wk.postMessage('skipWaiting')); });
    if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
    reg.addEventListener('updatefound', () => { const nw = reg.installing; nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) notify(nw); }); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
}

/* ---------------- erros inesperados ---------------- */
let errShown = false;
function onFatal(err) {
  console.error(err);
  if (errShown) return; errShown = true; T12.loadError = true;
  try { Store.flush(); } catch (e) {}
  UI.toast('Algo deu errado. Seus dados estão salvos.', 'Fazer backup', doBackup);
}
window.addEventListener('error', ev => onFatal(ev.error || ev.message));
window.addEventListener('unhandledrejection', ev => onFatal(ev.reason));

/* ---------------- início ---------------- */
(async function boot() {
  try { T12.S = await Store.load(); } catch (e) { console.error(e); T12.S = M.emptyState(); }
  readRoute(); render(); registerSW();
  if (Store.migratedFromV1) setTimeout(() => UI.toast('Seus dados foram atualizados para a versão 2 ✓'), 400);
  if (T12.S.profiles.length) Store.persist();
  root.__t12 = { get state() { return T12.S; }, M, Store, render };
})();
})(window);
