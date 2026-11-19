import imageCompression from 'browser-image-compression';

export async function compressImageIfNeeded(file: File): Promise<File> {
  const MAX_SIZE_MB = 3;
  const isImage = file.type.startsWith('image/') && !file.type.includes('svg');

  if (!isImage) {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`Ukuran berkas melebihi batas maksimal 3 MB. Silakan kompres berkas Anda sebelum mengunggah.`);
    }
    return file;
  }

  // If already under 1.5MB, no need to compress aggressively
  if (file.size <= 1.5 * 1024 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: 2.8,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    const compressedFile = new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });

    if (compressedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`Gambar tetap melebihi 3 MB setelah dikompres. Silakan pilih resolusi yang lebih kecil.`);
    }

    return compressedFile;
  } catch (err: any) {
    if (err.message?.includes('melebihi 3 MB')) {
      throw err;
    }
    console.warn('[COMPRESS] Gagal mengompres gambar di browser, menggunakan file asli:', err);
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`Ukuran gambar (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas 3 MB.`);
    }
    return file;
  }
}
