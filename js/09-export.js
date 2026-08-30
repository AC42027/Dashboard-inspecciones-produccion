        function exportarAsignacionExcel() {
            if (!asignacionesGuardadas || asignacionesActuales.length === 0) {
                mostrarAlerta('Atención', 'Primero debes guardar las asignaciones antes de exportar.', 'fa-exclamation-circle text-amber-500');
                return;
            }
            const list = asignacionesActuales;

            const fechaRef = list[0].fecha || '';
            const fechaObj = fechaRef.length >= 7
                ? new Date(fechaRef.slice(0, 4) + '-' + fechaRef.slice(5, 7) + '-01')
                : new Date();
            const tituloMes = fechaObj.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
            const hoy = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

            const porAso = {};
            list.forEach(a => {
                const nom = a.asociado || 'Sin asignar';
                if (!porAso[nom]) porAso[nom] = [];
                porAso[nom].push(a);
            });

            let totalRealizadas = 0;
            let totalPendientes = 0;
            const datos = [];

            // Fila 0: Banner título azul
            datos.push(['GOODYEAR - RUTAS ASRS']);
            // Fila 1: Subtítulo mes + fecha generación
            datos.push([`${tituloMes}  |  Generado: ${hoy}`]);
            // Fila 2: Espaciador
            datos.push([]);
            // Fila 3: Headers
            const headers = ['ASOCIADO', 'EQUIPO', 'ZONA', 'ESTADO'];
            datos.push(headers);

            const asosOrdenados = Object.keys(porAso).sort();
            let filaDatos = 4;

            asosOrdenados.forEach((aso, ai) => {
                const equipos = porAso[aso];
                const esPar = ai % 2 === 0;
                equipos.forEach(a => {
                    const realizada = esInspeccionRealizada(a, inspecciones, mesStr);
                    const estado = realizada ? 'REALIZADA' : 'PENDIENTE';
                    if (realizada) totalRealizadas++; else totalPendientes++;
                    datos.push([aso, a.equipo, a.zona || 'N/A', estado]);
                });
            });

            const totalAsignaciones = datos.length - 4;
            const filaResumen = datos.length;
            // Fila resumen
            datos.push([]);
            const filaResumen2 = datos.length;
            datos.push(['', 'RESUMEN', `${totalRealizadas} Realizadas  /  ${totalPendientes} Pendientes  /  ${totalAsignaciones} Total`, '']);

            const ws = XLSX.utils.aoa_to_sheet(datos);
            const ultFilaDatos = filaResumen - 1;
            const ultCol = headers.length - 1;

            // Fusiones
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: ultCol } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: ultCol } }
            ];
            if (filaResumen2 > filaResumen) {
                ws['!merges'].push({ s: { r: filaResumen2, c: 1 }, e: { r: filaResumen2, c: 2 } });
            }

            // Anchos de columna
            ws['!cols'] = [
                { wch: 30 },
                { wch: 24 },
                { wch: 20 },
                { wch: 16 }
            ];

            // Alturas de fila
            const rowHeights = {};
            rowHeights[0] = { hpt: 36 };
            rowHeights[1] = { hpt: 20 };
            rowHeights[3] = { hpt: 26 };
            ws['!rows'] = Object.keys(rowHeights).sort((a, b) => a - b).map(i => rowHeights[i] || { hpt: 22 });

            // ========= ESTILOS =========
            const blue = '003399';
            const darkBlue = '002266';
            const grayMed = '999999';
            const grayLight = 'E8E8E8';

            // Función helper para aplicar estilo a celda
            function setStyle(r, c, s) {
                const addr = XLSX.utils.encode_cell({ r, c });
                if (!ws[addr]) ws[addr] = { t: 's', v: '' };
                ws[addr].s = s;
            }

            // 1) TÍTULO PRINCIPAL (fila 0) - fondo azul, texto blanco grande
            for (let c = 0; c <= ultCol; c++) {
                setStyle(0, c, {
                    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 18, name: 'Calibri' },
                    fill: { patternType: 'solid', fgColor: { rgb: blue } },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: { top: { style: 'medium', color: { rgb: darkBlue } }, bottom: { style: 'thin', color: { rgb: blue } }, left: { style: 'thin', color: { rgb: blue } }, right: { style: 'thin', color: { rgb: blue } } }
                });
            }

            // 2) SUBTÍTULO (fila 1) - azul claro
            for (let c = 0; c <= ultCol; c++) {
                setStyle(1, c, {
                    font: { color: { rgb: 'FFFFFF' }, sz: 10, name: 'Calibri' },
                    fill: { patternType: 'solid', fgColor: { rgb: '4477AA' } },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: { top: { style: 'thin', color: { rgb: '4477AA' } }, bottom: { style: 'thin', color: { rgb: '4477AA' } }, left: { style: 'thin', color: { rgb: '4477AA' } }, right: { style: 'thin', color: { rgb: '4477AA' } } }
                });
            }

            // 3) ESPACIADOR (fila 2)
            for (let c = 0; c <= ultCol; c++) {
                setStyle(2, c, { font: { sz: 6, name: 'Calibri' }, fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } } });
            }

            // 4) HEADERS (fila 3) - azul oscuro, blanco, uppercase
            const headerStyle = {
                font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
                fill: { patternType: 'solid', fgColor: { rgb: darkBlue } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: { top: { style: 'medium', color: { rgb: darkBlue } }, bottom: { style: 'medium', color: { rgb: darkBlue } }, left: { style: 'thin', color: { rgb: 'FFFFFF' } }, right: { style: 'thin', color: { rgb: 'FFFFFF' } } }
            };
            for (let c = 0; c <= ultCol; c++) {
                setStyle(3, c, headerStyle);
            }

            // 5) DATOS (fila 4 hasta filaResumen-1) - con zebra stripes
            const asociadoColors = {};
            asosOrdenados.forEach((aso, ai) => {
                asociadoColors[aso] = ai % 2 === 0 ? 'FFFFFF' : 'F5F8FC';
            });

            let f = filaDatos;
            asosOrdenados.forEach(aso => {
                const bgColor = asociadoColors[aso];
                const equipos = porAso[aso];
                equipos.forEach(a => {
                    const realizada = esInspeccionRealizada(a, inspecciones, mesStr);
                    const estado = realizada ? 'REALIZADA' : 'PENDIENTE';

                    for (let c = 0; c <= ultCol; c++) {
                        const isEstado = c === 3;
                        let cellStyle = {
                            font: { sz: 11, name: 'Calibri', bold: isEstado, color: { rgb: isEstado ? (realizada ? '1A7A1A' : 'CC0000') : '333333' } },
                            fill: { patternType: 'solid', fgColor: { rgb: isEstado ? (realizada ? 'E8F5E8' : 'FFE8E8') : bgColor } },
                            alignment: { vertical: 'center', horizontal: isEstado ? 'center' : 'left' },
                            border: { top: { style: 'thin', color: { rgb: c === 3 ? (realizada ? 'C8E6C9' : 'FFCDD2') : grayMed } }, bottom: { style: 'thin', color: { rgb: c === 3 ? (realizada ? 'C8E6C9' : 'FFCDD2') : grayMed } }, left: { style: 'thin', color: { rgb: grayMed } }, right: { style: 'thin', color: { rgb: grayMed } } }
                        };
                        setStyle(f, c, cellStyle);
                    }
                    f++;
                });
            });

            // 6) FILA RESUMEN
            if (filaResumen2 > filaResumen) {
                for (let c = 0; c <= ultCol; c++) {
                    setStyle(filaResumen, c, { font: { sz: 6, name: 'Calibri' } });
                }
                const resStyle = {
                    font: { bold: true, sz: 12, name: 'Calibri', color: { rgb: blue } },
                    fill: { patternType: 'solid', fgColor: { rgb: 'E8F0FE' } },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: { top: { style: 'medium', color: { rgb: blue } }, bottom: { style: 'medium', color: { rgb: blue } }, left: { style: 'thin', color: { rgb: blue } }, right: { style: 'thin', color: { rgb: blue } } }
                };
                for (let c = 0; c <= ultCol; c++) {
                    setStyle(filaResumen2, c, resStyle);
                }
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Rutas_ASRS');
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Rutas_ASRS_${tituloMes.replace(/\s+/g, '_')}.xlsx`);
        }

        // ==========================================
        // EXPORTACIÓN E IMPRESIÓN DE QRS FALTANTES
        // ==========================================
        let qrsExportCache = [];

        function generarQRBase64(texto) {
            return new Promise((resolve) => {
                try {
                    if (typeof QRCode !== 'undefined') {
                        const tempDiv = document.createElement('div');
                        tempDiv.style.display = 'none';
                        document.body.appendChild(tempDiv);

                        new QRCode(tempDiv, {
                            text: texto,
                            width: 160,
                            height: 160,
                            correctLevel: QRCode.CorrectLevel.H
                        });

                        setTimeout(() => {
                            let src = '';
                            const img = tempDiv.querySelector('img');
                            const canvas = tempDiv.querySelector('canvas');
                            if (img && img.src) src = img.src;
                            else if (canvas) src = canvas.toDataURL('image/png');
                            if (tempDiv.parentNode) document.body.removeChild(tempDiv);
                            if (src) {
                                resolve(src);
                                return;
                            }
                            resolve(`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(texto)}`);
                        }, 60);
                    } else {
                        resolve(`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(texto)}`);
                    }
                } catch (e) {
                    resolve(`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(texto)}`);
                }
            });
        }

        let mapaEquiposOficialCache = null;

        async function cargarMapaEquiposOficial() {
            if (mapaEquiposOficialCache && mapaEquiposOficialCache.length > 0) {
                return mapaEquiposOficialCache;
            }
            try {
                const res = await fetch('public/equipos_oficial_map.json');
                if (res.ok) {
                    mapaEquiposOficialCache = await res.json();
                    return mapaEquiposOficialCache;
                }
            } catch (e) {
                console.warn('No se pudo cargar equipos_oficial_map.json:', e);
            }
            return [];
        }

        async function abrirModalQRsSinQR() {
            if (!isAdminModo) return;

            const selectedChks = document.querySelectorAll('.chk-sin-qr:checked');
            let listaReportados = [];

            if (selectedChks.length > 0) {
                const ids = Array.from(selectedChks).map(c => c.getAttribute('data-id'));
                listaReportados = equiposSinQR.filter(eq => ids.includes(String(eq.id)));
            } else {
                listaReportados = equiposSinQR;
            }

            if (listaReportados.length === 0) {
                await mostrarAlerta('Atención', 'No hay equipos sin QR registrados o seleccionados.', 'fa-exclamation-circle text-amber-500');
                return;
            }

            const mapaOficial = await cargarMapaEquiposOficial();
            const itemsAMostrar = [];

            for (const eq of listaReportados) {
                const nombreReportado = eq.equipo_nombre || eq.equipo || 'Equipo';
                const normRep = normalizarTexto(nombreReportado);

                // Match inteligente contra los 411 equipos del mapa oficial
                let match = mapaOficial.find(m => {
                    const normZona = normalizarTexto(m.zona || '');
                    if (!normRep || !normZona) return false;
                    return normZona === normRep || normZona.endsWith(normRep) || (normRep.length >= 4 && normZona.includes(normRep));
                });

                if (match) {
                    itemsAMostrar.push({
                        id: eq.id,
                        nombre: match.zona,
                        subtitulo: '',
                        qrText: match.url,
                        matchEncontrado: true
                    });
                } else {
                    itemsAMostrar.push({
                        id: eq.id,
                        nombre: nombreReportado,
                        subtitulo: '',
                        qrText: nombreReportado,
                        matchEncontrado: false
                    });
                }
            }

            const totalMatches = itemsAMostrar.filter(i => i.matchEncontrado).length;
            const origenStr = `Equipos Faltantes (${itemsAMostrar.length}) · ${totalMatches} Encontrados`;

            await generarYMostrarModalQRs(itemsAMostrar, origenStr);
        }

        async function generarYMostrarModalQRs(items, origenStr = 'Dashboard') {
            const modal = document.getElementById('modalQRsSinQR');
            const contenedor = document.getElementById('contenedorVistaQRs');
            const badge = document.getElementById('badgeCantQRs');

            if (badge) badge.textContent = items.length;

            contenedor.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12">
                    <div class="loader mb-4"></div>
                    <p class="text-gray-600 dark:text-gray-300 font-medium">Generando códigos QR (${items.length}) desde ${origenStr}...</p>
                </div>
            `;
            modal.classList.remove('hidden');

            qrsExportCache = [];
            for (const item of items) {
                const textToEncode = item.qrText || item.nombre;
                const base64 = await generarQRBase64(textToEncode);
                qrsExportCache.push({
                    nombre: item.nombre,
                    subtitulo: '',
                    qrSrc: base64,
                    qrText: textToEncode
                });
            }

            renderGridVistaQRs();
        }

        function renderGridVistaQRs() {
            const contenedor = document.getElementById('contenedorVistaQRs');
            if (!contenedor) return;

            if (qrsExportCache.length === 0) {
                contenedor.innerHTML = '<p class="text-center py-8 text-gray-500 font-medium">No hay códigos para mostrar.</p>';
                return;
            }

            let html = `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">`;

            qrsExportCache.forEach(item => {
                html += `
                    <div class="bg-white text-slate-900 border-2 border-goodyear-blue rounded-xl p-3 shadow flex flex-col items-center justify-center text-center break-inside-avoid">
                        <div class="w-36 h-36 bg-white flex items-center justify-center p-1 rounded-lg">
                            <img src="${item.qrSrc}" class="w-full h-full object-contain" alt="QR ${item.nombre}">
                        </div>
                        <span class="font-extrabold text-xs text-gray-900 mt-2 block uppercase tracking-tight leading-tight whitespace-nowrap text-ellipsis overflow-hidden max-w-full">${item.nombre}</span>
                        ${item.subtitulo ? `<span class="text-[10px] text-gray-500 font-medium mt-0.5 line-clamp-2" title="${item.subtitulo}">${item.subtitulo}</span>` : ''}
                    </div>
                `;
            });

            html += `</div>`;
            contenedor.innerHTML = html;
        }

        function cerrarModalQRsSinQR() {
            const modal = document.getElementById('modalQRsSinQR');
            if (modal) modal.classList.add('hidden');
        }

        function imprimirContenidoQRs() {
            if (qrsExportCache.length === 0) return;

            const printWin = window.open('', '_blank');
            const cardsHtml = qrsExportCache.map(item => `
                <div class="qr-card">
                    <img src="${item.qrSrc}" class="qr-img" alt="QR ${item.nombre}">
                    <div class="qr-name">${item.nombre}</div>
                    ${item.subtitulo ? `<div class="qr-date">${item.subtitulo}</div>` : ''}
                </div>
            `).join('');

            printWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>QRs Faltantes - Goodyear</title>
                    <style>
                        @page { size: A4 portrait; margin: 1cm; }
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #fff; color: #000; text-align: center; }
                        .header { margin-bottom: 20px; border-bottom: 2px solid #003399; padding-bottom: 10px; }
                        .title { font-size: 20px; font-weight: bold; color: #003399; margin: 0; }
                        .subtitle { font-size: 12px; color: #555; margin-top: 4px; }
                        .grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; }
                        .qr-card {
                            width: 165px;
                            padding: 10px;
                            border: 2px solid #003399;
                            border-radius: 10px;
                            box-sizing: border-box;
                            page-break-inside: avoid;
                            text-align: center;
                            display: inline-block;
                            margin: 5px;
                            vertical-align: top;
                        }
                        .qr-img { width: 125px; height: 125px; margin: 0 auto; display: block; object-fit: contain; }
                        .qr-name { font-size: 11.5px; font-weight: bold; margin-top: 6px; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25; text-transform: uppercase; }
                        .qr-date { font-size: 9px; color: #666; margin-top: 2px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">GOODYEAR - CÓDIGOS QR DE EQUIPOS</div>
                        <div class="subtitle">Equipos ASRS · Total: ${qrsExportCache.length}</div>
                    </div>
                    <div class="grid">
                        ${cardsHtml}
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

        function descargarQRsWord() {
            if (qrsExportCache.length === 0) return;

            const cardsHtml = qrsExportCache.map(item => `
                <div class="qr-card">
                    <img src="${item.qrSrc}" width="130" height="130" style="width:130px;height:130px;display:block;margin:0 auto;" alt="QR ${item.nombre}">
                    <div class="qr-name">${item.nombre}</div>
                    ${item.subtitulo ? `<div class="qr-date">${item.subtitulo}</div>` : ''}
                </div>
            `).join('');

            const htmlContent = `
                <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset='utf-8'>
                    <title>QRs Faltantes Goodyear</title>
                    <style>
                        @page { size: A4; margin: 1cm; }
                        body { font-family: Arial, sans-serif; text-align: center; }
                        .title { font-size: 18pt; font-weight: bold; color: #003399; margin-bottom: 4px; }
                        .subtitle { font-size: 10pt; color: #666; margin-bottom: 20px; }
                        .grid { text-align: center; }
                        .qr-card {
                            display: inline-block;
                            width: 170px;
                            margin: 8px;
                            padding: 10px;
                            border: 2pt solid #003399;
                            border-radius: 8px;
                            text-align: center;
                            vertical-align: top;
                            page-break-inside: avoid;
                        }
                        .qr-name { font-size: 10pt; font-weight: bold; color: #000; margin-top: 6px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25; }
                        .qr-date { font-size: 8pt; color: #666; margin-top: 2px; }
                    </style>
                </head>
                <body>
                    <div class="title">GOODYEAR - ETIQUETAS DE CÓDIGOS QR</div>
                    <div class="subtitle">Equipos ASRS · Total: ${qrsExportCache.length}</div>
                    <div class="grid">
                        ${cardsHtml}
                    </div>
                </body>
                </html>
            `;

            const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
            const hoy = new Date().toISOString().slice(0, 10);
            saveAs(blob, `QRs_Equipos_Goodyear_${hoy}.doc`);
        }

