#!/usr/bin/env node
/* =============================================================================
 * TrueKeate — Generador de PDF descargables de los Manuales (docs/Manuales)
 * Rol: ASISTENTE PDF del equipo de manuales.
 *
 * 1) Lee los .md de docs/Manuales (español)
 * 2) Genera HTML autocontenido y estilizado por manual en
 *    docs/Manuales/pdf/html/<carpeta>-<archivo>.html
 *    (portada TrueKeate + tema, índice, contenido con paleta navy/teal/cyan/gold)
 * 3) Convierte cada HTML a PDF A4 con Playwright Chromium en
 *    docs/Manuales/pdf/<carpeta>-<archivo>.pdf
 *
 * Uso (desde web/, con variables de entorno de Chromium):
 *   node scripts/generar-pdfs.mjs
 * ========================================================================== */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, extname, sep } from 'node:path';

const ROOT = '/home/dsh/workspace/escrow';
const MD_ROOT = join(ROOT, 'docs', 'Manuales');
const PDF_DIR = join(MD_ROOT, 'pdf');
const HTML_DIR = join(PDF_DIR, 'html');
const IMG_DIR = join(ROOT, 'docs', 'imagenes');
// Alias de compatibilidad (el marcador del manual vs. el archivo generado)
const IMG_ALIASES = { 'flujo-trueque.svg': 'flujo-truque.svg' };

