import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  ScanBarcode, QrCode, Search, X, CheckCircle2, AlertCircle, 
  ArrowRight, Sprout, Package, Truck, Warehouse, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBatch?: (batchId: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectBatch
}) => {
  const { seedBatches, varieties, storagePoints, seedMovements } = useAppContext();
  const navigate = useNavigate();
  const [scanInput, setScanInput] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setScanInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cleanQuery = scanInput.trim().toUpperCase();

  // Búsqueda inteligente del código escaneado
  const matchedBatch = seedBatches.find(b => 
    b.batchCode.toUpperCase() === cleanQuery ||
    (b.labelSerialNumber && b.labelSerialNumber.toUpperCase() === cleanQuery) ||
    (b.gs1Code && b.gs1Code === cleanQuery) ||
    (cleanQuery.length >= 4 && b.batchCode.toUpperCase().includes(cleanQuery))
  );

  const matchedVariety = varieties.find(v => 
    v.name.toUpperCase() === cleanQuery ||
    (v.inaseRncNumber && v.inaseRncNumber.toUpperCase() === cleanQuery)
  );

  const matchedMovement = seedMovements.find(m => 
    m.transportGuideNumber?.toUpperCase() === cleanQuery
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Si la pistola de código de barras envía Enter al final del escaneo
      if (matchedBatch && onSelectBatch) {
        onSelectBatch(matchedBatch.id);
        onClose();
      } else if (matchedVariety && onSelectBatch) {
        onSelectBatch(matchedVariety.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[85] p-4 font-mono">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* CABECERA */}
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ScanBarcode size={22} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                Terminal de Lectura Láser & Óptica
              </span>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Escaneo de Código de Barras / QR
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        {/* INPUT DE ESCÁNER */}
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5 flex items-center justify-between">
              <span>Lectura Activa (Pistola HID / Teclado)</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                LISTO
              </span>
            </label>
            <div className="relative">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escanee rótulo INASE o ingrese código..."
                className="w-full pl-10 pr-3 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-2">
              * Compatible con lectores de código de barras USB/Bluetooth y pistolas industriales Code 128 / GS1.
            </p>
          </div>

          {/* RESULTADO DE LA BÚSQUEDA */}
          {cleanQuery && (
            <div className="space-y-3">
              {matchedBatch ? (
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span>Lote Biológico Localizado</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">
                      {matchedBatch.category || 'C1'}
                    </span>
                  </div>

                  <strong className="text-sm font-black text-slate-900 dark:text-white block uppercase">
                    {matchedBatch.batchCode}
                  </strong>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Cultivar: {varieties.find(v => v.id === matchedBatch.varietyId)?.name || 'S/D'} · Rótulo: {matchedBatch.labelSerialNumber || 'Sin serie'}
                  </p>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200 dark:border-emerald-900 text-[11px]">
                    <span>Stock: <strong>{Number(matchedBatch.remainingQuantity.toFixed(2))} kg</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectBatch) onSelectBatch(matchedBatch.id);
                        navigate(`/seed-batches?variety=${matchedBatch.batchCode}`);
                        onClose();
                      }}
                      className="text-emerald-700 dark:text-emerald-300 font-bold uppercase hover:underline flex items-center gap-1"
                    >
                      <span>Abrir en Inventario</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ) : matchedVariety ? (
                <div className="p-4 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 rounded-2xl text-xs space-y-2">
                  <span className="text-[9px] font-bold uppercase text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <Sprout size={13} />
                    <span>Cultivar Oficial Localizado</span>
                  </span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white block uppercase">
                    {matchedVariety.name} ({matchedVariety.usage})
                  </strong>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    RNC INASE: {matchedVariety.inaseRncNumber || 'Homologado'} · THC &lt;0.3%
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectBatch) {
                        onSelectBatch(matchedVariety.id);
                      } else {
                        navigate(`/varieties`);
                      }
                      onClose();
                    }}
                    className="text-purple-700 dark:text-purple-300 font-bold uppercase hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>Ver Ficha Genética</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              ) : matchedMovement ? (
                <div className="p-4 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 rounded-2xl text-xs space-y-2">
                  <span className="text-[9px] font-bold uppercase text-sky-700 dark:text-sky-300 flex items-center gap-1">
                    <Truck size={13} />
                    <span>Guía de Tránsito Localizada</span>
                  </span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white block uppercase">
                    {matchedMovement.transportGuideNumber} ({matchedMovement.quantity} kg)
                  </strong>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Chofer: {matchedMovement.driverName} · Pat: {matchedMovement.vehiclePlate}
                  </p>
                  <span className="text-emerald-600 font-bold block text-[10px]">{matchedMovement.status}</span>
                </div>
              ) : (
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-center text-xs space-y-1">
                  <AlertCircle size={20} className="mx-auto text-slate-400" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">Código no registrado en base de datos</p>
                  <p className="text-[10px] text-slate-500">"{cleanQuery}"</p>
                </div>
              )}
            </div>
          )}

          {/* EJEMPLOS RÁPIDOS PARA PROBAR */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
            <span className="uppercase font-bold block mb-1">Pruebas Rápidas de Código:</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setScanInput('USO 31')}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-300 font-bold hover:bg-purple-50"
              >
                Genética: USO 31
              </button>
              <button
                type="button"
                onClick={() => setScanInput('INASE-ROT-8921-A')}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-emerald-50"
              >
                Rótulo: INASE-ROT-8921-A
              </button>
              <button
                type="button"
                onClick={() => setScanInput('COS-GRAN-FUT-2501')}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-emerald-50"
              >
                Cosecha: COS-GRAN-FUT-2501
              </button>
              <button
                type="button"
                onClick={() => setScanInput('GT-ARICCAME-2025-0089')}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-emerald-50"
              >
                Remito: GT-ARICCAME-2025-0089
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
