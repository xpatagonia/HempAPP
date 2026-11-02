export interface GoogleDriveConfig {
  targetEmail: string;
  rootFolderName: string;
  sharedFolderUrl: string;
  appsScriptUrl: string;
  oauthClientId: string;
  autoSyncOnUpload: boolean;
  lastVerifiedAt?: string;
}

const STORAGE_KEY = 'hempc_google_drive_config_v1';

const DEFAULT_CONFIG: GoogleDriveConfig = {
  targetEmail: 'hempc.arg@gmail.com',
  rootFolderName: 'HEMPC_LEGAJOS_Y_DOCUMENTOS',
  sharedFolderUrl: '',
  appsScriptUrl: '',
  oauthClientId: '',
  autoSyncOnUpload: true,
};

export function getGoogleDriveConfig(): GoogleDriveConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveGoogleDriveConfig(config: Partial<GoogleDriveConfig>): GoogleDriveConfig {
  const updated: GoogleDriveConfig = {
    ...getGoogleDriveConfig(),
    ...config,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export interface DriveUploadPayload {
  fileName: string;
  mimeType: string;
  dataUrl: string;
  socioName?: string;
  category?: string;
  description?: string;
}

export interface DriveUploadResult {
  success: boolean;
  fileUrl?: string;
  fileId?: string;
  folderName?: string;
  message: string;
}

export async function uploadFileToHempCDrive(payload: DriveUploadPayload): Promise<DriveUploadResult> {
  const config = getGoogleDriveConfig();

  if (!config.appsScriptUrl.trim()) {
    return {
      success: false,
      message: 'No se ha configurado el Webhook de Google Drive (hempc.arg@gmail.com) en Admin Server.',
    };
  }

  try {
    const base64Data = payload.dataUrl.includes(',')
      ? payload.dataUrl.split(',')[1]
      : payload.dataUrl;

    const response = await fetch(config.appsScriptUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'uploadFile',
        targetEmail: config.targetEmail || 'hempc.arg@gmail.com',
        rootFolderName: config.rootFolderName || 'HEMPC_LEGAJOS_Y_DOCUMENTOS',
        socioFolder: payload.socioName || 'General_Institucional',
        categoryFolder: payload.category || 'Documentos',
        fileName: payload.fileName,
        mimeType: payload.mimeType || 'application/pdf',
        base64Data,
        description: payload.description || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result && result.success) {
      return {
        success: true,
        fileUrl: result.fileUrl,
        fileId: result.fileId,
        folderName: result.folderName,
        message: `Archivo sincronizado en el Google Drive de ${config.targetEmail}`,
      };
    }

    return {
      success: false,
      message: result?.error || 'Respuesta inválida del conector de Google Drive.',
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error al sincronizar con Google Drive (${config.targetEmail}): ${error?.message || 'Fallo de red'}`,
    };
  }
}

export function getAppsScriptTemplateCode(targetEmail = 'hempc.arg@gmail.com', rootFolder = 'HEMPC_LEGAJOS_Y_DOCUMENTOS'): string {
  return `// ============================================================================
// CONECTOR OFICIAL GOOGLE DRIVE - HEMPC PRO NUCLEUS (${targetEmail})
// Instrucciones:
// 1. Abre https://script.google.com iniciando sesión con ${targetEmail}
// 2. Crea un "Nuevo Proyecto", pega este código y presiona Guardar.
// 3. Haz clic en "Implementar" -> "Nueva implementación" -> Tipo: "Aplicación web".
// 4. En "Ejecutar como": selecciona "Yo (${targetEmail})".
// 5. En "Quién tiene acceso": selecciona "Cualquier persona".
// 6. Copia la URL de la aplicación web y pégala en Admin Server -> Sistema.
// ============================================================================

function getOrCreateSubfolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var rootName = data.rootFolderName || '${rootFolder}';
    var rootFolders = DriveApp.getFoldersByName(rootName);
    var rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(rootName);

    if (data.action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        account: Session.getEffectiveUser().getEmail(),
        rootFolderUrl: rootFolder.getUrl(),
        message: 'Conexión activa con Google Drive de ' + Session.getEffectiveUser().getEmail()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var socioFolder = getOrCreateSubfolder(rootFolder, data.socioFolder || 'General_Institucional');
    var catFolder = getOrCreateSubfolder(socioFolder, data.categoryFolder || 'Documentos');

    var decoded = Utilities.base64Decode(data.base64Data);
    var blob = Utilities.newBlob(decoded, data.mimeType || 'application/pdf', data.fileName || 'documento.pdf');
    var file = catFolder.createFile(blob);
    if (data.description) file.setDescription(data.description);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      folderName: socioFolder.getName() + '/' + catFolder.getName()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
}
