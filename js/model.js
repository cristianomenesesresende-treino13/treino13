/* Treino 12 — modelo de dados, consultas, agregações por período e migrações.
   Funções puras (sem DOM): testadas em dev/testes.js com Node.

   Esquema v2 (por pessoa):
   profile = { id, name, color, createdAt, minor, consent:{at,version}, guardian:{at}|null,
               activeProgram, programs:[Program], sessions:[Session], activities:[Activity], checkins:[Checkin] }
   Program  = { id, name, start:'AAAA-MM-DD'(segunda), weeks:number|null (null = contínuo), phases:[], treinos:[Treino], archivedAt }
   Treino   = { id, short:'A', name, foco, days:[0..6], color, ex:[Ex] }
   Ex       = { id, key, name, cat, presc, video, type:'forca'|'tempo'|'cardio'|'mob', sets, repMin, repMax, target }
   Session  = { id, date, programId, treinoId, name, short, foco, color, startedAt, finishedAt, durationMin, notes, ex:[Entry] }
   Entry    = Ex + { exId, rows:[{kg,r,ok}], mins, mod, km, rpe, pain, feel, notes }
   Activity = { id, date, type, mins, km, rpe, notes }
   Checkin  = { id, date, weight, waist, muscle, fat, sleep, energy, notes }                                      */
