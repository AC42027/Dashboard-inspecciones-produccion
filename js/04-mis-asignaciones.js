        // MIS ASIGNACIONES
        let loggedUserFullName = '';
        let currentMisAsignaciones = [];
        let misAsigFiltroEstado = 'todas';

        async function handleMisAsigLogin(e) {
            e.preventDefault();
            const user = document.getElementById('misAsigUser').value.toLowerCase();
            const pass = document.getElementById('misAsigPass').value;
            const btn = document.getElementById('misAsigSubmitBtn');
            const error = document.getElementById('misAsigError');

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Autenticando...';
            btn.disabled = true;
            error.classList.add('hidden');

            try {
                const res = await fetch(`${API_BASE}/api/login-ldap/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user, password: pass })
                });

                const data = await res.json();
                if (res.ok && data.status === 'ok') {
                    loggedUserFullName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || user;
                    localStorage.setItem('misAsigFullName', loggedUserFullName);
                    localStorage.setItem('misAsigUser', user);

                    document.getElementById('misAsigLogin').classList.add('hidden');
                    document.getElementById('misAsigContent').classList.remove('hidden');
                    document.getElementById('misAsigUserName').textContent = loggedUserFullName;

                    poblarSelectMesMisAsignaciones();
                    cargarMisAsignaciones();
                    cargarCumplimientoAnual(new Date().getFullYear());
                } else {
                    error.textContent = data.message || data.error || "Credenciales inválidas o acceso denegado.";
                    error.classList.remove('hidden');
                }
            } catch (err) {
                error.textContent = "Error de conexión con el servidor LDAP (" + err.message + ").";
                error.classList.remove('hidden');
            } finally {
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
                btn.disabled = false;
            }
        }

        async function cargarMisAsignaciones() {
            const selMes = document.getElementById('misAsigMes');
            let mes = selMes ? selMes.value : '';
            if (!mes) {
                const ahora = new Date();
                mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
                if (selMes) selMes.value = mes;
            }

            const loading = document.getElementById('misAsigLoading');
            const wrapper = document.getElementById('misAsigTableWrapper');
            const noData = document.getElementById('misAsigNoData');
            const progress = document.getElementById('misAsigProgress');
            const progressAnual = document.getElementById('misAsigProgressAnual');
            const contentError = document.getElementById('misAsigContentError');

            loading.classList.remove('hidden');
            wrapper.classList.add('hidden');
            noData.classList.add('hidden');
            progress.classList.add('hidden');
            progressAnual.classList.add('hidden');
            contentError.classList.add('hidden');

            try {
                const res = await fetch(`${API_BASE}/api/asignaciones/?mes=${mes}`);
                if (!res.ok) {
                    const errText = await res.text().catch(() => '');
                    throw new Error(`HTTP ${res.status}: ${errText || res.statusText || 'Error en servidor'}`);
                }
                const data = await res.json();

                // Normalizar para matching flexible
                const normalizar = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const userNorm = normalizar(loggedUserFullName);

                currentMisAsignaciones = data.filter(a => matchAsociado(loggedUserFullName, a.asociado));

                if (currentMisAsignaciones.length === 0) {
                    noData.classList.remove('hidden');
                    loading.classList.add('hidden');
                    return;
                }

                renderTablaMisAsignaciones();

                // Progress bar mensual
                const realizados = currentMisAsignaciones.filter(a => esInspeccionRealizada(a, inspecciones)).length;

                const total = currentMisAsignaciones.length;
                const pct = total > 0 ? Math.round((realizados / total) * 100) : 0;
                document.getElementById('misAsigProgressText').textContent = `${realizados} de ${total} realizados`;
                document.getElementById('misAsigProgressPct').textContent = `${pct}%`;
                document.getElementById('misAsigProgressBar').style.width = `${pct}%`;
                progress.classList.remove('hidden');

                // Cargar cumplimiento anual
                const anio = mes.split('-')[0];
                cargarCumplimientoAnual(anio);

            } catch (err) {
                document.getElementById('misAsigContentErrorText').textContent = "Error al cargar asignaciones: " + err.message;
                contentError.classList.remove('hidden');
            } finally {
                loading.classList.add('hidden');
            }
        }

        function renderTablaMisAsignaciones() {
            const tbody = document.getElementById('misAsigTableBody');
            const wrapper = document.getElementById('misAsigTableWrapper');
            const searchText = (document.getElementById('misAsigSearch')?.value || '').toLowerCase();

            let filtered = currentMisAsignaciones.filter(a => {
                const eq = (a.equipo || '').toLowerCase();
                const zona = (a.zona || '').toLowerCase();
                const matchesSearch = !searchText || eq.includes(searchText) || zona.includes(searchText);
                if (!matchesSearch) return false;

                const realizada = esInspeccionRealizada(a, inspecciones);

                if (misAsigFiltroEstado === 'realizadas') return realizada;
                if (misAsigFiltroEstado === 'pendientes') return !realizada;
                return true;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500 dark:text-gray-400">No se encontraron asignaciones con los filtros seleccionados.</td></tr>`;
            } else {
                let html = '';
                filtered.forEach(a => {
                    const realizada = esInspeccionRealizada(a, inspecciones);

                    const fInicio = new Date(a.fecha + 'T00:00:00');
                    const fFin = new Date(fInicio.getTime() + 6 * 24 * 60 * 60 * 1000);
                    
                    const fmtFecha = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                    const rangoSemana = `Semana del ${fmtFecha(fInicio)} al ${fmtFecha(fFin)}`;

                    const st = evaluarEstadoAsignacion(a, inspecciones);
                    html += `<tr class="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-b border-gray-100 dark:border-slate-700/50">
                        <td class="font-semibold text-[#003399] dark:text-yellow-400 px-5 py-3.5">${a.equipo}</td>
                        <td class="text-sm text-gray-600 dark:text-gray-300 px-5 py-3.5">${a.zona || 'N/A'}</td>
                        <td class="text-sm text-gray-600 dark:text-gray-300 px-5 py-3.5">${rangoSemana}</td>
                        <td class="text-center px-5 py-3.5">
                            ${st === 'REALIZADA'
                                ? '<span class="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><i class="fas fa-check-circle"></i> Realizada</span>'
                                : st === 'FUERA_DE_TIEMPO'
                                ? '<span class="bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1" title="Realizada fuera de tiempo"><i class="fas fa-clock text-amber-500"></i> Realizada fuera de tiempo</span>': '<span class="bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><i class="fas fa-times-circle"></i> Pendiente</span>'}
                        </td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            }
            wrapper.classList.remove('hidden');
        }

        function filtrarMisAsignaciones() {
            renderTablaMisAsignaciones();
        }

        function setMisAsigFiltroEstado(estado) {
            misAsigFiltroEstado = estado;
            ['Todas', 'Pendientes', 'Realizadas'].forEach(st => {
                const btn = document.getElementById(`btnMisAsigFiltro${st}`);
                if (btn) {
                    if (st.toLowerCase() === estado) {
                        btn.className = "px-2.5 py-1 rounded-md font-medium transition-colors bg-white dark:bg-slate-800 text-gray-800 dark:text-white shadow-sm";
                    } else {
                        btn.className = "px-2.5 py-1 rounded-md font-medium transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white";
                    }
                }
            });
            renderTablaMisAsignaciones();
        }

        async function cargarCumplimientoAnual(anio) {
            const progressAnual = document.getElementById('misAsigProgressAnual');
            const normalizar = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const userNorm = normalizar(loggedUserFullName);

            // Esperar a que las inspecciones estén cargadas para no calcular 0% por carrera con fetchData()
            if (!inspecciones || inspecciones.length === 0) {
                for (let i = 0; i < 100; i++) {
                    if (inspecciones.length > 0) break;
                    await new Promise(r => setTimeout(r, 100));
                }
            }

            try {
                const meses = Array.from({ length: 12 }, (_, i) =>
                    `${anio}-${String(i + 1).padStart(2, '0')}`
                );
                const responses = await Promise.all(
                    meses.map(m => fetch(`${API_BASE}/api/asignaciones/?mes=${m}`).catch(() => null))
                );

                let totalAnual = 0;
                let realizadosAnual = 0;

                for (const res of responses) {
                    if (!res || !res.ok) continue;
                    const data = await res.json();
                    const userAsigs = data.filter(a => normalizar(a.asociado) === userNorm);
                    for (const a of userAsigs) {
                        const realizada = esInspeccionRealizada(a, inspecciones);
                        if (realizada) realizadosAnual++;
                        totalAnual++;
                    }
                }

                if (totalAnual === 0) {
                    progressAnual.classList.add('hidden');
                    const badge = document.getElementById('misAsigAnnualBadge');
                    if (badge) badge.classList.add('hidden');
                    return;
                }

                const pctAnual = Math.round((realizadosAnual / totalAnual) * 100);
                document.getElementById('misAsigProgressAnualText').textContent = `${realizadosAnual} de ${totalAnual} realizados en el año`;
                document.getElementById('misAsigProgressAnualPct').textContent = `${pctAnual}%`;
                document.getElementById('misAsigProgressAnualBar').style.width = `${pctAnual}%`;
                progressAnual.classList.remove('hidden');

                const badge = document.getElementById('misAsigAnnualBadge');
                const badgeText = document.getElementById('misAsigAnnualBadgeText');
                if (badge) badge.classList.remove('hidden');
                if (badgeText) badgeText.textContent = `${pctAnual}%`;

            } catch (err) {
                console.error('Error al cargar cumplimiento anual:', err);
                progressAnual.classList.add('hidden');
            }
        }

        function cerrarSesionMisAsignaciones() {
            cerrarSesionCompleta();
            if (typeof mostrarAlerta === 'function') {
                mostrarAlerta('Sesión Cerrada', 'Has cerrado la sesión completamente.', 'fa-info-circle text-blue-500');
            }
        }
        window.cerrarSesionMisAsignaciones = cerrarSesionMisAsignaciones;

        function imprimirMisAsignaciones() {
            if (!loggedUserFullName) {
                if (typeof mostrarAlerta === 'function') {
                    mostrarAlerta('Atención', 'Debes iniciar sesión para imprimir tus asignaciones.', 'fa-info-circle text-blue-500');
                }
                return;
            }

            const selMes = document.getElementById('misAsigMes');
            let mesVal = selMes ? selMes.value : '';
            if (!mesVal) {
                const ahora = new Date();
                mesVal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
            }

            const [anio, mesNum] = mesVal.split('-');
            const nombresMeses = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            const mesNombre = nombresMeses[parseInt(mesNum, 10) - 1] || mesNum;
            const periodoTexto = `${mesNombre} ${anio}`;

            const searchText = (document.getElementById('misAsigSearch')?.value || '').toLowerCase();

            const filtered = currentMisAsignaciones.filter(a => {
                const eq = (a.equipo || '').toLowerCase();
                const zona = (a.zona || '').toLowerCase();
                const matchesSearch = !searchText || eq.includes(searchText) || zona.includes(searchText);
                if (!matchesSearch) return false;

                const realizada = esInspeccionRealizada(a, inspecciones);

                if (misAsigFiltroEstado === 'realizadas') return realizada;
                if (misAsigFiltroEstado === 'pendientes') return !realizada;
                return true;
            });

            if (filtered.length === 0) {
                if (typeof mostrarAlerta === 'function') {
                    mostrarAlerta('Sin Datos', 'No hay asignaciones para imprimir en la vista actual.', 'fa-info-circle text-blue-500');
                }
                return;
            }

            const totalCount = filtered.length;
            const realizadasCount = filtered.filter(a => esInspeccionRealizada(a, inspecciones)).length;
            const pendientesCount = totalCount - realizadasCount;

            const printWin = window.open('', '_blank');
            if (!printWin) {
                if (typeof mostrarAlerta === 'function') {
                    mostrarAlerta('Error', 'El navegador bloqueó la ventana emergente de impresión. Permita ventanas emergentes para este sitio.', 'fa-exclamation-triangle text-amber-500');
                }
                return;
            }

            const hoy = new Date();
            const fechaImpresion = `${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()} ${String(hoy.getHours()).padStart(2,'0')}:${String(hoy.getMinutes()).padStart(2,'0')}`;

            const rowsHtml = filtered.map((a, idx) => {
                const fInicio = new Date(a.fecha + 'T00:00:00');
                const fFin = new Date(fInicio.getTime() + 6 * 24 * 60 * 60 * 1000);
                const fmtFecha = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                const rangoSemana = `Semana del ${fmtFecha(fInicio)} al ${fmtFecha(fFin)}`;

                const st = evaluarEstadoAsignacion(a, inspecciones);
                let estadoBadge = '';
                if (st === 'REALIZADA') {
                    estadoBadge = '<span class="status-realizada">✔ REALIZADA</span>';
                } else if (st === 'FUERA_DE_TIEMPO') {
                    estadoBadge = '<span class="status-fuera">⏱ REALIZADA FUERA DE TIEMPO</span>';
                } else {
                    estadoBadge = '<span class="status-pendiente">✖ PENDIENTE</span>';
                }

                return `
                    <tr>
                        <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                        <td style="font-weight: bold; color: #003399;">${a.equipo || '-'}</td>
                        <td>${a.zona || 'N/A'}</td>
                        <td>${rangoSemana}</td>
                        <td style="text-align: center;">${estadoBadge}</td>
                        <td style="border-bottom: 1px dashed #ccc;"></td>
                    </tr>
                `;
            }).join('');

            printWin.document.write(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Mis Asignaciones - ${loggedUserFullName} - Goodyear</title>
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 1.2cm;
                        }
                        body {
                            font-family: Arial, Helvetica, sans-serif;
                            font-size: 12px;
                            color: #1e293b;
                            margin: 0;
                            padding: 0;
                            background: #fff;
                        }
                        .header-container {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            border-bottom: 3px solid #003399;
                            padding-bottom: 12px;
                            margin-bottom: 15px;
                        }
                        .brand-title {
                            font-size: 20px;
                            font-weight: bold;
                            color: #003399;
                            margin: 0;
                        }
                        .brand-subtitle {
                            font-size: 13px;
                            font-weight: 600;
                            color: #475569;
                            margin-top: 3px;
                        }
                        .meta-box {
                            text-align: right;
                            font-size: 11px;
                            color: #64748b;
                        }
                        .info-grid {
                            display: flex;
                            gap: 15px;
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            padding: 12px 16px;
                            margin-bottom: 20px;
                        }
                        .info-item {
                            flex: 1;
                        }
                        .info-label {
                            font-size: 10px;
                            text-transform: uppercase;
                            font-weight: bold;
                            color: #64748b;
                            margin-bottom: 2px;
                        }
                        .info-val {
                            font-size: 14px;
                            font-weight: bold;
                            color: #0f172a;
                        }
                        .kpi-container {
                            display: flex;
                            gap: 10px;
                        }
                        .kpi-badge {
                            font-size: 11px;
                            font-weight: bold;
                            padding: 4px 10px;
                            border-radius: 4px;
                            border: 1px solid transparent;
                        }
                        .kpi-total { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
                        .kpi-realizada { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
                        .kpi-pendiente { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }

                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 10px;
                        }
                        th {
                            background-color: #003399;
                            color: #ffffff;
                            font-size: 11px;
                            text-transform: uppercase;
                            font-weight: bold;
                            padding: 8px 10px;
                            text-align: left;
                            border: 1px solid #003399;
                        }
                        td {
                            padding: 8px 10px;
                            border: 1px solid #cbd5e1;
                            font-size: 11px;
                        }
                        tr:nth-child(even) {
                            background-color: #f8fafc;
                        }
                        .status-realizada {
                            color: #15803d;
                            font-weight: bold;
                            font-size: 10.5px;
                        }
                        .status-fuera {
                            color: #b45309;
                            font-weight: bold;
                            font-size: 10.5px;
                        }
                        .status-pendiente {
                            color: #b91c1c;
                            font-weight: bold;
                            font-size: 10.5px;
                        }
                        .footer {
                            margin-top: 30px;
                            font-size: 10px;
                            color: #94a3b8;
                            text-align: center;
                            border-top: 1px solid #e2e8f0;
                            padding-top: 10px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header-container">
                        <div>
                            <div class="brand-title">GOODYEAR - INSPECCIONES ASRS</div>
                            <div class="brand-subtitle">Hoja de Asignaciones Individuales</div>
                        </div>
                        <div class="meta-box">
                            <div><strong>Fecha Impresión:</strong> ${fechaImpresion}</div>
                            <div>Sistema de Gestión de Inspecciones</div>
                        </div>
                    </div>

                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Asociado / Inspector</div>
                            <div class="info-val">${loggedUserFullName}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Período Seleccionado</div>
                            <div class="info-val">${periodoTexto}</div>
                        </div>
                        <div class="info-item" style="text-align: right;">
                            <div class="info-label">Resumen de Asignaciones</div>
                            <div class="kpi-container" style="justify-content: flex-end; margin-top: 2px;">
                                <span class="kpi-badge kpi-total">Total: ${totalCount}</span>
                                <span class="kpi-badge kpi-realizada">Realizadas: ${realizadasCount}</span>
                                <span class="kpi-badge kpi-pendiente">Pendientes: ${pendientesCount}</span>
                            </div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30px; text-align: center;">#</th>
                                <th>Equipo</th>
                                <th>Zona</th>
                                <th>Semana de Inspección</th>
                                <th style="text-align: center; width: 140px;">Estado</th>
                                <th style="width: 120px;">Firma / Obs.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <div class="footer">
                        Goodyear Chile · Dashboard de Inspecciones ASRS · Documento de Control Interno
                    </div>

                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 300);
                        };
                    </script>
                </body>
                </html>
            `);
            printWin.document.close();
        }
        window.imprimirMisAsignaciones = imprimirMisAsignaciones;


