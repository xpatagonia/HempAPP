import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  ScanBarcode, QrCode, Search, X, CheckCircle2, AlertCircle, 
  ArrowRight, Sprout, Package, Truck, Warehouse, ExternalLink, Scale, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPlotSeedLoad, formatBatchMassKg, getMotherSeedLotCode, convertSeedMassToKg } from '../src/utils/seedTraceability';

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
  const { seedBatches, varieties, storagePoints, seedMovements, plots, locations } = useAppContext();
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

  // 1. Búsqueda de Lote de Semilla (Código de Lote, Lote Madre Certificación, Rótulo INASE o GS1)
  const matchedBatch = cleanQuery
    ? seedBatches.find(b =>
        b.batchCode.toUpperCase() === cleanQuery ||
        (b.certificationNumber && b.certificationNumber.toUpperCase() === cleanQuery) ||
        (b.labelSerialNumber && b.labelSerialNumber.toUpperCase() === cleanQuery) ||
        (b.gs1Code && b.gs1Code.toUpperCase() === cleanQuery) ||
        (cleanQuery.length >= 4 && b.batchCode.toUpperCase().includes(cleanQuery))
      )
    : undefined;

  // 2. Búsqueda de Parcela / Unidad Productiva / Acta de Siembra / Código de Barras GS1 de Parcela
  const matchedPlot = cleanQuery
    ? plots.find(p =>
        p.id.toUpperCase() === cleanQuery ||
        p.name.toUpperCase() === cleanQuery ||
        (p.closureActCode && p.closureActCode.toUpperCase() === cleanQuery) ||
        (p.closureBarcode && p.closureBarcode.toUpperCase() === cleanQuery) ||
        (cleanQuery.length >= 4 && p.name.toUpperCase().includes(cleanQuery))
      )
    : undefined;

  // 3. Búsqueda de Variedad / Genética
  const matchedVariety = cleanQuery
    ? varieties.find(v =>
        v.name.toUpperCase() === cleanQuery ||
        (v.inaseRncNumber && v.inaseRncNumber.toUpperCase() === cleanQuery)
      )
    : undefined;

  // 4. Búsqueda de Remito / Guía de Tránsito
  const matchedMovement = cleanQuery
    ? seedMovements.find(m =>
        m.transportGuideNumber?.toUpperCase() === cleanQuery ||
        (cleanQuery.length >= 5 && m.transportGuideNumber?.toUpperCase().includes(cleanQuery))
      )
    : undefined;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matchedBatch && onSelectBatch) {
        onSelectBatch(matchedBatch.id);
        onClose();
      } else if (matchedPlot) {
        if (onSelectBatch && matchedPlot.seedBatchId) {
          onSelectBatch(matchedPlot.seedBatchId);
        } else {
          navigate(`/plots/${matchedPlot.id}`);
        }
        onClose();
      } else if (matchedVariety && onSelectBatch) {
        onSelectBatch(matchedVariety.id);
        onClose();
      }
    }
  };

  // Datos enriquecidos para Lote de Semilla localizado
  const batchDetails = matchedBatch
    ? (() => {
        const plotsUsingBatch = plots.filter(p => p.seedBatchId === matchedBatch.id);
        const totalUsedKg = plotsUsingBatch.reduce(
          (acc, p) => acc + convertSeedMassToKg(p.usedSeedValue, p.usedSeedUnit || 'gr'),
          0
        );
        const initialMass = formatBatchMassKg(matchedBatch.initialQuantity);
        const usedMass = formatBatchMassKg(totalUsedKg);
        const remainingMass = formatBatchMassKg(matchedBatch.remainingQuantity);
        const storage = storagePoints.find(sp => sp.id === matchedBatch.storagePointId);
        const motherLot = getMotherSeedLotCode(matchedBatch);
        return { plotsUsingBatch, initialMass, usedMass, remainingMass, storage, motherLot };
      })()
    : null;

  // Datos enriquecidos para Parcela localizada
  const plotDetails = matchedPlot
    ? (() => {
        const seedLoad = formatPlotSeedLoad(matchedPlot);
        const batch = seedBatches.find(b => b.id === matchedPlot.seedBatchId);
        const variety = varieties.find(v => v.id === matchedPlot.varietyId);
        const location = locations.find(l => l.id === matchedPlot.locationId);
        const motherLot = getMotherSeedLotCode(batch, batch?.batchCode || 'S/D');
        return { seedLoad, batch, variety, location, motherLot };
      })()
    : null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[85] p-4 font-mono">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
        
        {/* CABECERA */}
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ScanBarcode size={22} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                Terminal de Lectura Láser & Óptica · Trazabilidad 25/26
              </span>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Escaneo de Lote, Carga de Semilla (T/kg/gr) & Parcela
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        {/* INPUT DE ESCÁNER */}
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5 flex items-center justify-between">
              <span>Lectura Activa (Pistola HID / Código QR / GS1-128)</span>
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
                placeholder="Escanee Lote de Semilla, Rótulo INASE, Parcela o Remito..."
                className="w-full pl-10 pr-3 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-2">
              * Verifica en tiempo real el Lote de Semilla homologado y la Carga de Siembra en Parcela expresada en Toneladas (T), Kilos (kg) y Gramos (gr).
            </p>
          </div>

          {/* RESULTADO DE LA BÚSQUEDA */}
          {cleanQuery && (
            <div className="space-y-3">
              {/* CASO 1: PARCELA / ACTA DE SIEMBRA ESCANEADA */}
              {matchedPlot && plotDetails && (
                <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border-2 border-indigo-400 dark:border-indigo-700 rounded-2xl text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                      <Layers size={13} />
                      <span>Unidad Productiva / Parcela Localizada</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-600 text-white uppercase">
                      {matchedPlot.status}
                    </span>
                  </div>

                  <div>
                    <strong className="text-sm font-black text-slate-900 dark:text-white block uppercase">
                      {matchedPlot.name} · {plotDetails.variety?.name || 'Cultivar Homologado'}
                    </strong>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      Establecimiento: <strong>{plotDetails.location?.name || 'S/D'}</strong> ({matchedPlot.surfaceArea} {matchedPlot.surfaceUnit})
                    </p>
                  </div>

                  {/* BLOQUE DESTACADO: LOTE DE SEMILLA + CARGA EN T / KILOS / GRAMOS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800">
                      <span className="text-[8.5px] font-bold uppercase text-slate-400 block">Lote de Semilla Asignado</span>
                      <strong className="text-xs font-black text-emerald-700 dark:text-emerald-400 block">
                        {plotDetails.motherLot}
                      </strong>
                      <span className="text-[9.5px] text-slate-500 block truncate">
                        Cód: {plotDetails.batch?.batchCode || 'Sin lote'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-400 dark:border-emerald-700">
                      <span className="text-[8.5px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <Scale size={11} />
                        <span>Carga a la Parcela (T / kg / gr)</span>
                      </span>
                      <strong className="text-xs font-black text-slate-900 dark:text-white block">
                        {plotDetails.seedLoad.primaryDisplay}
                      </strong>
                      <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold block">
                        {plotDetails.seedLoad.fullTriUnitDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-indigo-200 dark:border-indigo-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/trace/${matchedPlot.id}`);
                        onClose();
                      }}
                      className="text-emerald-700 dark:text-emerald-400 font-bold uppercase hover:underline flex items-center gap-1"
                    >
                      <QrCode size={12} />
                      <span>Ver Pasaporte QR Público</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectBatch && matchedPlot.seedBatchId) {
                          onSelectBatch(matchedPlot.seedBatchId);
                        } else {
                          navigate(`/plots/${matchedPlot.id}`);
                        }
                        onClose();
                      }}
                      className="text-indigo-700 dark:text-indigo-300 font-bold uppercase hover:underline flex items-center gap-1"
                    >
                      <span>{onSelectBatch ? 'Usar Lote de esta Parcela' : 'Abrir Ficha de Parcela'}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* CASO 2: LOTE DE SEMILLA ESCANEADO */}
              {matchedBatch && batchDetails && (
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-800 rounded-2xl text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span>Lote de Semilla Homologado Localizado</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">
                      {matchedBatch.category || 'C1 INASE'}
                    </span>
                  </div>

                  <div>
                    <strong className="text-sm font-black text-slate-900 dark:text-white block uppercase">
                      {matchedBatch.batchCode} (Lote Madre: {batchDetails.motherLot})
                    </strong>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      Cultivar: <strong>{varieties.find(v => v.id === matchedBatch.varietyId)?.name || 'S/D'}</strong> · Rótulo: {matchedBatch.labelSerialNumber || 'INASE'} · Ubicación: {batchDetails.storage?.name || 'Almacén'}
                    </p>
                  </div>

                  {/* BALANCE TRIPLE DE MASA DEL LOTE (T / KILOS / GRAMOS) */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[8px] uppercase text-slate-400 font-bold block">Ingreso Lote</span>
                      <strong className="text-slate-900 dark:text-white block">{batchDetails.initialMass.kgStr}</strong>
                      <span className="text-[8.5px] text-slate-500 block">{batchDetails.initialMass.grStr} · {batchDetails.initialMass.tnStr}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[8px] uppercase text-indigo-600 font-bold block">
                        Carga ({batchDetails.plotsUsingBatch.length} Parc.)
                      </span>
                      <strong className="text-indigo-700 dark:text-indigo-400 block">{batchDetails.usedMass.kgStr}</strong>
                      <span className="text-[8.5px] text-slate-500 block">{batchDetails.usedMass.grStr} · {batchDetails.usedMass.tnStr}</span>
                    </div>
                    <div className="p-2 bg-emerald-100/70 dark:bg-emerald-900/40 rounded-xl border border-emerald-400 dark:border-emerald-700">
                      <span className="text-[8px] uppercase text-emerald-800 dark:text-emerald-300 font-black block">Stock Disponible</span>
                      <strong className="text-emerald-900 dark:text-emerald-200 block">{batchDetails.remainingMass.kgStr}</strong>
                      <span className="text-[8.5px] text-emerald-700 dark:text-emerald-300 font-bold block">{batchDetails.remainingMass.grStr}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-900 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/trace/${matchedBatch.id}`);
                        onClose();
                      }}
                      className="text-slate-700 dark:text-slate-300 font-bold uppercase hover:underline flex items-center gap-1"
                    >
                      <QrCode size={12} />
                      <span>Auditar Trazabilidad QR</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {onSelectBatch && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectBatch(matchedBatch.id);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 size={12} />
                          <span>Cargar Lote en Siembra</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectBatch) {
                            onSelectBatch(matchedBatch.id);
                          } else {
                            navigate(`/seed-batches?variety=${matchedBatch.batchCode}`);
                          }
                          onClose();
                        }}
                        className="text-emerald-700 dark:text-emerald-300 font-bold uppercase hover:underline flex items-center gap-1"
                      >
                        <span>Abrir en Inventario</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CASO 3: CULTIVAR ESCANEADO */}
              {!matchedBatch && !matchedPlot && matchedVariety && (
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
              )}

              {/* CASO 4: REMITO / GUÍA DE TRÁNSITO ESCANEADA */}
              {matchedMovement && (
                <div className="p-4 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 rounded-2xl text-xs space-y-2">
                  <span className="text-[9px] font-bold uppercase text-sky-700 dark:text-sky-300 flex items-center gap-1">
                    <Truck size={13} />
                    <span>Remito / Guía de Tránsito Localizada</span>
                  </span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white block uppercase">
                    {matchedMovement.transportGuideNumber} · {formatBatchMassKg(matchedMovement.quantity).fullTriUnit}
                  </strong>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Lote Origen: <strong>{seedBatches.find(b => b.id === matchedMovement.batchId)?.batchCode || 'Ananda Pampa'}</strong> · Destino: <strong>{locations.find(l => l.id === matchedMovement.targetLocationId)?.name || 'Campo'}</strong>
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    Conductor: {matchedMovement.driverName} · Dominio: {matchedMovement.vehiclePlate} · Estado: <strong className="text-emerald-600">{matchedMovement.status}</strong>
                  </p>
                </div>
              )}

              {!matchedBatch && !matchedPlot && !matchedVariety && !matchedMovement && (
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-center text-xs space-y-1">
                  <AlertCircle size={20} className="mx-auto text-slate-400" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">Código no registrado en Campaña 25/26</p>
                  <p className="text-[10px] text-slate-500">"{cleanQuery}"</p>
                </div>
              )}
            </div>
          )}

          {/* CÓDIGOS OFICIALES CAMPAÑA 25/26 PARA VERIFICACIÓN INMEDIATA */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
            <span className="uppercase font-bold block mb-1.5">Códigos Homologados Campaña 25/26 (Verificación Rápida):</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setScanInput('YUM-501-L125')}
                className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800"
              >
                Lote: YUM-501-L125
              </button>
              <button
                type="button"
                onClick={() => setScanInput('MUK-76-25-HEM')}
                className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800"
              >
                Lote: MUK-76-25-HEM
              </button>
              <button
                type="button"
                onClick={() => setScanInput('FUT-83-25-HEM')}
                className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800"
              >
                Lote: FUT-83-25-HEM
              </button>
              <button
                type="button"
                onClick={() => setScanInput('HA-B1-MUKA76')}
                className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800"
              >
                Parcela: HA-B1-MUKA76 (75 gr)
              </button>
              <button
                type="button"
                onClick={() => setScanInput('LR-B1-YUMA')}
                className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800"
              >
                Parcela: LR-B1-YUMA (50 gr)
              </button>
              <button
                type="button"
                onClick={() => setScanInput('GT-ANANDA-2025-0011')}
                className="px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-100 border border-sky-200 dark:border-sky-800"
              >
                Remito: GT-ANANDA-2025-0011
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default BarcodeScannerModal;