const THEMES = {
  '01-Tecnologia': 'Tecnología',
  '02-Dependencias': 'Dependencias',
  '03-Implementacion': 'Implementación',
  '04-Despliegue': 'Despliegue',
  '05-Diccionario-de-Datos': 'Diccionario de Datos',
  '06-Diagrama-Relacional': 'Diagrama Relacional',
};

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function fechaBonita() {
  const d = new Date();
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
const FECHA = fechaBonita();

/* ------------------------------------------------------------------ util --- */
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'pdf') continue; // carpeta de salida
      walk(p, out);
    } else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function humanName(file) {
  const base = basename(file, extname(file));
  return base.replace(/^0*\d+-/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* ------------------------------------------- iconos SVG (emojis sin glifo) --- */
function svgIcon(body, color = '#1a2b4c') {
  return `<svg viewBox="0 0 16 16" width="13" height="13" style="vertical-align:-2px;margin-right:3px" aria-hidden="true"><g fill="${color}">${body}</g></svg>`;
}
const ICONS = {
  '🏠': svgIcon('<path d="M8 1.5 1 7.2h2V14h4v-4h2v4h4V7.2h2z"/>', '#1a2b4c'),
  '💼': svgIcon('<rect x="1.5" y="5.5" width="13" height="8.5" rx="1"/><path d="M5.5 5.5V3.8c0-.8.7-1.3 2.5-1.3s2.5.5 2.5 1.3v1.7"/><path d="M1.5 9h13" stroke="#fff" stroke-width="1.6" fill="none"/>', '#2a9d8f'),
  '🏛': svgIcon('<path d="M2 6 8 2l6 4z"/><path d="M3 6v5h2V6M7 6v5h2V6M11 6v5h2V6"/><rect x="2" y="11.5" width="12" height="2"/>', '#d4af37'),
  '🏛️': svgIcon('<path d="M2 6 8 2l6 4z"/><path d="M3 6v5h2V6M7 6v5h2V6M11 6v5h2V6"/><rect x="2" y="11.5" width="12" height="2"/>', '#d4af37'),
  '👤': svgIcon('<circle cx="8" cy="5.4" r="2.9"/><path d="M2.2 14.4c.6-3 3.2-4.6 5.8-4.6s5.2 1.6 5.8 4.6z"/>', '#48cae4'),
  '💡': svgIcon('<path d="M8 1.5c-2.6 0-4.4 1.7-4.4 4 0 1.6 1 2.7 1.6 3.5.5.7.8 1.3.8 2h4c0-.7.3-1.3.8-2 .6-.8 1.6-1.9 1.6-3.5 0-2.3-1.8-4-4.4-4zM6.3 12.6h3.4v1.4H6.3z"/>', '#d4af37'),
  '⚠': svgIcon('<path d="M8 1.6 15.4 14H0.6z"/><path d="M8 6.2v4.2" stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round"/><circle cx="8" cy="12.1" r="0.9" fill="#fff"/>', '#f4a261'),
  '✔': svgIcon('<path d="M2.5 8.6 6.4 12.4 13.5 4.2" stroke="#2a9d8f" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  '✓': svgIcon('<path d="M2.5 8.6 6.4 12.4 13.5 4.2" stroke="#2a9d8f" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
};
function emojis(s) {
  return s.replace(/\uFE0F/g, '').replace(/🏠|💼|🏛️|🏛|👤|💡|⚠|✔|✓/g, (m) => ICONS[m] || m);
}

/* ===================================================================== CSS == */
const CSS = `
:root{
  --navy-900:#0a1128; --navy-800:#1a2b4c; --navy-700:#22345e;
  --teal:#2a9d8f; --teal-dark:#1f6f64; --cyan:#48cae4; --cyan-dark:#1d7fa8;
  --gold:#d4af37; --gold-300:#f3e5ab; --gold-600:#c5a065;
  --smoke:#f8f9fa; --white:#ffffff; --crimson:#e63946; --coral:#f4a261;
  --line:#d7dfe9; --ink:#1a2b4c;
}
*{box-sizing:border-box; margin:0; padding:0;}
html,body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body{
  font-family:'DejaVu Sans','Inter','Roboto','Helvetica',sans-serif;
  color:var(--ink); background:var(--white);
  font-size:11.5px; line-height:1.55;
}
a{color:var(--teal-dark); text-decoration:none;}
h1,h2,h3,h4{font-family:'DejaVu Sans','Montserrat','Poppins',sans-serif; line-height:1.2;}

/* ---------- Portada ---------- */
.portada{
  background:linear-gradient(155deg,var(--navy-900) 0%, var(--navy-800) 58%, #255e70 130%);
  color:var(--white); border-radius:16px; overflow:hidden;
  padding:30px 34px 26px; margin:0 0 22px; height:248mm;
  display:flex; flex-direction:column; page-break-after:always;
  border:1px solid rgba(212,175,55,.45);
  position:relative;
}
.portada::before{
  content:""; position:absolute; inset:0 0 auto 0; height:5px;
  background:linear-gradient(90deg,var(--gold) 0%, var(--teal) 55%, var(--cyan) 100%);
}
.portada .top{display:flex; justify-content:space-between; align-items:center;}
.portada .brand{
  font-size:15px; letter-spacing:4px; font-weight:bold; color:var(--gold-300);
}
.portada .brand b{color:var(--gold); font-size:17px;}
.portada .chip-doc{
  background:rgba(72,202,228,.14); border:1px solid rgba(72,202,228,.55);
  color:var(--cyan); border-radius:999px; padding:3px 12px; font-size:10px;
  letter-spacing:1.5px; text-transform:uppercase;
}
.portada .hero{margin-top:auto; margin-bottom:auto;}
.portada .tema-chip{
  display:inline-block; background:var(--gold); color:var(--navy-900);
  font-weight:bold; border-radius:6px; padding:4px 12px; font-size:11px;
  letter-spacing:2px; text-transform:uppercase; margin-bottom:14px;
}
.portada h1{
  font-size:31px; color:var(--white); font-weight:bold; margin:0 0 12px;
  max-width:150mm;
}
.portada .intro{
  color:#cfe0ee; font-size:13px; line-height:1.6; max-width:150mm;
  border-left:3px solid var(--teal); padding-left:12px; margin-bottom:16px;
}
.portada .meta{color:#8fb3c9; font-size:10px; letter-spacing:.4px;}
.portada .meta span{margin-right:14px;}
.portada .meta b{color:var(--cyan); font-weight:normal;}
.portada .paleta{
  display:flex; gap:10px; border-top:1px solid rgba(255,255,255,.18);
  padding-top:14px; margin-top:6px; align-items:center;
}
.portada .paleta .p{display:flex; align-items:center; gap:5px; font-size:9px; color:#b9cede;}
.portada .paleta .sw{width:12px;height:12px;border-radius:3px;display:inline-block;}
.portada .copy{margin-left:auto; font-size:9px; color:#6f8fa6;}

/* ---------- Índice ---------- */
.indice{
  page-break-after:always; background:var(--smoke); border-radius:12px;
  padding:22px 26px; border:1px solid var(--line);
}
.indice h2{
  color:var(--navy-800); font-size:19px; margin-bottom:4px;
  display:flex; align-items:center; gap:8px;
}
.indice h2 .k{
  width:26px;height:26px;border-radius:8px; background:linear-gradient(135deg,var(--navy-800),var(--teal));
  color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:13px;
}
.indice .sub{color:#64809b; font-size:10px; margin-bottom:14px; padding-left:34px;}
.indice ol{list-style:none;}
.indice li{margin:0 0 4px;}
.indice li a{
  display:flex; align-items:baseline; gap:10px; padding:5px 10px; border-radius:8px;
  color:var(--navy-800); font-weight:600; font-size:12px;
}
.indice li a:hover{background:#e9f3f2;}
.indice li a .tnum{
  font-size:9px; color:#ffffff; background:var(--teal); border-radius:5px;
  font-weight:bold; letter-spacing:.5px; padding:1px 6px; flex:none;
}
.indice li a .n{color:#9fb0c2; font-size:9px; margin-left:auto; font-weight:normal;}
.indice li .subs{margin:1px 0 5px 30px;}
.indice li .subs a{font-weight:normal; font-size:10.5px; color:#4c6888; padding:1px 6px;}
.indice li .subs a::before{content:"— "; color:var(--gold-600);}

/* ---------- Contenido ---------- */
main.content{padding:2px 0 10px;}
main.content > section.seccion{margin:0 0 20px;}
h2.seccion{
  font-size:16.5px; color:var(--navy-800); margin:18px 0 8px; padding:6px 0 6px 12px;
  border-left:5px solid var(--gold); background:linear-gradient(90deg,#eef4fb 0%, #ffffff 70%);
  border-radius:0 8px 8px 0; page-break-after:avoid;
}
h3.sub{
  font-size:13.5px; color:var(--teal-dark); margin:13px 0 5px; padding-left:2px;
  border-bottom:1px solid #cfe5e1; padding-bottom:3px; page-break-after:avoid;
}
h4.sub2{font-size:12px; color:var(--cyan-dark); margin:10px 0 4px; page-break-after:avoid;}
p{margin:0 0 8px; text-align:justify;}
ul,ol{margin:0 0 9px 20px;}
li{margin:0 0 3px;}
li > ul, li > ol{margin-top:3px;}
ul ul, ol ul, ul ol, ol ol{margin-bottom:2px;}
strong{color:var(--navy-800);}
code{
  font-family:'DejaVu Sans Mono','DejaVu Sans',monospace; font-size:9.8px;
  background:#eef2f8; border:1px solid #dde5ee; color:#0f2a66;
  padding:.5px 4px; border-radius:4px;
}
pre{
  background:var(--navy-900); color:#d9ecf2; border-radius:10px; padding:12px 14px;
  margin:0 0 10px; font-size:9.6px; line-height:1.5; overflow:hidden;
  border:1px solid #0e1a3a; page-break-inside:avoid;
  border-left:4px solid var(--teal);
}
pre code{background:transparent;border:0;color:inherit;padding:0;font-size:inherit;}
pre .pre-label{
  display:block; color:var(--gold-300); font-size:8.5px; letter-spacing:1.5px;
  text-transform:uppercase; margin-bottom:6px;
}
hr{border:0; border-top:1px solid var(--line); margin:14px 0;}

/* ---------- Tablas ---------- */
.table-wrap{overflow:hidden; border-radius:10px; margin:0 0 11px; page-break-inside:auto;}
table{border-collapse:collapse; width:100%; font-size:10.3px;}
thead{display:table-header-group;}
th{
  background:var(--navy-800); color:#fff; text-align:left; padding:6px 9px;
  font-size:10.2px; letter-spacing:.3px; border:1px solid #24406e;
}
td{border:1px solid var(--line); padding:5px 9px; vertical-align:top;}
tbody tr:nth-child(even){background:#f2f7fa;}
tbody tr:nth-child(odd){background:#ffffff;}
tbody tr:hover{background:#e7f4f2;}

/* ---------- Citas / avisos ---------- */
blockquote{
  margin:0 0 11px; padding:9px 12px 9px 14px; border-radius:0 9px 9px 0;
  border-left:4px solid var(--teal); background:#eef7f5; font-size:11px;
  page-break-inside:avoid;
}
blockquote.info{border-left-color:var(--teal); background:#eef7f5;}
blockquote.warn{border-left-color:var(--coral); background:#fdf1e6;}
blockquote.pend{border-left-color:var(--gold); background:#fbf3da;}
blockquote.importante{border-left-color:var(--crimson); background:#fdeeec;}
blockquote.ejemplo{border-left-color:var(--cyan); background:#ecf8fc;}
blockquote .tag{
  display:inline-block; font-size:8.5px; font-weight:bold; letter-spacing:1.2px;
  text-transform:uppercase; padding:1px 8px; border-radius:999px; margin-bottom:4px;
}
blockquote.info .tag{background:#2a9d8f; color:#fff;}
blockquote.warn .tag{background:#f4a261; color:#3a230f;}
blockquote.pend .tag{background:#d4af37; color:#3a2d05;}
blockquote.importante .tag{background:#e63946; color:#fff;}
blockquote.ejemplo .tag{background:#48cae4; color:#06364a;}
blockquote p{margin:0 0 4px; text-align:justify;}
blockquote ul, blockquote ol{margin:4px 0 2px 18px;}
blockquote p:last-child{margin-bottom:0;}

/* ---------- Figuras ---------- */
figure.figura{
  border:1px solid var(--line); border-radius:12px; background:#fff;
  padding:12px 12px 8px; margin:12px 0 14px; page-break-inside:avoid;
  box-shadow:0 1px 4px rgba(10,17,40,.05);
}
figure.figura .fig-caption{
  font-size:9px; color:#6b829c; text-align:center; letter-spacing:.6px;
  text-transform:uppercase; margin-top:6px;
}
figure.figura img{width:100%; height:auto; display:block;}
.nota-codigo{font-size:9px;color:#8499b3;margin:-4px 0 8px;}
`;

/* ====================================================== parser markdown ===== */
function inline(s) {
  if (s == null) return '';
  // 1) escapar HTML y proteger los spans de código con placeholders
  let t = esc(s);
  const codes = [];
  t = t.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000C${codes.length - 1}\u0000`;
  });  // 2) negrita / cursiva
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  // 3) restaurar código
  t = t.replace(/\u0000C(\d+)\u0000/g, (_, n) => `<code>${codes[+n]}</code>`);
  return emojis(t);
}

function detectQuoteClass(raw) {
  const r = raw.toLowerCase();
  if (r.includes('pendiente de confirmar')) return 'pend';
  if (r.includes('importante')) return 'importante';
  if (/⚠/.test(raw)) return 'warn';
  if (r.includes('ejemplo')) return 'ejemplo';
  if (r.includes('regla de oro')) return 'info';
  if (r.includes('verificación') || r.includes('verificado') || r.includes('nota de verificacion')) return 'info';
  return 'info';
}
const QUOTE_TAGS = { info: 'Nota', warn: 'Aviso', pend: 'Pendiente de confirmar', importante: 'Importante', ejemplo: 'Ejemplo' };

// mini parseo de contenido interno de una cita (párrafos y listas simples)
function renderQuoteInner(lines) {
  let out = '';
  let listType = null;      // 'ol' | 'ul' | null
  let listItems = [];
  let para = [];
  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(' ').trim();
    para = [];
    if (text) out += `<p>${inline(text)}</p>`;
  };
  const flushList = () => {
    if (!listType) return;
    const tag = listType;
    out += `<${tag}>` + listItems.map((li) => `<li>${inline(li)}</li>`).join('') + `</${tag}>`;
    listType = null; listItems = [];
  };
  for (let line of lines) {
    line = line.replace(/^>\s?/, '');
    if (!line.trim()) { flushPara(); flushList(); continue; }
    const om = line.match(/^(\d+)\.\s+(.*)$/);
    const um = line.match(/^[-*]\s+(.*)$/);
    const m = om || um;
    if (m) {
      flushPara();
      const type = om ? 'ol' : 'ul';
      if (listType && listType !== type) flushList();
      listType = type;
      listItems.push(om ? om[2] : um[1]);
    } else if (listType && /^\s{2,}/.test(line)) {
      // continuación indentada del último ítem
      listItems[listItems.length - 1] += ' ' + line.trim();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out;
}

/* ---- lista general (soporta 1 nivel de anidación + continuaciones) ---- */
function renderListItems(items) {
  // items: [{indent, type, text}]
  let out = '';
  let rootOpen = false, subOpen = false;
  const closeRoot = () => { if (subOpen) { out += '</ul>'; subOpen = false; } if (rootOpen) { out += `</${rootType}>`; rootOpen = false; } };
  let rootType = 'ul';
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const sub = it.indent > 0;
    const tag = it.type === 'ol' ? 'ol' : 'ul';
    if (!sub) {
      if (rootOpen && (rootType !== tag || subOpen)) closeRoot();
      if (!rootOpen) { rootType = tag; out += `<${tag}>`; rootOpen = true; }
      out += `<li>${inline(it.text)}`;
      // ¿siguiente es sub? cerramos li al final del sub o si próximo raíz
      const next = items[i + 1];
      if (next && next.indent > 0) {
        out += `<ul>`;
        while (i + 1 < items.length && items[i + 1].indent > 0) {
          i++;
          out += `<li>${inline(items[i].text)}</li>`;
        }
        out += `</ul>`;
      }
      out += `</li>`;
    }
  }
  closeRoot();
  return out;
}

const isListMarker = (line) => /^\s*(?:[-*+]|\d+\.)\s+/.test(line);

function parseMarkdown(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let title = '';
  let introQuote = null;      // primer blockquote (va a portada)
  let sectionOpen = false;
  let i = 0;
  let pendingImg = null;
  const sections = [];        // para índice
  let sectionNo = 0;
  let subSeq = 0;
  let introDone = false;      // la primera cita (intro) va solo a la portada

  const flushPara = (buf) => {
    if (!buf.length) return;
    const text = buf.join(' ').trim();
    if (!text || /^<!--/.test(text)) { buf.length = 0; return; }
    out.push(`<p>${inline(text)}</p>`);
    buf.length = 0;
  };
  const closeSection = () => { if (sectionOpen) { out.push('</section>'); sectionOpen = false; } };

  while (i < lines.length) {
    const line = lines[i];

    // ---- línea en blanco
    if (!line.trim()) { i++; continue; }

    // ---- comentario GENERAR_IMAGEN
    const gm = line.match(/^<!--\s*GENERAR_IMAGEN:\s*([\w.-]+)\s*-->\s*$/i);
    if (gm) { pendingImg = gm[1]; i++; continue; }
    if (/^<!--/.test(line) || /^-->/.test(line)) { i++; continue; }

    // ---- H1
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) { if (!title) title = h1[1].trim(); i++; continue; }

    // ---- fence
    if (/^```/.test(line.trim())) {
      const lang = line.trim().slice(3).trim() || '';
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
      i++; // cierre
      const code = buf.join('\n');
      if (lang === 'mermaid') {
        const imgName = pendingImg;
        pendingImg = null;
        const resolvedImg = imgName ? (IMG_ALIASES[imgName] || imgName) : null;
        const imgPath = resolvedImg && existsSync(join(IMG_DIR, resolvedImg)) ? join(IMG_DIR, resolvedImg) : null;
        if (imgPath) {
          const b64 = readFileSync(imgPath).toString('base64');
          const cap = humanName(resolvedImg);
          out.push(`<figure class="figura"><img src="data:image/svg+xml;base64,${b64}" alt="${esc(cap)}"/><figcaption class="fig-caption">Figura · ${esc(cap)}</figcaption></figure>`);
        } else {
          out.push(`<pre><code><span class="pre-label">Diagrama · ${esc(imgName || 'mermaid')}</span>${esc(code)}</code></pre>`);
        }
      } else {
        const label = lang ? `<span class="pre-label">${esc(lang)}</span>` : '';
        out.push(`<pre><code>${label}${esc(code)}</code></pre>`);
      }
      continue;
    }

    // ---- HR
    if (/^\s*-{3,}\s*$/.test(line)) { i++; continue; }

    // ---- H2 / H3
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      sectionNo++;
      const id = `s${sectionNo}`;
      const txt = h2[1].trim();
      sections.push({ id, title: txt, subs: [] });
      closeSection();
      out.push(`<section class="seccion" id="${id}"><h2 class="seccion">${inline(txt)}</h2>`);
      sectionOpen = true;
      i++; continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      subSeq++;
      const txt = h3[1].trim();
      const id = `sub${subSeq}`;
      if (sections.length) sections[sections.length - 1].subs.push({ id, title: txt });
      out.push(`<h3 class="sub" id="${id}">${inline(txt)}</h3>`);
      i++; continue;
    }
    const h4 = line.match(/^####\s+(.+)$/);
    if (h4) { out.push(`<h4 class="sub2">${inline(h4[1].trim())}</h4>`); i++; continue; }

    // ---- blockquote
    if (/^>/.test(line)) {
      const q = [];
      while (i < lines.length && /^>/.test(lines[i])) { q.push(lines[i]); i++; }
      const raw = q.map((l) => l.replace(/^>\s?/, '')).join(' ');
      if (!introDone) {
        // primera cita = intro del manual → va a la portada, no al cuerpo
        introQuote = raw;
        introDone = true;
        i = i; // ya avanzado
        continue;
      }
      const cls = detectQuoteClass(raw);
      const tagLabel = QUOTE_TAGS[cls];
      const inner = renderQuoteInner(q);
      out.push(`<blockquote class="${cls}"><span class="tag">${tagLabel}</span>${inner}</blockquote>`);
      continue;
    }

    // ---- tabla
    if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i]) && lines[i].trim() !== '') { rows.push(lines[i].trim()); i++; }
      if (rows.length) {
        const cells = (r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
        const header = cells(rows[0]);
        const body = rows.slice(2).filter((r) => !/^\|[\s:|-]+\|$/.test(r));
        let t = `<div class="table-wrap"><table><thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>`;
        for (const r of body) t += `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`;
        t += `</tbody></table></div>`;
        out.push(t);
      }
      continue;
    }

    // ---- listas
    if (isListMarker(line)) {
      const items = [];
      while (i < lines.length && lines[i].trim() !== '') {
        const l = lines[i];
        const m = l.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (m) {
          const indent = m[1].replace(/\t/g, '  ').length;
          const type = /^\d/.test(m[2]) ? 'ol' : 'ul';
          items.push({ indent, type, text: m[3] });
          i++;
        } else if (/^\s+/.test(l) && items.length) {
          // continuación indentada del ítem anterior
          items[items.length - 1].text += ' ' + l.trim();
          i++;
        } else {
          break;
        }
      }
      out.push(renderListItems(items));
      continue;
    }

    // ---- párrafo
    const buf = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !/^#|^>|^```|^\s*\|/.test(lines[i]) && !isListMarker(lines[i])) {
      buf.push(lines[i].trim());
      i++;
    }
    flushPara(buf);
  }
  closeSection();
  const body = out.join('\n');
  return { title, introQuote, sections, body };
}

