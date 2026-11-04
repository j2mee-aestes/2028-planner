/** 사진을 Firestore 에 넣을 수 있게 압축 (긴 변 1280px → 약 180KB 이하 JPEG data URL) */
export async function compressImage(file: File, maxBytes = 180_000): Promise<string> {
  const bmp = await createImageBitmap(file);
  let side = 1280;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    for (const q of [0.75, 0.6, 0.45]) {
      const url = c.toDataURL('image/jpeg', q);
      if (url.length * 0.75 <= maxBytes) return url;
    }
    side = Math.round(side * 0.75);
  }
  throw new Error('사진이 너무 큽니다');
}
