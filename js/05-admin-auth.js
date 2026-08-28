        // MODO ADMIN & LDAP
        function toggleAuthModal() {
            document.getElementById('authModal').classList.toggle('hidden');
            document.getElementById('ldapError').classList.add('hidden');
            document.getElementById('loginForm').reset();
        }

        async function handleLDAPLogin(e) {
            e.preventDefault();
            const user = document.getElementById('ldapUser').value.toLowerCase();
            const pass = document.getElementById('ldapPass').value;
            const btn = document.getElementById('ldapSubmitBtn');
            const error = document.getElementById('ldapError');

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
                    // Validar el privilegio devuelto por Django. 
                    // Si no está definido (backend pendiente), cae en el fallback de los dos admins originales.
                    const isUserAdmin = data.is_admin !== undefined ? data.is_admin : (user === 'ac18958' || user === 'ac17157' || user === 'aa05016');

                    if (isUserAdmin) {
                        isAdminModo = true;
                        loggedUser = user;
                        loggedUserFullName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || user;

                        // Persistencia de sesión
                        localStorage.setItem('isAdminModo', 'true');
                        localStorage.setItem('loggedUser', user);
                        localStorage.setItem('misAsigFullName', loggedUserFullName);

                        toggleAuthModal();
                        renderTeamList(); // Inicializar lista de asociados
                        await syncTeamFromAPI(); // Sincronizar equipo desde el servidor
                        document.getElementById('adminPanel').classList.remove('hidden');
                        document.getElementById('tab-asignaciones').classList.remove('hidden');

                        const btnModoAdmin = document.getElementById('btnModoAdmin');
                        if (btnModoAdmin) {
                            btnModoAdmin.innerHTML = '<i class="fas fa-times"></i> <span class="hidden sm:inline">Cerrar Admin</span>';
                            btnModoAdmin.classList.replace('bg-gray-200', 'bg-red-600');
                            if (btnModoAdmin.classList.contains('text-gray-700')) {
                                btnModoAdmin.classList.replace('text-gray-700', 'text-white');
                            }
                        }

                        actualizarHeaderAdmin(user);
                        actualizarDataListsAdmin(); // Cargar equipos en el buscador manual
                        renderTabla(); // Re-renderizar la tabla para mostrar el botón "Cerrar Aviso"
                        renderEquiposSinQR(); // Mostrar botón eliminar en Equipos sin QR
                        const verFecha = document.getElementById('verFecha').value;
                        if (verFecha) cargarAsignacionesSemanales();
                    } else {
                        error.textContent = "Acceso denegado. Tu usuario no tiene privilegios de administrador.";
                        error.classList.remove('hidden');
                    }
                } else {
                    error.textContent = data.message || data.error || "Credenciales inválidas o error de red.";
                    error.classList.remove('hidden');
                }
            } catch (err) {
                error.textContent = "Error de conexión con el servidor LDAP o la API.";
                error.classList.remove('hidden');
            } finally {
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Autenticar';
                btn.disabled = false;
            }
        }

        // LÓGICA DE ASOCIADOS DINÁMICA
        function renderTeamList() {
            const container = document.getElementById('asrsTeamList');
            if (!container) return;
            container.innerHTML = asrsTeam.map((name, i) => `
                <div class="bg-blue-100 dark:bg-blue-900/50 text-goodyear-blue dark:text-blue-200 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
                    <i class="fas fa-user text-[10px]"></i> ${name}
                    <button onclick="removeAssociate(${i})" class="ml-1 hover:text-red-500 transition-colors p-1" title="Eliminar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');

            // Actualizar también el select de asignación manual
            const sel = document.getElementById('manualAsoSelect');
            if (sel) {
                const val = sel.value;
                sel.innerHTML = '<option value="PENDIENTE">-- Sin Asignar --</option>' +
                    asrsTeam.map(name => `<option value="${name}" ${name === val ? 'selected' : ''}>${name}</option>`).join('');
            }

            // Actualizar select de grupo crane
            const selGrupo = document.getElementById('manualGrupoAsoSelect');
            if (selGrupo) {
                const valG = selGrupo.value;
                selGrupo.innerHTML = '<option value="PENDIENTE">-- Sin Asignar --</option>' +
                    asrsTeam.map(name => `<option value="${name}" ${name === valG ? 'selected' : ''}>${name}</option>`).join('');
            }

            // Actualizar select de grupo robot
            const selRobot = document.getElementById('manualRobotAsoSelect');
            if (selRobot) {
                const valR = selRobot.value;
                selRobot.innerHTML = '<option value="PENDIENTE">-- Sin Asignar --</option>' +
                    asrsTeam.map(name => `<option value="${name}" ${name === valR ? 'selected' : ''}>${name}</option>`).join('');
            }

            // Actualizar select de grupo CC01
            const selCC01 = document.getElementById('manualCC01AsoSelect');
            if (selCC01) {
                const valC = selCC01.value;
                selCC01.innerHTML = '<option value="PENDIENTE">-- Sin Asignar --</option>' +
                    asrsTeam.map(name => `<option value="${name}" ${name === valC ? 'selected' : ''}>${name}</option>`).join('');
            }

            // Actualizar select de grupo CC03
            const selCC03 = document.getElementById('manualCC03AsoSelect');
            if (selCC03) {
                const valC3 = selCC03.value;
                selCC03.innerHTML = '<option value="PENDIENTE">-- Sin Asignar --</option>' +
                    asrsTeam.map(name => `<option value="${name}" ${name === valC3 ? 'selected' : ''}>${name}</option>`).join('');
            }
        }

        async function addAssociate() {
            const input = document.getElementById('newAssociateName');
            const name = input.value.trim();
            if (name && !asrsTeam.includes(name)) {
                asrsTeam.push(name);
                await guardarTeam();
                input.value = '';
                renderTeamList();
            } else if (name) {
                mostrarAlerta('Atención', 'Esa persona ya está en la lista.', 'fa-info-circle text-blue-500');
            }
        }

        function toggleGestionEquipo() {
            const container = document.getElementById('containerGestionEquipo');
            const text = document.getElementById('toggleTeamText');
            const icon = document.getElementById('toggleTeamIcon');
            if (!container) return;
            const isHidden = container.classList.contains('hidden');
            if (isHidden) {
                container.classList.remove('hidden');
                if (text) text.textContent = 'Ocultar gestión';
                if (icon) icon.classList.add('rotate-180');
            } else {
                container.classList.add('hidden');
                if (text) text.textContent = 'Editar equipo';
                if (icon) icon.classList.remove('rotate-180');
            }
        }

        async function removeAssociate(index) {
            const name = asrsTeam[index];
            if (!confirm(`¿Estás seguro de eliminar a "${name}" del equipo ASRS?`)) return;
            if (asrsTeam.length <= 5) {
                mostrarAlerta('Atención', 'Debe haber al menos 5 asociados para cubrir la lógica de Press Robots.', 'fa-info-circle text-blue-500');
                return;
            }
            asrsTeam.splice(index, 1);
            await guardarTeam();
            renderTeamList();
        }

        function toggleModoAdmin() {
            if (isAdminModo) {
                isAdminModo = false;
                loggedUser = '';

                // Limpiar persistencia
                localStorage.removeItem('isAdminModo');
                localStorage.removeItem('loggedUser');

                document.getElementById('adminPanel').classList.add('hidden');
                document.getElementById('tab-asignaciones').classList.add('hidden');

                const btnModoAdmin = document.getElementById('btnModoAdmin');
                if (btnModoAdmin) {
                    btnModoAdmin.innerHTML = '<i class="fas fa-user-shield"></i> <span class="hidden sm:inline">Administrar</span>';
                    btnModoAdmin.classList.replace('bg-red-600', 'bg-gray-200');
                    if (btnModoAdmin.classList.contains('text-white')) {
                        btnModoAdmin.classList.replace('text-white', 'text-gray-700');
                    }
                }
                actualizarHeaderAdmin();
                renderTabla();
                renderEquiposSinQR(); // Ocultar botón eliminar en Equipos sin QR
                const verFecha = document.getElementById('verFecha').value;
                if (verFecha) cargarAsignacionesSemanales();
                switchTab('inspecciones');
            } else {
                toggleAuthModal();
            }
        }

        window.toggleHeaderAdmin = function () {
            if (isAdminModo) {
                isAdminModo = false;
                loggedUser = '';

                // Limpiar persistencia
                localStorage.removeItem('isAdminModo');
                localStorage.removeItem('loggedUser');

                document.getElementById('adminPanel').classList.add('hidden');
                document.getElementById('tab-asignaciones').classList.add('hidden');

                const btnModoAdmin = document.getElementById('btnModoAdmin');
                if (btnModoAdmin) {
                    btnModoAdmin.innerHTML = '<i class="fas fa-user-shield"></i> <span class="hidden sm:inline">Administrar</span>';
                    btnModoAdmin.classList.replace('bg-red-600', 'bg-gray-200');
                    if (btnModoAdmin.classList.contains('text-white')) {
                        btnModoAdmin.classList.replace('text-white', 'text-gray-700');
                    }
                }
                actualizarHeaderAdmin();
                renderTabla();
                renderEquiposSinQR(); // Ocultar botón eliminar en Equipos sin QR
                const verFecha = document.getElementById('verFecha').value;
                if (verFecha) cargarAsignacionesSemanales();
                switchTab('inspecciones');
                mostrarAlerta('Sesi\u00f3n Cerrada', 'Has cerrado la sesi\u00f3n de administrador.', 'fa-info-circle text-blue-500');
            } else {
                toggleAuthModal();
            }
        };

        // EQUIPOS SIN QR
        let equiposSinQR = [];

        async function cargarEquiposSinQR() {
            const tbody = document.getElementById('tabla-equipos-sin-qr');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8"><div class="loader mx-auto mb-2"></div><p class="text-gray-500">Cargando...</p></td></tr>';

            try {
                const res = await fetch(`${API_BASE}/api/equipos-sin-qr/`, {
                    headers: { 'X-API-Token': 'fxoNqZPOR7nxwAYrbqFTONNEjUO2I1Hv3Wm34YGrEL4' }
                });
                if (!res.ok) throw new Error('Error al cargar datos');
                equiposSinQR = await res.json();
                renderEquiposSinQR();
            } catch (err) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">Error al conectar con el servidor. Verifique que el backend est\u00e9 funcionando y las migraciones aplicadas.</td></tr>';
            }
        }

        function renderEquiposSinQR() {
            const tbody = document.getElementById('tabla-equipos-sin-qr');
            if (!tbody) return;

            const headerAccion = document.getElementById('sinQrAccionHeader');
            if (headerAccion) headerAccion.classList.toggle('hidden', !isAdminModo);

            if (equiposSinQR.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500 font-medium">No hay equipos sin QR registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = equiposSinQR.map(eq => `
                <tr>
                    <td>${eq.fecha || '-'}</td>
                    <td>${eq.hora || '-'}</td>
                    <td>${eq.usuario_nombre || eq.usuario || '-'}</td>
                    <td class="font-semibold">${eq.equipo_nombre}</td>
                    <td>${eq.comentario || '-'}</td>
                    ${isAdminModo ? `
                    <td class="text-center">
                        <button onclick="eliminarEquipoSinQR(${eq.id})"
                            class="text-red-500 hover:text-red-700 transition-colors"
                            title="Eliminar (QR ya colocado)">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>` : ''}
                </tr>
            `).join('');
        }

        async function eliminarEquipoSinQR(id) {
            if (!isAdminModo) return;
            const confirmar = await mostrarConfirmacion(
                'Eliminar Equipo sin QR',
                '¿Seguro que ya se coloc\u00f3 el QR? Se eliminar\u00e1 este registro.',
                'fa-check-circle text-green-500'
            );
            if (!confirmar) return;

            try {
                const res = await fetch(`${API_BASE}/api/equipos-sin-qr/` + id + '/', {
                    method: 'DELETE',
                    headers: { 'X-API-Token': 'fxoNqZPOR7nxwAYrbqFTONNEjUO2I1Hv3Wm34YGrEL4' }
                });
                const data = await res.json();
                if (res.ok) {
                    await mostrarAlerta('Eliminado', 'Registro eliminado correctamente.', 'fa-check-circle text-green-500');
                    cargarEquiposSinQR();
                } else {
                    await mostrarAlerta('Error', data.message || 'Error al eliminar', 'fa-times-circle text-red-500');
                }
            } catch (err) {
                await mostrarAlerta('Error', 'No se pudo conectar con el servidor.', 'fa-exclamation-circle text-red-500');
            }
        }
        // FIN EQUIPOS SIN QR

        function actualizarHeaderAdmin(username = '') {
            const btn = document.getElementById('headerAdminToggle');
            const text = document.getElementById('headerAdminText');
            if (isAdminModo) {
                btn.classList.add('text-goodyear-blue', 'dark:text-goodyear-yellow');
                text.textContent = `Admin (${username.toUpperCase()})`;
                text.classList.remove('hidden');
            } else {
                btn.classList.remove('text-goodyear-blue', 'dark:text-goodyear-yellow');
                text.textContent = 'Acceso Planificación';
                text.classList.add('hidden', 'md:inline');
            }
        }

        // THEME MANAGEMENT
        function initTheme() {
            const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (isDark) document.documentElement.classList.add('dark');

            document.getElementById('themeToggle').addEventListener('click', () => {
                document.documentElement.classList.toggle('dark');
                localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                renderCharts(); // Re-render charts para adaptar colores
            });
        }

