/* 모아온 관리자 — 탭별 엑셀 내보내기 양식 (출석 · 헌금 · 달란트 · 회계 · 성경암송 · 교적부) */
(function () {
  'use strict';
  const A = window.ADM, XPX = {};
  /* ---------- 공통 디자인 ---------- */
  const C = { ink: '3D3128', sub: '8A7A68', line: 'DDD2C2', zebra: 'FBF7F0', total: 'F3EBDD', soft: 'FFF6E3', grn: '5B8A2E', red: 'C9553F', blue: '3D7CC0' };
  const ACC = { att: '6E9E3C', off: 'E39A1E', tal: 'D98A1C', acc: '8E5432', ver: '4E8CC9', ros: '7A5238' };
  const S = {
    title: { b: 1, sz: 18, color: C.ink },
    sub: { sz: 9.5, color: C.sub },
    head: (acc) => ({ b: 1, sz: 10, color: 'FFFFFF', fill: acc, h: 'center', border: 'all', bc: acc, wrap: 1 }),
    cell: (o) => Object.assign({ sz: 10, border: { b: 'hair', l: 'hair', r: 'hair' }, bc: C.line }, o || {}),
    zebra: (o) => Object.assign({ sz: 10, fill: C.zebra, border: { b: 'hair', l: 'hair', r: 'hair' }, bc: C.line }, o || {}),
    total: (o) => Object.assign({ b: 1, sz: 10, fill: C.total, border: { t: 'thin', b: 'medium', l: 'hair', r: 'hair' }, bc: 'B9A88F' }, o || {}),
    kpiL: { sz: 9, color: C.sub, fill: C.soft, border: { t: 'thin', l: 'thin', r: 'thin' }, bc: 'EADFCB', h: 'left', indent: 1 },
    kpiV: (color) => ({ b: 1, sz: 14, color: color || C.ink, fill: C.soft, border: { b: 'thin', l: 'thin', r: 'thin' }, bc: 'EADFCB', h: 'left', indent: 1, fmt: '#,##0' }),
    sec: (acc) => ({ b: 1, sz: 11, color: acc, border: { b: 'medium' }, bc: acc })
  };
  const WON = '"₩"#,##0;[Red]-"₩"#,##0;"-"';
  const NUM = '#,##0;[Red]-#,##0;"-"';
  const PCT = '0%;-0%;"-"';
  const today = () => A.st.boot.today;
  const org = () => A.st.boot.org || '사무엘 주일학교 초등부';
  const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const ymd = (d) => d ? d.replace(/-/g, '.') : '';
  const classes = () => (A.st.boot.classes || []).slice().sort((a, b) => a.grade - b.grade || a.order - b.order);
  const clsOrder = (id) => { const i = classes().findIndex(c => c.id === id); return i < 0 ? 999 : i; };
  const sortStu = (list) => list.slice().sort((a, b) => clsOrder(a.classId) - clsOrder(b.classId) || a.name.localeCompare(b.name, 'ko'));
  const clsOf = (id) => A.cls(id) || {};

  /** 제목 2줄: 제목 / 기관 · 기간 · 출력일 */
  function head(ws, title, sub, ncol) {
    ws.merge(1, 1, 1, ncol, title, S.title); ws.height(1, 34);
    ws.merge(2, 1, 2, ncol, `${org()}  ·  ${sub}  ·  출력 ${ymd(today())}`, S.sub); ws.height(2, 18);
    ws.height(3, 8);
    return 4;
  }
  /** 요약 카드 한 줄: [[라벨, 값, 색, 형식]] — 각 카드 span 칸 */
  function kpis(ws, r, items, span, ncol) {
    let c = 1;
    items.forEach(([label, value, color, fmt]) => {
      const c2 = Math.min(c + span - 1, ncol);
      ws.merge(r, c, r, c2, label, S.kpiL);
      ws.merge(r + 1, c, r + 1, c2, value, Object.assign(S.kpiV(color), fmt ? { fmt } : {}));
      c = c2 + 1;
    });
    ws.height(r, 17); ws.height(r + 1, 26); ws.height(r + 2, 10);
    return r + 3;
  }
  /** 표: cols = [{t:제목, w:너비, v:(row,i)=>값, s:{정렬·형식}}] → 머리글·본문(줄무늬). 합계 행은 total 옵션 */
  function table(ws, r0, cols, rows, acc, opt) {
    opt = opt || {};
    ws.row(r0, cols.map(c => c.t), S.head(acc)); ws.height(r0, opt.headH || 24);
    rows.forEach((row, i) => {
      const r = r0 + 1 + i, base = i % 2 ? S.zebra : S.cell;
      cols.forEach((c, j) => { const v = c.v(row, i, r); const st = typeof c.s === 'function' ? c.s(row, v) : c.s; ws.set(r, j + 1, v, base(st)); });
      if (opt.rowH) ws.height(r, typeof opt.rowH === 'function' ? opt.rowH(row) : opt.rowH);
    });
    let last = r0 + rows.length;
    if (opt.total) {
      const r = last + 1;
      cols.forEach((c, j) => {
        let v = null;
        if (j === 0) v = opt.total.label || '합계';
        else if (c.sum && rows.length) { const L = XL.colL(j + 1); v = { f: `SUBTOTAL(9,${L}${r0 + 1}:${L}${last})`, v: rows.reduce((a, row, i) => a + (Number(c.v(row, i, r0 + 1 + i)) || 0), 0) }; }
        else if (c.totalV) v = c.totalV(r0 + 1, last, r);
        ws.set(r, j + 1, v, S.total(Object.assign({}, c.s && typeof c.s !== 'function' ? c.s : {}, j === 0 ? { h: 'center' } : {})));
      });
      ws.height(r, 22); last = r;
    }
    ws.cols(cols.map(c => c.w));
    return { r0, last, dataEnd: r0 + rows.length };
  }
  /** 글자 수로 줄 수 어림: 한글은 약 1.8칸, 영문·숫자는 1칸 */
  const lines = (text, w) => { const t = String(text || ''); let u = 0; for (const ch of t) u += /[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1.8 : 1; return Math.max(1, Math.ceil(u / Math.max(w - 1.5, 4))); };
  const save = (wb, name) => { wb.download(name); MO.toast('엑셀 파일을 만들었어요', 'ok'); };
  const run = async (fn) => { MO.loader(true); try { await fn(); } catch (e) { MO.err(e); } finally { MO.loader(false); } };

  /* =========================================================
   * 1. 출석
   * ========================================================= */
  XPX.att = (year) => run(async () => {
    const recs = await MO.api('attendanceYear', { year }, { loader: false });
    const dates = [...new Set(recs.map(r => r.date))].sort();
    const by = {}; recs.forEach(r => { by[r.studentId + '|' + r.date] = r.status; });
    const has = new Set(recs.map(r => r.studentId));
    const studs = sortStu(A.st.boot.students.filter(s => s.status !== '졸업' || has.has(s.id)));
    const wb = XL.book(); wb.title = `${year}년 출석부`;
    // 시트 1: 주일별 출석부
    const fixed = 4, nc = fixed + dates.length + 3;
    const ws = wb.sheet('주일별 출석부', { landscape: 1, freeze: { row: 6, col: fixed }, printRows: [6, 6], tab: ACC.att });
    let r = head(ws, `${year}년 주일별 출석부`, `${year}년 · 주일 ${dates.length}회 · ○ 출석  ✕ 결석`, Math.max(nc, 10));
    const totalP = recs.filter(x => x.status === 1).length;
    r = kpis(ws, r, [['학생 수', studs.length, C.ink, '#,##0"명"'], ['기록한 주일', dates.length, C.ink, '#,##0"회"'], ['연간 출석률', recs.length ? totalP / recs.length : 0, ACC.att, '0%']], 3, Math.max(nc, 9)) - 1;
    const cols = [
      { t: '번호', w: 5, v: (s, i) => i + 1, s: { h: 'center', color: C.sub } },
      { t: '학년', w: 5.5, v: s => clsOf(s.classId).grade ? clsOf(s.classId).grade + '학년' : '', s: { h: 'center' } },
      { t: '반', w: 9, v: s => clsOf(s.classId).name || '', s: { h: 'center' } },
      { t: '이름', w: 9, v: s => s.name, s: { b: 1, h: 'center' } },
      ...dates.map(d => ({ t: md(d), w: 4.6, v: s => { const st = by[s.id + '|' + d]; return st === 1 ? '○' : st === 0 ? '✕' : ''; }, s: (s, v) => ({ h: 'center', color: v === '○' ? C.grn : C.red, b: v === '○' ? 0 : 1 }) })),
      { t: '출석', w: 6, v: s => dates.filter(d => by[s.id + '|' + d] === 1).length, s: { h: 'center', b: 1, color: C.grn, fmt: NUM } },
      { t: '결석', w: 6, v: s => dates.filter(d => by[s.id + '|' + d] === 0).length, s: { h: 'center', color: C.red, fmt: NUM } },
      { t: '출석률', w: 8, v: s => { const n = dates.filter(d => by[s.id + '|' + d] != null).length; return n ? dates.filter(d => by[s.id + '|' + d] === 1).length / n : ''; }, s: { h: 'center', b: 1, fmt: PCT } }
    ];
    const t = table(ws, r, cols, studs, ACC.att, { rowH: 20, headH: 26 });
    // 주일별 출석 인원 줄
    const rr = t.last + 1;
    ws.merge(rr, 1, rr, fixed, '출석 인원', S.total({ h: 'center' }));
    dates.forEach((d, i) => { const n = recs.filter(x => x.date === d && x.status === 1).length; ws.set(rr, fixed + 1 + i, n, S.total({ h: 'center', fmt: NUM })); });
    const P = recs.filter(x => x.status === 1).length, Ab = recs.filter(x => x.status === 0).length;
    ws.set(rr, fixed + dates.length + 1, P, S.total({ h: 'center', fmt: NUM, color: C.grn })); ws.set(rr, fixed + dates.length + 2, Ab, S.total({ h: 'center', fmt: NUM, color: C.red })); ws.set(rr, fixed + dates.length + 3, recs.length ? P / recs.length : '', S.total({ h: 'center', fmt: PCT }));
    ws.height(rr, 22);
    ws.o.filter = XL.rng(t.r0, 1, t.dataEnd, nc);
    // 시트 2: 월별 요약
    const w2 = wb.sheet('월별 요약', { landscape: 1, freeze: { row: 5, col: 1 }, tab: ACC.att });
    let r2 = head(w2, `${year}년 월별 출석률`, `${year}년 · 반별 · 출석 ÷ (출석+결석)`, 15);
    const rows2 = classes().filter(c => c.active || studs.some(s => s.classId === c.id)).map(c => ({ label: `${c.grade}학년 ${c.name}`, teacher: c.teacherName || '', ids: new Set(studs.filter(s => s.classId === c.id).map(s => s.id)) }));
    rows2.push({ label: '초등부 전체', teacher: '', ids: new Set(studs.map(s => s.id)), all: 1 });
    const rate = (ids, m) => { const x = recs.filter(a => ids.has(a.studentId) && (!m || Number(a.date.slice(5, 7)) === m)); return x.length ? x.filter(a => a.status === 1).length / x.length : ''; };
    table(w2, r2, [
      { t: '반', w: 14, v: x => x.label, s: (x) => ({ b: 1, fill: x.all ? C.total : undefined }) },
      { t: '담임', w: 9, v: x => x.teacher, s: { h: 'center' } },
      ...Array.from({ length: 12 }, (_, i) => ({ t: (i + 1) + '월', w: 7, v: x => rate(x.ids, i + 1), s: (x) => ({ h: 'center', fmt: PCT, fill: x.all ? C.total : undefined, b: x.all ? 1 : 0 }) })),
      { t: '연간', w: 8, v: x => rate(x.ids), s: (x) => ({ h: 'center', fmt: PCT, b: 1, color: ACC.att, fill: x.all ? C.total : undefined }) }
    ], rows2, ACC.att, { rowH: 22 });
    save(wb, `MOAON_Attendance_${year}.xlsx`);
  });

  /* =========================================================
   * 2. 헌금
   * ========================================================= */
  const OFF = [['sunday', '주일헌금'], ['thanks', '감사헌금'], ['tithe', '십일조'], ['festival', '절기헌금']];
  XPX.off = (year) => run(async () => {
    const list = (await MO.api('offeringList', { year }, { loader: false })).slice().sort((a, b) => a.date < b.date ? -1 : 1);
    const sum = (o) => OFF.reduce((a, [k]) => a + (o[k] || 0), 0), all = list.reduce((a, o) => a + sum(o), 0);
    const wb = XL.book(); wb.title = `${year}년 헌금`;
    const ws = wb.sheet('헌금 내역', { freeze: { row: 7, col: 1 }, printRows: [7, 7], tab: ACC.off });
    let r = head(ws, `${year}년 헌금 내역`, `${year}년 · 주일별 · 종류별 금액`, 9);
    r = kpis(ws, r, [['올해 헌금 합계', all, ACC.off, WON], ...OFF.slice(0, 3).map(([k, l]) => [l, list.reduce((a, o) => a + (o[k] || 0), 0), C.ink, WON])], 2, 8);
    const t = table(ws, r, [
      { t: '날짜', w: 12, v: o => ymd(o.date), s: { h: 'center' } },
      ...OFF.map(([k, l]) => ({ t: l, w: 12, v: o => o[k] || 0, s: { fmt: WON }, sum: 1 })),
      { t: '합계', w: 13, v: o => sum(o), s: { fmt: WON, b: 1 }, sum: 1 },
      { t: '계수 확인', w: 14, v: o => o.counters || '', s: { h: 'center' } },
      { t: '상태', w: 8, v: o => o.confirmed ? '확인 완료' : '확인 전', s: (o) => ({ h: 'center', color: o.confirmed ? C.grn : C.red }) },
      { t: '메모', w: 22, v: o => o.memo || '', s: { wrap: 1, indent: 1 } }
    ], list, ACC.off, { rowH: 20, total: { label: '합계' } });
    ws.o.filter = XL.rng(t.r0, 1, t.dataEnd, 9);
    const w2 = wb.sheet('월별 합계', { tab: ACC.off });
    let r2 = head(w2, `${year}년 월별 헌금`, `${year}년 · 월별 · 종류별 합계`, 7);
    const months = Array.from({ length: 12 }, (_, i) => { const m = i + 1, xs = list.filter(o => Number(o.date.slice(5, 7)) === m); return { m, n: xs.length, ...Object.fromEntries(OFF.map(([k]) => [k, xs.reduce((a, o) => a + (o[k] || 0), 0)])) }; });
    table(w2, r2, [
      { t: '월', w: 8, v: x => x.m + '월', s: { h: 'center', b: 1 } },
      { t: '주일 수', w: 8, v: x => x.n, s: { h: 'center', fmt: NUM }, sum: 1 },
      ...OFF.map(([k, l]) => ({ t: l, w: 13, v: x => x[k], s: { fmt: WON }, sum: 1 })),
      { t: '합계', w: 14, v: x => OFF.reduce((a, [k]) => a + x[k], 0), s: { fmt: WON, b: 1 }, sum: 1 }
    ], months, ACC.off, { rowH: 21, total: { label: '연간' } });
    save(wb, `MOAON_Offering_${year}.xlsx`);
  });

  /* =========================================================
   * 3. 달란트
   * ========================================================= */
  XPX.tal = (year) => run(async () => {
    const [d, ex] = await Promise.all([MO.api('talentData', {}, { loader: false }), MO.api('talentExport', {}, { loader: false })]);
    const plus = {}, minus = {};
    ex.rows.forEach(x => { if (x.amount > 0) plus[x.studentId] = (plus[x.studentId] || 0) + x.amount; else minus[x.studentId] = (minus[x.studentId] || 0) - x.amount; });
    const studs = d.students.slice().sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, 'ko'));
    let rank = 0, prev = null; studs.forEach((s, i) => { if (s.balance !== prev) { rank = i + 1; prev = s.balance; } s.rank = rank; });
    const wb = XL.book(); wb.title = '달란트';
    const ws = wb.sheet('아이별 달란트', { freeze: { row: 7, col: 0 }, printRows: [7, 7], tab: ACC.tal });
    let r = head(ws, '아이별 달란트 현황', `${ymd(today())} 기준 · 보유 많은 순`, 7);
    const top = studs.slice(0, 3);
    r = kpis(ws, r, [['전체 보유 합계', studs.reduce((a, s) => a + s.balance, 0), ACC.tal, '#,##0" T"'], ['1등', top[0] ? `${top[0].name} ${top[0].balance}T` : '-', C.ink], ['아이 수', studs.length, C.ink, '#,##0"명"']], 2, 7);
    const medal = { 1: 'F5B335', 2: 'B9B2A6', 3: 'D9894A' };
    const t = table(ws, r, [
      { t: '순위', w: 6, v: s => s.rank, s: (s) => ({ h: 'center', b: 1, color: medal[s.rank] ? 'FFFFFF' : C.sub, fill: medal[s.rank] }) },
      { t: '학년·반', w: 14, v: s => s.classLabel, s: { h: 'center' } },
      { t: '이름', w: 10, v: s => s.name, s: { b: 1, h: 'center' } },
      { t: '받은 달란트', w: 11, v: s => plus[s.id] || 0, s: { fmt: NUM, color: C.grn, h: 'center' }, sum: 1 },
      { t: '쓴 달란트', w: 11, v: s => minus[s.id] || 0, s: { fmt: NUM, color: C.red, h: 'center' }, sum: 1 },
      { t: '보유', w: 10, v: s => s.balance, s: { fmt: NUM, b: 1, h: 'center' }, sum: 1 },
      { t: '비고', w: 18, v: () => '', s: {} }
    ], studs, ACC.tal, { rowH: 20, total: { label: '합계' } });
    ws.o.filter = XL.rng(t.r0, 1, t.dataEnd, 7);
    // 내역
    const rows = ex.rows;
    const w2 = wb.sheet('전체 내역', { freeze: { row: 4, col: 0 }, printRows: [4, 4], tab: ACC.tal });
    let r2 = head(w2, '달란트 적립 · 사용 내역', `전체 ${rows.length}건 · 최근 순`, 7);
    const t2 = table(w2, r2, [
      { t: '날짜', w: 12, v: x => ymd(x.date), s: { h: 'center' } },
      { t: '학년·반', w: 14, v: x => x.classLabel, s: { h: 'center' } },
      { t: '이름', w: 10, v: x => x.name, s: { b: 1, h: 'center' } },
      { t: '내용', w: 30, v: x => x.reason, s: { wrap: 1, indent: 1 } },
      { t: '달란트', w: 9, v: x => x.amount, s: (x) => ({ h: 'center', b: 1, color: x.amount < 0 ? C.red : C.grn, fmt: '+#,##0;-#,##0;0' }) },
      { t: '방식', w: 9, v: x => x.source === 'auto' ? '자동' : '선생님', s: { h: 'center', color: C.sub } },
      { t: '입력', w: 10, v: x => x.by || '', s: { h: 'center', color: C.sub } }
    ], rows, ACC.tal, { rowH: 19 });
    w2.o.filter = XL.rng(t2.r0, 1, t2.dataEnd, 7);
    // 규칙
    const w3 = wb.sheet('적립 규칙', { tab: ACC.tal });
    let r3 = head(w3, '달란트 적립 규칙', '자동: 앱·출석에서 저절로 쌓여요', 4);
    table(w3, r3, [
      { t: '규칙', w: 28, v: x => x.name, s: { b: 1 } },
      { t: '달란트', w: 10, v: x => x.amount, s: { h: 'center', fmt: '+#,##0;-#,##0;0' } },
      { t: '방식', w: 10, v: x => x.auto ? '자동' : '선생님', s: { h: 'center' } },
      { t: '사용', w: 9, v: x => x.active ? '사용' : '꺼짐', s: (x) => ({ h: 'center', color: x.active ? C.grn : C.sub }) }
    ], d.rules, ACC.tal, { rowH: 21 });
    save(wb, `MOAON_Talent_${today()}.xlsx`);
  });

  /* =========================================================
   * 4. 회계
   * ========================================================= */
  XPX.acc = (year) => run(async () => {
    const d = await MO.api('ledgerData', { year }, { loader: false });
    const S0 = d.summary, rows = d.rows.slice().sort((a, b) => a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : (a.date < b.date ? -1 : 1));
    const wb = XL.book(); wb.title = `${year}년 회계`;
    const ws = wb.sheet('수입·지출 장부', { landscape: 1, freeze: { row: 7, col: 0 }, printRows: [7, 7], tab: ACC.acc });
    let r = head(ws, `${year}년 수입 · 지출 장부`, `${year}.01.01 ~ ${year}.12.31`, 9);
    r = kpis(ws, r, [['전년도 이월금', S0.carry, C.ink, WON], ['수입 합계', S0.income, C.grn, WON], ['지출 합계', S0.expense, C.red, WON], ['현재 잔액', S0.balance, ACC.acc, WON]], 2, 9);
    // 이월금 행 + 거래 + 합계 (잔액은 수식)
    ws.row(r, ['날짜', '구분', '항목', '내용', '수입', '지출', '잔액', '영수증', '입력'], S.head(ACC.acc)); ws.height(r, 24);
    const r1 = r + 1;
    ws.row(r1, [`${year}.01.01`, '이월', '', `${year - 1}년에서 넘어온 금액`, null, null, S0.carry, '', ''], [S.cell({ h: 'center', color: C.sub }), S.cell({ h: 'center', color: C.sub }), S.cell(), S.cell({ color: C.sub }), S.cell({ fmt: WON }), S.cell({ fmt: WON }), S.cell({ fmt: WON, b: 1 }), S.cell(), S.cell()]);
    let bal0 = S0.carry;
    rows.forEach((x, i) => {
      const rr = r1 + 1 + i, st = i % 2 ? S.zebra : S.cell, inc = x.kind === '수입';
      bal0 += inc ? x.amount : -x.amount;
      ws.row(rr, [ymd(x.date), x.kind, x.category, x.desc + (x.offeringId ? ' (헌금 자동)' : ''), inc ? x.amount : null, inc ? null : x.amount, { f: `G${rr - 1}+E${rr}-F${rr}`, v: bal0 }, x.kind === '지출' ? (x.receiptId ? '첨부' : '미첨부') : '', x.by || ''],
        [st({ h: 'center' }), st({ h: 'center', b: 1, color: inc ? C.grn : C.red }), st({ h: 'center' }), st({ wrap: 1, indent: 1 }), st({ fmt: WON, color: C.grn }), st({ fmt: WON, color: C.red }), st({ fmt: WON, b: 1 }), st({ h: 'center', color: x.receiptId ? C.grn : C.red }), st({ h: 'center', color: C.sub })]);
      ws.height(rr, 20);
    });
    const end = r1 + rows.length, rt = end + 1;
    ws.row(rt, ['합계', '', '', `거래 ${rows.length}건`, { f: `SUBTOTAL(9,E${r1}:E${end})`, v: S0.income }, { f: `SUBTOTAL(9,F${r1}:F${end})`, v: S0.expense }, { f: `${rows.length ? 'G' + end : 'G' + r1}`, v: S0.balance }, '', ''],
      [S.total({ h: 'center' }), S.total(), S.total(), S.total({ color: C.sub }), S.total({ fmt: WON, color: C.grn }), S.total({ fmt: WON, color: C.red }), S.total({ fmt: WON, color: ACC.acc }), S.total(), S.total()]);
    ws.height(rt, 23);
    ws.cols([12, 7, 13, 34, 13, 13, 14, 9, 9]);
    ws.o.filter = XL.rng(r, 1, end, 9);
    // 예산 대비 집행
    const w2 = wb.sheet('예산 대비 집행', { tab: ACC.acc });
    let r2 = head(w2, `${year}년 예산 대비 집행`, '항목별 예산 · 집행 · 남은 금액', 5);
    const spent = (cat) => rows.filter(x => x.kind === '지출' && x.category === cat).reduce((a, x) => a + x.amount, 0);
    const bud = d.budget.map(b => ({ cat: b.category, amount: b.amount, spent: spent(b.category) }));
    const other = rows.filter(x => x.kind === '지출' && !d.budget.some(b => b.category === x.category)).reduce((a, x) => a + x.amount, 0);
    if (other) bud.push({ cat: '예산에 없는 항목', amount: 0, spent: other });
    table(w2, r2, [
      { t: '항목', w: 18, v: x => x.cat, s: { b: 1 } },
      { t: '예산', w: 14, v: x => x.amount, s: { fmt: WON }, sum: 1 },
      { t: '집행', w: 14, v: x => x.spent, s: { fmt: WON, color: C.red }, sum: 1 },
      { t: '남은 금액', w: 14, v: (x, i, rr) => ({ f: `B${rr}-C${rr}`, v: x.amount - x.spent }), s: { fmt: WON, b: 1 }, totalV: (a, b, rr) => ({ f: `B${rr}-C${rr}`, v: bud.reduce((s, x) => s + x.amount - x.spent, 0) }) },
      { t: '집행률', w: 9, v: (x, i, rr) => x.amount ? { f: `IF(B${rr}=0,"",C${rr}/B${rr})`, v: x.spent / x.amount } : '', s: (x) => ({ h: 'center', fmt: '0%', b: 1, color: x.amount && x.spent / x.amount >= 0.9 ? C.red : C.ink }), totalV: (a, b, rr) => ({ f: `IF(B${rr}=0,"",C${rr}/B${rr})`, v: bud.reduce((s, x) => s + x.amount, 0) ? bud.reduce((s, x) => s + x.spent, 0) / bud.reduce((s, x) => s + x.amount, 0) : 0 }) }
    ], bud, ACC.acc, { rowH: 22, total: { label: '합계' } });
    // 월별 요약
    const w3 = wb.sheet('월별 요약', { tab: ACC.acc });
    let r3 = head(w3, `${year}년 월별 수입 · 지출`, '월말 잔액 = 이월금 + 누적 수입 − 누적 지출', 5);
    let bal = S0.carry;
    const ms = Array.from({ length: 12 }, (_, i) => { const xs = rows.filter(x => Number(x.date.slice(5, 7)) === i + 1), inc = xs.filter(x => x.kind === '수입').reduce((a, x) => a + x.amount, 0), exp = xs.filter(x => x.kind === '지출').reduce((a, x) => a + x.amount, 0); bal += inc - exp; return { m: i + 1, inc, exp, bal }; });
    table(w3, r3, [
      { t: '월', w: 8, v: x => x.m + '월', s: { h: 'center', b: 1 } },
      { t: '수입', w: 14, v: x => x.inc, s: { fmt: WON, color: C.grn }, sum: 1 },
      { t: '지출', w: 14, v: x => x.exp, s: { fmt: WON, color: C.red }, sum: 1 },
      { t: '차액', w: 14, v: (x, i, rr) => ({ f: `B${rr}-C${rr}`, v: x.inc - x.exp }), s: { fmt: WON }, totalV: (a, b, rr) => ({ f: `B${rr}-C${rr}`, v: S0.income - S0.expense }) },
      { t: '월말 잔액', w: 15, v: x => x.bal, s: { fmt: WON, b: 1 } }
    ], ms, ACC.acc, { rowH: 21, total: { label: '연간' } });
    save(wb, `MOAON_Ledger_${year}.xlsx`);
  });

  /* =========================================================
   * 5. 성경암송
   * ========================================================= */
  XPX.ver = (planId) => run(async () => {
    const d = await MO.api('verseData', {}, { loader: false });
    const plan = d.plans.find(p => p.id === planId) || d.plans.find(p => p.id === d.activeId) || d.plans[0];
    if (!plan) throw new Error('내보낼 암송 계획이 없어요.');
    const verses = plan.weeks.flatMap(w => w.verses.map(v => Object.assign({ week: w.week }, v)));
    const done = {}; d.progress.forEach(p => { done[p.studentId + '|' + p.verseId] = p.source; });
    const studs = sortStu(A.st.boot.students.filter(s => s.status !== '졸업'));
    const wb = XL.book(); wb.title = plan.title;
    // 계획표
    const ws = wb.sheet('암송 계획표', { freeze: { row: 4, col: 0 }, printRows: [4, 4], tab: ACC.ver });
    let r = head(ws, plan.title, `${ymd(plan.start)} ~ ${ymd(plan.end)} · ${plan.weeks.length}주 · ${verses.length}구절`, 5);
    const prow = []; plan.weeks.forEach(w => w.verses.forEach((v, j) => prow.push({ w, v, first: j === 0, n: w.verses.length })));
    ws.row(r, ['주차', '기간', '주제', '장절', '말씀'], S.head(ACC.ver)); ws.height(r, 24);
    prow.forEach((x, i) => {
      const rr = r + 1 + i, st = x.w.week % 2 ? S.cell : S.zebra;
      if (x.first) {
        ws.merge(rr, 1, rr + x.n - 1, 1, x.w.week + '주차', st({ h: 'center', b: 1, color: ACC.ver }));
        ws.merge(rr, 2, rr + x.n - 1, 2, `${md(x.w.start)} ~ ${md(x.w.end)}`, st({ h: 'center' }));
        ws.merge(rr, 3, rr + x.n - 1, 3, x.w.theme || '', st({ h: 'center', b: 1, wrap: 1 }));
      }
      ws.set(rr, 4, x.v.ref, st({ b: 1, h: 'center' })); ws.set(rr, 5, x.v.text, st({ wrap: 1, indent: 1 }));
      ws.height(rr, Math.max(22, lines(x.v.text, 58) * 14 + 8));
    });
    ws.cols([7, 13, 18, 15, 58]);
    // 아이별 진도
    const w2 = wb.sheet('아이별 진도', { landscape: 1, freeze: { row: 7, col: 3 }, printRows: [6, 7], tab: ACC.ver });
    const nc = 3 + verses.length + 2;
    let r2 = head(w2, `${plan.title} · 아이별 진도`, '● 앱에서 완료   ◎ 선생님 확인', Math.max(nc, 8));
    r2 = kpis(w2, r2, [['아이 수', studs.length, C.ink, '#,##0"명"'], ['전체 구절', verses.length, C.ink, '#,##0"구절"'], ['초등부 전체 진도', studs.length && verses.length ? studs.reduce((a, s) => a + verses.filter(v => done[s.id + '|' + v.id]).length, 0) / (studs.length * verses.length) : 0, ACC.ver, '0%']], 3, Math.max(nc, 9)) - 1;
    // 2단 머리글: 주차 / 장절
    w2.merge(r2, 1, r2 + 1, 1, '학년', S.head(ACC.ver)); w2.merge(r2, 2, r2 + 1, 2, '반', S.head(ACC.ver)); w2.merge(r2, 3, r2 + 1, 3, '이름', S.head(ACC.ver));
    let c = 4; plan.weeks.forEach(w => { w2.merge(r2, c, r2, c + w.verses.length - 1, w.week + '주차', S.head(ACC.ver)); w.verses.forEach((v, j) => w2.set(r2 + 1, c + j, v.ref.replace(/\s+/g, '\n'), Object.assign(S.head('6FA3D6'), { sz: 8 }))); c += w.verses.length; });
    w2.merge(r2, c, r2 + 1, c, '완료', S.head(ACC.ver)); w2.merge(r2, c + 1, r2 + 1, c + 1, '진도율', S.head(ACC.ver));
    w2.height(r2, 20); w2.height(r2 + 1, 34);
    studs.forEach((s, i) => {
      const rr = r2 + 2 + i, st = i % 2 ? S.zebra : S.cell, cl = clsOf(s.classId);
      const n = verses.filter(v => done[s.id + '|' + v.id]).length;
      w2.row(rr, [cl.grade ? cl.grade + '학년' : '', cl.name || '', s.name], [st({ h: 'center' }), st({ h: 'center' }), st({ h: 'center', b: 1 })]);
      verses.forEach((v, j) => { const src = done[s.id + '|' + v.id]; w2.set(rr, 4 + j, src === 'app' ? '●' : src === 'teacher' ? '◎' : '', st({ h: 'center', color: src === 'app' ? 'E39A1E' : ACC.ver })); });
      w2.set(rr, c, n, st({ h: 'center', b: 1, fmt: NUM })); w2.set(rr, c + 1, verses.length ? n / verses.length : 0, st({ h: 'center', b: 1, fmt: '0%', color: ACC.ver }));
      w2.height(rr, 20);
    });
    w2.cols([6, 9, 9, ...verses.map(() => 6.2), 6, 7.5]);
    w2.o.filter = XL.rng(r2 + 1, 1, r2 + 1 + studs.length, nc);
    // 반별 요약
    const w3 = wb.sheet('반별 요약', { tab: ACC.ver });
    let r3 = head(w3, `${plan.title} · 반별 진도`, '반 아이들이 외운 구절 ÷ (아이 수 × 구절 수)', 5);
    const crow = classes().filter(c2 => c2.active).map(c2 => { const ks = studs.filter(s => s.classId === c2.id); const dn = ks.reduce((a, s) => a + verses.filter(v => done[s.id + '|' + v.id]).length, 0); return { label: `${c2.grade}학년 ${c2.name}`, teacher: c2.teacherName || '', n: ks.length, dn, rate: ks.length && verses.length ? dn / (ks.length * verses.length) : 0 }; });
    table(w3, r3, [
      { t: '반', w: 16, v: x => x.label, s: { b: 1 } },
      { t: '담임', w: 10, v: x => x.teacher, s: { h: 'center' } },
      { t: '아이 수', w: 9, v: x => x.n, s: { h: 'center', fmt: NUM }, sum: 1 },
      { t: '외운 구절(합)', w: 13, v: x => x.dn, s: { h: 'center', fmt: NUM }, sum: 1 },
      { t: '진도율', w: 10, v: x => x.rate, s: { h: 'center', fmt: '0%', b: 1, color: ACC.ver }, totalV: (a, b) => { const n = crow.reduce((s, x) => s + x.n, 0); return n && verses.length ? crow.reduce((s, x) => s + x.dn, 0) / (n * verses.length) : 0; } }
    ], crow, ACC.ver, { rowH: 22, total: { label: '초등부 전체' } });
    save(wb, `MOAON_Verse_${today()}.xlsx`);
  });

  /* =========================================================
   * 6. 교적부 (목록 + 한 명씩 교적부 양식)
   * ========================================================= */
  XPX.rosOpen = () => {
    const grades = A.grades();
    const m = MO.modal({
      title: '교적부 엑셀로 받기',
      body: `<div class="fld"><span>범위</span><div class="chips" id="xg"><button class="chip on" data-g="">전체</button>${grades.map(g => `<button class="chip" data-g="${g}">${g}학년</button>`).join('')}</div></div>
        <label class="check"><input type="checkbox" id="xCard" checked style="width:18px;height:18px;accent-color:var(--grn)">한 명씩 교적부 양식 넣기 (사무엘 교회 학교 교적부 · A4 가로 1장)</label>
        <label class="check"><input type="checkbox" id="xPhoto" checked style="width:18px;height:18px;accent-color:var(--grn)">사진 넣기 <span class="note">(사진이 많으면 조금 걸려요)</span></label>
        <label class="check"><input type="checkbox" id="xGrad" style="width:18px;height:18px;accent-color:var(--grn)">졸업한 아이도 넣기</label>
        <p class="note" style="margin:0">교적부에는 개인정보가 들어 있어요. 받은 파일은 공유하지 말고 안전한 곳에 보관해 주세요.</p>`,
      foot: '<button class="btn o" data-v="0">취소</button><button class="btn" data-v="1">엑셀 만들기</button>'
    });
    let g = '';
    m.body.querySelector('#xg').onclick = (e) => { const b = e.target.closest('[data-g]'); if (!b) return; g = b.dataset.g; m.body.querySelectorAll('#xg .chip').forEach(x => x.classList.toggle('on', x === b)); };
    m.foot.querySelector('[data-v="0"]').onclick = () => m.close();
    m.foot.querySelector('[data-v="1"]').onclick = () => { const o = { grade: g ? Number(g) : 0, cards: m.body.querySelector('#xCard').checked, photos: m.body.querySelector('#xPhoto').checked, grad: m.body.querySelector('#xGrad').checked }; m.close(); XPX.ros(o); };
  };
  const imgSize = (url) => new Promise(res => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([3, 4]); im.src = url; });
  const toJpeg = (url) => new Promise(res => { // 엑셀이 읽기 쉬운 JPEG/PNG로 통일
    if (/^data:image\/(png|jpe?g);/i.test(url)) return res(url);
    const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); res(c.toDataURL('image/jpeg', 0.9)); }; im.onerror = () => res(null); im.src = url;
  });

  XPX.ros = (o) => run(async () => {
    const year = A.st.year;
    const d = await MO.api('rosterExport', { year, includeGrad: !!o.grad }, { loader: false });
    let studs = d.students.filter(s => !o.grade || s.grade === o.grade);
    studs.sort((a, b) => (a.grade || 99) - (b.grade || 99) || a.classOrder - b.classOrder || a.name.localeCompare(b.name, 'ko'));
    if (!studs.length) throw new Error('내보낼 학생이 없어요.');
    const photos = {};
    if (o.cards && o.photos) {
      const ids = studs.filter(s => s.hasPhoto).map(s => s.id);
      for (let i = 0; i < ids.length; i += 10) Object.assign(photos, await MO.api('studentPhotos', { ids: ids.slice(i, i + 10), slots: true }, { loader: false }));
    }
    const attRate = (s) => { const n = s.attendance.length; return n ? s.attendance.filter(a => a.status === 1).length / n : ''; };
    const wb = XL.book(); wb.title = '교적부';
    // 목록
    const ws = wb.sheet('교적부 목록', { landscape: 1, freeze: { row: 4, col: 4 }, printRows: [4, 4], tab: ACC.ros });
    const byG = {}; studs.forEach(s => { byG[s.grade || '-'] = (byG[s.grade || '-'] || 0) + 1; });
    let r = head(ws, `${o.grade ? o.grade + '학년 ' : ''}교적부 목록`, `총 ${studs.length}명 (${Object.keys(byG).map(k => `${k}학년 ${byG[k]}명`).join(', ')}) · ${year}년 출석 기준`, 20);
    const t = table(ws, r, [
      { t: '번호', w: 5, v: (s, i) => i + 1, s: { h: 'center', color: C.sub } },
      { t: '학년', w: 6, v: s => s.grade ? s.grade + '학년' : '', s: { h: 'center' } },
      { t: '반', w: 8, v: s => s.className, s: { h: 'center' } },
      { t: '이름', w: 9, v: s => s.name, s: { b: 1, h: 'center' } },
      { t: '성별', w: 5.5, v: s => s.gender || '', s: { h: 'center' } },
      { t: '생년월일', w: 11, v: s => ymd(s.birth), s: { h: 'center' } },
      { t: '만 나이', w: 6.5, v: s => s.birth ? s.age : '', s: { h: 'center', fmt: '0"세"' } },
      { t: '담임', w: 8, v: s => s.teacher, s: { h: 'center' } },
      { t: '연락처(학생)', w: 14, v: s => s.phone || '', s: { h: 'center' } },
      { t: '연락처(학부모)', w: 20, v: s => s.parentPhone || [s.guardian1, s.guardian2].filter(Boolean).join(' / '), s: { wrap: 1, indent: 1 } },
      { t: '학교', w: 13, v: s => s.school || '', s: { h: 'center' } },
      { t: '주소', w: 28, v: s => s.address || '', s: { wrap: 1, indent: 1 } },
      { t: '인도자', w: 8, v: s => s.leader || '', s: { h: 'center' } },
      { t: '세례일', w: 11, v: s => ymd(s.baptismDate), s: { h: 'center' } },
      { t: '등록일', w: 11, v: s => ymd(s.regDate), s: { h: 'center' } },
      { t: '동의일', w: 11, v: s => ymd(s.consentDate), s: (s) => ({ h: 'center', color: s.consentDate ? C.ink : C.red }) },
      { t: '상태', w: 6, v: s => s.status || '재적', s: (s) => ({ h: 'center', color: s.status === '졸업' ? C.sub : C.ink }) },
      { t: `${year} 출석률`, w: 8.5, v: s => attRate(s), s: { h: 'center', fmt: PCT, b: 1 } },
      { t: '달란트', w: 7, v: s => s.talent, s: { h: 'center', fmt: NUM } },
      { t: '암송', w: 7, v: s => d.verseTotal ? `${s.versesLearned}/${d.verseTotal}` : '', s: { h: 'center' } }
    ], studs, ACC.ros, { rowH: (s) => Math.max(22, Math.max(lines(s.address, 28), lines(s.parentPhone || [s.guardian1, s.guardian2].filter(Boolean).join(' / '), 20)) * 14 + 8), headH: 26 });
    ws.o.filter = XL.rng(t.r0, 1, t.dataEnd, 20);
    // 한 명씩 교적부
    if (o.cards) for (const s of studs) await card(wb, s, d, photos[s.id]);
    save(wb, `MOAON_Roster_${today()}.xlsx`);
  });

  /** 개인 교적부 — 사무엘 교회 학교 교적부 양식 그대로 (A4 가로 1장) */
  const JK = [
    { k: '영아부', c: 'FFFF00', stages: ['1세', '2세', '3세', '4세'], slot: '4세', label: '사진\n(4세)', c1: 1, c2: 1 },
    { k: '유치부', c: 'C2F1C8', stages: ['5세', '6세', '7세'], slot: '7세', label: '사진\n(7세)', c1: 2, c2: 3 },
    { k: '유년부', c: 'FBE3D6', stages: ['1학년', '2학년'], slot: '2학년', label: '사진\n(2학년)', c1: 4, c2: 5 },
    { k: '초등부', c: 'F2CFEE', stages: ['3학년', '4학년'], slot: '4학년', label: '사진\n(4학년)', c1: 6, c2: 6 },
    { k: '소년부', c: 'B4E5A2', stages: ['5학년', '6학년'], slot: '6학년', label: '사진\n(6학년)', c1: 7, c2: 11 }
  ];
  async function card(wb, s, d, photos) {
    photos = photos && typeof photos === 'object' ? photos : {};
    const ws = wb.sheet(`${s.grade || ''}${s.className ? s.className.replace(/반$/, '') : ''}_${s.name}`, { landscape: 1, onePage: 1, margins: [0.35, 0.35, 0.4, 0.4], tab: 'C1E5F5', footer: `${d.org} · 출력 ${ymd(d.today)}` });
    const W = [28.2, 15, 13.1, 11.4, 17.5, 31.9, 10.2, 2, 7, 7, 8]; ws.cols(W);
    const F = '맑은 고딕', BC = '000000';
    const box = (o) => Object.assign({ font: F, sz: 12, border: 'all', bc: BC, h: 'center', v: 'center' }, o || {});
    const L = (o) => box(Object.assign({ b: 1, sz: 13 }, o));             // 항목 이름 칸
    const V = (o) => box(Object.assign({ h: 'left', indent: 1, wrap: 1 }, o)); // 값 칸
    // 1. 제목
    ws.merge(1, 1, 1, 11, '사무엘 교회 학교 교적부', box({ b: 1, sz: 18, fill: 'C1E5F5', border: 'medium' })); ws.height(1, 30);
    // 2~3. 부서 + 사진
    JK.forEach(j => { ws.merge(2, j.c1, 2, j.c2, j.k, box({ sz: 13, fill: j.c })); ws.merge(3, j.c1, 3, j.c2, photos[j.slot] ? '' : j.label, box({ sz: 14, wrap: 1, color: '7F7F7F' })); });
    ws.height(2, 26); ws.height(3, 160);
    const px = (c1, c2) => W.slice(c1 - 1, c2).reduce((a, w) => a + Math.round(w * 7 + 5), 0);
    for (const j of JK) {
      const u = photos[j.slot] && await toJpeg(photos[j.slot]); if (!u) continue;
      const bw = px(j.c1, j.c2), bh = Math.round(160 * 96 / 72), [iw, ih] = await imgSize(u), k = Math.min((bw - 10) / iw, (bh - 10) / ih), w = Math.round(iw * k), h = Math.round(ih * k);
      ws.image(u, { r: 3, c: j.c1, dx: Math.round((bw - w) / 2), dy: Math.round((bh - h) / 2), w, h });
    }
    // 4~7. 기본 사항
    const row = (r, l1, v1, l2, v2, l3, v3) => { ws.set(r, 1, l1, L()); ws.merge(r, 2, r, 4, v1, V()); ws.set(r, 5, l2, L()); ws.set(r, 6, v2, V()); ws.set(r, 7, l3, L()); ws.merge(r, 8, r, 11, v3, V({ sz: 11 })); ws.height(r, 28); };
    row(4, '이             름', s.name, '성     별', s.gender || '', '등록일', ymd(s.regDate));
    row(5, '연락처(학   생)', s.phone || '', '생년월일', s.birth ? `${ymd(s.birth)} (만 ${s.age}세)` : '', '인도자', s.leader || '');
    row(6, '연락처(학부모)', s.parentPhone || [s.guardian1, s.guardian2].filter(Boolean).join(' / '), '학     교', s.school || '', '세례일', ymd(s.baptismDate));
    ws.set(7, 1, '주              소', L()); ws.merge(7, 2, 7, 11, s.address || '', V()); ws.height(7, 28);
    // 8~. 가족사항
    const fam = (s.family || []).slice(); while (fam.length < 5) fam.push({});
    const f0 = 8, fEnd = f0 + fam.length;
    ws.merge(f0, 1, fEnd, 1, '가\n족\n사\n항', L({ wrap: 1 }));
    ws.set(f0, 2, '이름', L()); ws.set(f0, 3, '관계', L()); ws.merge(f0, 4, f0, 5, '생년월일', L()); ws.set(f0, 6, '출석 유/무', L()); ws.set(f0, 7, '직분', L()); ws.merge(f0, 8, f0, 11, '비고', L()); ws.height(f0, 26);
    fam.forEach((f, i) => { const r = f0 + 1 + i; ws.set(r, 2, f.name || '', box()); ws.set(r, 3, f.rel || '', box()); ws.merge(r, 4, r, 5, ymd(f.birth || ''), box()); ws.set(r, 6, f.attend || '', box()); ws.set(r, 7, f.role || '', box({ sz: 11, wrap: 1 })); ws.merge(r, 8, r, 11, f.note || '', V({ sz: 11 })); ws.height(r, 26); });
    // 생활 기록부
    let r = fEnd + 1; ws.height(r, 10); r++;
    ws.merge(r, 1, r, 8, '생활 기록부', box({ sz: 12, fill: '83CBEB' })); ws.merge(r, 9, r + 1, 9, '개근', box({ sz: 11, fill: '5B9BD5', color: 'FFFFFF' })); ws.merge(r, 10, r + 1, 10, '정근', box({ sz: 11, fill: 'F8CBAD' })); ws.merge(r, 11, r + 1, 11, '구속사', box({ sz: 10, fill: 'F8CBAD' })); ws.height(r, 24); r++;
    ws.set(r, 1, '구분', L()); ws.set(r, 2, '연령', box({ sz: 13 })); ws.set(r, 3, '반', box({ sz: 13 })); ws.set(r, 4, '담임', box({ sz: 13 })); ws.merge(r, 5, r, 8, '전달 사항', box({ sz: 13 })); ws.height(r, 24); r++;
    const life = s.life || {}, cur = s.grade ? s.grade + '학년' : '';
    JK.slice(2).forEach(j => { // 생활 기록부: 유년부 ~ 소년부
      ws.merge(r, 1, r + j.stages.length - 1, 1, j.k, L({ fill: j.c }));
      j.stages.forEach((st, i) => {
        const x = life[st] || {}, isCur = st === cur && s.status !== '졸업';
        const cls = x.cls || (isCur ? s.className : ''), tch = x.teacher || (isCur ? s.teacher : '');
        ws.set(r + i, 2, st, box()); ws.set(r + i, 3, cls, box()); ws.set(r + i, 4, tch, box());
        ws.merge(r + i, 5, r + i, 8, x.note || '', V({ sz: 11 })); ws.height(r + i, Math.max(30, lines(x.note, 70) * 15 + 10));
        ['p', 'd', 'r'].forEach((k, n) => ws.set(r + i, 9 + n, x[k] ? '○' : '', box({ b: 1, sz: 13 })));
      });
      r += j.stages.length;
    });
  }

  window.XP = XPX;
})();
