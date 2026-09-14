        // FILTROS
        const filtros = {
            anio: '', mes: '', owner: '', zona: '', equipo: '', sap: '', critico: ''
        };

        // ELEMENTOS DOM
        const els = {
            loading: document.getElementById('loading'),
            error: document.getElementById('error-message'),
            errorText: document.getElementById('error-text'),
            tablaSection: document.getElementById('tabla-section'),
            tablaBody: document.getElementById('tabla-body'),
            paginacionInfo: document.getElementById('paginacion-info'),
            btnPrev: document.getElementById('btn-prev'),
            btnNext: document.getElementById('btn-next'),
            graficasContainer: document.getElementById('graficas-container'),
            filtros: {
                anio: document.getElementById('filtro-anio'),
                mes: document.getElementById('filtro-mes'),
                owner: document.getElementById('filtro-owner'),
                zona: document.getElementById('filtro-zona'),
                equipo: document.getElementById('filtro-equipo'),
                sap: document.getElementById('filtro-sap'),
                critico: document.getElementById('filtro-critico'),
            },
            filtrosAnalitica: {
                anio: document.getElementById('filtro-analitica-anio'),
                mes: document.getElementById('filtro-analitica-mes'),
                owner: document.getElementById('filtro-analitica-owner'),
                zona: document.getElementById('filtro-analitica-zona'),
                equipo: document.getElementById('filtro-analitica-equipo'),
                sap: document.getElementById('filtro-analitica-sap'),
                critico: document.getElementById('filtro-analitica-critico'),
            }
        };

        // INICIALIZACIÓN
        document.addEventListener('DOMContentLoaded', () => {
            initTheme();
            setupEventListeners();

            // Restaurar sesión admin si existe
            if (localStorage.getItem('isAdminModo') === 'true') {
                isAdminModo = true;
                loggedUser = localStorage.getItem('loggedUser') || '';

                if (isAdminModo) {
                    renderTeamList();
                    syncTeamFromAPI(); // Sincronizar equipo desde el servidor
                    const adminPanel = document.getElementById('adminPanel');
                    if (adminPanel) adminPanel.classList.remove('hidden');

                    const btnModoAdmin = document.getElementById('btnModoAdmin');
                    if (btnModoAdmin) {
                        btnModoAdmin.innerHTML = '<i class="fas fa-times"></i> <span class="hidden sm:inline">Cerrar Admin</span>';
                        btnModoAdmin.classList.replace('bg-gray-200', 'bg-red-600');
                        if (btnModoAdmin.classList.contains('text-gray-700')) {
                            btnModoAdmin.classList.replace('text-gray-700', 'text-white');
                        }
                    }
                    actualizarHeaderAdmin(loggedUser);
                    actualizarDataListsAdmin();
                    document.getElementById('tab-asignaciones').classList.remove('hidden');
                }
            }

            // Restaurar sesión de Mis Asignaciones
            const storedMisAsigUser = localStorage.getItem('misAsigUser');
            const storedMisAsigFullName = localStorage.getItem('misAsigFullName');
            if (storedMisAsigFullName) {
                loggedUserFullName = storedMisAsigFullName;
                document.getElementById('misAsigLogin').classList.add('hidden');
                document.getElementById('misAsigContent').classList.remove('hidden');
                document.getElementById('misAsigUserName').textContent = loggedUserFullName;
                cargarCumplimientoAnual(new Date().getFullYear());
            }

            fetchData();
        });

        // TABS LOGIC
        function switchTab(tab) {
            document.getElementById('view-inspecciones').classList.toggle('hidden', tab !== 'inspecciones');
            const viewAnalitica = document.getElementById('view-analitica');
            if (viewAnalitica) viewAnalitica.classList.toggle('hidden', tab !== 'analitica');
            document.getElementById('view-asignaciones').classList.toggle('hidden', tab !== 'asignaciones');
            document.getElementById('view-equipos-sin-qr').classList.toggle('hidden', tab !== 'equipos-sin-qr');
            document.getElementById('view-mapa').classList.toggle('hidden', tab !== 'mapa');
            document.getElementById('view-mis-asignaciones').classList.toggle('hidden', tab !== 'mis-asignaciones');

            // Ampliar ancho para las pestañas de mapa y asignaciones para mejor visibilidad
            const mainCont = document.querySelector('main');
            if (tab === 'asignaciones' || tab === 'mapa') {
                mainCont.classList.remove('max-w-7xl');
                mainCont.classList.add('max-w-[95%]');
            } else {
                mainCont.classList.add('max-w-7xl');
                mainCont.classList.remove('max-w-[95%]');
            }

            const activeTabClass = 'pb-3 pt-3 border-b-4 border-[#FBBD00] text-[#FBBD00] font-bold text-xs sm:text-sm uppercase tracking-wider bg-[#0B1D45] px-5 rounded-t-lg transition-all flex items-center gap-2';
            const inactiveTabClass = 'pb-3 pt-3 border-b-4 border-transparent text-slate-400 font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-[#0B1D45] hover:text-white px-5 rounded-t-lg transition-all flex items-center gap-2';

            document.getElementById('tab-inspecciones').className = tab === 'inspecciones' ? activeTabClass : inactiveTabClass;
            
            const tabAnalitica = document.getElementById('tab-analitica');
            if (tabAnalitica) {
                tabAnalitica.className = tab === 'analitica' ? activeTabClass : inactiveTabClass;
            }

            const tabAsig = document.getElementById('tab-asignaciones');
            tabAsig.className = tab === 'asignaciones' ? activeTabClass : inactiveTabClass;
            if (!isAdminModo) tabAsig.classList.add('hidden');
            
            const tabEqSinQR = document.getElementById('tab-equipos-sin-qr');
            tabEqSinQR.className = tab === 'equipos-sin-qr' ? activeTabClass : inactiveTabClass;

            const tabMapa = document.getElementById('tab-mapa');
            if (tabMapa) {
                tabMapa.className = tab === 'mapa' ? activeTabClass : inactiveTabClass;
            }
            
            const tabMis = document.getElementById('tab-mis-asignaciones');
            if (tabMis) {
                tabMis.className = tab === 'mis-asignaciones' ? activeTabClass : inactiveTabClass;
            }

            if (tab === 'analitica') {
                renderCharts();
            }

            if (tab === 'equipos-sin-qr') {
                cargarEquiposSinQR();
            }

            if (tab === 'mapa') {
                initMapa();
            }

            if (tab === 'asignaciones') {
                poblarSelectMeses();
                const now = new Date();
                const mesStr = now.toISOString().slice(0, 7);
                // Calcular el lunes de esta semana
                const day = now.getDay() || 7;
                if (day !== 1) now.setHours(-24 * (day - 1));
                const fechaStr = now.toISOString().split('T')[0];

                if (document.getElementById('asigMesGenerar') && !document.getElementById('asigMesGenerar').value) {
                    document.getElementById('asigMesGenerar').value = mesStr;
                }
                if (!document.getElementById('verFecha').value) {
                    document.getElementById('verFecha').value = mesStr;
                    cargarAsignacionesSemanales();
                }
                actualizarFechasSemanas();
            }

            if (tab === 'mis-asignaciones') {
                poblarSelectMesMisAsignaciones();
                if (loggedUserFullName) {
                    cargarMisAsignaciones();
                    cargarCumplimientoAnual(new Date().getFullYear());
                }
            }
        }

        // --- HELPER DE VALIDACIÓN DE INSPECCIÓN REALIZADA ---
