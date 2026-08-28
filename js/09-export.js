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
