
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement, Supplier, StoragePoint } from '../types';
import { Plus, ScanBarcode, Edit2, Trash2, Tag, Calendar, Package, Truck, Printer, MapPin, FileText, ArrowRight, Building, FileDigit, Globe, Clock, Box, ShieldCheck, Map, UserCheck, Briefcase, Wand2, AlertCircle, DollarSign, ShoppingCart, Archive, ChevronRight, Warehouse, Route as RouteIcon, ExternalLink, Save, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SeedBatches() {
  const { seedBatches, seedMovements, addSeedBatch, updateSeedBatch, deleteSeedBatch, addSeedMovement, varieties, locations, currentUser, suppliers, clients, storagePoints, addStoragePoint } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>('inventory');
  
  // -- BATCH STATES (PURCHASE FLOW) --
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  
  const [batchFormData, setBatchFormData] = useState<Partial<SeedBatch>>({
    varietyId: '', supplierId: '', supplierName: '', supplierLegalName: '', supplierCuit: '', supplierRenspa: '', supplierAddress: '', originCountry: '',
    batchCode: '', labelSerialNumber: '', category: 'C1', analysisDate: '', purity: 99, germination: 90,
    gs1Code: '', certificationNumber: '', 
    purchaseOrder: '', purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0,
    initialQuantity: 0, remainingQuantity: 0, storageConditions: '', storagePointId: '', logisticsResponsible: '', notes: '', isActive: true
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

  // -- QUICK STORAGE STATE --
  const [isQuickStorageOpen, setIsQuickStorageOpen] = useState(false);
  const [quickStorageForm, setQuickStorageForm] = useState({ name: '', city: '', type: 'Propio', surfaceM2: 0 });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // --- HELPER: FILTER VARIETIES BY SUPPLIER ---
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const filteredVarieties = selectedSupplierId ? varieties.filter(v => v.supplierId === selectedSupplierId) : varieties;

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
          varietyId: '' 
      }));
  };

  const handleVarietyChange = (varId: string) => { setBatchFormData(prev => ({ ...prev, varietyId: varId })); };

  const generateBatchCode = () => {
      const date = new Date();
      const year = date.getFullYear();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      setBatchFormData(prev => ({ ...prev, batchCode: `L${year}-${random}` }));
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFormData.varietyId) { alert("Error: Selecciona una Variedad."); return; }
    if (!batchFormData.supplierName) { alert("Error: El nombre del proveedor es obligatorio."); return; }
    if (!batchFormData.initialQuantity || batchFormData.initialQuantity <= 0) { alert("Error: La cantidad debe ser mayor a 0."); return; }
    if (!batchFormData.batchCode) { alert("Error: Falta el código de lote."); return; }

    const payload = { 
        ...batchFormData,
        remainingQuantity: editingBatchId ? batchFormData.remainingQuantity : batchFormData.initialQuantity 
    } as any;

    if (editingBatchId) { updateSeedBatch({ ...payload, id: editingBatchId }); } 
    else { addSeedBatch({ ...payload, id: Date.now().toString() }); }
    
    setIsBatchModalOpen(false); 
    resetBatchForm();
  };

  const resetBatchForm = () => {
    setBatchFormData({ 
        varietyId: '', supplierId: '', supplierName: '', supplierLegalName: '', supplierCuit: '', supplierAddress: '', originCountry: '',
        batchCode: '', labelSerialNumber: '', category: 'C1', analysisDate: '',
        purchaseOrder: '', purchaseDate: new Date().toISOString().split('T')[0],
        initialQuantity: 0, remainingQuantity: 0, storagePointId: '', isActive: true 
    });
    setEditingBatchId(null);
    setSelectedSupplierId('');
  };

  const handleEditBatch = (batch: SeedBatch) => { 
      setBatchFormData(batch); 
      setEditingBatchId(batch.id);
      const variety = varieties.find(v => v.id === batch.varietyId);
      if (variety) setSelectedSupplierId(variety.supplierId);
      else if (batch.supplierId) setSelectedSupplierId(batch.supplierId);
      setIsBatchModalOpen(true); 
  };
  
  const handleDeleteBatch = (id: string) => { if(window.confirm("¿Eliminar este registro de compra/stock?")) deleteSeedBatch(id); };

  // --- QUICK STORAGE HANDLER ---
  const handleQuickStorageSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!quickStorageForm.name) return;
      
      const newId = Date.now().toString();
      
      const payload = {
          id: newId,
          name: quickStorageForm.name,
          city: quickStorageForm.city,
          type: quickStorageForm.type as any,
          surfaceM2: Number(quickStorageForm.surfaceM2),
          address: 'Dirección pendiente'
          // capacityKg REMOVED entirely
      } as StoragePoint;

      addStoragePoint(payload);

      // Auto-select the new storage point
      setBatchFormData(prev => ({ ...prev, storagePointId: newId }));
      setIsQuickStorageOpen(false);
      setQuickStorageForm({ name: '', city: '', type: 'Propio', surfaceM2: 0 });
  };

  // --- MOVEMENT HANDLERS & ROUTE PLANNER ---
  const filteredTargetLocations = locations.filter(l => {
      if (!moveFormData.clientId) return false;
      return l.clientId === moveFormData.clientId;
  });

  // Calculate route link
  const getRouteData = () => {
      const batch = seedBatches.find(b => b.id === moveFormData.batchId);
      const originPoint = storagePoints.find(sp => sp.id === batch?.storagePointId);
      const destLocation = locations.find(l => l.id === moveFormData.targetLocationId);

      if (originPoint?.coordinates && destLocation?.coordinates) {
          // Google Maps Directions Link
          const link = `https://www.google.com/maps/dir/?api=1&origin=${originPoint.coordinates.lat},${originPoint.coordinates.lng}&destination=${destLocation.coordinates.lat},${destLocation.coordinates.lng}&travelmode=driving`;
          
          // Haversine Distance Calc
          const R = 6371; // km
          const dLat = (destLocation.coordinates.lat - originPoint.coordinates.lat) * Math.PI / 180;
          const dLon = (destLocation.coordinates.lng - originPoint.coordinates.lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(originPoint.coordinates.lat * Math.PI / 180) * Math.cos(destLocation.coordinates.lat * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const dist = R * c;

          return { link, dist: dist.toFixed(1), originName: originPoint.name, destName: destLocation.name };
      }
      return null;
  };

  const routeData = getRouteData();

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
          transportGuideNumber: moveFormData.transportGuideNumber || `G-${Date.now()}`,
          originStorageId: batch?.storagePointId,
          routeGoogleLink: routeData?.link,
          estimatedDistanceKm: routeData ? Number(routeData.dist) : 0
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

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  // --- RENDERS ---
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
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Etiqueta Oficial</th>
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
                          const sp = storagePoints.find(s => s.id === batch.storagePointId);
                          return (
                              <tr key={batch.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-bold text-gray-700">{batch.purchaseOrder || '-'}</td>
                                  <td className="px-6 py-4 text-gray-500">{batch.purchaseDate}</td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-hemp-700">{variety?.name || 'Desc.'}</div>
                                      <div className="text-xs text-gray-500 font-mono">{batch.batchCode}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded w-fit border border-blue-100">
                                          {batch.labelSerialNumber || 'N/A'}
                                      </div>
                                      <div className="text-[10px] text-gray-400 mt-1">
                                          CAT: {batch.category || '-'}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      {sp ? (
                                          <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100 font-bold inline-block" title={sp.address}>
                                              <Warehouse size={10} className="inline mr-1"/> {sp.name}
                                          </div>
                                      ) : <span className="text-gray-400">-</span>}
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
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Guía / Ruta</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Origen</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Destino (Cliente)</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Lote</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Cantidad</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>
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
                          const origin = storagePoints.find(s => s.id === m.originStorageId);
                          return (
                              <tr key={m.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4">
                                      <div className="font-mono font-bold text-gray-700">{m.transportGuideNumber}</div>
                                      {m.routeGoogleLink && (
                                          <a href={m.routeGoogleLink} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center text-blue-600 hover:underline mt-1">
                                              <MapPin size={10} className="mr-1"/> Ver Ruta {m.estimatedDistanceKm ? `(${m.estimatedDistanceKm} km)` : ''}
                                          </a>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-gray-600 text-xs">{origin?.name || 'Depósito Central'}</td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-800">{client?.name || '-'}</div>
                                      <div className="text-xs text-gray-500">{location?.name}</div>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono">{batch?.batchCode}</td>
                                  <td className="px-6 py-4 text-right font-bold">{m.quantity} kg</td>
                                  <td className="px-6 py-4 text-right">
                                      {/* PDF Generator would go here */}
                                      <button className="text-gray-400 hover:text-gray-600"><Printer size={16}/></button>
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
                {/* SECTION: STORAGE POINT SELECTION */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-purple-800 uppercase flex items-center">
                            <Warehouse size={12} className="mr-1"/> Destino de Almacenamiento
                        </h3>
                        <button 
                            type="button" 
                            onClick={() => setIsQuickStorageOpen(true)}
                            className="text-xs bg-white text-purple-700 px-2 py-1 rounded border border-purple-200 font-bold hover:bg-purple-100 flex items-center shadow-sm"
                        >
                            <Plus size={12} className="mr-1"/> Nuevo Depósito
                        </button>
                    </div>
                    <select required className={inputClass} value={batchFormData.storagePointId} onChange={e => setBatchFormData({...batchFormData, storagePointId: e.target.value})}>
                        <option value="">Seleccionar Depósito...</option>
                        {storagePoints.map(sp => (
                            <option key={sp.id} value={sp.id}>{sp.name} ({sp.city})</option>
                        ))}
                    </select>
                    {storagePoints.length === 0 && <p className="text-xs text-red-500 mt-1">Crea primero un Punto de Almacenamiento.</p>}
                </div>

                {/* Rest of the form remains similar but connects to StoragePoint */}
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
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Fantasía</label>
                            <input type="text" required className={inputClass} value={batchFormData.supplierName} onChange={e => setBatchFormData({...batchFormData, supplierName: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                        <Tag size={12} className="mr-1"/> 2. Datos de la Etiqueta (Trazabilidad)
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
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lot N° (Ref. Lote) *</label>
                            <div className="flex gap-2">
                                <input required type="text" className={inputClass} value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value})} placeholder="Ej: F 0150 T..." />
                                <button type="button" onClick={generateBatchCode} className="p-2 bg-gray-100 rounded hover:bg-gray-200" title="Generar ID Interno"><Wand2 size={16}/></button>
                            </div>
                        </div>
                        {/* ETIQUETA AZUL FIELDS */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <ScanBarcode size={14} className="mr-1 text-blue-600"/> N° Serie Etiqueta (Vertical)
                            </label>
                            <input type="text" className={inputClass} value={batchFormData.labelSerialNumber || ''} onChange={e => setBatchFormData({...batchFormData, labelSerialNumber: e.target.value})} placeholder="Ej: 999999 WW" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría Semilla</label>
                            <select className={inputClass} value={batchFormData.category} onChange={e => setBatchFormData({...batchFormData, category: e.target.value as any})}>
                                <option value="C1">Certificada 1 (C1) - Etiqueta Azul</option>
                                <option value="C2">Certificada 2 (C2) - Etiqueta Roja</option>
                                <option value="Base">Base - Etiqueta Blanca</option>
                                <option value="Original">Original/Breeder</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Análisis / Cosecha</label>
                            <input type="text" className={inputClass} value={batchFormData.analysisDate || ''} onChange={e => setBatchFormData({...batchFormData, analysisDate: e.target.value})} placeholder="Ej: 04/2024" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Peso/Cantidad (kg) *</label>
                            <input required type="number" step="0.1" className={inputClass} value={batchFormData.initialQuantity} onChange={e => setBatchFormData({...batchFormData, initialQuantity: Number(e.target.value), remainingQuantity: Number(e.target.value)})} />
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

      {/* --- QUICK CREATE STORAGE MODAL --- */}
      {isQuickStorageOpen && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center"><Warehouse size={18} className="mr-2 text-purple-600"/> Nuevo Depósito</h3>
                      <button onClick={() => setIsQuickStorageOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleQuickStorageSubmit} className="space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                          <input autoFocus type="text" className={inputClass} placeholder="Ej: Galpón Central" value={quickStorageForm.name} onChange={e => setQuickStorageForm({...quickStorageForm, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ciudad / Localidad</label>
                          <input type="text" className={inputClass} placeholder="Ej: Pergamino" value={quickStorageForm.city} onChange={e => setQuickStorageForm({...quickStorageForm, city: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                          <select className={inputClass} value={quickStorageForm.type} onChange={e => setQuickStorageForm({...quickStorageForm, type: e.target.value})}>
                              <option value="Propio">Propio</option>
                              <option value="Tercerizado">Tercerizado</option>
                              <option value="Transitorio">Transitorio</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Superficie (m²)</label>
                          <input type="number" className={inputClass} placeholder="Ej: 500" value={quickStorageForm.surfaceM2} onChange={e => setQuickStorageForm({...quickStorageForm, surfaceM2: Number(e.target.value)})} />
                      </div>
                      <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 mt-2 flex justify-center items-center shadow-sm">
                          <Save size={16} className="mr-2"/> Guardar y Seleccionar
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* MOVEMENT MODAL: LOGISTICS + ROUTE PLANNER */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Registrar Salida / Envío</h2>
            <form onSubmit={handleMoveSubmit} className="space-y-4">
                
                {/* SOURCE */}
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lote a Enviar (Origen)</label>
                    <select required className={inputClass} value={moveFormData.batchId} onChange={e => setMoveFormData({...moveFormData, batchId: e.target.value})}>
                        <option value="">Seleccionar Lote...</option>
                        {seedBatches.filter(b => b.remainingQuantity > 0).map(b => {
                            const sp = storagePoints.find(s => s.id === b.storagePointId);
                            return (
                                <option key={b.id} value={b.id}>{b.batchCode} @ {sp?.name || 'Depósito'} ({b.remainingQuantity} kg)</option>
                            )
                        })}
                    </select>
                </div>

                {/* DESTINATION */}
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

                {/* ROUTE PREVIEW */}
                {routeData && (
                    <div className="bg-green-50 p-3 rounded border border-green-200 flex items-center justify-between animate-in fade-in">
                        <div>
                            <span className="text-xs font-bold text-green-800 uppercase block mb-1">Ruta Generada</span>
                            <div className="text-xs text-green-700 flex items-center">
                                <MapPin size={10} className="mr-1"/> {routeData.originName} <ArrowRight size={10} className="mx-1"/> {routeData.destName}
                            </div>
                            <div className="text-xs font-bold mt-1 text-green-900">{routeData.dist} km aprox.</div>
                        </div>
                        <a 
                            href={routeData.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-green-600 text-white p-2 rounded shadow hover:bg-green-700 text-xs font-bold flex items-center"
                        >
                            <RouteIcon size={14} className="mr-1"/> Ver en Maps
                        </a>
                    </div>
                )}

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
