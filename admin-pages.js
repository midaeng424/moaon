/* 관리자 화면 1 — 대시보드 · 출석 · 헌금 · 달란트 · 회계 */
(function () {
  const A = window.ADM, P = A.pages, esc = MO.esc;
  const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  /* =================== 대시보드 =================== */
  let calMonth = null;
  P.dash = async function (pg) {
    A.setTitle('대시보드', A.yearSel()); A.bindYear(() => P.dash(pg));
    const d = await MO.api('dashboard', { year: A.st.year }, { loader: false });
    const me = A.st.me, money = A.can('acc');
    const today = A.st.boot.today;
    if (!calMonth) calMonth = today.slice(0, 7);
    const nextEv = d.events.filter(e => e.date >= today).sort((a, b) => a.date < b.date ? -1 : 1)[0];
    const dday = nextEv ? Math.round((new Date(nextEv.date) - new Date(today)) / 86400000) : null;
    const kp = [A.kpi('재적 학생', d.students + '<em>명</em>', d.newThisYear ? `▲ 올해 새로 등록 ${d.newThisYear}명` : '올해 새 친구 없음', '#eea21f', d.newThisYear ? 'up' : ''),
      A.kpi('지난 주일 출석' + (d.lastSunday ? ` (${MO.md(d.lastSunday.date)})` : ''), d.lastSunday ? d.lastSunday.present + '<em>명</em>' : '-', d.lastSunday ? d.lastSunday.rate + '% 출석' : '기록 없음', '#78a744'),
      A.kpi('연간 평균 출석률', d.avgRate + '<em>%</em>', `${d.year}년 주일 기준`, '#5b9bd5')];
    if (money) kp.push(A.kpi('이번 달 사용 금액', MO.won(d.monthExpense), `${Number(today.slice(5, 7))}월 지출`, '#ee8b72'), A.kpi('회계 잔액', MO.won(d.balance.balance), `수입 ${MO.won(d.balance.income)} · 지출 ${MO.won(d.balance.expense)}`, '#9a5530'));
    const labels = MONTHS.slice(0, d.year < Number(today.slice(0, 4)) ? 12 : Number(today.slice(5, 7)));
    const rates = d.monthlyRates.slice(0, labels.length);
    const valid = rates.map((v, i) => [v, i]).filter(x => x[0] != null);
    const best = valid.length ? valid.reduce((a, b) => b[0] > a[0] ? b : a) : null, worst = valid.length ? valid.reduce((a, b) => b[0] < a[0] ? b : a) : null;
    pg.innerHTML = `<div class="welcome"><div><b>안녕하세요, ${esc(me.name)} 님!</b></div><div class="imgs"><img src="${MO.asset('roi.webp')}" alt=""><img src="${MO.asset('moa.webp')}" alt=""></div></div>
      <div class="kpis" style="--n:${kp.length}">${kp.join('')}</div>
      <div class="${money ? 'g2' : ''}"><div class="card"><div class="ch"><b>출석 현황</b><div class="lgd"><span><i style="--c:#eea21f"></i>월평균 출석률</span><span><i style="--c:#78a744"></i>연간 평균</span></div></div>
        ${best ? `<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:4px"><div><span class="note">가장 높은 달</span> <b>${MONTHS[best[1]]} · ${best[0]}%</b></div><div><span class="note">가장 낮은 달</span> <b>${MONTHS[worst[1]]} · ${worst[0]}%</b></div><div><span class="note">이번 달</span> <b style="color:var(--mane)">${rates[rates.length - 1] != null ? rates[rates.length - 1] + '%' : '-'}</b></div></div>` : ''}
        ${A.area(rates, { labels, avg: d.avgRate, min: 50 })}</div>
        ${money ? `<div class="card"><div class="ch"><b>월별 수입 · 지출</b><div class="lgd"><span><i style="--c:#78a744"></i>수입</span><span><i style="--c:#ee8b72"></i>지출</span></div></div>${A.bars2(d.income.slice(0, labels.length), d.expense.slice(0, labels.length), labels, { h: 275 })}</div>` : ''}</div>
      <div class="g3"><div class="card" id="calCard"></div><div class="card" id="bdCard"></div>
        <div class="card"><div class="ch"><b>반별 말씀 암송 현황</b><span>${d.week ? `이번 주 · ${d.week.week}주차` : '진행 중인 계획 없음'}</span></div>
        ${d.classProgress.length ? `<div class="list" style="gap:14px">${d.classProgress.map(c => `<div><div style="display:flex;justify-content:space-between;font-weight:800;font-size:13.5px;margin-bottom:6px"><span>${esc(c.label)}</span><span>${c.rate}%</span></div><div class="bar" style="height:12px"><i style="width:${c.rate}%;--c:${c.color}"></i></div></div>`).join('')}
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--grn-l);border-radius:14px;padding:12px 14px;margin-top:4px"><b style="color:var(--grn-t)">초등부 전체</b><b style="font-size:20px;color:var(--grn-t)">${Math.round(d.classProgress.reduce((a, c) => a + c.rate, 0) / d.classProgress.length)}%</b></div></div>` : A.empty('반이나 암송 계획을 먼저 등록해 주세요')}</div></div>`;
    const drawCal = () => {
      const [y, m] = calMonth.split('-').map(Number), first = new Date(Date.UTC(y, m - 1, 1)), days = new Date(Date.UTC(y, m, 0)).getUTCDate(), off = first.getUTCDay();
      const evs = d.events.filter(e => e.date.slice(0, 7) === calMonth), bds = d.birthdays.filter(b => Number(b.birth.slice(5, 7)) === m);
      const canE = A.edit('dash');
      let h = `<div class="ch"><b>월별 캘린더</b><div class="acts"><button class="btn o sm" data-cal="-1" aria-label="이전 달">‹</button><b style="min-width:90px;text-align:center;align-self:center">${y}년 ${m}월</b><button class="btn o sm" data-cal="1" aria-label="다음 달">›</button></div></div><div class="cal">${'일월화수목금토'.split('').map(x => `<span class="h">${x}</span>`).join('')}${'<span></span>'.repeat(off)}`;
      for (let i = 1; i <= days; i++) {
        const ds = `${calMonth}-${String(i).padStart(2, '0')}`, e = evs.filter(x => x.date === ds), b = bds.filter(x => x.birth.slice(8) === ds.slice(8));
        const tag = canE ? 'button' : 'span';
        h += `<${tag} class="d ${(off + i - 1) % 7 === 0 ? 'sun' : ''} ${e.length ? 'ev' : ''} ${ds === today ? 'td' : ''}" ${canE ? `data-day="${ds}"` : ''} title="${esc(e.map(x => x.title).concat(b.map(x => x.name + ' 생일')).join(', '))}">${i}${e.length || b.length ? `<span class="dots">${e.map(x => `<i style="--c:${x.color}"></i>`).join('')}${b.length ? '<i style="--c:#f08a74"></i>' : ''}</span>` : ''}</${tag}>`;
      }
      h += `</div><div class="list" style="margin-top:10px">${evs.length ? evs.sort((a, b) => a.date < b.date ? -1 : 1).map(e => `<div class="li" style="padding:7px 0"><span class="tag" style="--b:${e.color}22;--c:${e.color};min-width:48px;justify-content:center">${MO.md(e.date)}</span><div><b style="font-size:13px;font-weight:700">${esc(e.title)}</b></div>${canE ? `<button class="btn o sm" data-delev="${e.id}" aria-label="일정 지우기">${MO.icon('trash', 14)}</button>` : ''}</div>`).join('') : `<p class="note" style="margin:4px 0 0">${canE ? '날짜를 누르면 일정을 넣을 수 있어요' : '이번 달 일정이 없어요'}</p>`}</div>`;
      pg.querySelector('#calCard').innerHTML = h;
      const mm = Number(calMonth.slice(5));
      const list = d.birthdays.filter(b => Number(b.birth.slice(5, 7)) === mm).sort((a, b) => a.birth.slice(8) < b.birth.slice(8) ? -1 : 1);
      pg.querySelector('#bdCard').innerHTML = `<div class="ch"><b>월별 생일자</b><span>${mm}월 · ${list.length}명</span></div><div class="list">${list.length ? list.map(b => `<div class="li">${A.av(b.name, A.clsColor(b.classId), 40)}<div><b>${esc(b.name)}</b><span>${esc(A.clsLabel(b.classId))}</span></div><span class="tag" style="--b:#fde8e1;--c:#cf5c45">${MO.md(b.birth)}</span></div>`).join('') : A.empty(`${mm}월 생일자가 없어요`)}</div>
        <div style="margin-top:10px;background:var(--soft);border-radius:14px;padding:11px 14px;display:flex;align-items:center;gap:10px"><img src="${MO.asset('moa.webp')}" style="height:44px" alt=""><span class="note" style="line-height:1.5">생일 주일에 출석하면<br>축하 달란트가 자동으로 지급돼요</span></div>`;
    };
    drawCal();
    pg.onclick = async (e) => {
      const c = e.target.closest('[data-cal]'); if (c) { const [y, m] = calMonth.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1 + Number(c.dataset.cal), 1)); calMonth = dt.toISOString().slice(0, 7); return drawCal(); }
      const day = e.target.closest('[data-day]');
      if (day) {
        const v = await MO.form({ title: `${MO.mdK(day.dataset.day)} 일정 넣기`, submit: '넣기', fields: [{ key: 'title', label: '일정', required: true, placeholder: '예: 달란트 시장' }, { key: 'color', label: '색', type: 'color', value: '#eea21f' }] });
        if (!v) return;
        try { const r = await MO.api('eventSave', { date: day.dataset.day, title: v.title, color: v.color }); d.events.push(r); drawCal(); MO.toast('일정을 넣었어요', 'ok'); } catch (er) { MO.err(er); }
        return;
      }
      const del = e.target.closest('[data-delev]');
      if (del && await MO.confirm('이 일정을 지울까요?', { ok: '지우기', danger: true })) {
        try { await MO.api('eventDelete', { id: del.dataset.delev }); d.events = d.events.filter(x => x.id !== del.dataset.delev); drawCal(); } catch (er) { MO.err(er); }
      }
    };
  };

  /* =================== 출석 =================== */
  let attTab = 'check', attClass = '', attDate = null;
  P.att = async function (pg) {
    const canE = A.edit('att');
    A.setTitle('출석', A.xlsBtn() + A.yearSel() + A.readonlyBadge('att')); A.bindYear(() => P.att(pg)); A.bindXls(() => XP.att(A.st.year));
    const recs = await MO.api('attendanceYear', { year: A.st.year }, { loader: false });
    const studs = A.st.boot.students.filter(s => s.status !== '졸업');
    const today = A.st.boot.today;
    if (!attDate || attDate.slice(0, 4) !== String(A.st.year)) attDate = String(A.st.year) === today.slice(0, 4) ? MO.lastSunday(today) : `${A.st.year}-12-31`;
    if (attDate.slice(0, 4) !== String(A.st.year)) attDate = MO.lastSunday(`${A.st.year}-12-31`);
    if (!canE && attTab === 'check') attTab = 'year';
    const byDate = {}; recs.forEach(r => { (byDate[r.date] = byDate[r.date] || {})[r.studentId] = r.status; });
    const dates = Object.keys(byDate).sort();
    const draw = () => {
      const tabs = `<div class="chips">${canE ? `<button class="chip ${attTab === 'check' ? 'on' : ''}" data-tab="check">출석 체크</button>` : ''}<button class="chip ${attTab === 'year' ? 'on' : ''}" data-tab="year">연간 현황</button></div>`;
      const clsChips = `<div class="chips"><button class="chip ${!attClass ? 'on' : ''}" data-cls="">전체 ${studs.length}</button>${A.activeClasses().map(c => `<button class="chip ${attClass === c.id ? 'on' : ''}" data-cls="${c.id}">${c.grade}학년 ${esc(c.name)}</button>`).join('')}</div>`;
      const list = studs.filter(s => !attClass || s.classId === attClass).sort((a, b) => (A.clsLabel(a.classId) + a.name).localeCompare(A.clsLabel(b.classId) + b.name, 'ko'));
      if (attTab === 'check') {
        const day = byDate[attDate] || {}; const sel = Object.assign({}, day); A._attSel = sel;
        const cnt = () => list.filter(s => sel[s.id] === 1).length;
        pg.innerHTML = `${tabs}<div class="card"><div class="ch"><div class="acts" style="align-items:center"><input type="date" class="inp" id="attDate" value="${attDate}" style="width:auto"><span class="note">${MO.dowK(attDate)}요일${MO.dow(attDate) !== 0 ? ' · 주일이 아니에요' : ''}</span></div><div class="acts"><button class="btn o" data-all="1">모두 출석</button><button class="btn" data-save="1">${MO.icon('check', 16)}저장하기</button></div></div>
          ${clsChips}<div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(120deg,#edf5e1,#fff3d6);border-radius:16px;padding:12px 16px;margin:12px 0"><span style="font-weight:800">${attClass ? esc(A.clsLabel(attClass)) + (A.teacher(A.cls(attClass).teacherId) ? ' · 담임 ' + esc(A.teacher(A.cls(attClass).teacherId).name) : '') : '초등부 전체'}</span><b id="attCnt" style="font-size:24px;color:var(--grn-t)">${cnt()} / ${list.length}</b></div>
          <div class="list" id="attList">${list.length ? list.map(s => `<div class="li"><span class="av" style="--c:${A.clsColor(s.classId)};width:36px;height:36px">${esc(s.name.slice(-2))}</span><div><b>${esc(s.name)}</b><span>${esc(A.clsLabel(s.classId))}</span></div><span class="seg" data-sid="${s.id}"><button class="${sel[s.id] === 1 ? 'y' : ''}" data-v="1">출석</button><button class="${sel[s.id] === 0 ? 'n' : ''}" data-v="0">결석</button></span></div>`).join('') : A.empty('학생이 없어요. 교적부에서 먼저 등록해 주세요.')}</div>
          <p class="note" style="margin:12px 0 0">출석으로 저장하면 '주일 출석' 달란트가 자동으로 들어가고, 결석으로 바꾸면 다시 빠져요.</p></div>`;
        pg.querySelector('#attDate').onchange = (e) => { attDate = e.target.value; if (attDate.slice(0, 4) !== String(A.st.year)) { A.st.year = Number(attDate.slice(0, 4)); P.att(pg); } else draw(); };
        pg._cnt = () => { pg.querySelector('#attCnt').textContent = cnt() + ' / ' + list.length; };
        pg._list = list;
      } else {
        const lastDates = dates.filter(x => x <= today).slice(-8);
        const curM = String(A.st.year) === today.slice(0, 4) ? Number(today.slice(5, 7)) : 12;
        const mRate = (sid, m) => { const ds = dates.filter(x => Number(x.slice(5, 7)) === m && byDate[x][sid] !== undefined); if (!ds.length) return null; return Math.round(ds.filter(x => byDate[x][sid] === 1).length / ds.length * 100); };
        const yr = (sid) => { const ds = dates.filter(x => byDate[x][sid] !== undefined); const p = ds.filter(x => byDate[x][sid] === 1).length; return { p, t: ds.length, r: ds.length ? Math.round(p / ds.length * 100) : 0 }; };
        const allP = studs.filter(s => { const y = yr(s.id); return y.t > 0 && y.p === y.t; }).length;
        const l3 = dates.filter(x => x <= today).slice(-3);
        const absent3 = l3.length === 3 ? studs.filter(s => l3.every(x => byDate[x][s.id] === 0)) : [];
        const last = lastDates[lastDates.length - 1];
        const lastP = last ? studs.filter(s => byDate[last][s.id] === 1).length : 0;
        const avg = dates.length ? Math.round(dates.reduce((a, x) => a + studs.filter(s => byDate[x][s.id] === 1).length / Math.max(1, studs.length), 0) / dates.length * 100) : 0;
        const mcell = (v) => { if (v == null) return '<span class="note">-</span>'; const [c, b] = v >= 90 ? ['#4b7424', '#e6f2d6'] : v >= 70 ? ['#7a6a1e', '#fbf0c8'] : v >= 50 ? ['#a8621f', '#fde3c5'] : ['#bf4d36', '#fbd9cf']; return `<span class="mc" style="--c:${c};--b:${b}">${v}</span>`; };
        pg.innerHTML = `${tabs}<div class="kpis" style="--n:4">${A.kpi('지난 주일 출석' + (last ? ` (${MO.md(last)})` : ''), last ? `${lastP} / ${studs.length}` : '-', last ? Math.round(lastP / Math.max(1, studs.length) * 100) + '%' : '', '#78a744')}${A.kpi('연간 평균 출석률', avg + '<em>%</em>', dates.length + '주 기준', '#5b9bd5')}${A.kpi('개근 진행 중', allP + '<em>명</em>', '올해 한 번도 안 빠진 친구', '#eea21f')}${A.kpi('3주 연속 결석', absent3.length + '<em>명</em>', absent3.slice(0, 3).map(s => s.name).join(', ') || '없어요', '#ee8b72', absent3.length ? 'dn' : '')}</div>
          <div class="card"><div class="ch">${clsChips}</div>
          <div class="lgd" style="margin:2px 0 10px"><span><span class="dot d1" style="width:12px;height:12px;margin-right:5px"></span>출석</span><span><span class="dot d0" style="width:12px;height:12px;margin-right:5px"></span>결석</span><span>월 칸은 그 달 출석률(%)</span></div>
          <div class="tscroll"><table class="t"><thead><tr><th>이름</th>${MONTHS.slice(0, curM).map(m => `<th class="c">${m}</th>`).join('')}${lastDates.map(x => `<th class="c">${MO.md(x)}</th>`).join('')}<th class="r">출석</th><th class="r">출석률</th></tr></thead><tbody>
          ${list.map(s => { const y = yr(s.id); return `<tr><td><span class="av" style="--c:${A.clsColor(s.classId)}">${esc(s.name.slice(-2))}</span><b>${esc(s.name)}</b></td>${MONTHS.slice(0, curM).map((_, i) => `<td class="c">${mcell(mRate(s.id, i + 1))}</td>`).join('')}${lastDates.map(x => `<td class="c">${byDate[x][s.id] === undefined ? '<span class="note">-</span>' : `<span class="dot d${byDate[x][s.id]}"></span>`}</td>`).join('')}<td class="r">${y.p}/${y.t}</td><td class="r"><b style="color:${y.r >= 80 ? '#5b8a2e' : y.r >= 60 ? '#a8621f' : '#cf5c45'}">${y.r}%</b></td></tr>`; }).join('') || `<tr><td colspan="20">${A.empty('학생이 없어요')}</td></tr>`}
          </tbody></table></div></div>`;
        pg._csv = () => MO.csv(`moaon_attendance_${A.st.year}.csv`, [['이름', '반', ...dates.map(MO.md), '출석', '전체', '출석률'], ...list.map(s => { const y = yr(s.id); return [s.name, A.clsLabel(s.classId), ...dates.map(x => byDate[x][s.id] === undefined ? '' : byDate[x][s.id] ? 'O' : 'X'), y.p, y.t, y.r + '%']; })]);
      }
    };
    draw();
    pg.onclick = async (e) => {
      const t = e.target.closest('[data-tab]'); if (t) { attTab = t.dataset.tab; return draw(); }
      const c = e.target.closest('[data-cls]'); if (c) { attClass = attClass === c.dataset.cls ? '' : c.dataset.cls; return draw(); }
      const seg = e.target.closest('.seg button');
      if (seg) { const sid = seg.parentElement.dataset.sid, v = Number(seg.dataset.v); A._attSel[sid] = v; seg.parentElement.querySelectorAll('button').forEach(b => b.className = ''); seg.className = v ? 'y' : 'n'; pg._cnt(); return; }
      if (e.target.closest('[data-all]')) { pg._list.forEach(s => { A._attSel[s.id] = 1; }); pg.querySelectorAll('.seg').forEach(sg => { sg.children[0].className = 'y'; sg.children[1].className = ''; }); pg._cnt(); return; }
      if (e.target.closest('[data-save]')) {
        const items = pg._list.filter(s => A._attSel[s.id] === 0 || A._attSel[s.id] === 1).map(s => ({ studentId: s.id, status: A._attSel[s.id] }));
        if (!items.length) return MO.toast('출석/결석을 먼저 눌러 주세요', 'err');
        const miss = pg._list.length - items.length;
        if (miss && !(await MO.confirm(`아직 체크하지 않은 친구가 ${miss}명 있어요. 체크한 친구만 저장할까요?`, { ok: '저장' }))) return;
        try { await MO.api('attendanceSave', { date: attDate, items }); MO.toast(`${MO.mdK(attDate)} 출석을 저장했어요`, 'ok'); P.att(pg); } catch (er) { MO.err(er); }
        return;
      }
      if (e.target.closest('[data-csv]')) pg._csv();
    };
  };

  /* =================== 헌금 =================== */
  const OFFT = [['sunday', '주일헌금', '#eea21f'], ['thanks', '감사헌금', '#78a744'], ['tithe', '십일조', '#d4863c'], ['festival', '절기헌금', '#ee8b72']];
  P.off = async function (pg) {
    const canE = A.edit('off');
    A.setTitle('헌금', A.xlsBtn() + A.yearSel() + A.readonlyBadge('off')); A.bindYear(() => P.off(pg)); A.bindXls(() => XP.off(A.st.year));
    const list = await MO.api('offeringList', { year: A.st.year }, { loader: false });
    const tot = OFFT.map(([k]) => list.reduce((a, o) => a + o[k], 0)), all = tot.reduce((a, b) => a + b, 0);
    const mrows = MONTHS.map((_, m) => OFFT.map(([k]) => list.filter(o => Number(o.date.slice(5, 7)) === m + 1).reduce((a, o) => a + o[k], 0)));
    const curM = String(A.st.year) === A.st.boot.today.slice(0, 4) ? Number(A.st.boot.today.slice(5, 7)) : 12;
    pg.innerHTML = `<div class="kpis" style="--n:5">${A.kpi('올해 헌금', MO.won(all), `${list.length}번 입력`, '#9a5530')}${OFFT.map(([k, n, c], i) => A.kpi(n, MO.won(tot[i]), all ? '전체의 ' + Math.round(tot[i] / all * 100) + '%' : '-', c)).join('')}</div>
      <div class="g2"><div class="card"><div class="ch"><b>월별 헌금</b><div class="lgd">${OFFT.map(([, n, c]) => `<span><i style="--c:${c}"></i>${n}</span>`).join('')}</div></div>${A.stack(mrows.slice(0, curM), MONTHS.slice(0, curM), OFFT.map(x => x[2]), OFFT.map(x => x[1]))}</div>
      <div class="card"><div class="ch"><b>종류별 비율</b><span>${A.st.year}년 누적</span></div><div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">${A.donut(tot, OFFT.map(x => x[2]), ['합계', Math.round(all / 10000) + '만원'])}<div class="list" style="flex:1;min-width:160px">${OFFT.map(([, n, c], i) => `<div class="li"><span class="dot" style="background:${c};width:12px;height:12px"></span><div><b style="font-size:13.5px">${n}</b></div><b>${all ? Math.round(tot[i] / all * 100) : 0}%</b></div>`).join('')}</div></div>
      <p class="note" style="margin:12px 0 0">헌금은 종류별 금액만 기록해요. 개인별 헌금 내역은 저장하지 않아요.</p></div></div>
      <div class="card"><div class="ch"><b>주일별 헌금 기록</b><div class="acts">${canE ? `<button class="btn" data-add="1">${MO.icon('plus', 16)}헌금 입력</button>` : ''}</div></div>
      <div class="tscroll"><table class="t"><thead><tr><th>주일</th>${OFFT.map(([, n]) => `<th class="r">${n}</th>`).join('')}<th class="r">합계</th><th>계수 확인</th><th>상태</th>${canE ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map(o => { const t = OFFT.reduce((a, [k]) => a + o[k], 0); return `<tr><td><b>${MO.md(o.date)}</b> <span class="note">${o.date.slice(0, 4)}</span></td>${OFFT.map(([k]) => `<td class="r">${o[k] ? MO.won(o[k]) : '<span class="note">-</span>'}</td>`).join('')}<td class="r"><b>${MO.won(t)}</b></td><td>${esc(o.counters) || '<span class="note">-</span>'}</td><td>${o.confirmed ? '<span class="tag" style="--b:#edf5e1;--c:#5b8a2e">확인 완료</span>' : '<span class="tag" style="--b:#fff3d6;--c:#a8621f">확인 대기</span>'}</td>${canE ? `<td class="r"><button class="btn o sm" data-edit="${o.id}">수정</button> <button class="btn o sm" data-del="${o.id}" aria-label="지우기">${MO.icon('trash', 14)}</button></td>` : ''}</tr>`; }).join('') || `<tr><td colspan="9">${A.empty('아직 헌금 기록이 없어요')}</td></tr>`}
      </tbody></table></div><p class="note" style="margin:10px 0 0">헌금을 입력하면 회계 장부에 '수입 · 헌금'으로 자동으로 들어가요.</p></div>`;
    const form = async (o) => {
      const v = await MO.form({ title: o ? '헌금 수정' : '헌금 입력', fields: [
        { key: 'date', label: '날짜', type: 'date', value: o ? o.date : MO.lastSunday(A.st.boot.today), required: true },
        ...OFFT.map(([k, n], i) => ({ key: k, label: n, type: 'money', value: o ? o[k] : '', half: true, placeholder: '0' })),
        { key: 'counters', label: '계수 확인 (선생님 이름)', value: o ? o.counters : '', placeholder: '예: 박은혜 · 이성민' },
        { key: 'confirmed', label: '계수 확인을 마쳤어요', type: 'checkbox', value: o ? o.confirmed : false },
        { key: 'memo', label: '메모', value: o ? o.memo : '' }] });
      if (!v) return;
      if (!o && list.some(x => x.date === v.date) && !(await MO.confirm(`${MO.mdK(v.date)} 헌금 기록이 이미 있어요. 하나 더 추가할까요?\n(같은 기록을 고치려면 목록에서 '수정'을 눌러 주세요)`, { ok: '추가' }))) return;
      try { await MO.api('offeringSave', Object.assign({ id: o && o.id }, v)); MO.toast('저장했어요', 'ok'); P.off(pg); } catch (e) { MO.err(e); }
    };
    pg.onclick = async (e) => {
      if (e.target.closest('[data-add]')) return form(null);
      const ed = e.target.closest('[data-edit]'); if (ed) return form(list.find(o => o.id === ed.dataset.edit));
      const del = e.target.closest('[data-del]');
      if (del && await MO.confirm('이 헌금 기록을 지울까요? 회계 장부에서도 함께 지워져요.', { ok: '지우기', danger: true })) { try { await MO.api('offeringDelete', { id: del.dataset.del }); P.off(pg); } catch (er) { MO.err(er); } }
      if (e.target.closest('[data-csv]')) MO.csv(`moaon_offering_${A.st.year}.csv`, [['날짜', ...OFFT.map(x => x[1]), '합계', '계수 확인', '상태', '메모'], ...list.map(o => [o.date, ...OFFT.map(([k]) => o[k]), OFFT.reduce((a, [k]) => a + o[k], 0), o.counters, o.confirmed ? '확인 완료' : '확인 대기', o.memo])]);
    };
  };

  /* =================== 달란트 =================== */
  let talCls = '', talSort = 1, talSel = new Set();
  P.tal = async function (pg) {
    const canE = A.edit('tal');
    A.setTitle('달란트', A.xlsBtn() + A.readonlyBadge('tal')); A.bindXls(() => XP.tal());
    const d = await MO.api('talentData', {}, { loader: false });
    const draw = () => {
      const all = d.students.slice().sort((a, b) => b.balance - a.balance);
      const top = all.slice(0, 3), med = ['#f5b335', '#b8b2a8', '#d4863c'];
      let list = d.students.filter(s => !talCls || s.classId === talCls);
      if (talSort === 1) list.sort((a, b) => b.balance - a.balance); else if (talSort === -1) list.sort((a, b) => a.balance - b.balance); else list.sort((a, b) => (a.classLabel + a.name).localeCompare(b.classLabel + b.name, 'ko'));
      const mx = Math.max(1, ...d.students.map(s => s.balance));
      const sortLbl = talSort === 1 ? '▼ 많은 순' : talSort === -1 ? '▲ 적은 순' : '정렬 없음';
      pg.innerHTML = `<div style="display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr) minmax(260px,320px);gap:18px;align-items:start" class="talgrid">
        <div class="card"><div class="ch"><b>달란트 TOP 3</b><span>${MO.mdK(A.st.boot.today)} 기준</span></div>
          ${top.length ? `<div class="podium">${[1, 0, 2].filter(k => top[k]).map(k => { const x = top[k]; return `<div class="pd"><div class="ph" style="--c:${x.color};--m:${med[k]}">${esc(x.name.slice(-2))}<em>${k + 1}</em></div><b>${esc(x.name)}</b><small>${esc(x.classLabel)}</small><div class="st" style="--m:${med[k]};height:${[110, 84, 66][k]}px">${x.balance}</div></div>`; }).join('')}</div>` : A.empty('아직 학생이 없어요')}
          <div style="margin-top:14px;background:var(--yel-l);border-radius:14px;padding:12px 14px;display:flex;gap:10px;align-items:center"><img src="${MO.asset('roi.webp')}" style="height:46px" alt=""><span class="note" style="color:#8a5a12;line-height:1.5">말씀을 외우고 출석하면<br>달란트가 자동으로 쌓여요</span></div></div>
        <div class="card"><div class="ch"><b>아이별 달란트</b>${canE ? `<div class="acts"><button class="btn o" data-give="-1" ${talSel.size ? '' : 'disabled'}>선택 차감</button><button class="btn y" data-give="1" ${talSel.size ? '' : 'disabled'}>선택 지급${talSel.size ? ` (${talSel.size})` : ''}</button></div>` : ''}</div>
          <div class="chips" style="margin-bottom:8px"><button class="chip ${!talCls ? 'on' : ''}" data-cls="">전체</button>${A.activeClasses().map(c => `<button class="chip ${talCls === c.id ? 'on' : ''}" data-cls="${c.id}">${c.grade}학년 ${esc(c.name)}</button>`).join('')}</div>
          <div class="tscroll"><table class="t"><thead><tr>${canE ? `<th style="width:28px"><button class="cbox ${list.length && list.every(s => talSel.has(s.id)) ? 'on' : ''}" data-selall="1" aria-label="모두 선택">${MO.icon('check', 13, 'stroke-width="3.5"')}</button></th>` : ''}<th>이름</th><th>반</th><th><button data-sort="1" style="font-weight:900;color:var(--mane)">보유 <span class="tag" style="--b:#fff3d6;--c:#a8621f">${sortLbl}</span></button></th><th style="width:34%" class="hide-m"></th></tr></thead><tbody>
          ${list.map(s => `<tr>${canE ? `<td><button class="cbox ${talSel.has(s.id) ? 'on' : ''}" data-sel="${s.id}" aria-label="선택">${MO.icon('check', 13, 'stroke-width="3.5"')}</button></td>` : ''}<td><button data-hist="${s.id}" style="font-weight:800;display:inline-flex;align-items:center">${A.av(s.name, s.color)}${esc(s.name)}</button></td><td class="note">${esc(s.classLabel)}</td><td><b>${s.balance}</b></td><td class="hide-m"><div class="bar"><i style="width:${Math.max(0, s.balance) / mx * 100}%;--c:#f5b335"></i></div></td></tr>`).join('') || `<tr><td colspan="5">${A.empty('학생이 없어요')}</td></tr>`}</tbody></table></div>
          <p class="note" style="margin:10px 0 0">'보유'를 누를 때마다 많은 순 → 적은 순 → 정렬 해제로 바뀌어요. 반 필터도 같은 버튼을 한 번 더 누르면 해제돼요. 이름을 누르면 내역을 볼 수 있어요.</p></div>
        <div class="card"><div class="ch"><b>적립 규칙</b>${canE ? '<span>눌러서 켜고 끄기</span>' : ''}</div><div class="list">${d.rules.map(r => `<div class="li"><div><b style="font-size:13.5px">${esc(r.name)}${r.auto ? '<span class="auto">자동</span>' : ''}</b></div><b style="color:#a8621f;margin-right:4px">+${r.amount}</b>${canE ? `${r.auto ? '' : `<button class="btn o sm" data-rdel="${r.id}" aria-label="지우기">${MO.icon('trash', 13)}</button>`}<button class="btn o sm" data-redit="${r.id}" aria-label="수정">${MO.icon('edit', 13)}</button><button class="sw ${r.active ? 'on' : ''}" data-rtog="${r.id}" aria-label="${r.active ? '끄기' : '켜기'}"></button>` : `<span class="sw ${r.active ? 'on' : ''}"></span>`}</div>`).join('')}</div>
          ${canE ? `<button class="btn o block" data-radd="1" style="margin-top:12px">${MO.icon('plus', 15)}규칙 추가</button>` : ''}<p class="note" style="margin:10px 0 0;line-height:1.55">'자동' 규칙은 출석 저장·앱 레슨·생일 주일에 맞춰 저절로 지급돼요.</p></div></div>`;
      const g = pg.querySelector('.talgrid'); if (innerWidth < 1180) g.style.gridTemplateColumns = '1fr';
    };
    draw();
    pg.onclick = async (e) => {
      const c = e.target.closest('[data-cls]'); if (c) { talCls = talCls === c.dataset.cls ? '' : c.dataset.cls; return draw(); }
      if (e.target.closest('[data-sort]')) { talSort = talSort === 1 ? -1 : talSort === -1 ? 0 : 1; return draw(); }
      const s = e.target.closest('[data-sel]'); if (s) { const id = s.dataset.sel; talSel.has(id) ? talSel.delete(id) : talSel.add(id); return draw(); }
      if (e.target.closest('[data-selall]')) { const ids = d.students.filter(x => !talCls || x.classId === talCls).map(x => x.id); const allOn = ids.every(id => talSel.has(id)); ids.forEach(id => allOn ? talSel.delete(id) : talSel.add(id)); return draw(); }
      const gv = e.target.closest('[data-give]');
      if (gv && talSel.size) {
        const sign = Number(gv.dataset.give);
        const reasons = d.rules.filter(r => r.active).map(r => r.name);
        const v = await MO.form({ title: `${talSel.size}명에게 달란트 ${sign > 0 ? '지급' : '차감'}`, submit: sign > 0 ? '지급하기' : '차감하기', danger: sign < 0, fields: [
          { key: 'amount', label: '몇 달란트?', type: 'number', value: sign > 0 ? 1 : 10, required: true },
          { key: 'reason', label: '이유', type: 'select', options: sign > 0 ? [...reasons, '기타'] : ['달란트 시장', '기타'] },
          { key: 'memo', label: '직접 쓰기 (선택)', placeholder: '이유를 직접 쓰면 이 내용으로 저장돼요' }] });
        if (!v) return;
        try { await MO.api('talentGive', { studentIds: [...talSel], amount: Math.abs(v.amount) * sign, reason: v.memo || v.reason }); MO.toast(`${talSel.size}명에게 ${sign > 0 ? '+' : '−'}${Math.abs(v.amount)} 했어요`, 'ok'); talSel = new Set(); P.tal(pg); } catch (er) { MO.err(er); }
        return;
      }
      const h = e.target.closest('[data-hist]');
      if (h) {
        const st = d.students.find(x => x.id === h.dataset.hist);
        const log = await MO.api('talentHistory', { studentId: st.id });
        const m = MO.modal({ title: `${st.name} · 달란트 ${st.balance}`, foot: false, body: `<div class="list">${log.length ? log.map(r => `<div class="li"><div><b>${esc(r.reason)}</b><span>${MO.md(r.date)} · ${r.source === 'auto' ? '자동' : r.source === 'admin' ? esc(r.by) : '앱'}</span></div><b class="${r.amount >= 0 ? 'up' : 'dn'}">${r.amount >= 0 ? '+' : '−'}${Math.abs(r.amount)}</b>${canE ? `<button class="btn o sm" data-dl="${r.id}" aria-label="지우기">${MO.icon('trash', 13)}</button>` : ''}</div>`).join('') : A.empty('내역이 없어요')}</div>` });
        m.body.onclick = async (ev) => { const b = ev.target.closest('[data-dl]'); if (b && await MO.confirm('이 내역을 지울까요?', { ok: '지우기', danger: true })) { try { await MO.api('talentDeleteLog', { id: b.dataset.dl }); m.close(); P.tal(pg); } catch (er) { MO.err(er); } } };
        return;
      }
      const tg = e.target.closest('[data-rtog]');
      if (tg) { const r = d.rules.find(x => x.id === tg.dataset.rtog); try { await MO.api('ruleToggle', { id: r.id, active: !r.active }, { loader: false }); r.active = !r.active; draw(); } catch (er) { MO.err(er); } return; }
      const rd = e.target.closest('[data-rdel]');
      if (rd) { const r = d.rules.find(x => x.id === rd.dataset.rdel); if (await MO.confirm(`'${r.name}' 규칙을 지울까요?`, { ok: '지우기', danger: true })) { try { await MO.api('ruleDelete', { id: r.id }); P.tal(pg); } catch (er) { MO.err(er); } } return; }
      const re = e.target.closest('[data-redit]'), ra = e.target.closest('[data-radd]');
      if (re || ra) {
        const r = re ? d.rules.find(x => x.id === re.dataset.redit) : null;
        const v = await MO.form({ title: r ? '규칙 수정' : '규칙 추가', fields: [{ key: 'name', label: '이름', value: r ? r.name : '', required: true }, { key: 'amount', label: '달란트', type: 'number', value: r ? r.amount : 1, required: true }],
 });
        if (v) { try { await MO.api('ruleSave', { id: r && r.id, name: v.name, amount: v.amount, active: r ? r.active : true }); P.tal(pg); } catch (er) { MO.err(er); } }
        return;
      }
    };
  };

  /* =================== 회계 =================== */
  let accTab = 'all', accMonth = 0;
  const coachOff = () => { try { return localStorage.getItem('moaon_coach_rc') === '1'; } catch (_) { return false; } };
  const INCOME_CATS = ['헌금', '교회 지원', '기타 수입'];
  P.acc = async function (pg) {
    const canE = A.edit('acc');
    A.setTitle('회계 (수입·지출)', A.xlsBtn() + A.yearSel() + A.readonlyBadge('acc')); A.bindYear(() => P.acc(pg)); A.bindXls(() => XP.acc(A.st.year));
    const d = await MO.api('ledgerData', { year: A.st.year }, { loader: false });
    const S = d.summary, budgetTotal = d.budget.reduce((a, b) => a + b.amount, 0);
    const asc = d.rows.slice().sort((a, b) => a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : (a.date < b.date ? -1 : 1));
    let run = S.carry; const bal = {}; asc.forEach(r => { run += r.kind === '수입' ? r.amount : -r.amount; bal[r.id] = run; });
    const spent = (cat) => d.rows.filter(r => r.kind === '지출' && r.category === cat).reduce((a, r) => a + r.amount, 0);
    const noRc = d.rows.filter(r => r.kind === '지출' && !r.receiptId);
    const draw = () => {
      const rows = d.rows.filter(r => !accMonth || Number(r.date.slice(5, 7)) === accMonth).filter(r => accTab === 'all' || (accTab === 'in' && r.kind === '수입') || (accTab === 'out' && r.kind === '지출') || (accTab === 'norc' && r.kind === '지출' && !r.receiptId));
      pg.innerHTML = `<div class="kpis" style="--n:4">${A.kpi('전년도 이월금', MO.won(S.carry), `${A.st.year - 1}년 결산`, '#9a6b4b')}${A.kpi('수입 합계', MO.won(S.income), `헌금 ${MO.won(d.rows.filter(r => r.kind === '수입' && r.category === '헌금').reduce((a, r) => a + r.amount, 0))} 포함`, '#78a744', 'up')}${A.kpi('지출 합계', MO.won(S.expense), budgetTotal ? `예산 ${MO.won(budgetTotal)} 중 ${Math.round(S.expense / budgetTotal * 100)}%` : '', '#ee8b72', 'dn')}${A.kpi('현재 잔액', MO.won(S.balance), '이월금 + 수입 − 지출', '#eea21f')}</div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.55fr);gap:18px" class="accgrid">
        <div class="card"><div class="ch"><b>예산 대비 집행</b>${canE ? `<button class="btn o sm" data-budget="1">${MO.icon('edit', 13)}예산·이월금</button>` : `<span>예산 ${MO.won(budgetTotal)}</span>`}</div><div class="list" style="gap:16px">
          ${d.budget.map(b => { const s = spent(b.category), r = b.amount ? Math.round(s / b.amount * 100) : 0; return `<div><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:700;margin-bottom:6px;flex-wrap:wrap"><span>${esc(b.category)}</span><span><b>${MO.won(s)}</b> <span class="note">/ ${MO.won(b.amount)}</span> <b style="color:${r >= 90 ? '#cf5c45' : '#5b8a2e'}">${r}%</b></span></div><div class="bar" style="height:12px"><i style="width:${Math.min(100, r)}%;--c:${b.color}"></i></div></div>`; }).join('') || A.empty('예산을 넣어 주세요')}
          ${(() => { const other = d.rows.filter(r => r.kind === '지출' && !d.budget.some(b => b.category === r.category)).reduce((a, r) => a + r.amount, 0); return other ? `<div class="note">예산에 없는 항목 지출: ${MO.won(other)}</div>` : ''; })()}</div></div>
        <div class="card" id="ledger"><div class="ch"><b>수입 · 지출 장부${canE ? ` <button class="qhelp" id="coachShow" title="영수증 첨부 방법" aria-label="영수증 첨부 방법">?</button>` : ''}</b><div class="acts">${canE ? `<label class="btn o" style="cursor:pointer" title="영수증 파일을 골라 붙여요">${MO.icon('clip', 15)}영수증<input type="file" id="dropFile" accept="image/*,application/pdf" multiple hidden></label>` : ''}${canE ? `<button class="btn" data-add="1">${MO.icon('plus', 15)}거래 입력</button>` : ''}</div></div>
          ${canE && !coachOff() ? `<div class="coach" id="coach" role="note"><span class="ic">${MO.icon('cloud', 20)}</span><div><b>영수증은 끌어다 놓기만 하면 돼요</b><span>파일을 장부의 <u>지출 줄 위</u>에 놓으면 그 거래에 바로 붙어요. 빈 곳에 놓으면 어느 거래에 붙일지 골라요. (JPG·PNG·PDF, 여러 장 가능)</span></div><button class="btn sm" id="coachOk">알겠어요</button></div>` : ''}<div class="dropveil">${MO.icon('cloud', 30)}<b>여기에 놓으세요</b><span>지출 줄 위에 놓으면 그 거래에 바로 붙어요</span></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><div class="chips">${[['all', '전체'], ['in', '수입'], ['out', '지출'], ['norc', `영수증 미첨부 ${noRc.length}`]].map(([k, l]) => `<button class="chip ${accTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div><select class="inp" id="accMonth" style="width:auto;margin-left:auto;padding:6px 10px" aria-label="달 고르기"><option value="0">모든 달</option>${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<option value="${m}" ${accMonth === m ? 'selected' : ''}>${m}월</option>`).join('')}</select></div>
          <div class="tscroll"><table class="t"><thead><tr><th>날짜</th><th>구분</th><th>항목</th><th>내용</th><th class="r">금액</th><th class="r hide-m">잔액</th><th class="c">영수증</th>${canE ? '<th></th>' : ''}</tr></thead><tbody>
          ${rows.map(r => `<tr data-row="${r.id}"><td>${MO.md(r.date)}</td><td><span class="tag" style="${r.kind === '수입' ? '--b:#edf5e1;--c:#5b8a2e' : '--b:#fde8e1;--c:#cf5c45'}">${r.kind}</span></td><td>${esc(r.category)}</td><td class="wrap">${esc(r.desc)}${r.offeringId ? ' <span class="tag" style="--b:#fff3d6;--c:#a8621f">헌금 자동</span>' : ''}</td><td class="r"><b style="color:${r.kind === '수입' ? '#5b8a2e' : '#cf5c45'}">${r.kind === '수입' ? '+' : '−'}${MO.won(r.amount)}</b></td><td class="r hide-m">${MO.won(bal[r.id])}</td><td class="c">${r.receiptId ? `<button class="rc" data-rc="${r.id}" title="${esc(r.receiptName)}" aria-label="영수증 보기">${MO.icon('clip', 15)}</button>` : r.kind === '지출' ? (canE ? `<button class="tag" data-attach="${r.id}" style="--b:#fff3d6;--c:#a8621f;cursor:pointer">첨부하기</button>` : '<span class="tag" style="--b:#fff3d6;--c:#a8621f">미첨부</span>') : '<span class="note">-</span>'}</td>${canE ? `<td class="r">${r.offeringId ? '' : `<button class="btn o sm" data-edit="${r.id}">수정</button>`}</td>` : ''}</tr>`).join('') || `<tr><td colspan="8">${A.empty('거래가 없어요')}</td></tr>`}</tbody></table></div></div></div>
        <input type="file" id="rowFile" accept="image/*,application/pdf" hidden>`;
      const g = pg.querySelector('.accgrid'); if (innerWidth < 1180) g.style.gridTemplateColumns = '1fr';
      pg.querySelector('#accMonth').onchange = (e) => { accMonth = Number(e.target.value); draw(); };
      if (canE) bindDrop();
    };
    const upload = async (ledgerId, file) => {
      if (file.size > 8 * 1024 * 1024 && !/^image\//.test(file.type)) throw new Error(file.name + ': 8MB 이하 파일만 올릴 수 있어요');
      let data, mime = file.type || 'application/octet-stream';
      if (/^image\//.test(mime) && !/gif/.test(mime)) { data = await MO.resizeImage(file, 1800, .85); mime = 'image/jpeg'; } else data = await MO.fileToBase64(file);
      await MO.api('receiptUpload', { ledgerId, name: file.name, mime, data });
    };
    const chooseTarget = (files) => new Promise((res) => {
      const cand = d.rows.filter(r => r.kind === '지출').sort((a, b) => (!!a.receiptId - !!b.receiptId) || (a.date < b.date ? 1 : -1));
      if (!cand.length) { MO.toast('먼저 지출 거래를 입력해 주세요', 'err'); return res(null); }
      const m = MO.modal({ title: `영수증 ${files.length}장을 어느 거래에 붙일까요?`, body: `<p class="note" style="margin:0">${files.map(f => esc(f.name)).join(', ')}</p><div class="list">${cand.slice(0, 40).map(r => `<label class="li" style="cursor:pointer"><input type="radio" name="tg" value="${r.id}" style="width:18px;height:18px;accent-color:var(--grn)"><div><b>${MO.md(r.date)} · ${esc(r.category)} · ${MO.won(r.amount)}</b><span>${esc(r.desc)}</span></div>${r.receiptId ? '<span class="tag">이미 있음 (바꾸기)</span>' : '<span class="tag" style="--b:#fff3d6;--c:#a8621f">미첨부</span>'}</label>`).join('')}</div>${files.length > 1 ? '<p class="note" style="margin:0">여러 장이면 첫 장을 고른 거래에, 나머지는 그다음 미첨부 거래에 차례로 붙여요.</p>' : ''}`,
        foot: `<button class="btn o" data-v="0">취소</button><button class="btn" data-v="1">붙이기</button>`, onClose: () => res(null) });
      const r0 = m.body.querySelector('input'); if (r0) r0.checked = true;
      m.foot.querySelector('[data-v="0"]').onclick = () => { m.el.remove(); res(null); };
      m.foot.querySelector('[data-v="1"]').onclick = () => { const v = m.body.querySelector('input:checked'); m.el.remove(); res(v ? v.value : null); };
    });
    const attachMany = async (files, firstId) => {
      files = [...files].filter(f => /^image\//.test(f.type) || f.type === 'application/pdf');
      if (!files.length) return MO.toast('사진(JPG·PNG)이나 PDF만 올릴 수 있어요', 'err');
      const target = firstId || await chooseTarget(files); if (!target) return;
      const queue = [target, ...d.rows.filter(r => r.kind === '지출' && !r.receiptId && r.id !== target).sort((a, b) => a.date < b.date ? 1 : -1).map(r => r.id)];
      let n = 0;
      MO.loader(true);
      try { for (let i = 0; i < files.length && i < queue.length; i++) { await upload(queue[i], files[i]); n++; } MO.toast(`영수증 ${n}장을 붙였어요`, 'ok'); }
      catch (e) { MO.err(e); }
      finally { MO.loader(false); P.acc(pg); }
    };
    function bindDrop() {
      const card = pg.querySelector('#ledger');
      const clear = () => { card.classList.remove('dragging'); pg.querySelectorAll('tr.drop').forEach(x => x.classList.remove('drop')); };
      const over = (e) => { if (![...(e.dataTransfer?.types || [])].includes('Files')) return; e.preventDefault(); card.classList.add('dragging'); const tr = e.target.closest('tr[data-row]'); pg.querySelectorAll('tr.drop').forEach(x => x !== tr && x.classList.remove('drop')); if (tr && d.rows.find(r => r.id === tr.dataset.row && r.kind === '지출')) tr.classList.add('drop'); };
      card.addEventListener('dragover', over); card.addEventListener('dragenter', over);
      card.addEventListener('dragleave', (e) => { if (!card.contains(e.relatedTarget)) clear(); });
      card.addEventListener('drop', (e) => { e.preventDefault(); const tr = e.target.closest('tr.drop'); clear(); if (e.dataTransfer.files.length) attachMany(e.dataTransfer.files, tr ? tr.dataset.row : null); });
      pg.querySelector('#dropFile').onchange = (e) => { if (e.target.files.length) attachMany(e.target.files, null); e.target.value = ''; };
      const co = pg.querySelector('#coach'), up = pg.querySelector('#dropFile').parentElement;
      if (co) { const cr = co.getBoundingClientRect(), br = up.getBoundingClientRect(); co.style.setProperty('--ax', Math.max(14, Math.round(cr.right - (br.left + br.width / 2) - 7)) + 'px'); }
      const ok = pg.querySelector('#coachOk'); if (ok) ok.onclick = () => { try { localStorage.setItem('moaon_coach_rc', '1'); } catch (_) {} pg.querySelector('#coach').remove(); };
      pg.querySelector('#coachShow').onclick = () => { try { localStorage.removeItem('moaon_coach_rc'); } catch (_) {} draw(); };
    }
    const viewReceipt = async (id) => {
      const r = d.rows.find(x => x.id === id);
      const f = await MO.api('receiptGet', { ledgerId: id });
      const blob = MO.b64ToBlob(f.data, f.mime), url = URL.createObjectURL(blob);
      const isPdf = /pdf/.test(f.mime);
      const m = MO.modal({ title: `영수증 · ${MO.md(r.date)} ${r.category} ${MO.won(r.amount)}`, wide: true, onClose: () => URL.revokeObjectURL(url),
        body: isPdf ? `<iframe src="${url}" style="width:100%;height:65dvh;border:0;border-radius:12px;background:#fff" title="영수증"></iframe>` : `<img src="${url}" alt="영수증" style="max-height:68dvh;margin:0 auto;border-radius:12px;box-shadow:var(--sh)">`,
        foot: `${canE ? `<button class="btn r" data-v="del">${MO.icon('trash', 15)}영수증 지우기</button><button class="btn o" data-v="chg">다른 파일로 바꾸기</button>` : ''}<button class="btn" data-v="down">${MO.icon('down', 15)}내려받기</button>` });
      m.foot.onclick = async (e) => {
        const b = e.target.closest('[data-v]'); if (!b) return;
        if (b.dataset.v === 'down') MO.download(`receipt_${r.date}_${r.amount}.${isPdf ? 'pdf' : (f.mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`, blob);
        if (b.dataset.v === 'chg') { m.close(); pickFor(id); }
        if (b.dataset.v === 'del' && await MO.confirm('영수증을 지울까요?', { ok: '지우기', danger: true })) { m.close(); try { await MO.api('receiptDelete', { ledgerId: id }); P.acc(pg); } catch (er) { MO.err(er); } }
      };
    };
    const pickFor = (id) => { const inp = pg.querySelector('#rowFile'); inp.onchange = () => { if (inp.files.length) attachMany(inp.files, id); inp.value = ''; }; inp.click(); };
    const ledgerForm = async (r) => {
      const cats = (kind) => kind === '수입' ? INCOME_CATS : [...d.budget.map(b => b.category), '기타'];
      let kind = r ? r.kind : '지출', file = null;
      const body = document.createElement('div'); body.style.cssText = 'display:grid;gap:12px';
      const paint = () => {
        body.innerHTML = `<div class="seg" style="width:100%">${['수입', '지출'].map(k => `<button type="button" style="flex:1" class="${kind === k ? (k === '수입' ? 'y' : 'n') : ''}" data-k="${k}">${k}</button>`).join('')}</div>
          <div class="row2"><label class="fld"><span>날짜 *</span><input class="inp" type="date" id="lDate" value="${r ? r.date : A.st.boot.today}"></label><label class="fld"><span>금액 *</span><input class="inp" id="lAmt" inputmode="numeric" value="${r ? MO.comma(r.amount) : ''}" placeholder="0"></label></div>
          <label class="fld"><span>항목</span><select class="inp" id="lCat">${cats(kind).map(c => `<option ${r && r.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
          <label class="fld"><span>내용</span><input class="inp" id="lDesc" value="${r ? esc(r.desc) : ''}" placeholder="예: 11월 공과 교재 32권"></label>
          ${kind === '지출' ? `<div class="fld"><span>영수증</span><div class="mdrop" id="mdrop">${file ? `<div class="file">${MO.icon('clip', 16)}${esc(file.name)} <button type="button" id="mclear" aria-label="빼기">✕</button></div>` : r && r.receiptId ? `<div class="file">${MO.icon('clip', 16)}${esc(r.receiptName || '영수증')} (첨부됨)</div><small>새 파일을 놓으면 바꿔요</small>` : `${MO.icon('cloud', 28)}<span>영수증 사진이나 PDF를 끌어다 놓거나</span>`}<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><label class="btn o sm" style="cursor:pointer">${MO.icon('cam', 14)}사진 찍기<input type="file" accept="image/*" capture="environment" hidden data-f></label><label class="btn o sm" style="cursor:pointer">파일 고르기<input type="file" accept="image/*,application/pdf" hidden data-f></label></div></div></div>` : ''}`;
        const amt = body.querySelector('#lAmt'); amt.oninput = () => { const n = MO.parseNum(amt.value); amt.value = n ? MO.comma(n) : ''; };
        body.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { keep(); kind = b.dataset.k; paint(); });
        body.querySelectorAll('[data-f]').forEach(inp => inp.onchange = () => { if (inp.files[0]) { keep(); file = inp.files[0]; paint(); } });
        const md = body.querySelector('#mdrop');
        if (md) { md.ondragover = (e) => { e.preventDefault(); md.classList.add('over'); }; md.ondragleave = () => md.classList.remove('over'); md.ondrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { keep(); file = f; paint(); } }; }
        const mc = body.querySelector('#mclear'); if (mc) mc.onclick = () => { keep(); file = null; paint(); };
      };
      const vals = {}; const keep = () => { ['lDate', 'lAmt', 'lDesc', 'lCat'].forEach(k => { const el = body.querySelector('#' + k); if (el) vals[k] = el.value; }); r = Object.assign({}, r || {}, { date: vals.lDate, amount: MO.parseNum(vals.lAmt), desc: vals.lDesc, category: vals.lCat }); };
      paint();
      const m = MO.modal({ title: r && r.id ? '거래 수정' : '거래 입력', body, foot: `${r && r.id ? `<button class="btn r" data-v="del" style="margin-right:auto">${MO.icon('trash', 15)}지우기</button>` : ''}<button class="btn o" data-v="0">취소</button><button class="btn" data-v="1">저장</button>` });
      m.foot.onclick = async (e) => {
        const b = e.target.closest('[data-v]'); if (!b) return;
        if (b.dataset.v === '0') return m.close();
        if (b.dataset.v === 'del') { if (await MO.confirm('이 거래를 지울까요? 첨부한 영수증도 함께 지워져요.', { ok: '지우기', danger: true })) { m.close(); try { await MO.api('ledgerDelete', { id: r.id }); P.acc(pg); } catch (er) { MO.err(er); } } return; }
        keep();
        if (!r.amount) return MO.toast('금액을 입력해 주세요', 'err');
        try {
          const saved = await MO.api('ledgerSave', { id: r.id, date: r.date, kind, category: r.category, desc: r.desc, amount: r.amount });
          if (file && kind === '지출') await upload(saved.id, file);
          m.close(); MO.toast('저장했어요', 'ok'); P.acc(pg);
        } catch (er) { MO.err(er); }
      };
    };
    const budgetForm = async () => {
      const body = document.createElement('div'); body.style.cssText = 'display:grid;gap:10px';
      let items = d.budget.map(b => ({ category: b.category, amount: b.amount, color: b.color }));
      const paint = () => {
        body.innerHTML = `<label class="fld"><span>전년도(${A.st.year - 1}년) 이월금</span><input class="inp" id="bCarry" inputmode="numeric" value="${MO.comma(S.carry)}"></label><div class="fld"><span>${A.st.year}년 예산 항목</span></div>${items.map((it, i) => `<div style="display:grid;grid-template-columns:1fr 150px 36px;gap:8px"><input class="inp" data-i="${i}" data-k="category" value="${esc(it.category)}" placeholder="항목 이름"><input class="inp" data-i="${i}" data-k="amount" inputmode="numeric" value="${MO.comma(it.amount)}"><button type="button" class="btn o" data-rm="${i}" aria-label="빼기">✕</button></div>`).join('')}<button type="button" class="btn o" id="bAdd">${MO.icon('plus', 14)}항목 추가</button><p class="note" style="margin:0">합계 ${MO.won(items.reduce((a, b) => a + MO.parseNum(b.amount), 0))}</p>`;
        body.querySelectorAll('[data-i]').forEach(inp => inp.oninput = () => { const it = items[+inp.dataset.i]; if (inp.dataset.k === 'amount') { const n = MO.parseNum(inp.value); inp.value = n ? MO.comma(n) : ''; it.amount = n; } else it.category = inp.value; });
        body.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { items.splice(+b.dataset.rm, 1); paint(); });
        body.querySelector('#bAdd').onclick = () => { items.push({ category: '', amount: 0 }); paint(); };
        const c = body.querySelector('#bCarry'); c.oninput = () => { const n = MO.parseNum(c.value); c.value = MO.comma(n); };
      };
      paint();
      const m = MO.modal({ title: '예산 · 이월금', body, foot: `<button class="btn o" data-v="0">취소</button><button class="btn" data-v="1">저장</button>` });
      m.foot.onclick = async (e) => { const b = e.target.closest('[data-v]'); if (!b) return; if (b.dataset.v === '0') return m.close(); try { await MO.api('budgetSave', { year: A.st.year, carry: MO.parseNum(body.querySelector('#bCarry').value), items: items.filter(x => x.category.trim()) }); m.close(); MO.toast('저장했어요', 'ok'); P.acc(pg); } catch (er) { MO.err(er); } };
    };
    draw();
    pg.onclick = async (e) => {
      const t = e.target.closest('[data-tab]'); if (t) { accTab = t.dataset.tab; return draw(); }
      if (e.target.closest('[data-add]')) return ledgerForm(null);
      const ed = e.target.closest('[data-edit]'); if (ed) return ledgerForm(d.rows.find(r => r.id === ed.dataset.edit));
      const rc = e.target.closest('[data-rc]'); if (rc) { try { await viewReceipt(rc.dataset.rc); } catch (er) { MO.err(er); } return; }
      const at = e.target.closest('[data-attach]'); if (at) return pickFor(at.dataset.attach);
      if (e.target.closest('[data-budget]')) return budgetForm();
      if (e.target.closest('[data-csv]')) MO.csv(`moaon_ledger_${A.st.year}.csv`, [['날짜', '구분', '항목', '내용', '금액', '잔액', '영수증', '입력'], ...asc.map(r => [r.date, r.kind, r.category, r.desc, (r.kind === '수입' ? '' : '-') + r.amount, bal[r.id], r.receiptId ? '첨부' : '', r.by])]);
    };
  };
})();
