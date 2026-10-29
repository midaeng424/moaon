/* 관리자 화면 2 — 성경암송 · 교적부 · 반 관리 · 권한 · 백업 · 초등부 현황 */
(function () {
  const A = window.ADM, P = A.pages, esc = MO.esc;

  /* =================== 성경암송 관리 =================== */
  let verPlan = '', verWeek = 0, verCls = '';
  P.ver = async function (pg) {
    const canE = A.edit('ver');
    A.setTitle('성경암송 관리', A.xlsBtn() + A.readonlyBadge('ver')); A.bindXls(() => XP.ver(verPlan));
    const d = await MO.api('verseData', {}, { loader: false });
    if (!d.plans.find(p => p.id === verPlan)) verPlan = d.activeId || (d.plans[0] && d.plans[0].id) || '';
    const plan = d.plans.find(p => p.id === verPlan);
    if (!verCls && A.activeClasses()[0]) verCls = A.activeClasses()[0].id;
    const done = {}; d.progress.forEach(p => { done[p.studentId + '|' + p.verseId] = p.source; });
    const draw = () => {
      const isActive = plan && plan.id === d.activeId;
      if (plan && (!verWeek || !plan.weeks.find(w => w.week === verWeek))) verWeek = isActive && d.currentWeek ? d.currentWeek : (plan.weeks[0] || {}).week;
      const wk = plan ? plan.weeks.find(w => w.week === verWeek) : null;
      const kids = A.st.boot.students.filter(s => s.status !== '졸업' && s.classId === verCls).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      const cell = (s, v) => { const src = done[s.id + '|' + v.id]; if (src === 'app') return `<span class="tag" style="--b:#fff3d6;--c:#a8621f" title="아이가 앱에서 완료">앱 완료</span>`; if (src === 'teacher') return `<button class="cbox on" ${canE ? `data-mark="${s.id}|${v.id}|0"` : 'disabled'} style="width:30px;height:30px;border-radius:50%;background:var(--grn);border-color:var(--grn)" aria-label="확인 취소">${MO.icon('check', 15, 'stroke-width="3.4"')}</button>`; return `<button class="cbox" ${canE ? `data-mark="${s.id}|${v.id}|1"` : 'disabled'} style="width:30px;height:30px;border-radius:50%;border-style:dashed" aria-label="외웠어요"></button>`; };
      pg.innerHTML = `${d.plans.length > 1 || canE ? `<div class="ch" style="margin:0"><div class="chips">${d.plans.map(p => `<button class="chip ${p.id === verPlan ? 'on' : ''}" data-plan="${p.id}">${esc(p.title)}${p.id === d.activeId ? ' · 진행 중' : ''}</button>`).join('')}</div>${canE ? `<button class="btn" data-new="1">${MO.icon('plus', 15)}새 암송 계획</button>` : ''}</div>` : ''}
        ${!plan ? `<div class="card">${A.empty('암송 계획이 없어요. 새 계획을 만들어 주세요.')}</div>` : `
        <div style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:18px;align-items:start" class="vergrid">
        <div class="card"><div class="ch"><b>${esc(plan.title)} <span class="note">${MO.md(plan.start)} ~ ${MO.md(plan.end)}</span></b><div class="acts">${canE && !isActive ? `<button class="btn y sm" data-act="1">이 계획으로 진행하기</button>` : isActive ? '<span class="tag" style="--b:#edf5e1;--c:#5b8a2e">아이 앱에 보이는 중</span>' : ''}${canE ? `<button class="btn o sm" data-edit="1">${MO.icon('edit', 13)}수정</button><button class="btn o sm" data-del="1" aria-label="계획 지우기">${MO.icon('trash', 13)}</button>` : ''}</div></div>
          <div class="tscroll"><table class="t"><thead><tr><th>주차</th><th>기간</th><th>주제 · 구절</th></tr></thead><tbody>
          ${plan.weeks.map(w => `<tr class="click ${w.week === verWeek ? 'hit' : ''}" data-week="${w.week}"><td><b>${w.week}주차</b>${isActive && w.week === d.currentWeek ? '<br><span class="tag" style="--b:#eea21f;--c:#fff;font-size:10px">이번 주</span>' : ''}</td><td class="note">${MO.md(w.start)}~${MO.md(w.end)}</td><td class="wrap"><b>${esc(w.theme)}</b><br><span style="font-size:12.5px;color:#6d5d4f">${w.verses.map(v => esc(v.ref)).join(' · ')}</span></td></tr>`).join('')}</tbody></table></div>
          <p class="note" style="margin:10px 0 0">구절을 고치면 아이 앱의 문제(빈칸·블록·장절)가 자동으로 바뀌어요. 주차를 누르면 오른쪽에서 확인할 수 있어요.</p></div>
        <div class="card"><div class="ch"><b>${wk ? wk.week + '주차 암송 확인' : '암송 확인'}</b><span>${wk ? esc(wk.theme) : ''}</span></div>
          <div class="chips" style="margin-bottom:10px">${A.activeClasses().map(c => `<button class="chip ${verCls === c.id ? 'on' : ''}" data-cls="${c.id}">${c.grade}학년 ${esc(c.name)}</button>`).join('')}</div>
          ${wk ? `<div class="tscroll"><table class="t"><thead><tr><th>이름</th>${wk.verses.map(v => `<th class="c">${esc(v.ref.replace(/(\S+)\s/, (m, b) => b.slice(0, 2) + ' '))}</th>`).join('')}<th class="r">완료</th></tr></thead><tbody>
          ${kids.map(s => { const n = wk.verses.filter(v => done[s.id + '|' + v.id]).length; return `<tr><td>${A.av(s.name, A.clsColor(s.classId))}<b>${esc(s.name)}</b></td>${wk.verses.map(v => `<td class="c">${cell(s, v)}</td>`).join('')}<td class="r"><b style="color:${n === wk.verses.length ? '#5b8a2e' : '#a8621f'}">${n}/${wk.verses.length}</b></td></tr>`; }).join('') || `<tr><td colspan="5">${A.empty('이 반에 학생이 없어요')}</td></tr>`}</tbody></table></div>
          <p class="note" style="margin:10px 0 0">아이가 선생님 앞에서 외우면 동그라미를 눌러 주세요. 달란트도 함께 들어가요. '앱 완료'는 아이가 앱 레슨을 끝낸 표시예요.</p>` : A.empty('주차를 골라 주세요')}</div></div>`}`;
      const g = pg.querySelector('.vergrid'); if (g && innerWidth < 1180) g.style.gridTemplateColumns = '1fr';
    };
    const editor = (p) => new Promise((res) => {
      let weeks = p ? JSON.parse(JSON.stringify(p.weeks)) : [{ start: MO.addDays(MO.lastSunday(A.st.boot.today), 8), end: MO.addDays(MO.lastSunday(A.st.boot.today), 14), theme: '', verses: [{ ref: '', text: '' }, { ref: '', text: '' }, { ref: '', text: '' }] }];
      let title = p ? p.title : '';
      const body = document.createElement('div'); body.style.cssText = 'display:grid;gap:12px';
      const sync = () => { title = body.querySelector('#pTitle').value; body.querySelectorAll('[data-w]').forEach(inp => { const w = weeks[+inp.dataset.w]; if (inp.dataset.v != null) w.verses[+inp.dataset.v][inp.dataset.k] = inp.value; else w[inp.dataset.k] = inp.value; }); };
      const paint = () => {
        body.innerHTML = `<label class="fld"><span>계획 이름 *</span><input class="inp" id="pTitle" value="${esc(title)}" placeholder="예: 2027 상반기 8주 말씀 암송"></label>
          ${weeks.map((w, i) => `<div style="background:#fff;border-radius:16px;padding:14px;display:grid;gap:8px;box-shadow:var(--sh)"><div style="display:flex;justify-content:space-between;align-items:center"><b>${i + 1}주차</b><button type="button" class="btn o sm" data-rmw="${i}">이 주차 빼기</button></div>
          <div class="row3"><label class="fld"><span>시작</span><input class="inp" type="date" data-w="${i}" data-k="start" value="${w.start}"></label><label class="fld"><span>끝</span><input class="inp" type="date" data-w="${i}" data-k="end" value="${w.end}"></label><label class="fld"><span>주제</span><input class="inp" data-w="${i}" data-k="theme" value="${esc(w.theme)}" placeholder="예: 하나님을 사랑해요"></label></div>
          ${w.verses.map((v, j) => `<div style="display:grid;grid-template-columns:150px 1fr 36px;gap:6px"><input class="inp" data-w="${i}" data-v="${j}" data-k="ref" value="${esc(v.ref)}" placeholder="장절 (예: 요 3:16)"><input class="inp" data-w="${i}" data-v="${j}" data-k="text" value="${esc(v.text)}" placeholder="말씀"><button type="button" class="btn o" data-rmv="${i}|${j}" aria-label="빼기">✕</button></div>`).join('')}
          <button type="button" class="btn o sm" data-addv="${i}" style="justify-self:start">${MO.icon('plus', 13)}구절 추가</button></div>`).join('')}
          <button type="button" class="btn o" id="addW">${MO.icon('plus', 15)}주차 추가 (다음 주 날짜로)</button>`;
      };
      paint();
      body.onclick = (e) => {
        const t = e.target.closest('button'); if (!t) return; sync();
        if (t.id === 'addW') { const last = weeks[weeks.length - 1]; weeks.push({ start: last ? MO.addDays(last.start, 7) : A.st.boot.today, end: last ? MO.addDays(last.end, 7) : MO.addDays(A.st.boot.today, 6), theme: '', verses: [{ ref: '', text: '' }, { ref: '', text: '' }, { ref: '', text: '' }] }); }
        else if (t.dataset.rmw != null) { if (weeks.length > 1) weeks.splice(+t.dataset.rmw, 1); }
        else if (t.dataset.addv != null) weeks[+t.dataset.addv].verses.push({ ref: '', text: '' });
        else if (t.dataset.rmv) { const [i, j] = t.dataset.rmv.split('|').map(Number); if (weeks[i].verses.length > 1) weeks[i].verses.splice(j, 1); }
        else return;
        paint();
      };
      const m = MO.modal({ title: p ? '암송 계획 수정' : '새 암송 계획', wide: true, body, foot: `<button class="btn o" data-v="0">취소</button><button class="btn" data-v="1">저장</button>`, onClose: () => res(false) });
      m.foot.onclick = async (e) => {
        const b = e.target.closest('[data-v]'); if (!b) return; if (b.dataset.v === '0') { m.el.remove(); return res(false); }
        sync();
        if (!title.trim()) return MO.toast('계획 이름을 입력해 주세요', 'err');
        if (weeks.some(w => !w.start || !w.end || w.end < w.start)) return MO.toast('주차 날짜를 확인해 주세요', 'err');
        try { await MO.api('planSave', { id: p && p.id, title, weeks }); m.el.remove(); MO.toast('저장했어요', 'ok'); res(true); } catch (er) { MO.err(er); }
      };
    });
    draw();
    pg.onclick = async (e) => {
      const pl = e.target.closest('[data-plan]'); if (pl) { verPlan = pl.dataset.plan; verWeek = 0; return P.ver(pg); }
      const w = e.target.closest('[data-week]'); if (w) { verWeek = +w.dataset.week; return draw(); }
      const c = e.target.closest('[data-cls]'); if (c) { verCls = c.dataset.cls; return draw(); }
      if (e.target.closest('[data-new]')) { if (await editor(null)) P.ver(pg); return; }
      if (e.target.closest('[data-edit]')) { if (await editor(plan)) P.ver(pg); return; }
      if (e.target.closest('[data-act]')) { if (await MO.confirm(`'${plan.title}'을(를) 아이 앱에 보이는 계획으로 바꿀까요?`, { ok: '바꾸기' })) { try { await MO.api('planActivate', { id: plan.id }); P.ver(pg); } catch (er) { MO.err(er); } } return; }
      if (e.target.closest('[data-del]')) { if (await MO.confirm(`'${plan.title}' 계획을 지울까요? 구절도 함께 지워져요.`, { ok: '지우기', danger: true })) { try { await MO.api('planDelete', { id: plan.id }); verPlan = ''; P.ver(pg); } catch (er) { MO.err(er); } } return; }
      const mk = e.target.closest('[data-mark]');
      if (mk) { const [sid, vid, on] = mk.dataset.mark.split('|'); try { await MO.api('progressMark', { studentId: sid, verseId: vid, done: on === '1' }, { loader: false }); if (on === '1') done[sid + '|' + vid] = 'teacher'; else delete done[sid + '|' + vid]; draw(); } catch (er) { MO.err(er); } }
    };
  };

  /* =================== 교적부 =================== */
  let rosSel = '', rosGrade = 0, rosQ = '', rosShowGrad = false;
  P.ros = async function (pg) {
    const canE = A.edit('ros');
    A.setTitle('교적부', A.xlsBtn() + A.readonlyBadge('ros')); A.bindXls(() => XP.rosOpen());
    await A.refreshBoot();
    const drawList = () => {
      const list = A.st.boot.students.filter(s => (rosShowGrad ? s.status === '졸업' : s.status !== '졸업') && (!rosGrade || (A.cls(s.classId) || {}).grade === rosGrade) && (!rosQ || s.name.includes(rosQ)))
        .sort((a, b) => (A.clsLabel(a.classId) + a.name).localeCompare(A.clsLabel(b.classId) + b.name, 'ko'));
      const act = A.st.boot.students.filter(s => s.status !== '졸업');
      pg.querySelector('#slist').innerHTML = list.map(s => `<button class="srow ${s.id === rosSel ? 'on' : ''}" data-sid="${s.id}">${A.av(s.name, A.clsColor(s.classId), 38)}<div style="flex:1;min-width:0"><b>${esc(s.name)}</b><small>${esc(A.clsLabel(s.classId))}</small></div></button>`).join('') || A.empty(rosQ ? '찾는 학생이 없어요' : '학생이 없어요');
      pg.querySelector('#sfilter').innerHTML = `<button class="chip ${!rosGrade && !rosShowGrad ? 'on' : ''}" data-g="0">전체 ${act.length}</button>${A.grades().map(g => `<button class="chip ${rosGrade === g && !rosShowGrad ? 'on' : ''}" data-g="${g}">${g}학년 ${act.filter(s => (A.cls(s.classId) || {}).grade === g).length}</button>`).join('')}${A.st.boot.students.some(s => s.status === '졸업') ? `<button class="chip ${rosShowGrad ? 'on' : ''}" data-grad="1">졸업</button>` : ''}`;
    };
    pg.innerHTML = `<div class="ros ${rosSel ? 'detail' : ''}" id="rosWrap"><div class="card slistcard" style="padding:14px"><input class="inp" id="sq" placeholder="⌕ 이름으로 찾기" value="${esc(rosQ)}" style="margin-bottom:10px"><div class="chips" id="sfilter" style="margin-bottom:8px"></div><div class="slist" id="slist"></div></div><div class="sdetail" id="sdetail"></div></div>
      ${canE ? `<div class="fab"><span>새 학생 등록</span><button data-new="1" aria-label="새 학생 등록">${MO.icon('plus', 30)}</button></div>` : ''}`;
    if (canE) document.body.appendChild(pg.querySelector('.fab'));
    drawList();
    const showDetail = async (id) => {
      rosSel = id; drawList(); pg.querySelector('#rosWrap').classList.add('detail');
      const box = pg.querySelector('#sdetail'); box.innerHTML = '<div class="skel" style="height:130px"></div><div class="skel" style="height:300px;margin-top:18px"></div>';
      const s = await MO.api('studentGet', { id, year: A.st.year }, { loader: false });
      const c = A.cls(s.classId), t = c ? A.teacher(c.teacherId) : null;
      const rate = s.attendance.length ? Math.round(s.attendance.filter(a => a.status).length / s.attendance.length * 100) : 0;
      box.innerHTML = `<div style="display:grid;gap:18px">
        <button class="btn o show-m" data-back="1" style="justify-self:start">‹ 목록으로</button>
        <div class="card" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><div class="photo" id="photo">${esc(s.name.slice(-2))}${canE ? `<label class="cam" title="사진 바꾸기">${MO.icon('cam', 18)}<input type="file" accept="image/*" hidden id="photoIn"></label>` : ''}</div>
          <div style="flex:1;min-width:180px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><b style="font-size:27px;font-weight:900;letter-spacing:-.6px">${esc(s.name)}</b><span class="tag" style="--b:#fff3d6;--c:#a8621f;font-size:13px">${esc(A.clsLabel(s.classId))}</span>${s.status === '졸업' ? '<span class="tag">졸업</span>' : ''}</div>
          <p style="margin:6px 0 0;font-size:14.5px;font-weight:700;color:#6d5d4f">${s.birth ? `${s.birth.replace(/-/g, '.')} (만 ${s.age}세)` : '생년월일 없음'} · 담임 ${t ? esc(t.name) : '-'}</p>${canE ? '<p class="note" style="margin:4px 0 0">카메라 버튼으로 사진을 바꿀 수 있어요</p>' : ''}</div>
          ${canE ? `<div class="acts" style="display:flex;gap:6px;align-self:flex-start"><button class="btn o" data-pin="1">${MO.icon('key', 15)}앱 비밀번호</button><button class="btn o" data-edit="1">${MO.icon('edit', 15)}수정</button></div>` : ''}</div>
        <div class="kpis" style="--n:3">${A.kpi(`${A.st.year}년 출석률`, rate + '<em>%</em>', `${s.attendance.filter(a => a.status).length} / ${s.attendance.length}주`, '#78a744')}${A.kpi('달란트', String(s.talent), '지금 가진 달란트', '#9a5530')}${A.kpi('말씀 암송', `${s.verses.learned} / ${s.verses.total}`, '진행 중인 계획 기준', '#d4863c')}</div>
        <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:18px" class="rgrid">
        <div class="card"><div class="ch"><b>기본 정보</b><span>${s.consentDate ? '보호자 동의 ' + s.consentDate.replace(/-/g, '.') + ' ✓' : '<span style="color:#cf5c45">보호자 동의일을 넣어 주세요</span>'}</span></div>
          <table class="t info"><tbody>${[['성별', s.gender || '-'], ['생년월일', s.birth ? `${s.birth.replace(/-/g, '.')} (만 ${s.age}세)` : '-'], ['보호자 1', s.guardian1 || '-'], ['보호자 2', s.guardian2 || '-'], ['주소', s.address || '-'], ['등록일', s.regDate ? s.regDate.replace(/-/g, '.') : '-']].map(([k, v]) => `<tr><td>${k}</td><td class="wrap"><b style="font-weight:700">${esc(v)}</b></td></tr>`).join('')}</tbody></table>
          <div style="font-weight:900;font-size:14px;margin:16px 0 4px">가족 관계</div>
          <div class="tscroll"><table class="t"><thead><tr><th>관계</th><th>이름</th><th>성별</th><th>소속 기관 · 직분</th></tr></thead><tbody>${s.family.length ? s.family.map(f => `<tr><td>${esc(f.rel)}</td><td>${esc(f.name)}</td><td>${esc(f.gender)}</td><td class="wrap">${esc(f.org)}</td></tr>`).join('') : '<tr><td colspan="4" class="note">아직 없어요</td></tr>'}</tbody></table></div>
          <div style="font-weight:900;font-size:14px;margin:16px 0 4px">이전 기관 담임</div>
          <table class="t"><tbody>${s.prevTeachers.length ? s.prevTeachers.map(p => `<tr><td class="note" style="width:96px">${esc(p.year)}</td><td class="wrap">${esc(p.org)}</td><td class="r"><b>${esc(p.teacher)}</b></td></tr>`).join('') : '<tr><td class="note">아직 없어요</td></tr>'}</tbody></table></div>
        <div class="card"><div class="ch"><b>기타 (요청 · 특이사항)</b><span>${s.notes.length}건</span></div>
          <div class="list">${s.notes.map(n => `<div class="li" style="align-items:flex-start"><span class="tag" style="${n.type === '요청' ? '--b:#e6f0fa;--c:#3d7cb8' : '--b:#fde8e1;--c:#cf5c45'};flex:none">${n.type}</span><div><b style="font-size:13.5px;font-weight:700;white-space:normal">${esc(n.text)}</b><span>${n.date.replace(/-/g, '.')} · ${esc(n.by)}</span></div>${canE ? `<button class="btn o sm" data-delnote="${n.id}" aria-label="지우기">${MO.icon('trash', 13)}</button>` : ''}</div>`).join('') || '<p class="note" style="margin:0">아직 없어요</p>'}</div>
          ${canE ? `<form id="noteF" style="display:grid;gap:8px;margin-top:12px"><div style="display:flex;gap:6px"><select class="inp" id="noteT" style="width:auto"><option>특이사항</option><option>요청</option></select><input class="inp" id="noteX" placeholder="요청이나 특이사항을 적어 주세요" maxlength="300"></div><button class="btn" type="submit">추가</button></form>` : ''}</div></div>
        <div class="card"><div class="ch"><b>${A.st.year}년 출석 기록</b><span>${s.attendance.filter(a => a.status).length}회 출석 · ${s.attendance.length}주 기록</span></div>
          ${s.attendance.length ? `<div class="strip">${s.attendance.map(a => `<span class="${a.status ? 'y' : ''}" title="${MO.md(a.date)} ${a.status ? '출석' : '결석'}"></span>`).join('')}</div><div style="display:flex;justify-content:space-between;margin-top:6px" class="note"><span>${MO.md(s.attendance[0].date)}</span><span>${MO.md(s.attendance[s.attendance.length - 1].date)}</span></div>` : '<p class="note" style="margin:0">아직 기록이 없어요</p>'}</div></div>`;
      const g = box.querySelector('.rgrid'); if (innerWidth < 1180) g.style.gridTemplateColumns = '1fr';
      if (s.photoId) MO.api('studentPhotoGet', { id: s.id }, { loader: false }).then(url => { if (url && rosSel === s.id) { const ph = box.querySelector('#photo'); const im = document.createElement('img'); im.src = url; im.alt = s.name + ' 사진'; ph.firstChild.replaceWith(im); } }).catch(() => {});
      const pin = box.querySelector('#photoIn');
      if (pin) pin.onchange = async () => {
        const f = pin.files[0]; if (!f) return;
        try { const data = await MO.resizeImage(f, 480, .85); await MO.api('studentPhoto', { id: s.id, data }); MO.toast('사진을 바꿨어요', 'ok'); showDetail(s.id); } catch (er) { MO.err(er); }
      };
      const nf = box.querySelector('#noteF');
      if (nf) nf.onsubmit = async (ev) => { ev.preventDefault(); const text = box.querySelector('#noteX').value.trim(); if (!text) return; try { await MO.api('noteAdd', { studentId: s.id, type: box.querySelector('#noteT').value, text }); showDetail(s.id); } catch (er) { MO.err(er); } };
      box.onclick = async (ev) => {
        if (ev.target.closest('[data-back]')) { rosSel = ''; pg.querySelector('#rosWrap').classList.remove('detail'); drawList(); return; }
        const dn = ev.target.closest('[data-delnote]'); if (dn && await MO.confirm('이 메모를 지울까요?', { ok: '지우기', danger: true })) { try { await MO.api('noteDelete', { id: dn.dataset.delnote }); showDetail(s.id); } catch (er) { MO.err(er); } return; }
        if (ev.target.closest('[data-edit]')) { if (await studentForm(s)) { await A.refreshBoot(); showDetail(s.id); } return; }
        if (ev.target.closest('[data-pin]')) {
          const v = await MO.form({ title: `${s.name} · 아이 앱 비밀번호`, submit: '바꾸기', fields: [{ key: 'pin', label: '새 비밀번호 (숫자 4자리)', type: 'tel', max: 4, required: true }], extra: `<p class="note" style="margin:0">${s.hasPin ? '지금 비밀번호는 보안을 위해 보여 드리지 않아요. 새로 정해 주세요.' : '아직 비밀번호가 없어요.'}</p>` });
          if (!v) return; if (!/^\d{4}$/.test(v.pin)) return MO.toast('숫자 4자리로 정해 주세요', 'err');
          try { await MO.api('studentPin', { id: s.id, pin: v.pin }); MO.alert('비밀번호를 바꿨어요', `<p style="margin:0;font-weight:700">${esc(s.name)}의 새 비밀번호: <b style="font-size:22px;color:var(--mane)">${v.pin}</b></p><p class="note">아이에게 알려 주세요.</p>`); } catch (er) { MO.err(er); }
        }
      };
    };
    const studentForm = (s) => new Promise((res) => {
      const isNew = !s;
      s = s ? JSON.parse(JSON.stringify(s)) : { name: '', gender: '', birth: '', classId: (A.activeClasses()[0] || {}).id || '', status: '재적', guardian1: '', guardian2: '', address: '', family: [], prevTeachers: [], consentDate: '', regDate: A.st.boot.today };
      const body = document.createElement('div'); body.style.cssText = 'display:grid;gap:12px';
      const inp = (k, label, type = 'text', ph = '') => `<label class="fld"><span>${label}</span><input class="inp" data-k="${k}" type="${type}" value="${esc(s[k] || '')}" placeholder="${ph}"></label>`;
      const sync = () => { body.querySelectorAll('[data-k]').forEach(el => { s[el.dataset.k] = el.value; }); body.querySelectorAll('[data-fam]').forEach(el => { const [i, k] = el.dataset.fam.split('|'); s.family[+i][k] = el.value; }); body.querySelectorAll('[data-prev]').forEach(el => { const [i, k] = el.dataset.prev.split('|'); s.prevTeachers[+i][k] = el.value; }); };
      const paint = () => {
        body.innerHTML = `<div class="row2">${inp('name', '이름 *', 'text', '예: 김하준')}<label class="fld"><span>반</span><select class="inp" data-k="classId">${A.st.boot.classes.map(c => `<option value="${c.id}" ${c.id === s.classId ? 'selected' : ''}>${c.grade}학년 ${esc(c.name)}</option>`).join('')}</select></label></div>
          <div class="row3"><label class="fld"><span>성별</span><select class="inp" data-k="gender">${['', '남', '여'].map(g => `<option ${g === s.gender ? 'selected' : ''} value="${g}">${g || '선택'}</option>`).join('')}</select></label>${inp('birth', '생년월일', 'date')}<label class="fld"><span>상태</span><select class="inp" data-k="status">${['재적', '졸업'].map(g => `<option ${g === s.status ? 'selected' : ''}>${g}</option>`).join('')}</select></label></div>
          <div class="row2">${inp('guardian1', '보호자 1', 'text', '예: 김○○ (부) · 010-0000-0000')}${inp('guardian2', '보호자 2', 'text', '예: 이○○ (모) · 010-0000-0000')}</div>
          ${inp('address', '주소')}
          <div class="row2">${inp('consentDate', '보호자 개인정보 동의일', 'date')}${inp('regDate', '등록일', 'date')}</div>
          ${isNew ? `<label class="fld"><span>아이 앱 비밀번호 (숫자 4자리)</span><input class="inp" data-k="pin" type="tel" maxlength="4" value="${esc(s.pin || '')}" placeholder="비워 두면 생일 월일(예: 0512)"></label>` : ''}
          <div class="fld"><span>가족 관계</span>${s.family.map((f, i) => `<div style="display:grid;grid-template-columns:70px 1fr 64px 1.3fr 36px;gap:6px"><input class="inp" data-fam="${i}|rel" value="${esc(f.rel)}" placeholder="관계"><input class="inp" data-fam="${i}|name" value="${esc(f.name)}" placeholder="이름"><input class="inp" data-fam="${i}|gender" value="${esc(f.gender)}" placeholder="성별"><input class="inp" data-fam="${i}|org" value="${esc(f.org)}" placeholder="소속 기관 · 직분"><button type="button" class="btn o" data-rmf="${i}" aria-label="빼기">✕</button></div>`).join('')}<button type="button" class="btn o sm" id="addF" style="justify-self:start">${MO.icon('plus', 13)}가족 추가</button></div>
          <div class="fld"><span>이전 기관 담임</span>${s.prevTeachers.map((p, i) => `<div style="display:grid;grid-template-columns:100px 1fr 110px 36px;gap:6px"><input class="inp" data-prev="${i}|year" value="${esc(p.year)}" placeholder="연도"><input class="inp" data-prev="${i}|org" value="${esc(p.org)}" placeholder="기관 (예: 유년부)"><input class="inp" data-prev="${i}|teacher" value="${esc(p.teacher)}" placeholder="담임"><button type="button" class="btn o" data-rmp="${i}" aria-label="빼기">✕</button></div>`).join('')}<button type="button" class="btn o sm" id="addP" style="justify-self:start">${MO.icon('plus', 13)}이전 담임 추가</button></div>`;
      };
      paint();
      body.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; sync();
        if (b.id === 'addF') s.family.push({ rel: '', name: '', gender: '', org: '' }); else if (b.id === 'addP') s.prevTeachers.push({ year: '', org: '', teacher: '' });
        else if (b.dataset.rmf != null) s.family.splice(+b.dataset.rmf, 1); else if (b.dataset.rmp != null) s.prevTeachers.splice(+b.dataset.rmp, 1); else return; paint(); };
      const m = MO.modal({ title: isNew ? '새 학생 등록' : `${s.name} 정보 수정`, wide: true, body, foot: `<button class="btn o" data-v="0">취소</button><button class="btn" data-v="1">저장</button>`, onClose: () => res(false) });
      m.foot.onclick = async (e) => {
        const b = e.target.closest('[data-v]'); if (!b) return; if (b.dataset.v === '0') { m.el.remove(); return res(false); }
        sync(); if (!s.name.trim()) return MO.toast('이름을 입력해 주세요', 'err');
        if (s.pin && !/^\d{4}$/.test(s.pin)) return MO.toast('앱 비밀번호는 숫자 4자리예요', 'err');
        s.family = s.family.filter(f => f.rel || f.name); s.prevTeachers = s.prevTeachers.filter(p => p.org || p.teacher);
        try {
          const r = await MO.api('studentSave', s); m.el.remove();
          if (isNew) { await MO.alert('등록했어요', `<p style="margin:0;font-weight:700">${esc(r.name)} · ${esc(A.clsLabel(r.classId))}</p><p style="margin:8px 0 0">아이 앱 첫 비밀번호: <b style="font-size:24px;color:var(--mane)">${r.initialPin}</b></p><p class="note">아이에게 알려 주세요. 교적부에서 언제든 바꿀 수 있어요.</p>`); rosSel = r.id; }
          else MO.toast('저장했어요', 'ok');
          res(true);
        } catch (er) { MO.err(er); }
      };
    });
    pg.onclick = async (e) => {
      const r = e.target.closest('[data-sid]'); if (r) return showDetail(r.dataset.sid);
      const g = e.target.closest('[data-g]'); if (g) { rosGrade = rosGrade === +g.dataset.g ? 0 : +g.dataset.g; rosShowGrad = false; return drawList(); }
      if (e.target.closest('[data-grad]')) { rosShowGrad = !rosShowGrad; rosGrade = 0; return drawList(); }
    };
    pg.querySelector('#sq').oninput = (e) => { rosQ = e.target.value.trim(); drawList(); };
    const fab = document.querySelector('.fab [data-new]');
    if (fab) fab.onclick = async () => { if (!A.st.boot.classes.length) return MO.toast('반 관리에서 반을 먼저 만들어 주세요', 'err'); if (await studentForm(null)) { await A.refreshBoot(); drawList(); if (rosSel) showDetail(rosSel); } };
    if (rosSel && A.stu(rosSel)) showDetail(rosSel); else { rosSel = ''; pg.querySelector('#rosWrap').classList.remove('detail'); pg.querySelector('#sdetail').innerHTML = `<div class="card">${A.empty('왼쪽에서 학생을 골라 주세요')}</div>`; }
  };

  /* =================== 반 관리 =================== */
  let mvFrom = '', mvSel = new Set();
  P.cls = async function (pg) {
    const canE = A.edit('cls');
    A.setTitle('반 관리', A.readonlyBadge('cls'));
    await A.refreshBoot();
    const B = A.st.boot;
    const draw = () => {
      if (!mvFrom && B.classes[0]) mvFrom = B.classes[0].id;
      const mvList = B.students.filter(s => s.status !== '졸업' && s.classId === mvFrom);
      pg.innerHTML = `<div class="card" style="display:flex;align-items:center;gap:14px;background:linear-gradient(110deg,#edf5e1,#fff3d6);box-shadow:none"><img src="${MO.asset('moa.webp')}" style="height:76px;margin:-12px 0" alt=""><div style="flex:1"><b style="font-size:17px;font-weight:900">반 이름과 담임 선생님은 서기가 직접 등록·수정해요</b><p class="note" style="margin:4px 0 0;font-size:13px">여기서 바꾸면 교적부 · 출석 · 달란트 · 아이 앱 로그인 화면의 반 목록에 바로 반영돼요.</p></div></div>
        <div class="ccards">${B.classes.map(c => `<div class="ccard" style="${c.active ? '' : 'opacity:.6'}"><div style="display:flex;justify-content:space-between;align-items:center"><span class="tag" style="--b:${c.color}22;--c:${c.color}">${c.grade}학년${c.active ? '' : ' · 사용 안 함'}</span>${canE ? `<button class="btn o sm" data-cedit="${c.id}">수정</button>` : ''}</div><div class="nm"><i style="--c:${c.color}">${esc(c.name.slice(0, 1))}</i><b>${esc(c.name)}</b></div><table class="t"><tbody><tr><td class="note">담임</td><td class="r"><b>${esc(c.teacherName || '-')}</b></td></tr><tr><td class="note">보조</td><td class="r"><b>${esc(c.assistantName || '-')}</b></td></tr><tr><td class="note">학생</td><td class="r"><b>${c.count}명</b></td></tr></tbody></table></div>`).join('')}
          ${canE ? `<button class="addcard" data-cadd="1"><span><span style="display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:var(--soft);margin:0 auto 8px;font-size:28px">+</span>반 추가</span></button>` : ''}</div>
        <div class="g2"><div class="card"><div class="ch"><b>선생님 목록</b>${canE ? `<button class="btn" data-tadd="1">${MO.icon('plus', 15)}선생님 등록</button>` : ''}</div>
          <div class="tscroll"><table class="t"><thead><tr><th>이름</th><th>역할</th><th>담당 반</th><th>연락처</th>${canE ? '<th></th>' : ''}</tr></thead><tbody>
          ${B.teachers.map(t => { const cs = B.classes.filter(c => c.teacherId === t.id || c.assistantId === t.id).map(c => `${c.grade}학년 ${c.name}`).join(', '); return `<tr><td><b>${esc(t.name)}</b></td><td><span class="tag" style="${t.role === '담임' ? '--b:#fff3d6;--c:#a8621f' : '--b:#e6f0fa;--c:#3d7cb8'}">${t.role}</span></td><td>${esc(cs) || '<span class="note">-</span>'}</td><td class="note">${esc(t.phone) || '-'}</td>${canE ? `<td class="r"><button class="btn o sm" data-tedit="${t.id}">수정</button></td>` : ''}</tr>`; }).join('') || `<tr><td colspan="5">${A.empty('선생님을 등록해 주세요')}</td></tr>`}</tbody></table></div></div>
        <div class="card"><div class="ch"><b>학생 반 옮기기 · 졸업</b><span>새 학년도 진급 때 써요</span></div>
          <div class="chips" style="margin-bottom:10px">${B.classes.map(c => `<button class="chip ${mvFrom === c.id ? 'on' : ''}" data-from="${c.id}">${c.grade}학년 ${esc(c.name)}</button>`).join('')}</div>
          <div class="list" style="max-height:300px;overflow-y:auto">${mvList.map(s => `<button class="li" data-mv="${s.id}" style="width:100%;text-align:left" ${canE ? '' : 'disabled'}><span class="cbox ${mvSel.has(s.id) ? 'on' : ''}">${MO.icon('check', 13, 'stroke-width="3.5"')}</span><div><b>${esc(s.name)}</b></div></button>`).join('') || '<p class="note" style="margin:0">이 반에 학생이 없어요</p>'}</div>
          ${canE ? `<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><select class="inp" id="mvTo" style="flex:1;min-width:150px"><option value="">옮길 곳 고르기</option>${B.classes.filter(c => c.id !== mvFrom).map(c => `<option value="${c.id}">${c.grade}학년 ${esc(c.name)}으로</option>`).join('')}<option value="__grad">졸업 처리</option></select><button class="btn y" data-domove="1" ${mvSel.size ? '' : 'disabled'}>${mvSel.size}명 옮기기</button></div><p class="note" style="margin:8px 0 0">반을 옮기면 이전 반과 담임이 교적부 '이전 기관 담임'에 자동으로 남아요.</p>` : ''}</div></div>`;
    };
    const classForm = async (c) => {
      const v = await MO.form({ title: c ? '반 수정' : '반 추가', fields: [
        { key: 'grade', label: '학년', type: 'select', options: [1, 2, 3, 4, 5, 6].map(g => [g, g + '학년']), value: c ? c.grade : 3, half: true },
        { key: 'name', label: '반 이름', value: c ? c.name : '', required: true, half: true, placeholder: '예: 사랑반' },
        { key: 'teacherId', label: '담임 선생님', type: 'select', options: [['', '없음'], ...B.teachers.map(t => [t.id, t.name])], value: c ? c.teacherId : '', half: true },
        { key: 'assistantId', label: '보조 선생님', type: 'select', options: [['', '없음'], ...B.teachers.map(t => [t.id, t.name])], value: c ? c.assistantId : '', half: true },
        { key: 'color', label: '색', type: 'color', value: c ? c.color : '#eea21f' },
        { key: 'active', label: '사용 중인 반', type: 'checkbox', value: c ? c.active : true }],
        extra: c ? `<button type="button" class="btn r sm" data-cdel="${c.id}" style="justify-self:start">${MO.icon('trash', 13)}이 반 지우기</button>` : '' });
      if (!v) return;
      try { await MO.api('classSave', Object.assign({ id: c && c.id }, v, { grade: Number(v.grade) })); MO.toast('저장했어요', 'ok'); P.cls(pg); } catch (er) { MO.err(er); }
    };
    const teacherForm = async (t) => {
      const v = await MO.form({ title: t ? '선생님 정보 수정' : '선생님 등록', fields: [
        { key: 'name', label: '이름', value: t ? t.name : '', required: true, half: true }, { key: 'role', label: '역할', type: 'select', options: ['담임', '보조'], value: t ? t.role : '담임', half: true },
        { key: 'phone', label: '연락처', value: t ? t.phone : '', placeholder: '010-0000-0000' }, { key: 'memo', label: '메모', value: t ? t.memo : '' }],
        extra: t ? `<button type="button" class="btn r sm" data-tdel="${t.id}" style="justify-self:start">${MO.icon('trash', 13)}선생님 지우기</button>` : '' });
      if (!v) return;
      try { await MO.api('teacherSave', Object.assign({ id: t && t.id }, v)); MO.toast('저장했어요', 'ok'); P.cls(pg); } catch (er) { MO.err(er); }
    };
    draw();
    const delHandler = async (e) => {
      const cd = e.target.closest('[data-cdel]'), td = e.target.closest('[data-tdel]');
      if (!cd && !td) return;
      const sc = e.target.closest('.scrim');
      if (cd && await MO.confirm('이 반을 지울까요?', { ok: '지우기', danger: true })) { sc && sc.remove(); try { await MO.api('classDelete', { id: cd.dataset.cdel }); P.cls(pg); } catch (er) { MO.err(er); } }
      if (td && await MO.confirm('이 선생님을 지울까요? 맡은 반에서도 빠져요.', { ok: '지우기', danger: true })) { sc && sc.remove(); try { await MO.api('teacherDelete', { id: td.dataset.tdel }); P.cls(pg); } catch (er) { MO.err(er); } }
    };
    document.body.removeEventListener('click', A._clsDel || (() => {})); A._clsDel = delHandler; document.body.addEventListener('click', delHandler);
    pg.onclick = async (e) => {
      if (e.target.closest('[data-cadd]')) return classForm(null);
      const ce = e.target.closest('[data-cedit]'); if (ce) return classForm(B.classes.find(c => c.id === ce.dataset.cedit));
      if (e.target.closest('[data-tadd]')) return teacherForm(null);
      const te = e.target.closest('[data-tedit]'); if (te) return teacherForm(B.teachers.find(t => t.id === te.dataset.tedit));
      const f = e.target.closest('[data-from]'); if (f) { mvFrom = f.dataset.from; mvSel = new Set(); return draw(); }
      const mv = e.target.closest('[data-mv]'); if (mv) { const id = mv.dataset.mv; mvSel.has(id) ? mvSel.delete(id) : mvSel.add(id); return draw(); }
      if (e.target.closest('[data-domove]')) {
        const to = pg.querySelector('#mvTo').value; if (!to) return MO.toast('옮길 곳을 골라 주세요', 'err');
        const grad = to === '__grad';
        if (!(await MO.confirm(grad ? `${mvSel.size}명을 졸업 처리할까요? 교적부 기록은 그대로 남아요.` : `${mvSel.size}명을 ${A.clsLabel(to)}으로 옮길까요?`, { ok: grad ? '졸업 처리' : '옮기기' }))) return;
        try { await MO.api('studentsMove', { studentIds: [...mvSel], classId: grad ? '' : to, graduate: grad }); mvSel = new Set(); MO.toast('처리했어요', 'ok'); P.cls(pg); } catch (er) { MO.err(er); }
      }
    };
  };

  /* =================== 권한 관리 (마스터) =================== */
  P.perm = async function (pg) {
    A.setTitle('권한 관리');
    const d = await MO.api('adminList', {}, { loader: false });
    const RC = { master: ['#3f3228', '#fff'], pastor: ['#e6f0fa', '#3d7cb8'], chongmu: ['#fff3d6', '#a8621f'], secretary: ['#edf5e1', '#5b8a2e'], treasurer: ['#fde8e1', '#cf5c45'] };
    const MN = { dash: '대시보드', att: '출석', off: '헌금', tal: '달란트', acc: '회계 (수입·지출)', ver: '성경암송 관리', ros: '교적부', cls: '반 관리', report: '초등부 현황' };
    const roles = ['pastor', 'chongmu', 'secretary', 'treasurer'];
    const mx = JSON.parse(JSON.stringify(d.matrix)); let dirty = false;
    const showTemp = (name, loginId, pw) => MO.alert('임시 비밀번호', `<p style="margin:0;font-weight:700">${esc(name)} (아이디 <b>${esc(loginId)}</b>)</p><div style="display:flex;gap:8px;align-items:center;margin-top:10px"><b style="font-size:24px;letter-spacing:1px;color:var(--mane);background:var(--yel-l);padding:8px 14px;border-radius:12px" id="tpw">${esc(pw)}</b><button class="btn o sm" id="cpy">복사</button></div><p class="note">이 비밀번호를 직접 전해 주세요. 첫 로그인 때 새 비밀번호로 바꾸게 돼요. 이 창을 닫으면 다시 볼 수 없어요.</p>`)
      .then(() => {}) && setTimeout(() => { const b = document.getElementById('cpy'); if (b) b.onclick = () => navigator.clipboard.writeText(pw).then(() => MO.toast('복사했어요', 'ok')).catch(() => MO.toast('길게 눌러 복사해 주세요')); }, 50);
    const draw = () => {
      pg.innerHTML = `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:18px;align-items:start" class="pgrid">
        <div style="display:grid;gap:18px"><div class="card mastercard"><div style="width:70px;height:70px;border-radius:20px;overflow:hidden;flex:none"><img src="${MO.asset('icon-rounded.png')}" alt=""></div><div><span style="font-size:12px;opacity:.75;font-weight:700">마스터 관리자</span><b style="display:block;font-size:25px;font-weight:900;letter-spacing:-.5px">${esc(A.st.me.name)}</b><span style="font-size:12.5px;opacity:.85;font-weight:700">모든 메뉴 편집 · 관리자 권한 부여/해제 · 백업</span></div></div>
        <div class="card"><div class="ch"><b>관리자 계정</b><button class="btn" data-add="1">${MO.icon('plus', 15)}관리자 초대</button></div>
          <div class="list">${d.admins.map(a => `<div class="li">${A.av(a.name, RC[a.role][0] === '#3f3228' ? '#3f3228' : RC[a.role][1], 40)}<div><b>${esc(a.name)} <span class="role" style="--b:${RC[a.role][0]};--c:${RC[a.role][1]}">${esc(d.roles[a.role])}</span></b><span>${esc(a.loginId)} · 최근 접속 ${a.lastLogin ? esc(a.lastLogin.slice(0, 16)) : '없음'}</span></div>${a.mustChange ? '<span class="tag" style="--b:#fff3d6;--c:#a8621f">첫 로그인 전</span>' : a.active ? '<span class="tag" style="--b:#edf5e1;--c:#5b8a2e">사용 중</span>' : '<span class="tag">꺼짐</span>'}${a.role !== 'master' ? `<button class="btn o sm" data-edit="${a.id}">설정</button>` : ''}</div>`).join('')}</div>
          <p class="note" style="margin:10px 0 0;line-height:1.6">관리자 페이지는 마스터·교역자·총무·서기·회계만 들어올 수 있어요. 선생님·아이들은 아이 앱만 써요.</p></div></div>
        <div class="card"><div class="ch"><b>역할별 권한</b><span>칸을 누르면 없음 → 보기 → 편집으로 바뀌어요</span></div>
          <div class="tscroll"><table class="t"><thead><tr><th>메뉴</th><th class="c"><span class="role" style="--b:#3f3228;--c:#fff;margin:0">마스터</span></th>${roles.map(r => `<th class="c"><span class="role" style="--b:${RC[r][0]};--c:${RC[r][1]};margin:0">${d.roles[r]}</span></th>`).join('')}</tr></thead><tbody>
          ${Object.keys(MN).map(m => `<tr><td><b>${MN[m]}</b></td><td class="c"><span class="perm p2">편집</span></td>${roles.map(r => `<td class="c"><button class="perm p${mx[r][m]}" data-cell="${r}|${m}">${['없음', '보기', '편집'][mx[r][m]]}</button></td>`).join('')}</tr>`).join('')}
          <tr><td><b>권한 관리 · 백업</b></td><td class="c"><span class="perm p2">편집</span></td>${roles.map(() => '<td class="c"><span class="perm p0">없음</span></td>').join('')}</tr></tbody></table></div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn" data-savep="1" ${dirty ? '' : 'disabled'}>권한 저장</button></div>
          <div style="margin-top:12px;display:grid;gap:8px"><div style="background:var(--sky-l);border-radius:14px;padding:12px 14px;font-weight:700;color:var(--sky-t);line-height:1.55">교역자는 '보기 전용'으로 들어와 결과만 정리된 <b>초등부 현황</b> 화면을 봐요. 편집 권한을 줘도 보기로만 열려요.</div></div></div></div>`;
      const g = pg.querySelector('.pgrid'); if (innerWidth < 1180) g.style.gridTemplateColumns = '1fr';
    };
    draw();
    pg.onclick = async (e) => {
      const c = e.target.closest('[data-cell]'); if (c) { const [r, m] = c.dataset.cell.split('|'); const maxV = r === 'pastor' ? 1 : 2; mx[r][m] = (mx[r][m] + 1) % (maxV + 1); dirty = true; return draw(); }
      if (e.target.closest('[data-savep]')) { try { await MO.api('permsSave', { matrix: mx }); dirty = false; MO.toast('권한을 저장했어요. 각 관리자가 다시 로그인하거나 새로고침하면 반영돼요.', 'ok'); draw(); } catch (er) { MO.err(er); } return; }
      if (e.target.closest('[data-add]')) {
        const v = await MO.form({ title: '관리자 초대', submit: '만들기', fields: [{ key: 'name', label: '이름', required: true, placeholder: '예: 박○○' }, { key: 'loginId', label: '아이디 (영문 소문자·숫자)', required: true, placeholder: '예: secretary' }, { key: 'role', label: '역할', type: 'select', options: roles.map(r => [r, d.roles[r]]) }] });
        if (!v) return;
        try { const r = await MO.api('adminSave', v); await P.perm(pg); showTemp(r.admin.name, r.admin.loginId, r.tempPassword); } catch (er) { MO.err(er); }
        return;
      }
      const ed = e.target.closest('[data-edit]');
      if (ed) {
        const a = d.admins.find(x => x.id === ed.dataset.edit);
        const m = MO.modal({ title: `${a.name} 설정`, body: `<div style="display:grid;gap:12px"><label class="fld"><span>이름</span><input class="inp" id="aN" value="${esc(a.name)}"></label><label class="fld"><span>아이디</span><input class="inp" id="aL" value="${esc(a.loginId)}"></label><label class="fld"><span>역할</span><select class="inp" id="aR">${roles.map(r => `<option value="${r}" ${r === a.role ? 'selected' : ''}>${d.roles[r]}</option>`).join('')}</select></label><label class="check"><input type="checkbox" id="aA" ${a.active ? 'checked' : ''}> 사용 중 (끄면 바로 로그인할 수 없어요)</label></div>`,
          foot: `<button class="btn r" data-v="del" style="margin-right:auto">${MO.icon('trash', 14)}삭제</button><button class="btn o" data-v="pw">${MO.icon('key', 14)}비밀번호 초기화</button><button class="btn" data-v="save">저장</button>` });
        m.foot.onclick = async (ev) => {
          const b = ev.target.closest('[data-v]'); if (!b) return;
          try {
            if (b.dataset.v === 'save') { await MO.api('adminSave', { id: a.id, name: m.body.querySelector('#aN').value, loginId: m.body.querySelector('#aL').value, role: m.body.querySelector('#aR').value, active: m.body.querySelector('#aA').checked }); m.close(); MO.toast('저장했어요', 'ok'); P.perm(pg); }
            if (b.dataset.v === 'pw' && await MO.confirm(`${a.name}의 비밀번호를 초기화할까요? 임시 비밀번호가 새로 만들어져요.`, { ok: '초기화' })) { const r = await MO.api('adminResetPw', { id: a.id }); m.close(); await P.perm(pg); showTemp(a.name, a.loginId, r.tempPassword); }
            if (b.dataset.v === 'del' && await MO.confirm(`${a.name} 계정을 삭제할까요?`, { ok: '삭제', danger: true })) { await MO.api('adminDelete', { id: a.id }); m.close(); P.perm(pg); }
          } catch (er) { MO.err(er); }
        };
      }
    };
  };

  /* =================== 백업 · 복원 (마스터) =================== */
  P.backup = async function (pg) {
    A.setTitle('백업 · 복원');
    const list = await MO.api('backupList', {}, { loader: false });
    pg.innerHTML = `<div class="g2"><div class="card" style="display:flex;gap:16px;align-items:center;background:linear-gradient(110deg,#edf5e1,#fff3d6);box-shadow:none"><img src="${MO.asset('roi.webp')}" style="height:96px;margin:-10px 0" alt=""><div><b style="font-size:17px;font-weight:900">매주 주일 밤 11시에 자동으로 백업돼요</b><p class="note" style="margin:6px 0 0;font-size:13px;line-height:1.6">구글 드라이브 '모아온(MOA ON) 데이터 › MOAON_백업' 폴더에 날짜별로 저장되고, 최근 12주치를 남겨요. 영수증·사진은 드라이브에 그대로 보관돼요.</p></div></div>
      <div class="card"><div class="ch"><b>지금 바로</b></div><div style="display:grid;gap:10px"><button class="btn lg" data-now="1">${MO.icon('backup', 18)}지금 백업하기</button><button class="btn o lg" data-xlsx="1">${MO.icon('down', 18)}전체 데이터 엑셀로 받기</button><p class="note" style="margin:0">한 달에 한 번 엑셀로 받아 교회 공용 드라이브에도 보관하시길 권해요.</p></div></div></div>
      <div class="card"><div class="ch"><b>백업 목록</b><span>${list.length}개</span></div><div class="tscroll"><table class="t"><thead><tr><th>날짜</th><th>구분</th><th>파일 이름</th><th>실행</th><th></th></tr></thead><tbody>
      ${list.map(b => `<tr><td><b>${esc(b.date.slice(0, 16))}</b></td><td><span class="tag" style="${b.kind === '주간 자동' ? '--b:#edf5e1;--c:#5b8a2e' : b.kind === '수동' ? '--b:#fff3d6;--c:#a8621f' : '--b:#e6f0fa;--c:#3d7cb8'}">${esc(b.kind)}</span></td><td class="wrap note">${esc(b.name)}</td><td>${esc(b.by)}</td><td class="r"><button class="btn o sm" data-restore="${b.id}">이 시점으로 되돌리기</button></td></tr>`).join('') || `<tr><td colspan="5">${A.empty('아직 백업이 없어요. 위에서 지금 백업해 보세요.')}</td></tr>`}</tbody></table></div>
      <p class="note" style="margin:10px 0 0">되돌리기 전에 지금 상태를 자동으로 한 번 더 백업해요. 그래서 잘못 되돌려도 다시 살릴 수 있어요.</p></div>`;
    pg.onclick = async (e) => {
      if (e.target.closest('[data-now]')) { try { await MO.api('backupNow', {}); MO.toast('백업했어요', 'ok'); P.backup(pg); } catch (er) { MO.err(er); } return; }
      if (e.target.closest('[data-xlsx]')) { try { const r = await MO.api('exportXlsx', {}); MO.download(`moaon_data_${A.st.boot.today}.xlsx`, MO.b64ToBlob(r.data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')); } catch (er) { MO.err(er); } return; }
      const rs = e.target.closest('[data-restore]');
      if (rs) {
        const b = list.find(x => x.id === rs.dataset.restore);
        const v = await MO.form({ title: '이 시점으로 되돌리기', submit: '되돌리기', danger: true, fields: [{ key: 'ok', label: "확인을 위해 '되돌리기'라고 써 주세요", required: true }], extra: `<p style="margin:0;font-weight:700;line-height:1.6">${esc(b.date.slice(0, 16))} 백업으로 모든 데이터(학생·출석·헌금·회계·달란트·암송)를 되돌려요.<br>그 뒤에 입력한 내용은 사라져요.</p>` });
        if (!v) return; if (v.ok !== '되돌리기') return MO.toast("'되돌리기'라고 정확히 써 주세요", 'err');
        try { await MO.api('backupRestore', { id: b.id }); await MO.alert('되돌렸어요', '<p style="margin:0">선택한 시점으로 데이터를 되돌렸어요. 화면을 새로 불러올게요.</p>'); location.reload(); } catch (er) { MO.err(er); }
      }
    };
  };

  /* =================== 초등부 현황 (교역자 보고) =================== */
  P.report = async function (pg) {
    A.setTitle('사무엘 주일학교 초등부 현황', A.yearSel() + `<span class="ro">${MO.icon('eye', 14)}보기 전용</span>`); A.bindYear(() => P.report(pg));
    const r = await MO.api('report', { year: A.st.year }, { loader: false });
    const d = r.dash, today = A.st.boot.today, curM = String(d.year) === today.slice(0, 4) ? Number(today.slice(5, 7)) : 12;
    const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const OFT = [['sunday', '주일헌금', '#eea21f'], ['thanks', '감사헌금', '#78a744'], ['tithe', '십일조', '#d4863c'], ['festival', '절기헌금', '#ee8b72']];
    const vp = d.classProgress.length ? Math.round(d.classProgress.reduce((a, c) => a + c.rate, 0) / d.classProgress.length) : 0;
    pg.innerHTML = `<div class="card" style="display:flex;align-items:center;gap:20px;background:linear-gradient(110deg,#fff3d6,#e9f3dc);box-shadow:none;overflow:hidden"><div style="flex:1"><span class="note">사무엘 주일학교 초등부 현황 · ${Number(r.month.slice(5))}월 · 자동 작성</span><b style="display:block;font-size:21px;font-weight:900;margin-top:4px;letter-spacing:-.5px">${Number(r.month.slice(5))}월 평균 출석 ${r.monthAvgAttendance}명 · 헌금 ${MO.won(r.monthOffering)} · 잔액 ${MO.won(d.balance.balance)}</b><p style="margin:6px 0 0;font-weight:700;color:#6d5d4f">${d.week ? `${d.week.week}주차 말씀 암송 진행 중 (완료율 ${vp}%)` : '진행 중인 암송 계획이 없어요'}</p></div><img src="${MO.asset('roi.webp')}" style="height:104px;margin:-20px 0" class="hide-m" alt=""><img src="${MO.asset('moa.webp')}" style="height:92px;margin:-20px 0 -20px -24px" class="hide-m" alt=""></div>
      <div class="kpis" style="--n:5">${A.kpi('재적', d.students + '<em>명</em>', d.newThisYear ? `올해 새로 등록 ${d.newThisYear}명` : '', '#eea21f')}${A.kpi('지난 주일 출석', d.lastSunday ? d.lastSunday.present + '<em>명</em>' : '-', d.lastSunday ? d.lastSunday.rate + '%' : '', '#78a744')}${A.kpi('연간 평균 출석률', d.avgRate + '<em>%</em>', '', '#5b9bd5')}${A.kpi('올해 헌금', MO.won(r.offAll), '', '#d4863c')}${A.kpi('회계 잔액', MO.won(d.balance.balance), '', '#9a5530')}</div>
      <div class="g2"><div class="card"><div class="ch"><b>출석 현황</b><span>월평균 출석률</span></div>${A.area(d.monthlyRates.slice(0, curM), { labels: MONTHS.slice(0, curM), avg: d.avgRate, h: 230, min: 50 })}</div>
      <div class="card"><div class="ch"><b>헌금 구성</b><span>${d.year}년 누적</span></div><div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">${A.donut(OFT.map(([k]) => r.offTotals[k]), OFT.map(x => x[2]), ['합계', Math.round(r.offAll / 10000) + '만원'])}<div class="list" style="flex:1;min-width:170px">${OFT.map(([k, n, c]) => `<div class="li"><span class="dot" style="background:${c};width:12px;height:12px"></span><div><b style="font-size:13px">${n}</b></div><b>${MO.won(r.offTotals[k])}</b></div>`).join('')}</div></div></div></div>
      <div class="g3"><div class="card"><div class="ch"><b>반별 출석률</b></div><div class="list" style="gap:14px">${r.classRates.map(c => `<div><div style="display:flex;justify-content:space-between;font-weight:800;font-size:13px;margin-bottom:5px"><span>${esc(c.label)}${c.teacher ? ' · ' + esc(c.teacher) : ''}</span><span>${c.rate}%</span></div><div class="bar"><i style="width:${c.rate}%;--c:${c.color}"></i></div></div>`).join('') || A.empty('반이 없어요')}</div></div>
      <div class="card"><div class="ch"><b>회계 요약</b></div><table class="t"><tbody>${[['전년도 이월금', d.balance.carry], ['수입 합계', d.balance.income], ['지출 합계', d.balance.expense], ['현재 잔액', d.balance.balance]].map(([k, v], i) => `<tr><td class="note">${k}</td><td class="r"><b style="${i === 3 ? 'font-size:17px;color:var(--mane)' : ''}">${MO.won(v)}</b></td></tr>`).join('')}</tbody></table></div>
      <div class="card"><div class="ch"><b>살펴볼 일</b></div><div class="list">${[[`3주 연속 결석 ${r.longAbsent}명`, '담임 선생님과 연락해 보세요', '#cf5c45'], [`${Number(today.slice(5, 7))}월 생일 ${r.birthdaysThisMonth}명`, '생일 주일에 축하 달란트 자동 지급', '#a8621f'], [`최근 두 달 새친구 ${r.newcomers}명`, '정착을 함께 살펴 주세요', '#3d7cb8']].map(([t, s, c]) => `<div class="li"><span class="dot" style="background:${c};width:10px;height:10px"></span><div><b style="font-size:13.5px">${t}</b><span>${s}</span></div></div>`).join('')}</div></div></div>`;
  };
})();
