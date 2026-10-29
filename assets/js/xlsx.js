/* 모아온 엑셀 작성기 — 외부 라이브러리 없이 .xlsx 파일을 만들어요.
 * 지원: 글꼴·채우기·테두리·정렬·숫자 형식, 셀 병합, 틀 고정, 자동 필터, 열 너비·행 높이,
 *       수식(결과값 포함), 인쇄 설정(A4·가로/세로·한 페이지 너비·반복 제목 행·쪽 번호), 사진 넣기
 * 사용: const wb = XL.book(); const ws = wb.sheet('이름', {...}); ws.set(1, 1, '값', { b: 1 }); wb.download('파일.xlsx');
 */
(function () {
  'use strict';
  const FONT = '맑은 고딕';
  const enc = new TextEncoder();
  const esc = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colL = (c) => { let s = ''; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
  const ref = (r, c) => colL(c) + r;
  const rng = (r1, c1, r2, c2) => ref(r1, c1) + ':' + ref(r2, c2);
  const hex = (h) => 'FF' + String(h || '000000').replace('#', '').toUpperCase().padStart(6, '0');

  /* ---------- 스타일 ---------- */
  // 스타일 객체: { b, i, u, sz, color, font, fill, h, v, wrap, indent, rot, fmt, border: 'all'|'thin'|{t,b,l,r}, bc(테두리색) }
  function Styles() {
    const fonts = [], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], borders = [], fmts = [], xfs = [], xfKey = new Map();
    const idx = (arr, x) => { let i = arr.indexOf(x); if (i < 0) { arr.push(x); i = arr.length - 1; } return i; };
    const fontXml = (s) => `<font>${s.b ? '<b/>' : ''}${s.i ? '<i/>' : ''}${s.u ? '<u/>' : ''}<sz val="${s.sz || 10}"/><color rgb="${hex(s.color || '3D3128')}"/><name val="${esc(s.font || FONT)}"/><family val="2"/><charset val="129"/></font>`;
    const fillXml = (f) => `<fill><patternFill patternType="solid"><fgColor rgb="${hex(f)}"/><bgColor indexed="64"/></patternFill></fill>`;
    const side = (tag, v, bc) => v ? `<${tag} style="${v === true ? 'thin' : v}"><color rgb="${hex(bc || 'D9CFC0')}"/></${tag}>` : `<${tag}/>`;
    const borderXml = (s) => {
      let b = s.border; if (!b) return '<border><left/><right/><top/><bottom/><diagonal/></border>';
      if (b === 'all' || b === 'thin') b = { t: 1, b: 1, l: 1, r: 1 };
      if (b === 'medium') b = { t: 'medium', b: 'medium', l: 'medium', r: 'medium' };
      const v = (x) => x === 1 ? 'thin' : x;
      return `<border>${side('left', v(b.l), s.bc)}${side('right', v(b.r), s.bc)}${side('top', v(b.t), s.bc)}${side('bottom', v(b.b), s.bc)}<diagonal/></border>`;
    };
    idx(fonts, fontXml({})); idx(borders, borderXml({}));
    xfs.push('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>');
    return {
      id(s) {
        if (!s) return 0;
        const k = JSON.stringify(s); if (xfKey.has(k)) return xfKey.get(k);
        const fo = idx(fonts, fontXml(s)), fi = s.fill ? idx(fills, fillXml(s.fill)) : 0, bo = idx(borders, borderXml(s));
        let nf = 0;
        if (s.fmt) { const builtin = { '0': 1, '0.00': 2, '#,##0': 3, '#,##0.00': 4, '0%': 9, '0.00%': 10, '@': 49 }; nf = builtin[s.fmt] != null ? builtin[s.fmt] : 164 + idx(fmts, s.fmt); }
        const al = (s.h || s.v || s.wrap || s.indent || s.rot) ? `<alignment${s.h ? ` horizontal="${s.h}"` : ''} vertical="${s.v || 'center'}"${s.wrap ? ' wrapText="1"' : ''}${s.indent ? ` indent="${s.indent}"` : ''}${s.rot ? ` textRotation="${s.rot}"` : ''}/>` : '<alignment vertical="center"/>';
        xfs.push(`<xf numFmtId="${nf}" fontId="${fo}" fillId="${fi}" borderId="${bo}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al}</xf>`);
        const id = xfs.length - 1; xfKey.set(k, id); return id;
      },
      xml() {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
          + (fmts.length ? `<numFmts count="${fmts.length}">${fmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`).join('')}</numFmts>` : '')
          + `<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders>`
          + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
          + `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
      }
    };
  }

  /* ---------- 시트 ---------- */
  function Sheet(book, name, o) {
    this.book = book; this.name = name; this.o = o || {};
    this.rows = new Map(); this.heights = {}; this.widths = {}; this.merges = []; this.images = []; this.maxR = 0; this.maxC = 0;
  }
  Sheet.prototype = {
    set(r, c, v, style) {
      if (!this.rows.has(r)) this.rows.set(r, new Map());
      this.rows.get(r).set(c, { v, s: style }); if (r > this.maxR) this.maxR = r; if (c > this.maxC) this.maxC = c; return this;
    },
    row(r, values, style, c0) { values.forEach((v, i) => { const st = typeof style === 'function' ? style(i, v) : Array.isArray(style) ? style[i] : style; this.set(r, (c0 || 1) + i, v, st); }); return this; },
    merge(r1, c1, r2, c2, v, style) {
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) this.set(r, c, r === r1 && c === c1 ? v : null, style);
      if (r2 > r1 || c2 > c1) this.merges.push(rng(r1, c1, r2, c2)); return this;
    },
    fill(r1, c1, r2, c2, style) { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) { const cur = this.rows.get(r) && this.rows.get(r).get(c); this.set(r, c, cur ? cur.v : null, style); } return this; },
    height(r, h) { this.heights[r] = h; return this; },
    width(c, w) { this.widths[c] = w; return this; },
    cols(ws) { ws.forEach((w, i) => { if (w) this.widths[i + 1] = w; }); return this; },
    image(dataUrl, at) { const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl || ''); if (m) this.images.push({ ext: m[1].toLowerCase() === 'png' ? 'png' : 'jpeg', b64: m[2], at }); return this; },
    xml(styles, sheetIndex) {
      const o = this.o, mr = Math.max(this.maxR, 1), mc = Math.max(this.maxC, 1);
      let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
      x += `<sheetPr>${o.tab ? `<tabColor rgb="${hex(o.tab)}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr>`;
      x += `<dimension ref="${rng(1, 1, mr, mc)}"/>`;
      const fr = o.freeze || {}, fy = fr.row || 0, fx = fr.col || 0;
      let pane = '';
      if (fy || fx) pane = `<pane${fx ? ` xSplit="${fx}"` : ''}${fy ? ` ySplit="${fy}"` : ''} topLeftCell="${ref(fy + 1, fx + 1)}" activePane="${fx && fy ? 'bottomRight' : fy ? 'bottomLeft' : 'topRight'}" state="frozen"/>`;
      x += `<sheetViews><sheetView workbookViewId="0"${o.grid ? '' : ' showGridLines="0"'}${sheetIndex === 0 ? ' tabSelected="1"' : ''}${o.zoom ? ` zoomScale="${o.zoom}"` : ''}>${pane}</sheetView></sheetViews>`;
      x += '<sheetFormatPr defaultRowHeight="18" customHeight="1"/>';
      const wk = Object.keys(this.widths).map(Number).sort((a, b) => a - b);
      if (wk.length) x += `<cols>${wk.map(c => `<col min="${c}" max="${c}" width="${this.widths[c]}" customWidth="1"/>`).join('')}</cols>`;
      x += '<sheetData>';
      const rk = new Set([...this.rows.keys(), ...Object.keys(this.heights).map(Number)]);
      [...rk].sort((a, b) => a - b).forEach(r => {
        const cells = this.rows.get(r), h = this.heights[r];
        x += `<row r="${r}"${h ? ` ht="${h}" customHeight="1"` : ''}>`;
        if (cells) [...cells.keys()].sort((a, b) => a - b).forEach(c => {
          const { v, s } = cells.get(c), si = styles.id(s), a = ref(r, c), sa = si ? ` s="${si}"` : '';
          if (v == null || v === '') x += `<c r="${a}"${sa}/>`;
          else if (typeof v === 'number' && isFinite(v)) x += `<c r="${a}"${sa}><v>${v}</v></c>`;
          else if (typeof v === 'object' && v.f) x += `<c r="${a}"${sa}${typeof v.v === 'string' ? ' t="str"' : ''}><f>${esc(v.f)}</f>${v.v != null ? `<v>${esc(v.v)}</v>` : ''}</c>`;
          else x += `<c r="${a}"${sa} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
        });
        x += '</row>';
      });
      x += '</sheetData>';
      if (o.filter) x += `<autoFilter ref="${o.filter}"/>`;
      if (this.merges.length) x += `<mergeCells count="${this.merges.length}">${this.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`;
      x += `<printOptions${o.center !== false ? ' horizontalCentered="1"' : ''}/>`;
      const mg = o.margins || [0.4, 0.4, 0.55, 0.55];
      x += `<pageMargins left="${mg[0]}" right="${mg[1]}" top="${mg[2]}" bottom="${mg[3]}" header="0.25" footer="0.25"/>`;
      x += `<pageSetup paperSize="9" orientation="${o.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="${o.onePage ? 1 : 0}"/>`;
      x += `<headerFooter><oddFooter>${esc('&L&8' + (o.footer || '모아온(MOA ON)') + '&R&8&P / &N')}</oddFooter></headerFooter>`;
      if (this.images.length) x += '<drawing r:id="rId1"/>';
      return x + '</worksheet>';
    },
    drawingXml(firstImg) {
      const px = 9525;
      let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
      this.images.forEach((im, i) => {
        const a = im.at;
        x += `<xdr:oneCellAnchor><xdr:from><xdr:col>${a.c - 1}</xdr:col><xdr:colOff>${Math.round((a.dx || 0) * px)}</xdr:colOff><xdr:row>${a.r - 1}</xdr:row><xdr:rowOff>${Math.round((a.dy || 0) * px)}</xdr:rowOff></xdr:from>`
          + `<xdr:ext cx="${Math.round(a.w * px)}" cy="${Math.round(a.h * px)}"/>`
          + `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 2}" name="사진 ${i + 1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>`
          + `<xdr:blipFill><a:blip r:embed="rId${i + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>`
          + `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(a.w * px)}" cy="${Math.round(a.h * px)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
      });
      return x + '</xdr:wsDr>';
    }
  };

  /* ---------- 통합 문서 ---------- */
  function Book() { this.sheets = []; this.names = new Set(); }
  Book.prototype = {
    sheet(name, o) {
      let n = String(name).replace(/[\\\/\?\*\[\]:]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'Sheet';
      let base = n, k = 2; while (this.names.has(n.toLowerCase())) { const suf = ` (${k++})`; n = base.slice(0, 31 - suf.length) + suf; }
      this.names.add(n.toLowerCase());
      const s = new Sheet(this, n, o); this.sheets.push(s); return s;
    },
    files() {
      const st = Styles(), files = [], media = [];
      const sheetsXml = this.sheets.map((s, i) => s.xml(st, i));
      let imgNo = 0, drawNo = 0;
      this.sheets.forEach((s, i) => {
        files.push([`xl/worksheets/sheet${i + 1}.xml`, sheetsXml[i]]);
        if (s.images.length) {
          drawNo++;
          files.push([`xl/worksheets/_rels/sheet${i + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawNo}.xml"/></Relationships>`]);
          files.push([`xl/drawings/drawing${drawNo}.xml`, s.drawingXml()]);
          const rels = s.images.map((im, j) => { imgNo++; const fn = `image${imgNo}.${im.ext}`; media.push([`xl/media/${fn}`, im.b64]); return `<Relationship Id="rId${j + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${fn}"/>`; });
          files.push([`xl/drawings/_rels/drawing${drawNo}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`]);
        }
      });
      const defNames = [];
      this.sheets.forEach((s, i) => {
        const q = `'${s.name.replace(/'/g, "''")}'`;
        if (s.o.filter) defNames.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${esc(q + '!' + s.o.filter.split(':').map(p => p.replace(/([A-Z]+)(\d+)/, '$$$1$$$2')).join(':'))}</definedName>`);
        if (s.o.printRows) defNames.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${esc(q + '!$' + s.o.printRows[0] + ':$' + s.o.printRows[1])}</definedName>`);
      });
      files.unshift(
        ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>'
          + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
          + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
          + this.sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
          + Array.from({ length: drawNo }, (_, i) => `<Override PartName="/xl/drawings/drawing${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join('') + '</Types>'],
        ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'],
        ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(this.title || '모아온')}</dc:title><dc:creator>모아온(MOA ON)</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`],
        ['docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MOAON</Application></Properties>'],
        ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${this.sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${defNames.length ? `<definedNames>${defNames.join('')}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
        ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${this.sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${this.sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
        ['xl/styles.xml', st.xml()]
      );
      return files.map(([n, s]) => [n, enc.encode(s)]).concat(media.map(([n, b64]) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return [n, u]; }));
    },
    blob() { return new Blob([zip(this.files())], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); },
    download(name) {
      const b = this.blob();
      if (window.MO && MO.download) return MO.download(name, b);
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }
  };

  /* ---------- ZIP (무압축) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u) => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(entries) {
    const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const parts = [], central = []; let off = 0;
    entries.forEach(([name, data]) => {
      const nb = enc.encode(name), crc = crc32(data), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, time, true); h.setUint16(12, date, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nb, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, time, true); c.setUint16(14, date, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nb);
      off += 30 + nb.length + data.length;
    });
    const csize = central.reduce((a, u) => a + u.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    const all = parts.concat(central, [new Uint8Array(e.buffer)]), total = all.reduce((a, u) => a + u.length, 0), out = new Uint8Array(total);
    let p = 0; all.forEach(u => { out.set(u, p); p += u.length; }); return out;
  }

  window.XL = { book: () => new Book(), ref, rng, colL };
})();
