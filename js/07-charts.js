        // CHARTS LOGIC MEJORADO
        window.setChartFilterMode = function(mode) {
            currentChartMode = mode;
            renderCharts();
        };

        function renderCharts() {
            // Destruir gráficos anteriores
            chartInstances.forEach(c => c.destroy());
            chartInstances = [];
            els.graficasContainer.innerHTML = '';

            if (inspeccionesFiltradas.length === 0) {
                els.graficasContainer.innerHTML = `
                    <div class="glass-panel p-8 text-center text-gray-500 dark:text-gray-400">
                        <i class="fas fa-chart-pie text-4xl mb-3 text-gray-400 dark:text-gray-600"></i>
                        <p class="font-semibold text-lg">No hay datos de inspección disponibles</p>
                        <p class="text-xs mt-1">Prueba ajustando los filtros de búsqueda para visualizar gráficos</p>
                    </div>
                `;
                return;
            }

            const isDark = document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#cbd5e1' : '#475569';
            const gridColor = isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)';
            const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
            const tooltipTitleColor = isDark ? '#f8fafc' : '#0f172a';
            const tooltipBodyColor = isDark ? '#cbd5e1' : '#475569';

            // Common Options for Chart.js
            const getCommonOptions = (extraPlugins = {}) => ({
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeOutQuart', delay: (context) => context.type === 'data' ? context.dataIndex * 60 : 0 },
                plugins: {
                    legend: {
                        labels: {
                            color: textColor,
                            font: { family: 'Inter', size: 12, weight: '500' },
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        titleColor: tooltipTitleColor,
                        bodyColor: tooltipBodyColor,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        boxPadding: 6,
                        usePointStyle: true,
                        titleFont: { family: 'Inter', size: 13, weight: 'bold' },
                        bodyFont: { family: 'Inter', size: 12 }
                    },
                    ...extraPlugins
                },
                scales: {
                    x: {
                        ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
                        grid: { color: gridColor },
                        beginAtZero: true
                    }
                }
            });

            // 1. RENDERIZAR BARRA DE CONTROL DE VISTAS
            const navHtml = `
                <div class="glass-panel p-4 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold">
                    <button onclick="setChartFilterMode('all')" class="px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${currentChartMode==='all'?'bg-goodyear-blue text-white shadow-md':'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}">
                        <i class="fas fa-th-large"></i> Vista Completa
                    </button>
                    <button onclick="setChartFilterMode('kpi')" class="px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${currentChartMode==='kpi'?'bg-goodyear-blue text-white shadow-md':'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}">
                        <i class="fas fa-pie-chart"></i> Resumen KPIs
                    </button>
                    <button onclick="setChartFilterMode('zones')" class="px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${currentChartMode==='zones'?'bg-goodyear-blue text-white shadow-md':'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}">
                        <i class="fas fa-layer-group"></i> Detalle por Zonas
                    </button>
                </div>
            `;
            els.graficasContainer.innerHTML = navHtml;

            // 2. RESUMEN EJECUTIVO GLOBAL (KPIs)
            if (currentChartMode === 'all' || currentChartMode === 'kpi') {
                let globalOk = 0;
                let globalNok = 0;
                let conAvisoCount = 0;
                let sinAvisoCount = 0;

                const zonaCounts = {};
                const fechaMap = {};

                inspeccionesFiltradas.forEach(i => {
                    // Contadores de zona
                    const z = i.zona || 'Sin Zona';
                    zonaCounts[z] = (zonaCounts[z] || 0) + 1;

                    // Contadores OK / NOK
                    (i.tecnicos || []).forEach(t => {
                        if (t.estado === 'OK') globalOk++;
                        if (t.estado === 'NOK') globalNok++;
                    });

                    // Avisos SAP
                    if (i.sap_nr_numero) conAvisoCount++;
                    else sinAvisoCount++;

                    // Tendencia fecha (YYYY-MM)
                    const monthKey = (i.fecha && i.fecha.length >= 7) ? i.fecha.substring(0, 7) : 'Sin fecha';
                    if (!fechaMap[monthKey]) fechaMap[monthKey] = { total: 0, nok: 0 };
                    fechaMap[monthKey].total++;
                    (i.tecnicos || []).forEach(t => { if (t.estado === 'NOK') fechaMap[monthKey].nok++; });
                });

                const totalPuntos = globalOk + globalNok;
                const tasaConformidad = totalPuntos > 0 ? ((globalOk / totalPuntos) * 100).toFixed(1) : '100.0';

                const kpiSection = document.createElement('div');
                kpiSection.className = 'glass-panel p-6 space-y-6';
                kpiSection.innerHTML = `
                    <div class="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4">
                        <h3 class="text-lg font-bold text-goodyear-blue dark:text-white uppercase flex items-center gap-2">
                            <i class="fas fa-chart-pie text-goodyear-yellow"></i> Indicadores de Rendimiento Global (KPIs)
                        </h3>
                        <span class="text-xs px-2.5 py-1 rounded-full font-bold ${tasaConformidad >= 90 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}">
                            Condición Operativa: ${tasaConformidad}% OK
                        </span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <!-- Chart K1: Condición Operativa -->
                        <div class="bg-gray-50/70 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between chart-enter" style="animation-delay:0ms">
                            <h4 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 text-center">Tasa de Conformidad</h4>
                            <div class="h-48 relative flex items-center justify-center">
                                <canvas id="kpi-chart-health"></canvas>
                            </div>
                            <div class="flex justify-around text-xs mt-3 pt-2 border-t border-gray-200 dark:border-slate-700">
                                <span class="text-emerald-600 dark:text-emerald-400 font-semibold"><i class="fas fa-circle text-[10px] mr-1"></i>OK: ${globalOk}</span>
                                <span class="text-rose-500 font-semibold"><i class="fas fa-circle text-[10px] mr-1"></i>NOK: ${globalNok}</span>
                            </div>
                        </div>
                        <!-- Chart K2: Inspecciones por Zona -->
                        <div class="bg-gray-50/70 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between chart-enter" style="animation-delay:60ms">
                            <h4 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 text-center">Cantidad por Zona</h4>
                            <div class="h-48 relative">
                                <canvas id="kpi-chart-zonas"></canvas>
                            </div>
                            <p class="text-[11px] text-center text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-slate-700">Distribución de inspecciones registradas</p>
                        </div>
                        <!-- Chart K3: Avisos SAP PM -->
                        <div class="bg-gray-50/70 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between chart-enter" style="animation-delay:120ms">
                            <h4 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 text-center">Estado Avisos SAP PM</h4>
                            <div class="h-48 relative">
                                <canvas id="kpi-chart-sap"></canvas>
                            </div>
                            <div class="flex justify-around text-xs mt-3 pt-2 border-t border-gray-200 dark:border-slate-700">
                                <span class="text-blue-600 dark:text-blue-400 font-semibold">Sin Aviso: ${sinAvisoCount}</span>
                                <span class="text-amber-500 font-semibold">Con Aviso: ${conAvisoCount}</span>
                            </div>
                        </div>
                        <!-- Chart K4: Tendencia Temporal -->
                        <div class="bg-gray-50/70 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between chart-enter" style="animation-delay:180ms">
                            <h4 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 text-center">Evolución Histórica</h4>
                            <div class="h-48 relative">
                                <canvas id="kpi-chart-trend"></canvas>
                            </div>
                            <p class="text-[11px] text-center text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-slate-700">Tendencia mensual de actividad</p>
                        </div>
                    </div>
                `;
                els.graficasContainer.appendChild(kpiSection);

                // Panel Avance de Asociados (ASRS)
                const avancePanel = document.createElement('div');
                avancePanel.className = 'glass-panel p-6 chart-enter';
                avancePanel.id = 'avance-asociados-panel';
                avancePanel.innerHTML = `
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
                        <h3 class="text-lg font-bold text-goodyear-blue dark:text-white uppercase flex items-center gap-2">
                            <i class="fas fa-user-check text-goodyear-yellow"></i> Avance de Asociados (ASRS)
                        </h3>
                        <div class="flex flex-wrap gap-2 text-xs items-center">
                            <span id="avance-asociados-periodo" class="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-goodyear-blue dark:text-blue-300 font-bold rounded-full border border-blue-200 dark:border-blue-800"></span>
                            <span id="avance-asociados-global" class="px-2.5 py-1 font-bold rounded-full border hidden"></span>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-3 mb-4">
                        <label for="avanceAsoMes" class="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Mes</label>
                        <select id="avanceAsoMes" class="glass-input w-48 text-sm font-semibold" onchange="cambiarAvanceMes(this)"></select>
                        <span class="text-[10px] text-gray-400 dark:text-gray-500">La tabla mensual responde a este selector; abajo se muestra el avance del año actual.</span>
                    </div>
                    <div id="avance-asociados-body">
                        <div class="flex items-center justify-center gap-2 py-8 text-gray-400 dark:text-gray-500 text-sm">
                            <i class="fas fa-spinner fa-spin"></i> Calculando avance...
                        </div>
                    </div>
                `;
                els.graficasContainer.appendChild(avancePanel);
                poblarSelectAvanceMes();
                renderAvanceAsociados();

                // DIBUJAR CHARTS GLOBALES
                // Chart K1: Doughnut Condición Operativa
                const ctxHealth = document.getElementById('kpi-chart-health').getContext('2d');
                chartInstances.push(new Chart(ctxHealth, {
                    type: 'doughnut',
                    data: {
                        labels: ['Puntos OK', 'Hallazgos NOK'],
                        datasets: [{
                            data: [globalOk, globalNok],
                            backgroundColor: ['#10b981', '#f43f5e'],
                            hoverOffset: 6,
                            borderWidth: 2,
                            borderColor: isDark ? '#1e293b' : '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '74%',
                        animation: { animateRotate: true, animateScale: true, duration: 900 },
                        plugins: {
                            legend: { display: false },
                            tooltip: getCommonOptions().plugins.tooltip,
                            centerText: {
                                display: true,
                                text: `${tasaConformidad}%`,
                                subtext: 'Condición Operativa'
                            }
                        }
                    }
                }));

                // Chart K2: Bar Zonas
                const ctxZonas = document.getElementById('kpi-chart-zonas').getContext('2d');
                const gradZonas = ctxZonas.createLinearGradient(0, 0, 0, 200);
                gradZonas.addColorStop(0, '#003399');
                gradZonas.addColorStop(1, '#3b82f6');

                chartInstances.push(new Chart(ctxZonas, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(zonaCounts),
                        datasets: [{
                            label: 'Inspecciones',
                            data: Object.values(zonaCounts),
                            backgroundColor: gradZonas,
                            borderRadius: 6,
                            borderSkipped: false
                        }]
                    },
                    options: getCommonOptions({ legend: { display: false } })
                }));

                // Chart K3: Doughnut SAP
                const ctxSap = document.getElementById('kpi-chart-sap').getContext('2d');
                const porcSinSap = inspeccionesFiltradas.length > 0 ? Math.round((sinAvisoCount / inspeccionesFiltradas.length) * 100) : 100;
                chartInstances.push(new Chart(ctxSap, {
                    type: 'doughnut',
                    data: {
                        labels: ['Sin Aviso SAP', 'Con Aviso SAP'],
                        datasets: [{
                            data: [sinAvisoCount, conAvisoCount],
                            backgroundColor: ['#003399', '#f59e0b'],
                            borderWidth: 2,
                            hoverOffset: 6,
                            borderColor: isDark ? '#1e293b' : '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '74%',
                        animation: { animateRotate: true, animateScale: true, duration: 900 },
                        plugins: {
                            legend: { display: false },
                            tooltip: getCommonOptions().plugins.tooltip,
                            centerText: {
                                display: true,
                                text: `${porcSinSap}%`,
                                subtext: 'Sin Aviso'
                            }
                        }
                    }
                }));

                // Chart K4: Line Trend
                const sortedMonths = Object.keys(fechaMap).sort();
                const trendDataTotal = sortedMonths.map(m => fechaMap[m].total);
                const trendDataNok = sortedMonths.map(m => fechaMap[m].nok);

                const ctxTrend = document.getElementById('kpi-chart-trend').getContext('2d');
                const gradLine = ctxTrend.createLinearGradient(0, 0, 0, 180);
                gradLine.addColorStop(0, 'rgba(0, 51, 153, 0.4)');
                gradLine.addColorStop(1, 'rgba(0, 51, 153, 0.0)');

                chartInstances.push(new Chart(ctxTrend, {
                    type: 'line',
                    data: {
                        labels: sortedMonths.length > 0 ? sortedMonths : ['Actual'],
                        datasets: [
                            {
                                label: 'Inspecciones',
                                data: trendDataTotal.length > 0 ? trendDataTotal : [inspeccionesFiltradas.length],
                                borderColor: '#003399',
                                backgroundColor: gradLine,
                                fill: true,
                                tension: 0.4,
                                pointBackgroundColor: '#ffd200',
                                pointRadius: 4
                            },
                            {
                                label: 'Hallazgos NOK',
                                data: trendDataNok.length > 0 ? trendDataNok : [globalNok],
                                borderColor: '#f43f5e',
                                backgroundColor: 'transparent',
                                borderWidth: 2,
                                tension: 0.4,
                                pointRadius: 3
                            }
                        ]
                    },
                    options: getCommonOptions()
                }));
            }

            // 3. DESGLOSE DETALLADO POR ZONAS
            if (currentChartMode === 'all' || currentChartMode === 'zones') {
                const inspeccionesPorZona = inspeccionesFiltradas.reduce((acc, i) => {
                    const z = i.zona || 'Sin Zona';
                    if (!acc[z]) acc[z] = [];
                    acc[z].push(i);
                    return acc;
                }, {});

                Object.entries(inspeccionesPorZona).forEach(([zona, datos], index) => {
                    const idDiv = `zona-chart-${index}`;

                    // Calcular métricas de la zona
                    let zOk = 0;
                    let zNok = 0;
                    let zSap = 0;
                    datos.forEach(d => {
                        if (d.sap_nr_numero) zSap++;
                        (d.tecnicos || []).forEach(t => {
                            if (t.estado === 'OK') zOk++;
                            if (t.estado === 'NOK') zNok++;
                        });
                    });
                    const zTotalPts = zOk + zNok;
                    const zConformidad = zTotalPts > 0 ? ((zOk / zTotalPts) * 100).toFixed(1) : '100.0';

                    const zoneContainer = document.createElement('div');
                    zoneContainer.className = 'glass-panel p-6 space-y-6 chart-enter';
                    zoneContainer.style.animationDelay = `${index * 80}ms`;
                    zoneContainer.innerHTML = `
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-200 dark:border-slate-700 pb-4">
                            <h3 class="text-xl font-bold text-goodyear-blue dark:text-white uppercase flex items-center gap-2">
                                <i class="fas fa-industry text-goodyear-yellow"></i> Zona: ${zona}
                            </h3>
                            <div class="flex flex-wrap gap-2 text-xs">
                                <span class="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-goodyear-blue dark:text-blue-300 font-semibold rounded-full border border-blue-200 dark:border-blue-800">
                                    ${datos.length} Inspecciones
                                </span>
                                <span class="px-2.5 py-1 font-semibold rounded-full border ${zConformidad >= 90 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'}">
                                    Conformidad: ${zConformidad}% OK
                                </span>
                                ${zSap > 0 ? `<span class="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold rounded-full border border-amber-200 dark:border-amber-800"><i class="fas fa-exclamation-circle mr-1"></i>${zSap} Avisos SAP</span>` : ''}
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <!-- Chart 1: Inspecciones por equipo -->
                            <div class="bg-gray-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50">
                                <h4 class="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <i class="fas fa-list-ol text-goodyear-blue dark:text-goodyear-yellow"></i> Cantidad por Equipo
                                </h4>
                                <div class="h-64 relative"><canvas id="${idDiv}-1"></canvas></div>
                            </div>
                            <!-- Chart 2: OK vs NOK por equipo -->
                            <div class="bg-gray-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50">
                                <h4 class="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <i class="fas fa-check-double text-emerald-600"></i> Hallazgos OK vs NOK
                                </h4>
                                <div class="h-64 relative"><canvas id="${idDiv}-2"></canvas></div>
                            </div>
                            <!-- Chart 3: Nivel de Conformidad % -->
                            <div class="bg-gray-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50">
                                <h4 class="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <i class="fas fa-cogs text-goodyear-blue dark:text-goodyear-yellow"></i> Condición Operativa % por Equipo
                                </h4>
                                <div class="h-64 relative"><canvas id="${idDiv}-3"></canvas></div>
                            </div>
                        </div>
                    `;
                    els.graficasContainer.appendChild(zoneContainer);

                    // PROCESAR DATOS DE LA ZONA
                    const dEquipo = datos.reduce((acc, i) => { acc[i.equipo] = (acc[i.equipo] || 0) + 1; return acc; }, {});
                    const labels1 = Object.keys(dEquipo);
                    const data1 = Object.values(dEquipo);

                    const dataOkNokMap = datos.reduce((acc, i) => {
                        if (!acc[i.equipo]) acc[i.equipo] = { OK: 0, NOK: 0 };
                        (i.tecnicos || []).forEach((t) => {
                            if (t.estado === 'OK') acc[i.equipo].OK++;
                            if (t.estado === 'NOK') acc[i.equipo].NOK++;
                        });
                        return acc;
                    }, {});
                    const labels2 = Object.keys(dataOkNokMap);
                    const dataOk = labels2.map(k => dataOkNokMap[k].OK);
                    const dataNok = labels2.map(k => dataOkNokMap[k].NOK);
                    const dataHealth = labels2.map(k => {
                        const tot = dataOkNokMap[k].OK + dataOkNokMap[k].NOK;
                        return tot > 0 ? parseFloat(((dataOkNokMap[k].OK / tot) * 100).toFixed(1)) : 100;
                    });

                    // DIBUJAR GRAFICOS DE LA ZONA
                    // Chart 1: Volume
                    const ctx1 = document.getElementById(`${idDiv}-1`).getContext('2d');
                    const grad1 = ctx1.createLinearGradient(0, 0, 0, 240);
                    grad1.addColorStop(0, '#003399');
                    grad1.addColorStop(1, '#2563eb');

                    chartInstances.push(new Chart(ctx1, {
                        type: 'bar',
                        data: {
                            labels: labels1,
                            datasets: [{
                                label: 'Inspecciones',
                                data: data1,
                                backgroundColor: grad1,
                                borderRadius: 6,
                                borderSkipped: false
                            }]
                        },
                        options: getCommonOptions({ legend: { display: false } })
                    }));

                    // Chart 2: OK vs NOK Grouped Bar
                    const ctx2 = document.getElementById(`${idDiv}-2`).getContext('2d');
                    const gradOk = ctx2.createLinearGradient(0, 0, 0, 240);
                    gradOk.addColorStop(0, '#10b981');
                    gradOk.addColorStop(1, '#059669');

                    const gradNok = ctx2.createLinearGradient(0, 0, 0, 240);
                    gradNok.addColorStop(0, '#f43f5e');
                    gradNok.addColorStop(1, '#be123c');

                    chartInstances.push(new Chart(ctx2, {
                        type: 'bar',
                        data: {
                            labels: labels2,
                            datasets: [
                                { label: 'OK', data: dataOk, backgroundColor: gradOk, borderRadius: 6, borderSkipped: false },
                                { label: 'NOK', data: dataNok, backgroundColor: gradNok, borderRadius: 6, borderSkipped: false }
                            ]
                        },
                        options: getCommonOptions()
                    }));

                    // Chart 3: Health Index Horizontal Bar
                    const ctx3 = document.getElementById(`${idDiv}-3`).getContext('2d');
                    chartInstances.push(new Chart(ctx3, {
                        type: 'bar',
                        data: {
                            labels: labels2,
                            datasets: [{
                                label: 'Conformidad (%)',
                                data: dataHealth,
                                backgroundColor: dataHealth.map(val => val >= 90 ? '#10b981' : val >= 75 ? '#f59e0b' : '#f43f5e'),
                                borderRadius: 6,
                                borderSkipped: false
                            }]
                        },
                        options: {
                            indexAxis: 'y',
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: getCommonOptions().animation,
                            plugins: getCommonOptions({ legend: { display: false } }).plugins,
                            scales: {
                                x: {
                                    max: 100,
                                    ticks: { color: textColor, font: { family: 'Inter', size: 11 }, callback: v => `${v}%` },
                                    grid: { color: gridColor }
                                },
                                y: {
                                    ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
                                    grid: { display: false }
                                }
                            }
                        }
                    }));
                });
            }
        }

        let avanceRenderToken = 0;
        const avanceMesFetchCache = {}; // YYYY-MM -> Promise<Array>
        const avanceState = { mes: '' }; // Selector propio del panel (persiste entre renders)

        async function fetchAsigMes(mes) {
            if (avanceMesFetchCache[mes]) return avanceMesFetchCache[mes];
            const p = (async () => {
                try {
                    const res = await fetch(`${API_BASE}/api/asignaciones/?mes=${mes}`);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    return Array.isArray(data) ? data : [];
                } catch (e) {
                    throw e;
                }
            })();
            avanceMesFetchCache[mes] = p;
            p.catch(() => { delete avanceMesFetchCache[mes]; });
            return p;
        }

        function poblarSelectAvanceMes() {
            const sel = document.getElementById('avanceAsoMes');
            if (!sel) return;
            const ahora = new Date();
            const currYr = ahora.getFullYear();
            const currMo = ahora.getMonth();
            let html = '';
            for (let i = -6; i <= 6; i++) {
                const d = new Date(currYr, currMo + i, 1);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                html += `<option value="${val}">${MESES_ES[d.getMonth()]} ${d.getFullYear()}</option>`;
            }
            sel.innerHTML = html;
            if (!avanceState.mes) {
                avanceState.mes = sel.value;
            } else if ([...sel.options].some(o => o.value === avanceState.mes)) {
                sel.value = avanceState.mes;
            } else {
                avanceState.mes = sel.value;
            }
        }

        window.cambiarAvanceMes = function (sel) {
            avanceState.mes = sel.value;
            renderAvanceAsociados();
        };

        const badgeAvanceCls = (pct) => pct >= 90
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            : pct >= 75
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-800';

        function calcularAvance(asignaciones) {
            const porAsociado = {};
            asignaciones.forEach(a => {
                if (!a.asociado) return;
                const mesAsig = a.fecha ? a.fecha.substring(0, 7) : '';
                if (!porAsociado[a.asociado]) porAsociado[a.asociado] = { asignadas: 0, realizadas: 0, fueraTiempo: 0, pendientes: 0 };
                const st = evaluarEstadoAsignacion(a, inspecciones, mesAsig);
                const acc = porAsociado[a.asociado];
                acc.asignadas++;
                if (st === 'REALIZADA') acc.realizadas++;
                else if (st === 'FUERA_DE_TIEMPO') acc.fueraTiempo++;
                else acc.pendientes++;
            });
            const filas = Object.entries(porAsociado).map(([aso, c]) => {
                const pct = c.asignadas > 0 ? ((c.realizadas + c.fueraTiempo) / c.asignadas) * 100 : 0;
                return { aso, c, pct: Math.round(pct * 10) / 10 };
            }).sort((a, b) => b.pct - a.pct || a.aso.localeCompare(b.aso));
            const totalAsig = Object.values(porAsociado).reduce((s, c) => s + c.asignadas, 0);
            const totalReal = Object.values(porAsociado).reduce((s, c) => s + c.realizadas + c.fueraTiempo, 0);
            return { filas, totalAsig, totalReal, pctGlobal: totalAsig > 0 ? Math.round((totalReal / totalAsig) * 100) : 0 };
        }

        const estadoPill = (tex, bs) => `<span class="${bs}">${tex}</span>`;

        function renderAvanceTabla(filas) {
            if (filas.length === 0) {
                return `<div class="flex items-center justify-center gap-2 py-6 text-gray-500 dark:text-gray-400 text-sm"><i class="fas fa-inbox"></i> Sin asignaciones en el período.</div>`;
            }
            return `<div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                                    <th class="px-3 py-2.5 font-bold">Asociado</th>
                                    <th class="px-3 py-2.5 font-bold text-center">Asignados</th>
                                    <th class="px-3 py-2.5 font-bold text-center">Realizadas</th>
                                    <th class="px-3 py-2.5 font-bold text-center">Fuera de tiempo</th>
                                    <th class="px-3 py-2.5 font-bold text-center">Pendientes</th>
                                    <th class="px-3 py-2.5 font-bold text-left min-w-[220px]">% Avance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filas.map(f => {
                                    const barCls = f.pct >= 90 ? 'bg-green-500' : f.pct >= 75 ? 'bg-amber-500' : 'bg-rose-500';
                                    const pctCls = f.pct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : f.pct >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
                                    return `
                                    <tr class="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors border-b border-gray-100 dark:border-slate-700/50">
                                        <td class="font-bold text-goodyear-blue dark:text-blue-400 px-3 py-2.5">${f.aso}</td>
                                        <td class="text-center text-gray-700 dark:text-gray-300 px-3 py-2.5">${f.c.asignadas}</td>
                                        <td class="text-center px-3 py-2.5">${estadoPill(f.c.realizadas, 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800')}</td>
                                        <td class="text-center px-3 py-2.5">${estadoPill(f.c.fueraTiempo, 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800')}</td>
                                        <td class="text-center px-3 py-2.5">${estadoPill(f.c.pendientes, 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800')}</td>
                                        <td class="px-3 py-2.5">
                                            <div class="flex items-center gap-2">
                                                <div class="flex-1 h-2 rounded-full bg-gray-100 dark:bg-slate-700 relative overflow-hidden">
                                                    <div class="${barCls} h-full rounded-full transition-all duration-700" style="width:${f.pct}%"></div>
                                                </div>
                                                <span class="w-14 text-right font-extrabold text-xs ${pctCls}">${f.pct}%</span>
                                            </div>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>`;
        }

        async function renderAvanceAsociados() {
            const panel = document.getElementById('avance-asociados-panel');
            if (!panel) return;
            const body = document.getElementById('avance-asociados-body');
            const periodoEl = document.getElementById('avance-asociados-periodo');
            const globalEl = document.getElementById('avance-asociados-global');
            const token = ++avanceRenderToken;

            // Esperar a que las inspecciones estén cargadas para no calcular 0% por carrera
            if (!inspecciones || inspecciones.length === 0) {
                for (let i = 0; i < 100; i++) {
                    if (inspecciones.length > 0) break;
                    await new Promise(r => setTimeout(r, 100));
                }
            }

            if (!avanceState.mes) {
                const ahora = new Date();
                avanceState.mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
            }
            const selMes = document.getElementById('avanceAsoMes');
            if (selMes) selMes.value = avanceState.mes;

            const anioAnual = new Date().getFullYear();
            const mesesAnual = Array.from({ length: 12 }, (_, i) => `${anioAnual}-${String(i + 1).padStart(2, '0')}`);

            try {
                const [mesDatos, ...anuDatos] = await Promise.all([
                    fetchAsigMes(avanceState.mes).catch(() => null),
                    ...mesesAnual.map(m => fetchAsigMes(m).catch(() => null))
                ]);
                if (token !== avanceRenderToken) return;

                periodoEl.textContent = obtenerNombreMesEspañol(avanceState.mes);

                if (mesDatos === null) {
                    body.innerHTML = `
                        <div class="flex items-center justify-center gap-2 py-8 text-red-500 text-sm font-medium">
                            <i class="fas fa-wifi"></i> Error de conexión al cargar asignaciones. Consultar a Manuel Rivera en caso de persistir.
                        </div>`;
                    return;
                }

                const mensual = calcularAvance(mesDatos);
                const anual = calcularAvance([].concat(...anuDatos.filter(Boolean)));

                globalEl.className = `px-2.5 py-1 font-bold rounded-full border inline-flex items-center gap-1 ${badgeAvanceCls(mensual.pctGlobal)}`;
                globalEl.innerHTML = `<i class="fas fa-percent"></i> ${mensual.totalReal}/${mensual.totalAsig} · ${mensual.pctGlobal}%`;
                globalEl.classList.remove('hidden');

                const badgeAnual = `<span class="px-2.5 py-1 font-bold rounded-full border inline-flex items-center gap-1 ${badgeAvanceCls(anual.pctGlobal)}"><i class="fas fa-percent"></i> ${anual.totalReal}/${anual.totalAsig} · ${anual.pctGlobal}%</span>`;

                body.innerHTML = `
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                <i class="fas fa-calendar-day text-goodyear-blue dark:text-goodyear-yellow"></i> Avance Mensual ${obtenerNombreMesEspañol(avanceState.mes)}
                            </h4>
                        </div>
                        ${renderAvanceTabla(mensual.filas)}
                    </div>
                    <div class="mt-8 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <h4 class="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                <i class="fas fa-calendar-week text-goodyear-yellow"></i> Avance Anual ${anioAnual}
                            </h4>
                            ${badgeAnual}
                        </div>
                        ${renderAvanceTabla(anual.filas)}
                    </div>
                    <p class="text-[10px] text-gray-400 dark:text-gray-500 mt-4">
                        Avance = equipos asignados que ya fueron inspeccionados (Realizadas + Fuera de tiempo) sobre el total asignado. El % anual agrega los 12 meses del año.
                    </p>`;
            } catch (err) {
                console.error('[AvanceAsociados] error:', err);
                if (token !== avanceRenderToken) return;
                body.innerHTML = `
                    <div class="flex items-center justify-center gap-2 py-8 text-red-500 text-sm font-medium">
                        <i class="fas fa-exclamation-triangle"></i> Error al calcular el avance de asociados.
                    </div>`;
            }
        }

        window.exportarExcel = function () {
            if (inspeccionesFiltradas.length === 0) {
                mostrarAlerta('Información', 'No hay datos para exportar.', 'fa-info-circle text-blue-500');
                return;
            }

            const datos = inspeccionesFiltradas.map(i => ({
                Fecha: i.fecha,
                "Hora Inicio": formatearHora(i.horaInicio),
"Hora Fin": formatearHora(i.horaFin),
                 Zona: i.zona,
                Equipo: i.equipo,
                Owner: i.owner,
                OK: i.tecnicos.filter((t) => t.estado === 'OK').length,
                NOK: i.tecnicos.filter((t) => t.estado === 'NOK').length,
                "Observaciones Generales": i.observaciones || '',
                "Aviso SAP PM": i.sap_nr_numero || 'Sin aviso',
                "Estado SAP": i.sap_nr_status || '',
                "SAP Código Equipo": i.sap_equnr || '',
                "SAP Ubic. Técnica": i.sap_tplnr || '',
            }));

            const ws = XLSX.utils.json_to_sheet(datos);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Inspecciones');

            // Ajustar ancho de columnas automáticamente
            const colWidths = [
                { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
                { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 },
                { wch: 8 }, { wch: 8 }, { wch: 30 }, { wch: 15 },
                { wch: 15 }, { wch: 15 }, { wch: 15 }
            ];
            ws['!cols'] = colWidths;

            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
            saveAs(blob, `Inspecciones_${new Date().toISOString().split('T')[0]}.xlsx`);
        };

