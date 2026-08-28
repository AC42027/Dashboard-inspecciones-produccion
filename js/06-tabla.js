        // EVENT LISTENERS
        function setupEventListeners() {
            // Event listeners para filtros de la tabla
            Object.keys(els.filtros).forEach(key => {
                const el = els.filtros[key];
                if (el) {
                    el.addEventListener('change', (e) => {
                        filtros[key] = e.target.value;
                        if (els.filtrosAnalitica[key]) els.filtrosAnalitica[key].value = e.target.value;
                        paginaActual = 1;
                        aplicarFiltros();
                    });
                }
            });

            // Event listeners para filtros del panel analítico
            Object.keys(els.filtrosAnalitica).forEach(key => {
                const el = els.filtrosAnalitica[key];
                if (el) {
                    el.addEventListener('change', (e) => {
                        filtros[key] = e.target.value;
                        if (els.filtros[key]) els.filtros[key].value = e.target.value;
                        paginaActual = 1;
                        aplicarFiltros();
                    });
                }
            });

            els.btnPrev.addEventListener('click', () => { if (paginaActual > 1) { paginaActual--; renderTabla(); } });
            els.btnNext.addEventListener('click', () => {
                if (paginaActual * inspeccionesPorPagina < inspeccionesFiltradas.length) { paginaActual++; renderTabla(); }
            });
        }

        function limpiarFiltros() {
            Object.keys(filtros).forEach(key => filtros[key] = '');
            Object.values(els.filtros).forEach(el => { if (el) el.value = ''; });
            Object.values(els.filtrosAnalitica).forEach(el => { if (el) el.value = ''; });
            paginaActual = 1;
            aplicarFiltros();
        }

        async function fetchData() {
            try {
                // Usar la IP directa de la API
                const response = await fetch(`${API_BASE}/api/dashboard/inspecciones/`);
                if (!response.ok) throw new Error('Respuesta de red no fue ok');
                inspecciones = await response.json();

                els.loading.classList.add('hidden');
                els.tablaSection.classList.remove('hidden');
                els.graficasContainer.classList.remove('hidden');

                aplicarFiltros();
            } catch (error) {
                console.error('Error fetching data:', error);
                els.loading.classList.add('hidden');
                els.error.classList.remove('hidden');
                els.errorText.textContent = `No se pudieron cargar los datos: ${error.message}`;
            }
        }

        // LÓGICA DE FILTRADO
        function aplicarFiltros() {
            inspeccionesFiltradas = inspecciones.filter(i => {
                const cumplePeriodo =
                    (filtros.anio === '' || (i.fecha && i.fecha.substring(0, 4) === filtros.anio)) &&
                    (filtros.mes === '' || (i.fecha && i.fecha.substring(5, 7) === filtros.mes));

                const cumpleSap = filtros.sap === '' ||
                    (filtros.sap === 'con_aviso' ? (i.sap_nr_numero) : filtros.sap === 'sin_aviso' ? (!i.sap_nr_numero) : true);

                const tieneCritico = (i.tecnicos || []).some(t => t.es_critico === true || t.es_critico === 1 || t.es_critico === 'true');

                const cumpleCritico = filtros.critico === '' ||
                    (filtros.critico === 'critico' ? tieneCritico : filtros.critico === 'no_critico' ? !tieneCritico : true);

                return cumplePeriodo &&
                    (filtros.zona === '' || i.zona === filtros.zona) &&
                    (filtros.equipo === '' || i.equipo === filtros.equipo) &&
                    (filtros.owner === '' || i.owner === filtros.owner) &&
                    cumpleSap &&
                    cumpleCritico;
            });

            // Ordenar por fecha descendente
            inspeccionesFiltradas.sort((a, b) => {
                return new Date(`${b.fecha}T${b.horaInicio}`) - new Date(`${a.fecha}T${a.horaInicio}`);
            });

            // Calcular contadores dinámicos
            const totalCount = inspeccionesFiltradas.length;
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth(); // 0-11

            const targetYear = filtros.anio ? parseInt(filtros.anio, 10) : currentYear;
            const targetMonth = filtros.mes ? parseInt(filtros.mes, 10) - 1 : currentMonth;

            const monthCount = inspeccionesFiltradas.filter(i => {
                if (!i.fecha) return false;
                const parts = i.fecha.split('-'); // YYYY-MM-DD
                if (parts.length < 2) return false;
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Convert to 0-11
                return year === targetYear && month === targetMonth;
            }).length;

            const elTotal = document.getElementById('metric-total');
            const elMes = document.getElementById('metric-mes');
            const elTotalAnalitica = document.getElementById('metric-total-analitica');
            const elMesAnalitica = document.getElementById('metric-mes-analitica');

            if (elTotal) elTotal.textContent = totalCount.toLocaleString();
            if (elMes) elMes.textContent = monthCount.toLocaleString();
            if (elTotalAnalitica) elTotalAnalitica.textContent = totalCount.toLocaleString();
            if (elMesAnalitica) elMesAnalitica.textContent = monthCount.toLocaleString();

            actualizarOpcionesSelects();
            renderTabla();
            renderCharts();
        }

        function actualizarOpcionesSelects() {
            // Helper para obtener opciones únicas
            const valorCampo = (i, key) => {
                if (key === 'anio') return i.fecha ? i.fecha.substring(0, 4) : '';
                if (key === 'mes') return i.fecha ? i.fecha.substring(5, 7) : '';
                return i[key];
            };

            const getUnique = (key, dependsOn) => {
                return [...new Set(inspecciones.filter(i => {
                    return dependsOn.every(dep => filtros[dep] === '' || valorCampo(i, dep) === filtros[dep]);
                }).map(i => valorCampo(i, key)))].filter(v => v).sort();
            };

            const populate = (key, options, defaultText) => {
                ['filtros', 'filtrosAnalitica'].forEach(groupKey => {
                    const select = els[groupKey] ? els[groupKey][key] : null;
                    if (!select) return;
                    const val = filtros[key];
                    select.innerHTML = `<option value="">${defaultText}</option>` +
                        options.map(o => `<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`).join('');
                });
            };

            
            populate('anio', getUnique('anio', ['mes', 'owner', 'zona', 'equipo']), 'Todos');
            populate('owner', getUnique('owner', ['anio', 'mes', 'zona', 'equipo']), 'Todos');
            populate('zona', getUnique('zona', ['anio', 'mes', 'owner', 'equipo']), 'Todas');
            populate('equipo', getUnique('equipo', ['anio', 'mes', 'owner', 'zona']), 'Todos');
        }

        // RENDERIZADO
        function formatearHora(hora) {
            if (!hora) return '';
            const partes = hora.split(':');
            return partes.length >= 2 ? `${partes[0]}:${partes[1]}` : hora;
        }

        window.toggleFila = function (id) {
            filaExpandida = filaExpandida === id ? null : id;
            renderTabla(); // Simple re-render, es rápido con vanilla JS
        };

        window.mostrarConfirmacion = function (titulo, mensaje, iconoClass = 'fa-question-circle text-blue-500') {
            console.log("[Modal] mostrarConfirmacion llamado:", titulo, mensaje);
            return new Promise((resolve) => {
                const modal = document.getElementById('customModal');
                const content = document.getElementById('customModalContent');
                const titleEl = document.getElementById('customModalTitle');
                const textEl = document.getElementById('customModalText');
                const iconEl = document.getElementById('customModalIcon');
                const cancelBtn = document.getElementById('customModalCancel');
                const confirmBtn = document.getElementById('customModalConfirm');

                titleEl.textContent = titulo;
                textEl.textContent = mensaje;
                iconEl.innerHTML = `<i class="fas ${iconoClass} text-3xl"></i>`;

                cancelBtn.classList.remove('hidden');

                modal.classList.remove('hidden');
                setTimeout(() => {
                    content.classList.remove('scale-95', 'opacity-0');
                    content.classList.add('scale-100', 'opacity-100');
                }, 10);

                function close(result) {
                    console.log("[Modal] close(Confirmacion) ejecutado con resultado:", result);
                    content.classList.remove('scale-100', 'opacity-100');
                    content.classList.add('scale-95', 'opacity-0');
                    setTimeout(() => {
                        modal.classList.add('hidden');
                        resolve(result);
                    }, 200);
                }

                confirmBtn.onclick = () => close(true);
                cancelBtn.onclick = () => close(false);
            });
        };

        window.mostrarAlerta = function (titulo, mensaje, iconoClass = 'fa-info-circle text-blue-500') {
            console.log("[Modal] mostrarAlerta llamado:", titulo, mensaje);
            return new Promise((resolve) => {
                const modal = document.getElementById('customModal');
                const content = document.getElementById('customModalContent');
                const titleEl = document.getElementById('customModalTitle');
                const textEl = document.getElementById('customModalText');
                const iconEl = document.getElementById('customModalIcon');
                const cancelBtn = document.getElementById('customModalCancel');
                const confirmBtn = document.getElementById('customModalConfirm');

                titleEl.textContent = titulo;
                textEl.textContent = mensaje;
                iconEl.innerHTML = `<i class="fas ${iconoClass} text-3xl"></i>`;

                cancelBtn.classList.add('hidden');

                modal.classList.remove('hidden');
                setTimeout(() => {
                    content.classList.remove('scale-95', 'opacity-0');
                    content.classList.add('scale-100', 'opacity-100');
                }, 10);

                function close() {
                    console.log("[Modal] close(Alerta) ejecutado");
                    content.classList.remove('scale-100', 'opacity-100');
                    content.classList.add('scale-95', 'opacity-0');
                    setTimeout(() => {
                        modal.classList.add('hidden');
                        resolve();
                    }, 200);
                }

                confirmBtn.onclick = () => close();
            });
         };

        window.copiarAlPortapapeles = function (texto, event) {
            if (event) event.stopPropagation();
            
            const onSuccess = () => {
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-5 right-5 z-[9999] flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-2xl border border-slate-700/50 transition-all duration-300 transform translate-y-0 opacity-100';
                toast.innerHTML = `<i class="fas fa-check-circle text-green-400"></i> <span>Aviso ${texto} copiado</span>`;
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.classList.remove('opacity-100', 'translate-y-0');
                    toast.classList.add('opacity-0', 'translate-y-2');
                    setTimeout(() => toast.remove(), 300);
                }, 2000);
            };

            const fallbackCopiar = () => {
                const textArea = document.createElement("textarea");
                textArea.value = texto;
                textArea.style.position = "absolute";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.select();
                textArea.setSelectionRange(0, 99999);
                try {
                    document.execCommand('copy');
                    onSuccess();
                } catch (err) {
                    console.error('Fallback Copy failed', err);
                }
                document.body.removeChild(textArea);
            };

            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(texto).then(onSuccess).catch(err => {
                    console.warn("navigator.clipboard failed, trying fallback: ", err);
                    fallbackCopiar();
                });
            } else {
                fallbackCopiar();
            }
        };

         window.cerrarAviso = async function (inspeccionId, sapNrNumero, btn) {
            console.log("[CerrarAviso] click en boton. ID:", inspeccionId, "SAP NR:", sapNrNumero);
            const confirmar = await mostrarConfirmacion(
                'Cerrar Aviso SAP PM',
                `¿Está seguro de que desea cerrar el aviso SAP PM N° ${sapNrNumero}?`,
                'fa-exclamation-triangle text-amber-500'
            );
            console.log("[CerrarAviso] confirmacion resultado:", confirmar);
            if (!confirmar) return;

            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cerrando...';
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE}/api/inspecciones/${inspeccionId}/cerrar/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await res.json();
                console.log("[CerrarAviso] respuesta servidor:", res.status, data);
                if (res.ok && data.status === 'ok') {
                    // Actualizar estado en el objeto de la lista local
                    const inspObj = inspecciones.find(ins => ins.id === inspeccionId);
                    if (inspObj) {
                        inspObj.sap_nr_status = 'cerrada';
                    }
                    const inspFiltradasObj = inspeccionesFiltradas.find(ins => ins.id === inspeccionId);
                    if (inspFiltradasObj) {
                        inspFiltradasObj.sap_nr_status = 'cerrada';
                    }

                    // Re-renderizar la tabla para mostrar la transición en el frontend inmediatamente
                    renderTabla();

                    // Mostrar la confirmación al usuario
                    await mostrarAlerta('Cierre Exitoso', `¡Aviso ${sapNrNumero} cerrado correctamente!`, 'fa-check-circle text-green-500');
                } else {
                    btn.innerHTML = originalContent;
                    btn.disabled = false;
                    await mostrarAlerta('Error de Cierre', data.message || 'Error desconocido', 'fa-times-circle text-red-500');
                }
            } catch (err) {
                console.error("[CerrarAviso] error en fetch:", err);
                btn.innerHTML = originalContent;
                btn.disabled = false;
                await mostrarAlerta('Error de Red', `Error de red al conectar con el servidor: ${err.message}`, 'fa-wifi text-red-500');
            }
        };

        function renderTabla() {
            const start = (paginaActual - 1) * inspeccionesPorPagina;
            const end = start + inspeccionesPorPagina;
            const items = inspeccionesFiltradas.slice(start, end);

            els.paginacionInfo.textContent = `Mostrando ${start + 1} a ${Math.min(end, inspeccionesFiltradas.length)} de ${inspeccionesFiltradas.length} inspecciones`;
            els.btnPrev.disabled = paginaActual === 1;
            els.btnNext.disabled = end >= inspeccionesFiltradas.length;

            if (items.length === 0) {
                els.tablaBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">No se encontraron inspecciones con los filtros seleccionados.</td></tr>`;
                return;
            }

            els.tablaBody.innerHTML = items.map(i => {
                const isExpanded = filaExpandida === i.id;
                const tieneNOK = (i.tecnicos || []).some(t => t.estado === 'NOK');
                const esCritico = (i.tecnicos || []).some(t => t.es_critico === true || t.es_critico === 1 || t.es_critico === 'true');
                const tieneFalla = tieneNOK || esCritico;

                let rowHtml = `
                    <tr class="cursor-pointer transition-colors ${tieneFalla ? 'border-l-4 border-l-red-500 bg-red-50/40 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/30' : ''} ${isExpanded ? 'row-expanded' : ''}" onclick="toggleFila(${i.id})">
                        <td>${i.fecha}</td>
                        <td>${formatearHora(i.horaInicio)}</td>
                        <td>${formatearHora(i.horaFin)}</td>
                        <td class="font-bold text-goodyear-blue dark:text-blue-400">
                            <div>${i.equipo}</div>
                            ${i.sap_nr_numero ? `
                                <span onclick="copiarAlPortapapeles('${i.sap_nr_numero}', event)" class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:hover:bg-blue-900/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer transition-all active:scale-95" title="Copiar Aviso SAP PM">
                                    <i class="fas fa-cogs text-[10px]"></i> ${i.sap_nr_numero} <i class="far fa-copy text-[10px] opacity-60"></i>
                                </span>
                            ` : ''}
                        </td>
                        <td>${i.zona}</td>
                        <td>${i.owner}</td>
                        <td class="text-center font-bold text-xs ${tieneFalla ? 'text-red-600 dark:text-red-400' : (isExpanded ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500')}">
                            <div class="grid grid-cols-[1fr_auto_1fr] items-center w-full my-1">
                                <div class="flex items-center justify-end gap-1.5 whitespace-nowrap pr-2">
                                    ${esCritico ? `
                                        <span class="text-[10px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 shadow-sm shrink-0">
                                            CRÍTICO
                                        </span>
                                    ` : ''}
                                    ${tieneFalla ? '<div class="beacon shrink-0" title="Hallazgo NOK"></div>' : ''}
                                </div>
                                <span class="whitespace-nowrap flex items-center gap-1 justify-center">
                                    <i class="fas fa-chevron-${isExpanded ? 'up' : 'down'}"></i> ${isExpanded ? 'CERRAR' : 'DETALLES'}
                                </span>
                                <div></div>
                            </div>
                        </td>
                    </tr>
                `;

                if (isExpanded) {
                    const hallazgosHtml = i.tecnicos
                        .filter(t => t.estado === 'NOK' || (t.comentario && t.comentario.trim() !== "") || t.es_critico)
                        .map(t => `
                            <div class="relative bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border ${t.es_critico ? 'border-red-500 border-l-4' : 'border-gray-200 dark:border-slate-700'}">
                                ${t.es_critico ? '<span class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">CRÍTICO</span>' : ''}
                                <p class="font-bold text-gray-800 dark:text-gray-200 pr-16">${t.descripcion}</p>
                                <p class="text-xs font-bold mt-1 ${t.estado === 'NOK' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}">ESTADO: ${t.estado}</p>
                                ${t.comentario ? `
                                    <div class="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400 rounded-r text-sm text-gray-700 dark:text-gray-300 italic">
                                        <i class="fas fa-comment-dots text-yellow-500 mr-2"></i> "${t.comentario}"
                                    </div>
                                ` : ''}
                            </div>
                        `).join('');

                    rowHtml += `
                        <tr class="bg-blue-50/50 dark:bg-slate-800/30">
                            <td colspan="7" class="p-0 border-b border-blue-100 dark:border-slate-700">
                                <div class="p-6">
                                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <h4 class="text-sm font-bold text-goodyear-blue dark:text-blue-400 uppercase flex items-center gap-2">
                                            <i class="fas fa-search-plus"></i> Hallazgos y Comentarios
                                        </h4>
                                        
                                        <!-- Sección SAP PM -->
                                        <div class="flex items-center gap-3">
                                             ${i.sap_nr_numero ? (() => {
                            let badgeClass = "bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100";
                            if (i.sap_nr_status === 'cerrada') {
                                badgeClass = "bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100";
                            } else if (i.sap_nr_status === 'error') {
                                badgeClass = "bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100";
                            }
                            return `
                                                    <div onclick="copiarAlPortapapeles('${i.sap_nr_numero}', event)" class="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold text-blue-800 dark:text-blue-300 cursor-pointer transition-all active:scale-95" title="Copiar Aviso SAP PM">
                                                         <i class="fas fa-cogs"></i> SAP PM: ${i.sap_nr_numero} <i class="far fa-copy opacity-60"></i>
                                                         <span class="px-1.5 py-0.5 rounded ${badgeClass} text-[10px] uppercase">${i.sap_nr_status}</span>
                                                     </div>
                                                `;
                        })() : `
                                                <div class="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    <i class="fas fa-minus-circle"></i> Sin Notificación SAP
                                                </div>
                                            `}
                                        </div>
                                    </div>
                                    ${i.observaciones ? `
                                        <div class="mb-4 p-4 bg-blue-50/50 dark:bg-slate-900/40 border-l-4 border-goodyear-blue dark:border-goodyear-yellow rounded text-sm text-gray-700 dark:text-gray-300">
                                            <span class="font-bold text-goodyear-blue dark:text-blue-400 block mb-1"><i class="fas fa-comment-alt"></i> Observaciones Generales:</span>
                                            <span class="italic">"${i.observaciones}"</span>
                                        </div>
                                    ` : ''}
                                    
                                    ${hallazgosHtml ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${hallazgosHtml}</div>` : '<p class="text-gray-500 italic">No hay comentarios ni hallazgos NOK para esta inspección.</p>'}
                                </div>
                            </td>
                        </tr>
                    `;
                }
                return rowHtml;
            }).join('');
        }

