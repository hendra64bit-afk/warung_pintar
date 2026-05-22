import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: any) => void;
}

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    // Minta izin kamera secara eksplisit terlebih dahulu
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        setPermissionGranted(true);
        // Hentikan stream sementara karena html5-qrcode akan memulainya sendiri
        stream.getTracks().forEach(track => track.stop());

        scanner = new Html5QrcodeScanner(
          'reader',
          { 
            fps: 10, 
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            scanner?.clear();
            onScan(decodedText);
          },
          (err) => {
            if (onError) onError(err);
          }
        );
      })
      .catch((err) => {
        setPermissionGranted(false);
        if (onError) onError(err);
      });

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {
          // Ignore clear errors on unmount
        });
      }
    };
  }, [onScan, onError]);

  if (permissionGranted === false) {
    return (
      <div className="w-full p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-center text-sm font-medium flex flex-col gap-2">
        <p>Akses kamera ditolak.</p>
        <p className="text-xs font-normal">Pastikan Anda telah mengizinkan akses kamera di browser Anda. Jika Anda baru saja menjalankan ini, silakan <b>Refresh Halaman AI Studio</b> agar sistem dapat meminta izin kamera ke browser.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex-col flex items-center justify-center min-h-[250px] overflow-hidden rounded-xl bg-slate-100 relative">
      {permissionGranted === null ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 opacity-90 z-10 flex-col gap-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Meminta izin kamera...</p>
        </div>
      ) : null}
      <div id="reader" className="w-full"></div>
    </div>
  );
}
