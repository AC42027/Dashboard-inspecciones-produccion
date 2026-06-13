# 🛠️ Dashboard de Inspecciones Técnicas - Goodyear Chile

Este proyecto es una aplicación web (Dashboard) para visualizar, filtrar y gestionar los resultados de las inspecciones técnicas de los equipos en las plantas de Goodyear Chile (especialmente enfocado en el sistema **ASRS**). El dashboard se comunica de manera directa con la API del Backend en Django.

---

## 🚀 Características Principales

*   📊 **Indicadores de Métricas en Tiempo Real:** Incorpora contadores sutiles y dinámicos de **Inspecciones Totales** e **Inspecciones del Mes** integrados en la cabecera de filtros. Se recalculan automáticamente en el cliente al cambiar cualquier filtro (como el Área, División, Zona, etc.).
*   🔍 **Filtros Dinámicos e Interactivos:** Filtros combinados por División, Área, Zona, Equipo, Fecha, Owner (Responsable), Estado (OK, NOK, PENDIENTE) y Avisos SAP (Abierto, Cerrado, Sin Aviso).
*   📋 **Tabla de Historial Detallada:** Visualización premium de registros con filas expandibles. Al hacer clic en una fila, se despliega el detalle completo de hallazgos NOK, observaciones generales y el estado del aviso en SAP PM.
*   ⚙️ **Acceso Administrador (LDAP):** Autenticación LDAP integrada para activar el Panel de Administración. Permite la edición y generación automática de rutas de inspección.
*   ⏱️ **Cierre de Sesión por Inactividad:** Por motivos de seguridad y auditoría, la sesión de administrador cuenta con un auto-cierre tras **40 minutos de inactividad**.
*   📈 **Gráficos por Zona (Chart.js):** Generación automática de gráficos visuales divididos por zona:
    *   Cantidad de inspecciones por equipo.
    *   Proporción de puntos OK vs NOK por equipo.
*   📥 **Exportación a Excel:** Descarga directa de los datos filtrados en formato `.xlsx` usando **SheetJS** y **FileSaver**, con auto-ajuste de columnas.
*   📅 **Pestaña de Planificación y Asignaciones ASRS:** 
    *   Visualización pública de asignaciones semanales y estado de cumplimiento ("Realizada" / "Pendiente").
    *   **Algoritmo de Reparto Automático:** Reparte dinámicamente los equipos de la semana entre el equipo de técnicos ASRS, aplicando restricciones lógicas avanzadas (ej. balanceo de carga y rotación de especialistas a cargo de los *Press Robots*).

---

## 🧑‍💻 Tecnologías Utilizadas

El dashboard está construido con una arquitectura ligera de alto rendimiento sin frameworks complejos del lado del cliente:

*   **HTML5 & Vanilla Javascript (ES6+)**
*   **Tailwind CSS (Vía CDN)** para un diseño responsivo, limpio y premium (con soporte nativo para **Modo Oscuro**).
*   **Chart.js** para renderizado interactivo de gráficos vectoriales (Canvas).
*   **SheetJS (xlsx.full.min.js)** para la generación de archivos Excel en el cliente.
*   **FileSaver.js** para la descarga de archivos generados.
*   **FontAwesome 6** para la iconografía premium.
*   **Integración con API REST (Django Backend)** expuesta en `http://10.107.194.110:8080`.

---

## 🌐 Estructura del Proyecto

```markdown
├── index.html                  # Dashboard principal (Estructura, Estilos Inline y Lógica JS)
├── README.md                   # Documentación del proyecto
└── public/                     # Recursos estáticos
    └── logo-goodyear.png       # Logotipo corporativo de Goodyear
```

---

## 🔧 Integración con la API Backend

El cliente consume de forma asíncrona los siguientes endpoints provistos por el backend en Django:

*   `GET /api/dashboard/inspecciones/` - Listado general de inspecciones.
*   `POST /api/login-ldap/` - Autenticación de usuarios contra servidor LDAP corporativo.
*   `POST /api/inspecciones/<id>/cerrar/` - Cierre manual de avisos SAP PM desde el dashboard.
*   `GET /api/asignaciones/?fecha=<lunes>` - Obtención de rutas asignadas para una semana.
*   `POST /api/asignaciones/guardar/` - Persistencia de asignaciones de rutas.

---

## 💻 Ejecución en Local

Al ser un desarrollo basado en tecnologías puras de navegador (HTML/JS/CSS), no requiere compilación. 

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/AC42027/Dashboard-inspecciones-produccion.git
    cd Dashboard-inspecciones-produccion
    ```

2.  **Iniciar un servidor local rápido:**
    Puedes abrir directamente el archivo `index.html` en tu navegador, o usar un servidor estático rápido (recomendado para evitar problemas de CORS y carga de recursos locales):
    
    *Con Python:*
    ```bash
    python -m http.server 3000
    ```
    
    *Con Node.js (Live Server o similar):*
    ```bash
    npx serve .
    ```

3.  Abrir en el navegador la dirección `http://localhost:3000`.

---

## 🔐 Auditoría y Seguridad

*   **Sesiones LDAP:** El token de autenticación y los privilegios de administrador se guardan de forma segura de manera temporal en el cliente.
*   **Auto-Timeout:** Cualquier inactividad que supere los **40 minutos** gatilla el cierre automático de la sesión de administración para prevenir accesos no autorizados en terminales compartidas de la planta.

---

## 🙌 Autores y Soporte

Desarrollado y mantenido por el equipo de **Mantenimiento e Ingeniería de Automatización – Goodyear Chile**.