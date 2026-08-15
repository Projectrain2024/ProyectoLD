# Círculo de Liderazgo 2026 - Plataforma de Eventos Facilitados

Plataforma interactiva en tiempo real para la facilitación ejecutiva y el diagnóstico colaborativo del **Universo de Desafíos**, desarrollada para **LHH Colombia**.

## 🚀 Características
- **Diagnóstico en Tiempo Real:** Los participantes pueden ingresar los datos de su organización y votar por los dolores más relevantes en los 4 pilares del liderazgo.
- **Flujo de Trabajo Dinámico:**
  - **Liderazgo Personal**
  - **Liderazgo de Equipos**
  - **Liderazgo de Desempeño**
  - **Liderazgo Estratégico**
- **Soporte de Retos Personalizados:** Permite a los participantes añadir dolores no contemplados en la taxonomía inicial.
- **Panel del Facilitador (Monitor en Vivo):** Visualización en tiempo real de estadísticas de participación y votos mediante SSE (Server-Sent Events).
- **Reporte Post-Evento:** Reporte de analítica consolidada y exportación en formato CSV.
- **Persistencia Segura:** Base de datos ligera e independiente basada en archivos JSON (`platform-data.json`).

---

## 🛠️ Tecnologías Utilizadas
- **Backend:** Node.js, Express.js.
- **Frontend:** Vanilla HTML5, CSS3 moderno (Custom Properties / HSL), Javascript Moderno (ES6+).
- **Real-Time:** Server-Sent Events (SSE) para actualizaciones instantáneas sin recarga de página.
- **Persistencia:** Base de datos en archivo plano JSON sin dependencias de bases de datos externas.

---

## 💻 Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Iniciar el servidor de desarrollo:
   ```bash
   npm start
   ```
   *La aplicación estará disponible en `http://localhost:3000`.*

3. Ejecutar pruebas unitarias e integración:
   ```bash
   npm test
   ```

---

## ☁️ Despliegue en Railway

Esta aplicación está completamente optimizada para desplegarse con un solo clic en **Railway**:

1. Crea un nuevo proyecto en [Railway.app](https://railway.app).
2. Selecciona **"Deploy from GitHub repo"** y elige este repositorio (`ProyectoLD`).
3. Railway detectará la configuración de Node.js de forma automática.
4. En los ajustes de Railway, genera un dominio público en la sección **"Domains"**.
5. ¡Listo! Tu plataforma estará en línea.
