
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement } from '../types';
import { Plus, ScanBarcode, Edit2, Trash2, Tag, Calendar, Package, Truck, Printer, MapPin, FileText, ArrowRight, Building, FileDigit, Globe, Clock, Box, ShieldCheck, Map, UserCheck, Briefcase } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SeedBatches() {
  const { seedBatches, seedMovements, addSeedBatch, updateSeedBatch, deleteSeedBatch, addSeedMovement, varieties, locations, currentUser, suppliers, clients } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>('inventory');
  
  // -- BATCH STATES --
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  
  // -- LABEL MODAL STATE --
  const [showLabelModal, setShowLabelModal] = useState<SeedBatch | null>(null);

  const [batchFormData, setBatchFormData] = useState<Partial<SeedBatch>>({
    varietyId: '', supplierName: '', supplierLegalName: '', supplierCuit: '', supplierRenspa: '', supplierAddress: '', originCountry: '',
    batchCode: '', gs1Code: '', certificationNumber: '', purchaseDate: new Date().toISOString().split('T')[0],
    initialQuantity: 0, remainingQuantity: 0, storageConditions: '', storageAddress: '', logisticsResponsible: '', notes: '', isActive: true
  });

  // -- MOVEMENT STATES --
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveFormData, setMoveFormData] = useState<Partial<SeedMovement>>({
      batchId: '',
      clientId: '',
      targetLocationId: '',
      quantity: 0,
      date: new Date().toISOString().split('T')[0],
      dispatchTime: new Date().toTimeString().substring(0, 5),
      transportGuideNumber: '', transportType: 'Propio', driverName: '', vehiclePlate: '', vehicleModel: '', transportCompany: '', routeItinerary: '', status: 'En Tránsito'
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // --- BATCH HANDLERS ---
  const handleVarietyChange = (varietyId: string) => {
      const variety = varieties.find(v => v.id === varietyId);
      const supplier = suppliers.find(s => s.id === variety?.supplierId);
      setBatchFormData({
          ...batchFormData,
          varietyId,
          supplierName: supplier?.name || '',
          supplierLegalName: supplier?.legalName || '',
          supplierCuit: supplier?.cuit || '',
          supplierAddress: supplier?.address ? `${supplier.address}, ${supplier.city}, ${supplier.country}` : '',
          originCountry: supplier?.country || ''
      });
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFormData.varietyId || !batchFormData.batchCode) return;
    const payload = { ...batchFormData } as any;
    if (editingBatchId) { updateSeedBatch({ ...payload, id: editingBatchId }); } else { addSeedBatch({ ...payload, id: Date.now().toString() }); }
    setIsBatchModalOpen(false); resetBatchForm();
  };

  const resetBatchForm = () => {
    setBatchFormData({ varietyId: '', supplierName: '', batchCode: '', purchaseDate: new Date().toISOString().split('T')[0], initialQuantity: 0, remainingQuantity: 0, isActive: true });
    setEditingBatchId(null);
  };

  const handleEditBatch = (batch: SeedBatch) => { setBatchFormData(batch); setEditingBatchId(batch.id); setIsBatchModalOpen(true); };
  const handleDeleteBatch = (id: string) => { if(window.confirm("¿Eliminar lote?")) deleteSeedBatch(id); };

  // --- MOVEMENT HANDLERS ---
  
  // Filter Locations based on selected Client
  const filteredTargetLocations = locations.filter(l => {
      if (!moveFormData.clientId) return false;
      return l.clientId === moveFormData.clientId;
  });

  const handleMoveSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!moveFormData.batchId || !moveFormData.targetLocationId || !moveFormData.quantity) return;

      const batch = seedBatches.find(b => b.id === moveFormData.batchId);
      if(batch && moveFormData.quantity > batch.remainingQuantity) {
          alert("Cantidad excede stock disponible.");
          return;
      }

      addSeedMovement({
          ...moveFormData as any,
          id: Date.now().toString(),
          transportGuideNumber: moveFormData.transportGuideNumber || `G-${Date.now()}`
      });

      if(batch) {
          updateSeedBatch({ ...batch, remainingQuantity: batch.remainingQuantity - Number(moveFormData.quantity) });
      }

      setIsMoveModalOpen(false);
      resetMoveForm();
  };

  const resetMoveForm = () => {
      setMoveFormData({ batchId: '', clientId: '', targetLocationId: '', quantity: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito' });
  };

  const generateTransportPDF = (m: SeedMovement) => {
      const doc = new jsPDF();
      const batch = seedBatches.find(b => b.id === m.batchId);
      const variety = varieties.find(v => v.id === batch?.varietyId);
      const location = locations.find(l => l.id === m.targetLocationId);
      const client = clients.find(c => c.id === m.clientId);

      doc.setFillColor(200, 200, 200);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setFontSize(18);
      doc.text("GUÍA DE TRANSPORTE DE MATERIAL DE PROPAGACIÓN", 105, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`N° GUÍA: ${m.transportGuideNumber}`, 105, 22, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("DESTINATARIO (CLIENTE)", 14, 40);
      doc.setFont("helvetica", "normal");
      doc.text(`Razón Social: ${client?.name || 'Consumidor Final'}`, 14, 48);
      doc.text(`CUIT: ${client?.cuit || '-'}`, 14, 54);
      
      doc.setFont("helvetica", "bold");
      doc.text("LUGAR DE DESTINO (ESTABLECIMIENTO)", 110, 40);
      doc.setFont("helvetica", "normal");
      doc.text(`Sitio: ${location?.name || '-'}`, 110, 48);
      doc.text(`Dirección: ${location?.address}, ${location?.city}`, 110, 54);
      
      autoTable(doc, {
          startY: 65,
          head: [['Especie', 'Variedad', 'Lote', 'Cantidad']],
          body: [['Cannabis Sativa L.', variety?.name || '-', batch?.batchCode || '-', `${m.quantity} kg`]],
          theme: 'grid'
      });

      doc.save(`Guia_${m.transportGuideNumber}.pdf`);
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <ScanBarcode className="mr-2 text-hemp-600"/> Gestión de Semillas
            </h1>
            <p className="text-sm text-gray-500">Stock, Trazabilidad y Asignación a Clientes.</p>
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

      {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Lote / Origen</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Variedad</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Almacenamiento</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Stock Disp. (kg)</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {seedBatches.map(batch => {
                          const variety = varieties.find(v => v.id === batch.varietyId);
                          return (
                              <tr key={batch.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-mono font-bold">{batch.batchCode}</td>
                                  <td className="px-6 py-4">{variety?.name}</td>
                                  <td className="px-6 py-4">{batch.storageAddress}</td>
                                  <td className="px-6 py-4 text-center font-bold text-green-700">{batch.remainingQuantity}</td>
                                  <td className="px-6 py-4 text-right">
                                      {isAdmin && (
                                          <button onClick={() => handleDeleteBatch(batch.id)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                                              <Trash2 size={16} />
                                          </button>
                                      )}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'logistics' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Guía</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Cliente Destino</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Locación</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Lote</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Cantidad</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Doc</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {seedMovements.map(m => {
                          const batch = seedBatches.find(b => b.id === m.batchId);
                          const client = clients.find(c => c.id === m.clientId);
                          const location = locations.find(l => l.id === m.targetLocationId);
                          return (
                              <tr key={m.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-mono">{m.transportGuideNumber}</td>
                                  <td className="px-6 py-4 font-bold text-gray-800">{client?.name || '-'}</td>
                                  <td className="px-6 py-4 text-gray-600">{location?.name || 'Desconocido'}</td>
                                  <td className="px-6 py-4 text-xs font-mono">{batch?.batchCode}</td>
                                  <td className="px-6 py-4 text-right font-bold">{m.quantity} kg</td>
                                  <td className="px-6 py-4 text-right">
                                      <button onClick={() => generateTransportPDF(m)} className="text-blue-600 font-bold text-xs"><Printer size={16}/></button>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      )}

      {/* NEW MOVEMENT MODAL */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Registrar Envío de Semillas</h2>
            <form onSubmit={handleMoveSubmit} className="space-y-4">
                
                {/* 1. SELECCIÓN DE LOTE */}
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lote a Enviar</label>
                    <select required className={inputClass} value={moveFormData.batchId} onChange={e => setMoveFormData({...moveFormData, batchId: e.target.value})}>
                        <option value="">Seleccionar Lote...</option>
                        {seedBatches.filter(b => b.remainingQuantity > 0).map(b => (
                            <option key={b.id} value={b.id}>{b.batchCode} ({b.remainingQuantity} kg disp.)</option>
                        ))}
                    </select>
                </div>

                {/* 2. SELECCIÓN DE CLIENTE Y LOCACIÓN */}
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <h3 className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center"><Briefcase size={12} className="mr-1"/> Asignación</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente Destinatario</label>
                            <select 
                                required 
                                className={inputClass} 
                                value={moveFormData.clientId} 
                                onChange={e => setMoveFormData({...moveFormData, clientId: e.target.value, targetLocationId: ''})}
                            >
                                <option value="">Seleccionar Cliente...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Locación de Destino</label>
                            <select required className={inputClass} value={moveFormData.targetLocationId} onChange={e => setMoveFormData({...moveFormData, targetLocationId: e.target.value})} disabled={!moveFormData.clientId}>
                                <option value="">Seleccionar Sitio...</option>
                                {filteredTargetLocations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.city})</option>)}
                            </select>
                            {moveFormData.clientId && filteredTargetLocations.length === 0 && (
                                <p className="text-xs text-red-500 mt-1">Este cliente no tiene locaciones registradas.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad (kg)</label>
                    <input required type="number" step="0.1" className={inputClass} value={moveFormData.quantity} onChange={e => setMoveFormData({...moveFormData, quantity: Number(e.target.value)})} />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={() => setIsMoveModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm font-bold">Registrar Envío</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
