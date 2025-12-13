import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement } from '../types';
import { Plus, ScanBarcode, Edit2, Trash2, Tag, Calendar, Package, Truck, Printer, MapPin, FileText, ArrowRight, Building, FileDigit, Globe, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SeedBatches() {
  const { seedBatches, seedMovements, addSeedBatch, updateSeedBatch, deleteSeedBatch, addSeedMovement, varieties, locations, currentUser } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>('inventory');
  
  // -- BATCH STATES --
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  
  const [batchFormData, setBatchFormData] = useState<Partial<SeedBatch>>({
    varietyId: '',
    supplierName: '',
    supplierLegalName: '',
    supplierCuit: '',
    supplierRenspa: '',
    supplierAddress: '',
    batchCode: '',
    certificationNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    initialQuantity: 0,
    remainingQuantity: 0,
    storageConditions: '',
    notes: '',
    isActive: true
  });

  // -- MOVEMENT STATES --
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveFormData, setMoveFormData] = useState<Partial<SeedMovement>>({
      batchId: '',
      targetLocationId: '',
      quantity: 0,
      date: new Date().toISOString().split('T')[0],
      dispatchTime: new Date().toTimeString().substring(0, 5), // Default current time
      transportGuideNumber: '',
      driverName: '',
      vehiclePlate: '',
      transportCompany: '',
      status: 'En Tránsito'
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // --- BATCH HANDLERS ---

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFormData.varietyId || !batchFormData.batchCode || !batchFormData.supplierName) return;

    const payload = {
        varietyId: batchFormData.varietyId!,
        supplierName: batchFormData.supplierName!,
        supplierLegalName: batchFormData.supplierLegalName || '',
        supplierCuit: batchFormData.supplierCuit || '',
        supplierRenspa: batchFormData.supplierRenspa || '',
        supplierAddress: batchFormData.supplierAddress || '',
        batchCode: batchFormData.batchCode!,
        certificationNumber: batchFormData.certificationNumber || '',
        purchaseDate: batchFormData.purchaseDate!,
        initialQuantity: Number(batchFormData.initialQuantity),
        remainingQuantity: Number(batchFormData.remainingQuantity),
        storageConditions: batchFormData.storageConditions || '',
        notes: batchFormData.notes,
        isActive: batchFormData.isActive ?? true
    };

    if (editingBatchId) {
        updateSeedBatch({ ...payload, id: editingBatchId });
    } else {
        addSeedBatch({ ...payload, id: Date.now().toString() });
    }

    setIsBatchModalOpen(false);
    resetBatchForm();
  };

  const resetBatchForm = () => {
    setBatchFormData({
        varietyId: '', supplierName: '', supplierLegalName: '', supplierCuit: '', supplierRenspa: '', supplierAddress: '',
        batchCode: '', certificationNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        initialQuantity: 0, remainingQuantity: 0, storageConditions: '', notes: '', isActive: true
    });
    setEditingBatchId(null);
  };

  const handleEditBatch = (batch: SeedBatch) => {
      setBatchFormData(batch);
      setEditingBatchId(batch.id);
      setIsBatchModalOpen(true);
  };

  const handleDeleteBatch = (id: string) => {
      if(window.confirm("¿Eliminar este lote de semillas? Si hay parcelas vinculadas, perderán la trazabilidad.")) {
          deleteSeedBatch(id);
      }
  };

  // --- MOVEMENT HANDLERS ---

  const handleMoveSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!moveFormData.batchId || !moveFormData.targetLocationId || !moveFormData.quantity) return;

      const batch = seedBatches.find(b => b.id === moveFormData.batchId);
      if(batch && moveFormData.quantity > batch.remainingQuantity) {
          alert("No puedes enviar más cantidad de la disponible en el lote.");
          return;
      }

      addSeedMovement({
          id: Date.now().toString(),
          batchId: moveFormData.batchId!,
          targetLocationId: moveFormData.targetLocationId!,
          quantity: Number(moveFormData.quantity),
          date: moveFormData.date!,
          dispatchTime: moveFormData.dispatchTime || '',
          transportGuideNumber: moveFormData.transportGuideNumber || `G-${Date.now()}`,
          driverName: moveFormData.driverName || '',
          vehiclePlate: moveFormData.vehiclePlate || '',
          transportCompany: moveFormData.transportCompany || '',
          status: 'En Tránsito'
      });

      // Update Stock
      if(batch) {
          updateSeedBatch({
              ...batch,
              remainingQuantity: batch.remainingQuantity - Number(moveFormData.quantity)
          });
      }

      setIsMoveModalOpen(false);
      resetMoveForm();
  };

  const resetMoveForm = () => {
      setMoveFormData({
        batchId: '', targetLocationId: '', quantity: 0,
        date: new Date().toISOString().split('T')[0],
        dispatchTime: new Date().toTimeString().substring(0, 5),
        transportGuideNumber: '', driverName: '', vehiclePlate: '', transportCompany: '', status: 'En Tránsito'
      });
  };

  // --- PDF GENERATION (HOJA DE RUTA) ---
  const generateTransportPDF = (m: SeedMovement) => {
      const doc = new jsPDF();
      const batch = seedBatches.find(b => b.id === m.batchId);
      const variety = varieties.find(v => v.id === batch?.varietyId);
      const location = locations.find(l => l.id === m.targetLocationId);

      // Header
      doc.setFillColor(200, 200, 200);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text("GUÍA DE TRANSPORTE DE MATERIAL DE PROPAGACIÓN", 105, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`N° GUÍA: ${m.transportGuideNumber}`, 105, 22, { align: 'center' });

      // Emisor (Central)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("1. DATOS DEL EMISOR (ALMACÉN CENTRAL)", 14, 40);
      doc.setFont("helvetica", "normal");
      doc.text(`Titular: HempC App Enterprise`, 14, 48);
      doc.text(`Dirección: Depósito Central - Ruta Nac. KM 0`, 14, 54);
      doc.text(`Fecha Emisión: ${m.date}`, 14, 60);
      doc.text(`Hora Salida: ${m.dispatchTime || '-'}`, 14, 66); // Include dispatch time

      // Receptor (Locación)
      doc.setFont("helvetica", "bold");
      doc.text("2. DATOS DEL DESTINATARIO", 110, 40);
      doc.setFont("helvetica", "normal");
      doc.text(`Establecimiento: ${location?.name || 'Desconocido'}`, 110, 48);
      doc.text(`Dirección: ${location?.address || '-'}`, 110, 54);
      doc.text(`Localidad: ${location?.city}, ${location?.province}`, 110, 60);
      doc.text(`CUIE/RENSPA: ${location?.cuie || 'N/A'}`, 110, 66);

      // Datos del Proveedor (Origen de la Semilla)
      doc.setFont("helvetica", "bold");
      doc.text("3. ORIGEN LEGAL DE LA SEMILLA (PROVEEDOR)", 14, 80);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      const supplierInfo = [
          [`Razón Social: ${batch?.supplierLegalName || batch?.supplierName || '-'}`, `CUIT: ${batch?.supplierCuit || '-'}`],
          [`RENSPA Origen: ${batch?.supplierRenspa || '-'}`, `Certificación: ${batch?.certificationNumber || '-'}`],
          [`Dirección Origen: ${batch?.supplierAddress || '-'}`]
      ];
      
      autoTable(doc, {
          startY: 85,
          body: supplierInfo,
          theme: 'plain',
          styles: { fontSize: 9, cellPadding: 1 }
      });

      // Detalle de Carga
      autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Especie', 'Variedad', 'N° Lote / Etiqueta', 'Cantidad (kg)', 'Tipo Envase']],
          body: [
              [
                  'Cannabis Sativa L.', 
                  variety?.name || '-', 
                  batch?.batchCode || '-', 
                  `${m.quantity} kg`, 
                  'Bolsa Certificada'
              ]
          ],
          theme: 'grid',
          headStyles: { fillColor: [22, 163, 74] }
      });

      // Datos del Transporte
      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("4. DATOS DEL TRANSPORTE", 14, finalY);
      doc.setFont("helvetica", "normal");
      doc.text(`Conductor: ${m.driverName}`, 14, finalY + 8);
      doc.text(`Patente Vehículo: ${m.vehiclePlate}`, 14, finalY + 14);
      doc.text(`Empresa: ${m.transportCompany || 'Propio'}`, 110, finalY + 8);

      // Firmas
      doc.line(14, 250, 80, 250);
      doc.text("Firma Emisor", 30, 255);
      
      doc.line(120, 250, 186, 250);
      doc.text("Firma Receptor / Conductor", 130, 255);

      // Footer disclaimer
      doc.setFontSize(8);
      doc.text("Este documento ampara el tránsito de semilla fiscalizada según Ley de Semillas vigente.", 105, 280, { align: 'center' });

      doc.save(`Guia_Transporte_${m.transportGuideNumber}.pdf`);
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <ScanBarcode className="mr-2 text-hemp-600"/> Gestión de Semillas
            </h1>
            <p className="text-sm text-gray-500">Trazabilidad, inventario y logística de material de propagación.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button onClick={() => { resetMoveForm(); setIsMoveModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition shadow-sm justify-center flex-1 md:flex-none">
                <Truck size={20} className="mr-2" /> Nuevo Envío
              </button>
              <button onClick={() => { resetBatchForm(); setIsBatchModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition shadow-sm justify-center flex-1 md:flex-none">
                <Plus size={20} className="mr-2" /> Alta Lote
              </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
              <button onClick={() => setActiveTab('inventory')} className={`${activeTab === 'inventory' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500 hover:text-gray-700'} pb-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                  <Package size={16} className="mr-2"/> Inventario Central
              </button>
              <button onClick={() => setActiveTab('logistics')} className={`${activeTab === 'logistics' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500 hover:text-gray-700'} pb-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                  <Truck size={16} className="mr-2"/> Logística y Envíos
              </button>
          </nav>
      </div>

      {/* --- INVENTORY TAB --- */}
      {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Lote / ID</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Variedad</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Proveedor / Cert.</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Almacenamiento</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Stock Disp. (kg)</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {seedBatches.length === 0 ? (
                          <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-400">
                                  <Package size={32} className="mx-auto mb-2 opacity-50"/>
                                  <p>No hay lotes de semillas registrados.</p>
                              </td>
                          </tr>
                      ) : seedBatches.map(batch => {
                          const variety = varieties.find(v => v.id === batch.varietyId);
                          return (
                              <tr key={batch.id} className="hover:bg-gray-50 group">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center">
                                          <Tag size={16} className="text-gray-400 mr-2" />
                                          <span className="font-mono font-bold text-gray-800">{batch.batchCode}</span>
                                      </div>
                                      <div className="text-xs text-gray-400 pl-6">{batch.purchaseDate}</div>
                                  </td>
                                  <td className="px-6 py-4 text-hemp-700 font-medium">{variety?.name || 'Desconocida'}</td>
                                  <td className="px-6 py-4">
                                      <div className="text-gray-900 font-medium">{batch.supplierName}</div>
                                      <div className="text-xs text-gray-500">{batch.supplierLegalName}</div>
                                      {batch.supplierCuit && <div className="text-[10px] text-gray-400">CUIT: {batch.supplierCuit}</div>}
                                  </td>
                                  <td className="px-6 py-4 text-gray-600">
                                      {batch.storageConditions || 'Ambiente Controlado'}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`px-2 py-1 rounded font-bold ${
                                          batch.remainingQuantity === 0 ? 'bg-red-100 text-red-700' :
                                          batch.remainingQuantity < (batch.initialQuantity * 0.2) ? 'bg-amber-100 text-amber-700' :
                                          'bg-green-100 text-green-700'
                                      }`}>
                                          {batch.remainingQuantity} / {batch.initialQuantity}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      {isAdmin && (
                                          <div className="flex justify-end space-x-2">
                                              <button onClick={() => handleEditBatch(batch)} className="text-gray-400 hover:text-hemp-600 p-1">
                                                  <Edit2 size={16} />
                                              </button>
                                              <button onClick={() => handleDeleteBatch(batch.id)} className="text-gray-400 hover:text-red-600 p-1">
                                                  <Trash2 size={16} />
                                              </button>
                                          </div>
                                      )}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      )}

      {/* --- LOGISTICS TAB --- */}
      {activeTab === 'logistics' && (
          <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start">
                  <FileText className="text-blue-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                      <h3 className="font-bold text-blue-900 text-sm">Registro de Transporte Oficial</h3>
                      <p className="text-blue-800 text-xs">
                          Cada envío genera automáticamente una Guía de Transporte (Hoja de Ruta) que debe ser impresa y acompañar la carga para cumplir con las normativas de tránsito de material de propagación.
                      </p>
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Fecha</th>
                              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Guía N°</th>
                              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Destino</th>
                              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Lote</th>
                              <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Cantidad</th>
                              <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Documentos</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {seedMovements.length === 0 ? (
                              <tr>
                                  <td colSpan={6} className="p-8 text-center text-gray-400">
                                      <Truck size={32} className="mx-auto mb-2 opacity-50"/>
                                      <p>No hay envíos registrados.</p>
                                  </td>
                              </tr>
                          ) : seedMovements.map(m => {
                              const batch = seedBatches.find(b => b.id === m.batchId);
                              const location = locations.find(l => l.id === m.targetLocationId);
                              return (
                                  <tr key={m.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 text-gray-600">
                                          <div>{m.date}</div>
                                          {m.dispatchTime && <div className="text-xs text-gray-400 flex items-center"><Clock size={10} className="mr-1"/>{m.dispatchTime}</div>}
                                      </td>
                                      <td className="px-6 py-4 font-mono font-bold text-gray-800">{m.transportGuideNumber}</td>
                                      <td className="px-6 py-4">
                                          <div className="flex items-center text-gray-800 font-medium">
                                              <MapPin size={14} className="mr-1 text-gray-400"/>
                                              {location?.name || 'Desconocido'}
                                          </div>
                                          <div className="text-xs text-gray-500 pl-4">{location?.province}</div>
                                      </td>
                                      <td className="px-6 py-4 text-gray-600 text-xs">
                                          <span className="block font-bold">{batch?.batchCode}</span>
                                          <span className="block italic">{m.status}</span>
                                      </td>
                                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                                          {m.quantity} kg
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <button 
                                            onClick={() => generateTransportPDF(m)}
                                            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded text-xs font-bold transition flex items-center ml-auto"
                                          >
                                              <Printer size={14} className="mr-1"/> Imprimir Guía
                                          </button>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- MODAL 1: BATCH (UPDATED WITH COMMERCIAL DATA) --- */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingBatchId ? 'Editar Lote' : 'Alta de Nuevo Lote'}</h2>
            <form onSubmit={handleBatchSubmit} className="space-y-4">
                
                {/* SECTION 1: PRODUCT INFO */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                        <Tag size={12} className="mr-1"/> Identificación del Material
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Variedad</label>
                            <select required className={inputClass} value={batchFormData.varietyId} onChange={e => setBatchFormData({...batchFormData, varietyId: e.target.value})}>
                                <option value="">Seleccionar...</option>
                                {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Código Lote / Etiqueta</label>
                            <input required type="text" className={inputClass} value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Inicial (kg)</label>
                            <input required type="number" step="0.1" className={inputClass} value={batchFormData.initialQuantity} onChange={e => setBatchFormData({...batchFormData, initialQuantity: Number(e.target.value), remainingQuantity: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Compra</label>
                            <input type="date" className={inputClass} value={batchFormData.purchaseDate} onChange={e => setBatchFormData({...batchFormData, purchaseDate: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* SECTION 2: SUPPLIER COMMERCIAL DATA (NEW) */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center">
                        <Building size={12} className="mr-1"/> Datos Comerciales del Proveedor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Fantasía</label>
                            <input required type="text" placeholder="Ej: Hemp-it" className={inputClass} value={batchFormData.supplierName} onChange={e => setBatchFormData({...batchFormData, supplierName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                            <input type="text" placeholder="Ej: Hemp-it France SAS" className={inputClass} value={batchFormData.supplierLegalName} onChange={e => setBatchFormData({...batchFormData, supplierLegalName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CUIT / Tax ID</label>
                            <input type="text" className={inputClass} value={batchFormData.supplierCuit} onChange={e => setBatchFormData({...batchFormData, supplierCuit: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">N° Registro (RENSPA)</label>
                            <input type="text" placeholder="Registro Semillero" className={inputClass} value={batchFormData.supplierRenspa} onChange={e => setBatchFormData({...batchFormData, supplierRenspa: e.target.value})} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de Origen</label>
                            <input type="text" placeholder="Calle, Ciudad, Provincia/País" className={inputClass} value={batchFormData.supplierAddress} onChange={e => setBatchFormData({...batchFormData, supplierAddress: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* SECTION 3: COMPLIANCE & STORAGE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">N° Certificado Fiscalización</label>
                        <input type="text" placeholder="INASE/SENASA (Opcional)" className={inputClass} value={batchFormData.certificationNumber} onChange={e => setBatchFormData({...batchFormData, certificationNumber: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones Almacenamiento</label>
                        <input type="text" placeholder="Ej: Cámara Fría 4°C, Humedad 40%" className={inputClass} value={batchFormData.storageConditions} onChange={e => setBatchFormData({...batchFormData, storageConditions: e.target.value})} />
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm font-bold">Guardar</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: MOVEMENT (DISPATCH) --- */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center">
                <Truck className="mr-2 text-blue-600"/> Nuevo Envío a Locación
            </h2>
            <form onSubmit={handleMoveSubmit} className="space-y-4">
                <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 mb-4">
                    Al confirmar, se descontará el stock del Almacén Central y se generará la Guía de Transporte.
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lote de Origen</label>
                    <select required className={inputClass} value={moveFormData.batchId} onChange={e => setMoveFormData({...moveFormData, batchId: e.target.value})}>
                        <option value="">Seleccionar Lote con Stock...</option>
                        {seedBatches.filter(b => b.remainingQuantity > 0).map(b => (
                            <option key={b.id} value={b.id}>{b.batchCode} ({b.remainingQuantity} kg disp.)</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Destino (Locación)</label>
                        <select required className={inputClass} value={moveFormData.targetLocationId} onChange={e => setMoveFormData({...moveFormData, targetLocationId: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {locations.map(l => (
                                <option key={l.id} value={l.id}>{l.name} ({l.province})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a Enviar (kg)</label>
                        <input required type="number" step="0.1" className={inputClass} value={moveFormData.quantity} onChange={e => setMoveFormData({...moveFormData, quantity: Number(e.target.value)})} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Calendar size={14} className="mr-1 text-gray-500"/> Fecha Salida
                        </label>
                        <input type="date" className={inputClass} value={moveFormData.date} onChange={e => setMoveFormData({...moveFormData, date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Clock size={14} className="mr-1 text-gray-500"/> Hora Salida
                        </label>
                        <input type="time" className={inputClass} value={moveFormData.dispatchTime} onChange={e => setMoveFormData({...moveFormData, dispatchTime: e.target.value})} />
                    </div>
                </div>

                <hr className="border-gray-200 my-2" />
                <h3 className="text-sm font-bold text-gray-600 uppercase">Datos del Transportista</h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conductor (Nombre Completo)</label>
                    <input required type="text" className={inputClass} value={moveFormData.driverName} onChange={e => setMoveFormData({...moveFormData, driverName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patente / Dominio</label>
                        <input required type="text" className={inputClass} value={moveFormData.vehiclePlate} onChange={e => setMoveFormData({...moveFormData, vehiclePlate: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Empresa (Opcional)</label>
                        <input type="text" className={inputClass} value={moveFormData.transportCompany} onChange={e => setMoveFormData({...moveFormData, transportCompany: e.target.value})} />
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={() => setIsMoveModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm font-bold flex items-center">
                        <ArrowRight size={16} className="mr-2"/> Confirmar Envío
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}