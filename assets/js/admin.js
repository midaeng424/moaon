/* 관리자 페이지 — 틀(로그인 · 메뉴 · 화면 전환) + 공통 도구 */
(function () {
  MO.setTokenKey('admin', true);
  const A = (window.ADM = { pages: {}, st: { year: new Date().getFullYear() } });
  /* ---------- 로그인 유지: 화면을 벗어나면 로그아웃, 기본 2시간 + 연장 ---------- */
  // 새로고침만 로그인을 이어 가요. 탭·창·홈 화면 앱을 닫았다 열거나, 다른 곳에 갔다가 돌아오면 다시 로그인해요.
  try { const nav = performance.getEntriesByType('navigation')[0]; if (!nav || nav.type !== 'reload') { MO.sstore.del('admin'); MO.sstore.del('adminDL'); } } catch (e) {}
  window.addEventListener('pageshow', (e) => { if (e.persisted) { MO.sstore.del('admin'); MO.sstore.del('adminDL'); location.reload(); } });
  const SS = { dl: 0, warned: false, timer: null };
  const fmtLeft = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sc = t % 60; return `${h}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`; };
  A.sess = {
    set(token, ttl) { MO.sstore.set('admin', token); SS.dl = Date.now() + (ttl || 7200000); MO.sstore.set('adminDL', SS.dl); SS.warned = false; },
    clear() { MO.sstore.del('admin'); MO.sstore.del('adminDL'); clearInterval(SS.timer); SS.timer = null; },
    start() { SS.dl = MO.sstore.get('adminDL', 0) || (Date.now() + 7200000); clearInterval(SS.timer); SS.timer = setInterval(tick, 1000); tick(); },
    async extend() { try { const r = await MO.api('sessionExtend', {}, { loader: false }); A.sess.set(r.token, r.ttl); tick(); MO.toast('로그인 시간을 2시간으로 늘렸어요', 'ok'); } catch (e) { MO.err(e); } }
  };
  function tick() {
    const left = SS.dl - Date.now();
    document.querySelectorAll('[data-sess]').forEach(el => { el.textContent = fmtLeft(left); el.closest('.sess') && el.closest('.sess').classList.toggle('low', left <= 5 * 60000); });
    if (left <= 0) { A.sess.clear(); document.querySelectorAll('.scrim').forEach(x => x.remove()); showLogin(); MO.toast('로그인 시간이 끝나서 로그아웃했어요. 다시 로그인해 주세요.'); return; }
    if (left <= 5 * 60000 && !SS.warned) { SS.warned = true; MO.confirm('로그인 시간이 5분 남았어요. 2시간 더 연장할까요?', { ok: '연장하기', cancel: '괜찮아요' }).then(ok => { if (ok) A.sess.extend(); }); }
  }
  const app = document.getElementById('app');
  const esc = MO.esc;

  /* ---------- 메뉴 ---------- */
  A.MENU = [
    { key: 'dash', label: '홈', icon: 'home', perm: 'dash' },
    { key: 'att', label: '출석', icon: 'att', perm: 'att' },
    { key: 'off', label: '헌금', icon: 'off', perm: 'off' },
    { key: 'tal', label: '달란트', icon: 'tal', perm: 'tal' },
    { key: 'acc', label: '회계 (수입·지출)', short: '회계', icon: 'acc', perm: 'acc' },
    { key: 'ver', label: '성경암송 관리', short: '암송', icon: 'ver', perm: 'ver' },
    { key: 'ros', label: '교적부', icon: 'ros', perm: 'ros', group: 2 },
    { key: 'cls', label: '반 관리', icon: 'cls', perm: 'cls', group: 2, badge: '서기' },
    { key: 'report', label: '초등부 현황', icon: 'report', perm: 'report', group: 3 },
    { key: 'perm', label: '권한 관리', icon: 'perm', master: true, group: 3, badge: '마스터' },
    { key: 'backup', label: '백업 · 복원', icon: 'backup', master: true, group: 3, badge: '마스터' }
  ];
  A.can = (perm, lv = 1) => { const me = A.st.me; if (!me) return false; if (me.role === 'master') return true; return (me.perms[perm] || 0) >= lv; };
  A.edit = (perm) => A.can(perm, 2);
  A.visible = (m) => {
    const me = A.st.me; if (!me) return false;
    if (m.master) return me.role === 'master';
    if (m.key === 'report') return me.role === 'pastor' || me.role === 'master';
    if (me.role === 'pastor') return ['att', 'off', 'acc', 'ver', 'ros'].includes(m.key) && A.can(m.perm);
    return A.can(m.perm);
  };
  A.home = () => (A.st.me && A.st.me.role === 'pastor' ? 'report' : (A.MENU.find(m => A.visible(m)) || {}).key || 'dash');

  /* ---------- 공통 조각 ---------- */
  A.kpi = (label, value, sub, color, cls = '') => `<div class="kpi" style="--c:${color}"><small><i></i>${esc(label)}</small><b>${value}</b><span class="${cls}">${sub || ''}</span></div>`;
  A.cls = (id) => (A.st.boot.classes || []).find(c => c.id === id);
  A.clsLabel = (id) => { const c = A.cls(id); return c ? `${c.grade}학년 ${c.name}` : '반 없음'; };
  A.clsColor = (id) => { const c = A.cls(id); return c ? c.color : '#c9bba6'; };
  A.teacher = (id) => (A.st.boot.teachers || []).find(t => t.id === id);
  A.stu = (id) => (A.st.boot.students || []).find(s => s.id === id);
  A.PRESETS = Array.from({ length: 15 }, (_, i) => 'preset:av' + String(i + 1).padStart(2, '0'));
  A.photoSrc = (p) => /^preset:av\d{2}$/.test(p || '') ? MO.asset('avatars/' + p.slice(7) + '.webp') : /^data:image\/(jpeg|png|webp);base64,/.test(p || '') ? p : '';
  A.av = (name, color, size = 30, photo) => { const src = A.photoSrc(photo); return `<span class="av" style="--c:${color};width:${size}px;height:${size}px">${src ? `<img src="${esc(src)}" alt="">` : esc(String(name || '').slice(-2))}</span>`; };
  A.activeClasses = () => (A.st.boot.classes || []).filter(c => c.active);
  A.grades = () => [...new Set(A.activeClasses().map(c => c.grade))].sort();
  A.empty = (msg, img = 'moa.webp') => `<div class="empty"><img src="${MO.asset(img)}" alt="">${msg}</div>`;
  A.refreshBoot = async () => { A.st.boot = await MO.api('bootstrap', {}, { loader: false }); A.st.me = A.st.boot.me; };

  /* ---------- 그래프 ---------- */
  A.area = (vals, { w = 780, h = 250, labels = [], min = 40, max = 100, avg } = {}) => {
    const pts0 = vals.map((v, i) => [i, v]).filter(p => p[1] != null);
    if (pts0.length < 1) return A.empty('아직 출석 기록이 없어요');
    const lo = Math.max(0, Math.min(min, ...pts0.map(p => p[1]) ) - 5);
    const pl = 38, pr = 16, pt = 18, pb = 26, iw = w - pl - pr, ih = h - pt - pb, n = Math.max(2, vals.length);
    const X = i => pl + i * iw / (n - 1), Y = v => pt + ih - (v - lo) / (max - lo) * ih;
    const pts = pts0.map(p => [X(p[0]), Y(p[1])]);
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6},${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6},${p2[0]} ${p2[1]}`; }
    let g = `<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5b335" stop-opacity=".42"/><stop offset="1" stop-color="#f5b335" stop-opacity="0"/></linearGradient></defs>`;
    for (let t = 0; t <= 3; t++) { const v = lo + (max - lo) * t / 3, y = Y(v); g += `<line x1="${pl}" x2="${w - pr}" y1="${y}" y2="${y}" stroke="#f3eadc"/><text x="${pl - 8}" y="${y + 4}" font-size="10.5" fill="#a8988a" text-anchor="end">${Math.round(v)}%</text>`; }
    if (pts.length > 1) g += `<path d="${d} L${pts[pts.length - 1][0]} ${pt + ih} L${pts[0][0]} ${pt + ih}Z" fill="url(#ga)"/><path d="${d}" fill="none" stroke="#eea21f" stroke-width="3" stroke-linecap="round"/>`;
    if (avg != null && avg > 0) { const y = Y(avg); g += `<line x1="${pl}" x2="${w - pr}" y1="${y}" y2="${y}" stroke="#78a744" stroke-width="1.6" stroke-dasharray="5 5"/><text x="${pl + 6}" y="${y - 6}" font-size="11" font-weight="700" fill="#5b8a2e">평균 ${avg}%</text>`; }
    pts.forEach((q, i) => { g += `<circle cx="${q[0]}" cy="${q[1]}" r="${i === pts.length - 1 ? 7 : 4}" fill="#fff" stroke="${i === pts.length - 1 ? '#9a5530' : '#eea21f'}" stroke-width="${i === pts.length - 1 ? 3 : 2.5}"><title>${labels[pts0[i][0]] || ''} ${pts0[i][1]}%</title></circle>`; });
    const L = pts[pts.length - 1], lv = pts0[pts0.length - 1][1]; const bx = Math.min(L[0] - 29, w - 62);
    g += `<rect x="${bx}" y="${L[1] - 40}" width="58" height="26" rx="9" fill="#3f3228"/><text x="${bx + 29}" y="${L[1] - 22.5}" font-size="12" font-weight="900" fill="#fff" text-anchor="middle">${lv}%</text>`;
    labels.forEach((l, i) => { if (l) g += `<text x="${X(i)}" y="${h - 6}" font-size="10.5" fill="#a8988a" text-anchor="middle">${l}</text>`; });
    return `<svg width="100%" viewBox="0 0 ${w} ${h}" role="img" aria-label="월별 출석률">${g}</svg>`;
  };
  A.bars2 = (a, b, labels, { w = 470, h = 250, ca = '#78a744', cb = '#ee8b72' } = {}) => {
    const mx = Math.max(10000, ...a, ...b) * 1.15, pl = 42, pb = 26, pt = 12, iw = w - pl - 6, ih = h - pb - pt, gw = iw / a.length; let g = '';
    for (let t = 0; t <= 4; t++) { const y = pt + ih - ih * t / 4; g += `<line x1="${pl}" x2="${w - 6}" y1="${y}" y2="${y}" stroke="#f3eadc"/><text x="${pl - 6}" y="${y + 4}" font-size="10" fill="#a8988a" text-anchor="end">${Math.round(mx * t / 4 / 10000)}만</text>`; }
    a.forEach((v, i) => { const x = pl + i * gw, ha = ih * v / mx, hb = ih * b[i] / mx; g += `<rect x="${x + gw * .14}" y="${pt + ih - ha}" width="${gw * .34}" height="${ha}" rx="4" fill="${ca}"><title>${labels[i]} 수입 ${MO.won(v)}</title></rect><rect x="${x + gw * .52}" y="${pt + ih - hb}" width="${gw * .34}" height="${hb}" rx="4" fill="${cb}"><title>${labels[i]} 지출 ${MO.won(b[i])}</title></rect><text x="${x + gw / 2}" y="${h - 7}" font-size="10" fill="#a8988a" text-anchor="middle">${labels[i]}</text>`; });
    return `<svg width="100%" viewBox="0 0 ${w} ${h}" role="img" aria-label="월별 수입 지출">${g}</svg>`;
  };
  A.stack = (rows, labels, cols, names, { w = 780, h = 250 } = {}) => {
    const tot = rows.map(r => r.reduce((a, b) => a + b, 0)), mx = Math.max(10000, ...tot) * 1.12, pl = 42, pb = 26, pt = 12, iw = w - pl - 6, ih = h - pb - pt, gw = iw / rows.length; let g = '';
    for (let t = 0; t <= 4; t++) { const y = pt + ih - ih * t / 4; g += `<line x1="${pl}" x2="${w - 6}" y1="${y}" y2="${y}" stroke="#f3eadc"/><text x="${pl - 6}" y="${y + 4}" font-size="10" fill="#a8988a" text-anchor="end">${Math.round(mx * t / 4 / 10000)}만</text>`; }
    rows.forEach((r, i) => { let y = pt + ih; r.forEach((v, k) => { const hh = ih * v / mx; y -= hh; if (hh > 0) g += `<rect x="${pl + i * gw + gw * .24}" y="${y}" width="${gw * .52}" height="${hh}" fill="${cols[k]}"><title>${labels[i]} ${names[k]} ${MO.won(v)}</title></rect>`; }); g += `<text x="${pl + i * gw + gw / 2}" y="${h - 7}" font-size="10" fill="#a8988a" text-anchor="middle">${labels[i]}</text>`; });
    return `<svg width="100%" viewBox="0 0 ${w} ${h}" role="img" aria-label="월별 헌금">${g}</svg>`;
  };
  A.donut = (vals, cols, center, S = 170) => {
    const tot = vals.reduce((a, b) => a + b, 0); const cx = S / 2, R = S * .4, r = S * .26; let a = -Math.PI / 2, g = '';
    if (!tot) g = `<circle cx="${cx}" cy="${cx}" r="${(R + r) / 2}" fill="none" stroke="#f1e7d8" stroke-width="${R - r}"/>`;
    vals.forEach((v, i) => { if (!v) return; const b = a + v / tot * Math.PI * 2 - .0001, l = b - a > Math.PI ? 1 : 0, p = (t, rr) => [cx + rr * Math.cos(t), cx + rr * Math.sin(t)]; const [x1, y1] = p(a, R), [x2, y2] = p(b, R), [x3, y3] = p(b, r), [x4, y4] = p(a, r); g += `<path d="M${x1} ${y1}A${R} ${R} 0 ${l} 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 ${l} 0 ${x4} ${y4}Z" fill="${cols[i]}" stroke="#fff" stroke-width="2"/>`; a = b; });
    return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" style="flex:none">${g}<text x="${cx}" y="${cx - 4}" text-anchor="middle" font-size="11" fill="#a8988a" font-weight="700">${center[0]}</text><text x="${cx}" y="${cx + 16}" text-anchor="middle" font-size="16" font-weight="900" fill="#3f3228">${center[1]}</text></svg>`;
  };

  /* ---------- 로그인 ---------- */
  function showLogin() {
    A.st.me = null; clearInterval(SS.timer); SS.timer = null;
    app.innerHTML = `<div class="alogin"><form class="box" id="lf"><img src="${MO.asset('logo.webp')}" alt="모아온"><h2>관리자 로그인</h2>
      <label class="fld"><span>아이디</span><input class="inp" id="lid" autocomplete="username" autocapitalize="none" required></label>
      <label class="fld"><span>비밀번호</span><input class="inp" id="lpw" type="password" autocomplete="current-password" required></label>
      <button class="btn lg block" type="submit">로그인</button>
      <p class="note" style="text-align:center;margin:0">마스터·교역자·총무·서기·회계만 들어올 수 있어요</p>
      <a class="note" style="text-align:center" href="./">아이 앱으로 가기 →</a></form></div>`;
    const f = app.querySelector('#lf'); f.querySelector('#lid').value = MO.store.get('lastAdmin', '');
    f.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const r = await MO.api('adminLogin', { loginId: f.querySelector('#lid').value.trim(), password: f.querySelector('#lpw').value }, { token: '' });
        A.sess.set(r.token, r.ttl); MO.store.set('lastAdmin', r.me.loginId);
        if (r.me.mustChange) { A.st.me = r.me; const ok = await changePw(true); if (!ok) { A.sess.clear(); return showLogin(); } }
        boot();
      } catch (err) { MO.err(err); }
    };
  }
  async function changePw(forced) {
    while (true) {
      const v = await MO.form({ title: forced ? '처음 오셨네요! 새 비밀번호를 정해 주세요' : '비밀번호 바꾸기', submit: '바꾸기', fields: [
        { key: 'old', label: forced ? '받은 임시 비밀번호' : '지금 비밀번호', type: 'password', required: true },
        { key: 'nw', label: '새 비밀번호 (8자 이상)', type: 'password', required: true },
        { key: 'nw2', label: '새 비밀번호 한 번 더', type: 'password', required: true }] });
      if (!v) return false;
      if (v.nw !== v.nw2) { MO.toast('새 비밀번호가 서로 달라요.', 'err'); continue; }
      try { await MO.api('changePassword', { oldPassword: v.old, newPassword: v.nw }); MO.toast('비밀번호를 바꿨어요.', 'ok'); return true; }
      catch (e) { MO.err(e); }
    }
  }
  A.changePw = changePw;
  /** 사진 고르기 칸 (프로필) — 반환: { el, value() } */
  A.photoPicker = (name, color, photo) => {
    const el = document.createElement('div'); el.className = 'fld'; let val = photo || '';
    const paint = () => {
      el.innerHTML = `<span>프로필 사진 <small class="note">(선택 · 로이&모아 중에 고르거나 직접 올려요)</small></span>
        <div class="ppick">${A.av(name, color, 64, val)}<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn o sm" style="cursor:pointer">${MO.icon('cam', 14)}내 사진 올리기<input type="file" accept="image/jpeg,image/png,image/webp" hidden data-pf></label>${val ? '<button type="button" class="btn o sm" data-prm>사진 빼기</button>' : ''}</div></div>
        <div class="pgrid">${A.PRESETS.map(p => `<button type="button" class="pav ${p === val ? 'on' : ''}" data-pp="${p}" aria-label="기본 이미지 ${p.slice(9)}"><img src="${MO.asset('avatars/' + p.slice(7) + '.webp')}" alt=""></button>`).join('')}</div>`;
      el.querySelector('[data-pf]').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return MO.toast('JPG·PNG 사진만 올릴 수 있어요', 'err'); try { val = await MO.squarePhoto(f); paint(); } catch (er) { MO.err(er); } };
      el.querySelectorAll('[data-pp]').forEach(b => b.onclick = () => { val = b.dataset.pp; paint(); });
      const rm = el.querySelector('[data-prm]'); if (rm) rm.onclick = () => { val = ''; paint(); };
    };
    paint(); return { el, value: () => val };
  };
  A.profile = async () => {
    const me = A.st.me, pk = A.photoPicker(me.name, me.role === 'master' ? '#3f3228' : '#d98a1c', me.photo);
    const v = await MO.form({ title: '내 프로필', submit: '저장', fields: [{ key: 'name', label: '이름', value: me.name, required: true }], extra: pk.el });
    if (!v) return;
    try { const r = await MO.api('profileSave', { name: v.name, photo: pk.value() }); A.st.me = Object.assign(A.st.me, r); A.st.boot.me = A.st.me; MO.toast('저장했어요', 'ok'); A.reshell(); route(); } catch (e) { MO.err(e); }
  };
  A.logout = async () => { if (await MO.confirm('로그아웃할까요?', { ok: '로그아웃' })) { A.sess.clear(); showLogin(); } };
  MO.onAuthFail = async (err) => {
    if (err.code === 'PWCHANGE') { if (await changePw(true)) location.reload(); return; }
    A.sess.clear(); showLogin();
  };

  /* ---------- 틀 ---------- */
  async function boot() {
    try { await A.refreshBoot(); } catch (e) { if (e.code !== 'AUTH' && e.code !== 'PWCHANGE') { MO.err(e); app.innerHTML = `<div class="alogin"><div class="box">${A.empty(esc(e.message), 'face_moa3.webp')}<button class="btn" id="bootRetry">다시 시도</button></div></div>`; const rb = app.querySelector('#bootRetry'); if (rb) rb.onclick = () => location.reload(); } return; }
    A.st.year = Number(A.st.boot.today.slice(0, 4));
    shell(); route(); A.sess.start();
  }
  function shell() {
    const me = A.st.me, vis = A.MENU.filter(A.visible);
    const navBtn = (m) => `<button class="nav" data-go="${m.key}" title="${esc(m.label)}">${MO.icon(m.icon, 20)}<span class="nl">${esc(m.label)}</span>${m.badge ? `<span class="bdg" style="${m.master ? '--b:#3f3228;--c:#fff' : '--b:#edf5e1;--c:#5b8a2e'}">${m.badge}</span>` : ''}${me.role === 'pastor' && m.key !== 'report' ? '<span class="bdg" style="--b:#e6f0fa;--c:#3d7cb8">보기</span>' : ''}</button>`;
    const g1 = vis.filter(m => !m.group), g2 = vis.filter(m => m.group === 2), g3 = vis.filter(m => m.group === 3);
    const ordered = me.role === 'pastor' ? [...g3, ...g1, ...g2] : [...g1, ...g2, ...g3];
    app.innerHTML = `<div class="shell ${MO.store.get('sideMini', false) ? 'mini' : ''}"><aside class="side"><div class="brand"><img class="full" src="${MO.asset('logo.webp')}" alt="모아온"><img class="icon" src="${MO.asset('icon-rounded.png')}" alt="모아온"><small>${esc(A.st.boot.org)} · 관리자</small><button class="fold" data-act="fold" title="메뉴 접기 / 펼치기" aria-label="메뉴 접기 / 펼치기">${MO.icon('fold', 18)}</button></div>
      ${me.role === 'pastor' ? g3.map(navBtn).join('') + '<hr>' + g1.map(navBtn).join('') + g2.map(navBtn).join('') : g1.map(navBtn).join('') + (g2.length ? '<hr>' + g2.map(navBtn).join('') : '') + '<div class="grow"></div>' + (g3.length ? '<hr>' + g3.map(navBtn).join('') : '')}
      <div class="mecard"><div class="mehead"><button class="meav" data-act="profile" title="내 프로필 · 사진 바꾸기">${A.av(me.name, me.role === 'master' ? '#3f3228' : '#d98a1c', 40, me.photo)}</button><div><b>${esc(me.name)}</b> <span class="role" style="--b:${me.role === 'master' ? '#3f3228' : '#fff3d6'};--c:${me.role === 'master' ? '#fff' : '#a8621f'}">${esc(me.roleLabel)}</span></div></div>
        <div class="sess"><span title="남은 로그인 시간">${MO.icon('clock', 14)}<b data-sess>2:00:00</b></span><i></i><button data-act="extend">연장</button></div>
        <div class="acts"><button class="btn o sm" data-act="pw">${MO.icon('key', 14)}비밀번호</button><button class="btn o sm" data-act="logout">${MO.icon('logout', 14)}로그아웃</button></div></div></aside>
      <main class="mn"><header class="top"><img class="mlogo" src="${MO.asset('logo.webp')}" alt=""><h1 id="ttl"></h1><div class="tr" id="tr"></div></header><div class="pg" id="pg"></div></main>
      <nav class="mnav" id="mnav"></nav></div>`;
    const prim = ordered.slice(0, 4);
    app.querySelector('#mnav').innerHTML = prim.map(m => `<button data-go="${m.key}">${MO.icon(m.icon, 23)}${esc(m.short || m.label)}</button>`).join('') + (ordered.length > 4 ? `<button data-act="more">${MO.icon('more', 23)}더보기</button>` : `<button data-act="me">${MO.icon('user', 23)}내 계정</button>`);
    app.onclick = (e) => {
      const g = e.target.closest('[data-go]'); if (g && g.closest('.side,.mnav')) { location.hash = g.dataset.go; return; }
      const a = e.target.closest('[data-act]'); if (!a || !a.closest('.side,.mnav')) return;
      if (a.dataset.act === 'fold') { const sh = app.querySelector('.shell'); sh.classList.toggle('mini'); MO.store.set('sideMini', sh.classList.contains('mini')); return; }
      if (a.dataset.act === 'pw') changePw(false);
      if (a.dataset.act === 'extend') A.sess.extend();
      if (a.dataset.act === 'profile') A.profile();
      if (a.dataset.act === 'logout') A.logout();
      if (a.dataset.act === 'more' || a.dataset.act === 'me') moreSheet(ordered);
    };
  }
  function moreSheet(list) {
    const me = A.st.me;
    const m = MO.modal({ title: '메뉴', foot: false, body: `<div class="list">${list.map(x => `<button class="li" data-go="${x.key}" style="width:100%;text-align:left">${MO.icon(x.icon, 22)}<div><b>${esc(x.label)}</b></div>${x.badge ? `<span class="tag">${x.badge}</span>` : ''}</button>`).join('')}
      <div class="li"><button class="meav" data-a="prof">${A.av(me.name, me.role === 'master' ? '#3f3228' : '#d98a1c', 40, me.photo)}</button><div><b>${esc(me.name)} · ${esc(me.roleLabel)}</b><span class="sess">${MO.icon('clock', 13)}<b data-sess>${fmtLeft(SS.dl - Date.now())}</b><i></i><button data-a="ext">연장</button></span></div></div>
      <div class="li" style="justify-content:flex-end"><button class="btn o sm" data-a="pw">비밀번호</button><button class="btn o sm" data-a="out">로그아웃</button></div></div>` });
    m.body.onclick = (e) => { const g = e.target.closest('[data-go]'); if (g) { m.close(); location.hash = g.dataset.go; } const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'ext') return A.sess.extend(); m.close(); if (b.dataset.a === 'pw') changePw(false); else if (b.dataset.a === 'prof') A.profile(); else A.logout(); };
  }
  A.setTitle = (title, right = '') => {
    document.getElementById('ttl').innerHTML = esc(title) + `<small>${A.st.year}년</small>`;
    document.getElementById('tr').innerHTML = right;
    document.title = title + ' · 모아온 관리자';
  };
  // 연도: 모아온을 처음 쓴 해(firstYear)부터 '올해 + 1년'까지. 해가 바뀌면 오늘 날짜를 따라 저절로 한 칸씩 늘어나요.
  A.years = () => { const now = Number(A.st.boot.today.slice(0, 4)), first = Math.min(Number(A.st.boot.firstYear) || now, now, A.st.year); const ys = []; for (let i = Math.max(now + 1, A.st.year); i >= first; i--) ys.push(i); return ys; };
  A.yearSel = () => { const ys = A.years(), y = A.st.year; return `<div class="ystep" role="group" aria-label="연도"><button type="button" data-ystep="-1" aria-label="이전 해" ${y <= ys[ys.length - 1] ? 'disabled' : ''}>${MO.icon('chevL', 16)}</button><select id="yearSel" aria-label="연도 고르기">${ys.map(v => `<option ${v === y ? 'selected' : ''} value="${v}">${v}년</option>`).join('')}</select><button type="button" data-ystep="1" aria-label="다음 해" ${y >= ys[0] ? 'disabled' : ''}>${MO.icon('chevR', 16)}</button></div>`; };
  A.bindYear = (rerender) => {
    const s = document.getElementById('yearSel'); if (!s) return;
    s.onchange = () => { A.st.year = Number(s.value); rerender(); };
    s.parentElement.querySelectorAll('[data-ystep]').forEach(b => b.onclick = () => { const ys = A.years(), y = A.st.year + Number(b.dataset.ystep); if (y < ys[ys.length - 1] || y > ys[0]) return; A.st.year = y; rerender(); });
  };
  /* 달별로 접고 펴는 표: 가장 최근 달만 펼쳐 두고, 달 머리줄을 누르면 접히거나 펼쳐져요 (화면을 옮겨도 기억) */
  A._mg = {};
  A.mgroup = (key, rows, dateOf, render, summary, cols) => {
    if (!rows.length) return '';
    const byM = []; rows.forEach(r => { const m = dateOf(r).slice(0, 7), g = byM[byM.length - 1]; if (g && g.m === m) g.rows.push(r); else byM.push({ m, rows: [r] }); });
    if (!A._mg[key]) A._mg[key] = new Set([byM[0].m]);
    const open = A._mg[key];
    return byM.map(g => { const on = open.has(g.m); return `<tr class="mgrp ${on ? 'open' : ''}" data-mg="${key}" data-m="${g.m}" tabindex="0" aria-expanded="${on}"><td colspan="${cols}"><span class="mgi">${MO.icon('chevR', 15)}</span><b>${Number(g.m.slice(5))}월</b><span class="mgc">${g.rows.length}건</span><span class="mgs">${summary(g.rows)}</span></td></tr>` + g.rows.map(r => render(r).replace('<tr', `<tr data-mrow="${g.m}"${on ? '' : ' hidden'}`)).join(''); }).join('');
  };
  const mgToggle = (h) => { const key = h.dataset.mg, m = h.dataset.m, set = A._mg[key] || (A._mg[key] = new Set()), on = !set.has(m); on ? set.add(m) : set.delete(m); h.classList.toggle('open', on); h.setAttribute('aria-expanded', on); h.closest('tbody').querySelectorAll(`tr[data-mrow="${m}"]`).forEach(r => { r.hidden = !on; }); };
  document.addEventListener('click', (e) => { const h = e.target.closest('tr.mgrp'); if (h) mgToggle(h); });
  document.addEventListener('keydown', (e) => { const h = e.target.closest && e.target.closest('tr.mgrp'); if (h && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); mgToggle(h); } });
  A.xlsBtn = () => `<button class="btn o xlsb" id="xlsBtn" title="엑셀로 내보내기">${MO.icon('down', 15)}<span>엑셀</span></button>`;
  A.bindXls = (fn) => { const b = document.getElementById('xlsBtn'); if (b) b.onclick = fn; };
  A.readonlyBadge = (perm) => A.edit(perm) ? '' : `<span class="ro">${MO.icon('eye', 14)}보기 전용</span>`;

  let curKey = null;
  async function route() {
    if (!A.st.me) return;
    let key = (location.hash || '').slice(1) || A.home();
    const m = A.MENU.find(x => x.key === key);
    if (!m || !A.visible(m)) key = A.home();
    if (location.hash.slice(1) !== key) { history.replaceState(null, '', '#' + key); }
    curKey = key;
    document.querySelectorAll('[data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === key));
    const pg = document.getElementById('pg'); pg.onclick = null; pg.oninput = null; pg.onchange = null;
    document.querySelectorAll('.fab').forEach(f => f.remove());
    pg.innerHTML = `<div class="skel" style="height:110px"></div><div class="kpis" style="--n:4">${'<div class="skel" style="height:96px"></div>'.repeat(4)}</div><div class="skel" style="height:300px"></div>`;
    window.scrollTo(0, 0);
    try { await A.pages[key](pg); }
    catch (e) { if (e.code !== 'AUTH' && e.code !== 'PWCHANGE') { MO.err(e); pg.innerHTML = `<div class="card">${A.empty(esc(e.message), 'face_moa3.webp')}<div style="text-align:center"><button class="btn" id="retry">다시 시도</button></div></div>`; pg.querySelector('#retry').onclick = route; } }
  }
  A.reload = () => route();
  A.reshell = () => { shell(); A.sess.start(); };
  window.addEventListener('hashchange', route);

  window.addEventListener('DOMContentLoaded', () => { if (MO.token()) boot(); else showLogin(); });
})();
