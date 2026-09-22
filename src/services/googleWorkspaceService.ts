import { MediaSpot } from '../types/ooh';
import { formatIDR, formatCompactNumber } from '../utils/formatters';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
}

export interface GoogleDocDetail {
  documentId: string;
  title: string;
  bodyText: string;
  revisionId?: string;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: Array<{
    sheetId: number;
    title: string;
    rowCount?: number;
    columnCount?: number;
  }>;
}

export interface SpreadsheetValuesResult {
  range: string;
  majorDimension: string;
  values: string[][];
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface DrivePhotoItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  directEmbedUrl: string;
  width?: number;
  height?: number;
  parents?: string[];
}

/**
 * Designated Target Google Drive Folder restricted by admin suherman.reklame2012@gmail.com
 */
export const TARGET_DRIVE_FOLDER_ID = '16cxwHJQ3YUdMFjcS0nvcHXguSeS5EDxh';
export const TARGET_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/16cxwHJQ3YUdMFjcS0nvcHXguSeS5EDxh?usp=sharing';

/**
 * Fetch metadata of the designated target folder
 */
export async function fetchTargetFolderMetadata(
  accessToken: string,
  folderId = TARGET_DRIVE_FOLDER_ID
): Promise<DriveFolderInfo | null> {
  try {
    const url = new URL(`https://www.googleapis.com/drive/v3/files/${folderId}`);
    url.searchParams.set('supportsAllDrives', 'true');
    url.searchParams.set('fields', 'id, name, webViewLink');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Unable to fetch folder metadata:', err);
    return null;
  }
}

/**
 * List files strictly from the designated Google Drive folder only
 */
export async function listDriveFiles(
  accessToken: string,
  queryFilter?: string,
  pageSize = 50,
  folderId = TARGET_DRIVE_FOLDER_ID
): Promise<DriveFileItem[]> {
  // STRICT CONSTRAINT: Only list items that are children of the designated folder
  const baseQuery = `'${folderId}' in parents and trashed = false`;
  const fullQuery = queryFilter ? `${baseQuery} and (${queryFilter})` : baseQuery;

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', fullQuery);
  url.searchParams.set('pageSize', pageSize.toString());
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('includeItemsFromAllDrives', 'true');
  url.searchParams.set(
    'fields',
    'files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink, owners(displayName, emailAddress), parents)'
  );

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gagal mengambil daftar berkas dari folder target Google Drive (${res.status})`
    );
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Specifically list Google Docs documents strictly inside the designated folder
 */
export async function listGoogleDocs(accessToken: string): Promise<DriveFileItem[]> {
  return listDriveFiles(accessToken, "mimeType = 'application/vnd.google-apps.document'");
}

/**
 * Specifically list Google Sheets spreadsheets strictly inside the designated folder
 */
export async function listGoogleSheets(accessToken: string): Promise<DriveFileItem[]> {
  return listDriveFiles(accessToken, "mimeType = 'application/vnd.google-apps.spreadsheet'");
}

/**
 * Fetch text content of a Google Doc using Google Docs v1 API
 */
export async function fetchGoogleDocDetail(
  accessToken: string,
  documentId: string
): Promise<GoogleDocDetail> {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gagal membaca isi Google Doc (${res.status})`
    );
  }

  const doc = await res.json();
  let extractedText = '';

  if (doc.body && doc.body.content) {
    for (const elem of doc.body.content) {
      if (elem.paragraph && elem.paragraph.elements) {
        for (const pElem of elem.paragraph.elements) {
          if (pElem.textRun && pElem.textRun.content) {
            extractedText += pElem.textRun.content;
          }
        }
      }
    }
  }

  return {
    documentId: doc.documentId,
    title: doc.title,
    bodyText: extractedText.trim(),
    revisionId: doc.revisionId
  };
}

/**
 * Generate and upload an OOH/DOOH proposal report directly into user's Google Drive as a new document
 */