(function (root) {
'use strict';
const T12 = root.T12, U = T12.U;
const M = T12.M = {};
const num = U.num;

/* ---------------- plano / exercícios ---------------- */
M.parsePresc = function (cat, presc) {
  const p = String(presc || '');
  let type = 'forca';
  if (cat === 'Cardio') type = 'cardio';
  else if (cat === 'Mobilidade' || cat === 'Flexibilidade') type = 'mob';
  else if (/\d\s*s\b|seg/i.test(p)) type = 'tempo';
  const m = p.match(/(\d+)\s*[x×]\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
  let sets = m ? +m[1] : (type === 'cardio' ? 1 : 3);
  const repMin = m ? +m[2] : null, repMax = m ? +(m[3] || m[2]) : null;
  let target = null;
  if (type === 'cardio') { const c = p.match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*min/i); target = c ? +(c[2] || c[1]) : 20; sets = 1; }
  if (type === 'mob') {
    const lado = /lado/i.test(p) ? 2 : 1;
    const secs = /\d\s*s\b/i.test(p) && repMax ? repMax : 30;
    target = Math.max(1, Math.round(sets * secs * lado / 60));
  }
  return { type, sets: U.clamp(sets, 1, 10), repMin, repMax, target };
};
M.makeEx = (name, cat, presc, video, id) => Object.assign({ id: id || U.uid(), key: U.slug(name), name, cat, presc, video: video || '' }, M.parsePresc(cat, presc));
M.videoUrl = ex => ex.video || ('https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.name + ' execução correta'));

M.templatePadrao = function (start) {
  const P = root.PLANO_PADRAO;
  return {
    id: U.uid(), name: P.nome || 'Programa base — 12 semanas', start, weeks: 12, createdAt: Date.now(),
    phases: P.fases.map(f => Object.assign({}, f)),
    treinos: P.treinos.map((t, i) => ({ id: U.uid(), short: t.id, name: 'Treino ' + t.id, foco: t.foco, days: [t.dia], color: i,
      ex: t.exercicios.map(e => M.makeEx(e[0], e[1], e[2])) }))
  };
};
M.copyProgram = function (src, o) {
  const c = JSON.parse(JSON.stringify(src));
  c.id = U.uid(); c.name = o.name || src.name; c.start = o.start; c.weeks = o.weeks === undefined ? src.weeks : o.weeks;
  c.createdAt = Date.now(); delete c.archivedAt;
  if (c.weeks !== src.weeks) c.phases = [];
  c.treinos.forEach(t => { t.id = U.uid(); });
  return c;
};
M.blankProgram = o => ({ id: U.uid(), name: o.name || 'Novo programa', start: o.start, weeks: o.weeks === undefined ? 12 : o.weeks, createdAt: Date.now(), phases: [], treinos: [] });
M.nextShort = prog => { const used = new Set(prog.treinos.map(t => t.short)); for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') if (!used.has(c)) return c; return '+'; };

M.newProfile = function (o) {
  const prog = M.templatePadrao(o.start);
  return { id: U.uid(), name: o.name, color: o.color, createdAt: Date.now(), minor: !!o.minor,
    consent: o.consent ? { at: Date.now(), version: T12.POLICY_VERSION } : null,
    guardian: o.minor && o.guardian ? { at: Date.now() } : null,
    activeProgram: prog.id, programs: [prog], sessions: [], activities: [], checkins: [] };
};

/* ---------------- programas / semanas ---------------- */
M.prog = (p, id) => p.programs.find(x => x.id === id);
M.activeProgram = p => M.prog(p, p.activeProgram) || p.programs[p.programs.length - 1] || null;
M.programWeek = (prog, date) => Math.floor(U.diffDays(U.parseISO(prog.start), date) / 7) + 1;
M.weekStart = (prog, w) => U.addDays(U.parseISO(prog.start), (w - 1) * 7);
M.phaseOf = (prog, w) => (prog.phases || []).find(f => w >= f.de && w <= f.ate) || null;
M.programState = (prog, date) => {
  if (prog.archivedAt) return 'archived';
  const w = M.programWeek(prog, date);
  if (w < 1) return 'future';
  if (prog.weeks && w > prog.weeks) return 'done';
  return 'active';
};
M.treinosOn = (prog, weekday) => prog ? prog.treinos.filter(t => (t.days || []).includes(weekday)) : [];
M.treinoColor = t => T12.TREINO_COLORS[(t && t.color != null ? t.color : 0) % T12.TREINO_COLORS.length];
/** Data sugerida para um treino planejado numa semana (hoje, se a semana for a atual). */
M.plannedDate = (prog, t, w, today) => {
  const mon = M.weekStart(prog, w);
  if (U.diffDays(mon, today) >= 0 && U.diffDays(mon, today) < 7) return U.iso(today);
  const d = (t.days && t.days.length) ? (t.days[0] + 6) % 7 : 0;
  return U.iso(U.addDays(mon, d));
};

/* ---------------- sessões ---------------- */
M.entryFromEx = ex => Object.assign(JSON.parse(JSON.stringify(ex)), {
  exId: ex.id, id: U.uid(),
  rows: ex.type === 'cardio' ? [] : Array.from({ length: ex.sets }, () => ({ kg: '', r: '', ok: false })),
  mins: '', mod: ex.type === 'cardio' ? M.guessMod(ex.name) : '', km: '', rpe: null, pain: null, feel: null, notes: ''
});
M.guessMod = n => { n = String(n).toLowerCase(); if (n.includes('bicicleta')) return T12.MODALIDADES[0]; if (n.includes('corrida')) return T12.MODALIDADES[2]; if (n.includes('esteira')) return T12.MODALIDADES[1]; if (n.includes('elíptico')) return T12.MODALIDADES[3]; return T12.MODALIDADES[0]; };
M.newSession = (prog, t, date) => ({
  id: U.uid(), date, programId: prog ? prog.id : null, treinoId: t ? t.id : null,
  name: t ? t.name : 'Treino livre', short: t ? t.short : '+', foco: t ? t.foco : '', color: t ? t.color : 6,
  createdAt: Date.now(), startedAt: null, finishedAt: null, durationMin: null, notes: '',
  ex: t ? t.ex.map(M.entryFromEx) : []
});
/** Acrescenta à sessão aberta exercícios incluídos no plano depois que ela foi criada. */
M.syncSession = (s, t) => { if (!t || s.finishedAt) return; t.ex.forEach(ex => { if (!s.ex.some(e => e.exId === ex.id)) s.ex.push(M.entryFromEx(ex)); }); };
M.entryStatus = e => {
  if (!e) return 'none';
  if (e.type === 'cardio') return num(e.mins) > 0 ? 'done' : 'none';
  const rows = e.rows || [], ok = rows.filter(r => r.ok).length;
  if (rows.length && ok === rows.length) return 'done';
  if (ok > 0 || (e.type === 'mob' && num(e.mins) > 0)) return 'partial';
  return 'none';
};
M.sessionStatus = s => {
  if (!s) return 'none';
  const st = s.ex.map(M.entryStatus);
  if (st.length && st.every(x => x === 'done')) return 'done';
  if (st.some(x => x !== 'none')) return 'partial';
  return s.finishedAt && !s.ex.length ? 'done' : 'none';
};
M.hasData = s => M.sessionStatus(s) !== 'none' || !!(s.notes && s.notes.trim()) || num(s.durationMin) > 0;
M.weekSession = (p, prog, treinoId, monday) => {
  const a = U.iso(monday), b = U.iso(U.addDays(monday, 6));
  let best = null;
  for (const s of p.sessions) if (s.programId === prog.id && s.treinoId === treinoId && s.date >= a && s.date <= b && (!best || (s.createdAt || 0) > (best.createdAt || 0))) best = s;
  return best;
};
M.entryMinutes = e => {
  const st = M.entryStatus(e);
  if (e.type === 'cardio') return num(e.mins) || 0;
  if (e.type === 'mob') return num(e.mins) || (st === 'done' ? e.target || 0 : 0);
  return (e.rows || []).filter(r => r.ok).length * 2.5;
};
M.estimateMinutes = s => { const m = U.sum(s.ex, M.entryMinutes); return m > 0 ? Math.round(m + 5) : 0; };
M.elapsedMinutes = s => (s.startedAt && s.finishedAt) ? (s.finishedAt - s.startedAt) / 60000 : null;
/** Minutos da sessão: informado > cronometrado (5–240 min) > estimado pelo conteúdo. */
M.sessionMinutes = s => {
  const d = num(s.durationMin); if (d != null && d > 0) return d;
  const el = M.elapsedMinutes(s); if (el != null && el >= 5 && el <= 240) return Math.round(el);
  return M.hasData(s) ? M.estimateMinutes(s) : 0;
};
M.breakdown = s => {
  const r = { total: 0, cardio: 0, flex: 0, forca: 0, vol: 0, sets: 0, km: 0, rpeSum: 0, rpeN: 0 };
  s.ex.forEach(e => {
    if (e.type === 'cardio') { r.cardio += num(e.mins) || 0; r.km += num(e.km) || 0; }
    else if (e.type === 'mob') r.flex += M.entryMinutes(e);
    (e.rows || []).forEach(x => { if (x.ok) { r.sets++; if (e.type === 'forca') r.vol += (num(x.kg) || 0) * (num(x.r) || 0); } });
    if (e.rpe != null) { r.rpeSum += e.rpe; r.rpeN++; }
  });
  r.total = Math.max(M.sessionMinutes(s), r.cardio + r.flex);
  r.forca = Math.max(0, r.total - r.cardio - r.flex);
  return r;
};

/* ---------------- agregações ---------------- */
M.emptyAgg = () => ({ sessions: 0, done: 0, partial: 0, minutes: 0, treinoMin: 0, cardio: 0, flex: 0, forca: 0, act: 0, aerobic: 0, vol: 0, sets: 0, km: 0, days: 0, rpe: null, _rs: 0, _rn: 0, _d: {} });
M.aggregate = function (p, from, to) {
  const a = M.emptyAgg();
  for (const s of p.sessions) {
    if (s.date < from || s.date > to || !M.hasData(s)) continue;
    const st = M.sessionStatus(s), b = M.breakdown(s);
    a.sessions++; if (st === 'done') a.done++; else a.partial++;
    a.treinoMin += b.total; a.cardio += b.cardio; a.flex += b.flex; a.forca += b.forca; a.vol += b.vol; a.sets += b.sets; a.km += b.km;
    a._rs += b.rpeSum; a._rn += b.rpeN; a._d[s.date] = 1;
  }
  for (const x of p.activities) {
    if (x.date < from || x.date > to) continue;
    const m = num(x.mins) || 0; a.act += m; a.km += num(x.km) || 0; if (m) a._d[x.date] = 1;
  }
  a.minutes = a.treinoMin + a.act; a.aerobic = a.cardio + a.act;
  a.days = Object.keys(a._d).length; a.rpe = a._rn ? a._rs / a._rn : null;
  delete a._d; delete a._rs; delete a._rn;
  return a;
};
M.firstDate = p => {
  let f = null;
  const see = d => { if (d && (!f || d < f)) f = d; };
  p.sessions.forEach(s => M.hasData(s) && see(s.date)); p.activities.forEach(x => see(x.date)); p.checkins.forEach(c => see(c.date));
  return f;
};
/** Períodos navegáveis. kind: semana | mes | semestre | ano | tudo */
M.period = function (kind, anchor, p, today) {
  const d = U.parseISO(anchor), y = d.getFullYear(), m = d.getMonth();
  let from, to, label, prev, next, buckets = [];
  if (kind === 'semana') {
    from = U.mondayOf(d); to = U.addDays(from, 6);
    label = `${U.dm(from)} – ${U.dm(to)}`; prev = U.addDays(from, -7); next = U.addDays(from, 7);
    for (let i = 0; i < 7; i++) { const x = U.addDays(from, i); buckets.push({ from: U.iso(x), to: U.iso(x), label: U.DIAS_CURTOS[x.getDay()] }); }
  } else if (kind === 'mes') {
    from = new Date(y, m, 1); to = new Date(y, m + 1, 0);
    label = `${U.MESES_LONGOS[m]} de ${y}`; prev = U.addMonths(from, -1); next = U.addMonths(from, 1);
    for (let i = 1; i <= to.getDate(); i++) { const x = new Date(y, m, i); buckets.push({ from: U.iso(x), to: U.iso(x), label: (i === 1 || i % 5 === 0) ? String(i) : '' }); }
  } else if (kind === 'semestre') {
    const s0 = m < 6 ? 0 : 6; from = new Date(y, s0, 1); to = new Date(y, s0 + 6, 0);
    label = `${s0 ? 2 : 1}º semestre de ${y}`; prev = U.addMonths(from, -6); next = U.addMonths(from, 6);
    for (let i = 0; i < 6; i++) buckets.push({ from: U.iso(new Date(y, s0 + i, 1)), to: U.iso(new Date(y, s0 + i + 1, 0)), label: U.MESES[s0 + i] });
  } else if (kind === 'ano') {
    from = new Date(y, 0, 1); to = new Date(y, 11, 31);
    label = String(y); prev = new Date(y - 1, 0, 1); next = new Date(y + 1, 0, 1);
    for (let i = 0; i < 12; i++) buckets.push({ from: U.iso(new Date(y, i, 1)), to: U.iso(new Date(y, i + 1, 0)), label: U.MESES[i] });
  } else { // tudo
    const f = M.firstDate(p); const y0 = f ? U.parseISO(f).getFullYear() : today.getFullYear(), y1 = today.getFullYear();
    from = new Date(y0, 0, 1); to = new Date(y1, 11, 31); label = y0 === y1 ? `${y0}` : `${y0} – ${y1}`; prev = null; next = null;
    for (let yy = y0; yy <= y1; yy++) buckets.push({ from: `${yy}-01-01`, to: `${yy}-12-31`, label: String(yy).slice(y1 - y0 > 6 ? 2 : 0) });
  }
  const span = U.diffDays(from, to) + 1;
  const pf = kind === 'tudo' ? null : (kind === 'semana' ? U.addDays(from, -7) : kind === 'mes' ? U.addMonths(from, -1) : kind === 'semestre' ? U.addMonths(from, -6) : new Date(y - 1, 0, 1));
  let pt = pf ? (kind === 'semana' ? U.addDays(pf, 6) : U.addDays(from, -1)) : null;
  // período em andamento: compara com o mesmo ponto do período anterior (ex.: ano até hoje × mesmo dia do ano passado)
  const running = U.iso(today) >= U.iso(from) && U.iso(today) <= U.iso(to);
  if (pf && running) { const cut = U.addDays(pf, U.diffDays(from, today)); if (cut < pt) pt = cut; }
  return { kind, from: U.iso(from), to: U.iso(to), label, span, buckets,
    prev: prev && U.iso(prev), next: next && U.iso(next), isFuture: U.iso(from) > U.iso(today), hasNext: next ? U.iso(next) <= U.iso(today) : false,
    prevFrom: pf && U.iso(pf), prevTo: pt && U.iso(pt), running };
};
M.series = (p, buckets) => buckets.map(b => M.aggregate(p, b.from, b.to));
/** Semanas (seg–dom) do intervalo que bateram a meta de minutos aeróbicos (cardio + atividades). */
M.goalWeeks = function (p, from, to, goal, today) {
  const f = M.firstDate(p); if (!f) return { met: 0, total: 0 };
  let mon = U.mondayOf(U.parseISO(f > from ? f : from)); const end = U.parseISO(to < U.iso(today) ? to : U.iso(today));
  let met = 0, total = 0;
  while (U.diffDays(mon, end) >= 0) { const a = M.aggregate(p, U.iso(mon), U.iso(U.addDays(mon, 6))); total++; if (a.aerobic >= goal) met++; mon = U.addDays(mon, 7); }
  return { met, total };
};
/** Semanas seguidas com pelo menos um treino ou atividade (a semana atual conta se já tiver algo). */
M.streak = function (p, today) {
  let mon = U.mondayOf(today), n = 0;
  const has = m => { const a = M.aggregate(p, U.iso(m), U.iso(U.addDays(m, 6))); return a.sessions + (a.act > 0 ? 1 : 0) > 0; };
  if (!has(mon)) mon = U.addDays(mon, -7);
  while (has(mon) && n < 1000) { n++; mon = U.addDays(mon, -7); }
  return n;
};
M.byYear = function (p, today) {
  const f = M.firstDate(p); if (!f) return [];
  const out = [];
  for (let y = U.parseISO(f).getFullYear(); y <= today.getFullYear(); y++) out.push(Object.assign({ year: y }, M.aggregate(p, `${y}-01-01`, `${y}-12-31`)));
  return out;
};
M.byDecade = rows => {
  const d = {};
  rows.forEach(r => { const k = Math.floor(r.year / 10) * 10; d[k] = d[k] || { decade: k, sessions: 0, minutes: 0, aerobic: 0, vol: 0, km: 0 };
    ['sessions', 'minutes', 'aerobic', 'vol', 'km'].forEach(f => d[k][f] += r[f]); });
  return Object.values(d);
};
M.dayMinutes = function (p, from, to) {
  const m = {};
  p.sessions.forEach(s => { if (s.date >= from && s.date <= to && M.hasData(s)) m[s.date] = (m[s.date] || 0) + M.breakdown(s).total; });
  p.activities.forEach(x => { if (x.date >= from && x.date <= to) m[x.date] = (m[x.date] || 0) + (num(x.mins) || 0); });
  return m;
};

/* ---------------- progressão de carga ---------------- */
const order = s => s.date + ':' + String(s.startedAt || s.createdAt || 0).padStart(15, '0');
M.prevEntry = function (p, key, cur) {
  const k = cur ? order(cur) : '9999';
  let best = null, bk = '';
  for (const s of p.sessions) {
    if (cur && s.id === cur.id) continue;
    const o = order(s); if (o >= k || o <= bk) continue;
    const e = s.ex.find(x => x.key === key);
    if (!e) continue;
    if (e.type === 'cardio' ? num(e.mins) > 0 : (e.rows || []).some(r => r.ok)) { best = { s, e }; bk = o; }
  }
  return best;
};
M.readyToProgress = e => {
  if (!e || !e.rows || !e.repMax) return false;
  const ok = e.rows.filter(r => r.ok);
  return ok.length >= (e.sets || 1) && ok.every(r => (num(r.r) || 0) >= e.repMax);
};
M.maxKg = e => { let b = null; (e.rows || []).forEach(r => { const v = num(r.kg); if (r.ok && v != null && (b == null || v > b)) b = v; }); return b; };
/** Recordes de carga por exercício (chave = nome normalizado), opcionalmente antes de uma data/sessão. */
M.bests = function (p, before) {
  const k = before ? order(before) : null, out = {};
  for (const s of p.sessions) {
    if (before && (s.id === before.id || order(s) >= k)) continue;
    for (const e of s.ex) {
      if (e.type !== 'forca' && e.type !== 'tempo') continue;
      const v = M.maxKg(e); if (v == null) continue;
      if (!out[e.key] || v > out[e.key].kg) out[e.key] = { kg: v, date: s.date, name: e.name };
    }
  }
  return out;
};
M.exerciseList = function (p) {
  const m = {};
  p.sessions.forEach(s => s.ex.forEach(e => { if ((e.type === 'forca' || e.type === 'tempo') && (e.rows || []).some(r => r.ok)) { m[e.key] = m[e.key] || { key: e.key, name: e.name, n: 0, last: '' }; m[e.key].n++; if (s.date > m[e.key].last) { m[e.key].last = s.date; m[e.key].name = e.name; } } }));
  return Object.values(m).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
};
/** Série de carga: maior carga (ou maior tempo, se sem carga) por intervalo. */
M.loadSeries = function (p, key, buckets) {
  let unit = 'kg';
  const vals = buckets.map(b => {
    let best = null;
    p.sessions.forEach(s => { if (s.date < b.from || s.date > b.to) return; s.ex.forEach(e => { if (e.key !== key) return;
      (e.rows || []).forEach(r => { if (!r.ok) return; let v = num(r.kg); if (v == null && e.type === 'tempo') { v = num(r.r); unit = 's'; } if (v != null && (best == null || v > best)) best = v; }); }); });
    return best;
  });
  return { vals, unit };
};
/** Primeira e melhor carga de cada exercício dentro do intervalo → maiores ganhos. */
M.gains = function (p, from, to) {
  const m = {};
  p.sessions.slice().sort((a, b) => order(a) < order(b) ? -1 : 1).forEach(s => {
    if (s.date < from || s.date > to) return;
    s.ex.forEach(e => { if (e.type !== 'forca') return; const v = M.maxKg(e); if (v == null) return;
      if (!m[e.key]) m[e.key] = { key: e.key, name: e.name, first: v, best: v, short: s.short, color: s.color }; else m[e.key].best = Math.max(m[e.key].best, v); });
  });
  return Object.values(m).filter(x => x.first > 0 && x.best > x.first).map(x => Object.assign(x, { pct: (x.best / x.first - 1) * 100 })).sort((a, b) => b.pct - a.pct);
};
M.checkinSeries = (p, field, buckets) => buckets.map(b => {
  let v = null, d = '';
  p.checkins.forEach(c => { const x = num(c[field]); if (x != null && c.date >= b.from && c.date <= b.to && c.date >= d) { v = x; d = c.date; } });
  return v;
});
M.checkinOfWeek = (p, monday) => { const a = U.iso(monday), b = U.iso(U.addDays(monday, 6)); return p.checkins.filter(c => c.date >= a && c.date <= b).sort((x, y) => x.date < y.date ? 1 : -1)[0] || null; };

/* ---------------- configurações / normalização ---------------- */
M.defaultSettings = () => ({ rest: 90, theme: 'auto', sound: true, goal: 150, lastBackup: null, installDismissed: false });
M.emptyState = () => ({ schema: T12.SCHEMA, active: null, profiles: [], settings: M.defaultSettings() });
const arr = v => Array.isArray(v) ? v : [];
const str = (v, max) => String(v == null ? '' : v).slice(0, max || 500);
M.normalizeProfile = function (p) {
  if (!p || typeof p !== 'object' || !p.id || !p.name) return null;
  p.name = str(p.name, 40); p.color = /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : T12.COLORS[0];
  p.programs = arr(p.programs).filter(x => x && x.id && /^\d{4}-\d{2}-\d{2}$/.test(x.start));
  p.programs.forEach(g => { g.treinos = arr(g.treinos); g.phases = arr(g.phases); g.treinos.forEach(t => { t.ex = arr(t.ex); t.days = arr(t.days).filter(d => d >= 0 && d <= 6); }); });
  p.sessions = arr(p.sessions).filter(s => s && s.id && /^\d{4}-\d{2}-\d{2}$/.test(s.date));
  p.sessions.forEach(s => { s.ex = arr(s.ex); s.ex.forEach(e => { e.rows = arr(e.rows); if (!e.key) e.key = U.slug(e.name); }); });
  p.activities = arr(p.activities).filter(x => x && x.id && /^\d{4}-\d{2}-\d{2}$/.test(x.date));
  p.checkins = arr(p.checkins).filter(x => x && x.id && /^\d{4}-\d{2}-\d{2}$/.test(x.date));
  if (!M.prog(p, p.activeProgram)) p.activeProgram = p.programs.length ? p.programs[p.programs.length - 1].id : null;
  return p;
};
M.normalize = function (s) {
  s = s && typeof s === 'object' ? s : M.emptyState();
  s.schema = T12.SCHEMA;
  s.settings = Object.assign(M.defaultSettings(), s.settings || {});
  s.profiles = arr(s.profiles).map(M.normalizeProfile).filter(Boolean);
  if (!s.profiles.find(p => p.id === s.active)) s.active = s.profiles[0] ? s.profiles[0].id : null;
  return s;
};

/* ---------------- migração v1 → v2 ---------------- */
M.isV1 = s => s && Array.isArray(s.profiles) && s.profiles.some(p => p && Array.isArray(p.plan) && p.weeks && !p.programs);
M.migrateV1 = function (old) {
  const P = root.PLANO_PADRAO;
  const st = M.emptyState();
  Object.assign(st.settings, old.settings || {});
  const planFrom = plan => plan.map((t, i) => ({
    id: t.id, short: t.id, name: 'Treino ' + t.id, foco: t.foco, days: [t.dia], color: 'ABCDEFG'.indexOf(t.id) >= 0 ? 'ABCDEFG'.indexOf(t.id) : i,
    ex: t.ex.map(e => ({ id: e.id, key: U.slug(e.name), name: e.name, cat: e.cat, presc: e.presc, video: e.video || '', type: e.type, sets: e.sets, repMin: e.min, repMax: e.max, target: e.target }))
  }));
  const convert = (p, prog, weeks) => {
    Object.keys(weeks || {}).forEach(wk => {
      const w = +wk, obj = weeks[wk] || {}, mon = M.weekStart(prog, w);
      Object.keys(obj.s || {}).forEach(tid => {
        const s = obj.s[tid], t = prog.treinos.find(x => x.id === tid); if (!t || !s) return;
        let date = U.iso(U.addDays(mon, ((t.days[0] || 1) + 6) % 7));
        if (s.finishedAt) { const f = new Date(s.finishedAt); const dd = U.diffDays(mon, f); if (dd >= 0 && dd < 7) date = U.iso(f); }
        const ses = M.newSession(prog, t, date);
        ses.ex = [];
        t.ex.forEach(ex => { const l = s.ex && s.ex[ex.id]; if (!l) return; const e = M.entryFromEx(ex);
          if (Array.isArray(l.sets)) e.rows = l.sets.map(r => ({ kg: r.kg == null ? '' : String(r.kg), r: r.r == null ? '' : String(r.r), ok: !!r.ok }));
          e.mins = l.min == null ? '' : String(l.min); if (l.mod) e.mod = l.mod; e.km = l.km || ''; e.rpe = l.rpe == null ? null : l.rpe; e.pain = l.pain == null ? null : l.pain; e.feel = l.feel || null; e.notes = l.notes || '';
          ses.ex.push(e); });
        ses.startedAt = s.startedAt || null; ses.finishedAt = s.finishedAt || null; ses.notes = s.notes || '';
        const el = M.elapsedMinutes(ses); if (el != null && el >= 5 && el <= 240) ses.durationMin = Math.round(el);
        if (M.hasData(ses)) p.sessions.push(ses);
      });
      const c = obj.checkin || {};
      if (['weight', 'waist', 'muscle', 'fat', 'sleep', 'energy', 'notes'].some(k => c[k])) p.checkins.push({ id: U.uid(), date: U.iso(mon), weight: c.weight || '', waist: c.waist || '', muscle: c.muscle || '', fat: c.fat || '', sleep: c.sleep || '', energy: c.energy || null, notes: c.notes || '' });
      if (num(c.extra) > 0) p.activities.push({ id: U.uid(), date: U.iso(U.addDays(mon, 5)), type: 'Caminhada', mins: String(num(c.extra)), km: '', rpe: null, notes: 'Caminhadas da semana (migrado da versão 1)' });
    });
  };
  st.profiles = (old.profiles || []).filter(p => p && p.id && Array.isArray(p.plan)).map(op => {
    const p = { id: op.id, name: op.name, color: op.color, createdAt: op.created ? Date.parse(op.created) || Date.now() : Date.now(), minor: false, consent: null, guardian: null,
      programs: [], sessions: [], activities: [], checkins: [] };
    (op.history || []).forEach((h, i) => {
      const g = { id: U.uid(), name: `Programa 12 semanas — ciclo ${i + 1}`, start: h.start, weeks: 12, phases: P.fases.map(f => Object.assign({}, f)), treinos: planFrom(op.plan), createdAt: Date.now() };
      g.archivedAt = U.iso(U.addDays(U.parseISO(h.start), 83));
      p.programs.push(g); convert(p, g, h.weeks);
    });
    const cur = { id: U.uid(), name: 'Programa 12 semanas', start: op.start, weeks: 12, phases: P.fases.map(f => Object.assign({}, f)), treinos: planFrom(op.plan), createdAt: Date.now() };
    p.programs.push(cur); p.activeProgram = cur.id; convert(p, cur, op.weeks);
    return p;
  });
  st.active = old.active;
  return M.normalize(st);
};
/** Lê qualquer versão (estado salvo ou arquivo de backup) e devolve estado v2 normalizado. */
M.upgrade = function (s) {
  if (!s || typeof s !== 'object') return M.emptyState();
  if (M.isV1(s) || s.schema === 1 || s.v === 1) return M.migrateV1(s);
  return M.normalize(s);
};
/** Valida um arquivo de backup (já decifrado). */
M.readBackup = function (obj) {
  if (!obj || obj.app !== 'treino12') return { error: 'Este arquivo não é um backup do Treino 12.' };
  if (!Array.isArray(obj.profiles)) return { error: 'Backup incompleto ou corrompido.' };
  const st = M.upgrade({ schema: obj.schema, v: obj.schema === 1 ? 1 : undefined, profiles: obj.profiles, settings: {} });
  if (!st.profiles.length) return { error: 'O backup não contém pessoas válidas.' };
  return { profiles: st.profiles, exportedAt: obj.exportedAt, schema: obj.schema };
};
})(typeof window !== 'undefined' ? window : globalThis);
