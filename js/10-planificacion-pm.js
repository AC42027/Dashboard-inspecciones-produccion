        let pmCandidatos = [];

        function escaparHtmlPM(valor) {
            return String(valor == null ? '' : valor)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function fechaLocalPM(fecha) {
            if (!fecha) return null;
            const partes = String(fecha).slice(0, 10).split('-').map(Number);
            if (partes.length !== 3 || partes.some(Number.isNaN)) return null;
            return new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        }

        function diasDesdePM(fecha) {
            const origen = fechaLocalPM(fecha);
            if (!origen) return 0;
            const hoy = new Date();
            hoy.setHours(12, 0, 0, 0);
            return Math.max(0, Math.floor((hoy - origen) / 86400000));
        }

        function formatearFechaPM(fecha) {
            const date = fechaLocalPM(fecha);
            return date
                ? date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Sin fecha';
        }

        function normalizarEstadoSapPM(valor) {
            const estado = String(valor || '').toUpperCase();
            if (!estado) return '';
            if (estado.includes('CERR') || estado.includes('COMP') || estado.includes('NOCO') || estado.includes('CLOS') || estado.includes('MECE')) return 'cerrado';
            if (estado.includes('ABIE') || estado.includes('OPEN') || estado.includes('NOPR')) return 'abierto';
            return '';
        }

        function obtenerEstadoSapPM(inspeccion) {
            const aviso = String(inspeccion.sap_nr_numero || '').trim();
            const estadoConsultado = typeof estadoAvisoSap === 'function' ? estadoAvisoSap(aviso) : '';
            const estadoInspeccion = normalizarEstadoSapPM(inspeccion.sap_nr_status);
            const infoSap = typeof sapStatusMap !== 'undefined' && sapStatusMap ? sapStatusMap[aviso] : null;
            const estadoDetalleSap = normalizarEstadoSapPM(
                `${infoSap?.status || ''} ${infoSap?.description || ''} ${infoSap?.system_status || ''} ${infoSap?.user_status || ''} ${(infoSap?.statuses || []).join(' ')}`
            );

            if ([estadoConsultado, estadoInspeccion, estadoDetalleSap].includes('cerrado')) {
                return 'cerrado';
            }
            if ([estadoInspeccion, estadoDetalleSap].includes('abierto')) {
                return 'abierto';
            }
            return '';
        }

        function esCriticoPM(item) {
            return item.es_critico === true || item.es_critico === 1 || item.es_critico === 'true';
        }

        function construirCandidatosPM() {
            const agrupados = {};

            (Array.isArray(inspecciones) ? inspecciones : []).forEach(inspeccion => {
                const aviso = String(inspeccion.sap_nr_numero || '').trim();
                if (!aviso) return;

                const estadoSap = obtenerEstadoSapPM(inspeccion);
                if (estadoSap !== 'abierto') return;

                const tecnicos = Array.isArray(inspeccion.tecnicos) ? inspeccion.tecnicos : [];
                const hallazgos = tecnicos.filter(item =>
                    item.estado === 'NOK' || esCriticoPM(item) || (item.comentario && item.comentario.trim())
                );

                if (!agrupados[aviso]) {
                    agrupados[aviso] = {
                        aviso,
                        estadoSap,
                        critico: false,
                        fechaPrimerReporte: inspeccion.fecha,
                        fechaUltimoReporte: inspeccion.fecha,
                        equipo: inspeccion.equipo || 'Equipo sin identificar',
                        zona: inspeccion.zona || 'Sin zona',
                        owner: inspeccion.owner || '',
                        inspecciones: [],
                        hallazgos: []
                    };
                }

                const candidato = agrupados[aviso];
                candidato.estadoSap = 'abierto';
                if (inspeccion.fecha && (!candidato.fechaPrimerReporte || inspeccion.fecha < candidato.fechaPrimerReporte)) {
                    candidato.fechaPrimerReporte = inspeccion.fecha;
                }
                if (inspeccion.fecha && (!candidato.fechaUltimoReporte || inspeccion.fecha > candidato.fechaUltimoReporte)) {
                    candidato.fechaUltimoReporte = inspeccion.fecha;
                    candidato.equipo = inspeccion.equipo || candidato.equipo;
                    candidato.zona = inspeccion.zona || candidato.zona;
                    candidato.owner = inspeccion.owner || candidato.owner;
                }

                candidato.inspecciones.push(inspeccion);
                hallazgos.forEach(item => {
                    const critico = esCriticoPM(item);
                    candidato.critico = candidato.critico || critico;
                    candidato.hallazgos.push({
                        descripcion: item.descripcion || 'Hallazgo sin descripción',
                        comentario: item.comentario || '',
                        estado: item.estado || '',
                        critico,
                        fecha: inspeccion.fecha
                    });
                });
            });

            return Object.values(agrupados).map(candidato => {
                candidato.antiguedad = diasDesdePM(candidato.fechaPrimerReporte);
                candidato.hallazgos.sort((a, b) =>
                    Number(b.critico) - Number(a.critico)
                    || String(b.fecha || '').localeCompare(String(a.fecha || ''))
                );
                return candidato;
            }).sort((a, b) =>
                Number(b.critico) - Number(a.critico)
                || b.antiguedad - a.antiguedad
                || String(a.fechaPrimerReporte).localeCompare(String(b.fechaPrimerReporte))
            );
        }

        function filtrarCandidatosPM(candidatos) {
            const busqueda = (document.getElementById('pm-filtro-busqueda')?.value || '').toLowerCase().trim();
            const criticidad = document.getElementById('pm-filtro-criticidad')?.value || '';
            return candidatos.filter(item => {
                const textoHallazgos = item.hallazgos.map(h => `${h.descripcion} ${h.comentario}`).join(' ');
                const texto = `${item.aviso} ${item.equipo} ${item.zona} ${item.owner} ${textoHallazgos}`.toLowerCase();
                return (!busqueda || texto.includes(busqueda))
                    && (!criticidad || (criticidad === 'critico' ? item.critico : !item.critico));
            });
        }

        function actualizarKpisPM(candidatos) {
            document.getElementById('pm-kpi-pendientes').textContent = candidatos.length;
            document.getElementById('pm-kpi-criticos').textContent = candidatos.filter(item => item.critico).length;
            document.getElementById('pm-kpi-vencidos').textContent = candidatos.filter(item => item.antiguedad > 7).length;
            document.getElementById('pm-kpi-semana').textContent = candidatos.reduce((total, item) => total + item.hallazgos.length, 0);
        }

        function renderHallazgosPM(item) {
            if (!item.hallazgos.length) {
                return `
                    <div class="pm-finding-empty">
                        <i class="fas fa-circle-info mr-1"></i>
                        El aviso no tiene hallazgos NOK o comentarios detallados en las inspecciones disponibles.
                    </div>`;
            }

            return `
                <div class="pm-findings-grid">
                    ${item.hallazgos.map(hallazgo => `
                        <div class="pm-finding-card ${hallazgo.critico ? 'pm-finding-critical' : ''}">
                            <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                ${hallazgo.critico
                                    ? '<span class="pm-badge bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"><i class="fas fa-triangle-exclamation"></i> Crítico</span>'
                                    : '<span class="pm-badge bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">Hallazgo</span>'}
                                ${hallazgo.estado ? `<span class="text-[10px] font-bold text-slate-400 uppercase">${escaparHtmlPM(hallazgo.estado)}</span>` : ''}
                                <span class="text-[10px] text-slate-400">${formatearFechaPM(hallazgo.fecha)}</span>
                            </div>
                            <p class="text-sm font-bold text-slate-800 dark:text-slate-100">${escaparHtmlPM(hallazgo.descripcion)}</p>
                            ${hallazgo.comentario
                                ? `<p class="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed"><i class="fas fa-comment-dots mr-1 text-slate-400"></i>${escaparHtmlPM(hallazgo.comentario)}</p>`
                                : ''}
                        </div>`).join('')}
                </div>`;
        }

        function renderColaPM(candidatos) {
            const contenedor = document.getElementById('pm-cola');
            const total = document.getElementById('pm-total-cola');
            if (!contenedor || !total) return;
            total.textContent = `${candidatos.length} aviso${candidatos.length === 1 ? '' : 's'}`;

            if (!candidatos.length) {
                contenedor.innerHTML = `
                    <div class="p-10 text-center text-slate-500 dark:text-slate-400">
                        <i class="fas fa-circle-check text-3xl text-green-500 mb-3"></i>
                        <p class="font-bold">No hay avisos que coincidan con los filtros.</p>
                    </div>`;
                return;
            }

            contenedor.innerHTML = candidatos.map(item => `
                <article class="pm-queue-item ${item.critico ? 'pm-queue-critical' : ''}">
                    <div class="mb-4">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                ${item.critico
                                    ? '<span class="pm-badge bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"><i class="fas fa-triangle-exclamation"></i> Aviso crítico</span>'
                                    : '<span class="pm-badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">No crítico</span>'}
                                <span class="pm-badge bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">SAP abierto</span>
                                <span class="pm-badge bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                    <i class="fas fa-clock"></i> ${item.antiguedad} día${item.antiguedad === 1 ? '' : 's'} abierto
                                </span>
                            </div>
                            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <h4 class="text-lg font-extrabold text-[#0B1D45] dark:text-white normal-case tracking-normal">${escaparHtmlPM(item.equipo)}</h4>
                                <span class="font-mono text-xs font-bold text-blue-700 dark:text-blue-300">Aviso ${escaparHtmlPM(item.aviso)}</span>
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                <i class="fas fa-location-dot mr-1"></i>${escaparHtmlPM(item.zona)}
                                ${item.owner ? `<span class="mx-2">•</span><i class="fas fa-user mr-1"></i>${escaparHtmlPM(item.owner)}` : ''}
                            </p>
                        </div>
                    </div>
                    ${renderHallazgosPM(item)}
                </article>`).join('');
        }

        function renderPlanificacionPM() {
            if (!isAdminModo) return;
            pmCandidatos = construirCandidatosPM();
            actualizarKpisPM(pmCandidatos);
            renderColaPM(filtrarCandidatosPM(pmCandidatos));

            const alerta = document.getElementById('pm-alerta-estado');
            const totalAvisos = new Set((inspecciones || []).map(item => String(item.sap_nr_numero || '').trim()).filter(Boolean));
            const sinEstado = [...totalAvisos].filter(aviso => {
                const inspeccion = inspecciones.find(item => String(item.sap_nr_numero || '').trim() === aviso);
                return inspeccion && !obtenerEstadoSapPM(inspeccion);
            }).length;

            if (alerta) {
                alerta.className = sinEstado
                    ? 'mb-5 rounded-xl border px-4 py-3 text-sm bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300'
                    : 'hidden';
                alerta.innerHTML = sinEstado
                    ? `<i class="fas fa-circle-info mr-2"></i>${sinEstado} aviso${sinEstado === 1 ? '' : 's'} sin estado SAP no se incluyen hasta completar la consulta.`
                    : '';
            }
        }

        async function actualizarPlanificacionPM() {
            if (!isAdminModo) return;
            if (typeof cargarStatusAvisos === 'function') await cargarStatusAvisos();
            renderPlanificacionPM();
        }

        function inicializarPlanificacionPM() {
            actualizarPlanificacionPM();
        }

        function exportarPrioridadPMExcel() {
            if (typeof XLSX === 'undefined') {
                console.error('[Prioridad PM] SheetJS no está disponible.');
                return;
            }

            const candidatos = filtrarCandidatosPM(construirCandidatosPM());
            const filas = [];

            candidatos.forEach(item => {
                const base = {
                    'Aviso SAP': item.aviso,
                    'Estado SAP': 'Abierto',
                    'Criticidad Aviso': item.critico ? 'Crítico' : 'No crítico',
                    'Equipo': item.equipo,
                    'Zona': item.zona,
                    'Owner': item.owner || '',
                    'Primer Reporte': item.fechaPrimerReporte || '',
                    'Último Reporte': item.fechaUltimoReporte || '',
                    'Días Abierto': item.antiguedad,
                    'Total Hallazgos': item.hallazgos.length
                };

                if (!item.hallazgos.length) {
                    filas.push({
                        ...base,
                        'Fecha Hallazgo': '',
                        'Criticidad Hallazgo': '',
                        'Estado Hallazgo': '',
                        'Hallazgo': '',
                        'Comentario': ''
                    });
                    return;
                }

                item.hallazgos.forEach(hallazgo => {
                    filas.push({
                        ...base,
                        'Fecha Hallazgo': hallazgo.fecha || '',
                        'Criticidad Hallazgo': hallazgo.critico ? 'Crítico' : 'No crítico',
                        'Estado Hallazgo': hallazgo.estado || '',
                        'Hallazgo': hallazgo.descripcion || '',
                        'Comentario': hallazgo.comentario || ''
                    });
                });
            });

            if (!filas.length) {
                if (typeof mostrarAlerta === 'function') {
                    mostrarAlerta('Sin datos', 'No hay avisos abiertos que coincidan con los filtros actuales.', 'fa-circle-info text-blue-500');
                }
                return;
            }

            const hoja = XLSX.utils.json_to_sheet(filas);
            hoja['!cols'] = [
                { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 28 }, { wch: 18 },
                { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
                { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 42 }, { wch: 50 }
            ];
            hoja['!autofilter'] = { ref: hoja['!ref'] };

            const libro = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(libro, hoja, 'Prioridad PM');

            const hoy = new Date();
            const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
            XLSX.writeFile(libro, `prioridad-pm-${fecha}.xlsx`);
        }

        window.renderPlanificacionPM = renderPlanificacionPM;
        window.actualizarPlanificacionPM = actualizarPlanificacionPM;
        window.inicializarPlanificacionPM = inicializarPlanificacionPM;
        window.exportarPrioridadPMExcel = exportarPrioridadPMExcel;