/* ======================================================== HTML documento === */
function buildHtml(rel, src) {
  const { title, introQuote, sections, body } = parseMarkdown(src);
  const folder = rel.split(sep)[0];
  const file = rel.split(sep).slice(1).join('-');
  const folderNum = (folder.match(/^(\d+)/) || [])[1] || '';
  const theme = THEMES[folder] || humanName(folder);
  const displayTitle = title.replace(/^Manual\s*[·•:]\s*/i, '').trim() || humanName(file);
  const ruta = `docs/Manuales/${rel.replace(/\\/g, '/')}`;
  const stripNum = (t) => t.replace(/^(\d+(?:\.\d+)*)[.．、:：]?\s*/, '').trim();
  const numOf = (t) => (t.match(/^(\d+(?:\.\d+)*)/) || [])[1] || '';

  const toc = sections.map((s) => {
    const subs = s.subs.length
      ? `<div class="subs">${s.subs.map((sb) => `<a href="#${sb.id}">${esc(sb.title)}</a>`).join('<br>')}</div>`
      : '';
    return `<li><a href="#${s.id}"><span class="tnum">${esc(numOf(s.title))}</span><span>${esc(stripNum(s.title))}</span></a>${subs}</li>`;
  }).join('');

  const introHtml = introQuote
    ? `<div class="intro">${inline(introQuote)}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>TrueKeate · ${esc(displayTitle)}</title>
<style>${CSS}</style>
</head>
<body>

<!-- ============ PORTADA ============ -->
<header class="portada">
  <div class="top">
    <div class="brand">TRUEKEAT<b>☑</b></div>
    <div class="chip-doc">Manual literal · Lenguaje sencillo</div>
  </div>
  <div class="hero">
    <div class="tema-chip">${folderNum ? `${esc(folderNum)} · ` : ''}${esc(theme)}</div>
    <h1>${esc(displayTitle)}</h1>
    ${introHtml}
    <div class="meta">
      <span>Colección: <b>Manuales TrueKeate</b></span>
      <span>Archivo: <b>${esc(rel.replace(/\\/g, '/'))}.md</b></span>
      <span>Edición: <b>${FECHA}</b></span>
    </div>
  </div>
  <div class="paleta">
    <span class="p"><span class="sw" style="background:#1a2b4c"></span>Navy</span>
    <span class="p"><span class="sw" style="background:#2a9d8f"></span>Teal</span>
    <span class="p"><span class="sw" style="background:#48cae4"></span>Cyan</span>
    <span class="p"><span class="sw" style="background:#d4af37"></span>Gold</span>
    <span class="copy">Bóveda Digital Moderna · ${esc(ruta)}</span>
  </div>
</header>

<!-- ============ ÍNDICE ============ -->
<nav class="indice">
  <h2><span class="k">☰</span> Índice de este manual</h2>
  <div class="sub">${esc(theme)} · ${esc(humanName(folder))} — ${esc(displayTitle)}</div>
  <ol>${toc}</ol>
</nav>

<!-- ============ CONTENIDO ============ -->
<main class="content">
${body}
</main>

</body>
</html>`;
  return html;
}

