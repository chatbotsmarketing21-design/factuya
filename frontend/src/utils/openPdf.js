// Abre/comparte un PDF generado (blob) de forma compatible con iOS y Android.
// iOS bloquea window.open tras operaciones asíncronas, así que usamos la hoja
// de compartir nativa (permite Vista Rápida, guardar en Archivos, WhatsApp…).
export const openPdfBlob = async (pdfBlob, fileName = 'documento.pdf') => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({ files: [pdfFile], title: fileName });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
  }

  window.open(URL.createObjectURL(pdfBlob), '_blank');
};