export async function createOOHReportDocInDrive(
  accessToken: string,
  docTitle: string,
  spots: MediaSpot[],
  userEmail: string
): Promise<DriveFileItem> {
  // 1. Create a metadata document strictly inside the designated Google Drive folder
  const metadata = {
    name: docTitle,
    mimeType: 'application/vnd.google-apps.document',
    description: `Laporan Penawaran Inventaris Media OOH & DOOH Jawa Barat untuk admin ${userEmail}`,
    parents: [TARGET_DRIVE_FOLDER_ID]
  };

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gagal membuat Google Doc di Google Drive (${createRes.status})`
    );
  }

  const newDoc = await createRes.json();

  // 2. Populate structured text content into the created document using Google Docs API batchUpdate
  const totalSpots = spots.length;
  const availableSpots = spots.filter((s) => s.isAvailable).length;
  const totalTraffic = spots.reduce((acc, s) => acc + s.dailyTraffic, 0);
  const totalImpressions = spots.reduce((acc, s) => acc + s.dailyImpressions, 0);

  let docBody = `LAPORAN PENGUKURAN & INVENTARIS MEDIA OOH / DOOH JAWA BARAT\n`;
  docBody += `Admin Pengelola: ${userEmail}\n`;
  docBody += `Tanggal Sinkronisasi: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}\n\n`;
  docBody += `RINGKASAN EKSEKUTIF:\n`;
  docBody += `- Total Titik Terdata: ${totalSpots} media (Kota Bandung & Jawa Barat)\n`;
  docBody += `- Titik Tersedia: ${availableSpots} media\n`;
  docBody += `- Total Estimasi Traffic: ${totalTraffic.toLocaleString('id-ID')} kendaraan/hari\n`;
  docBody += `- Total Impresi Terukur: ${formatCompactNumber(totalImpressions)} OTS/hari\n\n`;
  docBody += `DAFTAR TITIK MEDIA UNGGULAN:\n`;

  spots.slice(0, 15).forEach((spot, idx) => {
    docBody += `${idx + 1}. ${spot.name} (${spot.city} - ${spot.district})\n`;
    docBody += `   - Format: ${spot.mediaType} (${spot.size}, ${spot.layout})\n`;
    docBody += `   - Karakteristik: ${spot.locationType} | Traffic: ${spot.trafficDensity} (~${spot.dailyTraffic.toLocaleString('id-ID')} kend/hari)\n`;
    docBody += `   - Impresi: ${spot.dailyImpressions.toLocaleString('id-ID')} OTS/hari | Tarif 1 Bln: ${formatIDR(spot.pricing.oneMonth)}\n`;
    docBody += `   - Status: ${spot.isAvailable ? 'TERSEDIA' : 'TERSEWA'}\n\n`;
  });

  docBody += `\nKetentuan Standar: Produksi materi 3 hari kerja setelah SPK, harga belum termasuk PPN 11%, sudah termasuk listrik & asuransi.\n`;

  try {
    await fetch(`https://docs.googleapis.com/v1/documents/${newDoc.id}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: docBody
            }
          }
        ]
      })
    });
  } catch (err) {
    console.warn('Doc content insertion notice:', err);
  }

  return {
    id: newDoc.id,
    name: docTitle,
    mimeType: 'application/vnd.google-apps.document',
    modifiedTime: new Date().toISOString(),
    webViewLink: `https://docs.google.com/document/d/${newDoc.id}/edit`
  };
}

/**
 * Fetch spreadsheet metadata including sheet tabs using Google Sheets v4 API
 */
export async function fetchSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetInfo> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gagal mengambil metadata spreadsheet (${res.status})`
    );
  }

  const data = await res.json();
  const sheets = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId ?? 0,
    title: s.properties?.title || 'Sheet1',
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount
  }));

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Tanpa Judul',
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets
  };
}

/**
 * Fetch values from a range in a Google Sheet
 */
export async function fetchSpreadsheetValues(
  accessToken: string,
  spreadsheetId: string,
  range = 'A1:T100'
): Promise<SpreadsheetValuesResult> {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gagal membaca isi sel Google Sheet (${res.status})`
    );
  }

  const data = await res.json();
  return {
    range: data.range || range,
    majorDimension: data.majorDimension || 'ROWS',
    values: data.values || []
  };
}

/**
 * Create a new Google Spreadsheet in the designated folder or sync existing one with current spots inventory
 */
