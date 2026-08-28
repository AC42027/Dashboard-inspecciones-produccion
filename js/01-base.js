        // ESTADO GLOBAL
        let inspecciones = [];
        let inspeccionesFiltradas = [];
        let filaExpandida = null;
        let paginaActual = 1;
        const inspeccionesPorPagina = 30;
        let chartInstances = []; // Para destruir charts previos al re-renderizar
        let currentChartMode = 'all'; // 'all' | 'kpi' | 'zones' | 'trend'

        // Register Center Text Plugin for Doughnut Charts
        if (typeof Chart !== 'undefined') {
            const centerTextPlugin = {
                id: 'centerTextPlugin',
                afterDraw(chart) {
                    if (chart.config.options && chart.config.options.plugins && chart.config.options.plugins.centerText) {
                        const config = chart.config.options.plugins.centerText;
                        if (!config.display) return;
                        const { ctx, width, height } = chart;
                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        const isDark = document.documentElement.classList.contains('dark');
                        
                        ctx.font = 'bold 22px Inter, sans-serif';
                        ctx.fillStyle = config.color || (isDark ? '#f8fafc' : '#0f172a');
                        ctx.fillText(config.text || '', width / 2, height / 2 - (config.subtext ? 8 : 0));
                        
                        if (config.subtext) {
                            ctx.font = '500 11px Inter, sans-serif';
                            ctx.fillStyle = config.subtextColor || (isDark ? '#94a3b8' : '#64748b');
                            ctx.fillText(config.subtext, width / 2, height / 2 + 14);
                        }
                        ctx.restore();
                    }
                }
            };
            try { Chart.register(centerTextPlugin); } catch(e) {}
        }

        // FUNCIÓN DE FALLBACK PARA DEMO
        window.cargarDatosDemo = function() {
            inspecciones = [
                { id: 1, fecha: "2026-08-01", horaInicio: "08:00", horaFin: "09:30", zona: "ASRS 1", equipo: "Robot Prensa 01", owner: "Manuel Rivera", tecnicos: [{estado: "OK"}, {estado: "OK"}, {estado: "OK"}, {estado: "NOK"}], observaciones: "Sensor desalineado", sap_nr_numero: "10029481", sap_nr_status: "ABIE" },
                { id: 2, fecha: "2026-08-02", horaInicio: "10:00", horaFin: "11:15", zona: "ASRS 1", equipo: "Transelevador 02", owner: "Juan Perez", tecnicos: [{estado: "OK"}, {estado: "OK"}, {estado: "OK"}], observaciones: "Funcionamiento normal", sap_nr_numero: null },
                { id: 3, fecha: "2026-08-03", horaInicio: "14:00", horaFin: "15:00", zona: "ASRS 2", equipo: "Convector 01", owner: "Carlos Lopez", tecnicos: [{estado: "OK"}, {estado: "NOK"}, {estado: "OK"}], observaciones: "Ruido anormal en rodillo", sap_nr_numero: "10029512", sap_nr_status: "CERR" },
                { id: 4, fecha: "2026-08-03", horaInicio: "16:00", horaFin: "17:20", zona: "ASRS 2", equipo: "Robot Prensa 02", owner: "Manuel Rivera", tecnicos: [{estado: "OK"}, {estado: "OK"}, {estado: "OK"}, {estado: "OK"}], observaciones: "Sin novedades", sap_nr_numero: null },
                { id: 5, fecha: "2026-07-28", horaInicio: "09:00", horaFin: "10:00", zona: "Prensa", equipo: "Prensa Vulcanizadora 05", owner: "Pedro Gomez", tecnicos: [{estado: "OK"}, {estado: "OK"}, {estado: "NOK"}], observaciones: "Fuga de aceite hidráulico", sap_nr_numero: "10029300", sap_nr_status: "NOPR" },
                { id: 6, fecha: "2026-07-29", horaInicio: "11:00", horaFin: "12:00", zona: "Prensa", equipo: "Prensa Vulcanizadora 06", owner: "Pedro Gomez", tecnicos: [{estado: "OK"}, {estado: "OK"}, {estado: "OK"}], observaciones: "Optimización realizada", sap_nr_numero: null },
                { id: 7, fecha: "2026-08-04", horaInicio: "08:30", horaFin: "09:45", zona: "ASRS 1", equipo: "Robot Prensa 01", owner: "Carlos Lopez", tecnicos: [{estado: "OK"}, {estado: "OK"}, {estado: "OK"}], observaciones: "Ajuste de fotocelda", sap_nr_numero: null }
            ];
            els.loading.classList.add('hidden');
            els.error.classList.add('hidden');
            els.tablaSection.classList.remove('hidden');
            els.graficasContainer.classList.remove('hidden');
            actualizarOpcionesSelects();
            aplicarFiltros();
        };

        // ASIGNACIONES MODO
        let isAdminModo = false;
        let loggedUser = '';
        let asignacionesActuales = []; // Las obtenidas de la BD para mostrar
        let asignacionesGuardadas = false; // Controla habilitación del botón Exportar
        let asignacionesPreview = []; // Las generadas temporalmente antes de guardar
        let esGeneracionAuto = false; // Flag para no sobrescribir asignaciones manuales previas

        const API_BASE = (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? `http://${window.location.hostname}:8080` : 'http://10.107.194.110:8080';

        function buildCraneGroupsFromAPI(equipos) {
            const cranes = equipos.filter(e => (e.categoria || '').toLowerCase() === 'crane' || /^crane\s+\d+$/i.test(e.nombre || ''));
            const groups = {};
            const conveyorCodes = new Set();
            cranes.forEach(crane => {
                const match = (crane.nombre || '').match(/Crane\s+(\d+)/i);
                if (!match) return;
                const n = parseInt(match[1], 10);
                const key = `Crane ${n}`;
                const inbound = [];
                const outbound = [];
                equipos.forEach(eq => {
                    const ubic = (eq.ubicacion || '').toLowerCase();
                    if (ubic.includes(`inbound crane ${n}`)) inbound.push(eq.nombre || eq.equipo);
                    else if (ubic.includes(`outbound crane ${n}`)) outbound.push(eq.nombre || eq.equipo);
                });
                groups[key] = { crane: crane.nombre, inbound, outbound };
                inbound.forEach(c => conveyorCodes.add(c));
                outbound.forEach(c => conveyorCodes.add(c));
            });
            return { groups, conveyorCodes };
        }

        let craneGroupsCache = null;

        function cargarTeam() {
            const guardado = localStorage.getItem('asrsTeam');
            if (guardado) {
                try { return JSON.parse(guardado); } catch (e) { /* ignorar */ }
            }
            return [
                "Enzo Muñoz", "Claudio Ramirez", "Christian Zuñiga", "Carlos Silva",
                "Marco Yañez", "Luis Mella", "Cristian Curin", "Javier Pincheira",
                "Sergio Muñoz", "Nelson Ingles", "Cristopher Valenzuela", "Jaime Plaza",
                "Jose Saez", "Martin Orellana"
            ];
        }
        async function guardarTeam() {
            localStorage.setItem('asrsTeam', JSON.stringify(asrsTeam));
            try {
                await fetch(`${API_BASE}/api/equipo/`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombres: asrsTeam })
                });
            } catch (e) {
                console.warn('No se pudo guardar equipo en el servidor, solo en localStorage');
            }
        }
        async function syncTeamFromAPI() {
            try {
                const res = await fetch(`${API_BASE}/api/equipo/`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.nombres && Array.isArray(data.nombres) && data.nombres.length > 0) {
                        asrsTeam.length = 0;
                        asrsTeam.push(...data.nombres);
                        localStorage.setItem('asrsTeam', JSON.stringify(asrsTeam));
                        renderTeamList();
                    }
                }
            } catch (e) {
                console.warn('No se pudo sincronizar equipo desde el servidor, usando localStorage');
            }
        }
        const asrsTeam = cargarTeam();

