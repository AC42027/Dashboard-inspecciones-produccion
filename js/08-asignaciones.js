        // LÓGICA DE ASIGNACIONES SEMANALES ASRS
        async function cargarAsignacionesSemanales(desdeGuardado = false) {
            const mes = document.getElementById('verFecha').value;
            if (!mes) return;

            const tbody = document.getElementById('tabla-asignaciones-publica');
            const loader = document.getElementById('asigLoadingPublic');

            tbody.innerHTML = '';
            loader.classList.remove('hidden');

            // Deshabilitar exportar al cargar datos nuevos (excepto si viene de guardado)
            if (!desdeGuardado) {
                const btnExp = document.getElementById('btnExportarAsignaciones');
                btnExp.disabled = true;
                btnExp.className = 'ml-auto px-4 py-2 bg-gray-400 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-not-allowed';
                asignacionesGuardadas = false;
            }

            try {
                const res = await fetch(`${API_BASE}/api/asignaciones/?mes=${mes}`);
                if (!res.ok) throw new Error("Endpoint no encontrado");

                const data = await res.json();
                asignacionesActuales = data;

                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500 font-medium">Sin inspecciones asignadas</td></tr>`;
                    return;
                }

                renderTablaAsignacionesPublica(mes);

            } catch (err) {
                console.error(err);
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500">Error de conexión. Consultar a Manuel Rivera en caso de persistir error.</td></tr>`;
            } finally {
                loader.classList.add('hidden');
            }
        }

        function renderTablaAsignacionesPublica(mesStr) {
            const tbody = document.getElementById('tabla-asignaciones-publica');
            const accionHeader = document.getElementById('asigAdminAccionHeader');
            let html = '';

            // Mostrar columna de acción solo en modo admin
            if (isAdminModo) {
                accionHeader.classList.remove('hidden');
            } else {
                accionHeader.classList.add('hidden');
            }

            // Extraer año y mes para filtrar inspecciones del mes
            const [anio, mesNum] = mesStr.split('-').map(Number);

            // Agrupar por asociado
            const porAsociado = asignacionesActuales.reduce((acc, a) => {
                if (!acc[a.asociado]) acc[a.asociado] = [];
                acc[a.asociado].push(a);
                return acc;
            }, {});

            Object.entries(porAsociado).sort().forEach(([aso, equiposAso]) => {
                equiposAso.forEach((asig, index) => {
                    const st = evaluarEstadoAsignacion(asig, inspecciones, mesStr);
                    const realizada = esInspeccionRealizada(asig, inspecciones, mesStr);
                    const eqValido = Array.from(document.querySelectorAll('#asrsEqList option')).some(opt =>
                        opt && normalizarTexto(opt.value) === normalizarTexto(asig.equipo));

                    html += `<tr class="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-b border-gray-200 dark:border-slate-700">`;
                    if (index === 0) {
                        html += `<td rowspan="${equiposAso.length}" class="font-bold text-gray-800 dark:text-gray-200 align-top pt-4 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">${aso}</td>`;
                    }
                    html += `
                        <td class="text-sm text-gray-600 dark:text-gray-400 p-2">${asig.zona || 'N/A'}</td>
                        <td class="font-medium text-goodyear-blue dark:text-blue-400 p-2">${asig.equipo}${!eqValido ? ' <span class="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800" title="Este equipo no existe en el listado ASRS y por eso no se muestra en la planificación"><i class="fas fa-exclamation-triangle"></i> No existe</span>' : ''}</td>
                        <td class="text-center p-2">
                            ${st === 'REALIZADA'
                                ? '<span class="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 min-w-[140px] mx-auto"><i class="fas fa-check-circle"></i> Realizada</span>': st === 'FUERA_DE_TIEMPO' ? '<span class="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 min-w-[180px] mx-auto" title="Realizada fuera de tiempo"><i class="fas fa-clock"></i> Realizada fuera de tiempo</span>': '<span class="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 min-w-[140px] mx-auto"><i class="fas fa-times-circle"></i> Pendiente</span>'}
                        </td>
                        ${isAdminModo ? `
                        <td class="text-center p-2">
                            <button onclick="eliminarAsignacion(${asig.id})" class="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded transition-colors" title="Eliminar asignación">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>` : ''}
                    </tr>`;
                });
            });
            tbody.innerHTML = html;
        }

        function actualizarFechasSemanas() {
            const val = document.getElementById('asigMesGenerar')?.value;
            if (!val) return;

            const parts = val.split('-').map(Number);
            const yr = parts[0];
            const mo = parts[1] - 1;

            const periods = get4PeriodsOfMonth(yr, mo);
            const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;

            for (let i = 0; i < 4; i++) {
                const p = periods[i];
                const txtEl = document.getElementById(`lblSem${i+1}Text`);
                if (txtEl) {
                    txtEl.textContent = `Sem. ${i+1} (${fmt(p.start)} - ${fmt(p.end)})`;
                }
            }

            const selFecha = document.getElementById('asigFechaGenerar');
            if (selFecha) {
                const prevVal = selFecha.value;
                selFecha.innerHTML = '<option value="">-- Seleccionar semana --</option>' +
                    periods.map(p => `<option value="${p.startStr}">Sem. ${p.num} (${fmt(p.start)} - ${fmt(p.end)})</option>`).join('');
                if (prevVal && periods.some(p => p.startStr === prevVal)) {
                    selFecha.value = prevVal;
                } else {
                    selFecha.value = periods[0].startStr;
                }
            }

            const selGrupoFecha = document.getElementById('manualGrupoFecha');
            if (selGrupoFecha) {
                const prevValG = selGrupoFecha.value;
                selGrupoFecha.innerHTML = '<option value="">-- Seleccionar semana --</option>' +
                    periods.map(p => `<option value="${p.startStr}">Sem. ${p.num} (${fmt(p.start)} - ${fmt(p.end)})</option>`).join('');
                if (prevValG && periods.some(p => p.startStr === prevValG)) {
                    selGrupoFecha.value = prevValG;
                } else {
                    selGrupoFecha.value = periods[0].startStr;
                }
            }

            const selRobotFecha = document.getElementById('manualRobotFecha');
            if (selRobotFecha) {
                const prevValR = selRobotFecha.value;
                selRobotFecha.innerHTML = '<option value="">-- Seleccionar semana --</option>' +
                    periods.map(p => `<option value="${p.startStr}">Sem. ${p.num} (${fmt(p.start)} - ${fmt(p.end)})</option>`).join('');
                if (prevValR && periods.some(p => p.startStr === prevValR)) {
                    selRobotFecha.value = prevValR;
                } else {
                    selRobotFecha.value = periods[0].startStr;
                }
            }

            const selCC01Fecha = document.getElementById('manualCC01Fecha');
            if (selCC01Fecha) {
                const prevValC = selCC01Fecha.value;
                selCC01Fecha.innerHTML = '<option value="">-- Seleccionar semana --</option>' +
                    periods.map(p => `<option value="${p.startStr}">Sem. ${p.num} (${fmt(p.start)} - ${fmt(p.end)})</option>`).join('');
                if (prevValC && periods.some(p => p.startStr === prevValC)) {
                    selCC01Fecha.value = prevValC;
                } else {
                    selCC01Fecha.value = periods[0].startStr;
                }
            }
        }

        async function generarAsignaciones() {
            esGeneracionAuto = true;
            const val = document.getElementById('asigMesGenerar').value;
            if (!val) { mostrarAlerta('Atención', 'Seleccione un mes a planificar.', 'fa-exclamation-circle text-amber-500'); return; }

            const btn = event.currentTarget;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
            btn.disabled = true;

            const parts = val.split('-').map(Number);
            const yr = parts[0];
            const mo = parts[1] - 1;

            try {
                // 1. Obtener equipos ASRS
                const res = await fetch(`${API_BASE}/api/equipos/`);
                const allEquipos = await res.json();

                let equiposASRS = allEquipos.filter(e => e.area === "ASRS" || e.area_id === "ASRS" || (e.area && e.area.nombre === "ASRS") || e.division === "ASRS");
                if (equiposASRS.length === 0) {
                    equiposASRS = [...new Set(inspecciones.filter(i => i.area === "ASRS").map(i => ({ equipo: i.equipo, zona: i.zona || 'N/A', nombre: i.equipo })))];
                }

                // Limpiar duplicados y normalizar
                const uniqueEqsMap = new Map();
                equiposASRS.forEach(e => {
                    const nom = e.nombre || e.equipo;
                    if (!uniqueEqsMap.has(nom)) uniqueEqsMap.set(nom, { equipo: nom, zona: e.zona || 'Sin Zona' });
                });
                const equiposTotal = Array.from(uniqueEqsMap.values());

                // 2. Identificar y agrupar Press Robots por UNIDAD COMPLETA
                const pressRobotsList = equiposTotal.filter(e => e.equipo.toLowerCase().includes('press robot') || e.equipo.toLowerCase().includes('robot'));

                // 2b. Construir grupos de crane dinámicamente desde la API
                const { groups: craneGroups, conveyorCodes } = buildCraneGroupsFromAPI(allEquipos);
                craneGroupsCache = craneGroups;

                // 2c. Separar equipos: conveyors de crane, cranes, robots, y el resto
                const otrosEquipos = [];
                equiposTotal.filter(e => !e.equipo.toLowerCase().includes('press robot') && !e.equipo.toLowerCase().includes('robot')).forEach(e => {
                    otrosEquipos.push(e);
                });
                otrosEquipos.sort((a, b) => a.zona.localeCompare(b.zona) || a.equipo.localeCompare(b.equipo));

                // 2d. Crear unidades de crane group = crane + sus conveyors (basado en ubicacion)
                const craneGroupUnits = Object.entries(craneGroups).map(([key, grp]) => {
                    const items = [];
                    const craneEq = equiposTotal.find(e => e.equipo === grp.crane);
                    if (craneEq) items.push({ equipo: craneEq.equipo, zona: craneEq.zona || 'ASRS' });
                    grp.inbound.forEach(name => {
                        const eq = equiposTotal.find(e => e.equipo === name);
                        if (eq) items.push({ equipo: eq.equipo, zona: `${key} Inbound` });
                    });
                    grp.outbound.forEach(name => {
                        const eq = equiposTotal.find(e => e.equipo === name);
                        if (eq) items.push({ equipo: eq.equipo, zona: `${key} Outbound` });
                    });
                    return items.length > 0 ? { name: key, items } : null;
                }).filter(Boolean);

                // Remover conveyors de crane y cranes de otrosEquipos
                const craneEqNames = new Set(Object.values(craneGroups).flatMap(g => [g.crane, ...g.inbound, ...g.outbound]));
                const otrosFiltrados = otrosEquipos.filter(e => !craneEqNames.has(e.equipo));

                const robotUnitsMap = new Map();
                pressRobotsList.forEach(e => {
                    const baseName = getBaseRobotName(e.equipo);
                    if (!robotUnitsMap.has(baseName)) robotUnitsMap.set(baseName, []);
                    robotUnitsMap.get(baseName).push(e);
                });
                const pressRobotUnits = Array.from(robotUnitsMap.values());

                // 3. Calcular las 4 semanas (lunes) del mes
                const periods = get4PeriodsOfMonth(yr, mo);
                const semanasMes = periods.map(p => p.startStr);

                // 3b. Obtener historial de la semana anterior desde la BD
                const fPrev = new Date(semanasMes[0] + "T00:00:00");
                fPrev.setDate(fPrev.getDate() - 7);
                const fechaPrevStr = fPrev.toISOString().split('T')[0];

                let historialPrevio = {};
                try {
                    const resPrev = await fetch(`${API_BASE}/api/asignaciones/?fecha=${fechaPrevStr}`);
                    if (resPrev.ok) {
                        const dataPrev = await resPrev.json();
                        dataPrev.forEach(a => { historialPrevio[a.asociado] = (a.zona || '') + ' ' + (a.equipo || ''); });
                    }
                } catch (e) { console.warn("No se pudo obtener el historial previo para rotación."); }

                // Ordenar equipo ASRS base: quienes tuvieron robots la semana previa rotan al final
                const asociadosBase = [...asrsTeam].sort((a, b) => {
                    const histA = (historialPrevio[a] || '').toLowerCase();
                    const histB = (historialPrevio[b] || '').toLowerCase();
                    const tuvoRobotA = histA.includes('robot');
                    const tuvoRobotB = histB.includes('robot');
                    if (tuvoRobotA && !tuvoRobotB) return 1;
                    if (!tuvoRobotA && tuvoRobotB) return -1;
                    return 0;
                });

                // 4. Dividir unidades de robots completos, grupos de crane y otros equipos en 4 bloques semanales
                const chunkRobotsSem = Math.ceil(pressRobotUnits.length / 4);
                const chunkCraneSem = craneGroupUnits.length > 0 ? Math.ceil(craneGroupUnits.length / 4) : 0;
                const chunkOtrosSem = Math.ceil(otrosFiltrados.length / 4);

                asignacionesPreview = [];

                // Obtener semanas seleccionadas por el admin
                const semanasCheckeadas = [];
                if (document.getElementById('chkSem1')?.checked) semanasCheckeadas.push(0);
                if (document.getElementById('chkSem2')?.checked) semanasCheckeadas.push(1);
                if (document.getElementById('chkSem3')?.checked) semanasCheckeadas.push(2);
                if (document.getElementById('chkSem4')?.checked) semanasCheckeadas.push(3);

                if (semanasCheckeadas.length === 0) {
                    mostrarAlerta('Atención', 'Seleccione al menos una semana para generar.', 'fa-info-circle text-blue-500');
                    return;
                }

                semanasMes.forEach((semFecha, wIdx) => {
                    if (!semanasCheckeadas.includes(wIdx)) return;
                    const semIdx = semanasCheckeadas.indexOf(wIdx);
                    const totalSemCheck = semanasCheckeadas.length;
                    const robotUnitsSem = pressRobotUnits.slice(wIdx * chunkRobotsSem, (wIdx + 1) * chunkRobotsSem);
                    const craneGroupsSem = chunkCraneSem > 0 ? craneGroupUnits.slice(semIdx * chunkCraneSem, (semIdx + 1) * chunkCraneSem) : [];
                    const otrosSem = otrosFiltrados.slice(semIdx * chunkOtrosSem, (semIdx + 1) * chunkOtrosSem);

                    // Rotar asociados en cada semana a partir de asociadosBase
                    const shift = (wIdx * 3) % asociadosBase.length;
                    const asociadosRotados = [...asociadosBase.slice(shift), ...asociadosBase.slice(0, shift)];

                    // Tomar especialistas SOLO para robots (máximo 5)
                    const numEspecialistas = Math.min(robotUnitsSem.length, Math.min(5, asociadosRotados.length));
                    const asociadosRobot = numEspecialistas > 0 ? asociadosRotados.slice(0, numEspecialistas) : [];
                    const asociadosResto = asociadosRotados.slice(numEspecialistas);

                    const asignacionPorAsociado = {};
                    asociadosRotados.forEach(a => { asignacionPorAsociado[a] = []; });

                    // Repartir UNIDADES DE ROBOTS COMPLETOS entre los especialistas reales
                    if (robotUnitsSem.length > 0 && asociadosRobot.length > 0) {
                        const chunkR = Math.floor(robotUnitsSem.length / asociadosRobot.length);
                        let extraR = robotUnitsSem.length % asociadosRobot.length;
                        let rIdx = 0;
                        asociadosRobot.forEach(aso => {
                            const cant = chunkR + (extraR > 0 ? 1 : 0);
                            extraR--;
                            const units = robotUnitsSem.slice(rIdx, rIdx + cant);
                            rIdx += cant;
                            units.forEach(unit => { asignacionPorAsociado[aso].push(...unit); });
                        });
                    }

                    // Repartir GRUPOS DE CRANE entre los NO especialistas (equilibrio de carga)
                    const equipoDestinoCrane = asociadosResto.length > 0 ? asociadosResto : asociadosRotados;
                    if (craneGroupsSem.length > 0 && equipoDestinoCrane.length > 0) {
                        const chunkC = Math.floor(craneGroupsSem.length / equipoDestinoCrane.length);
                        let extraC = craneGroupsSem.length % equipoDestinoCrane.length;
                        let cIdx = 0;
                        equipoDestinoCrane.forEach(aso => {
                            const cant = chunkC + (extraC > 0 ? 1 : 0);
                            extraC--;
                            const groups = craneGroupsSem.slice(cIdx, cIdx + cant);
                            cIdx += cant;
                            groups.forEach(grp => { asignacionPorAsociado[aso].push(...grp.items); });
                        });
                    }

                    // Repartir otros equipos entre los NO especialistas
                    if (otrosSem.length > 0 && equipoDestinoCrane.length > 0) {
                        const chunkO = Math.floor(otrosSem.length / equipoDestinoCrane.length);
                        let extraO = otrosSem.length % equipoDestinoCrane.length;
                        let oIdx = 0;
                        equipoDestinoCrane.forEach(aso => {
                            const cant = chunkO + (extraO > 0 ? 1 : 0);
                            extraO--;
                            const items = otrosSem.slice(oIdx, oIdx + cant);
                            oIdx += cant;
                            asignacionPorAsociado[aso].push(...items);
                        });
                    }

                    // Garantizar que 100% de los integrantes del equipo reciban al menos 1 equipo
                    asociadosRotados.forEach(aso => {
                        if (asignacionPorAsociado[aso].length === 0) {
                            const maxAso = asociadosRotados.reduce((prev, curr) =>
                                asignacionPorAsociado[curr].length > asignacionPorAsociado[prev].length ? curr : prev
                            , asociadosRotados[0]);
                            if (asignacionPorAsociado[maxAso].length > 1) {
                                const movedItem = asignacionPorAsociado[maxAso].pop();
                                asignacionPorAsociado[aso].push(movedItem);
                            }
                        }
                    });

                    // Agregar a asignacionesPreview
                    Object.entries(asignacionPorAsociado).forEach(([aso, eqs]) => {
                        eqs.forEach(e => {
                            asignacionesPreview.push({
                                fecha: semFecha,
                                asociado: aso,
                                equipo: e.equipo,
                                zona: e.zona
                            });
                        });
                    });
                });

                // Mostrar Preview
                document.getElementById('asigPreviewContainer').classList.remove('hidden');
                renderPreview();

            } catch (error) {
                mostrarAlerta('Error', 'Error generando asignaciones: ' + error.message, 'fa-exclamation-circle text-red-500');
            } finally {
                btn.innerHTML = '<i class="fas fa-magic"></i> Generar Rutas Automáticas';
                btn.disabled = false;
            }
        }

        async function actualizarDataListsAdmin() {
            try {
                const res = await fetch(`${API_BASE}/api/equipos/`);
                const allEquipos = await res.json();
                const datalist = document.getElementById('asrsEqList');
                if (datalist) {
                    const asrsEqs = allEquipos.filter(e => e.area === "ASRS" || e.area_id === "ASRS" || (e.area && e.area.nombre === "ASRS") || e.division === "ASRS");
                    datalist.innerHTML = asrsEqs
                        .map(e => `<option value="${e.nombre || e.equipo}">${e.zona || ''}</option>`)
                        .join('');
                }
                actualizarSelectGrupoRobots();
            } catch (e) { console.warn("Error al cargar equipos para búsqueda manual"); }
        }

        function agregarAsignacionManual() {
            esGeneracionAuto = false;
            const eq = document.getElementById('manualEqSearch').value.trim();
            const aso = document.getElementById('manualAsoSelect').value;
            const selFecha = document.getElementById('asigFechaGenerar');
            let fecha = selFecha ? selFecha.value : '';

            if (!fecha) {
                const mesVal = document.getElementById('asigMesGenerar')?.value;
                if (mesVal) {
                    const parts = mesVal.split('-').map(Number);
                    const periods = get4PeriodsOfMonth(parts[0], parts[1] - 1);
                    fecha = periods[0].startStr;
                    if (selFecha) selFecha.value = fecha;
                }
            }

            if (!fecha) { mostrarAlerta('Atención', 'Seleccione primero un mes y una semana.', 'fa-exclamation-circle text-amber-500'); return; }
            if (!eq) { mostrarAlerta('Atención', 'Seleccione o escriba un equipo.', 'fa-exclamation-circle text-amber-500'); return; }

            const baseName = getBaseRobotName(eq);
            const datalistOptions = Array.from(document.querySelectorAll('#asrsEqList option')).map(o => o.value);
            if (!datalistOptions.some(opt => opt && normalizarTexto(opt) === normalizarTexto(eq))) {
                mostrarAlerta('Equipo no válido',
                    `"${eq}" no existe en el listado de equipos del área ASRS. Escríbalo igual que aparece en la lista (use el buscador) para que la asignación se pueda ver.`,
                    'fa-exclamation-triangle text-amber-500');
                return;
            }
            const ejesRelacionados = datalistOptions.filter(opt => opt && getBaseRobotName(opt) === baseName && opt !== eq);
            const equiposAgregar = [eq, ...ejesRelacionados];
            let agregadosCount = 0;

            equiposAgregar.forEach(eqItem => {
                if (!asignacionesPreview.some(a => a.equipo === eqItem)) {
                    let zona = 'ASRS';
                    const option = document.querySelector(`#asrsEqList option[value="${eqItem}"]`);
                    if (option) zona = option.innerText || 'ASRS';

                    asignacionesPreview.push({
                        fecha: fecha,
                        asociado: aso === 'PENDIENTE' ? '' : aso,
                        equipo: eqItem,
                        zona: zona
                    });
                    agregadosCount++;
                }
            });

            if (agregadosCount === 0) {
                mostrarAlerta('Atención', 'Este equipo (o sus ejes) ya están en la vista previa.', 'fa-info-circle text-blue-500');
                return;
            }

            document.getElementById('manualEqSearch').value = '';
            document.getElementById('asigPreviewContainer').classList.remove('hidden');
            renderPreview();
        }

        async function agregarGrupoSRM() {
            esGeneracionAuto = false;
            const srmKey = document.getElementById('manualGrupoSRM').value;
            const aso = document.getElementById('manualGrupoAsoSelect').value;
            const selFecha = document.getElementById('manualGrupoFecha');
            let fecha = selFecha ? selFecha.value : '';

            if (!srmKey) { mostrarAlerta('Atención', 'Seleccione un grupo SRM.', 'fa-exclamation-circle text-amber-500'); return; }

            if (!fecha) {
                const mesVal = document.getElementById('asigMesGenerar')?.value;
                if (mesVal) {
                    const parts = mesVal.split('-').map(Number);
                    const periods = get4PeriodsOfMonth(parts[0], parts[1] - 1);
                    fecha = periods[0].startStr;
                    if (selFecha) selFecha.value = fecha;
                }
            }

            if (!fecha) { mostrarAlerta('Atención', 'Seleccione primero un mes y una semana.', 'fa-exclamation-circle text-amber-500'); return; }

            let group = craneGroupsCache && craneGroupsCache[srmKey];
            if (!group) {
                try {
                    const res = await fetch(`${API_BASE}/api/equipos/`);
                    const allEq = await res.json();
                    const { groups } = buildCraneGroupsFromAPI(allEq);
                    craneGroupsCache = groups;
                    group = groups[srmKey];
                } catch (e) { console.error(e); }
            }
            if (!group) { mostrarAlerta('Error', 'Grupo no encontrado.', 'fa-times-circle text-red-500'); return; }

            const todosLosEqs = [group.crane, ...group.inbound, ...group.outbound];
            const asoVal = aso === 'PENDIENTE' ? '' : aso;
            let agregadosCount = 0;

            todosLosEqs.forEach(eqCode => {
                if (!asignacionesPreview.some(a => a.equipo === eqCode)) {
                    let zona = 'ASRS';
                    if (group.inbound.includes(eqCode)) zona = `${srmKey} Inbound`;
                    else if (group.outbound.includes(eqCode)) zona = `${srmKey} Outbound`;
                    else zona = srmKey;
                    asignacionesPreview.push({
                        fecha: fecha,
                        asociado: asoVal,
                        equipo: eqCode,
                        zona: zona
                    });
                    agregadosCount++;
                }
            });

            if (agregadosCount === 0) {
                mostrarAlerta('Atención', 'Todos los conveyors de este grupo ya están en la vista previa.', 'fa-info-circle text-blue-500');
                return;
            }

            document.getElementById('manualGrupoSRM').value = '';
            document.getElementById('asigPreviewContainer').classList.remove('hidden');
            renderPreview();
        }

        // Agrupar robots de prensa completos + sus ejes a partir del listado ASRS real.
        // Solo considera robots de prensa (zona 'Press Robot' o nombre 'press robot'): 600B, 600A, 500B, 500A, 400B.
        // Cada grupo agrupa los ejes reales (X, Z, U, W); no existe un equipo "robot" principal.
        function getRobotGroupsFromDatalist() {
            const options = Array.from(document.querySelectorAll('#asrsEqList option'));
            const map = new Map();
            options.forEach(opt => {
                const name = opt && opt.value;
                if (!name) return;
                const zona = (opt.innerText || '');
                const esPrensa = /press robot/i.test(name) || normalizarTexto(zona) === 'press robot';
                if (!esPrensa) return;
                const base = getBaseRobotName(name);
                if (!map.has(base)) map.set(base, { base, equipos: [] });
                map.get(base).equipos.push(name);
            });
            return Array.from(map.values());
        }

        function actualizarSelectGrupoRobots() {
            const sel = document.getElementById('manualRobotSelect');
            if (!sel) return;
            const grupos = getRobotGroupsFromDatalist();
            sel.innerHTML = '<option value="">-- Seleccionar Robot --</option>' +
                grupos.map(g => {
                    const code = (g.base.match(/(\d+[A-Za-z])\s*$/i) || [])[1] || g.base;
                    const label = `${code} (${g.equipos.length} ejes)`;
                    return `<option value="${g.base}">${label}</option>`;
                }).sort((a, b) => a.localeCompare(b)).join('');
        }

        async function agregarGrupoRobot() {
            esGeneracionAuto = false;
            const baseSel = document.getElementById('manualRobotSelect');
            const baseName = baseSel ? baseSel.value : '';
            const aso = document.getElementById('manualRobotAsoSelect').value;
            const selFecha = document.getElementById('manualRobotFecha');
            let fecha = selFecha ? selFecha.value : '';

            if (!baseName) { mostrarAlerta('Atención', 'Seleccione un robot de prensa.', 'fa-exclamation-circle text-amber-500'); return; }

            if (!fecha) {
                const mesVal = document.getElementById('asigMesGenerar')?.value;
                if (mesVal) {
                    const parts = mesVal.split('-').map(Number);
                    const periods = get4PeriodsOfMonth(parts[0], parts[1] - 1);
                    fecha = periods[0].startStr;
                    if (selFecha) selFecha.value = fecha;
                }
            }

            if (!fecha) { mostrarAlerta('Atención', 'Seleccione primero un mes y una semana.', 'fa-exclamation-circle text-amber-500'); return; }

            const grupos = getRobotGroupsFromDatalist();
            const grp = grupos.find(g => g.base === baseName);
            if (!grp) { mostrarAlerta('Error', 'Grupo de robot no encontrado.', 'fa-times-circle text-red-500'); return; }

            const todosLosEqs = (grp.equipos || []).filter(Boolean);
            const asoVal = aso === 'PENDIENTE' ? '' : aso;
            let agregadosCount = 0;

            todosLosEqs.forEach(eqCode => {
                if (!asignacionesPreview.some(a => a.equipo === eqCode)) {
                    let zona = 'ASRS';
                    const option = document.querySelector(`#asrsEqList option[value="${eqCode}"]`);
                    if (option) zona = option.innerText || 'ASRS';
                    asignacionesPreview.push({
                        fecha: fecha,
                        asociado: asoVal,
                        equipo: eqCode,
                        zona: zona
                    });
                    agregadosCount++;
                }
            });

            if (agregadosCount === 0) {
                mostrarAlerta('Atención', 'Todos los equipos de este robot ya están en la vista previa.', 'fa-info-circle text-blue-500');
                return;
            }

            baseSel.value = '';
            document.getElementById('asigPreviewContainer').classList.remove('hidden');
            renderPreview();
        }

        // Grupos CC01: 5 sectores de 18 conveyors siguiendo el recorrido físico del transportador
        // (excluye inbound/outbound de los cranes: NBS90 P0020-P0070 y posiciones CH-01..CH-11).
        const GRUPOS_CC01 = {
            G1: [
                'CC01_P3910','CC01_P3925','CC01_P3950','CC01_P3955','CC01_P3957','CC01_P3960',
                'CC01_P3965','CC01_P3970','CC01_P3975','CC01_P3980','CC01_P3985','CC01_P4005',
                'CC01_P4010','CC01_P4015','CC01_P4020','CC01_P4030','CC01_P4035','CC01_P4040'
            ],
            G2: [
                'CC01_P4045','CC01_P4050','CC01_P4055','CC01_P4060','CC01_P4065','CC01_P4070',
                'CC01_P4075','CC01_P4080','CC01_P4085','CC01_P4087','CC01_P4090','CC01_P4100',
                'CC01_P4215','CC01_P4225','CC01_P4230','CC01_P4235','CC01_P4240','CC01_P4245'
            ],
            G3: [
                'CC01_P4250','CC01_P4255','CC01_P4260','CC01_P4265','CC01_P4270','CC01_P4275',
                'CC01_P4280','CC01_P4285','CC01_P4290','CC01_P4295','CC01_P4430','CC01_P4440',
                'CC01_P4445','CC01_P4450','CC01_P4475','CC01_P4480','CC01_P4485','CC01_P4490'
            ],
            G4: [
                'CC01_P4500','CC01_P4510','CC01_P4410','CC01_P4415','CC01_P4420','CC01_P3505',
                'CC01_P3510','CC01_P3515','CC01_P3520','CC01_P3525','CC01_P3530','CC01_P5040',
                'CC01_P5041','CC01_P5042','CC01_P5043','CC01_P5060','CC01_P5061','CC01_P5070'
            ],
            G5: [
                'CC01_P5079','CC01_P5080','CC01_P5090','CC01_P5020','CC01_P5021','CC01_P5022',
                'CC01_P5023','CC01_P5024','CC01_P5025','CC01_P5026','CC02_P5010','CC02_P5030',
                'CC02_P5043','CC02_P5050','CC01_P005','CC01_P0010','CC01_P0015','CC01_P0100'
            ]
        };

        async function agregarGrupoCC01() {
            esGeneracionAuto = false;
            const sector = document.getElementById('manualCC01Select').value;
            const aso = document.getElementById('manualCC01AsoSelect').value;
            const selFecha = document.getElementById('manualCC01Fecha');
            let fecha = selFecha ? selFecha.value : '';

            if (!sector) { mostrarAlerta('Atención', 'Seleccione un sector CC01.', 'fa-exclamation-circle text-amber-500'); return; }

            if (!fecha) {
                const mesVal = document.getElementById('asigMesGenerar')?.value;
                if (mesVal) {
                    const parts = mesVal.split('-').map(Number);
                    const periods = get4PeriodsOfMonth(parts[0], parts[1] - 1);
                    fecha = periods[0].startStr;
                    if (selFecha) selFecha.value = fecha;
                }
            }

            if (!fecha) { mostrarAlerta('Atención', 'Seleccione primero un mes y una semana.', 'fa-exclamation-circle text-amber-500'); return; }

            const todosLosEqs = GRUPOS_CC01[sector] || [];
            const asoVal = aso === 'PENDIENTE' ? '' : aso;
            let agregadosCount = 0;

            todosLosEqs.forEach(eqCode => {
                if (!asignacionesPreview.some(a => a.equipo === eqCode)) {
                    let zona = 'CC01';
                    const option = document.querySelector(`#asrsEqList option[value="${eqCode}"]`);
                    if (option) zona = option.innerText || 'CC01';
                    asignacionesPreview.push({
                        fecha: fecha,
                        asociado: asoVal,
                        equipo: eqCode,
                        zona: zona
                    });
                    agregadosCount++;
                }
            });

            if (agregadosCount === 0) {
                mostrarAlerta('Atención', 'Todos los equipos de este sector ya están en la vista previa.', 'fa-info-circle text-blue-500');
                return;
            }

            document.getElementById('manualCC01Select').value = '';
            document.getElementById('asigPreviewContainer').classList.remove('hidden');
            renderPreview();
        }

        function renderPreview() {
            const container = document.getElementById('asigPreviewText');
            if (!container) return;
            if (asignacionesPreview.length === 0) {
                container.innerHTML = '<p class="text-gray-500 italic text-center py-4">No hay equipos para mostrar.</p>';
                return;
            }

            // Agrupar primero por semana (fecha), luego por asociado
            const porSemana = asignacionesPreview.reduce((acc, item) => {
                const f = item.fecha || 'Semana';
                if (!acc[f]) acc[f] = {};
                const aso = item.asociado || 'PENDIENTE';
                if (!acc[f][aso]) acc[f][aso] = [];
                acc[f][aso].push(item);
                return acc;
            }, {});

            let html = '';
            Object.keys(porSemana).sort().forEach(semFecha => {
                const parts = semFecha.split('-').map(Number);
                const yr = parts[0];
                const mo = parts[1] - 1;
                const day = parts[2];
                const periods = get4PeriodsOfMonth(yr, mo);
                const pObj = periods.find(p => p.startStr === semFecha) || { start: new Date(yr, mo, day, 12, 0, 0), end: new Date(yr, mo, day + 6, 12, 0, 0) };
                const mesNombre = MESES_ES[mo];
                const tituloSemana = `Semana ${periods.findIndex(p => p.startStr === semFecha) + 1}: del ${String(pObj.start.getDate()).padStart(2,'0')} al ${String(pObj.end.getDate()).padStart(2,'0')} de ${mesNombre} de ${yr}`;
                const porAso = porSemana[semFecha];
                const sortedAsos = Object.keys(porAso).sort((a, b) => a === 'PENDIENTE' ? -1 : b === 'PENDIENTE' ? 1 : a.localeCompare(b));
                const totalEquiposSemana = Object.values(porAso).flat().length;

                html += `<div class="mb-8 border-b-2 border-blue-200 dark:border-blue-800/60 pb-6">
                    <div class="flex items-center gap-2 mb-4 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                        <i class="fas fa-calendar-week text-goodyear-blue dark:text-blue-300"></i>
                        <h3 class="font-bold text-goodyear-blue dark:text-blue-300 text-sm uppercase tracking-wider">${tituloSemana}</h3>
                        <span class="ml-auto text-xs font-semibold px-2.5 py-1 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded shadow-sm border border-gray-200 dark:border-slate-700">
                            ${totalEquiposSemana} Equipos distribuídos en esta semana
                        </span>
                    </div>
                    <div class="space-y-4">`;

                sortedAsos.forEach(aso => {
                    const eqs = porAso[aso];
                    const isPending = aso === 'PENDIENTE';

                    html += `
                    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div class="px-4 py-2.5 ${isPending ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200'} flex justify-between items-center border-b border-gray-200 dark:border-slate-700">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full ${isPending ? 'bg-white/20' : 'bg-goodyear-blue'} flex items-center justify-center text-xs text-white">
                                    <i class="fas ${isPending ? 'fa-exclamation-triangle' : 'fa-user'}"></i>
                                </div>
                                <span class="font-bold text-xs tracking-wide">${isPending ? 'EQUIPOS PENDIENTES SIN ASIGNACIÓN' : aso.toUpperCase()}</span>
                            </div>
                            <div class="px-2.5 py-0.5 bg-white/20 rounded text-[11px] font-bold backdrop-blur-sm">
                                ${eqs.length} Equipos
                            </div>
                        </div>
                        <div class="p-3">
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                ${eqs.map(e => `
                                    <div class="group relative p-2.5 bg-gray-50 dark:bg-slate-900/40 rounded-lg border border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800 transition-all shadow-sm">
                                        <button onclick="eliminarDeVistaPrevia('${e.equipo}')" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Descartar">
                                            <i class="fas fa-times-circle"></i>
                                        </button>
                                        <div class="text-[11px] font-bold text-slate-800 dark:text-slate-100 mb-1 leading-tight pr-5">${e.equipo}</div>
                                        <div class="flex items-center gap-1 mb-2">
                                            <span class="text-[9px] text-goodyear-blue dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                                                <i class="fas fa-map-marker-alt"></i> ${e.zona}
                                            </span>
                                        </div>
                                        <div class="pt-1.5 border-t border-gray-200 dark:border-slate-700">
                                            <div class="flex items-center gap-1.5">
                                                <i class="fas fa-exchange-alt text-[9px] text-gray-400"></i>
                                                <select onchange="cambiarAsignacion('${e.equipo}', this.value)" 
                                                    class="flex-grow bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded px-1.5 py-0.5 text-[9px] font-medium focus:ring-2 focus:ring-goodyear-blue outline-none cursor-pointer">
                                                    <option value="PENDIENTE" ${isPending ? 'selected' : ''}>-- Sin Asignar --</option>
                                                    ${asrsTeam.map(name => `<option value="${name}" ${name === aso ? 'selected' : ''}>${name}</option>`).join('')}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>`;
                });
                html += `</div></div>`;
            });

            container.innerHTML = html;
        }

        function cambiarAsignacion(equipoNombre, nuevoAsociado) {
            const baseName = getBaseRobotName(equipoNombre);
            const nuevoVal = nuevoAsociado === 'PENDIENTE' ? '' : nuevoAsociado;

            let countUpdated = 0;
            asignacionesPreview.forEach(a => {
                if ((baseName && getBaseRobotName(a.equipo) === baseName) || a.equipo === equipoNombre) {
                    a.asociado = nuevoVal;
                    countUpdated++;
                }
            });

            if (countUpdated === 0) {
                const item = asignacionesPreview.find(a => a.equipo === equipoNombre);
                if (item) item.asociado = nuevoVal;
            }

            renderPreview();
        }

        function eliminarDeVistaPrevia(equipoNombre) {
            asignacionesPreview = asignacionesPreview.filter(a => a.equipo !== equipoNombre);
            if (asignacionesPreview.length === 0) {
                document.getElementById('asigPreviewContainer').classList.add('hidden');
            }
            renderPreview();
        }

        async function cancelarVistaPrevia() {
            if (asignacionesPreview.length === 0) {
                document.getElementById('asigPreviewContainer').classList.add('hidden');
                return;
            }
            const confirmar = await mostrarConfirmacion(
                'Cancelar Generación',
                'Se descartarán todas las asignaciones generadas en la vista previa. ¿Está seguro?',
                'fa-times-circle text-red-500'
            );
            if (!confirmar) return;
            asignacionesPreview = [];
            esGeneracionAuto = false;
            document.getElementById('asigPreviewContainer').classList.add('hidden');
        }

        async function guardarAsignacionesEnDjango() {
            if (asignacionesPreview.length === 0) return;

            const btn = event.currentTarget;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btn.disabled = true;

            try {
                const fechaSemana = asignacionesPreview[0].fecha;

                // Combinar asignaciones existentes con la vista previa para no perder datos
                let payloadAsignaciones = [];
                if (!esGeneracionAuto && asignacionesActuales && asignacionesActuales.length > 0) {
                    const mapEq = new Map();
                    asignacionesActuales.forEach(a => {
                        if (a.fecha === fechaSemana) {
                            mapEq.set(a.equipo, { fecha: a.fecha, asociado: a.asociado, equipo: a.equipo, zona: a.zona });
                        }
                    });
                    asignacionesPreview.forEach(a => {
                        mapEq.set(a.equipo, a);
                    });
                    payloadAsignaciones = Array.from(mapEq.values());
                } else {
                    payloadAsignaciones = asignacionesPreview;
                }

                const res = await fetch(`${API_BASE}/api/asignaciones/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fecha: fechaSemana,
                        asignaciones: payloadAsignaciones,
                        asignado_por: loggedUserFullName || 'Admin',
                        reemplazar_todo: esGeneracionAuto
                    })
                });

                if (res.ok) {
                    mostrarAlerta('Éxito', 'Inspección asignada correctamente.', 'fa-check-circle text-green-500');
                    document.getElementById('asigPreviewContainer').classList.add('hidden');
                    document.getElementById('verFecha').value = fechaSemana.slice(0, 7);
                    asignacionesGuardadas = true;
                    const btnExp = document.getElementById('btnExportarAsignaciones');
                    if (btnExp) {
                        btnExp.disabled = false;
                        btnExp.className = 'ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2';
                    }
                    esGeneracionAuto = false;
                    asignacionesPreview = [];
                    cargarAsignacionesSemanales(true);
                } else {
                    mostrarAlerta('Aviso', "El servidor respondió con error.", 'fa-exclamation-circle text-amber-500');
                }
            } catch (err) {
                mostrarAlerta('Error', 'Error de red. Asegúrate de que el servidor esté disponible.', 'fa-exclamation-circle text-red-500');
            } finally {
                btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
                btn.disabled = false;
            }
        }

        async function eliminarAsignacion(asignacionId) {
            const confirmar = await mostrarConfirmacion(
                'Eliminar Asignación',
                '¿Estás seguro de eliminar esta asignación? No se podrá deshacer.',
                'fa-trash-alt text-red-500'
            );
            if (!confirmar) return;

            try {
                const res = await fetch(`${API_BASE}/api/asignaciones/${asignacionId}/eliminar/`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (res.ok && data.status === 'ok') {
                    await mostrarAlerta('Eliminada', 'Asignación eliminada correctamente.', 'fa-check-circle text-green-500');
                    const fecha = document.getElementById('verFecha').value;
                    if (fecha) cargarAsignacionesSemanales();
                } else {
                    await mostrarAlerta('Error', data.message || 'Error al eliminar', 'fa-times-circle text-red-500');
                }
            } catch (err) {
                await mostrarAlerta('Error de Red', 'No se pudo conectar con el servidor.', 'fa-wifi text-red-500');
            }
        }