export async function createOrSyncOOHSpreadsheet(
  accessToken: string,
  title: string,
  spots: MediaSpot[],
  userEmail: string,
  existingSpreadsheetId?: string
): Promise<DriveFileItem> {
  let targetId = existingSpreadsheetId;
  let targetName = title;

  // 1. Create spreadsheet file in Google Drive if not updating existing
  if (!targetId) {
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: title,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [TARGET_DRIVE_FOLDER_ID],
        description: `Sinkronisasi Inventaris Media OOH & DOOH Jawa Barat untuk admin ${userEmail}`
      })
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gagal membuat Google Sheet baru di Google Drive (${createRes.status})`);
    }

    const newFile = await createRes.json();
    targetId = newFile.id;
    targetName = newFile.name;
  }

  if (!targetId) {
    throw new Error('ID Spreadsheet tidak valid.');
  }

  // 2. Fetch sheet details to get first sheet tab title and ID
  const sheetMeta = await fetchSpreadsheetDetails(accessToken, targetId);
  const firstSheet = sheetMeta.sheets[0] || { sheetId: 0, title: 'Sheet1' };
  const sheetTitle = firstSheet.title;

  // 3. Prepare structured header and rows
  const headers = [
    'No',
    'ID Titik',
    'Nama Media / Lokasi',
    'Tipe Media',
    'Kota / Kabupaten',
    'Kecamatan',
    'Alamat Lengkap',
    'Ukuran (P x L)',
    'Orientasi',
    'Penerangan',
    'Trafik Harian (Kend/Hari)',
    'Impresi Harian (OTS)',
    'Tarif Sewa / Bulan (Rp)',
    'Tarif Sewa / Tahun (Rp)',
    'Status Ketersediaan',
    'Latitude',
    'Longitude',
    'Tautan Google Maps',
    'Terakhir Diperbarui'
  ];

  const dataRows = spots.map((spot, idx) => [
    idx + 1,
    spot.id,
    spot.name,
    spot.mediaType,
    spot.city,
    spot.district,
    spot.roadName || `${spot.district}, ${spot.city}`,
    spot.size,
    spot.layout,
    spot.lighting || '-',
    spot.dailyTraffic,
    spot.dailyImpressions,
    spot.pricing.oneMonth,
    spot.pricing.oneYear,
    spot.isAvailable ? 'TERSEDIA' : 'TERSEWA',
    spot.coordinates.lat,
    spot.coordinates.lng,
    `https://www.google.com/maps?q=${spot.coordinates.lat},${spot.coordinates.lng}`,
    spot.updatedAt || new Date().toISOString().split('T')[0]
  ]);

  const allRows = [headers, ...dataRows];

  // 4. Update cell values in the sheet
  const updateRange = `'${sheetTitle}'!A1:S${allRows.length}`;
  const valuesUrl = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/${encodeURIComponent(updateRange)}`
  );
  valuesUrl.searchParams.set('valueInputOption', 'USER_ENTERED');

  const updateRes = await fetch(valuesUrl.toString(), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: updateRange,
      majorDimension: 'ROWS',
      values: allRows
    })
  });

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal menulis data ke Google Sheet (${updateRes.status})`);
  }

  // 5. Apply header formatting and styling via batchUpdate
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          // Freeze top row
          {
            updateSheetProperties: {
              properties: {
                sheetId: firstSheet.sheetId,
                gridProperties: {
                  frozenRowCount: 1
                }
              },
              fields: 'gridProperties.frozenRowCount'
            }
          },
          // Format header row (Row 0): Dark emerald green background, white bold text, center align
          {
            repeatCell: {
              range: {
                sheetId: firstSheet.sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.05,
                    green: 0.45,
                    blue: 0.28
                  },
                  horizontalAlignment: 'CENTER',
                  textFormat: {
                    foregroundColor: {
                      red: 1.0,
                      green: 1.0,
                      blue: 1.0
                    },
                    bold: true,
                    fontSize: 10
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          }
        ]
      })
    });
  } catch (styleErr) {
    console.warn('BatchUpdate styling notice:', styleErr);
  }

  return {
    id: targetId,
    name: targetName,
    mimeType: 'application/vnd.google-apps.spreadsheet',
    modifiedTime: new Date().toISOString(),
    webViewLink: `https://docs.google.com/spreadsheets/d/${targetId}/edit`
  };
}

