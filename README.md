# 📱 AsistenciaQR — Guía de Instalación y Deploy

## ¿Qué incluye?
- `index.html` — App principal (PWA completa, funciona 100% offline)
- `manifest.json` — Configuración para instalar en Android/iOS
- `sw.js` — Service Worker para modo offline
- `google-sheets.js` — Módulo de integración con Google Sheets
- `README.md` — Esta guía

---

## 🚀 OPCIÓN 1: Deploy en Vercel (Recomendado)

### Paso 1: Crear repositorio
```bash
# Crear carpeta del proyecto
mkdir asistencia-qr
cd asistencia-qr

# Copiar todos los archivos del proyecto aquí

# Inicializar git
git init
git add .
git commit -m "AsistenciaQR v1.0"
```

### Paso 2: Subir a GitHub
1. Ir a https://github.com/new
2. Crear repositorio "asistencia-qr"
3. Seguir instrucciones para push

### Paso 3: Deploy en Vercel
1. Ir a https://vercel.com
2. Importar desde GitHub
3. Seleccionar el repositorio
4. Click en **Deploy**
5. En segundos tendrás una URL pública

### Paso 4: Instalar en el celular
- **Android**: Abrir Chrome → entrar a tu URL → menú ⋮ → "Agregar a pantalla de inicio"
- **iOS**: Abrir Safari → entrar a tu URL → botón compartir → "Agregar a pantalla de inicio"

---

## 🚀 OPCIÓN 2: Deploy en Firebase Hosting

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar proyecto
firebase init hosting
# → public directory: . (punto)
# → single-page app: No
# → GitHub deploys: No

# Deploy
firebase deploy
```

---

## 📊 CONFIGURAR GOOGLE SHEETS

### Paso 1: Crear el Google Sheet
1. Ir a https://sheets.google.com
2. Crear nueva hoja
3. Nombrar la pestaña: **Asistencia**
4. Copiar el ID de la URL:
   - URL: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`

### Paso 2: Configurar Google Cloud Console
1. Ir a https://console.cloud.google.com
2. Crear proyecto nuevo (ej: "AsistenciaQR")
3. **Habilitar APIs**:
   - Buscar "Google Sheets API" → Habilitar
4. **Crear API Key**:
   - Ir a "Credenciales" → "+ Crear credencial" → API Key
   - Copiar la clave
5. **Crear OAuth 2.0**:
   - "+ Crear credencial" → ID de cliente OAuth
   - Tipo: Aplicación web
   - Agregar en "Orígenes autorizados": tu URL de Vercel/Firebase
   - Copiar el Client ID

### Paso 3: Configurar en el código
Abrir `google-sheets.js` y completar:
```javascript
const SHEETS_CONFIG = {
  CLIENT_ID: 'TU_CLIENT_ID.apps.googleusercontent.com',
  API_KEY: 'TU_API_KEY',
  SPREADSHEET_ID: 'TU_SPREADSHEET_ID',
  // ...
};
```

### Paso 4: Activar Google Sheets en la app
En `index.html`, antes del cierre `</body>`, agregar:
```html
<!-- Google APIs -->
<script src="https://apis.google.com/js/api.js"></script>
<script src="https://accounts.google.com/gsi/client"></script>
<script src="google-sheets.js"></script>

<script>
// Inicializar Google Sheets después del login
async function initSheetsAfterLogin() {
  await SheetsAPI.init();
  await SheetsAPI.auth();
  await SheetsAPI.syncOffline(); // sincronizar registros guardados offline
}
// Llamar desde doLogin():
// initSheetsAfterLogin().catch(console.error);
</script>
```

### Estructura del Sheet generada automáticamente:
| A: ID Alumno | B: Nombre | C: Fecha | D: Hora | E: Estado | F: Entrega | G: Observaciones |
|---|---|---|---|---|---|---|
| STU-001 | Lucas Ramírez | 2024-05-15 | 08:03 | Presente | Sí | — |
| STU-002 | Valentina Gómez | 2024-05-15 | 08:18 | Tarde | No | — |
| STU-003 | Mateo Fernández | 2024-05-15 | — | Ausente | No | Enfermo |

---

## 📱 FUNCIONALIDADES

### Flujo de clase
1. **Iniciar clase** → Define hora de inicio y tolerancia (15 min)
2. **Escanear QR** → Registra Presente o Tarde según la hora
3. **Panel en tiempo real** → Ve quién falta
4. **Finalizar clase** → Los no escaneados se marcan Ausentes

### Lógica de asistencia
- ✅ **Presente**: Escaneado en los primeros 15 minutos
- ⏱ **Tarde**: Escaneado después de los 15 minutos
- ❌ **Ausente**: No escaneado al finalizar la clase
- ⚠️ **Duplicado**: Si se intenta escanear dos veces el mismo QR

### Generación de QR
1. Ir a pestaña **Alumnos**
2. Tap en **Ver QR** al lado del alumno
3. **Descargar** o imprimir el código

### Modo sin cámara (demo/testing)
Si la cámara no está disponible, aparece el botón **"Modo demo"** que simula el escaneo del siguiente alumno pendiente.

---

## 🔧 PERSONALIZACIÓN

### Cambiar tiempo de tolerancia
En `index.html`, buscar:
```javascript
toleranceMs: 15 * 60 * 1000,  // 15 minutos
```
Cambiar `15` por los minutos deseados.

### Agregar alumnos
- Desde la app: Pestaña **Alumnos** → botón **+ Agregar**
- Los datos se guardan en localStorage y se sincronizan con Sheets

### Colores de estado
Los colores se pueden cambiar en las variables CSS:
```css
--green: #22c55e;   /* Presente */
--yellow: #f59e0b;  /* Tarde */
--red: #ef4444;     /* Ausente */
```

---

## 🔐 SEGURIDAD

- El login demo acepta cualquier credencial (ideal para uso personal)
- Para producción, integrar Firebase Authentication:
  ```bash
  npm install firebase
  ```
  Usar `signInWithEmailAndPassword()` o `signInWithGoogle()`

- Los QR usan el formato `QR_STU-XXX` — IDs únicos por alumno
- No se pueden escanear QR fuera de una clase activa
- No se puede registrar el mismo alumno dos veces por clase

---

## 📦 DEPENDENCIAS (CDN, sin instalación)

| Librería | Versión | Uso |
|---|---|---|
| html5-qrcode | 2.3.8 | Escaneo de QR con cámara |
| qrcode | 1.5.3 | Generación de QR |
| Chart.js | 4.4.0 | Gráficos de estadísticas |
| Google Fonts | — | Tipografías DM Sans + Space Mono |

---

## ✅ CHECKLIST DE DEPLOY

- [ ] Archivos subidos a Vercel/Firebase
- [ ] HTTPS activo (obligatorio para cámara)
- [ ] App instalada en celular del docente
- [ ] Google Sheets creado con pestaña "Asistencia"
- [ ] API Key y Client ID configurados
- [ ] QRs generados e impresos para cada alumno
- [ ] Prueba de escaneo realizada

---

## 🆘 PROBLEMAS COMUNES

**"No se pudo acceder a la cámara"**
→ La app DEBE estar en HTTPS para acceder a la cámara. Usar Vercel/Firebase garantiza HTTPS.

**"QR desconocido"**
→ El QR no corresponde a ningún alumno registrado. Re-generar desde la sección Alumnos.

**Los datos no se guardan en Sheets**
→ Verificar que el SPREADSHEET_ID y las credenciales sean correctos. Los datos se guardan en localStorage mientras tanto.

**La app no se instala en iOS**
→ Usar Safari (no Chrome) en iOS para instalar PWAs.
