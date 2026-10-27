/* Treino 12 — infraestrutura de interface: tema, toast, folhas (sheets), diálogos,
   navegação inferior, cronômetro de descanso e tela sempre acesa. */
(function (root) {
'use strict';
const T12 = root.T12, U = T12.U, ic = T12.ic;
const UI = T12.UI = {};
const $ = UI.$ = (s, r) => (r || document).querySelector(s);
const $$ = UI.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* tema */
UI.applyTheme = function () {
  const t = T12.S ? T12.S.settings.theme : 'auto';
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = $('meta[name="theme-color"]'); if (m) m.content = dark ? '#0B0D10' : '#F3F4F6';
};
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', UI.applyTheme); } catch (e) {}

/* toast acessível */
let toastT;
UI.toast = function (msg, action, fn) {
  let el = $('#toast'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<span>${U.esc(msg)}</span>${action ? `<button type="button">${U.esc(action)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { el.remove(); fn && fn(); };
  document.body.appendChild(el);
  clearTimeout(toastT); toastT = setTimeout(() => el.remove(), action ? 7000 : 2600);
};

/* folhas modais */
let lastFocus = null;
UI.sheet = function (html, onMount, opts) {
  UI.closeSheet(true);
  lastFocus = document.activeElement;
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'overlay';
  o.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" ${opts && opts.label ? `aria-label="${U.esc(opts.label)}"` : ''} tabindex="-1"><div class="grab" aria-hidden="true"></div>${html}</div>`;
  o.addEventListener('click', e => { if (e.target === o && !(opts && opts.sticky)) UI.closeSheet(); });
  document.body.appendChild(o);
  const sh = o.firstElementChild;
  onMount && onMount(sh);
  const f = sh.querySelector('[autofocus]') || sh;
  setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) {} }, 30);
  return sh;
};
UI.closeSheet = function (silent) {
  const o = $('#overlay'); if (!o) return;
  o.remove();
  if (!silent && lastFocus && document.body.contains(lastFocus)) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
};
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#overlay')) UI.closeSheet(); });
UI.confirm = (title, html, okLabel, danger) => new Promise(res => {
  const el = UI.sheet(`<h3>${U.esc(title)}</h3><p>${html}</p><div class="actions">
    <button type="button" class="btn block ${danger ? 'danger' : 'primary'}" data-ok>${U.esc(okLabel || 'Confirmar')}</button>
    <button type="button" class="btn block ghost" data-no autofocus>Cancelar</button></div>`, null, { label: title });
  el.querySelector('[data-ok]').onclick = () => { UI.closeSheet(); res(true); };
  el.querySelector('[data-no]').onclick = () => { UI.closeSheet(); res(false); };
  $('#overlay').addEventListener('click', e => { if (e.target.id === 'overlay') res(false); });
});
/** Formulário simples em folha. fields: [{id,label,type,placeholder,value,min}] → Promise<objeto|null> */
UI.ask = (title, text, fields, okLabel, validate) => new Promise(res => {
  const el = UI.sheet(`<h3>${U.esc(title)}</h3>${text ? `<p>${text}</p>` : ''}<form novalidate>${fields.map((f, i) => `<label class="field"><span>${U.esc(f.label)}</span>
    <input class="input" name="${f.id}" type="${f.type || 'text'}" ${f.auto ? `autocomplete="${f.auto}"` : ''} ${f.mode ? `inputmode="${f.mode}"` : ''} placeholder="${U.esc(f.placeholder || '')}" value="${U.esc(f.value || '')}" ${i === 0 ? 'autofocus' : ''}></label>`).join('')}
    <p class="formerr" role="alert"></p><div class="actions"><button class="btn primary block" type="submit">${U.esc(okLabel || 'OK')}</button><button class="btn ghost block" type="button" data-no>Cancelar</button></div></form>`, null, { label: title });
  const form = el.querySelector('form');
  form.onsubmit = e => { e.preventDefault(); const v = {}; fields.forEach(f => v[f.id] = form.elements[f.id].value);
    const err = validate && validate(v); if (err) { el.querySelector('.formerr').textContent = err; return; } UI.closeSheet(); res(v); };
  el.querySelector('[data-no]').onclick = () => { UI.closeSheet(); res(null); };
});

/* componentes */
UI.avatar = (p, cls) => `<span class="avatar ${cls || ''}" style="background:${U.esc(p.color)}" aria-hidden="true">${U.esc(U.initials(p.name))}</span>`;
UI.nav = function (active) {
  const it = (h, i, l) => `<a href="#/${h}" class="${active === h ? 'on' : ''}" ${active === h ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></a>`;
  return `<nav class="nav" aria-label="Navegação principal"><div class="nav-in">${it('hoje', 'home', 'Hoje')}${it('treinos', 'dumbbell', 'Treinos')}${it('progresso', 'chart', 'Progresso')}${it('mais', 'more', 'Mais')}</div></nav>`;
};
UI.subbar = (title, sub, right) => `<header class="subbar"><button type="button" class="iconbtn" data-a="back" aria-label="Voltar">${ic('back')}</button>
  <div class="title"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>${right || ''}</header>`;
UI.scale = (attrs, f, val, a, b, cls, label) => {
  let h = `<div class="scale ${cls || ''}" role="radiogroup" aria-label="${U.esc(label || '')}">`;
  for (let i = a; i <= b; i++) h += `<button type="button" role="radio" aria-checked="${val === i}" data-a="scale" ${attrs} data-f="${f}" data-v="${i}" class="${val === i ? 'on' : ''}">${i}</button>`;
  return h + '</div>';
};
UI.letter = (short, color, size) => `<span class="wletter ${size || ''}" style="background:${color}" aria-hidden="true">${U.esc(short)}</span>`;
UI.delta = (cur, prev, invert) => {
  if (prev == null || !isFinite(prev) || prev === 0) return cur > 0 && prev === 0 ? '<span class="delta up">novo</span>' : '';
  const d = U.pct(cur, prev); if (d == null || Math.abs(d) < 1) return '<span class="delta">=</span>';
  const up = d > 0; return `<span class="delta ${up !== !!invert ? 'up' : 'down'}">${up ? '▲' : '▼'} ${U.fmt(Math.abs(d), 0)}%</span>`;
};
UI.isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
UI.isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* cronômetro de descanso (baseado em horário → não atrasa com a tela bloqueada) */
let rest = null, restT = null, audioCtx = null;
UI.startRest = sec => { rest = { end: Date.now() + sec * 1000, ended: false }; UI.renderRest(); clearInterval(restT); restT = setInterval(UI.renderRest, 250); };
UI.stopRest = () => { rest = null; clearInterval(restT); UI.renderRest(); };
UI.addRest = s => { if (rest) { rest.end = Math.max(rest.end, Date.now()) + s * 1000; rest.ended = false; UI.renderRest(); } };
UI.renderRest = function () {
  let el = $('#rest');
  if (!rest || T12.route.name !== 'sessao') { if (el) el.remove(); if (!rest) clearInterval(restT); return; }
  const left = (rest.end - Date.now()) / 1000;
  if (left <= 0 && !rest.ended) { rest.ended = true; UI.alertEnd(); setTimeout(() => { if (rest && rest.ended) UI.stopRest(); }, 6000); }
  if (!el) {
    el = document.createElement('div'); el.id = 'rest'; el.className = 'resttimer'; el.setAttribute('role', 'timer'); el.setAttribute('aria-live', 'off');
    el.innerHTML = `<div><div class="l">Descanso</div><div class="t"></div></div><button type="button" data-a="rest+">+15s</button><button type="button" data-a="restskip">Pular</button>`;
    document.body.appendChild(el);
  }
  el.classList.toggle('end', left <= 0);
  el.querySelector('.t').textContent = left > 0 ? U.mmss(Math.ceil(left)) : 'Bora!';
  el.querySelector('.l').textContent = left > 0 ? 'Descanso' : 'Próxima série';
};
UI.alertEnd = function () {
  if (!T12.S.settings.sound) return;
  try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (e) {}
  try {
    audioCtx = audioCtx || new (root.AudioContext || root.webkitAudioContext)();
    [0, 0.22].forEach(d => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + d); g.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d + 0.18);
      o.start(audioCtx.currentTime + d); o.stop(audioCtx.currentTime + d + 0.2); });
  } catch (e) {}
};
/* iOS só libera áudio depois de um toque do usuário */
UI.unlockAudio = () => { try { if (T12.S.settings.sound && !audioCtx) audioCtx = new (root.AudioContext || root.webkitAudioContext)(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) {} };

/* tela acesa durante o treino */
let wake = null;
UI.wakeOn = async () => { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) {} };
UI.wakeOff = () => { try { wake && wake.release(); } catch (e) {} wake = null; };
document.addEventListener('visibilitychange', () => { if (!document.hidden && T12.route && T12.route.name === 'sessao') UI.wakeOn(); });