/* ============================================================== ejecución === */
function listManuals() {
  return walk(MD_ROOT)
    .map((p) => ({ rel: p.slice(MD_ROOT.length + 1), abs: p }))
    .sort((a, b) => a.rel.localeCompare(b.rel));
}

mkdirSync(HTML_DIR, { recursive: true });
mkdirSync(PDF_DIR, { recursive: true });

const manuals = listManuals();
const htmls = [];
for (const m of manuals) {
  const outName = m.rel.replace(/\//g, '-').replace(/\.md$/, '') + '.html';
  const src = readFileSync(m.abs, 'utf8');
  const html = buildHtml(m.rel.replace(/\.md$/, ''), src);
  const outPath = join(HTML_DIR, outName);
  writeFileSync(outPath, html, 'utf8');
  htmls.push({ outName, outPath, rel: m.rel });
  console.log('HTML  ', outName);
}

if (process.env.HTML_ONLY) {
  console.log(`\nHTML_ONLY: ${htmls.length} HTML listos en ${HTML_DIR}`);
  process.exit(0);
}

/* ------------------------- fase PDF (Playwright Chromium) ------------------- */
const headerTemplate = `<span></span>`;
const footerTemplate = `
<div style="width:100%;font-size:0;padding-top:4px;">
  <div style="float:left;width:50%;text-align:left;font-family:'DejaVu Sans',sans-serif;font-size:8px;color:#4c6888;letter-spacing:.5px;">
    TRUEKEAT☑ &nbsp;·&nbsp; Manuales en lenguaje sencillo
  </div>
  <div style="float:right;width:50%;text-align:right;font-family:'DejaVu Sans',sans-serif;font-size:8px;color:#1a2b4c;">
    Página <span class="pageNumber"></span> de <span class="totalPages"></span>
  </div>
</div>`;

let browser = null;
let pdfOk = true;
for (let attempt = 1; attempt <= 2 && pdfOk; attempt++) {
  pdfOk = false;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    });
    const context = await browser.newContext({ viewport: { width: 1240, height: 1754 } });
    const results = [];
    for (const h of htmls) {
      const pdfName = h.outName.replace(/\.html$/, '.pdf');
      const pdfPath = join(PDF_DIR, pdfName);
      const page = await context.newPage();
      await page.setContent(readFileSync(h.outPath, 'utf8'), { waitUntil: 'load' });
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: { top: '15mm', bottom: '16mm', left: '14mm', right: '14mm' },
      });
      await page.close();
      results.push(pdfName);
      console.log('PDF   ', pdfName);
    }
    pdfOk = results.length === htmls.length;
    if (pdfOk) console.log(`\n✔ ${results.length} PDF generados en ${PDF_DIR}`);
    else console.log('✖ No se generaron todos los PDF (intento ' + attempt + ')');
  } catch (err) {
    console.error(`✖ Error en intento ${attempt}: ${err.message}`);
    try { await browser?.close(); } catch {}
    browser = null;
    if (attempt === 2) {
      // fallback documentado
      const readme = `# PDF de manuales — fallback HTML

Chromium (Playwright) no fue estable en este entorno tras 2 intentos, así que se
dejaron los **HTML autocontenidos y estilizados** en \`html/\` con el mismo
nombre que tendría el PDF (\`<carpeta>-<archivo>.html\`).

## Exportar a PDF manualmente (comando exacto)

Desde la carpeta \`web/\` del proyecto, con Playwright ya instalado:

\`\`\`bash
cd web

export LD_LIBRARY_PATH=/tmp/playwright-libs/extracted/usr/lib/x86_64-linux-gnu:/tmp/playwright-libs/extracted/lib/x86_64-linux-gnu:\$LD_LIBRARY_PATH
export FONTCONFIG_PATH=/tmp/fontconfig
export FONTCONFIG_FILE=/tmp/fontconfig/fonts.conf

node scripts/generar-pdfs.mjs
\`\`\`

El script lee \`docs/Manuales/**/*.md\`, regenera los HTML y produce cada PDF
A4 en \`docs/Manuales/pdf/<carpeta>-<archivo>.pdf\` con portada, índice,
headers/footers y la paleta TrueKeate (navy/teal/cyan/gold).
`;
      writeFileSync(join(PDF_DIR, 'README.md'), readme, 'utf8');
      console.log('→ Fallback: HTML estilizados listos en', HTML_DIR, 'y README.md documentado.');
    }
  }
}
if (browser) await browser.close().catch(() => {});
