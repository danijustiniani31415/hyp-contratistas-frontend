/**
 * Comprime una foto (tomada con cámara de celular, típicamente 3-15MB) redimensionándola
 * y re-codificando a JPEG antes de subirla. Sin esto, subir fotos en datos móviles falla
 * seguido (timeout / cuerpo demasiado grande) — sobre todo cuando se suben varias en paralelo.
 * No falla si el navegador no puede procesarla (SVG, HEIC no soportado, etc.): devuelve el
 * archivo original en ese caso.
 */
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.75,
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.\w+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function compressImages(files: File[], maxDimension = 1600, quality = 0.75): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, maxDimension, quality)));
}
