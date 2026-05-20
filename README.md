# 🛠️ Dashboard de Inspecciones Técnicas - Goodyear Chile

Este proyecto es un **dashboard web** desarrollado para visualizar los resultados técnicos de las inspecciones realizadas en los equipos del sistema ASRS (y otras áreas) de Goodyear Chile. Permite filtrar, analizar y visualizar datos técnicos por zonas, fechas, equipos, y responsables (owners), ofreciendo una interfaz clara, moderna y profesional.

---

## 🚀 Características principales

✅ Visualización de inspecciones técnicas en **tabla detallada**  
✅ Filtros dinámicos por:
- Zona
- Equipo
- Fecha
- Owner (responsable del equipo)

✅ Tarjetas resumen con:
- Total de inspecciones
- Total de equipos distintos inspeccionados
- Cantidad de respuestas OK y NOK

✅ Gráficos interactivos usando **Recharts**:
- 📊 Inspecciones por equipo
- ✅❌ Comparativa OK / NOK por equipo

✅ Diseño responsive, limpio y profesional  
✅ Interfaz moderna usando **Tailwind CSS 4**  
✅ Backend conectado vía API REST (`NEXT_PUBLIC_API_URL` desde `.env.local`)  
✅ Código modular y escalable  
✅ Preparado para despliegue en producción

---

## 🧑‍💻 Tecnologías utilizadas

- **Next.js 15**
- **React 19**
- **Tailwind CSS 4**
- **Recharts** (gráficos de barras)
- **Typescript**
- **API Backend** en Django (no incluido en este repo)
- **.env.local** para configuración de entorno

---

## 🔧 Requisitos

- Node.js ≥ 18  
- NPM o Yarn  
- Archivo `.env.local` con la variable:
```env
NEXT_PUBLIC_API_URL=http://tu-backend/api
```

---

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/mi-dashboard-inspecciones.git

# Entrar al proyecto
cd mi-dashboard-inspecciones

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

El dashboard se ejecutará en:
```
http://localhost:3000
```

---

## 🌐 Estructura de carpetas

```
📁 app/
 ├── layout.tsx         → Layout general con logo y header
 ├── page.tsx           → Dashboard principal con tabla + filtros + gráficos
 └── globals.css        → Estilos generales con Tailwind CSS

📁 public/
 └── logo-goodyear.png  → Logo corporativo

.env.local              → Variables de entorno privadas (no se sube)
.gitignore              → Excluye .env.local, .next, etc.
```

---

## ✅ Variables de entorno

Este proyecto usa un archivo `.env.local` para definir la URL de tu backend.  
Ejemplo:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> 🔒 **Este archivo no se sube al repositorio** por seguridad.

---

## 📸 Vista general

- Logo de Goodyear centrado
- Filtros en fila ordenada
- Tabla elegante con fondo alternado
- Gráficos proporcionados y legibles
- Diseño responsivo para escritorio

---

## 📌 Estado actual

🟢 Proyecto estable y funcionando correctamente.  
📦 Última versión: `v1.0.0`  
🗂️ Subido y versionado en GitHub.

---

## 🔮 Futuras mejoras

Estas son algunas funcionalidades planificadas para futuras versiones del dashboard:

- 🔍 **Botón "Limpiar filtros"** para reiniciar todos los filtros fácilmente
- 📥 **Exportar datos a Excel o PDF**
- 👤 **Filtrar por técnico revisor**
- 📆 **Gráfico de evolución temporal** (por semana o mes)
- 📱 **Versión optimizada para móviles**
- 🔐 **Sistema de login con roles (admin, técnico, supervisor)**
- 🛰️ **Actualización automática en tiempo real**
- 💬 **Sistema de comentarios u observaciones por inspección**
- 🧠 **Detección de patrones NOK con IA** (fase avanzada)

> Puedes sugerir más mejoras creando un [issue](https://github.com/tu-usuario/mi-dashboard-inspecciones/issues) o contactando al equipo.

---

## 🙌 Autor

Desarrollado por el equipo de mantenimiento e inspección técnica en colaboración con ingeniería de automatización – Goodyear Chile.  
Soporte técnico y mejoras continuas en curso.