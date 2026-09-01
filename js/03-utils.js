        function getBaseRobotName(nombre) {
            return (nombre || '').replace(/\s+eje\s+[A-Za-z0-9]+/i, '').replace(/\s*\([^)]*\)/, '').trim();
        }

        function poblarSelectMeses() {
            const sel = document.getElementById('asigMesGenerar');
            if (!sel || sel.options.length > 0) return;

            const now = new Date();
            let html = '';
            for (let i = -1; i <= 1; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
                const isSelected = (i === 0);
                html += `<option value="${val}" ${isSelected ? 'selected' : ''}>${label}</option>`;
            }
            sel.innerHTML = html;
        }

        const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        function obtenerNombreMesEspañol(mesStr) {
            if (!mesStr) return '';
            const parts = mesStr.split('-').map(Number);
            if (parts.length >= 2 && parts[1] >= 1 && parts[1] <= 12) {
                return `${MESES_ES[parts[1] - 1]} de ${parts[0]}`;
            }
            return mesStr;
        }
        function poblarSelectMesMisAsignaciones() {
            const sel = document.getElementById('misAsigMes');
            if (!sel || sel.options.length > 0) return;
            const ahora = new Date();
            const currYr = ahora.getFullYear();
            const currMo = ahora.getMonth();
            let html = '';
            for (let i = -6; i <= 6; i++) {
                const d = new Date(currYr, currMo + i, 1);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
                const isSelected = (i === 0);
                html += `<option value="${val}" ${isSelected ? 'selected' : ''}>${label}</option>`;
            }
            sel.innerHTML = html;
        }

        function get4PeriodsOfMonth(year, monthIndex) {
            const lastDay = new Date(year, monthIndex + 1, 0, 12, 0, 0).getDate();
            const p1Start = new Date(year, monthIndex, 1, 12, 0, 0);
            const p1End   = new Date(year, monthIndex, 7, 12, 0, 0);
            const p2Start = new Date(year, monthIndex, 8, 12, 0, 0);
            const p2End   = new Date(year, monthIndex, 14, 12, 0, 0);
            const p3Start = new Date(year, monthIndex, 15, 12, 0, 0);
            const p3End   = new Date(year, monthIndex, 21, 12, 0, 0);
            const p4Start = new Date(year, monthIndex, 22, 12, 0, 0);
            const p4End   = new Date(year, monthIndex, lastDay, 12, 0, 0);
            return [
                { num: 1, start: p1Start, end: p1End, startStr: formatDateYYYYMMDD(p1Start), endStr: formatDateYYYYMMDD(p1End) },
                { num: 2, start: p2Start, end: p2End, startStr: formatDateYYYYMMDD(p2Start), endStr: formatDateYYYYMMDD(p2End) },
                { num: 3, start: p3Start, end: p3End, startStr: formatDateYYYYMMDD(p3Start), endStr: formatDateYYYYMMDD(p3End) },
                { num: 4, start: p4Start, end: p4End, startStr: formatDateYYYYMMDD(p4Start), endStr: formatDateYYYYMMDD(p4End) }
            ];
        }

        function formatDateYYYYMMDD(d) {
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${yr}-${mo}-${day}`;
        }

        function normalizarTexto(s) {
            return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        }

        function matchAsociado(owner, asociado) {
            if (!owner || !asociado) return true;
            const limpiar = s => normalizarTexto(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
            const o = limpiar(owner);
            const a = limpiar(asociado);
            if (o === a) return true;
            const oParts = o.split(/\s+/).filter(p => p.length >= 2);
            const aParts = a.split(/\s+/).filter(p => p.length >= 2);
            return oParts.some(p => aParts.includes(p)) || aParts.some(p => oParts.includes(p));
        }

        function evaluarEstadoAsignacion(asig, inspeccionesList, mesStr) {
            if (!asig || !inspeccionesList || inspeccionesList.length === 0) return 'PENDIENTE';

            const eqNorm = normalizarTexto(asig.equipo);

            // Buscar inspecciones del equipo realizadas por el asociado asignado
            const inspeccionesAsociado = inspeccionesList.filter(i => {
                if (normalizarTexto(i.equipo) !== eqNorm) return false;
                if (i.owner && !matchAsociado(i.owner, asig.asociado)) return false;
                return true;
            });

            if (inspeccionesAsociado.length === 0) return 'PENDIENTE';

            // 1. Si existe alguna antes o dentro de la semana asignada (si existe asig.fecha) -> REALIZADA
            if (asig.fecha) {
                const fAsigStart = new Date(asig.fecha + 'T00:00:00').getTime();
                const fAsigEnd = fAsigStart + 7 * 24 * 60 * 60 * 1000;

                const aTiempo = inspeccionesAsociado.some(i => {
                    const fInsp = new Date(i.fecha + 'T00:00:00').getTime();
                    return fInsp < fAsigEnd;
                });

                if (aTiempo) return 'REALIZADA';

                // 2. Si fue inspeccionada por el asociado pero después de la semana asignada -> FUERA_DE_TIEMPO
                return 'FUERA_DE_TIEMPO';
            }

            // Fallback: si coincide el mes
            if (mesStr) {
                const enMes = inspeccionesAsociado.some(i => i.fecha && i.fecha.startsWith(mesStr));
                if (enMes) return 'REALIZADA';
            }

            return 'PENDIENTE';
        }

        function esInspeccionRealizada(asig, inspeccionesList, mesStr) {
            const st = evaluarEstadoAsignacion(asig, inspeccionesList, mesStr);
            return st === 'REALIZADA' || st === 'FUERA_DE_TIEMPO';
        }

        function cerrarSesionCompleta() {
            // 1. Reset variables de estado global
            isAdminModo = false;
            loggedUser = '';
            loggedUserFullName = '';
            currentMisAsignaciones = [];

            // 2. Eliminar toda la persistencia de autenticación en localStorage
            localStorage.removeItem('isAdminModo');
            localStorage.removeItem('loggedUser');
            localStorage.removeItem('misAsigFullName');
            localStorage.removeItem('misAsigUser');

            // 3. UI Modo Admin
            const adminPanel = document.getElementById('adminPanel');
            if (adminPanel) adminPanel.classList.add('hidden');

            const tabAsig = document.getElementById('tab-asignaciones');
            if (tabAsig) tabAsig.classList.add('hidden');

            const btnModoAdmin = document.getElementById('btnModoAdmin');
            if (btnModoAdmin) {
                btnModoAdmin.innerHTML = '<i class="fas fa-user-shield"></i> <span class="hidden sm:inline">Administrar</span>';
                btnModoAdmin.classList.replace('bg-red-600', 'bg-gray-200');
                if (btnModoAdmin.classList.contains('text-white')) {
                    btnModoAdmin.classList.replace('text-white', 'text-gray-700');
                }
            }

            if (typeof actualizarHeaderAdmin === 'function') {
                actualizarHeaderAdmin();
            }

            // 4. UI Mis Asignaciones
            const misAsigContent = document.getElementById('misAsigContent');
            if (misAsigContent) misAsigContent.classList.add('hidden');

            const misAsigLogin = document.getElementById('misAsigLogin');
            if (misAsigLogin) misAsigLogin.classList.remove('hidden');

            const misAsigForm = document.getElementById('misAsigLoginForm');
            if (misAsigForm) misAsigForm.reset();

            const misAsigError = document.getElementById('misAsigError');
            if (misAsigError) misAsigError.classList.add('hidden');

            // 5. Actualizar renders de tablas
            if (typeof renderTabla === 'function') renderTabla();
            if (typeof renderEquiposSinQR === 'function') renderEquiposSinQR();

            const verFecha = document.getElementById('verFecha')?.value;
            if (verFecha && typeof cargarAsignacionesSemanales === 'function') {
                cargarAsignacionesSemanales();
            }

            // 6. Cambiar a pestaña pública por defecto
            if (typeof switchTab === 'function') {
                switchTab('inspecciones');
            }
        }
        window.cerrarSesionCompleta = cerrarSesionCompleta;


