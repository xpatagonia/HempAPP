import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, CheckCircle, ShieldCheck, MapPin, Calendar, User, FileBadge, AlertCircle } from 'lucide-react';

export interface SignatureData {
  signatureImage: string; // Base64 PNG
  signerName: string;
  signerDniOrCuit: string;
  signerRole: 'tecnico' | 'productor';
  signerLicense?: string; // N° Matrícula Agrónomo
  timestamp: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  hash: string;
}

interface DigitalSignaturePadProps {
  role: 'tecnico' | 'productor';
  roleTitle: string;
  initialData?: SignatureData | null;
  onSave: (data: SignatureData) => void;
  onClear?: () => void;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  role,
  roleTitle,
  initialData,
  onSave,
  onClear
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [savedSignature, setSavedSignature] = useState<SignatureData | null>(initialData || null);

  const [name, setName] = useState(initialData?.signerName || '');
  const [dniCuit, setDniCuit] = useState(initialData?.signerDniOrCuit || '');
  const [license, setLicense] = useState(initialData?.signerLicense || (role === 'tecnico' ? 'CPIA / Reg. Prov. N° ' : ''));
  const [gettingGps, setGettingGps] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialData?.coordinates ? { latitude: initialData.coordinates.latitude, longitude: initialData.coordinates.longitude } : null
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI canvas
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0284c7'; // dark blue / tech ink
    ctx.lineWidth = 2.5;

    // Try auto-fetching GPS
    if (navigator.geolocation && !gpsCoords) {
      setGettingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6))
          });
          setGettingGps(false);
        },
        () => {
          setGettingGps(false);
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    }
  }, []);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e) e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSavedSignature(null);
    if (onClear) onClear();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    if (!name.trim() || !dniCuit.trim()) {
      alert('Por favor completa el Nombre y CUIT/DNI del firmante.');
      return;
    }

    const signatureImage = canvas.toDataURL('image/png');
    const timestamp = new Date().toISOString();
    
    // Generate pseudo hash for verification
    const rawData = `${name}_${dniCuit}_${role}_${timestamp}_${gpsCoords ? `${gpsCoords.latitude},${gpsCoords.longitude}` : 'NO_GPS'}`;
    let hash = 0;
    for (let i = 0; i < rawData.length; i++) {
      hash = (hash << 5) - hash + rawData.charCodeAt(i);
      hash |= 0;
    }
    const signatureHash = `AR-SIG-${Math.abs(hash).toString(16).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const data: SignatureData = {
      signatureImage,
      signerName: name.trim(),
      signerDniOrCuit: dniCuit.trim(),
      signerRole: role,
      signerLicense: license.trim() || undefined,
      timestamp,
      coordinates: gpsCoords || undefined,
      hash: signatureHash
    };

    setSavedSignature(data);
    onSave(data);
  };

  // If already signed, show the cryptographic certification badge
  if (savedSignature) {
    return (
      <div className="p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/20 dark:bg-emerald-950/30 space-y-3 transition-all">
        <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <CheckCircle size={16} className="text-emerald-400" />
            <span>Firma Registrada y Homologada</span>
          </div>
          <button
            type="button"
            onClick={clearCanvas}
            className="text-[11px] font-bold text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
          >
            <RotateCcw size={12} />
            <span>Volver a firmar</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-48 h-24 bg-white/95 rounded-xl p-2 border border-emerald-400/30 flex items-center justify-center shadow-inner">
            <img 
              src={savedSignature.signatureImage} 
              alt="Firma Digital" 
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div className="flex-1 space-y-1 text-xs text-slate-300">
            <p className="font-bold text-white text-sm">{savedSignature.signerName}</p>
            <p className="text-slate-400 font-mono">CUIT/DNI: <span className="text-emerald-300 font-bold">{savedSignature.signerDniOrCuit}</span></p>
            {savedSignature.signerLicense && (
              <p className="text-slate-400 font-mono">Matrícula: <span className="text-emerald-300 font-bold">{savedSignature.signerLicense}</span></p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-emerald-400" />
                {new Date(savedSignature.timestamp).toLocaleString('es-AR')}
              </span>
              {savedSignature.coordinates && (
                <span className="flex items-center gap-1 text-emerald-300">
                  <MapPin size={12} className="text-emerald-400" />
                  GPS: {savedSignature.coordinates.latitude}, {savedSignature.coordinates.longitude}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-mono truncate pt-1">
              Token Hash: {savedSignature.hash}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenTool size={16} className="text-emerald-500" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
            {roleTitle}
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          Firma Táctil Móvil / Tablet
        </span>
      </div>

      {/* Inputs de datos del firmante */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
            Nombre y Apellido *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Ing. Agr. Juan Pérez"
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
            CUIT o DNI *
          </label>
          <input
            type="text"
            value={dniCuit}
            onChange={(e) => setDniCuit(e.target.value)}
            placeholder="20-12345678-9"
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {role === 'tecnico' && (
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Matrícula Profesional (Colegio de Agrónomos / CPIA)
            </label>
            <input
              type="text"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="Ej: CPIA RN-3842 / MP 1045"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Recuadro táctil para firmar con dedo o stylus */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Dibuja tu firma en el recuadro (con el dedo, stylus o mouse):</span>
          {hasDrawn && (
            <button
              type="button"
              onClick={clearCanvas}
              className="text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>Borrar</span>
            </button>
          )}
        </div>

        <div className="relative rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '140px', touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair w-full block"
          />
          {!hasDrawn && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-medium">
              <span className="opacity-40 select-none">Firma aquí</span>
            </div>
          )}
        </div>
      </div>

      {/* GPS y Guardar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <MapPin size={13} className={gpsCoords ? 'text-emerald-500' : 'text-slate-400'} />
          <span>
            {gpsCoords
              ? `GPS Campo: ${gpsCoords.latitude}, ${gpsCoords.longitude}`
              : gettingGps
              ? 'Obteniendo GPS...'
              : 'GPS no disponible'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!hasDrawn}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            hasDrawn
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 cursor-pointer active:scale-95'
              : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Registrar y Certificar Firma</span>
        </button>
      </div>
    </div>
  );
};
