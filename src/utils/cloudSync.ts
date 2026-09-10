import { collection, doc, setDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SavedVideo } from '../types';

export async function syncSavedVideoToCloud(userId: string, video: SavedVideo): Promise<void> {
  if (!userId) return;
  try {
    const docRef = doc(db, 'users', userId, 'saved_videos', video.id);
    await setDoc(docRef, {
      id: video.id,
      title: video.title,
      surahName: video.surahName,
      surahNumber: video.surahNumber,
      aspectRatio: video.aspectRatio,
      duration: video.duration,
      fileSize: video.fileSize,
      createdAt: video.createdAt,
      resolutionMode: video.resolutionMode || 'hd',
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not sync video record to Firestore:', err);
  }
}

export async function deleteSavedVideoFromCloud(userId: string, videoId: string): Promise<void> {
  if (!userId) return;
  try {
    const docRef = doc(db, 'users', userId, 'saved_videos', videoId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Could not delete video record from Firestore:', err);
  }
}

export async function loadCloudSavedVideos(userId: string): Promise<Partial<SavedVideo>[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'users', userId, 'saved_videos'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const videos: Partial<SavedVideo>[] = [];
    snap.forEach((d) => {
      videos.push(d.data() as Partial<SavedVideo>);
    });
    return videos;
  } catch (err) {
    console.warn('Could not fetch videos from Firestore:', err);
    return [];
  }
}
