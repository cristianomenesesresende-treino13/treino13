/* Treino 12 — telas: Progresso (períodos), Mais, Programas, Editor de programa, Meus dados, Privacidade, Ajuda. */
(function (root) {
'use strict';
const T12 = root.T12, U = T12.U, M = T12.M, UI = T12.UI, ic = T12.ic, Ch = T12.Ch;
const V = T12.V;
const esc = U.esc, num = U.num, fmt = U.fmt;
const KINDS = [['semana', 'Semana'], ['mes', 'Mês'], ['semestre', 'Semestre'], ['ano', 'Ano'], ['tudo', 'Tudo']];
const C_FORCA = 'var(--tA)', C_CARDIO = 'var(--tB)', C_FLEX = 'var(--tC)', C_ACT = 'var(--tD)';

/* ---------- PROGRESSO ---------- */
V.progresso = function (p) {
  const ui = T12.ui, t0 = U.today(), kind = ui.period || 'mes';
  const anchor = ui.anchor || U.iso(t0);
  const per = M.period(kind, anchor, p, t0);
  const cur = M.aggregate(p, per.from, per.to);
  const prv = per.prevFrom ? M.aggregate(p, per.prevFrom, per.prevTo) : null;
  const ser = M.series(p, per.buckets);
  const goal = T12.S.settings.goal;
  const gw = kind !== 'semana' ? M.goalWeeks(p, per.from, per.to, goal, t0) : null;
  const unitLbl = { semana: 'dia', mes: 'dia', semestre: 'mês', ano: 'mês', tudo: 'ano' }[kind];
  const titles = per.buckets.map(b => b.from === b.to ? U.dmy(U.parseISO(b.from)) : (kind === 'tudo' ? b.from.slice(0, 4) : U.MESES_LONGOS[U.parseISO(b.from).getMonth()] + ' ' + b.from.slice(0, 4)));
  const curIdx = per.buckets.findIndex(b => U.iso(t0) >= b.from && U.iso(t0) <= b.to);
  let out = `<main class="screen">${V.top(p, 'Progresso', esc(p.name))}
  <div class="seg big" role="tablist" aria-label="Período">${KINDS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === kind}" data-a="period" data-v="${k}" class="${k === kind ? 'on' : ''}">${l}</button>`).join('')}</div>
  <div class="weeknav">${per.prev ? `<button type="button" class="iconbtn" data-a="anchor" data-v="${per.prev}" aria-label="Período anterior">${ic('back')}</button>` : '<span class="iconbtn"></span>'}
    <div class="grow center"><div class="bold cap">${esc(per.label)}</div>${kind !== 'tudo' && !(U.iso(t0) >= per.from && U.iso(t0) <= per.to) ? `<button type="button" class="linkbtn" data-a="anchor" data-v="${U.iso(t0)}">Ir para o atual</button>` : `<div class="muted small">${kind === 'tudo' ? 'acumulado da vida toda' : 'período atual'}</div>`}</div>
    ${per.hasNext ? `<button type="button" class="iconbtn" data-a="anchor" data-v="${per.next}" aria-label="Próximo período">${ic('fwd')}</button>` : '<span class="iconbtn"></span>'}</div>`;

  out += `<div class="tiles">
    <div class="tile"><div class="v num">${cur.sessions}</div><div class="k">Treinos ${cur.partial ? `<span class="faint">(${cur.partial} parciais)</span>` : ''}</div>${prv ? UI.delta(cur.sessions, prv.sessions) : ''}</div>
    <div class="tile"><div class="v num">${U.hm(cur.minutes)}</div><div class="k">Tempo ativo total</div>${prv ? UI.delta(cur.minutes, prv.minutes) : ''}</div>
    <div class="tile"><div class="v num">${fmt(cur.aerobic, 0)}<small>min</small></div><div class="k">Aeróbico (cardio + atividades)</div>${prv ? UI.delta(cur.aerobic, prv.aerobic) : ''}</div>
    <div class="tile"><div class="v num">${fmt(cur.flex, 0)}<small>min</small></div><div class="k">Flexibilidade</div>${prv ? UI.delta(cur.flex, prv.flex) : ''}</div>
    <div class="tile"><div class="v num">${cur.vol >= 1000 ? fmt(cur.vol / 1000, 1) + '<small>t</small>' : fmt(cur.vol, 0) + '<small>kg</small>'}</div><div class="k">Volume de carga</div>${prv ? UI.delta(cur.vol, prv.vol) : ''}</div>
    <div class="tile"><div class="v num">${cur.days}<small>dias</small></div><div class="k">Dias ativos${cur.km ? ` · ${fmt(cur.km)} km` : ''}</div>${prv ? UI.delta(cur.days, prv.days) : ''}</div></div>`;
  if (prv) out += `<p class="tiny faint" style="margin:-4px 4px 12px">▲▼ comparação com ${per.running ? 'o mesmo ponto do período anterior' : 'o período anterior'}.</p>`;

  if (kind === 'semana') out += `<section class="card row" style="gap:14px">${Ch.ring(cur.aerobic / goal, fmt(cur.aerobic, 0), `de ${goal} min`)}<div><div class="bold">Meta aeróbica da semana</div><div class="small muted">${cur.aerobic >= goal ? 'Meta batida! ' : `Faltam ${fmt(goal - cur.aerobic, 0)} min. `}A recomendação geral é 150 min/semana de atividade moderada. Ajuste em Mais → Meta semanal.</div></div></section>`;
  else if (gw && gw.total) out += `<section class="card"><div class="row between"><h2 style="margin:0">Semanas na meta aeróbica</h2><span class="pill ${gw.met / gw.total >= .5 ? 'ok' : ''}">${gw.met} de ${gw.total}</span></div><div class="bar" style="margin-top:10px" aria-hidden="true"><i style="width:${gw.met / gw.total * 100}%"></i></div><div class="tiny faint" style="margin-top:6px">Meta: ${goal} min por semana de cardio + atividades.</div></section>`;

  out += `<section class="card"><h2>Minutos por ${unitLbl}</h2>${Ch.bars({ labels: per.buckets.map(b => b.label), titles, unit: 'min', hi: curIdx, aria: `Minutos de treino por ${unitLbl}`,
      series: [{ name: 'Força', values: ser.map(a => a.forca), color: C_FORCA }, { name: 'Cardio', values: ser.map(a => a.cardio), color: C_CARDIO }, { name: 'Flexibilidade', values: ser.map(a => a.flex), color: C_FLEX }, { name: 'Atividades', values: ser.map(a => a.act), color: C_ACT }] })}
    ${Ch.legend([[C_FORCA, 'Força'], [C_CARDIO, 'Cardio'], [C_FLEX, 'Flexibilidade'], [C_ACT, 'Atividades']])}</section>`;
  out += `<section class="card"><h2>Treinos por ${unitLbl}</h2>${Ch.bars({ labels: per.buckets.map(b => b.label), titles, hi: curIdx, int: true, aria: `Treinos por ${unitLbl}`,
      series: [{ name: 'Concluídos', values: ser.map(a => a.done), color: 'var(--accent)' }, { name: 'Parciais', values: ser.map(a => a.partial), color: 'var(--warn)' }] })}
    ${Ch.legend([['var(--accent)', 'Concluídos'], ['var(--warn)', 'Parciais']])}</section>`;
  if (kind === 'ano') { const y = U.parseISO(per.from).getFullYear(); out += `<section class="card"><h2>Dias com treino em ${y}</h2><div class="scrollx heatwrap" tabindex="0" role="region" aria-label="Mapa de dias com treino (role para o lado)">${Ch.heatmap(y, M.dayMinutes(p, per.from, per.to), t0)}</div><div class="legend"><span>Menos</span>${[0, 1, 2, 3, 4].map(l => `<i class="hm${l}" style="width:10px;height:10px;border-radius:2px;display:inline-block"></i>`).join('')}<span>Mais</span></div></section>`; }

  // progressão de carga
  const exs = M.exerciseList(p);
  if (exs.length) {
    if (!ui.exKey || !exs.find(x => x.key === ui.exKey)) ui.exKey = exs[0].key;
    const ls = M.loadSeries(p, ui.exKey, per.buckets), fl = ls.vals.filter(v => v != null);
    const gain = fl.length > 1 ? fl[fl.length - 1] - fl[0] : null;
    out += `<section class="card"><div class="row between"><h2 style="margin:0">Progressão de carga</h2>${gain != null ? `<span class="pill ${gain > 0 ? 'ok' : ''}">${gain > 0 ? '+' : ''}${fmt(gain)} ${ls.unit}</span>` : ''}</div>
      <label class="sr" for="exsel">Exercício</label><select class="input" id="exsel" data-a="exkey" style="margin:10px 0 6px">${exs.map(x => `<option value="${esc(x.key)}" ${x.key === ui.exKey ? 'selected' : ''}>${esc(x.name)} (${x.n})</option>`).join('')}</select>
      ${Ch.line({ labels: per.buckets.map(b => b.label), titles, values: ls.vals, color: C_FORCA, unit: ls.unit, empty: 'Sem registros deste exercício no período.', aria: 'Progressão de carga' })}
      <div class="tiny faint">Maior carga das séries concluídas em cada ${unitLbl}.</div></section>`;
    const gains = M.gains(p, per.from, per.to).slice(0, 5);
    if (gains.length) out += `<section class="card"><h2>Maiores ganhos de força no período</h2>${gains.map(x => `<div class="row gainrow">${UI.letter(x.short || '+', T12.TREINO_COLORS[(x.color || 0) % 7], 'xs')}<div class="grow small bold">${esc(x.name)}</div><div class="num small"><span class="muted">${fmt(x.first)} →</span> <b>${fmt(x.best)} kg</b></div><span class="pill ok">+${fmt(x.pct, 0)}%</span></div>`).join('')}</section>`;
  } else out += `<section class="card"><h2>Progressão de carga</h2><div class="empty">Conclua séries com carga para ver a evolução.</div></section>`;

  // corpo
  const wv = M.checkinSeries(p, 'weight', per.buckets), wf = wv.filter(v => v != null);
  out += `<section class="card"><div class="row between"><h2 style="margin:0">Peso corporal</h2>${wf.length > 1 ? `<span class="pill">${wf[wf.length - 1] - wf[0] > 0 ? '+' : ''}${fmt(wf[wf.length - 1] - wf[0])} kg</span>` : ''}</div><div style="margin-top:10px">${Ch.line({ labels: per.buckets.map(b => b.label), titles, values: wv, color: 'var(--accent-text)', unit: 'kg', empty: 'Registre o peso no check-in semanal.', aria: 'Peso corporal' })}</div></section>`;
  const cv = M.checkinSeries(p, 'waist', per.buckets);
  if (cv.some(v => v != null)) out += `<section class="card"><h2>Cintura (cm)</h2>${Ch.line({ labels: per.buckets.map(b => b.label), titles, values: cv, color: C_ACT, unit: 'cm', aria: 'Medida da cintura' })}</section>`;

  if (kind === 'tudo') {
    const yrs = M.byYear(p, t0), dec = M.byDecade(yrs), f = M.firstDate(p), tot = M.aggregate(p, '0000-01-01', '9999-12-31');
    out += `<section class="card"><h2>Acumulado da vida toda</h2>${f ? `<p class="small muted" style="margin:0 0 10px">Desde ${U.dmyLong(U.parseISO(f))}</p>` : ''}
      <div class="tiles three" style="margin:0"><div class="tile flat"><div class="v num">${tot.sessions}</div><div class="k">treinos</div></div><div class="tile flat"><div class="v num">${fmt(tot.minutes / 60, 0)}<small>h</small></div><div class="k">em movimento</div></div><div class="tile flat"><div class="v num">${fmt(tot.vol / 1000, 0)}<small>t</small></div><div class="k">levantadas</div></div></div></section>`;
    if (yrs.length) out += `<section class="card"><h2>Por ano</h2><div class="scrollx" tabindex="0" role="region" aria-label="Tabela por ano"><table class="tbl"><thead><tr><th scope="col">Ano</th><th scope="col">Treinos</th><th scope="col">Horas</th><th scope="col">Aeróbico</th><th scope="col">Volume</th><th scope="col">Dias</th></tr></thead><tbody>
      ${yrs.slice().reverse().map(r => `<tr><td><button type="button" class="tlink" data-a="goyear" data-v="${r.year}">${r.year}</button></td><td>${r.sessions}</td><td>${fmt(r.minutes / 60, 0)}</td><td>${fmt(r.aerobic / 60, 0)} h</td><td>${fmt(r.vol / 1000, 1)} t</td><td>${r.days}</td></tr>`).join('')}</tbody></table></div></section>`;
    if (dec.length) out += `<section class="card"><h2>Por década</h2>${dec.map(d => `<div class="row between gainrow"><b>Anos ${d.decade}</b><span class="small num">${d.sessions} treinos · ${fmt(d.minutes / 60, 0)} h · ${fmt(d.vol / 1000, 0)} t</span></div>`).join('')}</section>`;
    const b = M.bests(p), recs = Object.values(b).sort((x, y) => x.date < y.date ? 1 : -1).slice(0, 10);
    if (recs.length) out += `<section class="card"><h2>Recordes pessoais</h2>${recs.map(r => `<div class="row gainrow"><span class="grow small bold">${esc(r.name)}</span><span class="small muted">${U.dmy(U.parseISO(r.date))}</span><b class="num">${fmt(r.kg)} kg</b></div>`).join('')}</section>`;
  }
  return out + '</main>';
};

/* ---------- MAIS ---------- */
const li = (a, icon, t, s, extra, href) => {
  const tag = href ? `a href="${href}"` : `button type="button" data-a="${a}"`;
  return `<${tag} class="li"><span class="ic">${ic(icon)}</span><div class="grow"><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}</div>${extra || ic('chev', 'class="chev"')}</${href ? 'a' : 'button'}>`;
};
V.mais = function (p) {
  const st = T12.S.settings, prog = M.activeProgram(p);
  return `<main class="screen"><header class="topbar"><div><h1>Mais</h1><div class="sub">Pessoas, programas, dados e ajustes</div></div></header>
  <div class="card row" style="gap:14px">${UI.avatar(p, 'lg')}<div class="grow"><div class="bold" style="font-size:20px">${esc(p.name)}</div><div class="muted small">${p.sessions.filter(M.hasData).length} treinos registrados${p.minor ? ' · menor de idade' : ''}</div></div><button type="button" class="btn sm ghost" data-a="editprof">Editar</button></div>
  <h2 class="section-title">Pessoas neste aparelho</h2><div class="list">
    ${T12.S.profiles.map(x => `<button type="button" class="li" data-a="switch" data-id="${x.id}">${UI.avatar(x)}<div class="grow"><div class="t">${esc(x.name)}</div><div class="s">${x.sessions.filter(M.hasData).length} treinos</div></div>${x.id === p.id ? '<span class="pill accent">Ativo</span>' : ic('chev', 'class="chev"')}</button>`).join('')}
    ${li('', 'plus', 'Adicionar pessoa', 'Cada familiar com seus próprios registros', '', '#/novo')}</div>
  <h2 class="section-title">Treino</h2><div class="list">
    ${li('', 'layers', 'Programas de treino', prog ? `Ativo: ${esc(prog.name)}` : 'Nenhum ativo', '', '#/programas')}
    <div class="li"><span class="ic">${ic('timer')}</span><div class="grow"><div class="t" id="lbl-rest">Descanso entre séries</div><div class="seg" style="margin-top:8px" role="radiogroup" aria-labelledby="lbl-rest">${[60, 90, 120, 180, 0].map(s => `<button type="button" role="radio" aria-checked="${st.rest === s}" data-a="restset" data-v="${s}" class="${st.rest === s ? 'on' : ''}">${!s ? 'Off' : s < 120 ? s + 's' : s / 60 + ' min'}</button>`).join('')}</div></div></div>
    <div class="li"><span class="ic">${ic('flame')}</span><div class="grow"><div class="t" id="lbl-goal">Meta aeróbica semanal</div><div class="seg" style="margin-top:8px" role="radiogroup" aria-labelledby="lbl-goal">${[90, 150, 225, 300].map(s => `<button type="button" role="radio" aria-checked="${st.goal === s}" data-a="goal" data-v="${s}" class="${st.goal === s ? 'on' : ''}">${s} min</button>`).join('')}</div></div></div>
    <button type="button" class="li" data-a="sound" aria-pressed="${st.sound}"><span class="ic">${ic('bell')}</span><div class="grow"><div class="t">Som e vibração no fim do descanso</div></div><span class="pill ${st.sound ? 'ok' : ''}">${st.sound ? 'Ligado' : 'Desligado'}</span></button></div>
  <h2 class="section-title">Aparência</h2><div class="list"><div class="li"><span class="ic">${ic('moon')}</span><div class="grow"><div class="seg" role="radiogroup" aria-label="Tema">${[['auto', 'Automático'], ['dark', 'Escuro'], ['light', 'Claro']].map(([v, l]) => `<button type="button" role="radio" aria-checked="${st.theme === v}" data-a="theme" data-v="${v}" class="${st.theme === v ? 'on' : ''}">${l}</button>`).join('')}</div></div></div></div>
  <h2 class="section-title">Dados e privacidade</h2><div class="list">
    ${li('backup', 'download', 'Fazer backup', st.lastBackup ? 'Último: ' + U.dmy(new Date(st.lastBackup)) : 'Nunca feito — recomendado toda semana')}
    ${li('', 'database', 'Meus dados', 'Restaurar, exportar, armazenamento e exclusão', '', '#/dados')}
    ${li('', 'shield', 'Privacidade e LGPD', 'Como seus dados são tratados', '', '#/privacidade')}</div>
  <h2 class="section-title">Ajuda</h2><div class="list">
    ${li('', 'info', 'Como usar', 'Treinos, progressão, períodos e segurança', '', '#/ajuda')}
    ${li('install', 'phone', 'Instalar na tela inicial', UI.isStandalone() ? 'Já instalado neste aparelho' : 'Android e iPhone')}
    ${li('about', 'heart', 'Sobre o Treino 12', 'Versão ' + T12.VERSION)}</div></main>`;
};

/* ---------- PROGRAMAS ---------- */
V.programas = function (p) {
  const t0 = U.today(), act = M.activeProgram(p);
  const card = g => {
    const ns = p.sessions.filter(s => s.programId === g.id && M.hasData(s)).length, st = M.programState(g, t0), w = M.programWeek(g, t0);
    const status = g.id === act?.id ? (st === 'future' ? 'Começa ' + U.dm(U.parseISO(g.start)) : st === 'done' ? 'Concluído' : `Semana ${w}${g.weeks ? ' de ' + g.weeks : ''}`) : (g.archivedAt ? 'Encerrado em ' + U.dmy(U.parseISO(g.archivedAt)) : 'Inativo');
    return `<section class="card ${g.id === act?.id ? 'activecard' : ''}"><div class="row between"><div class="grow"><div class="bold">${esc(g.name)}</div><div class="small muted">${g.weeks ? g.weeks + ' semanas' : 'Contínuo'} · início ${U.dmy(U.parseISO(g.start))} · ${g.treinos.length} treinos · ${ns} sessões</div></div>${g.id === act?.id ? '<span class="pill accent">Ativo</span>' : ''}</div>
      <div class="small" style="margin:8px 0 10px">${status}</div>
      <div class="row wrap" style="gap:8px"><a class="btn sm ghost" href="#/programa/${g.id}">${ic('edit')} Editar treinos</a>${g.id !== act?.id ? `<button type="button" class="btn sm ghost" data-a="prog-activate" data-id="${g.id}">Ativar</button>` : ''}<button type="button" class="btn sm ghost" data-a="prog-dup" data-id="${g.id}">Duplicar</button>${g.id !== act?.id ? `<button type="button" class="btn sm ghost danger-text" data-a="prog-del" data-id="${g.id}" aria-label="Excluir programa ${esc(g.name)}">${ic('trash')}</button>` : ''}</div></section>`;
  };
  const others = p.programs.filter(g => g !== act).sort((a, b) => a.start < b.start ? 1 : -1);
  return `<main class="screen no-nav">${UI.subbar('Programas de treino', esc(p.name))}
    <p class="small muted" style="margin:0 4px 14px">Um programa é um período de treino (ex.: 12 semanas) com seus treinos A, B, C… Crie quantos quiser — o histórico de todos fica no Progresso.</p>
    <button type="button" class="btn primary block" data-a="prog-new" style="margin-bottom:14px">${ic('plus')} Novo programa</button>
    ${act ? card(act) : ''}${others.length ? `<h2 class="section-title">Anteriores e inativos</h2>` + others.map(card).join('') : ''}</main>`;
};
V.programa = function (p, g) {
  if (!g) return `<main class="screen"><div class="empty">Programa não encontrado. <a href="#/programas">Voltar</a></div></main>`;
  return `<main class="screen no-nav">${UI.subbar(esc(g.name), `${g.weeks ? g.weeks + ' semanas' : 'Contínuo'} · início ${U.dmy(U.parseISO(g.start))}`, `<button type="button" class="iconbtn" data-a="prog-edit" data-id="${g.id}" aria-label="Configurações do programa">${ic('edit')}</button>`)}
  ${g.treinos.map((t, ti) => `<div class="section-title row between notrans"><span>${UI.letter(t.short, M.treinoColor(t), 'xs')} <b class="tname">${esc(t.name)}</b> <span class="muted">· ${(t.days || []).map(d => U.DIAS_ABREV[d]).join(', ') || 'sem dia fixo'}</span></span><button type="button" class="linkbtn" data-a="editt" data-p="${g.id}" data-t="${t.id}">Editar</button></div>
    <div class="list">${t.ex.map((e, i) => `<button type="button" class="li" data-a="editex" data-p="${g.id}" data-t="${t.id}" data-e="${e.id}"><span class="ex-idx">${i + 1}</span><div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${esc(e.cat)} · ${esc(e.presc)}</div></div>${ic('chev', 'class="chev"')}</button>`).join('')}
    <button type="button" class="li" data-a="addex" data-p="${g.id}" data-t="${t.id}"><span class="ic">${ic('plus')}</span><div class="grow t accent-t">Adicionar exercício</div></button></div>`).join('')}
  <button type="button" class="btn ghost block" data-a="addtreino" data-p="${g.id}" style="margin-top:16px">${ic('plus')} Adicionar treino ${M.nextShort(g)}</button>
  <p class="tiny faint center" style="margin-top:12px">Alterar o plano não muda treinos já registrados.</p></main>`;
};

/* ---------- MEUS DADOS ---------- */
V.dados = function (p) {
  const S = T12.S, inf = T12.ui.storeInfo || {};
  return `<main class="screen no-nav">${UI.subbar('Meus dados', 'Backup, exportação e exclusão')}
  <section class="card"><h2>Neste aparelho</h2>${S.profiles.map(x => `<div class="row between gainrow"><span class="row" style="gap:10px">${UI.avatar(x)}<b>${esc(x.name)}</b></span><span class="small muted num">${x.sessions.filter(M.hasData).length} treinos · ${x.activities.length} ativ. · ${x.checkins.length} check-ins</span></div>`).join('')}
    <div id="storeinfo">${V.storeInfo(inf)}</div></section>
  <h2 class="section-title">Backup e portabilidade</h2><div class="list">
    ${li('backup', 'download', 'Fazer backup', S.settings.lastBackup ? 'Último: ' + U.dmy(new Date(S.settings.lastBackup)) : 'Arquivo .json, com senha opcional')}
    ${li('restore', 'upload', 'Restaurar backup', 'De um arquivo .json (também da versão 1)')}
    ${li('csv', 'sheet', 'Exportar para planilha', 'CSV com todos os treinos, atividades e check-ins de ' + esc(p.name))}</div>
  <h2 class="section-title">Pontos de restauração automáticos</h2>
  <div class="list" id="snaps"><div class="li"><div class="grow small muted">Carregando…</div></div></div>
  <p class="tiny faint" style="margin:0 4px 14px">O app guarda sozinho uma cópia por dia (últimos 7 dias) dentro do aparelho. Útil para desfazer um engano — mas não substitui o backup, pois some se o app for apagado.</p>
  <h2 class="section-title">Excluir</h2><div class="list">
    ${li('delprof', 'trash', `Excluir ${esc(p.name)} e seus dados`, 'Apaga registros e programas desta pessoa', '')}
    ${li('wipe', 'trash', 'Apagar todos os dados deste aparelho', 'Todas as pessoas, pontos de restauração e preferências', '')}</div></main>`;
};

V.storeInfo = function (inf) {
  inf = inf || {};
  const mb = b => b == null ? '—' : b < 1048576 ? fmt(b / 1024, 0) + ' KB' : fmt(b / 1048576, 1) + ' MB';
  return `<div class="small muted" style="margin-top:10px">Armazenamento: ${inf.backend === 'ls' ? 'localStorage (modo limitado)' : 'IndexedDB'} · em uso ${mb(inf.usage)}${inf.quota ? ' de ' + mb(inf.quota) + ' disponíveis' : ''}</div>
    <div class="row between" style="margin-top:10px"><div class="small"><b>Proteção contra limpeza automática:</b> ${inf.persisted ? '<span class="okt">ativa</span>' : inf.persisted === false ? '<span class="warnt">não garantida</span>' : '…'}</div>${inf.persisted === false ? '<button type="button" class="btn sm ghost" data-a="persist">Ativar</button>' : ''}</div>`;
};

/* ---------- PRIVACIDADE ---------- */
V.privacidade = function () {
  const S = T12.S;
  const sec = (t, b) => `<section class="card"><h2>${t}</h2><div class="small policy">${b}</div></section>`;
  return `<main class="screen no-nav">${UI.subbar('Privacidade e LGPD', 'Política versão ' + T12.POLICY_VERSION)}
  ${sec('Resumo', `<p><b>Seus dados não saem do seu aparelho.</b> O Treino 12 não tem servidor, conta, login, anúncios, cookies de rastreamento nem análise de uso. Ninguém — nem quem publicou o app — tem acesso aos seus registros.</p>`)}
  ${sec('Quais dados e para quê', `<ul><li><b>Identificação mínima:</b> nome ou apelido e uma cor, para separar as pessoas que usam o mesmo aparelho.</li><li><b>Treinos:</b> exercícios, cargas, repetições, tempos, cardio, alongamentos, atividades e datas.</li><li><b>Dados de saúde (sensíveis):</b> peso, medidas, composição corporal, sono, energia, esforço e dor — todos opcionais.</li></ul><p>Finalidade única: permitir que você acompanhe sua própria evolução. Não há perfilamento, venda ou compartilhamento.</p>`)}
  ${sec('Base legal', `<p>Consentimento específico e destacado do titular para dados de saúde (LGPD, art. 11, I), registrado com data e versão desta política. Para menores de 18 anos, consentimento específico de um dos pais ou responsável legal (art. 14, §1º). Em uso estritamente pessoal ou familiar e sem fins econômicos, a LGPD pode nem se aplicar (art. 4º, I) — ainda assim o app segue suas boas práticas.</p>`)}
  ${sec('Onde ficam e por quanto tempo', `<p>No armazenamento interno do navegador deste aparelho (IndexedDB), até você apagá-los. Backups são arquivos que <b>você</b> cria e guarda onde quiser; recomendamos protegê-los com senha (criptografia AES-256).</p>`)}
  ${sec('Seus direitos (art. 18) — direto no app', `<ul><li><b>Acesso e confirmação:</b> telas Treinos → Histórico e Progresso.</li><li><b>Correção:</b> edite qualquer registro, perfil ou check-in.</li><li><b>Portabilidade:</b> Mais → Meus dados → Backup (.json) ou Exportar para planilha (.csv).</li><li><b>Eliminação e revogação do consentimento:</b> Mais → Meus dados → Excluir. A exclusão é imediata e definitiva.</li></ul>`)}
  ${sec('Serviços de terceiros', `<ul><li><b>Hospedagem (GitHub Pages):</b> entrega os arquivos do app. Como todo site, o provedor pode registrar dados técnicos de acesso (como endereço IP), conforme a política de privacidade do GitHub. Nenhum dado de treino é enviado.</li><li><b>Vídeos (YouTube):</b> o botão ▶ abre o YouTube fora do app; a partir daí vale a política do Google.</li><li><b>Compartilhamento de backup:</b> ao enviar o arquivo por WhatsApp, Drive ou e-mail, ele passa a seguir as regras desses serviços.</li></ul>`)}
  ${sec('Segurança', `<p>Proteja o aparelho com senha/biometria. Quem tiver acesso ao celular desbloqueado pode ver os registros. Backups com senha não podem ser abertos sem ela — e a senha não pode ser recuperada.</p>`)}
  <section class="card"><h2>Consentimentos neste aparelho</h2>${S.profiles.map(x => `<div class="row between gainrow"><b>${esc(x.name)}</b><span class="small muted">${x.consent ? 'Concedido em ' + U.dmy(new Date(x.consent.at)) + (x.guardian ? ' · pelo responsável' : '') : 'Pendente'}</span></div>`).join('') || '<div class="small muted">Nenhuma pessoa cadastrada.</div>'}
  ${S.profiles.length ? `<button type="button" class="btn danger block" data-a="revoke" style="margin-top:12px">Revogar consentimento de ${esc(T12.prof() ? T12.prof().name : '')} (apaga os dados)</button>` : ''}</section></main>`;
};

/* ---------- AJUDA ---------- */
V.ajuda = function () {
  const P = root.PLANO_PADRAO;
  return `<main class="screen no-nav">${UI.subbar('Como usar', esc(P.objetivo))}
  <section class="card"><h2>No treino</h2><div class="small stack"><div>• Toque no <b>✓</b> para concluir a série. Se deixar os campos vazios, o app repete a carga e as repetições da série de cima ou da última vez.</div><div>• O descanso começa sozinho (ajuste em Mais). A tela fica acesa durante o treino.</div><div>• Quando você completa todas as séries no topo da faixa, o app sugere subir a carga.</div><div>• Treinou em outro dia? Toque na data no topo do treino para corrigir.</div><div>• Use “Adicionar exercício” para incluir algo extra só naquele dia.</div></div></section>
  <section class="card"><h2>Programas e períodos</h2><div class="small stack"><div>• <b>Programa</b> = um ciclo de treino (ex.: 12 semanas). Em Mais → Programas você cria novos, repete, duplica ou deixa contínuo, e monta treinos A, B, C, D… com os dias da semana.</div><div>• <b>Treino livre</b> registra um treino fora do programa. <b>Atividade</b> registra caminhada, corrida, esporte etc.</div><div>• <b>Progresso</b> mostra semana, mês, semestre, ano e o acumulado da vida toda (por ano e por década).</div></div></section>
  ${P.orientacoes.map((o, i) => `<section class="card"><div class="row" style="align-items:flex-start"><span class="ex-idx">${i + 1}</span><div><div class="bold">${esc(o[0])}</div><div class="small muted" style="margin-top:4px">${esc(o[1])}</div></div></div></section>`).join('')}
  <section class="card"><h2>Fases do programa base</h2>${P.fases.map(f => `<div style="padding:6px 0"><b>Semanas ${f.de}–${f.ate}: ${esc(f.nome)}</b><div class="small muted">${esc(f.dica)}</div></div>`).join('')}</section></main>`;
};
})(window);