/**
  * Retrieve image files from Google Drive of suherman.reklame2012@gmail.com
  * Supports folder-targeted query, whole-drive fallback, and name search.
  */
export async function listDrivePhotos(
  accessToken: string,
  options?: {
    search?: string;
    folderOnly?: boolean;
    folderId?: string;
    pageSize?: number;
  }
): Promise<DrivePhotoItem[]> {
  const targetFolderId = options?.folderId || TARGET_DRIVE_FOLDER_ID;
  const folderOnly = options?.folderOnly ?? true;

  let query = "mimeType contains 'image/' and trashed = false";

  if (folderOnly) {
    query = `'${targetFolderId}' in parents and ${query}`;
  }

  if (options?.search && options.search.trim()) {
    const cleanSearch = options.search.trim().replace(/'/g, "\\'");
    query += ` and name contains '${cleanSearch}'`;
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('pageSize', (options?.pageSize || 60).toString());
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('includeItemsFromAllDrives', 'true');
  url.searchParams.set(
    'fields',
    'files(id, name, mimeType, modifiedTime, size, webViewLink, thumbnailLink, imageMediaMetadata(width, height), parents)'
  );

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membaca foto dari Google Drive (${res.status})`);
  }

  const data = await res.json();
  const files: any[] = data.files || [];

  // If folderOnly query yielded 0 results, fall back seamlessly to querying all images across user's Google Drive
  if (folderOnly && files.length === 0 && !options?.search) {
    return listDrivePhotos(accessToken, { ...options, folderOnly: false });
  }

  return files.map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    size: f.size,
    webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
    thumbnailLink: f.thumbnailLink || `https://lh3.googleusercontent.com/d/${f.id}=s400`,
    directEmbedUrl: `https://lh3.googleusercontent.com/d/${f.id}`,
    width: f.imageMediaMetadata?.width,
    height: f.imageMediaMetadata?.height,
    parents: f.parents
  }));
}

/**
 * Fetch raw image media from Google Drive with OAuth Bearer token and convert to base64 Data URL.
 * Bypasses CORS and works seamlessly for non-public Google Drive files.
 */
export async function fetchDriveImageAsBase64(
  accessToken: string,
  fileId: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    if (!res.ok) {
      console.warn(`Failed to fetch media for file ${fileId}: status ${res.status}`);
      return null;
    }
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn(`Error fetching Drive photo base64 for ${fileId}:`, err);
    return null;
  }
}

/**
 * Upload a new billboard photo directly to the designated Google Drive folder
 * under account suherman.reklame2012@gmail.com
 */
export async function uploadPhotoToDriveFolder(
  accessToken: string,
  file: File,
  folderId = TARGET_DRIVE_FOLDER_ID
): Promise<DrivePhotoItem> {
  const metadata = {
    name: file.name,
    mimeType: file.type || 'image/jpeg',
    parents: [folderId]
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const fileBlob = new Blob([fileData], { type: file.type || 'image/jpeg' });

  const multipartBody = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadataBlob,
    delimiter,
    `Content-Type: ${file.type || 'image/jpeg'}\r\n\r\n`,
    fileBlob,
    closeDelimiter
  ]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,modifiedTime,size,webViewLink,thumbnailLink,imageMediaMetadata(width,height)',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal mengunggah foto ke Google Drive (${res.status})`);
  }

  const uploaded = await res.json();
  return {
    id: uploaded.id,
    name: uploaded.name,
    mimeType: uploaded.mimeType,
    modifiedTime: uploaded.modifiedTime,
    size: uploaded.size,
    webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
    thumbnailLink: uploaded.thumbnailLink || `https://lh3.googleusercontent.com/d/${uploaded.id}=s400`,
    directEmbedUrl: `https://lh3.googleusercontent.com/d/${uploaded.id}`,
    width: uploaded.imageMediaMetadata?.width,
    height: uploaded.imageMediaMetadata?.height
  };
}
