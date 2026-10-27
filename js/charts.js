/* Treino 12 — gráficos em SVG puro (sem bibliotecas, funcionam offline e respeitam o tema). */
(function (root) {
'use strict';
const T12 = root.T12, U = T12.U;
const Ch = T12.Ch = {};
const niceMax = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };
const ticksFor = nice => nice % 4 === 0 ? 4 : nice % 5 === 0 ? 5 : nice % 3 === 0 ? 3 : 4;
const fmtTick = v => v >= 1000 ? U.fmt(v / 1000, 1) + 'k' : U.fmt(v, v < 10 ? 1 : 0);

/** Barras empilhadas. o = { labels, series:[{name, values, color}], ref, refLabel, hi, unit, aria } */
Ch.bars = function (o) {
  const W = 340, H = 170, L = 30, B = 22, T = 12, R = 6, n = o.labels.length, iw = W - L - R, ih = H - B - T;
  const totals = o.labels.map((_, i) => o.series.reduce((a, s) => a + (s.values[i] || 0), 0));
  const mx = Math.max(o.min || 0, o.ref || 0, ...totals);
  let nice = niceMax(mx), nt = ticksFor(nice);
  if (o.int && mx <= 5) { nice = Math.max(1, Math.ceil(mx)); nt = nice; }
  const slot = iw / n, bw = Math.max(2, Math.min(28, slot * (n > 20 ? 0.7 : 0.62)));
  let g = '';
  for (let k = 0; k <= nt; k++) { const y = T + ih - ih * k / nt; g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 5}" y="${y + 3}" text-anchor="end">${fmtTick(nice * k / nt)}</text>`; }
  o.labels.forEach((lab, i) => {
    const x = L + slot * i + (slot - bw) / 2; let acc = 0;
    o.series.forEach(s => { const v = s.values[i] || 0; if (!v) return; const h = ih * v / nice, y = T + ih - ih * acc / nice - h; acc += v;
      g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, h - 0.8).toFixed(1)}" rx="${Math.min(3, bw / 3)}" style="fill:${s.color}"><title>${U.esc(o.titles ? o.titles[i] : lab)} — ${U.esc(s.name || '')}: ${U.fmt(v, 0)}${o.unit ? ' ' + o.unit : ''}</title></rect>`; });
    if (lab) g += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" ${o.hi === i ? 'class="hi"' : ''}>${U.esc(lab)}</text>`;
  });
  if (o.ref) { const y = T + ih - ih * o.ref / nice; g += `<line class="ref" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${W - R}" y="${y - 4}" text-anchor="end" class="reflbl">${U.esc(o.refLabel || '')}</text>`; }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${U.esc(o.aria || 'Gráfico')}">${g}</svg>`;
};
/** Linha com pontos (aceita lacunas = null). */
Ch.line = function (o) {
  const W = 340, H = 165, L = 34, B = 22, T = 16, R = 12, n = o.labels.length, iw = W - L - R, ih = H - B - T;
  const vals = o.values.filter(v => v != null);
  if (!vals.length) return `<div class="empty">${U.esc(o.empty || 'Sem dados neste período.')}</div>`;
  let mn = Math.min(...vals), mx = Math.max(...vals); if (mn === mx) { mn -= 1; mx += 1; }
  const pd = (mx - mn) * 0.18; mn -= pd; mx += pd;
  const X = i => L + (n === 1 ? iw / 2 : iw * i / (n - 1)), Y = v => T + ih - ih * (v - mn) / (mx - mn);
  let g = '';
  for (let k = 0; k <= 3; k++) { const v = mn + (mx - mn) * k / 3, y = Y(v); g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 5}" y="${y + 3}" text-anchor="end">${U.fmt(v, mx - mn < 8 ? 1 : 0)}</text>`; }
  o.labels.forEach((lab, i) => { if (lab) g += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${U.esc(lab)}</text>`; });
  const pts = o.values.map((v, i) => v == null ? null : [X(i), Y(v), v, i]).filter(Boolean);
  if (pts.length > 1) g += `<polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" style="stroke:${o.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  pts.forEach((p, k) => {
    g += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${pts.length > 40 ? 2.5 : 4}" style="fill:${o.color};stroke:var(--surface)" stroke-width="2"><title>${U.esc(o.titles ? o.titles[p[3]] : o.labels[p[3]])}: ${U.fmt(p[2])}${o.unit ? ' ' + o.unit : ''}</title></circle>`;
    if (k === pts.length - 1 || k === 0) g += `<text x="${p[0].toFixed(1)}" y="${(p[1] - 9).toFixed(1)}" text-anchor="${k === 0 && pts.length > 1 ? 'start' : 'middle'}" class="val">${U.fmt(p[2])}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${U.esc(o.aria || 'Gráfico')}">${g}</svg>`;
};
/** Mapa de calor do ano (estilo calendário): uma coluna por semana, 7 linhas (seg→dom). */
Ch.heatmap = function (year, dayMin, today) {
  const start = U.mondayOf(new Date(year, 0, 1)), end = new Date(year, 11, 31);
  const cols = Math.ceil((U.diffDays(start, end) + 1) / 7), cs = 11, gap = 2.5, L = 16, T = 16;
  const W = L + cols * (cs + gap), H = T + 7 * (cs + gap) + 2;
  const lvl = m => !m ? 0 : m < 20 ? 1 : m < 45 ? 2 : m < 75 ? 3 : 4;
  let g = '', lastM = -1;
  for (let c = 0; c < cols; c++) for (let r = 0; r < 7; r++) {
    const d = U.addDays(start, c * 7 + r); if (d.getFullYear() !== year) continue;
    if (d > today) continue;
    const k = U.iso(d), m = dayMin[k] || 0;
    g += `<rect x="${(L + c * (cs + gap)).toFixed(1)}" y="${(T + r * (cs + gap)).toFixed(1)}" width="${cs}" height="${cs}" rx="1.5" class="hm${lvl(m)}"><title>${U.dmy(d)}: ${m ? U.hm(m) : 'sem atividade'}</title></rect>`;
    if (r === 0 && d.getMonth() !== lastM && d.getDate() <= 7) { lastM = d.getMonth(); g += `<text x="${L + c * (cs + gap)}" y="11">${U.MESES[lastM]}</text>`; }
  }
  ['S', '', 'Q', '', 'S', '', 'D'].forEach((l, r) => { if (l) g += `<text x="0" y="${T + r * (cs + gap) + 9}">${l}</text>`; });
  return `<svg class="chart heat" width="${W.toFixed(0)}" height="${H.toFixed(0)}" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Mapa de dias com treino em ${year}">${g}</svg>`;
};
Ch.ring = function (pct, label, sub, size) {
  size = size || 76; const r = (size - 10) / 2, c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px" role="img" aria-label="${U.esc(label + ' ' + sub)}"><svg width="${size}" height="${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface3)" stroke-width="8"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - U.clamp(pct, 0, 1))).toFixed(2)}"/></svg>
  <div class="lbl"><div>${label}<small>${sub}</small></div></div></div>`;
};
Ch.legend = items => `<div class="legend">${items.map(([c, l]) => `<span><i style="background:${c}"></i>${U.esc(l)}</span>`).join('')}</div>`;
})(typeof window !== 'undefined' ? window : globalThis);
