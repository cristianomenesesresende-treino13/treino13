/* Treino 12 — núcleo: utilitários de data/texto, ícones e constantes.
   Sem dependências. Funciona no navegador (window.T12) e no Node (testes). */
(function (root) {
'use strict';
const T12 = root.T12 = root.T12 || {};

T12.VERSION = '2.0.0';
T12.SCHEMA = 2;
T12.POLICY_VERSION = '2026-10';

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MESES_LONGOS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const DIAS_CURTOS = ['D','S','T','Q','Q','S','S'];
const DIAS_ABREV = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const pad = n => String(n).padStart(2, '0');
const U = {
  MESES, MESES_LONGOS, DIAS, DIAS_CURTOS, DIAS_ABREV, pad,
  esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  /** Converte texto do usuário ("27,5", "27.5") em número; vazio → null. */
  num: v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; },
  fmt: (n, d) => n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d == null ? 1 : d }),
  /** Data local → 'AAAA-MM-DD' (nunca usar toISOString: ela converte para UTC). */
  iso: d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  parseISO: s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); },
  addDays: (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; },
  addMonths: (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1),
  today: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; },
  /** Semana começa na segunda-feira (padrão brasileiro de academia / ISO-8601). */
  mondayOf: d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return U.addDays(x, -((x.getDay() + 6) % 7)); },
  diffDays: (a, b) => Math.round((U.dayNum(b) - U.dayNum(a))),
  /** Nº do dia independente de horário de verão. */
  dayNum: d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000),
  dm: d => `${d.getDate()} ${MESES[d.getMonth()]}`,
  dmy: d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
  dmyLong: d => `${d.getDate()} de ${MESES_LONGOS[d.getMonth()]} de ${d.getFullYear()}`,
  mmss: s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return h ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`; },
  hm: min => { min = Math.round(min || 0); if (min < 60) return `${min} min`; const h = Math.floor(min / 60), m = min % 60; return m && h < 10 ? `${h} h ${m} min` : `${h} h`; },
  hours: min => (min || 0) / 60,
  initials: n => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(),
  slug: s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
  sum: (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0),
  pct: (a, b) => b ? (a - b) / b * 100 : null
};
T12.U = U;

/* Ícones (traço 2px, estilo consistente) */
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  dumbbell: '<path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  check: '<path d="M5 12.5 10 17.5 19.5 7"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  fwd: '<path d="m9 5 7 7-7 7"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  play: '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9.2 5 2.8-5 2.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.8 3 2.6 3.6 5.2"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>',
  sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
  flame: '<path d="M12 21c4 0 7-2.7 7-6.5 0-3.4-2.4-5.6-3.6-7.8-.5 1.8-1.6 3-2.9 3.3C13 6.5 11.5 4.3 9 3c.4 3-1.9 5-3.2 7A7.2 7.2 0 0 0 5 14.5C5 18.3 8 21 12 21z"/>',
  scale: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8.5 9.5a5 5 0 0 1 7 0L13 12"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M11 18.5h2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 8 7.5 9 4.3-1 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="m10 21 2-6-3-3 1-5 4 3 3 1M9 12l-2 3M12 15l3 6"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5c0 3 1.5 4.5 3.5 4.5M16 6h3.5c0 3-1.5 4.5-3.5 4.5M12 13v4M8 21h8M9.5 17h5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 4v4.5H8M12 7.5V12l3 2"/>',
  bolt: '<path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10z"/>',
  dots: '<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>'
};
T12.ic = (n, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${extra || ''}>${P[n] || ''}</svg>`;

T12.COLORS = ['#D7F75B', '#FF8A4C', '#4DA3FF', '#3DDC97', '#B386FF', '#FF5C9A', '#FFD24D', '#5EE1E6'];
T12.TREINO_COLORS = ['var(--tA)', 'var(--tB)', 'var(--tC)', 'var(--tD)', 'var(--tE)', 'var(--tF)', 'var(--tG)'];
T12.CATS = ['Força', 'Core', 'Funcional', 'Cardio', 'Mobilidade', 'Flexibilidade'];
T12.MODALIDADES = ['Bicicleta ergométrica', 'Esteira — caminhada', 'Esteira — corrida', 'Elíptico', 'Remo', 'Escada', 'Caminhada ao ar livre', 'Corrida ao ar livre', 'Natação', 'Outro'];
T12.ATIVIDADES = ['Caminhada', 'Corrida', 'Bicicleta', 'Natação', 'Esporte', 'Dança', 'Yoga / Pilates', 'Trilha', 'Outra'];
})(typeof window !== 'undefined' ? window : globalThis);
