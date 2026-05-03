// Bharat eVote — client runtime. Vanilla JS. Zero deps.
const STORAGE_LANG = 'be:lang';

let currentLang = localStorage.getItem(STORAGE_LANG) || (navigator.language?.startsWith('hi') ? 'hi' : 'en');
let dict = {};

async function loadLang(lang) {
  try {
    const r = await fetch(`/i18n/${lang}.json`, { cache: 'force-cache' });
    if (!r.ok) throw new Error('lang');
    dict = await r.json();
    currentLang = lang;
    localStorage.setItem(STORAGE_LANG, lang);
    document.documentElement.lang = lang;
  } catch (e) {
    if (lang !== 'en') return loadLang('en');
  }
}

function t(path, vars) {
  const v = path.split('.').reduce((o, k) => (o == null ? null : o[k]), dict) ?? path;
  if (!vars) return v;
  return String(v).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function applyI18n(root) {
  const r = root || document;
  r.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  r.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const pairs = el.dataset.i18nAttr.split(',').map(s => s.trim());
    for (const p of pairs) {
      const [attr, key] = p.split(':').map(s => s.trim());
      el.setAttribute(attr, t(key));
    }
  });
}

function langSwitcher() {
  const btn = document.querySelector('.lang-toggle');
  if (!btn) return;
  btn.textContent = currentLang === 'en' ? 'हिन्दी' : 'English';
  btn.setAttribute('aria-label', currentLang === 'en' ? 'Switch to Hindi' : 'Switch to English');
  btn.addEventListener('click', async () => {
    const next = currentLang === 'en' ? 'hi' : 'en';
    await loadLang(next);
    applyI18n();
    btn.textContent = next === 'en' ? 'हिन्दी' : 'English';
    document.dispatchEvent(new CustomEvent('be:lang', { detail: { lang: next } }));
  });
}

async function api(path, opts) {
  const o = opts || {};
  const r = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    ...o,
    body: o.body && typeof o.body !== 'string' ? JSON.stringify(o.body) : o.body
  });
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('json') ? await r.json() : await r.text();
  if (!r.ok) {
    const err = new Error(data?.error?.message || `HTTP ${r.status}`);
    err.code = data?.error?.code;
    err.status = r.status;
    throw err;
  }
  return data;
}

function el(tag, props, ...children) {
  const e = document.createElement(tag);
  const p = props || {};
  for (const [k, v] of Object.entries(p)) {
    if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    e.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return e;
}

function fmtInt(n) { return Number(n || 0).toLocaleString(currentLang === 'hi' ? 'hi-IN' : 'en-IN'); }

function toast(msg, kind) {
  const k = kind === 'good' ? 'good' : kind === 'warn' ? 'warn' : kind === 'bad' ? 'bad' : 'good';
  const x = el('div', { class: `alert alert-${k}`, role: 'status', 'aria-live': 'polite' }, msg);
  x.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:24px;z-index:200;box-shadow:var(--shadow-lg);max-width:min(560px,calc(100vw - 24px))';
  document.body.appendChild(x);
  setTimeout(() => x.remove(), 4500);
}

function maybeRegisterSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

function highlightCurrentNav() {
  const here = location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav .lnk').forEach(a => {
    const href = (a.getAttribute('href') || '').replace(/\/$/, '') || '/';
    if (href === here) a.setAttribute('aria-current', 'page');
  });
}

async function boot() {
  await loadLang(currentLang);
  applyI18n();
  langSwitcher();
  highlightCurrentNav();
  maybeRegisterSW();
}

window.BE = { t, api, el, fmtInt, toast, boot, get lang() { return currentLang; }, applyI18n };
document.addEventListener('DOMContentLoaded', boot);
