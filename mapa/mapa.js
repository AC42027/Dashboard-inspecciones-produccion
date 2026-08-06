/* ==========================================================================
   MAPA DE PLANTA — Layout ASRS (Goodyear) · vista 34
   Render estático + buscador de equipos (ej. P4440) + zoom/pan + pisos
   ========================================================================== */
(function () {
    'use strict';

    var data = null;
    var items = [];          // { el, it }
    var searchIndex = [];    // { code, var, el, it }
    var minX = 0, minY = 0, baseW = 0, baseH = 0;
    var padY = 34;
    var zoom = 1, zoomFit = 1;
    var floorSel = 'all';
    var built = false;
    var loading = false;
    var hlTimer = null;
    var labelTimer = null;
    var showAux = false;
    var skip = { table: true, crane: true, button: true, input: true, range: true, 'crane-range': true, 'control-cabinet': true, 'crane-line': true, 'press-robot': true, 'unload-robot': true };
    var labelSkip = {
        'Crane OK': true, 'AGTW Error': true, 'AGTW Timeout': true,
        'AGTW Waiting': true, 'PLC Alert': true, 'PLC Error': true,
        'PLC Disconnected': true,
        'Rack Capacity': true, 'Alert': true,
        'Press OK': true, 'Press Disabled': true, 'Out of Stock': true,
        'BCID Start': true, 'Tire Done': true, 'Press Pick': true,
        'Press Pick Dome': true, 'Press Waiting Permission': true,
        'Permission': true, 'Waiting Press OK': true,
        'PLC Conveyor 1': true, 'PLC Conveyor 2': true, 'PLC Conveyor 3': true,
        'Order Assigned': true, 'Layout': true, 'P1550': true,
        'P3970A': true, 'P4100': true, 'P4510': true,
        'Input': true, 'Output': true, 'Input Balance': true,
        'Last Logs': true,
        '1st Floor': true, '2nd Floor': true, '3rd Floor': true,
        'Classifier Full': true
    };

    function skipItem(it) {
        if (skip[it.type]) return true;
        if (!showAux && (it.type === 'rack-column' || it.type === 'tire-press')) return true;
        if (it.floor === '1' && !/^p/i.test(it.code || '')) return true;
        if (labelSkip[it.title] || labelSkip[it.text]) return true;
        if (it.type === 'meter' && (/^S0\d\d$/i.test(it.code || '') || /^S0\d\d$/i.test(it.title || '') || /^(400|500|600)(a|b)$/i.test(it.title || '') || /^MCARTBUF$/i.test(it.code || ''))) return true;
        return false;
    }

    function byId(id) { return document.getElementById(id); }

    function floorVars(floor) {
        if (floor === '2') return { bg: '#c9f0d6', bd: '#6fce8b' };
        if (floor === '3') return { bg: '#d5e5fc', bd: '#8db8ef' };
        return { bg: '#dbe4ee', bd: '#aebccf' };
    }

    function paint(d, it, visualClass) {
        var rotated = it.rotate && it.rotate % 360 !== 0 &&
            (it.type === 'belt-transfer' || it.type === 'roller-conveyor');
        var host = d;
        if (rotated) {
            host = document.createElement('div');
            host.className = 'm-rot ' + visualClass;
            host.style.transform = 'rotate(' + it.rotate + 'deg)';
            d.appendChild(host);
        } else {
            d.classList.add(visualClass);
        }
        return host;
    }

    function isEquipmentType(t) {
        return t.indexOf('conveyor') >= 0 || t.indexOf('sorter') >= 0 ||
            t === 'belt-transfer' || t === 'roller-conveyor' ||
            t === 'rack-column' || t === 'tire-press' || t === 'crane-line' ||
            t === 'led-status' || t === 'meter' || t === 'rfid' ||
            t === 'bcid' || t === 'bcid-status';
    }

    function hasCode(it) {
        return !!it.code && it.code.indexOf('layout-') !== 0;
    }

    function buildElement(it) {
        var d = document.createElement('div');
        d.className = 'm-el m-equip';
        if (it.floor) d.setAttribute('data-floor', it.floor);
        var type = it.type || '';
        var host = d;
        var inner = '';

        if (type === 'arrow' || type === 'belt-conveyor-curve' || type === 'itr2-conveyor-curve' ||
            (it.image && isEquipmentType(type))) {
            d.classList.remove('m-equip');
            d.classList.add('m-image-el');
            var img = document.createElement('img');
            img.src = 'mapa/images/' + it.image + '.png';
            img.alt = '';
            img.draggable = false;
            d.appendChild(img);
        } else if (type === 'text') {
            d.classList.remove('m-equip');
            d.classList.add('m-text');
            d.textContent = it.text || it.title || '';
            if (it.fontSize) d.style.fontSize = it.fontSize + 'px';
            if (it.textColor) d.style.color = it.textColor;
        } else if (type === 'info') {
            d.classList.remove('m-equip');
            d.classList.add('m-info');
            var sw = document.createElement('div');
            sw.className = 'm-swatch';
            sw.style.backgroundColor = it.color || '#ccc';
            var tag = document.createElement('span');
            tag.className = 'm-tag';
            tag.textContent = it.title || '';
            d.appendChild(sw);
            d.appendChild(tag);
        } else if (type === 'belt-transfer') {
            host = paint(d, it, 'm-transfer');
        } else if (type === 'roller-conveyor') {
            host = paint(d, it, 'm-roller');
        } else if (type === 'belt-conveyor' || type === 'itr2-conveyor') {
            host = paint(d, it, 'm-conveyor');
        } else if (type === 'narrow-belt-sorter' || type === 'narrow-belt-sorter-pos') {
            host = paint(d, it, 'm-sorter');
        } else if (type === 'rack-column') {
            host = paint(d, it, 'm-rack');
        } else if (type === 'tire-press') {
            host = paint(d, it, 'm-press');
            var tire = document.createElement('div');
            tire.className = 'm-tire';
            host.appendChild(tire);
            if (hasCode(it)) {
                var ptag = document.createElement('span');
                ptag.className = 'm-tag';
                ptag.textContent = it.code;
                host.appendChild(ptag);
            }
        } else if (type === 'crane-line') {
            host = paint(d, it, 'm-crane-line');
            var ctag = document.createElement('span');
            ctag.className = 'm-tag';
            ctag.textContent = it.title || it.code || '';
            host.appendChild(ctag);
        } else if (type === 'led-status') {
            host = paint(d, it, 'm-led');
        } else if (type === 'meter') {
            host = paint(d, it, 'm-meter');
        } else if (type === 'rfid') {
            host = paint(d, it, 'm-rfid');
        } else if (type === 'bcid') {
            host = paint(d, it, 'm-bcid');
        } else {
            host = paint(d, it, 'm-misc');
            if (it.title || it.text) {
                var mtag = document.createElement('span');
                mtag.className = 'm-tag';
                mtag.textContent = it.title || it.text;
                host.appendChild(mtag);
            }
        }

        d.style.left = (it.x - minX) + 'px';
        d.style.top = (it.y - minY) + padY + 'px';
        d.style.width = it.w + 'px';
        d.style.height = it.h + 'px';

        d.setAttribute('data-code', it.code || '');
        d.setAttribute('data-name', it.name || '');
        d.setAttribute('data-type', type);
        d.setAttribute('data-var', it.variable || '');
        d.title = it.code || it.text || it.title || it.name || '';

        if (hasCode(it) || it.variable) {
            d.classList.add('hoverable');
            d.addEventListener('click', function (e) {
                e.stopPropagation();
                highlight(d, it, false);
            });
        }

        return d;
    }

    function computeBounds(list) {
        if (!list || !list.length) {
            minX = 0; minY = 0; baseW = 1; baseH = 1;
            return;
        }
        minX = Infinity;
        minY = Infinity;
        var maxX = -Infinity, maxY = -Infinity;
        list.forEach(function (it) {
            minX = Math.min(minX, it.x);
            minY = Math.min(minY, it.y);
            maxX = Math.max(maxX, it.x + it.w);
            maxY = Math.max(maxY, it.y + it.h);
        });
        baseW = maxX - minX;
        baseH = (maxY - minY) + padY;
    }

    function build() {
        var stage = byId('mapaStage');
        stage.innerHTML = '';
        stage.style.width = baseW + 'px';
        stage.style.height = baseH + 'px';
        items = [];
        data.forEach(function (it) {
            if (skipItem(it)) return;
            var d = buildElement(it);
            stage.appendChild(d);
            items.push({ el: d, it: it });
        });
    }

    function buildSearchIndex() {
        searchIndex = [];
        items.forEach(function (ix) {
            if (!ix.it.variable && !hasCode(ix.it)) return;
            searchIndex.push({ code: (ix.it.code || '').toUpperCase(), vari: (ix.it.variable || '').toUpperCase(), el: ix.el, it: ix.it });
        });
    }

    function buildDatalist() {
        var dl = byId('mapaCodes');
        if (!dl) return;
        var seen = {};
        var frag = document.createDocumentFragment();
        searchIndex.forEach(function (s) {
            if (!s.code || seen[s.code]) return;
            seen[s.code] = true;
            var opt = document.createElement('option');
            opt.value = s.code;
            frag.appendChild(opt);
        });
        dl.innerHTML = '';
        dl.appendChild(frag);
    }

    function findExact(q) {
        q = String(q || '').trim().toUpperCase();
        if (!q) return null;
        var hit = null;
        searchIndex.forEach(function (s) {
            if (s.code === q || s.vari === q) hit = s;
        });
        return hit;
    }

    function findItem(q) {
        q = (q || '').trim().toUpperCase();
        if (!q) return null;
        var best = null;
        searchIndex.forEach(function (s) {
            if (best) return;
            if (s.code === q) best = s;
        });
        if (!best) {
            searchIndex.forEach(function (s) {
                if (best) return;
                if (s.vari === q) best = s;
            });
        }
        if (!best) {
            searchIndex.forEach(function (s) {
                if (s.code.indexOf(q) === 0) { best = s; return; }
            });
            if (!best) {
                searchIndex.forEach(function (s) {
                    if (s.vari.indexOf(q) === 0) { best = s; return; }
                });
            }
        }
        return best;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function showMsg(text, kind) {
        var m = byId('mapaMsg');
        if (!m) return;
        m.className = 'mapa-msg ' + kind;
        m.innerHTML = (kind === 'ok'
            ? '<i class="fas fa-check-circle"></i>'
            : '<i class="fas fa-circle-exclamation"></i>') + '<span>' + text + '</span>';
        clearTimeout(m._t);
        m._t = setTimeout(function () { m.className = 'mapa-msg'; }, 6000);
    }

    function clearHighlight() {
        if (hlTimer) clearTimeout(hlTimer);
        if (labelTimer) clearTimeout(labelTimer);
        var prev = byId('mapaFloatLabel');
        if (prev) prev.remove();
        items.forEach(function (ix) {
            ix.el.classList.remove('hl');
            var r = ix.el.querySelector('.m-rot');
            if (r) r.classList.remove('hl');
        });
    }

    function highlight(el, it, pulse) {
        clearHighlight();
        el.classList.add('hl');
        var rot = el.querySelector('.m-rot');
        if (rot) rot.classList.add('hl');
        var label = document.createElement('div');
        label.id = 'mapaFloatLabel';
        label.className = 'mapa-float-label';
        label.textContent = it.code || el.title;
        var cx = (it.x - minX + it.w / 2) * zoom;
        var cy = (it.y - minY + padY) * zoom;
        label.style.left = cx + 'px';
        label.style.top = Math.max(cy, 14) + 'px';
        byId('mapaCanvas').appendChild(label);
        var dur = pulse === false ? 0 : 4200;
        if (dur > 0) {
            hlTimer = setTimeout(function () {
                el.classList.remove('hl');
                var rr = el.querySelector('.m-rot');
                if (rr) rr.classList.remove('hl');
            }, dur + 1200);
            labelTimer = setTimeout(function () { if (label.parentNode) label.parentNode.removeChild(label); }, dur);
        }
    }

    function showPop(el, it) {
        closePop();
        var pop = document.createElement('div');
        pop.className = 'mapa-pop';
        var rows = '';
        function row(k, v) { return v ? '<div class="mp-row"><span class="mp-k">' + k + '</span><span class="mp-v">' + v + '</span></div>' : ''; }
        pop.innerHTML =
            '<div class="mp-title"><i class="fas fa-location-crosshairs"></i>' + (it.code || it.name) + '</div>' +
            row('Tipo', it.type) +
            row('Variable', it.variable) +
            row('Piso', it.floor ? 'Piso ' + it.floor : '—') +
            row('Posición', 'X ' + it.x + ' · Y ' + it.y);
        var cx = (it.x - minX + it.w / 2) * zoom;
        var cy = (it.y - minY) * zoom;
        pop.style.left = Math.min(Math.max(cx + 14, 8), byId('mapaCanvas').clientWidth - 210) + 'px';
        pop.style.top = Math.max(cy - 60, 8) + 'px';
        pop.id = 'mapaPop';
        byId('mapaCanvas').appendChild(pop);
    }

    function closePop() {
        var p = byId('mapaPop');
        if (p) p.remove();
    }

    function setFloor(f) {
        floorSel = f;
        applyFloor();
        var seg = byId('mapaFloor');
        if (seg) {
            var btns = seg.querySelectorAll('button');
            btns.forEach(function (b) {
                b.classList.toggle('active', b.getAttribute('data-floor') === f);
            });
        }
    }

    function applyFloor() {
        items.forEach(function (ix) {
            var vis = floorSel === 'all' || !ix.it.floor || ix.it.floor === floorSel;
            ix.el.style.display = vis ? '' : 'none';
        });
    }

    function applyZoom() {
        var stage = byId('mapaStage');
        stage.style.zoom = zoom;
        var lbl = byId('mapaZoomLabel');
        if (lbl) lbl.textContent = Math.round(zoom * 100) + '%';
    }

    function fit() {
        var canvas = byId('mapaCanvas');
        if (!canvas || canvas.clientWidth === 0) return;
        var pad = 28;
        var z = Math.min((canvas.clientWidth - pad) / baseW, (canvas.clientHeight - pad) / baseH);
        zoom = Math.min(Math.max(z, 0.02), 1);
        zoomFit = zoom;
        applyZoom();
        canvas.scrollLeft = 0;
        canvas.scrollTop = 0;
        closePop();
    }

    function mapaZoom(dir) {
        var canvas = byId('mapaCanvas');
        var cx = (canvas.scrollLeft + canvas.clientWidth / 2) / zoom;
        var cy = (canvas.scrollTop + canvas.clientHeight / 2) / zoom;
        zoom = Math.min(Math.max(zoom * (dir > 0 ? 1.28 : 1 / 1.28), 0.02), 4);
        zoomFit = -1;
        applyZoom();
        canvas.scrollLeft = cx * zoom - canvas.clientWidth / 2;
        canvas.scrollTop = cy * zoom - canvas.clientHeight / 2;
        closePop();
    }

    function findAux(q) {
        q = String(q || '').trim().toUpperCase();
        if (!q) return null;
        var hit = null;
        data.some(function (it) {
            if (!it.code || (it.type !== 'rack-column' && it.type !== 'tire-press')) return false;
            var c = it.code.toUpperCase();
            if (c === q || c.indexOf(q) === 0) { hit = it; return true; }
            return false;
        });
        return hit;
    }

    function refreshAuxBtn() {
        var btn = byId('mapaAuxBtn');
        if (!btn) return;
        var ic = btn.querySelector('i');
        var lbl = btn.querySelector('span');
        if (showAux) {
            if (ic) ic.className = 'fas fa-eye';
            if (lbl) lbl.textContent = 'Racks/Prensas ON';
        } else {
            if (ic) ic.className = 'fas fa-eye-slash';
            if (lbl) lbl.textContent = 'Racks/Prensas';
        }
    }

    function rebuildForAux() {
        computeBounds(data.filter(skipItem));
        build();
        buildSearchIndex();
        buildDatalist();
        applyFloor();
        refreshAuxBtn();
        var stats = byId('mapaStats');
        if (stats) stats.textContent = searchIndex.length + ' equipos localizables';
    }

    function mapaToggleAux() {
        showAux = !showAux;
        clearHighlight();
        closePop();
        rebuildForAux();
    }

    function buscarEnMapa(q) {
        var input = byId('mapaSearch');
        q = (q !== undefined && q !== null) ? q : (input ? input.value : '');
        q = String(q).trim();
        if (!q) return;
        var found = findItem(q);
        if (!found) {
            var aux = findAux(q);
            if (aux && !showAux) {
                showAux = true;
                rebuildForAux();
                found = findItem(q);
            }
        }
        if (!found) {
            showMsg('No se encontró "' + esc(q) + '". Prueba con el código del equipo (ej. P4440).', 'err');
            return;
        }
        if (found.it.floor && floorSel !== 'all' && floorSel !== found.it.floor) {
            setFloor(found.it.floor);
        }
        applyFloor();
        if (input) input.value = found.it.code || q;
        var canvas = byId('mapaCanvas');
        var cx = (found.it.x - minX + found.it.w / 2) * zoom;
        var cy = (found.it.y - minY + padY + found.it.h / 2) * zoom;
        canvas.scrollTo({
            left: Math.max(cx - canvas.clientWidth / 2, 0),
            top: Math.max(cy - canvas.clientHeight / 2, 0),
            behavior: 'smooth'
        });
        highlight(found.el, found.it, true);
        showMsg('Encontrado: <b>' + esc(found.it.code || q) + '</b> · Piso ' + esc(found.it.floor || '—'), 'ok');
    }

    function limpiarBusquedaMapa() {
        var input = byId('mapaSearch');
        if (input) { input.value = ''; input.focus(); }
        clearHighlight();
        closePop();
        var m = byId('mapaMsg');
        if (m) m.className = 'mapa-msg';
    }

    function bindEvents() {
        var input = byId('mapaSearch');
        var clearBtn = byId('mapaClearBtn');
        if (input) {
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarEnMapa(input.value);
                }
            });
            input.addEventListener('input', function () {
                if (clearBtn) clearBtn.classList.toggle('hidden', !input.value);
                if (findExact(input.value)) buscarEnMapa(input.value);
            });
        }
        var canvas = byId('mapaCanvas');
        if (canvas) {
            canvas.addEventListener('click', function () { closePop(); });
            canvas.addEventListener('wheel', function () {
                if (byId('mapaPop')) setTimeout(closePop, 50);
            }, { passive: true });
        }
        var seg = byId('mapaFloor');
        if (seg) {
            seg.querySelectorAll('button').forEach(function (b) {
                b.addEventListener('click', function () { setFloor(b.getAttribute('data-floor')); });
            });
        }
        window.addEventListener('resize', function () {
            if (zoom === zoomFit) setTimeout(fit, 150);
        });
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.m-el') && byId('mapaPop')) closePop();
        });
    }

    function initMapa() {
        var canvas = byId('mapaCanvas');
        if (!canvas) return;
        if (built) {
            fit();
            return;
        }
        if (loading) return;
        loading = true;
        fetch('mapa/layout.json')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                data = d;
                computeBounds(data.filter(skipItem));
                build();
                buildSearchIndex();
                buildDatalist();
                built = true;
                applyFloor();
                bindEvents();
                zoom = 0.55;
                zoomFit = -1;
                applyZoom();
                var cnv = byId('mapaCanvas');
                cnv.style.height = Math.max(Math.ceil(baseH * zoom) + 24, 300) + 'px';
                cnv.style.minHeight = '0';
                cnv.scrollLeft = 0;
                cnv.scrollTop = 0;
                var loadingEl = byId('mapaLoading');
                if (loadingEl) loadingEl.style.display = 'none';
                var stats = byId('mapaStats');
                if (stats) stats.textContent = searchIndex.length + ' equipos localizables';
            })
            .catch(function (err) {
                var c = byId('mapaLoading');
                if (c) c.innerHTML = '<span class="text-red-500 font-semibold">Error al cargar el plano: ' + err.message + '</span>';
            })
            .finally(function () { loading = false; });
    }

    window.initMapa = initMapa;
    window.buscarEnMapa = buscarEnMapa;
    window.limpiarBusquedaMapa = limpiarBusquedaMapa;
    window.mapaZoom = mapaZoom;
    window.mapaFit = fit;
    window.mapaSetFloor = setFloor;
    window.mapaToggleAux = mapaToggleAux;
})();
