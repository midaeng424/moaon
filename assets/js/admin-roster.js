/* 모아온 관리자 — 교적부 화면 조각 (모아온 스타일 · 칸 구성은 '사무엘 교회 학교 교적부'를 따라요) */
(function () {
  'use strict';
  const A = window.ADM, esc = MO.esc;
  const DEPTS = [
    { k: '영아부', c: '#e0b400', b: '#fff8d2', stages: ['1세', '2세', '3세', '4세'], slot: '4세', range: '1~4세' },
    { k: '유치부', c: '#4fae6e', b: '#e6f6ea', stages: ['5세', '6세', '7세'], slot: '7세', range: '5~7세' },
    { k: '유년부', c: '#e0855a', b: '#fdeee6', stages: ['1학년', '2학년'], slot: '2학년', range: '1~2학년' },
    { k: '초등부', c: '#c06bb6', b: '#f8eaf6', stages: ['3학년', '4학년'], slot: '4학년', range: '3~4학년' },
    { k: '소년부', c: '#5f9a45', b: '#eaf5e3', stages: ['5학년', '6학년'], slot: '6학년', range: '5~6학년' }
  ];
  const LIFE = DEPTS.slice(2); // 생활 기록부는 유년부 ~ 소년부(1~6학년)만
  const RS = { DEPTS, LIFE };
  const ymd = (d) => d ? d.replace(/-/g, '.') : '';
  RS.autoLife = (s) => { const c = A.cls(s.classId); if (!c) return null; const t = A.teacher(c.teacherId); return { stage: c.grade + '학년', cls: c.name, teacher: t ? t.name : '' }; };

  /* ---------- 시기별 사진 5칸 ---------- */
  RS.photos = (s, o = {}) => `<div class="pslots">${DEPTS.map(d => {
    const has = (s.photoSlots || []).includes(d.slot);
    return `<div class="pslot" style="--c:${d.c};--b:${d.b}"><div class="pbox ${has ? 'has' : ''}" data-slot="${d.slot}"><span class="pnone">${MO.icon('user', 24)}</span>${o.canPhoto ? `<label class="pup" title="${d.slot} 사진 올리기">${MO.icon('cam', 15)}<input type="file" accept="image/jpeg,image/png,image/webp" hidden data-up="${d.slot}"></label>` : ''}${o.canPhoto && has ? `<button type="button" class="prm" data-rmph="${d.slot}" aria-label="${d.slot} 사진 빼기">✕</button>` : ''}</div><b>${d.slot}</b><small>${d.k}</small></div>`;
  }).join('')}</div>`;
  RS.fillPhotos = (root, s, pending) => {
    root.querySelectorAll('.pbox[data-slot]').forEach(box => {
      const slot = box.dataset.slot, put = (url) => { if (!url || !box.isConnected) return; let im = box.querySelector('img'); if (!im) { im = document.createElement('img'); im.alt = slot + ' 사진'; box.prepend(im); } im.src = url; box.classList.add('has'); };
      if (pending && pending[slot]) return put(/^data:/.test(pending[slot]) ? pending[slot] : 'data:image/jpeg;base64,' + pending[slot]);
      if (pending && pending[slot] === '') return;
      if (s.id && (s.photoSlots || []).includes(slot)) MO.api('studentPhotoGet', { id: s.id, slot }, { loader: false }).then(put).catch(() => {});
    });
  };

  /* ---------- 등록 · 수정 폼 (예전 모아온 폼 모양 그대로, 칸만 양식대로) ---------- */
  RS.form = (s, o = {}) => {
    const inp = (k, label, type = 'text', ph = '', max = 40) => `<label class="fld"><span>${label}</span><input class="inp" data-k="${k}" type="${type}" value="${esc(s[k] || '')}" placeholder="${esc(ph)}" maxlength="${max}"></label>`;
    const sel = (k, label, opts) => `<label class="fld"><span>${label}</span><select class="inp" data-k="${k}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(s[k] || '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    const auto = RS.autoLife(s), life = s.life || {};
    const famRow = (f, i) => `<div class="frow" data-fi="${i}"><input class="inp" data-f="name" value="${esc(f.name || '')}" placeholder="이름" maxlength="20"><input class="inp" data-f="rel" value="${esc(f.rel || '')}" placeholder="관계" maxlength="10"><input class="inp" data-f="birth" type="date" value="${esc(/^\d{4}-\d{2}-\d{2}$/.test(f.birth || '') ? f.birth : '')}" title="생년월일"><select class="inp" data-f="attend" title="출석 유/무">${[['', '출석'], ['유', '출석 유'], ['무', '출석 무']].map(([v, l]) => `<option value="${v}" ${v === (f.attend || '') ? 'selected' : ''}>${l}</option>`).join('')}</select><input class="inp" data-f="role" value="${esc(f.role || '')}" placeholder="직분" maxlength="30"><input class="inp" data-f="note" value="${esc(f.note || '')}" placeholder="비고" maxlength="60"><button type="button" class="btn o" data-rmf="${i}" aria-label="빼기">✕</button></div>`;
    const lifeRows = LIFE.map(d => `<div class="lgrp" style="--c:${d.c};--b:${d.b}"><div class="lgh"><b>${d.k}</b><span>${d.range}</span></div>${d.stages.map(st => {
      const r = life[st] || {}, isCur = auto && auto.stage === st && s.status !== '졸업';
      const cls = r.cls || (isCur ? auto.cls : ''), tch = r.teacher || (isCur ? auto.teacher : '');
      const tg = (k, l) => `<label class="tgl"><input type="checkbox" data-l="${k}" ${r[k] ? 'checked' : ''}><span>${l}</span></label>`;
      return `<div class="lrow ${isCur ? 'cur' : ''}" data-st="${st}"><span class="lage">${st}${isCur ? '<em>지금</em>' : ''}</span><input class="inp" data-l="cls" value="${esc(cls)}" placeholder="반" maxlength="20"><input class="inp" data-l="teacher" value="${esc(tch)}" placeholder="담임" maxlength="20"><input class="inp" data-l="note" value="${esc(r.note || '')}" placeholder="전달 사항" maxlength="600"><div class="tgls">${tg('p', '개근')}${tg('d', '정근')}${tg('r', '구속사')}</div></div>`;
    }).join('')}</div>`).join('');
    return `<div class="sform">
      <div class="row2">${inp('name', '이름 *', 'text', '예: 이평강', 20)}${sel('classId', '반', A.st.boot.classes.map(c => [c.id, `${c.grade}학년 ${c.name}`]))}</div>
      <div class="row3">${sel('gender', '성별', [['', '선택'], ['남', '남'], ['여', '여']])}${inp('birth', '생년월일', 'date')}${sel('status', '상태', [['재적', '재적'], ['졸업', '졸업']])}</div>
      <div class="row3">${inp('phone', '연락처 (학생)', 'tel', '010-0000-0000', 20)}${inp('parentPhone', '연락처 (학부모)', 'tel', '010-0000-0000', 40)}${inp('school', '학교', 'text', '예: 사무엘초등학교', 30)}</div>
      ${inp('address', '주소', 'text', '', 160)}
      <div class="row3">${inp('regDate', '등록일', 'date')}${inp('leader', '인도자', 'text', '예: 김○○ 집사 010-0000-0000', 40)}${inp('baptismDate', '세례일', 'date')}</div>
      <div class="row2">${inp('consentDate', '보호자 개인정보 동의일', 'date')}${o.isNew ? inp('pin', '아이 앱 비밀번호 (숫자 4자리)', 'tel', '비워 두면 생일 월일(예: 0512)', 4) : '<div></div>'}</div>
      <div class="fld"><span>시기별 사진 <small class="note">(카메라 버튼으로 올려요 · 선택)</small></span>${RS.photos(s, { canPhoto: true })}</div>
      <div class="fld"><span>가족 사항</span>${(s.family || []).length ? '<div class="fhead"><span>이름</span><span>관계</span><span>생년월일</span><span>출석</span><span>직분</span><span>비고</span><span></span></div>' : ''}${(s.family || []).map(famRow).join('')}<button type="button" class="btn o sm" data-addfam="1" style="justify-self:start">${MO.icon('plus', 13)}가족 추가</button></div>
      <div class="fld"><span>생활 기록부 <small class="note">(유년부 ~ 소년부 · 학년별 반 · 담임 · 전달 사항, 개근 · 정근 · 구속사는 눌러서 표시)</small></span><div class="lifeform">${lifeRows}</div></div>
    </div>`;
  };
  RS.read = (root, s) => {
    root.querySelectorAll('.sform [data-k]').forEach(el => { s[el.dataset.k] = el.value.trim(); });
    s.family = [...root.querySelectorAll('.sform .frow')].map(r => { const o = {}; r.querySelectorAll('[data-f]').forEach(el => { o[el.dataset.f] = el.value.trim(); }); return o; });
    const life = {};
    root.querySelectorAll('.sform .lrow').forEach(r => { const o = {}; r.querySelectorAll('[data-l]').forEach(el => { o[el.dataset.l] = el.type === 'checkbox' ? el.checked : el.value.trim(); }); if (o.cls || o.teacher || o.note || o.p || o.d || o.r) life[r.dataset.st] = o; });
    s.life = life; return s;
  };

  /* ---------- 상세 보기 조각 ---------- */
  RS.infoRows = (s) => [['성별', s.gender || '-'], ['생년월일', s.birth ? `${ymd(s.birth)} (만 ${s.age}세)` : '-'], ['연락처 (학생)', s.phone || '-'], ['연락처 (학부모)', s.parentPhone || [s.guardian1, s.guardian2].filter(Boolean).join(' / ') || '-'], ['학교', s.school || '-'], ['주소', s.address || '-'], ['등록일', ymd(s.regDate) || '-'], ['인도자', s.leader || '-'], ['세례일', ymd(s.baptismDate) || '-']];
  RS.familyTable = (s) => `<div class="tscroll"><table class="t"><thead><tr><th>이름</th><th>관계</th><th>생년월일</th><th>출석</th><th>직분</th><th>비고</th></tr></thead><tbody>${(s.family || []).length ? s.family.map(f => `<tr><td><b>${esc(f.name)}</b></td><td>${esc(f.rel)}</td><td>${esc(ymd(f.birth))}</td><td>${f.attend ? `<span class="tag" style="${f.attend === '유' ? '--b:#edf5e1;--c:#5b8a2e' : ''}">${esc(f.attend)}</span>` : ''}</td><td>${esc(f.role)}</td><td class="wrap">${esc(f.note)}</td></tr>`).join('') : '<tr><td colspan="6" class="note">아직 없어요</td></tr>'}</tbody></table></div>`;
  RS.lifeList = (s) => {
    const auto = RS.autoLife(s), life = Object.assign({}, s.life || {});
    if (auto && s.status !== '졸업') { const r = life[auto.stage] || {}; life[auto.stage] = Object.assign({}, r, { cls: r.cls || auto.cls, teacher: r.teacher || auto.teacher, _cur: 1 }); }
    const rows = LIFE.flatMap(d => d.stages.filter(st => life[st]).map(st => ({ st, d, r: life[st] })));
    if (!rows.length) return '<p class="note" style="margin:0">아직 기록이 없어요. [수정]에서 연령별로 적어 주세요.</p>';
    return `<div class="tscroll"><table class="t lifet"><thead><tr><th>구분</th><th>연령</th><th>반</th><th>담임</th><th>전달 사항</th><th class="c">개근</th><th class="c">정근</th><th class="c">구속사</th></tr></thead><tbody>${rows.map(({ st, d, r }) => `<tr class="${r._cur ? 'cur' : ''}"><td><span class="dchip" style="--c:${d.c};--b:${d.b}">${d.k}</span></td><td><b>${st}</b>${r._cur ? ' <em class="now">지금</em>' : ''}</td><td>${esc(r.cls || '')}</td><td>${esc(r.teacher || '')}</td><td class="wrap">${esc(r.note || '')}</td>${['p', 'd', 'r'].map(k => `<td class="c">${r[k] ? '<span class="okc">✓</span>' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  };


  /* =========================================================
   * 엑셀로 한꺼번에 등록
   * ========================================================= */
  const COLS = {
    학생: ['이름', '반', '성별', '생년월일', '연락처(학생)', '연락처(학부모)', '학교', '주소', '등록일', '인도자', '세례일', '개인정보동의일', '특이사항', '전달사항'],
    가족: ['학생 이름', '학생 생년월일', '관계', '이름', '생년월일', '출석(유/무)', '직분', '비고'],
    생활기록부: ['학생 이름', '학생 생년월일', '학년', '반', '담임', '전달 사항', '개근', '정근', '구속사']
  };
  const pad = (n) => String(n).padStart(2, '0');
  /** 여러 날짜 모양을 2016-03-23 으로: 2016.3.23 · 2016/3/23 · 2016년 3월 23일 · 78.6.28 · 엑셀 날짜 숫자 */
  RS.parseDate = (v) => {
    if (v == null || v === '') return '';
    if (typeof v === 'number' && v > 59 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
    const m = String(v).trim().match(/^(\d{2,4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
    if (!m) return '';
    let y = Number(m[1]); if (m[1].length === 2) y += y > 40 ? 1900 : 2000;
    const mo = Number(m[2]), d = Number(m[3]); if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
    return `${y}-${pad(mo)}-${pad(d)}`;
  };
  const yes = (v) => v === true || /^(o|ㅇ|○|●|◎|0|v|y|1|✓|✔|예|네|yes|true|있음|개근|정근)$/i.test(String(v == null ? '' : v).trim());
  const attend = (v) => { v = String(v == null ? '' : v).trim(); return /^(유|출석|o|○|예|네|y)$/i.test(v) ? '유' : /^(무|불출석|미출석|x|×|아니오|n)$/i.test(v) ? '무' : ''; };
  const txt = (v) => v == null ? '' : String(v).trim();
  const findClass = (v) => {
    const t = txt(v).replace(/\s+/g, ''); if (!t) return '';
    const cs = A.st.boot.classes, m = t.match(/^(\d)학년(.+)$/);
    let c = m ? cs.find(c => String(c.grade) === m[1] && c.name.replace(/\s+/g, '') === m[2]) : null;
    if (!c) { const byName = cs.filter(c => c.name.replace(/\s+/g, '') === t || c.name.replace(/\s+/g, '') === t + '반'); if (byName.length === 1) c = byName[0]; }
    return c ? c.id : '';
  };
  RS.template = () => {
    const wb = XL.book(), H = { b: 1, color: 'FFFFFF', fill: '8E5432', h: 'center', border: 'all', bc: '8E5432', wrap: 1 }, EX = { color: '9A8B78', i: 1, border: 'all', bc: 'E5DCCF' };
    const w0 = wb.sheet('사용법', { tab: 'EEA21F', grid: 0 });
    const lines = [['모아온 교적부 한꺼번에 등록 양식', { b: 1, sz: 16 }], [''], ['1. [학생] 시트에 한 줄에 한 명씩 적어요. 이름만 있어도 등록돼요.'], ['2. [가족] · [생활기록부] 시트는 "학생 이름"(+ 생년월일)으로 학생과 연결돼요.'], ['3. 반은 "3학년 사랑반"처럼 적어요. 모아온 [반 관리]에 있는 반 이름과 같아야 해요. 비워 두면 나중에 반을 정할 수 있어요.'],
      ['4. 날짜는 2016-03-23, 2016.3.23, 2016년 3월 23일 모두 돼요.'], ['5. 개근·정근·구속사·출석은 ○ 또는 유/무로 적어요.'], ['6. 이름과 생년월일이 같은 학생이 이미 있으면 새로 만들지 않고 빈칸이 아닌 내용만 고쳐요.'], ['7. "예시)"로 시작하는 줄은 등록되지 않아요. 지우지 않아도 괜찮아요.'], [''], ['다 적은 뒤 관리자 페이지 [교적부 → 엑셀로 한꺼번에 등록]에서 이 파일을 올려 주세요.', { b: 1, color: '8E5432' }]];
    lines.forEach(([t, st], i) => w0.set(i + 1, 1, t, st || {})); w0.cols([110]);
    const ex = { 학생: ['예시) 이평강', '3학년 사랑반', '남', '2017-05-12', '010-1234-5678', '010-9876-5432 (모)', '사무엘초등학교', '서울시 ○○구 ○○로 12', '2024-03-03', '김○○ 집사', '', '2026-10-25', '땅콩 알레르기', ''],
      가족: ['예시) 이평강', '2017-05-12', '부', '이○○', '1984-02-11', '유', '집사', '찬양대'], 생활기록부: ['예시) 이평강', '2017-05-12', '2', '소망반', '한○○', '여름성경학교 참가', '○', '', '○'] };
    const W = { 학생: [12, 14, 6, 12, 15, 20, 15, 30, 12, 13, 12, 13, 22, 22], 가족: [12, 13, 8, 10, 12, 10, 12, 18], 생활기록부: [12, 13, 7, 10, 10, 34, 7, 7, 7] };
    Object.keys(COLS).forEach(k => { const ws = wb.sheet(k, { freeze: { row: 1 }, tab: '8E5432' }); ws.row(1, COLS[k], H); ws.height(1, 26); ws.row(2, ex[k], EX); ws.cols(W[k]); });
    wb.download('MOAON_Roster_Import.xlsx');
  };
  /** 올린 엑셀 → 학생 목록 */
  RS.parse = (sheets) => {
    const pick = (name) => sheets.find(s => s.name.replace(/\s/g, '') === name) || null;
    const table = (sh, need) => {
      if (!sh) return [];
      const hi = sh.rows.findIndex(r => r && r.some(v => txt(v).replace(/\s/g, '') === need)); if (hi < 0) return [];
      const head = sh.rows[hi].map(v => txt(v).replace(/\s/g, ''));
      return sh.rows.slice(hi + 1).filter(r => r && r.some(v => txt(v))).map(r => { const o = {}; head.forEach((h, i) => { if (h) o[h] = r[i]; }); return o; });
    };
    const ss = pick('학생'); if (!ss) throw new Error('[학생] 시트를 찾지 못했어요. 모아온에서 받은 양식에 적어 주세요.');
    const studs = table(ss, '이름').filter(r => txt(r['이름']) && !/^예시/.test(txt(r['이름'])));
    const key = (n, b) => txt(n) + '|' + (RS.parseDate(b) || '');
    const list = studs.map(r => {
      const notes = [];
      if (txt(r['특이사항'])) notes.push({ type: '특이사항', text: txt(r['특이사항']) });
      if (txt(r['전달사항'])) notes.push({ type: '요청', text: txt(r['전달사항']) });
      const clsTxt = txt(r['반']);
      return { name: txt(r['이름']).slice(0, 20), classText: clsTxt, classId: findClass(clsTxt), gender: /^남/.test(txt(r['성별'])) ? '남' : /^여/.test(txt(r['성별'])) ? '여' : '',
        birth: RS.parseDate(r['생년월일']), phone: MO.fmtPhone(txt(r['연락처(학생)'])), parentPhone: MO.fmtPhone(txt(r['연락처(학부모)'])), school: txt(r['학교']), address: txt(r['주소']),
        regDate: RS.parseDate(r['등록일']), leader: txt(r['인도자']), baptismDate: RS.parseDate(r['세례일']), consentDate: RS.parseDate(r['개인정보동의일']), notes, family: [], life: {} };
    });
    const find = (n, b) => { const k = key(n, b); return list.find(s => key(s.name, s.birth) === k) || list.find(s => s.name === txt(n)); };
    const warn = [];
    table(pick('가족'), '학생이름').forEach(r => {
      if (/^예시/.test(txt(r['학생이름']))) return;
      const s = find(r['학생이름'], r['학생생년월일']); if (!s) { if (txt(r['학생이름'])) warn.push(`[가족] ${txt(r['학생이름'])}: 학생 시트에 없는 이름이라 건너뛰어요`); return; }
      s.family.push({ rel: txt(r['관계']), name: txt(r['이름']), birth: RS.parseDate(r['생년월일']) || txt(r['생년월일']), attend: attend(r['출석(유/무)'] ?? r['출석']), role: txt(r['직분']), note: txt(r['비고']) });
    });
    table(pick('생활기록부'), '학생이름').forEach(r => {
      if (/^예시/.test(txt(r['학생이름']))) return;
      const s = find(r['학생이름'], r['학생생년월일']); if (!s) { if (txt(r['학생이름'])) warn.push(`[생활기록부] ${txt(r['학생이름'])}: 학생 시트에 없는 이름이라 건너뛰어요`); return; }
      const g = txt(r['학년']).replace(/[^0-9]/g, ''); if (!/^[1-6]$/.test(g)) { warn.push(`[생활기록부] ${s.name}: 학년(1~6)을 알 수 없어 건너뛰어요`); return; }
      s.life[g + '학년'] = { cls: txt(r['반']), teacher: txt(r['담임']), note: txt(r['전달사항']), p: yes(r['개근']), d: yes(r['정근']), r: yes(r['구속사']) };
    });
    return { list, warn };
  };
  RS.importOpen = (onDone) => {
    const body = document.createElement('div'); body.style.cssText = 'display:grid;gap:14px';
    let parsed = null, done = false;
    const step1 = () => {
      body.innerHTML = `<div class="imp-steps"><div class="imp-step"><b>1</b><div><strong>빈 양식 내려받기</strong><span>학생 · 가족 · 생활기록부 시트가 들어 있어요</span></div><button type="button" class="btn o" data-tpl>${MO.icon('down', 15)}양식 받기</button></div>
        <div class="imp-step"><b>2</b><div><strong>양식에 적어서 올리기</strong><span>엑셀(.xlsx) 파일을 끌어다 놓거나 골라요</span></div><label class="btn" style="cursor:pointer">${MO.icon('clip', 15)}파일 고르기<input type="file" accept=".xlsx" hidden data-file></label></div></div>
        <div class="imp-drop" data-drop>${MO.icon('cloud', 30)}<b>채운 엑셀 파일을 여기에 놓아도 돼요</b><span>이름 + 생년월일이 같은 학생은 새로 만들지 않고 내용을 보태요</span></div>`;
      body.querySelector('[data-tpl]').onclick = RS.template;
      const go = async (f) => { if (!f) return; try { MO.loader(true); parsed = RS.parse(await XL.read(f)); MO.loader(false); if (!parsed.list.length) return MO.toast('[학생] 시트에 적힌 학생이 없어요', 'err'); step2(f.name); } catch (e) { MO.loader(false); MO.err(e); } };
      body.querySelector('[data-file]').onchange = (e) => go(e.target.files[0]);
      const dz = body.querySelector('[data-drop]');
      dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over');
      dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); go(e.dataTransfer.files[0]); };
      m.foot.innerHTML = '<button class="btn o" data-v="0">닫기</button>';
    };
    const exists = (s) => A.st.boot.students.some(x => x.name === s.name && (!s.birth || x.birth === s.birth));
    const step2 = (fname) => {
      const L = parsed.list, noCls = L.filter(s => !s.classId).length;
      body.innerHTML = `<div class="imp-sum"><b>${esc(fname)}</b><span>${L.length}명 · 새로 등록 ${L.filter(s => !exists(s)).length}명 · 기존 학생 보태기 ${L.filter(exists).length}명</span></div>
        ${noCls ? `<div class="imp-warn">${MO.icon('eye', 15)} 반을 찾지 못한 학생 ${noCls}명은 '반 없음'으로 들어가요. 나중에 [반 관리 → 학생 반 옮기기]에서 정할 수 있어요.</div>` : ''}
        ${parsed.warn.length ? `<div class="imp-warn">${parsed.warn.slice(0, 6).map(esc).join('<br>')}${parsed.warn.length > 6 ? `<br>외 ${parsed.warn.length - 6}건` : ''}</div>` : ''}
        <div class="tscroll" style="max-height:52vh"><table class="t"><thead><tr><th>이름</th><th>반</th><th>생년월일</th><th>연락처(학부모)</th><th class="c">가족</th><th class="c">생활기록</th><th class="c">메모</th><th>상태</th></tr></thead><tbody>
        ${L.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${s.classId ? esc(A.clsLabel(s.classId)) : `<span class="tag" style="--b:#fde8e1;--c:#cf5c45">${s.classText ? esc(s.classText) + ' ?' : '반 없음'}</span>`}</td><td>${esc(s.birth.replace(/-/g, '.'))}</td><td>${esc(s.parentPhone)}</td><td class="c">${s.family.length || ''}</td><td class="c">${Object.keys(s.life).length || ''}</td><td class="c">${s.notes.length || ''}</td><td>${exists(s) ? '<span class="tag" style="--b:#e6f0fa;--c:#3d7cb8">보태기</span>' : '<span class="tag" style="--b:#edf5e1;--c:#5b8a2e">새로 등록</span>'}</td></tr>`).join('')}</tbody></table></div>`;
      m.foot.innerHTML = `<button class="btn o" data-v="back">다른 파일</button><button class="btn" data-v="go">${L.length}명 등록하기</button>`;
    };
    const step3 = (res) => {
      done = true;
      const news = res.items.filter(x => x.created);
      body.innerHTML = `<div class="imp-done">${MO.icon('check', 28, 'stroke-width="3"')}<b>등록했어요</b><span>새로 ${res.created}명 · 보탠 학생 ${res.updated}명</span></div>
        ${news.length ? `<div class="fld"><span>새로 등록한 아이들의 아이 앱 첫 비밀번호 (생일 월일)</span><div class="tscroll" style="max-height:40vh"><table class="t"><thead><tr><th>이름</th><th>반</th><th>첫 비밀번호</th></tr></thead><tbody>${news.map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${x.classId ? esc(A.clsLabel(x.classId)) : '<span class="note">반 없음</span>'}</td><td><b style="color:var(--mane)">${esc(x.pin)}</b></td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
      m.foot.innerHTML = '<button class="btn" data-v="0">확인</button>';
    };
    const m = MO.modal({ title: '엑셀로 한꺼번에 등록', wide: true, body, foot: '<button class="btn o" data-v="0">닫기</button>', onClose: () => { if (done && onDone) onDone(); } });
    m.foot.onclick = async (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      if (b.dataset.v === '0') { m.close(); return; }
      if (b.dataset.v === 'back') return step1();
      if (b.dataset.v === 'go') {
        const L = parsed.list, all = { created: 0, updated: 0, items: [] };
        MO.loader(true);
        try {
          for (let i = 0; i < L.length; i += 25) { const r = await MO.api('studentsImport', { students: L.slice(i, i + 25) }, { loader: false }); all.created += r.created; all.updated += r.updated; all.items.push(...r.items); }
          step3(all);
        } catch (er) { MO.err(er); } finally { MO.loader(false); }
      }
    };
    step1();
  };

  window.RS = RS;
})();
