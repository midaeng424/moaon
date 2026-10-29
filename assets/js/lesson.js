/* 말씀 레슨 — 듣기 · 빈칸 · 블록 순서 · 장절 · 바른 말씀 · 짝 맞추기 */
(function () {
  const L = (window.MOLesson = {});
  const esc = (s) => MO.esc(s);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const shuffleNot = (a) => { if (a.length < 2) return a.slice(); let b, n = 0; do { b = shuffle(a); n++; } while (n < 20 && b.every((x, i) => x === a[i])); return b; };
  const pick = (a, n) => shuffle(a).slice(0, n);
  const PRAISE = ['훌륭해요!', '잘했어요!', '완벽해요!', '멋져요!', '최고예요!'];
  const CHEER = ['로이가 박수 쳐요!', '모아도 기뻐해요!', '말씀이 쏙 들어왔어요!', '하나님이 기뻐하실 거예요!'];
  const TITLES = { intro: '새 말씀을 만나요', blank: '빈칸에 들어갈 말을 골라요', order: '말씀을 순서대로 놓아요', ref: '이 말씀은 어디에 있을까요?', pick: '바른 말씀을 골라요', match: '짝을 맞춰요' };
  const img = (n, cls = '') => `<img class="${cls}" src="${MO.asset(n)}" alt="" draggable="false">`;

  let POOL = [], ALLW = [], S = null;
  function distract(exclude, n, near) {
    const ex = new Set(exclude); let p = shuffle(ALLW.filter(w => !ex.has(w) && w.length >= 2));
    if (near) p.sort((a, b) => Math.abs(a.length - near.length) - Math.abs(b.length - near.length));
    return p.slice(0, n);
  }
  const chunk = (words, max) => { const size = Math.ceil(words.length / max), o = []; for (let i = 0; i < words.length; i += size) o.push(words.slice(i, i + size).join(' ')); return o; };
  const exBlank = (V, idx) => { const w = V.text.split(' '); return { type: 'blank', V, idx, ans: w[idx], opts: shuffle([w[idx], ...distract(w, 3, w[idx])]) }; };
  function exOrder(V, part) {
    const w = V.text.split(' '), h = Math.ceil(w.length / 2); let seg = w, before = '', after = '';
    if (part === 'a') { seg = w.slice(0, h); after = w.slice(h).join(' '); }
    if (part === 'b') { seg = w.slice(h); before = w.slice(0, h).join(' '); }
    const tiles = chunk(seg, part ? 6 : 8), extra = part ? distract(w, 1) : [];
    return { type: 'order', V, part, tiles, bank: shuffleNot(tiles.concat(extra)).map((t, id) => ({ id, t })), before, after };
  }
  const exRef = (V) => ({ type: 'ref', V, opts: shuffle([V.ref, ...pick([...new Set(POOL.filter(x => x.ref !== V.ref).map(x => x.ref))], 3)]) });
  function exPick(V) {
    const w = V.text.split(' '); let s = 0, e = w.length; if (w.length > 10) { s = Math.random() * (w.length - 9) | 0; e = s + 10; }
    const f = w.slice(s, e), cand = shuffle(f.map((_, i) => i).filter(i => f[i].length >= 2)); const d = distract(w, 2, f[cand[0]]);
    const v1 = f.slice(), v2 = f.slice(); v1[cand[0]] = d[0]; v2[cand[1] ?? cand[0]] = d[1] || d[0];
    const mk = (a) => (s > 0 ? '… ' : '') + a.join(' ') + (e < w.length ? ' …' : '');
    return { type: 'pick', V, opts: shuffle([{ t: mk(f), ok: true }, { t: mk(v1) }, { t: mk(v2) }]), ans: mk(f) };
  }
  const exMatch = (vs) => ({ type: 'match', pairs: vs.map((V, i) => ({ i, l: V.ref, r: V.text.split(' ').slice(0, 2).join(' ') + ' …' })) });
  function buildVerse(V) {
    const w = V.text.split(' '), cand = shuffle(w.map((_, i) => i).filter(i => w[i].length >= 2)), long = w.length > 9;
    const ex = [{ type: 'intro', V }, exBlank(V, cand[0] ?? 0)];
    if (long) ex.push(exOrder(V, 'a'), exOrder(V, 'b'));
    ex.push(exRef(V), exBlank(V, cand[1] ?? cand[0] ?? 0), exPick(V), exOrder(V, null));
    return ex;
  }
  function buildReview(vs) {
    const mid = [];
    vs.forEach((V, i) => { mid.push(i % 2 ? exPick(V) : exRef(V)); mid.push(exOrder(V, null)); });
    return [exMatch(vs), ...shuffle(mid)];
  }

  L._state = () => S; // 자동 테스트용
  /* opt: { verse, weekVerses, week, review, pool, onFinish(result)->Promise<{gained}> } */
  L.start = function (opt) {
    POOL = opt.pool || []; ALLW = [...new Set(POOL.flatMap(v => v.text.split(' ')))];
    S = { opt, q: opt.review ? buildReview(opt.weekVerses) : buildVerse(opt.verse), i: 0, hearts: 5, good: 0, answered: 0, first: 0, phase: 'ask', sel: null, ans: [], m: null };
    const el = document.createElement('div'); el.className = 'lesson'; el.id = 'lesson';
    el.innerHTML = `<div class="lx-head"><button class="x" data-a="quit" aria-label="그만하기">${MO.icon('plus', 26, 'style="transform:rotate(45deg)"')}</button><div class="prog"><i id="lxPg"></i></div><span class="hearts" id="lxH">${MO.icon('heart', 24)}<span>5</span></span></div>
      <div class="lx-main" id="lxMain"></div>
      <div class="lx-foot" id="lxFoot"><div class="fb" id="lxFb"></div><button class="btn lg block" id="lxBtn" data-a="check">확인</button></div>`;
    document.body.appendChild(el); document.body.style.overflow = 'hidden';
    el.addEventListener('click', onClick);
    render();
  };
  const $ = (s) => document.querySelector(s);
  const cur = () => S.q[S.i];
  function setProg() { const rem = S.q.length - S.i; $('#lxPg').style.width = Math.max(4, S.good / (S.good + rem) * 100) + '%'; }
  function render() {
    const ex = cur(); S.phase = 'ask'; S.sel = null; S.ans = [];
    const foot = $('#lxFoot'); foot.className = 'lx-foot'; $('#lxFb').innerHTML = '';
    const btn = $('#lxBtn'); btn.hidden = false; btn.textContent = ex.type === 'intro' ? '계속' : '확인'; btn.dataset.a = 'check';
    let h = `<h2 class="lx-title">${TITLES[ex.type]}</h2>`;
    if (ex.type === 'intro') h = `<div class="tagnew">${MO.icon('star', 18)}새 말씀</div>` + h + `<div class="bub">${img('roi.webp')}<div class="b"><span class="ref">로이: 같이 읽어 볼까?</span><b style="color:var(--mane)">${esc(ex.V.ref)}</b><br>${esc(ex.V.text)}<br><button class="spk" data-a="say" aria-label="듣기">${MO.icon('spk', 24)}</button></div></div><p style="color:var(--sub);margin:0;font-size:14.5px;font-weight:700">스피커를 눌러 듣고, 소리 내어 따라 읽어 보세요.</p>`;
    if (ex.type === 'blank') { const w = ex.V.text.split(' '); h += `<div class="vcard"><span class="ref">${esc(ex.V.ref)}</span>${w.map((x, i) => i === ex.idx ? '<span class="gap empty" id="lxGap">&nbsp;</span>' : esc(x)).join(' ')}</div><div class="opts two">${ex.opts.map((o, k) => `<button class="opt" data-a="sel" data-k="${k}" aria-pressed="false">${esc(o)}</button>`).join('')}</div>`; }
    if (ex.type === 'order') h += `<div class="bub" style="margin-bottom:10px">${img('moa.webp')}<div class="b"><span class="ref">${esc(ex.V.ref)}</span>${ex.part === 'a' ? '앞부분을 만들어 볼까? 천천히 해도 괜찮아!' : ex.part === 'b' ? '이번엔 뒷부분이야!' : '말씀 전체를 만들어 봐!'}<button class="spk sm" data-a="say" aria-label="듣기">${MO.icon('spk', 18)}</button></div></div>${ex.before ? `<p class="ctx">${esc(ex.before)}</p>` : ''}<div class="ans" id="lxAns"></div>${ex.after ? `<p class="ctx">${esc(ex.after)}</p>` : ''}<div class="bank" id="lxBank"></div>`;
    if (ex.type === 'ref') h += `<div class="bub">${img('roi.webp')}<div class="b">${esc(ex.V.text)}</div></div><div class="opts">${ex.opts.map((o, k) => `<button class="opt" data-a="sel" data-k="${k}" aria-pressed="false"><span class="k">${k + 1}</span>${esc(o)}</button>`).join('')}</div>`;
    if (ex.type === 'pick') h += `<p style="margin:-6px 0 14px;color:var(--mane);font-weight:900">${esc(ex.V.ref)}</p><div class="opts">${ex.opts.map((o, k) => `<button class="opt small" data-a="sel" data-k="${k}" aria-pressed="false"><span class="k">${k + 1}</span><span>${esc(o.t)}</span></button>`).join('')}</div>`;
    if (ex.type === 'match') { S.m = { l: null, r: null, done: new Set(), rOrder: shuffle(ex.pairs.map(p => p.i)) }; h += `<div class="match"><div class="col">${shuffle(ex.pairs).map(p => `<button class="opt" data-a="ml" data-i="${p.i}" aria-pressed="false">${esc(p.l)}</button>`).join('')}</div><div class="col">${S.m.rOrder.map(i => `<button class="opt" data-a="mr" data-i="${i}" aria-pressed="false">${esc(ex.pairs[i].r)}</button>`).join('')}</div></div>`; }
    $('#lxMain').innerHTML = h; $('#lxMain').scrollTop = 0;
    if (ex.type === 'order') drawOrder();
    btn.disabled = ex.type !== 'intro'; if (ex.type === 'match') btn.hidden = true;
    setProg();
  }
  function drawOrder() {
    const ex = cur(), used = new Set(S.ans);
    $('#lxAns').innerHTML = S.ans.map(id => `<button class="tile" data-a="unt" data-id="${id}">${esc(ex.bank[id].t)}</button>`).join('');
    $('#lxBank').innerHTML = ex.bank.map(b => used.has(b.id) ? `<span class="slot">${esc(b.t)}</span>` : `<button class="tile" data-a="tok" data-id="${b.id}">${esc(b.t)}</button>`).join('');
    $('#lxBtn').disabled = S.ans.length === 0;
  }
  function onClick(e) {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, ex = cur();
    if (a === 'quit') return quit();
    if (a === 'say') return MO.speak(MO.refSpeech(ex.V.ref) + '. ' + ex.V.text);
    if (a === 'check') return S.phase === 'ask' ? check() : next();
    if (a === 'done') return close(true);
    if (a === 'retry') { const o = S.opt; close(false); return L.start(o); }
    if (S.phase !== 'ask') return;
    if (a === 'sel') {
      S.sel = +b.dataset.k; MO.snd.tap();
      document.querySelectorAll('[data-a="sel"]').forEach(x => x.setAttribute('aria-pressed', x === b));
      if (ex.type === 'blank') { const g = $('#lxGap'); g.textContent = ex.opts[S.sel]; g.classList.remove('empty'); }
      $('#lxBtn').disabled = false; return;
    }
    if (a === 'tok') { S.ans.push(+b.dataset.id); MO.snd.tap(); return drawOrder(); }
    if (a === 'unt') { S.ans = S.ans.filter(x => x !== +b.dataset.id); return drawOrder(); }
    if (a === 'ml' || a === 'mr') {
      const i = +b.dataset.i; if (S.m.done.has(i)) return;
      S.m[a === 'ml' ? 'l' : 'r'] = i; MO.snd.tap();
      document.querySelectorAll(`[data-a="${a}"]`).forEach(x => { if (!S.m.done.has(+x.dataset.i)) x.setAttribute('aria-pressed', x === b); });
      if (S.m.l != null && S.m.r != null) {
        const l = document.querySelector(`[data-a="ml"][data-i="${S.m.l}"]`), r = document.querySelector(`[data-a="mr"][data-i="${S.m.r}"]`);
        if (S.m.l === S.m.r) {
          S.m.done.add(S.m.l); [l, r].forEach(x => { x.setAttribute('aria-pressed', 'false'); x.classList.add('right'); }); MO.snd.ok();
          setTimeout(() => [l, r].forEach(x => { x.classList.remove('right'); x.classList.add('gone'); }), 350);
          if (S.m.done.size === ex.pairs.length) { S.answered++; S.first++; setTimeout(() => feedback(true, ''), 450); }
        } else {
          [l, r].forEach(x => { x.setAttribute('aria-pressed', 'false'); x.classList.add('wrong'); setTimeout(() => x.classList.remove('wrong'), 450); }); MO.snd.bad(); loseHeart();
        }
        S.m.l = S.m.r = null;
      }
    }
  }
  function check() {
    const ex = cur();
    if (ex.type === 'intro') { S.good++; return next(); }
    let ok = false, ans = '';
    if (ex.type === 'blank') { ok = ex.opts[S.sel] === ex.ans; ans = ex.ans; }
    if (ex.type === 'ref') { ok = ex.opts[S.sel] === ex.V.ref; ans = ex.V.ref; }
    if (ex.type === 'pick') { ok = !!ex.opts[S.sel].ok; ans = ex.ans; }
    if (ex.type === 'order') { ok = S.ans.map(id => ex.bank[id].t).join(' ') === ex.tiles.join(' '); ans = ex.tiles.join(' '); }
    S.answered++; if (ok && !ex.retry) S.first++;
    if (ex.type !== 'order') document.querySelectorAll('[data-a="sel"]').forEach((x, k) => {
      x.disabled = true;
      const right = ex.type === 'pick' ? ex.opts[k].ok : ex.opts[k] === (ex.type === 'ref' ? ex.V.ref : ex.ans);
      if (k === S.sel) x.classList.add(ok ? 'right' : 'wrong'); else if (right && !ok) x.classList.add('right');
    });
    if (!ok) { S.q.push(Object.assign({}, ex, ex.type === 'order' ? { bank: shuffleNot(ex.bank.map(b => b.t)).map((t, id) => ({ id, t })) } : { opts: shuffle(ex.opts) }, { retry: true })); loseHeart(); }
    feedback(ok, ans);
  }
  function feedback(ok, ans) {
    if (!S) return; S.phase = 'fb'; if (ok) S.good++;
    const foot = $('#lxFoot'), btn = $('#lxBtn'); foot.className = 'lx-foot ' + (ok ? 'ok' : 'bad'); btn.hidden = false; btn.disabled = false; btn.textContent = '계속';
    const face = ok ? ['face_roi.webp', 'face_roi2.webp', 'face_moa.webp', 'face_moa2.webp'][Math.random() * 4 | 0] : 'face_moa3.webp';
    $('#lxFb').innerHTML = `${img(face)}<div><b>${ok ? PRAISE[Math.random() * PRAISE.length | 0] : '아쉬워요!'}</b><span>${ok ? CHEER[Math.random() * CHEER.length | 0] : '정답: ' + esc(ans)}</span></div>`;
    ok ? MO.snd.ok() : MO.snd.bad(); setProg(); btn.focus();
  }
  function loseHeart() {
    S.hearts--; const h = $('#lxH'); h.querySelector('span').textContent = S.hearts; h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit');
    if (S.hearts <= 0) setTimeout(outOfHearts, 700);
  }
  function next() { if (!S || S.hearts <= 0) return; MO.hush(); S.i++; if (S.i >= S.q.length) finish(); else render(); }
  function endScreen(html, btnText, act) {
    $('#lxMain').innerHTML = `<div class="end">${html}</div>`; $('#lxMain').style.display = 'flex';
    document.querySelector('.lx-head').style.visibility = 'hidden';
    const foot = $('#lxFoot'); foot.className = 'lx-foot'; $('#lxFb').innerHTML = '';
    const btn = $('#lxBtn'); btn.hidden = false; btn.disabled = false; btn.textContent = btnText; btn.dataset.a = act; btn.focus();
  }
  async function finish() {
    const acc = S.answered ? Math.round(S.first / S.answered * 100) : 100;
    const title = S.opt.review ? `${S.opt.week}주차 복습 완료!` : '레슨 완료!';
    const sub = S.opt.review ? '이번 주 말씀을 모두 외웠어요!' : esc(S.opt.verse.ref) + ' 말씀을 마음에 담았어요';
    endScreen(`<div class="chars">${img('roi.webp')}${img('moa.webp')}</div><h2>${title}</h2><p>${sub}</p><div class="t3"><div style="--c:#d48b12"><small>정확도</small><b>${acc}%</b></div><div style="--c:#9a5a2a"><small>달란트</small><b id="lxGain">…</b></div><div style="--c:#5f8f33"><small>남은 하트</small><b>${S.hearts}</b></div></div>`, '계속', 'done');
    MO.snd.win(); MO.confetti(!!S.opt.review);
    const btn = $('#lxBtn'); btn.disabled = true;
    try {
      const r = await S.opt.onFinish({ score: acc });
      $('#lxGain').textContent = r && r.gained ? '+' + r.gained : '+0';
      if (r && r.gained === 0) $('#lxGain').parentElement.querySelector('small').textContent = '이미 받았어요';
    } catch (e) { $('#lxGain').textContent = '-'; MO.err(e); }
    btn.disabled = false;
  }
  function outOfHearts() {
    if (!S) return;
    endScreen(`${img('face_moa3.webp', 'face')}<h2 class="sad">하트를 모두 썼어요</h2><p>괜찮아! 모아랑 한 번 더 들어 보고 다시 도전하자.</p>`, '다시 도전', 'retry');
  }
  async function quit() {
    if (S.phase === 'done') return close(false);
    if (await MO.confirm('지금 나가면 이번 레슨 기록이 사라져요.', { ok: '그만하기', danger: true, title: '정말 그만할까요?' })) close(false);
  }
  function close(done) {
    MO.hush(); const el = $('#lesson'); if (el) el.remove(); document.body.style.overflow = '';
    const o = S && S.opt; S = null; if (o && o.onClose) o.onClose(done);
  }
})();
