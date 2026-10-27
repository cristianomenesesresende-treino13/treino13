/* Treino 12 — telas: boas-vindas/consentimento, Hoje, Treinos (semana e histórico), Sessão, Check-in. */
(function (root) {
'use strict';
const T12 = root.T12, U = T12.U, M = T12.M, UI = T12.UI, ic = T12.ic, Ch = T12.Ch;
const V = T12.V = T12.V || {};
const esc = U.esc, num = U.num, fmt = U.fmt;

/* ---------- boas-vindas + consentimento (LGPD) ---------- */
V.welcome = function () {
  const first = !T12.S.profiles.length;
  const monday = U.iso(U.mondayOf(U.today()));
  return `<main class="welcome">
    ${first ? '' : `<button type="button" class="iconbtn" data-a="back" aria-label="Voltar" style="margin:-20px 0 10px -10px">${ic('back')}</button>`}
    <div class="logo" aria-hidden="true">12</div>
    <h1>${first ? 'Seu treino, no bolso. Para a vida toda.' : 'Adicionar pessoa'}</h1>
    <p class="lead">${first ? 'Registre cargas, repetições, cardio, alongamentos e atividades em segundos. Acompanhe a evolução por semana, mês, ano — e década.' : 'Cada pessoa tem seus próprios programas, registros e evolução neste aparelho.'}</p>
    ${first ? `
    <div class="feat"><span class="ic">${ic('layers')}</span><div><b>Programas sem prazo de validade</b><div class="muted small">Comece com o plano de 12 semanas da sua planilha e crie novos ciclos e treinos quando quiser.</div></div></div>
    <div class="feat"><span class="ic">${ic('chart')}</span><div><b>Progresso em qualquer período</b><div class="muted small">Semana, mês, semestre, ano e acumulado de toda a vida.</div></div></div>
    <div class="feat"><span class="ic">${ic('shield')}</span><div><b>Privado por padrão</b><div class="muted small">Sem conta e sem servidor: os dados ficam só neste aparelho, com backup protegido por senha.</div></div></div>` : ''}
    <form class="card" id="w-form" novalidate style="margin-top:14px">
      <label class="field"><span>Nome</span><input class="input" id="w-name" autocomplete="given-name" placeholder="Ex.: Cristiano" maxlength="40" required></label>
      <label class="field"><span>Início do primeiro programa (a semana começa na segunda)</span><input class="input" id="w-start" type="date" value="${monday}"></label>
      <span class="flabel">Cor</span>
      <div class="colors" id="w-colors" role="radiogroup" aria-label="Cor do perfil">${T12.COLORS.map((c, i) => `<button type="button" role="radio" aria-checked="${i === T12.S.profiles.length % T12.COLORS.length}" aria-label="Cor ${i + 1}" data-c="${c}" class="${i === T12.S.profiles.length % T12.COLORS.length ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      <label class="toggle" style="margin-top:16px"><input type="checkbox" id="w-minor"><span>Esta pessoa tem menos de 18 anos</span></label>
      ${V.consentBoxes('w')}
    </form>
    <div style="flex:1"></div>
    <button type="button" class="btn primary block" id="w-go" style="margin-top:16px">${first ? 'Começar' : 'Adicionar'}</button>
    ${first ? `<button type="button" class="btn ghost block" data-a="restore" style="margin-top:10px">${ic('upload')} Restaurar um backup</button>` : ''}
  </main>`;
};
V.consentBoxes = (pre, minor) => `
  <div class="consent">
    <label class="chk"><input type="checkbox" id="${pre}-consent"><span>Autorizo o registro dos meus dados de treino e de saúde (peso, medidas, dor, esforço) <b>somente neste aparelho</b>, para acompanhar minha evolução, conforme a <a href="#/privacidade" data-a="policy">Política de privacidade</a>.</span></label>
    <label class="chk ${minor ? '' : 'hidden'}" id="${pre}-guard-wrap"><input type="checkbox" id="${pre}-guardian"><span>Sou mãe, pai ou responsável legal por esta pessoa e dou o consentimento específico exigido para menores de idade (LGPD, art. 14).</span></label>
  </div>`;
V.bindWelcome = function () {
  let color = (UI.$('#w-colors .on') || {}).dataset ? UI.$('#w-colors .on').dataset.c : T12.COLORS[0];
  UI.$('#w-colors').onclick = e => { const b = e.target.closest('button'); if (!b) return; color = b.dataset.c; UI.$$('#w-colors button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); };
  UI.$('#w-minor').onchange = e => UI.$('#w-guard-wrap').classList.toggle('hidden', !e.target.checked);
  UI.$('#w-go').onclick = () => {
    const name = UI.$('#w-name').value.trim(), minor = UI.$('#w-minor').checked;
    if (!name) { UI.$('#w-name').focus(); return UI.toast('Digite o nome'); }
    if (!UI.$('#w-consent').checked) { UI.$('#w-consent').focus(); return UI.toast('É preciso autorizar o registro para usar o app'); }
    if (minor && !UI.$('#w-guardian').checked) { UI.$('#w-guardian').focus(); return UI.toast('Menores de idade precisam do consentimento do responsável'); }
    const st = UI.$('#w-start').value ? U.iso(U.mondayOf(U.parseISO(UI.$('#w-start').value))) : U.iso(U.mondayOf(U.today()));
    const p = M.newProfile({ name, color, start: st, minor, consent: true, guardian: minor });
    T12.S.profiles.push(p); T12.S.active = p.id; T12.save(true); T12.Store.persist();
    UI.toast(`Bem-vindo(a), ${name.split(' ')[0]}!`); T12.go('#/hoje');
  };
};
/** Perfis migrados da v1 (ou com política nova) precisam consentir antes de continuar. */
V.consentGate = p => `<main class="welcome"><div class="logo" aria-hidden="true">${ic('shield', 'width="34" height="34"')}</div>
  <h1>Antes de continuar, ${esc(p.name.split(' ')[0])}</h1>
  <p class="lead">O Treino 12 foi atualizado e agora pede sua autorização expressa para guardar dados de saúde, como manda a LGPD. Nada muda no funcionamento: os dados continuam somente neste aparelho.</p>
  <div class="card"><label class="toggle"><input type="checkbox" id="g-minor" ${p.minor ? 'checked' : ''}><span>Esta pessoa tem menos de 18 anos</span></label>${V.consentBoxes('g', p.minor)}</div>
  <div style="flex:1"></div>
  <button type="button" class="btn primary block" data-a="consent-ok">Concordo e continuar</button>
  <button type="button" class="btn ghost block" data-a="backup" style="margin-top:10px">${ic('download')} Fazer backup antes</button>
  <button type="button" class="btn danger block" data-a="consent-no" style="margin-top:10px">Não concordo — apagar os dados de ${esc(p.name.split(' ')[0])}</button>
  ${T12.S.profiles.length > 1 ? `<button type="button" class="linkbtn" data-a="profiles" style="margin-top:12px">Trocar de pessoa</button>` : ''}</main>`;

/* ---------- elementos comuns ---------- */
V.top = (p, title, sub) => `<header class="topbar"><div><div class="sub">${sub || ''}</div><h1>${title}</h1></div><button type="button" data-a="profiles" aria-label="Trocar pessoa (atual: ${esc(p.name)})">${UI.avatar(p)}</button></header>`;
V.wcard = function (p, prog, t, w) {
  const s = M.weekSession(p, prog, t.id, M.weekStart(prog, w)), st = M.sessionStatus(s);
  const done = s ? s.ex.filter(e => M.entryStatus(e) === 'done').length : 0;
  const days = (t.days || []).map(d => U.DIAS_ABREV[d]).join(', ');
  const sub = s && M.hasData(s) ? `${done}/${s.ex.length} exercícios · ${U.dm(U.parseISO(s.date))}${s.finishedAt ? ' · ' + U.hm(M.sessionMinutes(s)) : ''}` : `${t.ex.length} exercícios${days ? ' · ' + days : ''}`;
  return `<button type="button" class="wcard" data-a="open" data-t="${t.id}" data-w="${w}">${UI.letter(t.short, M.treinoColor(t))}
    <div class="grow"><div class="t">${esc(t.name)}${t.foco ? ' — ' + esc(t.foco) : ''}</div><div class="s">${sub}</div></div>
    <span class="status-ic ${st}" aria-label="${st === 'done' ? 'concluído' : st === 'partial' ? 'em andamento' : 'pendente'}">${st === 'done' ? ic('check') : st === 'partial' ? ic('minus') : ic('chev')}</span></button>`;
};
V.weekState = function (p, prog, w) {
  const out = prog.treinos.map(t => M.sessionStatus(M.weekSession(p, prog, t.id, M.weekStart(prog, w))));
  return { done: out.filter(x => x === 'done').length, total: prog.treinos.length, list: out };
};

/* ---------- HOJE ---------- */
V.hoje = function (p) {
  const S = T12.S, t0 = U.today(), wd = t0.getDay(), hour = new Date().getHours();
  const hi = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const prog = M.activeProgram(p);
  let out = `<main class="screen">${V.top(p, `${hi}, ${esc(p.name.split(' ')[0])}`, `${U.DIAS[wd]}, ${U.dm(t0)}`)}`;
  if (T12.loadError) out += `<div class="banner bad" role="alert">${ic('info')}<div class="grow"><b>Houve um erro inesperado</b><span class="small">Seus dados estão salvos. Por segurança, faça um backup.</span></div><button type="button" class="btn sm" data-a="backup">Backup</button></div>`;
  if (!UI.isStandalone() && !S.settings.installDismissed) out += `<div class="banner info"><span class="accent-ic">${ic('phone')}</span><div class="grow"><b>Instale na tela inicial</b><span class="small muted">Abre como app e funciona sem internet.</span></div><button type="button" class="btn sm primary" data-a="install">Instalar</button></div>`;
  const hasData = p.sessions.length + p.activities.length + p.checkins.length > 0;
  const lb = S.settings.lastBackup ? U.diffDays(new Date(S.settings.lastBackup), new Date()) : null;
  if (hasData && (lb == null || lb >= 7)) out += `<div class="banner warn">${ic('shield')}<div class="grow"><b>${lb == null ? 'Você ainda não fez backup' : `Último backup há ${lb} dias`}</b><span class="small">Os dados ficam só neste aparelho.</span></div><button type="button" class="btn sm" data-a="backup">Backup</button></div>`;

  if (!prog) {
    out += `<section class="hero"><span class="tag">Sem programa</span><div class="big">Crie seu programa de treino</div><div class="meta">Use o modelo de 12 semanas ou monte o seu.</div><a class="btn primary" href="#/programas">Criar programa</a></section>`;
  } else {
    const state = M.programState(prog, t0), w = M.programWeek(prog, t0);
    if (state === 'future') {
      out += `<section class="hero"><span class="tag">Em breve</span><div class="big">“${esc(prog.name)}” começa em ${U.dm(U.parseISO(prog.start))}</div><div class="meta">Faltam ${U.diffDays(t0, U.parseISO(prog.start))} dias. Enquanto isso, registre atividades livres.</div><button type="button" class="btn primary" data-a="activity">${ic('plus')} Registrar atividade</button></section>`;
    } else if (state === 'done') {
      out += `<section class="hero"><span class="tag">${ic('trophy', 'width="16" height="16"')} Programa concluído</span><div class="big">${prog.weeks} semanas completas. Parabéns!</div><div class="meta">Escolha como seguir — todo o histórico continua no Progresso.</div>
        <div class="stack"><button type="button" class="btn primary block" data-a="prog-repeat">${ic('refresh')} Repetir este programa</button><a class="btn ghost block" href="#/programas">${ic('layers')} Novo programa</a><button type="button" class="btn ghost block" data-a="prog-continuous">Seguir sem data de fim</button></div></section>`;
    } else {
      const todays = M.treinosOn(prog, wd);
      const pend = prog.treinos.filter(t => M.sessionStatus(M.weekSession(p, prog, t.id, M.weekStart(prog, w))) !== 'done');
      const main = todays.find(t => pend.includes(t)) || todays[0];
      if (!main) {
        const a = M.aggregate(p, U.iso(U.mondayOf(t0)), U.iso(U.addDays(U.mondayOf(t0), 6)));
        out += `<section class="hero"><span class="tag">${ic('walk', 'width="16" height="16"')} Dia livre</span><div class="big">Descanso ou atividade leve</div>
          <div class="meta" style="display:block">Aeróbico nesta semana: <b class="num">${fmt(a.aerobic, 0)} de ${S.settings.goal} min</b></div>
          <button type="button" class="btn primary" data-a="activity">${ic('plus')} Registrar atividade</button></section>`;
        if (pend.length) out += `<h2 class="section-title">Pendentes nesta semana</h2>` + pend.map(t => V.wcard(p, prog, t, w)).join('');
      } else {
        const s = M.weekSession(p, prog, main.id, M.weekStart(prog, w)), st = M.sessionStatus(s);
        const lab = st === 'done' ? 'Ver treino' : st === 'partial' ? 'Continuar treino' : 'Começar treino';
        out += `<section class="hero" style="border-top:4px solid ${M.treinoColor(main)}"><span class="letter" style="color:${M.treinoColor(main)}" aria-hidden="true">${esc(main.short)}</span>
          <span class="tag">${st === 'done' ? 'Feito hoje ✓' : 'Treino de hoje'}</span><div class="big">${esc(main.name)}</div><div class="bold">${esc(main.foco || '')}</div>
          <div class="meta"><span>${main.ex.length} exercícios</span><span>·</span><span>~${V.estPlan(main)} min</span><span>·</span><span>Semana ${w}${prog.weeks ? ' de ' + prog.weeks : ''}</span></div>
          <button type="button" class="btn ${st === 'done' ? 'ghost' : 'primary'} block" data-a="open" data-t="${main.id}" data-w="${w}">${st === 'done' ? ic('check') : ic('dumbbell')} ${lab}</button></section>`;
        const others = todays.filter(t => t !== main).concat(st === 'done' ? pend.filter(t => !todays.includes(t)) : []);
        if (others.length) out += `<h2 class="section-title">${st === 'done' ? 'Ainda pendentes nesta semana' : 'Também hoje'}</h2>` + others.map(t => V.wcard(p, prog, t, w)).join('');
      }
      out += V.weekCard(p, prog, w, t0);
    }
  }
  // indicadores rápidos
  const mon = U.mondayOf(t0), wa = M.aggregate(p, U.iso(mon), U.iso(U.addDays(mon, 6)));
  const m0 = new Date(t0.getFullYear(), t0.getMonth(), 1), ma = M.aggregate(p, U.iso(m0), U.iso(new Date(t0.getFullYear(), t0.getMonth() + 1, 0)));
  const streak = M.streak(p, t0);
  out += `<div class="tiles three">
    <div class="tile"><div class="v num">${fmt(wa.aerobic, 0)}<small>/${S.settings.goal}</small></div><div class="k">Min aeróbicos na semana</div><div class="bar" aria-hidden="true"><i style="width:${Math.min(100, wa.aerobic / S.settings.goal * 100)}%"></i></div></div>
    <div class="tile"><div class="v num">${ma.sessions}<small>treinos</small></div><div class="k">${U.MESES_LONGOS[t0.getMonth()]} · ${U.hm(ma.minutes)}</div></div>
    <div class="tile"><div class="v num">${streak}<small>sem.</small></div><div class="k">Sequência ativa</div></div></div>
  <div class="quick">
    <button type="button" data-a="activity">${ic('walk')}<span>Atividade</span></button>
    <button type="button" data-a="free">${ic('plus')}<span>Treino livre</span></button>
    <a href="#/checkin/${U.iso(mon)}">${ic('scale')}<span>Check-in</span></a>
    <a href="#/progresso">${ic('chart')}<span>Progresso</span></a></div>`;
  const ph = prog && M.programState(prog, t0) === 'active' ? M.phaseOf(prog, M.programWeek(prog, t0)) : null;
  if (ph) out += `<div class="card"><h2>Dica da fase · ${esc(ph.nome)}</h2><div class="small">${esc(ph.dica)}</div></div>`;
  return out + '</main>';
};
V.estPlan = t => Math.max(10, Math.round(t.ex.reduce((a, e) => a + (e.type === 'cardio' ? e.target : e.type === 'mob' ? e.target + 1 : e.sets * 2.5), 5) / 5) * 5);
V.weekCard = function (p, prog, w, t0) {
  const mon = M.weekStart(prog, w), ws = V.weekState(p, prog, w), ph = M.phaseOf(prog, w);
  const strip = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = U.addDays(mon, i), dw = d.getDay(), ts = M.treinosOn(prog, dw);
    const t = ts[0]; const isT = U.iso(d) === U.iso(t0);
    const st = t ? M.sessionStatus(M.weekSession(p, prog, t.id, mon)) : 'off';
    const extra = !t && (p.sessions.some(s => s.date === U.iso(d) && M.hasData(s)) || p.activities.some(a => a.date === U.iso(d)));
    const inner = `<span>${U.DIAS_CURTOS[dw]}</span><span class="b">${t ? esc(t.short) + (ts.length > 1 ? '+' : '') : extra ? '•' : ''}</span>`;
    return t ? `<button type="button" class="wday ${st} ${isT ? 'today' : ''}" data-a="open" data-t="${t.id}" data-w="${w}" aria-label="${U.DIAS[dw]}: ${esc(t.name)}">${inner}</button>` : `<div class="wday off ${extra ? 'extra' : ''} ${isT ? 'today' : ''}">${inner}</div>`;
  }).join('');
  return `<section class="card"><div class="row between"><div class="grow"><h2 style="margin-bottom:4px">Semana ${w}${prog.weeks ? ' de ' + prog.weeks : ''}</h2><div class="bold">${esc(ph ? ph.nome : prog.name)}</div><div class="muted small">${U.dm(mon)} – ${U.dm(U.addDays(mon, 6))}</div></div>${Ch.ring(ws.total ? ws.done / ws.total : 0, `${ws.done}/${ws.total}`, 'treinos')}</div>
    <div class="weekstrip">${strip}</div></section>`;
};

/* ---------- TREINOS ---------- */
V.treinos = function (p) {
  const ui = T12.ui, tab = ui.tab || 'semana';
  let out = `<main class="screen">${V.top(p, 'Treinos', 'Programa e histórico')}
    <div class="seg big" role="tablist"><button type="button" role="tab" aria-selected="${tab === 'semana'}" data-a="tab" data-v="semana" class="${tab === 'semana' ? 'on' : ''}">Programa</button><button type="button" role="tab" aria-selected="${tab === 'historico'}" data-a="tab" data-v="historico" class="${tab === 'historico' ? 'on' : ''}">Histórico</button></div>`;
  out += tab === 'historico' ? V.historico(p) : V.semana(p);
  return out + '</main>';
};
V.semana = function (p) {
  const prog = M.activeProgram(p), t0 = U.today();
  if (!prog) return `<div class="empty">Nenhum programa ativo.<br><br><a class="btn primary" href="#/programas">Criar programa</a></div>`;
  const cw = U.clamp(M.programWeek(prog, t0), 1, prog.weeks || 9999);
  const maxW = prog.weeks || Math.max(cw + 1, 1);
  const w = U.clamp(T12.ui.week[prog.id] || cw, 1, maxW); T12.ui.week[prog.id] = w;
  const mon = M.weekStart(prog, w), ph = M.phaseOf(prog, w), ws = V.weekState(p, prog, w);
  const a = M.aggregate(p, U.iso(mon), U.iso(U.addDays(mon, 6)));
  const ck = M.checkinOfWeek(p, mon);
  let out = `<a class="progcard" href="#/programas"><div class="grow"><div class="tiny muted">PROGRAMA ATIVO</div><div class="bold">${esc(prog.name)}</div><div class="small muted">${prog.weeks ? prog.weeks + ' semanas' : 'Contínuo'} · início ${U.dmy(U.parseISO(prog.start))}</div></div>${ic('chev', 'class="chev"')}</a>
  <div class="weeknav"><button type="button" class="iconbtn" data-a="wk" data-d="-1" ${w <= 1 ? 'disabled' : ''} aria-label="Semana anterior">${ic('back')}</button>
    <div class="grow center"><div class="bold">Semana ${w}${prog.weeks ? ' de ' + prog.weeks : ''}${ph ? ' · ' + esc(ph.nome) : ''}</div><div class="muted small">${U.dm(mon)} – ${U.dm(U.addDays(mon, 6))}${w === cw ? ' · atual' : ''}</div></div>
    <button type="button" class="iconbtn" data-a="wk" data-d="1" ${w >= maxW ? 'disabled' : ''} aria-label="Próxima semana">${ic('fwd')}</button></div>
  ${w !== cw ? `<div class="center" style="margin:-4px 0 10px"><button type="button" class="linkbtn" data-a="wk" data-d="0">Voltar para a semana atual</button></div>` : ''}`;
  out += prog.treinos.length ? prog.treinos.map(t => V.wcard(p, prog, t, w)).join('') : `<div class="empty">Este programa ainda não tem treinos. <a href="#/programa/${prog.id}">Adicionar treinos</a></div>`;
  out += `<a class="wcard" href="#/checkin/${U.iso(mon)}">${UI.letter('', 'var(--surface2)')}<div class="grow"><div class="t">Check-in da semana</div><div class="s">${ck && ck.weight ? `Peso ${fmt(num(ck.weight))} kg` : 'Peso, medidas, sono e energia'}</div></div><span class="status-ic ${ck ? 'done' : ''}">${ck ? ic('check') : ic('chev')}</span></a>`;
  out += `<div class="row" style="gap:10px;margin:4px 0 6px"><button type="button" class="btn ghost grow sm" data-a="free" data-date="${U.iso(w === cw ? t0 : mon)}">${ic('plus')} Treino livre</button><button type="button" class="btn ghost grow sm" data-a="activity" data-date="${U.iso(w === cw ? t0 : mon)}">${ic('walk')} Atividade</button></div>`;
  out += `<h2 class="section-title">Resumo da semana</h2><div class="tiles">
    <div class="tile"><div class="v num">${ws.done}<small>/ ${ws.total}</small></div><div class="k">Treinos do programa</div></div>
    <div class="tile"><div class="v num">${U.hm(a.minutes)}</div><div class="k">Tempo ativo total</div></div>
    <div class="tile"><div class="v num">${fmt(a.aerobic, 0)}<small>min</small></div><div class="k">Aeróbico (meta ${T12.S.settings.goal})</div></div>
    <div class="tile"><div class="v num">${fmt(a.flex, 0)}<small>min</small></div><div class="k">Flexibilidade</div></div>
    <div class="tile"><div class="v num">${a.rpe == null ? '—' : fmt(a.rpe, 1)}</div><div class="k">Esforço médio (1–10)</div></div>
    <div class="tile"><div class="v num">${fmt(a.vol, 0)}<small>kg</small></div><div class="k">Volume (carga × reps)</div></div></div>`;
  return out;
};
V.historico = function (p) {
  const items = [];
  p.sessions.forEach(s => { if (M.hasData(s)) items.push({ d: s.date, k: 's', o: s }); });
  p.activities.forEach(a => items.push({ d: a.date, k: 'a', o: a }));
  p.checkins.forEach(c => items.push({ d: c.date, k: 'c', o: c }));
  items.sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
  if (!items.length) return `<div class="empty">${ic('history', 'width="36" height="36"')}<br>Seu histórico aparece aqui: treinos, atividades e check-ins, para sempre.</div>`;
  const lim = T12.ui.histLimit || 60; let out = '', lastM = '';
  items.slice(0, lim).forEach(it => {
    const d = U.parseISO(it.d), mk = it.d.slice(0, 7);
    if (mk !== lastM) { lastM = mk; const ma = M.aggregate(p, mk + '-01', mk + '-31'); out += `${out ? '</div>' : ''}<h2 class="section-title row between"><span>${U.MESES_LONGOS[d.getMonth()]} ${d.getFullYear()}</span><span class="muted" style="text-transform:none;letter-spacing:0">${ma.sessions} treinos · ${U.hm(ma.minutes)}</span></h2><div class="list">`; }
    const when = `${U.DIAS_ABREV[d.getDay()]}, ${U.dm(d)}`;
    if (it.k === 's') { const s = it.o, st = M.sessionStatus(s), b = M.breakdown(s);
      out += `<a class="li" href="#/sessao/${s.id}">${UI.letter(s.short || '+', T12.TREINO_COLORS[(s.color || 0) % 7], 'sm')}<div class="grow"><div class="t">${esc(s.name)}</div><div class="s">${when} · ${U.hm(b.total)}${b.vol ? ' · ' + fmt(b.vol / 1000, 1) + ' t' : ''}${b.cardio ? ' · cardio ' + fmt(b.cardio, 0) + ' min' : ''}</div></div>${st === 'partial' ? '<span class="pill warn">parcial</span>' : ''}${ic('chev', 'class="chev"')}</a>`; }
    else if (it.k === 'a') { const a = it.o;
      out += `<button type="button" class="li" data-a="activity" data-id="${a.id}"><span class="ic">${ic('walk')}</span><div class="grow"><div class="t">${esc(a.type)}</div><div class="s">${when} · ${fmt(num(a.mins), 0)} min${num(a.km) ? ' · ' + fmt(num(a.km)) + ' km' : ''}</div></div>${ic('chev', 'class="chev"')}</button>`; }
    else { const c = it.o;
      out += `<a class="li" href="#/checkin/${U.iso(U.mondayOf(d))}"><span class="ic">${ic('scale')}</span><div class="grow"><div class="t">Check-in</div><div class="s">${when}${c.weight ? ' · ' + fmt(num(c.weight)) + ' kg' : ''}${c.waist ? ' · cintura ' + fmt(num(c.waist)) + ' cm' : ''}</div></div>${ic('chev', 'class="chev"')}</a>`; }
  });
  out += '</div>';
  if (items.length > lim) out += `<button type="button" class="btn ghost block" data-a="histmore" style="margin-top:6px">Mostrar mais (${items.length - lim})</button>`;
  return out;
};

/* ---------- SESSÃO ---------- */
V.sessao = function (p, s) {
  if (!s) return `<main class="screen"><div class="empty">Treino não encontrado.<br><br><a href="#/hoje">Voltar ao início</a></div></main>`;
  const prog = s.programId ? M.prog(p, s.programId) : null, t = prog && prog.treinos.find(x => x.id === s.treinoId);
  M.syncSession(s, t);
  const done = s.ex.filter(e => M.entryStatus(e) === 'done').length;
  const w = prog ? M.programWeek(prog, U.parseISO(s.date)) : null;
  const d = U.parseISO(s.date);
  const sub = `<button type="button" class="datebtn" data-a="sdate" aria-label="Alterar data do treino">${U.DIAS_ABREV[d.getDay()]}, ${U.dm(d)}${w && w >= 1 ? ` · sem. ${w}` : ''} ${ic('edit', 'width="13" height="13"')}</button> <span id="elapsed" class="num"></span>`;
  let out = `<main class="screen no-nav">${UI.subbar(esc(s.name) + (s.foco ? ' · ' + esc(s.foco) : ''), sub, `<button type="button" class="iconbtn" data-a="smenu" aria-label="Opções do treino">${ic('dots')}</button>`)}
    <div class="row" style="margin:0 4px 14px;gap:10px"><div class="bar grow" role="progressbar" aria-valuemin="0" aria-valuemax="${s.ex.length}" aria-valuenow="${done}" aria-label="Exercícios concluídos"><i id="prog" style="width:${s.ex.length ? done / s.ex.length * 100 : 0}%"></i></div><span class="small muted num" id="progtxt">${done}/${s.ex.length}</span></div>`;
  if (!s.ex.length) out += `<div class="empty">Treino livre: adicione os exercícios que vai fazer.</div>`;
  const bests = M.bests(p, s);
  out += s.ex.map((e, i) => V.entryCard(p, s, e, i, bests)).join('');
  out += `<button type="button" class="btn ghost block" data-a="addentry" style="margin-bottom:12px">${ic('plus')} Adicionar exercício</button>`;
  out += `<div class="card"><label class="field" style="margin:0"><span>Observação geral do treino</span><textarea class="input" data-f="snotes" data-s="${s.id}" placeholder="Como se sentiu, ajustes, equipamento ocupado…">${esc(s.notes || '')}</textarea></label></div>`;
  out += `<p class="tiny faint center" style="margin:10px 20px">Interrompa diante de dor no peito, tontura, falta de ar desproporcional ou dor aguda.</p></main>
    <div class="dock"><div class="dock-in"><button type="button" class="btn primary block" data-a="finish">${ic('check')} ${s.finishedAt ? 'Salvar alterações' : 'Finalizar treino'}</button></div></div>`;
  return out;
};
V.entryCard = function (p, s, e, i, bests) {
  const st = M.entryStatus(e), prev = M.prevEntry(p, e.key, s), open = T12.ui.open[e.id];
  const D = `data-s="${s.id}" data-i="${e.id}"`;
  let body = '', hint = '';
  const best = bests && bests[e.key];
  if (e.type === 'forca' || e.type === 'tempo') {
    const ps = prev ? prev.e.rows.filter(r => r.ok) : [];
    if (prev && M.readyToProgress(prev.e)) hint = `<div class="hint up">${ic('trophy', 'width="16" height="16"')} Em ${U.dm(U.parseISO(prev.s.date))} você bateu o topo da faixa. Suba um pouco a ${e.type === 'tempo' ? 'carga ou o tempo' : 'carga'}!</div>`;
    else if (prev) hint = `<div class="hint info">Última vez (${U.dm(U.parseISO(prev.s.date))}): ${ps.map(x => `${x.kg !== '' ? fmt(num(x.kg)) + 'kg×' : ''}${esc(x.r)}${e.type === 'tempo' ? 's' : ''}`).join(' · ')}</div>`;
    body = `<table class="sets"><caption class="sr">Séries de ${esc(e.name)}</caption><thead><tr><th scope="col">Série</th><th scope="col">Anterior</th><th scope="col">kg</th><th scope="col">${e.type === 'tempo' ? 'Seg' : 'Reps'}</th><th scope="col"><span class="sr">Concluída</span>✓</th></tr></thead><tbody>
      ${e.rows.map((r, k) => { const pv = ps[k] || ps[ps.length - 1];
        return `<tr class="${r.ok ? 'ok' : ''}"><td>${k + 1}</td><td class="prev">${pv ? `${pv.kg !== '' ? fmt(num(pv.kg)) + '×' : ''}${esc(pv.r)}` : '—'}</td>
        <td><input class="inp" inputmode="decimal" enterkeyhint="next" ${D} data-f="kg" data-k="${k}" value="${esc(r.kg)}" placeholder="${pv && pv.kg !== '' ? esc(fmt(num(pv.kg))) : (e.type === 'tempo' ? '—' : 'kg')}" aria-label="Carga em kg, série ${k + 1}"></td>
        <td><input class="inp" inputmode="numeric" enterkeyhint="done" ${D} data-f="r" data-k="${k}" value="${esc(r.r)}" placeholder="${pv ? esc(pv.r) : (e.repMin ? (e.repMin === e.repMax ? e.repMin : e.repMin + '–' + e.repMax) : '')}" aria-label="${e.type === 'tempo' ? 'Segundos' : 'Repetições'}, série ${k + 1}"></td>
        <td><button type="button" class="check ${r.ok ? 'on' : ''}" data-a="set" ${D} data-k="${k}" aria-pressed="${r.ok}" aria-label="Concluir série ${k + 1}">${ic('check')}</button></td></tr>`; }).join('')}
      </tbody></table>
      <div class="ex-foot"><button type="button" class="btn sm ghost" data-a="addset" ${D}>${ic('plus')} Série</button>${e.rows.length > 1 ? `<button type="button" class="btn sm ghost" data-a="delset" ${D}>${ic('minus')} Série</button>` : ''}
      <span class="grow"></span><button type="button" class="linkbtn" data-a="more" data-i="${e.id}" aria-expanded="${!!open}">${open ? 'Fechar' : 'Esforço, dor e notas'}${(e.rpe != null || e.notes) && !open ? ' •' : ''}</button></div>`;
  } else if (e.type === 'cardio') {
    if (prev) hint = `<div class="hint info">Última vez (${U.dm(U.parseISO(prev.s.date))}): ${fmt(num(prev.e.mins), 0)} min · ${esc(prev.e.mod || '')}${num(prev.e.km) ? ' · ' + fmt(num(prev.e.km)) + ' km' : ''}</div>`;
    body = `<div class="pad"><span class="flabel">Minutos</span>
      <div class="stepper"><button type="button" data-a="step" ${D} data-d="-5" aria-label="Menos 5 minutos">−</button><input class="inp" inputmode="numeric" ${D} data-f="mins" value="${esc(e.mins)}" placeholder="${e.target || ''}" aria-label="Minutos de cardio"><button type="button" data-a="step" ${D} data-d="5" aria-label="Mais 5 minutos">+</button></div>
      <div class="chips" style="margin-top:10px">${[10, 15, 20, 25, 30, 45, 60].map(m => `<button type="button" class="chip ${num(e.mins) === m ? 'on' : ''}" data-a="setmin" ${D} data-m="${m}">${m} min</button>`).join('')}</div>
      <label class="field" style="margin:6px 0 0"><span>Modalidade</span><select class="input" ${D} data-f="mod">${T12.MODALIDADES.map(m => `<option ${m === e.mod ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="field" style="margin:10px 0 0"><span>Distância (km, opcional)</span><input class="input" inputmode="decimal" ${D} data-f="km" value="${esc(e.km)}" placeholder="Ex.: 5,2"></label>
      <span class="flabel" style="margin-top:14px">Esforço (1 leve – 10 máximo)</span>${UI.scale(D, 'rpe', e.rpe, 1, 10, '', 'Esforço')}
      <div class="row" style="margin-top:8px"><span class="grow"></span><button type="button" class="linkbtn" data-a="more" data-i="${e.id}" aria-expanded="${!!open}">${open ? 'Fechar' : 'Dor e notas'}</button></div></div>`;
  } else {
    body = `<div class="pad"><div class="setdots">${e.rows.map((r, k) => `<button type="button" class="setdot ${r.ok ? 'on' : ''}" data-a="set" ${D} data-k="${k}" aria-pressed="${r.ok}">${r.ok ? ic('check') : ''} Série ${k + 1}</button>`).join('')}</div>
      <div class="grid2" style="margin-top:12px;align-items:end"><label class="field" style="margin:0"><span>Minutos</span><input class="inp wide" inputmode="numeric" ${D} data-f="mins" value="${esc(e.mins)}" placeholder="${e.target || ''}"></label>
      <div><span class="flabel">Como sentiu</span><div class="seg" role="radiogroup" aria-label="Como sentiu">${['Rígido', 'Normal', 'Solto'].map(f => `<button type="button" role="radio" aria-checked="${e.feel === f}" data-a="feel" ${D} data-v="${f}" class="${e.feel === f ? 'on' : ''}">${f}</button>`).join('')}</div></div></div>
      <div class="row" style="margin-top:8px"><span class="grow"></span><button type="button" class="linkbtn" data-a="more" data-i="${e.id}" aria-expanded="${!!open}">${open ? 'Fechar' : 'Dor e notas'}</button></div></div>`;
  }
  const more = open ? `<div class="ex-more">${e.type === 'cardio' ? '' : `<span class="flabel">Esforço percebido (1 leve – 10 máximo)</span>${UI.scale(D, 'rpe', e.rpe, 1, 10, '', 'Esforço')}`}
      <span class="flabel">Dor / desconforto (0 nenhuma – 10 forte)</span>${UI.scale(D, 'pain', e.pain, 0, 10, 'pain', 'Dor')}
      <label class="field" style="margin-top:10px"><span>Observações / técnica</span><textarea class="input" ${D} data-f="notes" placeholder="Ajuste de banco, pegada, técnica…">${esc(e.notes || '')}</textarea></label>
      <button type="button" class="linkbtn danger-text" data-a="delentry" ${D}>${ic('trash', 'width="14" height="14"')} Remover deste treino</button></div>` : '';
  return `<section class="ex ${st}" id="ex-${e.id}" aria-label="${esc(e.name)}"><div class="ex-h"><span class="ex-idx">${st === 'done' ? ic('check', 'width="16" height="16"') : i + 1}</span>
    <div class="grow"><h3 class="n">${esc(e.name)}</h3><div class="p"><span class="pill">${esc(e.cat)}</span><span>${esc(e.presc)}</span>${best ? `<span class="faint">· recorde ${fmt(best.kg)} kg</span>` : ''}</div></div>
    <div class="ex-actions"><a class="iconbtn" href="${esc(M.videoUrl(e))}" target="_blank" rel="noopener noreferrer" aria-label="Ver vídeo de execução de ${esc(e.name)} (abre o YouTube)">${ic('play')}</a></div></div>
    ${hint}${body}${more}</section>`;
};

/* ---------- CHECK-IN ---------- */
V.checkin = function (p, mondayIso) {
  const mon = U.mondayOf(U.parseISO(mondayIso)), c = M.checkinOfWeek(p, mon) || {};
  const prevC = p.checkins.filter(x => x.date < U.iso(mon) && x.weight).sort((a, b) => a.date < b.date ? 1 : -1)[0];
  const D = `data-mon="${U.iso(mon)}"`;
  const f = (k, label, unit, ph, mode) => `<label class="field"><span>${label}${unit ? ` <span class="faint">(${unit})</span>` : ''}</span><input class="input" inputmode="${mode || 'decimal'}" ${D} data-f="ck" data-k="${k}" value="${esc(c[k] || '')}" placeholder="${esc(ph || '')}"></label>`;
  const wa = M.aggregate(p, U.iso(mon), U.iso(U.addDays(mon, 6)));
  return `<main class="screen no-nav">${UI.subbar(`Check-in da semana`, `${U.dm(mon)} – ${U.dm(U.addDays(mon, 6))}`)}
    <p class="muted small" style="margin:0 4px 14px">Preencha só o que for medir — cada campo é opcional.</p>
    <div class="card"><h2>Corpo</h2><div class="grid2">${f('weight', 'Peso', 'kg', prevC ? fmt(num(prevC.weight)) : '')}${f('waist', 'Cintura', 'cm', prevC && prevC.waist ? fmt(num(prevC.waist)) : '')}</div>
      <div class="grid2">${f('muscle', 'Massa muscular*', 'kg')}${f('fat', 'Gordura corporal*', '%')}</div>
      <p class="tiny faint" style="margin:0">* Só se repetir a bioimpedância (ex.: InBody).</p></div>
    <div class="card"><h2>Rotina</h2>${f('sleep', 'Sono médio', 'h', '7')}
      <span class="flabel">Energia na semana</span><div class="seg" role="radiogroup" aria-label="Energia">${['Baixa', 'Ok', 'Boa', 'Ótima'].map(v => `<button type="button" role="radio" aria-checked="${c.energy === v}" data-a="energy" ${D} data-v="${v}" class="${c.energy === v ? 'on' : ''}">${v}</button>`).join('')}</div>
      <label class="field" style="margin-top:12px"><span>Notas da semana</span><textarea class="input" ${D} data-f="ck" data-k="notes" placeholder="Como foi a semana?">${esc(c.notes || '')}</textarea></label></div>
    <div class="card row between"><div><div class="bold">Atividades da semana</div><div class="small muted">${fmt(wa.act, 0)} min registrados (caminhadas, esportes…)</div></div><button type="button" class="btn sm ghost" data-a="activity" data-date="${U.iso(U.diffDays(mon, U.today()) < 7 && U.diffDays(mon, U.today()) >= 0 ? U.today() : U.addDays(mon, 5))}">${ic('plus')} Adicionar</button></div>
    ${c.id ? `<button type="button" class="linkbtn danger-text" data-a="delcheckin" ${D}>Excluir este check-in</button>` : ''}</main>
    <div class="dock"><div class="dock-in"><button type="button" class="btn primary block" data-a="back">${ic('check')} Salvar</button></div></div>`;
};
})(window);
