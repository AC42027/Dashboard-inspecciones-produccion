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
            loggedUserFullName = '';
            currentMisAsignaciones = [];
            localStorage.removeItem('misAsigFullName');
            localStorage.removeItem('misAsigUser');
            document.getElementById('misAsigContent').classList.add('hidden');
            document.getElementById('misAsigLogin').classList.remove('hidden');
            document.getElementById('misAsigLoginForm').reset();
        }

