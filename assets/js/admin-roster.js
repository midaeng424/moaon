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
  const RS = { DEPTS };
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
    const lifeRows = DEPTS.map(d => `<div class="lgrp" style="--c:${d.c};--b:${d.b}"><div class="lgh"><b>${d.k}</b><span>${d.range}</span></div>${d.stages.map(st => {
      const r = life[st] || {}, isCur = auto && auto.stage === st && s.status !== '졸업';
      const cls = r.cls || (isCur ? auto.cls : ''), tch = r.teacher || (isCur ? auto.teacher : '');
      const tg = (k, l) => `<label class="tgl"><input type="checkbox" data-l="${k}" ${r[k] ? 'checked' : ''}><span>${l}</span></label>`;
      return `<div class="lrow ${isCur ? 'cur' : ''}" data-st="${st}"><span class="lage">${st}${isCur ? '<em>지금</em>' : ''}</span><input class="inp" data-l="cls" value="${esc(cls)}" placeholder="반" maxlength="20"><input class="inp" data-l="teacher" value="${esc(tch)}" placeholder="담임" maxlength="20"><input class="inp" data-l="note" value="${esc(r.note || '')}" placeholder="전달 사항" maxlength="300"><div class="tgls">${tg('p', '개근')}${tg('d', '정근')}${tg('r', '구속사')}</div></div>`;
    }).join('')}</div>`).join('');
    return `<div class="sform">
      <div class="row2">${inp('name', '이름 *', 'text', '예: 이평강', 20)}${sel('classId', '반', A.st.boot.classes.map(c => [c.id, `${c.grade}학년 ${c.name}`]))}</div>
      <div class="row3">${sel('gender', '성별', [['', '선택'], ['남', '남'], ['여', '여']])}${inp('birth', '생년월일', 'date')}${sel('status', '상태', [['재적', '재적'], ['졸업', '졸업']])}</div>
      <div class="row3">${inp('phone', '연락처 (학생)', 'tel', '010-0000-0000', 20)}${inp('parentPhone', '연락처 (학부모)', 'tel', '010-0000-0000', 40)}${inp('school', '학교', 'text', '예: 사무엘초등학교', 30)}</div>
      ${inp('address', '주소', 'text', '', 160)}
      <div class="row3">${inp('regDate', '등록일', 'date')}${inp('leader', '인도자', 'text', '예: 김○○ 집사', 20)}${inp('baptismDate', '세례일', 'date')}</div>
      <div class="row2">${inp('consentDate', '보호자 개인정보 동의일', 'date')}${o.isNew ? inp('pin', '아이 앱 비밀번호 (숫자 4자리)', 'tel', '비워 두면 생일 월일(예: 0512)', 4) : '<div></div>'}</div>
      <div class="fld"><span>시기별 사진 <small class="note">(카메라 버튼으로 올려요 · 선택)</small></span>${RS.photos(s, { canPhoto: true })}</div>
      <div class="fld"><span>가족 사항</span>${(s.family || []).length ? '<div class="fhead"><span>이름</span><span>관계</span><span>생년월일</span><span>출석</span><span>직분</span><span>비고</span><span></span></div>' : ''}${(s.family || []).map(famRow).join('')}<button type="button" class="btn o sm" data-addfam="1" style="justify-self:start">${MO.icon('plus', 13)}가족 추가</button></div>
      <div class="fld"><span>생활 기록부 <small class="note">(연령별 반 · 담임 · 전달 사항, 개근 · 정근 · 구속사는 눌러서 표시)</small></span><div class="lifeform">${lifeRows}</div></div>
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
    const rows = DEPTS.flatMap(d => d.stages.filter(st => life[st]).map(st => ({ st, d, r: life[st] })));
    if (!rows.length) return '<p class="note" style="margin:0">아직 기록이 없어요. [수정]에서 연령별로 적어 주세요.</p>';
    return `<div class="tscroll"><table class="t lifet"><thead><tr><th>구분</th><th>연령</th><th>반</th><th>담임</th><th>전달 사항</th><th class="c">개근</th><th class="c">정근</th><th class="c">구속사</th></tr></thead><tbody>${rows.map(({ st, d, r }) => `<tr class="${r._cur ? 'cur' : ''}"><td><span class="dchip" style="--c:${d.c};--b:${d.b}">${d.k}</span></td><td><b>${st}</b>${r._cur ? ' <em class="now">지금</em>' : ''}</td><td>${esc(r.cls || '')}</td><td>${esc(r.teacher || '')}</td><td class="wrap">${esc(r.note || '')}</td>${['p', 'd', 'r'].map(k => `<td class="c">${r[k] ? '<span class="okc">✓</span>' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  };

  window.RS = RS;
})();
