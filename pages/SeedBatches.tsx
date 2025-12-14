
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement, Supplier } from '../types';
import { Plus, ScanBarcode, Edit2, Trash2, Tag, Calendar, Package, Truck, Printer, MapPin, FileText, ArrowRight, Building, FileDigit, Globe, Clock, Box, ShieldCheck, Map, UserCheck, Briefcase, Wand2, AlertCircle, DollarSign, ShoppingCart, Archive, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SeedBatches() {
  const { seedBatches, seedMovements, addSeedBatch, updateSeedBatch, deleteSeedBatch, addSeedMovement, varieties, locations, currentUser, suppliers, clients } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>('inventory');
  
  // -- BATCH STATES (PURCHASE FLOW) --
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  
  const [batchFormData, setBatchFormData] = useState<Partial<SeedBatch>>({
    varietyId: '', supplierId: '', supplierName: '', supplierLegalName: '', supplierCuit: '', supplierRenspa: '', supplierAddress: '', originCountry: '',
    batchCode: '', gs1Code: '', certificationNumber: '', 
    purchaseOrder: '', purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0,
    initialQuantity: 0, remainingQuantity: 0, storageConditions: '', storageAddress: 'Depósito Central', logisticsResponsible: '', notes: '', isActive: true
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

  // --- HELPER: FILTER VARIETIES BY SUPPLIER ---
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  
  // Only show varieties that belong to the selected supplier (if selected)
  const filteredVarieties = selectedSupplierId 
    ? varieties.filter(v => v.supplierId === selectedSupplierId)
    : varieties;

  // --- BATCH HANDLERS ---
  const handleSupplierChange = (supId: string) => {
      setSelectedSupplierId(supId);
      const supplier = suppliers.find(s => s.id === supId);
      
      setBatchFormData(prev => ({
          ...prev,
          supplierId: supId,
          supplierName: supplier?.name || '',
          supplierLegalName: supplier?.legalName || '',
          supplierCuit: supplier?.cuit || '',
          supplierAddress: supplier?.address ? `${supplier.address}, ${supplier.city}` : '',
          originCountry: supplier?.country || '',
          varietyId: '' // Reset variety when supplier changes
      }));
  };

  const handleVarietyChange = (varId: string) => {
      setBatchFormData(prev => ({ ...prev, varietyId: varId }));
  };

  const generateBatchCode = () => {
      const date = new Date();
      const year = date.getFullYear();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      setBatchFormData(prev => ({ ...prev, batchCode: `L${year}-${random}` }));
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit Validation
    if (!batchFormData.varietyId) { alert("Error: Selecciona una Variedad."); return; }
    if (!batchFormData.supplierName) { alert("Error: El nombre del proveedor es obligatorio."); return; }
    if (!batchFormData.initialQuantity || batchFormData.initialQuantity <= 0) { alert("Error: La cantidad debe ser mayor a 0."); return; }
    if (!batchFormData.batchCode) { alert("Error: Falta el código de lote."); return; }

    const payload = { 
        ...batchFormData,
        remainingQuantity: editingBatchId ? batchFormData.remainingQuantity : batchFormData.initialQuantity 
    } as any;

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
        varietyId: '', supplierId: '', supplierName: '', supplierLegalName: '', supplierCuit: '', supplierAddress: '', originCountry: '',
        batchCode: '', purchaseOrder: '', purchaseDate: new Date().toISOString().split('T')[0],
        initialQuantity: 0, remainingQuantity: 0, storageAddress: 'Depósito Central', isActive: true 
    });
    setEditingBatchId(null);
    setSelectedSupplierId('');
  };

  const handleEditBatch = (batch: SeedBatch) => { 
      setBatchFormData(batch); 
      setEditingBatchId(batch.id);
      
      // Try to reverse-engineer supplier selection
      const variety = varieties.find(v => v.id === batch.varietyId);
      if (variety) setSelectedSupplierId(variety.supplierId);
      else if (batch.supplierId) setSelectedSupplierId(batch.supplierId);
      
      setIsBatchModalOpen(true); 
  };
  
  const handleDeleteBatch = (id: string) => { if(window.confirm("¿Eliminar este registro de compra/stock?")) deleteSeedBatch(id); };

  // --- MOVEMENT HANDLERS ---
  const filteredTargetLocations = locations.filter(l => {
      if (!moveFormData.clientId) return false;
      return l.clientId === moveFormData.clientId;
  });

  const handleMoveSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!moveFormData.batchId || !moveFormData.targetLocationId || !moveFormData.quantity) return;

      const batch = seedBatches.find(b => b.id === moveFormData.batchId);
      if(batch && moveFormData.quantity > batch.remainingQuantity) {
          alert(`Error: Stock insuficiente. Disponible: ${batch.remainingQuantity} kg`);
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
                <Archive className="mr-2 text-hemp-600"/> Gestión de Stock y Compras
            </h1>
            <p className="text-sm text-gray-500">Administración de recepciones, inventario y logística de semillas.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button onClick={() => { resetMoveForm(); setIsMoveModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition shadow-sm justify-center flex-1 md:flex-none">
                <Truck size={20} className="mr-2" /> Logística (Salida)
              </button>
              <button onClick={() => { resetBatchForm(); setIsBatchModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition shadow-sm justify-center flex-1 md:flex-none">
                <ShoppingCart size={20} className="mr-2" /> Registrar Compra (Entrada)
              </button>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
              <button onClick={() => setActiveTab('inventory')} className={`${activeTab === 'inventory' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500 hover:text-gray-700'} pb-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                  <Package size={16} className="mr-2"/> Stock e Ingresos
              </button>
              <button onClick={() => setActiveTab('logistics')} className={`${activeTab === 'logistics' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500 hover:text-gray-700'} pb-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                  <Truck size={16} className="mr-2"/> Logística y Entregas
              </button>
          </nav>
      </div>

      {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Orden Compra</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Fecha</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Variedad (Lote)</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Proveedor</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Ubicación</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Stock Disp.</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {seedBatches.length === 0 ? (
                          <tr>
                              <td colSpan={7} className="p-8 text-center text-gray-400">
                                  <ShoppingCart size={32} className="mx-auto mb-2 opacity-50"/>
                                  <p>No hay registros de compras/stock.</p>
                              </td>
                          </tr>
                      ) : seedBatches.map(batch => {
                          const variety = varieties.find(v => v.id === batch.varietyId);
                          return (
                              <tr key={batch.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-bold text-gray-700">{batch.purchaseOrder || '-'}</td>
                                  <td className="px-6 py-4 text-gray-500">{batch.purchaseDate}</td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-hemp-700">{variety?.name || 'Desc.'}</div>
                                      <div className="text-xs text-gray-500 font-mono">{batch.batchCode}</div>
                                  </td>
                                  <td className="px-6 py-4 text-gray-600">{batch.supplierName}</td>
                                  <td className="px-6 py-4 text-center text-xs bg-gray-50 rounded">
                                      {batch.storageAddress || '-'}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`px-2 py-1 rounded font-bold ${batch.remainingQuantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {batch.remainingQuantity} kg
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      {isAdmin && (
                                          <div className="flex justify-end space-x-1">
                                              <button onClick={() => handleEditBatch(batch)} className="text-gray-400 hover:text-blue-600 p-1"><Edit2 size={16}/></button>
                                              <button onClick={() => handleDeleteBatch(batch.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
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
                      {seedMovements.length === 0 ? (
                          <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-400">
                                  <Truck size={32} className="mx-auto mb-2 opacity-50"/>
                                  <p>No hay envíos registrados.</p>
                              </td>
                          </tr>
                      ) : seedMovements.map(m => {
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

      {/* --- MODAL 1: PURCHASE / BATCH RECEPTION --- */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center">
                <ShoppingCart className="mr-2 text-hemp-600" />
                {editingBatchId ? 'Editar Registro de Stock' : 'Registrar Compra / Ingreso'}
            </h2>
            
            <form onSubmit={handleBatchSubmit} className="space-y-6">
                
                {/* SECTION 1: SUPPLIER SELECTION (PURCHASE ORIGIN) */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center">
                        <Building size={12} className="mr-1"/> 1. Origen del Material (Proveedor)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Proveedor *</label>
                            <select 
                                required 
                                className={inputClass} 
                                value={selectedSupplierId} 
                                onChange={e => handleSupplierChange(e.target.value)}
                            >
                                <option value="">-- Seleccionar --</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.country})</option>)}
                            </select>
                            {suppliers.length === 0 && <p className="text-xs text-red-500 mt-1">Crea proveedores primero.</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Fantasía (Editable)</label>
                            <input type="text" required className={inputClass} value={batchFormData.supplierName} onChange={e => setBatchFormData({...batchFormData, supplierName: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* SECTION 2: PRODUCT SELECTION */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                        <Tag size={12} className="mr-1"/> 2. Detalle del Producto
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Variedad *</label>
                            <select 
                                required 
                                className={inputClass} 
                                value={batchFormData.varietyId} 
                                onChange={e => handleVarietyChange(e.target.value)}
                                disabled={!selectedSupplierId && filteredVarieties.length === 0}
                            >
                                <option value="">-- Seleccionar --</option>
                                {filteredVarieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            {!selectedSupplierId && <p className="text-xs text-gray-400 mt-1">Selecciona proveedor para filtrar.</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Comprada (kg) *</label>
                            <input required type="number" step="0.1" className={inputClass} value={batchFormData.initialQuantity} onChange={e => setBatchFormData({...batchFormData, initialQuantity: Number(e.target.value), remainingQuantity: Number(e.target.value)})} />
                        </div>
                    </div>
                </div>

                {/* SECTION 3: PURCHASE & TRACEABILITY DATA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center border-b pb-1">
                            <FileText size={12} className="mr-1"/> Datos de Compra
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">N° Orden Compra / Factura</label>
                            <input type="text" placeholder="OC-2024-001" className={inputClass} value={batchFormData.purchaseOrder} onChange={e => setBatchFormData({...batchFormData, purchaseOrder: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Recepción</label>
                            <input type="date" className={inputClass} value={batchFormData.purchaseDate} onChange={e => setBatchFormData({...batchFormData, purchaseDate: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center border-b pb-1">
                            <ScanBarcode size={12} className="mr-1"/> Trazabilidad
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lote Proveedor / Etiqueta *</label>
                            <div className="flex gap-2">
                                <input required type="text" className={inputClass} value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value})} placeholder="Lote Origen..." />
                                <button type="button" onClick={generateBatchCode} className="p-2 bg-gray-100 rounded hover:bg-gray-200" title="Generar ID Interno"><Wand2 size={16}/></button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación Almacenamiento</label>
                            <input type="text" placeholder="Ej: Depósito Central" className={inputClass} value={batchFormData.storageAddress} onChange={e => setBatchFormData({...batchFormData, storageAddress: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                    <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm font-bold flex items-center">
                        <ShoppingCart size={18} className="mr-2"/> Confirmar Ingreso
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* MOVEMENT MODAL (UNCHANGED LOGIC, JUST CONTEXT) */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Registrar Salida / Envío</h2>
            <form onSubmit={handleMoveSubmit} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lote a Enviar</label>
                    <select required className={inputClass} value={moveFormData.batchId} onChange={e => setMoveFormData({...moveFormData, batchId: e.target.value})}>
                        <option value="">Seleccionar Lote...</option>
                        {seedBatches.filter(b => b.remainingQuantity > 0).map(b => (
                            <option key={b.id} value={b.id}>{b.batchCode} ({b.remainingQuantity} kg disp.)</option>
                        ))}
                    </select>
                </div>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <h3 className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center"><Briefcase size={12} className="mr-1"/> Destino (Cliente)</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                            <select required className={inputClass} value={moveFormData.clientId} onChange={e => setMoveFormData({...moveFormData, clientId: e.target.value, targetLocationId: ''})}>
                                <option value="">Seleccionar Cliente...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Locación</label>
                            <select required className={inputClass} value={moveFormData.targetLocationId} onChange={e => setMoveFormData({...moveFormData, targetLocationId: e.target.value})} disabled={!moveFormData.clientId}>
                                <option value="">Seleccionar Sitio...</option>
                                {filteredTargetLocations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.city})</option>)}
                            </select>
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
