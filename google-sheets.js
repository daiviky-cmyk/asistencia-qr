/**
 * GOOGLE SHEETS INTEGRATION MODULE
 * AsistenciaQR — google-sheets.js
 * 
 * SETUP:
 * 1. Ir a https://console.cloud.google.com
 * 2. Crear proyecto → Habilitar Google Sheets API
 * 3. Crear OAuth 2.0 Client ID (Web Application)
 * 4. Agregar tu dominio en "Authorized JavaScript origins"
 * 5. Completar las constantes de abajo
 * 6. Incluir este script en index.html antes del cierre </body>
 */

const SHEETS_CONFIG = {
  CLIENT_ID: 'TU_CLIENT_ID.apps.googleusercontent.com',
  API_KEY: 'TU_API_KEY',
  SPREADSHEET_ID: 'TU_SPREADSHEET_ID',  // ID de la URL de tu Google Sheet
  SHEET_NAME: 'Asistencia',
  DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
};

// Columnas en el Google Sheet:
// A: ID Alumno | B: Nombre | C: Fecha | D: Hora | E: Estado | F: Entrega | G: Observaciones

let tokenClient;
let gapiInited = false;
let gisInited = false;

/**
 * Inicializar Google API
 * Llamar después de que cargue el script de Google
 */
async function initGoogleSheets() {
  return new Promise((resolve) => {
    gapi.load('client', async () => {
      await gapi.client.init({
        apiKey: SHEETS_CONFIG.API_KEY,
        discoveryDocs: SHEETS_CONFIG.DISCOVERY_DOCS,
      });
      gapiInited = true;
      if (gisInited) resolve();
    });

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: SHEETS_CONFIG.CLIENT_ID,
      scope: SHEETS_CONFIG.SCOPES,
      callback: '',
    });
    gisInited = true;
    if (gapiInited) resolve();
  });
}

/**
 * Autenticar con Google
 */
function authenticateGoogle() {
  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) { reject(resp.error); return; }
      resolve(resp);
    };
    if (gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

/**
 * Crear encabezados en el Sheet si no existen
 */
async function ensureHeaders() {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      range: `${SHEETS_CONFIG.SHEET_NAME}!A1:G1`,
    });
    if (!response.result.values || response.result.values.length === 0) {
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
        range: `${SHEETS_CONFIG.SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values: [['ID Alumno', 'Nombre', 'Fecha', 'Hora', 'Estado', 'Entrega', 'Observaciones']]
        }
      });
    }
  } catch (e) {
    console.error('Error verificando headers:', e);
  }
}

/**
 * Guardar un registro de asistencia en Google Sheets
 * @param {Object} record - { studentId, name, date, time, status, delivered, observations }
 */
async function saveAttendanceRecord(record) {
  try {
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      range: `${SHEETS_CONFIG.SHEET_NAME}!A:G`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          record.studentId,
          record.name,
          record.date,
          record.time,
          record.status,
          record.delivered ? 'Sí' : 'No',
          record.observations || ''
        ]]
      }
    });
    console.log('✓ Registro guardado en Google Sheets');
    return true;
  } catch (error) {
    console.error('Error guardando en Sheets:', error);
    // Guardar en cola offline
    queueOfflineRecord(record);
    return false;
  }
}

/**
 * Guardar múltiples registros de una vez (al finalizar clase)
 * @param {Array} records - Array de registros
 */
async function saveClassRecords(records) {
  try {
    const rows = records.map(r => [
      r.studentId, r.name, r.date, r.time, r.status,
      r.delivered ? 'Sí' : 'No',
      r.observations || ''
    ]);
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      range: `${SHEETS_CONFIG.SHEET_NAME}!A:G`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: rows }
    });
    return true;
  } catch (error) {
    console.error('Error guardando registros:', error);
    records.forEach(r => queueOfflineRecord(r));
    return false;
  }
}

/**
 * Leer todos los registros del Sheet
 */
async function getAllRecords() {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      range: `${SHEETS_CONFIG.SHEET_NAME}!A2:G`,
    });
    const rows = response.result.values || [];
    return rows.map(row => ({
      studentId: row[0] || '',
      name: row[1] || '',
      date: row[2] || '',
      time: row[3] || '',
      status: row[4] || '',
      delivered: row[5] === 'Sí',
      observations: row[6] || '',
    }));
  } catch (error) {
    console.error('Error leyendo registros:', error);
    return [];
  }
}

/**
 * Actualizar observación y entrega de un alumno en una fecha específica
 */
async function updateRecord(studentId, date, delivered, observations) {
  try {
    // Buscar la fila
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      range: `${SHEETS_CONFIG.SHEET_NAME}!A:G`,
    });
    const rows = response.result.values || [];
    const rowIndex = rows.findIndex(r => r[0] === studentId && r[2] === date);
    if (rowIndex === -1) return false;

    const sheetRow = rowIndex + 1; // 1-indexed, +1 por header
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      range: `${SHEETS_CONFIG.SHEET_NAME}!F${sheetRow}:G${sheetRow}`,
      valueInputOption: 'RAW',
      resource: { values: [[delivered ? 'Sí' : 'No', observations]] }
    });
    return true;
  } catch (error) {
    console.error('Error actualizando registro:', error);
    return false;
  }
}

/* ── OFFLINE QUEUE ── */
const OFFLINE_KEY = 'att_offline_queue';

function queueOfflineRecord(record) {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
  queue.push({ ...record, queuedAt: new Date().toISOString() });
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
  console.log('Guardado en cola offline. Total pendientes:', queue.length);
}

async function syncOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
  if (queue.length === 0) return;
  
  console.log(`Sincronizando ${queue.length} registros offline...`);
  const success = await saveClassRecords(queue);
  if (success) {
    localStorage.removeItem(OFFLINE_KEY);
    console.log('✓ Cola offline sincronizada');
    return queue.length;
  }
  return 0;
}

// Intentar sincronizar al volver a conectar
window.addEventListener('online', () => {
  console.log('Conexión restaurada. Sincronizando...');
  syncOfflineQueue().then(n => {
    if (n > 0) console.log(`${n} registros sincronizados con Google Sheets`);
  });
});

// Exportar funciones
window.SheetsAPI = {
  init: initGoogleSheets,
  auth: authenticateGoogle,
  saveRecord: saveAttendanceRecord,
  saveClassRecords,
  getAllRecords,
  updateRecord,
  syncOffline: syncOfflineQueue,
};
