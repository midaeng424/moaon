/* 모아온 공통 도구 — 서버 연결 · 알림 · 창 · 로딩 · 파일 · 날짜 */
(function () {
  const MO = (window.MO = {});
  const CFG = window.MOAON_CONFIG || {};

  /* ---------- 저장소 (실패해도 앱은 동작) ---------- */
  MO.store = {
    get(k, d) { try { const v = localStorage.getItem('moaon:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('moaon:' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem('moaon:' + k); } catch (e) {} }
  };

  /* ---------- 서버 호출 ---------- */
  /** 탭을 닫으면 지워지는 저장소 (관리자 로그인용) */
  MO.sstore = {
    get(k, d) { try { const v = sessionStorage.getItem('moaon:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { sessionStorage.setItem('moaon:' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem('moaon:' + k); } catch (e) {} }
  };
  let tokenKey = 'token', tokenSession = false;
  MO.setTokenKey = (k, session) => { tokenKey = k; tokenSession = !!session; };
  MO.token = () => (tokenSession ? MO.sstore : MO.store).get(tokenKey, '');
  /** 사진을 정사각형으로 잘라 작게 줄여요 (프로필용) */
  MO.squarePhoto = (file, size = 200, q = 0.82) => new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; const k = Math.min(im.naturalWidth, im.naturalHeight), sx = (im.naturalWidth - k) / 2, sy = (im.naturalHeight - k) / 2; c.getContext('2d').drawImage(im, sx, sy, k, k, 0, 0, size, size); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q)); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('사진을 읽지 못했어요. 다른 사진을 골라 주세요.')); };
    im.src = url;
  });
  MO.onAuthFail = null;
  MO.api = async function (action, data = {}, opt = {}) {
    const url = CFG.API_URL;
    if (!url || /여기에|YOUR_/.test(url)) throw new Error('config.js 파일에 서버 주소(API_URL)를 넣어 주세요.');
    const showLoader = opt.loader !== false;
    let timer = showLoader ? setTimeout(() => MO.loader(true), 350) : null;
    try {
      let res;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await fetch(url, { method: 'POST', redirect: 'follow', body: JSON.stringify({ action, data, token: opt.token ?? MO.token() }) });
          break;
        } catch (e) {
          if (attempt === 1) throw new Error(navigator.onLine === false ? '인터넷 연결을 확인해 주세요.' : '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
          await new Promise(r => setTimeout(r, 800));
        }
      }
      let j;
      try { j = await res.json(); } catch (e) { throw new Error('서버 응답을 읽지 못했어요. 배포 주소와 액세스 설정(모든 사용자)을 확인해 주세요.'); }
      if (!j.ok) {
        const err = new Error(j.error || '문제가 생겼어요.'); err.code = j.code;
        if ((j.code === 'AUTH' || j.code === 'PWCHANGE') && MO.onAuthFail) MO.onAuthFail(err);
        throw err;
      }
      return j.data;
    } finally {
      if (timer) clearTimeout(timer);
      if (showLoader) MO.loader(false);
    }
  };

  /* ---------- 로딩 ---------- */
  let loadN = 0;
  MO.loader = function (on) {
    loadN = Math.max(0, loadN + (on ? 1 : -1));
    let el = document.getElementById('loader');
    if (loadN > 0 && !el) {
      el = document.createElement('div'); el.id = 'loader';
      el.innerHTML = `<div class="box"><div class="pair"><img src="${MO.asset('face_roi.webp')}" alt=""><img src="${MO.asset('face_moa.webp')}" alt=""></div>잠깐만요…</div>`;
      document.body.appendChild(el);
    } else if (loadN === 0 && el) el.remove();
  };
  MO.asset = (n) => (window.MOAON_BASE || '') + 'assets/img/' + n;

  /* ---------- 알림 ---------- */
  MO.toast = function (msg, kind) {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg;
    box.appendChild(t); setTimeout(() => t.remove(), kind === 'err' ? 4200 : 2600);
  };
  MO.err = (e) => MO.toast(e && e.message ? e.message : String(e), 'err');

  /* ---------- 창 (모달) ---------- */
  MO.modal = function ({ title, body, foot, wide, onClose }) {
    const sc = document.createElement('div'); sc.className = 'scrim';
    sc.innerHTML = `<div class="modal ${wide === 'x' ? 'wide xwide' : wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-h"><h3></h3><button class="modal-x" aria-label="닫기">✕</button></div><div class="modal-b"></div>${foot !== false ? '<div class="modal-f"></div>' : ''}</div>`;
    sc.querySelector('h3').textContent = title || '';
    const b = sc.querySelector('.modal-b'); if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
    const f = sc.querySelector('.modal-f'); if (f && foot) { if (typeof foot === 'string') f.innerHTML = foot; else f.appendChild(foot); }
    const close = () => { sc.remove(); document.removeEventListener('keydown', esc); onClose && onClose(); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    sc.querySelector('.modal-x').onclick = close;
    sc.addEventListener('mousedown', (e) => { if (e.target === sc) sc._down = true; });
    sc.addEventListener('click', (e) => { if (e.target === sc && sc._down) close(); sc._down = false; });
    document.addEventListener('keydown', esc);
    document.body.appendChild(sc);
    return { el: sc, body: b, foot: f, close };
  };
  MO.confirm = function (msg, { ok = '확인', cancel = '취소', danger = false, title = '확인해 주세요' } = {}) {
    return new Promise((res) => {
      const m = MO.modal({ title, body: `<p style="margin:0;font-weight:600;line-height:1.6">${MO.esc(msg).replace(/\n/g, '<br>')}</p>`, foot: `<button class="btn o" data-v="0">${MO.esc(cancel)}</button><button class="btn ${danger ? 'r' : ''}" data-v="1">${MO.esc(ok)}</button>`, onClose: () => res(false) });
      m.foot.querySelectorAll('button').forEach(b => b.onclick = () => { const v = b.dataset.v === '1'; m.el.remove(); res(v); });
    });
  };
  MO.alert = function (title, html) {
    return new Promise((res) => {
      const m = MO.modal({ title, body: html, foot: `<button class="btn">확인</button>`, onClose: res });
      m.foot.querySelector('button').onclick = () => { m.el.remove(); res(); };
    });
  };
  /* 간단한 입력 창: fields [{key,label,type,value,options,placeholder,required,full}] */
  MO.form = function ({ title, fields, submit = '저장', danger, extra, wide }) {
    return new Promise((res) => {
      const wrap = document.createElement('div'); wrap.style.cssText = 'display:grid;gap:12px';
      let grid = null;
      fields.forEach((fd) => {
        const id = 'f_' + fd.key + '_' + Math.random().toString(36).slice(2, 7);
        const el = document.createElement('label'); el.className = 'fld'; el.htmlFor = id;
        let input;
        if (fd.type === 'select') {
          input = `<select class="inp" id="${id}">${(fd.options || []).map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${MO.esc(v)}" ${String(v) === String(fd.value ?? '') ? 'selected' : ''}>${MO.esc(l)}</option>`; }).join('')}</select>`;
        } else if (fd.type === 'textarea') {
          input = `<textarea class="inp" id="${id}" placeholder="${MO.esc(fd.placeholder || '')}">${MO.esc(fd.value ?? '')}</textarea>`;
        } else if (fd.type === 'checkbox') {
          el.className = 'check'; el.innerHTML = `<input type="checkbox" id="${id}" ${fd.value ? 'checked' : ''}> ${MO.esc(fd.label)}`;
        } else if (fd.type === 'color') {
          const cur = fd.value || '#eea21f', inPal = MO.PALETTE.includes(cur.toLowerCase());
          input = `<div class="pal"><div class="palg">${MO.PALETTE.map((c, i) => `<button type="button" class="pc ${c === cur.toLowerCase() ? 'on' : ''}" data-c="${c}" style="--c:${c}" aria-label="${c}"></button>${i === 11 ? `<label class="pc pcx ${inPal ? '' : 'on'}" title="직접 고르기" style="--c:${inPal ? 'transparent' : cur}"><input type="color" value="${MO.esc(cur)}" data-cx></label>` : ''}`).join('')}</div>
            <div class="palp"><span class="pv" style="--c:${cur}">가</span><span class="note">선택한 색 <b data-hex>${MO.esc(cur)}</b> · 무지개 칸을 누르면 원하는 색을 직접 고를 수 있어요</span></div></div><input type="hidden" id="${id}" value="${MO.esc(cur)}">`;
        } else {
          const t = fd.type === 'money' ? 'text' : (fd.type || 'text');
          input = `<input class="inp" id="${id}" type="${t}" ${fd.type === 'money' || fd.type === 'number' ? 'inputmode="numeric"' : ''} value="${MO.esc(fd.type === 'money' && fd.value ? MO.comma(fd.value) : (fd.value ?? ''))}" placeholder="${MO.esc(fd.placeholder || '')}" ${fd.max ? `maxlength="${fd.max}"` : ''} autocomplete="off">`;
        }
        if (fd.type !== 'checkbox') el.innerHTML = `<span>${MO.esc(fd.label)}${fd.required ? ' *' : ''}</span>${input}${fd.hint ? `<small style="color:var(--sub);font-weight:600">${MO.esc(fd.hint)}</small>` : ''}`;
        el.dataset.key = fd.key; el.dataset.type = fd.type || 'text';
        if (fd.half) { if (!grid) { grid = document.createElement('div'); grid.className = 'row2'; wrap.appendChild(grid); } grid.appendChild(el); if (grid.children.length === 2) grid = null; }
        else { grid = null; wrap.appendChild(el); }
        if (fd.type === 'money') { const inp = el.querySelector('input'); inp.addEventListener('input', () => { const n = MO.parseNum(inp.value); inp.value = n ? MO.comma(n) : ''; }); }
        if (fd.type === 'color') {
          const hid = el.querySelector('input[type=hidden]'), cx = el.querySelector('[data-cx]'), lab = cx.parentElement;
          const pick = (c, btn) => { c = MO.safeColor(c); hid.value = c; cx.value = c; el.querySelectorAll('.pc').forEach(x => x.classList.toggle('on', x === btn)); el.querySelector('.pv').style.setProperty('--c', c); el.querySelector('[data-hex]').textContent = c; if (btn === lab) lab.style.setProperty('--c', c); };
          el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => pick(b.dataset.c, b));
          cx.oninput = () => pick(cx.value, lab);
        }
      });
      if (extra) { const ex = typeof extra === 'string' ? Object.assign(document.createElement('div'), { innerHTML: extra }) : extra; wrap.appendChild(ex); }
      const m = MO.modal({ title, body: wrap, wide, foot: `<button class="btn o" data-v="0">취소</button><button class="btn ${danger ? 'r' : ''}" data-v="1">${MO.esc(submit)}</button>`, onClose: () => res(null) });
      const collect = () => {
        const out = {};
        wrap.querySelectorAll('[data-key]').forEach(el => {
          const k = el.dataset.key, t = el.dataset.type, inp = t === 'color' ? el.querySelector('input[type=hidden]') : el.querySelector('input,select,textarea');
          out[k] = t === 'checkbox' ? inp.checked : t === 'money' || t === 'number' ? MO.parseNum(inp.value) : inp.value.trim();
        });
        return out;
      };
      m.foot.querySelector('[data-v="0"]').onclick = () => { m.el.remove(); res(null); };
      m.foot.querySelector('[data-v="1"]').onclick = () => {
        const v = collect();
        const miss = fields.find(f => f.required && (v[f.key] === '' || v[f.key] == null));
        if (miss) { MO.toast(miss.label + '을(를) 입력해 주세요.', 'err'); return; }
        m.el.remove(); res(v);
      };
      setTimeout(() => { const first = wrap.querySelector('input:not([type=hidden]),select,textarea'); first && first.focus(); }, 50);
    });
  };

  /* ---------- 글자 · 숫자 · 날짜 ---------- */
  MO.esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  MO.comma = (n) => Math.round(Number(n) || 0).toLocaleString('ko-KR');
  MO.won = (n) => '₩' + MO.comma(n);
  MO.parseNum = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
  MO.today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  MO.addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  MO.dow = (s) => new Date(s + 'T00:00:00Z').getUTCDay();
  MO.lastSunday = (s) => MO.addDays(s || MO.today(), -MO.dow(s || MO.today()));
  MO.md = (s) => s ? (Number(s.slice(5, 7)) + '/' + Number(s.slice(8, 10))) : '';
  MO.mdK = (s) => s ? (Number(s.slice(5, 7)) + '월 ' + Number(s.slice(8, 10)) + '일') : '';
  MO.dowK = (s) => '일월화수목금토'[MO.dow(s)];
  MO.age = (b) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(b || '')) return ''; const t = MO.today(); let a = +t.slice(0, 4) - +b.slice(0, 4); if (t.slice(5) < b.slice(5)) a--; return a; };

  /* ---------- 파일 ---------- */
  MO.fileToBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
  MO.resizeImage = (file, max = 1600, q = 0.82) => new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img; const s = Math.min(1, max / Math.max(w, h)); w = Math.round(w * s); h = Math.round(h * s);
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('사진을 읽지 못했어요. JPG나 PNG로 올려 주세요.')); };
    img.src = url;
  });
  MO.b64ToBlob = (b64, mime) => { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); };
  /** 반 색상표: 흰 글자가 잘 보이는 중간 밝기 24색 */
  MO.PALETTE = ['#ee8b72', '#e5675a', '#e0607e', '#d36aa8', '#b06ad9', '#8b6cf0', '#6d7fe0', '#5b9bd5', '#2f9fd0', '#1aa9b8', '#17a98f', '#3fae6a',
    '#78a744', '#9aa63a', '#d9a21a', '#eea21f', '#e8861a', '#d4863c', '#c0703c', '#9a6b4b', '#7d5a44', '#7f8796', '#5f7a8c', '#4a6fa5'];
  /** 너무 밝은 색은 흰 글자가 보이도록 조금 진하게 */
  MO.safeColor = (hex) => {
    let m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return '#eea21f';
    let [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    for (let k = 0; k < 20 && (1.05 / (lum(r, g, b) + 0.05)) < 2.4; k++) { r = Math.round(r * 0.92); g = Math.round(g * 0.92); b = Math.round(b * 0.92); }
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  };
  /** 전화번호 모양 맞추기 (숫자만 있을 때만) */
  MO.fmtPhone = (v) => {
    v = String(v || '').trim(); if (!v || !/^[\d\s\-.()+]+$/.test(v)) return v;
    let d = v.replace(/\D/g, ''); if (/^1\d{8,9}$/.test(d)) d = '0' + d;
    const dash = (a, b) => d.slice(0, a) + '-' + d.slice(a, b) + '-' + d.slice(b);
    if (/^01\d{8,9}$/.test(d)) return d.length === 11 ? dash(3, 7) : dash(3, 6);
    if (/^02\d{7,8}$/.test(d)) return d.length === 10 ? dash(2, 6) : dash(2, 5);
    if (/^0\d{9,10}$/.test(d)) return d.length === 11 ? dash(3, 7) : dash(3, 6);
    return v;
  };
  document.addEventListener('change', (e) => { const t = e.target; if (t && t.matches && t.matches('input[type=tel][data-k="phone"], input[type=tel][data-k="parentPhone"]')) t.value = MO.fmtPhone(t.value); });
  MO.download = (name, blob) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); };
  MO.csv = (name, rows) => {
    const s = rows.map(r => r.map(v => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
    MO.download(name, new Blob(['﻿' + s], { type: 'text/csv;charset=utf-8' }));
  };

  /* ---------- 소리 · 읽어 주기 ---------- */
  let AC;
  MO.sound = MO.store.get('sound', true);
  MO.tone = (seq) => {
    if (!MO.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime + .02;
      seq.forEach(([f, d, type]) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.value = f; const v = type === 'square' ? .05 : .18; g.gain.setValueAtTime(.0001, t + d); g.gain.exponentialRampToValueAtTime(v, t + d + .02); g.gain.exponentialRampToValueAtTime(.0001, t + d + .28); o.connect(g).connect(AC.destination); o.start(t + d); o.stop(t + d + .32); });
    } catch (e) {}
  };
  MO.snd = { ok: () => MO.tone([[784, 0], [1175, .1]]), bad: () => MO.tone([[196, 0, 'square'], [165, .13, 'square']]), win: () => MO.tone([[523, 0], [659, .13], [784, .26], [1047, .39], [1319, .52]]), tap: () => MO.tone([[880, 0, 'triangle']]) };
  MO.speak = (text) => {
    if (!('speechSynthesis' in window)) { MO.toast('이 기기에서는 읽어 주기를 쓸 수 없어요'); return; }
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = .85;
    const ko = speechSynthesis.getVoices().find(v => /^ko/i.test(v.lang)); if (ko) u.voice = ko; speechSynthesis.speak(u);
  };
  MO.hush = () => { try { speechSynthesis.cancel(); } catch (e) {} };
  MO.refSpeech = (ref) => ref.replace(/(\d+):(\d+)/, '$1장 $2절');

  /* ---------- 꽃가루 ---------- */
  MO.confetti = (big) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:400;width:100%;height:100%'; document.body.appendChild(c);
    const x = c.getContext('2d'), dpr = devicePixelRatio || 1; c.width = innerWidth * dpr; c.height = innerHeight * dpr; x.scale(dpr, dpr);
    const cols = ['#f5b335', '#78a744', '#ee8b72', '#d4863c', '#5b9bd5', '#ffd77a'], N = big ? 170 : 90;
    const ps = Array.from({ length: N }, () => ({ x: innerWidth * (.15 + Math.random() * .7), y: -20 - Math.random() * innerHeight * .3, vx: (Math.random() - .5) * 4, vy: 2 + Math.random() * 4, s: 7 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[Math.random() * 6 | 0], o: Math.random() < .4 }));
    const t0 = performance.now();
    (function f(t) { const k = (t - t0) / 1000; x.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach(p => { p.vy += .06; p.x += p.vx + Math.sin(k * 3 + p.r) * .6; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - Math.max(0, k - 2)); x.fillStyle = p.c; if (p.o) { x.beginPath(); x.arc(0, 0, p.s / 2, 0, 7); x.fill(); } else x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
      if (k < 3) requestAnimationFrame(f); else c.remove(); })(t0);
  };

  /* ---------- 홈 화면 앱 (PWA) ---------- */
  MO.installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); MO.installPrompt = e; document.dispatchEvent(new Event('moaon:installable')); });
  MO.isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  MO.isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register((window.MOAON_BASE || '') + 'sw.js').catch(() => {}));
  }

  /* ---------- 아이콘 ---------- */
  const P = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    home: '<path d="M4 11l8-7 8 7v9H4z"/>', dash: '<rect x="3" y="3" width="8" height="8" rx="2.5"/><rect x="13" y="3" width="8" height="5" rx="2.5"/><rect x="13" y="10" width="8" height="11" rx="2.5"/><rect x="3" y="13" width="8" height="8" rx="2.5"/>',
    att: '<rect x="3.5" y="5" width="17" height="15" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4"/>', off: '<path d="M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 9V7a4 4 0 0 1 8 0v2M12 13v4"/>',
    tal: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9h6M12 9v7"/>', acc: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    ver: '<path d="M3 5.5C6 4 9 4 12 6c3-2 6-2 9-.5v13c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5zM12 6v13"/>', ros: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="10" r="3"/><path d="M7.5 17.5c.8-2 2.4-3 4.5-3s3.7 1 4.5 3"/>',
    cls: '<rect x="3" y="4" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="4" width="7.5" height="7.5" rx="2"/><rect x="3" y="14" width="7.5" height="7" rx="2"/><path d="M17.2 14v7M13.7 17.5h7"/>',
    perm: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>', backup: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5"/><path d="M12 12v8M9 15l3-3 3 3"/>',
    report: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>', more: '<path d="M4 7h16M4 12h16M4 17h16"/>', user: '<circle cx="12" cy="8.5" r="4"/><path d="M4 20c1.2-4 4.2-6 8-6s6.8 2 8 6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', clip: '<path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7-7L13 4.5a3.3 3.3 0 0 1 4.7 4.7l-8.2 8.2a1.7 1.7 0 0 1-2.4-2.4L14.6 7.5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
    spk: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>', cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5"/><path d="M12 12v8M9 15l3-3 3 3"/>',
    down: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor" stroke="none"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>', trophy: '<path d="M7 3h10v5a5 5 0 0 1-10 0zM7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10M10.5 13h3v4h-3zM7.5 18h9v3h-9z"/>',
    fire: '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-5 3-6 0 2 1 3 2 3-1-3 0-7 1-9z" fill="#ef8a2b" stroke="none"/><path d="M12 13c.6 2 3 2.6 3 5a3 3 0 0 1-6 0c0-1.5.8-2.5 1.6-3 0 1 .6 1.5 1 1.5-.4-1.2 0-2.5.4-3.5z" fill="#ffd25e" stroke="none"/>',
    coin: '<circle cx="12" cy="12" r="10" fill="#f5b335" stroke="none"/><text x="12" y="16.5" text-anchor="middle" font-size="12" font-weight="900" fill="#8a5410" stroke="none" font-family="Pretendard, sans-serif">T</text>',
    book: '<path d="M3 5.5C6 4 9 4 12 6c3-2 6-2 9-.5v13c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z" fill="#78a744" stroke="none"/><path d="M12 6v13" stroke="#fff" stroke-width="1.6"/>',
    heart: '<path d="M12 21s-8.5-5.2-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.8 12 21 12 21z" fill="#f0625a" stroke="none"/>',
    sound: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>', mute: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9.5l4 5M21 9.5l-4 5"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7"/>', dots: '<circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/>'
  };
  MO.icon = (k, size = 20, extra = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[k] || ''}</svg>`;
})();
