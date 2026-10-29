/* 이용자(아이) 앱 */
(function () {
  MO.setTokenKey('kid');
  const app = document.getElementById('app');
  const esc = MO.esc;
  const UNIT = ['#eea21f', '#78a744', '#d4863c', '#ee8b72', '#9a6b4b', '#5b9bd5', '#17bfa9', '#c79b3e'];
  const OFF = [0, 52, 78, 52, 0, -52, -78, -52];
  let H = null, tab = 'path', popFor = null;

  MO.onAuthFail = () => { MO.store.del('kid'); H = null; showLogin(); };
  const callName = (name) => { const n = name.length >= 3 ? name.slice(1) : name; const c = n.charCodeAt(n.length - 1) - 0xac00; return n + (c >= 0 && c % 28 ? '아' : '야'); };

  /* ---------- 로그인 ---------- */
  async function showLogin() {
    tab = 'path';
    app.innerHTML = `<div class="login"><div class="splash"><img src="${MO.asset('logo.webp')}" alt="모아온 with 로이&모아"></div>
      <div class="lsheet"><h2><small id="org">사무엘 주일학교 초등부</small>반가워요!</h2>
      <div class="lstep" id="s1"><div class="lab"><span class="no">1</span>우리 반을 골라 주세요</div><div class="clsgrid" id="cls"><div class="skel" style="height:58px"></div><div class="skel" style="height:58px"></div></div></div>
      <div class="lstep" id="s2" hidden><div class="lab"><span class="no">2</span>내 이름</div><div class="nmrow"><input class="name-inp" id="nm" placeholder="이름을 적어주세요. (예: 이평강)" autocomplete="off" maxlength="10" enterkeyhint="next"><button class="nmgo" id="nmgo" type="button" disabled>다음</button></div></div>
      <div class="lstep" id="s3" hidden><div class="lab"><span class="no">3</span>비밀번호 4자리</div><div class="pin" id="pin"><i></i><i></i><i></i><i></i></div>
      <div class="keypad" id="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button class="fn" data-n="c">모두 지우기</button><button data-n="0">0</button><button class="fn" data-n="b">⌫ 지우기</button></div>
      <p class="lhelp">비밀번호를 모르면 선생님께 물어보세요</p></div></div></div>`;
    let classId = MO.store.get('lastClass', ''), pin = '';
    const nm = app.querySelector('#nm'), go = app.querySelector('#nmgo');
    const show = (id) => { const el = app.querySelector(id); if (el.hidden) { el.hidden = false; el.classList.add('in'); setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60); } };
    const syncGo = () => { go.disabled = !nm.value.trim(); };
    const nameDone = () => { if (!nm.value.trim()) { nm.focus(); return; } nm.blur(); show('#s3'); };
    nm.value = MO.store.get('lastName', ''); syncGo();
    nm.oninput = syncGo;
    nm.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); nameDone(); } };
    go.onclick = nameDone;
    try {
      const info = await MO.api('publicInfo', {}, { loader: false });
      app.querySelector('#org').textContent = info.org;
      const box = app.querySelector('#cls');
      if (!info.classes.length) box.outerHTML = '<p style="margin:0;color:var(--sub);font-weight:700">아직 등록된 반이 없어요. 선생님께 알려 주세요.</p>';
      else box.innerHTML = info.classes.map(c => `<button data-id="${c.id}" class="${c.id === classId ? 'on' : ''}"><small>${c.grade}학년</small>${esc(c.name)}</button>`).join('');
      if (!info.classes.some(c => c.id === classId)) classId = '';
      // 지난번에 들어왔던 아이는 바로 비밀번호까지 보여 줘요
      if (classId) { app.querySelector('#s2').hidden = false; if (nm.value.trim()) app.querySelector('#s3').hidden = false; }
      box.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; classId = b.dataset.id; box.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); MO.snd.tap(); show('#s2'); if (!nm.value.trim()) setTimeout(() => nm.focus(), 250); };
    } catch (e) { MO.err(e); }
    const dots = () => app.querySelectorAll('#pin i').forEach((d, i) => d.classList.toggle('on', i < pin.length));
    app.querySelector('#pad').onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return; const n = b.dataset.n;
      if (n === 'c') pin = ''; else if (n === 'b') pin = pin.slice(0, -1); else if (pin.length < 4) pin += n;
      dots();
      if (pin.length === 4) {
        if (!classId) { MO.toast('우리 반을 먼저 눌러 주세요', 'err'); pin = ''; dots(); return; }
        if (!nm.value.trim()) { MO.toast('이름을 적어 주세요', 'err'); pin = ''; dots(); nm.focus(); return; }
        try {
          const r = await MO.api('kidLogin', { classId, name: nm.value.trim(), pin });
          MO.store.set('kid', r.token); MO.store.set('lastClass', classId); MO.store.set('lastName', nm.value.trim());
          document.querySelectorAll('.toast').forEach(t => t.remove()); MO.snd.win(); load();
        } catch (err) {
          MO.err(err); pin = ''; dots(); const p = app.querySelector('#pin'); p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); MO.snd.bad();
        }
      }
    };
  }

  /* ---------- 데이터 ---------- */
  async function load(quiet) {
    try { H = await MO.api('kidHome', {}, { loader: !quiet }); render(); }
    catch (e) { if (e.code !== 'AUTH') { MO.err(e); if (!H) app.innerHTML = `<div class="kscr"><div class="empty"><img src="${MO.asset('face_moa3.webp')}" style="border-radius:50%">${esc(e.message)}<button class="btn" id="re">다시 시도</button></div></div>`; const re = app.querySelector('#re'); if (re) re.onclick = () => load(); } }
  }
  function render() {
    MO.hush();
    const html = tab === 'path' ? pathView() : tab === 'att' ? attView() : tab === 'tal' ? talView() : meView();
    app.innerHTML = `<div class="kscr">${html}</div>
      <nav class="tabbar">${[['path', 'ver', '말씀길'], ['att', 'att', '출석'], ['tal', 'tal', '달란트'], ['me', 'user', '내 정보']].map(([k, ic, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${MO.icon(ic, 24)}${l}</button>`).join('')}</nav>`;
    app.querySelector('.tabbar').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (!b || b.dataset.tab === tab) return; tab = b.dataset.tab; popFor = null; render(); window.scrollTo(0, 0); };
    bind();
  }
  const weekState = (w) => (w.start > H.today ? 'future' : 'open');
  const verseList = () => H.plan ? H.plan.weeks.flatMap(w => w.verses) : [];
  function nextTarget() {
    if (!H.plan) return null;
    const cw = H.plan.weeks.find(w => w.week === H.plan.currentWeek) || H.plan.weeks[0];
    const order = [cw, ...H.plan.weeks.filter(w => w !== cw && weekState(w) === 'open')];
    for (const w of order) {
      const v = w.verses.find(x => !x.done); if (v) return { w, v };
      if (!w.reviewDone) return { w, review: true };
    }
    return null;
  }

  /* ---------- 말씀길 ---------- */
  function pathView() {
    const me = H.me, st = H.stats, face = /[여]/.test(me.gender || '') ? 'face_moa.webp' : 'face_roi.webp';
    let h = `<div class="hh"><span class="av"><img src="${MO.asset(face)}" alt=""></span><div><b>${esc(callName(me.name))}, 안녕!</b><small>${esc(me.classLabel)}</small></div><button class="sp" data-a="sound" aria-label="소리">${MO.icon(MO.sound ? 'sound' : 'mute', 22)}</button></div>
      <div class="pills"><div><b style="color:#e8862a">${MO.icon('fire', 20)}${st.streak}주</b><small>연속 출석</small></div><div><b style="color:#9a5a2a">${MO.icon('coin', 20)}${st.talent}</b><small>달란트</small></div><div><b style="color:#5f8f33">${MO.icon('book', 20)}${st.learned}</b><small>외운 말씀</small></div></div>`;
    if (!H.plan) return h + `<div class="card empty"><img src="${MO.asset('moa.webp')}">아직 암송 계획이 없어요.<br>선생님이 곧 올려 주실 거예요!</div>`;
    const cw = H.plan.weeks.find(w => w.week === H.plan.currentWeek) || H.plan.weeks[0];
    const doneN = cw.verses.filter(v => v.done).length, tgt = nextTarget();
    h += `<div class="wk"><small>이번 주 · ${cw.week}주차 (${MO.md(cw.start)}~${MO.md(cw.end)})</small><b>${esc(cw.theme)}</b><p>${doneN === cw.verses.length ? (cw.reviewDone ? '이번 주 말씀을 다 외웠어요! 👏' : '복습만 남았어요!') : `말씀 ${cw.verses.length}개 중 ${doneN}개 완료!`}</p>${tgt ? `<button class="go" data-a="go">${doneN ? '이어서 하기' : '시작하기'} →</button>` : '<span class="go">모두 완료!</span>'}<img src="${MO.asset('roi.webp')}" alt=""></div>
      <div class="ttl"><b>말씀길</b><span>${H.plan.weeks.length}주 · ${st.total}구절</span></div>`;
    let gi = 0; const curT = tgt ? (tgt.review ? 'r' + tgt.w.week : tgt.v.id) : '';
    H.plan.weeks.forEach((w, wi) => {
      const c = UNIT[wi % UNIT.length], fut = weekState(w) === 'future';
      h += `<section class="unit" style="--c:${c}"><div class="uh ${fut ? 'lock' : ''}"><div><small>${w.week}주차 · ${MO.md(w.start)} ~ ${MO.md(w.end)}${w.week === H.plan.currentWeek ? ' · 이번 주' : ''}</small><b>${esc(w.theme)}</b></div>${fut ? `<span style="font-size:12px;font-weight:800">${MO.mdK(w.start)}에 열려요</span>` : `<button data-a="read" data-w="${w.week}">말씀 보기</button>`}</div><div class="nodes">`;
      const items = w.verses.map(v => ({ key: v.id, v, done: v.done })).concat([{ key: 'r' + w.week, review: true, done: w.reviewDone }]);
      items.forEach((it, j) => {
        const lock = fut || (it.review && !w.verses.every(v => v.done));
        const cls = it.done ? 'done' : lock ? 'lock' : '';
        const isCur = it.key === curT;
        const icon = it.review ? MO.icon('trophy', 30) : it.done ? MO.icon('check', 32, 'stroke-width="3.4"') : lock ? MO.icon('lock', 28) : MO.icon('star', 30);
        h += `<div class="nw" style="transform:translateX(${OFF[gi % 8]}px)">${isCur ? `<span class="tg">여기부터!</span>` : ''}<button class="nd ${cls} ${isCur ? 'cur' : ''}" data-a="node" data-w="${w.week}" data-k="${it.key}" aria-label="${it.review ? w.week + '주차 복습' : esc(it.v.ref)}">${icon}</button></div>`;
        if (popFor === it.key) h += popHtml(w, it, lock);
        gi++;
      });
      h += `<img class="pal" src="${MO.asset(wi % 2 ? 'moa.webp' : 'roi.webp')}" style="${wi % 2 ? 'right:0' : 'left:0'}" alt=""></div></section>`;
    });
    return h;
  }
  function popHtml(w, it, lock) {
    const title = it.review ? `${w.week}주차 복습` : esc(it.v.ref);
    if (lock) return `<div class="pop lock"><h4>${title}</h4><p>${weekState(w) === 'future' ? MO.mdK(w.start) + '에 열려요!' : '이번 주 말씀 3개를 먼저 끝내면 열려요!'}</p></div>`;
    return `<div class="pop"><h4>${title}</h4><p>${it.review ? '이번 주 3구절을 모두 확인해요' : esc(it.v.text.slice(0, 40)) + (it.v.text.length > 40 ? '…' : '')}</p><button class="btn" data-a="start" data-w="${w.week}" data-k="${it.key}">${it.done ? '다시 하기' : '시작하기'}</button></div>`;
  }
  function startLesson(week, key) {
    const w = H.plan.weeks.find(x => x.week === week); if (!w) return;
    const review = key === 'r' + week; const verse = review ? null : w.verses.find(v => v.id === key);
    MOLesson.start({
      verse, review, week, weekVerses: w.verses, pool: verseList(),
      onFinish: (r) => MO.api('kidLessonDone', review ? { review: true, week, score: r.score } : { verseId: verse.id, score: r.score }, { loader: false }),
      onClose: () => { popFor = null; load(true); }
    });
  }
  function readWeek(week) {
    const w = H.plan.weeks.find(x => x.week === week);
    const m = MO.modal({ title: `${w.week}주차 말씀 · ${w.theme}`, body: w.verses.map((v, i) => `<div style="background:#fff;border-radius:16px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start;box-shadow:var(--sh)"><div style="flex:1"><b style="color:var(--mane)">${esc(v.ref)}</b><p style="margin:2px 0 0;font-weight:600;line-height:1.65">${esc(v.text)}</p></div><button class="spk sm" data-i="${i}" aria-label="듣기">${MO.icon('spk', 18)}</button></div>`).join(''), foot: false, onClose: MO.hush });
    m.body.onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) { const v = w.verses[+b.dataset.i]; MO.speak(MO.refSpeech(v.ref) + '. ' + v.text); } };
  }

  /* ---------- 출석 ---------- */
  function attView() {
    const list = H.attendance, faces = ['face_roi.webp', 'face_moa.webp', 'face_roi2.webp', 'face_moa2.webp'];
    let h = `<h1 class="ph">내 출석</h1><div class="streak"><div><small style="font-weight:800;color:var(--sub)">연속 출석</small><br><b>${H.stats.streak}주</b></div><img src="${MO.asset('moa.webp')}" alt=""></div>`;
    if (!list.length) return h + `<div class="card empty">아직 출석 기록이 없어요.<br>이번 주일에 만나요!</div>`;
    const months = {}; list.forEach(a => { const m = a.date.slice(0, 7); (months[m] = months[m] || []).push(a); });
    Object.keys(months).sort().reverse().forEach(m => {
      h += `<div class="card month"><h4>${Number(m.slice(5))}월 <span style="color:var(--sub);font-size:13px">${months[m].filter(a => a.status).length}번 출석</span></h4><div class="stamps">${months[m].map((a, i) => `<div><div class="s ${a.status ? 'on' : 'off'}">${a.status ? `<img src="${MO.asset(faces[i % 4])}" alt="출석">` : '결석'}</div>${MO.md(a.date)}</div>`).join('')}</div></div>`;
    });
    return h;
  }
  /* ---------- 달란트 ---------- */
  function talView() {
    let h = `<h1 class="ph">내 달란트</h1><div class="coin"><small>내 달란트</small><b>${MO.icon('coin', 36)}${H.stats.talent}</b><p>말씀을 외우고 출석하면 쌓여요</p><img src="${MO.asset('moa.webp')}" alt=""></div>`;
    h += `<div class="card hist">${H.talents.length ? H.talents.map(t => `<div class="r"><span>${esc(t.reason)}<em>${MO.md(t.date)}</em></span><span class="${t.amount >= 0 ? 'plus' : 'minus'}">${t.amount >= 0 ? '+' : '−'}${Math.abs(t.amount)}</span></div>`).join('') : '<div class="empty">아직 받은 달란트가 없어요</div>'}</div>`;
    return h;
  }
  /* ---------- 내 정보 ---------- */
  function meView() {
    const ios = MO.isIOS();
    let h = `<h1 class="ph">내 정보</h1><div class="card" style="display:flex;gap:14px;align-items:center"><span style="width:62px;height:62px;border-radius:20px;background:linear-gradient(140deg,#ffd98a,#f5b335);display:grid;place-items:center;color:#fff;font-weight:900;font-size:20px">${esc(H.me.name.slice(-2))}</span><div><b style="font-size:21px">${esc(H.me.name)}</b><div style="color:var(--sub);font-weight:700">${esc(H.me.classLabel)}</div></div></div>`;
    if (!MO.isStandalone()) h += `<div class="card guide"><b style="font-size:17px;display:flex;align-items:center;gap:8px"><img src="${MO.asset('icon-rounded.png')}" style="width:30px;height:30px;border-radius:9px">모아온을 앱처럼 쓰기</b>
      ${MO.installPrompt ? `<button class="btn y block" data-a="install" style="margin-top:10px">홈 화면에 추가하기</button>` : ''}
      <div class="step"><em>1</em><div>${ios ? '아래쪽 <span class="k">공유 ⬆</span> 버튼을 눌러요' : '오른쪽 위 <span class="k">⋮ 메뉴</span>를 눌러요'}</div></div>
      <div class="step"><em>2</em><div><span class="k">홈 화면에 추가</span>를 눌러요</div></div>
      <div class="step"><em>3</em><div>홈 화면의 모아온 아이콘으로 바로 시작!</div></div></div>`;
    h += `<div class="card"><button class="menu-row" data-a="sound">${MO.icon(MO.sound ? 'sound' : 'mute', 22)} 효과음 <span>${MO.sound ? '켜짐' : '꺼짐'}</span></button><button class="menu-row" data-a="logout">${MO.icon('logout', 22)} 로그아웃</button></div>`;
    return h;
  }

  function bind() {
    app.querySelector('.kscr').onclick = async (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'sound') { MO.sound = !MO.sound; MO.store.set('sound', MO.sound); render(); return; }
      if (a === 'logout') { if (await MO.confirm('로그아웃할까요?', { ok: '로그아웃' })) { MO.store.del('kid'); H = null; showLogin(); } return; }
      if (a === 'install' && MO.installPrompt) { MO.installPrompt.prompt(); MO.installPrompt = null; return; }
      if (a === 'go') { const t = nextTarget(); if (t) startLesson(t.w.week, t.review ? 'r' + t.w.week : t.v.id); return; }
      if (a === 'read') return readWeek(+b.dataset.w);
      if (a === 'node') { const k = b.dataset.k; popFor = popFor === k ? null : k; MO.snd.tap(); const y = window.scrollY; render(); window.scrollTo(0, y); return; }
      if (a === 'start') return startLesson(+b.dataset.w, b.dataset.k);
    };
  }
  document.addEventListener('moaon:installable', () => { if (H && tab === 'me') render(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && H && !document.getElementById('lesson')) load(true); });

  if (MO.token()) load(); else showLogin();
})();