/* entrega de arquivos: compartilhar (Drive, WhatsApp, Arquivos) ou baixar */
UI.deliverFile = function (name, text, mime, title, note) {
  const blob = new Blob([text], { type: mime });
  let file = null; try { file = new File([blob], name, { type: mime }); } catch (e) {}
  const canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
  return new Promise(res => {
    const el = UI.sheet(`<h3>${U.esc(title)}</h3><p>Arquivo <b>${U.esc(name)}</b>. ${note || ''}</p>
      <div class="actions">${canShare ? `<button type="button" class="btn primary block" id="d-share">${ic('share')} Enviar / salvar…</button>` : ''}
      <button type="button" class="btn ${canShare ? 'ghost' : 'primary'} block" id="d-dl">${ic('download')} Baixar arquivo</button></div>`, null, { label: title });
    const done = ok => { UI.closeSheet(); res(ok); };
    if (canShare) el.querySelector('#d-share').onclick = async () => { try { await navigator.share({ files: [file], title: name }); done(true); } catch (e) { if (!e || e.name !== 'AbortError') UI.toast('Não foi possível compartilhar. Use “Baixar arquivo”.'); } };
    el.querySelector('#d-dl').onclick = () => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); done(true); };
  });
};
UI.pickFile = accept => new Promise(res => {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept;
  inp.onchange = () => res(inp.files[0] || null); inp.click();
});
})(window);
