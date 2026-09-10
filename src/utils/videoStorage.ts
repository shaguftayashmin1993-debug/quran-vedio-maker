/**
 * Persistent Video Storage Engine using Browser IndexedDB.
 * Ensures generated high-definition videos and audio blobs survive page refreshes,
 * tab closures, and session restarts without losing binary data.
 */

const DB_NAME = 'quran_video_maker_storage_v1';
const DB_VERSION = 1;
const STORE_NAME = 'video_blobs';

interface StoredVideoRecord {
  id: string;
  videoBlob: Blob;
  audioBlob?: Blob;
  mimeType: string;
  fileSize: string;
  duration: number;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'));
  });
}

/**
 * Saves a video blob (and optional audio blob) permanently in IndexedDB.
 */
export async function saveVideoBlobToDB(
  id: string,
  videoBlob: Blob,
  audioBlob?: Blob,
  meta?: { fileSize?: string; duration?: number }
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: StoredVideoRecord = {
        id,
        videoBlob,
        audioBlob,
        mimeType: videoBlob.type || 'video/webm',
        fileSize: meta?.fileSize || `${(videoBlob.size / (1024 * 1024)).toFixed(1)} MB`,
        duration: meta?.duration || 0,
        updatedAt: Date.now()
      };

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
  } catch (err) {
    console.warn('Could not save video blob to IndexedDB (falling back to memory):', err);
  }
}

/**
 * Retrieves a stored video blob from IndexedDB by its unique video ID.
 */
export async function getVideoBlobFromDB(
  id: string
): Promise<{ videoBlob: Blob; audioBlob?: Blob; mimeType: string } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const result = getReq.result as StoredVideoRecord | undefined;
        if (result && result.videoBlob) {
          resolve({
            videoBlob: result.videoBlob,
            audioBlob: result.audioBlob,
            mimeType: result.mimeType
          });
        } else {
          resolve(null);
        }
      };

      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn(`Error reading video blob ${id} from IndexedDB:`, err);
    return null;
  }
}

/**
 * Removes a video blob from IndexedDB.
 */
export async function deleteVideoBlobFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delReq = store.delete(id);
      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
    });
  } catch (err) {
    console.warn(`Error deleting video blob ${id} from IndexedDB:`, err);
  }
}

/**
 * Retrieves all stored video records IDs currently in IndexedDB.
 */
export async function getAllStoredVideoIds(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const keysReq = store.getAllKeys();

      keysReq.onsuccess = () => {
        const keys = keysReq.result as string[];
        resolve(keys || []);
      };

      keysReq.onerror = () => reject(keysReq.error);
    });
  } catch (err) {
    console.warn('Error reading stored video keys:', err);
    return [];
  }
}
