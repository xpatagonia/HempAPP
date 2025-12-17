
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement, Supplier, StoragePoint } from '../types';
import { Plus, ScanBarcode, Edit2, Trash2, Tag, Calendar, Package, Truck, Printer, MapPin, FileText, ArrowRight, Building, FileDigit, Globe, Clock, Box, ShieldCheck, Map, UserCheck, Briefcase, Wand2, AlertCircle, DollarSign, ShoppingCart, Archive, ChevronRight, Warehouse, Route as RouteIcon, ExternalLink, Save, X, Database, Coins, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient'; 
import { Link } from 'react-router-dom';

// Tipos de cambio referenciales (Base USD)
const EXCHANGE_RATES = {
    EUR: 0.92, // 1 USD = 0.92 EUR
    ARS: 880.00 // 1 USD = 880 ARS (Referencial MEP/CCL)
};

export default function SeedBatches() {
  const { seedBatches, seedMovements, addLocalSeedBatch, updateSeedBatch, deleteSeedBatch, addSeedMovement, varieties, locations, currentUser, suppliers, clients, storagePoints, addStoragePoint, isEmergencyMode } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>('inventory');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // -- SCHEMA HEALTH CHECK --
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
      const checkSchema = async () => {
          if (isEmergencyMode) return;
          const { error } = await supabase.from('seed_batches').select('pricePerKg').limit(1);
          if (error && (error.code === '42703' || error.message.includes('does not exist'))) {
              setSchemaError("Falta la columna 'pricePerKg' para valorización.");
          }
      };
      checkSchema();
  }, [isEmergencyMode]);

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

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFormData.varietyId) { alert("Error: Selecciona una Variedad."); return; }
    if (!batchFormData.supplierName) { alert("Error: El nombre del proveedor es obligatorio."); return; }
    if (!batchFormData.initialQuantity || batchFormData.initialQuantity <= 0) { alert("Error: La cantidad debe ser mayor a 0."); return; }
    if (!batchFormData.batchCode) { alert("Error: Falta el código de lote."); return; }

    setIsSubmitting(true);
    const rawPayload = { 
        ...batchFormData,
        remainingQuantity: editingBatchId ? batchFormData.remainingQuantity : batchFormData.initialQuantity 
    };

    const payload = Object.fromEntries(
        Object.entries(rawPayload).map(([key, value]) => {
            if (value === '') return [key, null];
            if (['purity', 'germination', 'initialQuantity', 'pricePerKg', 'remainingQuantity'].includes(key)) {
                return [key, Number(value) || 0];
            }
            return [key, value];
        })
    ) as any;

    try {
        if (editingBatchId) { 
            updateSeedBatch({ ...payload, id: editingBatchId }); 
        } else { 
            const newId = `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const finalPayload = { ...payload, id: newId, createdAt: new Date().toISOString() };

            if (!isEmergencyMode) {
                const { error } = await supabase.from('seed_batches').insert([finalPayload]);
                if (error) throw error;
                addLocalSeedBatch(finalPayload);
            } else {
                addLocalSeedBatch(finalPayload);
            }
        }
        setIsBatchModalOpen(false); 
        resetBatchForm();
    } catch (err: any) {
        alert("Error crítico al guardar: " + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetBatchForm = () => {
    setBatchFormData({ 
        varietyId: '', supplierId: '', supplierName: '', supplierLegalName: '', supplierCuit: '', supplierAddress: '', originCountry: '',
        batchCode: '', labelSerialNumber: '', category: 'C1', analysisDate: '',
        purchaseOrder: '', purchaseDate: new Date().toISOString().split('T')[0],
        initialQuantity: 0, remainingQuantity: 0, storagePointId: '', isActive: true, pricePerKg: 0
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

  const handleQuickStorageSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!quickStorageForm.name) return;
      const newId = Date.now().toString();
      const payload = { id: newId, name: quickStorageForm.name, city: quickStorageForm.city, type: quickStorageForm.type as any, surfaceM2: Number(quickStorageForm.surfaceM2), address: 'Dirección pendiente' } as StoragePoint;
      addStoragePoint(payload);
      setBatchFormData(prev => ({ ...prev, storagePointId: newId }));
      setIsQuickStorageOpen(false);
      setQuickStorageForm({ name: '', city: '', type: 'Propio', surfaceM2: 0 });
  };

  const getRouteData = () => {
      const batch = seedBatches.find(b => b.id === moveFormData.batchId);
      const originPoint = storagePoints.find(sp => sp.id === batch?.storagePointId);
      const destLocation = locations.find(l => l.id === moveFormData.targetLocationId);
      if (originPoint?.coordinates && destLocation?.coordinates) {
          const link = `https://www.google.com/maps/dir/?api=1&origin=${originPoint.coordinates.lat},${originPoint.coordinates.lng}&destination=${destLocation.coordinates.lat},${destLocation.coordinates.lng}&travelmode=driving`;
          const R = 6371; 
          const dLat = (destLocation.coordinates.lat - originPoint.coordinates.lat) * Math.PI / 180;
          const dLon = (destLocation.coordinates.lng - originPoint.coordinates.lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(originPoint.coordinates.lat * Math.PI / 180) * Math.cos(destLocation.coordinates.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const dist = R * c;
          return { link, dist: dist.toFixed(1), originName: originPoint.name, destName: destLocation.name };
      }
      return null;
  };

  const routeData = getRouteData();

  const handleMoveSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!moveFormData.batchId || !moveFormData.targetLocationId || !moveFormData.quantity || isSubmitting) return;

      const batch = seedBatches.find(b => b.id === moveFormData.batchId);
      if(batch && moveFormData.quantity > batch.remainingQuantity) {
          alert(`Error: Stock insuficiente. Disponible: ${batch.remainingQuantity} kg`);
          return;
      }

      setIsSubmitting(true);
      const movementId = `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const movementPayload = {
          ...moveFormData as any,
          id: movementId,
          transportGuideNumber: moveFormData.transportGuideNumber || `G-${Date.now()}`,
          originStorageId: batch?.storagePointId || null,
          routeGoogleLink: routeData?.link || null,
          estimatedDistanceKm: routeData ? Number(routeData.dist) : null
      };

      try {
          if (!isEmergencyMode) {
              const { error } = await supabase.from('seed_movements').insert([movementPayload]);
              if (error) throw error;
          }
          addSeedMovement(movementPayload);
          if(batch) {
              const newQty = batch.remainingQuantity - Number(moveFormData.quantity);
              updateSeedBatch({ ...batch, remainingQuantity: newQty });
          }
          setIsMoveModalOpen(false);
          resetMoveForm();
      } catch (err: any) {
          alert("Error al procesar logística: " + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const resetMoveForm = () => {
      setMoveFormData({ batchId: '', clientId: '', targetLocationId: '', quantity: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito' });
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  // --- VALUATION LOGIC ---
  const totalKg = seedBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
  const totalUsd = seedBatches.reduce((sum, b) => sum + ((b.remainingQuantity || 0) * (b.pricePerKg || 0)), 0);
  const totalEur = totalUsd * EXCHANGE_RATES.EUR;
  const totalArs = totalUsd * EXCHANGE_RATES.ARS;

  return (
    <div>
      {schemaError && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6 flex items-start justify-between shadow-sm">
              <div className="flex items-start">
                  <Database className="text-red-500 mr-3 mt-1" size={24}/>
                  <div>
                      <h3 className="font-bold text-red-800">Actualización de Base de Datos Necesaria (V2.9.0)</h3>
                      <p className="text-red-600 text-sm mt-1">Faltan columnas de valorización avanzada. Los cálculos de precios podrían fallar.</p>
                  </div>
              </div>
              <Link to="/settings" className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 shadow">
                  Reparar Ahora
              </Link>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <Archive className="mr-2 text-hemp-600"/> Inventario de Semillas
            </h1>
            <p className="text-sm text-gray-500">Valorización multimoneda (USD/EUR/ARS), logística y trazabilidad.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button onClick={() => { resetMoveForm(); setIsMoveModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition shadow-sm justify-center flex-1 md:flex-none">
                <Truck size={20} className="mr-2" /> Logística de Salida
              </button>
              <button onClick={() => { resetBatchForm(); setIsBatchModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition shadow-sm justify-center flex-1 md:flex-none">
                <ShoppingCart size={20} className="mr-2" /> Registrar Compra
              </button>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
              <button onClick={() => setActiveTab('inventory')} className={`${activeTab === 'inventory' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500 hover:text-gray-700'} pb-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                  <Package size={16} className="mr-2"/> Stock Central & Valorización
              </button>
              <button onClick={() => setActiveTab('logistics')} className={`${activeTab === 'logistics' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500 hover:text-gray-700'} pb-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                  <Truck size={16} className="mr-2"/> Historial de Entregas
              </button>
          </nav>
      </div>

      {activeTab === 'inventory' && (
          <div className="space-y-4">
              {/* Multicurrency Financial Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Volumen en Stock</p>
                      <p className="text-2xl font-black text-gray-800">{totalKg.toLocaleString()} kg</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm relative overflow-hidden">
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Valorización USD</p>
                      <p className="text-2xl font-black text-green-700">USD {totalUsd.toLocaleString()}</p>
                      <DollarSign className="absolute -right-2 -bottom-2 text-green-200 opacity-20" size={64}/>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Valorización EUR</p>
                      <p className="text-2xl font-black text-blue-700">€ {totalEur.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                      <Coins className="absolute -right-2 -bottom-2 text-blue-200 opacity-20" size={64}/>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm relative overflow-hidden">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Valorización ARS (Est.)</p>
                      <p className="text-2xl font-black text-amber-700">$ {totalArs.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                      <div className="absolute right-2 bottom-2 text-[10px] font-bold text-amber-400">1 USD = ${EXCHANGE_RATES.ARS}</div>
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Referencia / Lote</th>
                              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Variedad</th>
                              <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Ubicación</th>
                              <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Stock</th>
                              <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Valor Stock (USD/EUR)</th>
                              <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {seedBatches.length === 0 ? (
                              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No hay stock disponible.</td></tr>
                          ) : seedBatches.map(batch => {
                              const variety = varieties.find(v => v.id === batch.varietyId);
                              const sp = storagePoints.find(s => s.id === batch.storagePointId);
                              const usdValue = (batch.remainingQuantity || 0) * (batch.pricePerKg || 0);
                              const eurValue = usdValue * EXCHANGE_RATES.EUR;

                              return (
                                  <tr key={batch.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-gray-700">{batch.batchCode}</div>
                                          <div className="text-[10px] text-gray-400 font-mono">PO: {batch.purchaseOrder || 'S/N'}</div>
                                      </td>
                                      <td className="px-6 py-4 font-bold text-hemp-700">{variety?.name || 'Desconocida'}</td>
                                      <td className="px-6 py-4 text-center">
                                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100 font-bold">
                                              {sp?.name || 'S/D'}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <span className={`px-2 py-1 rounded font-bold ${batch.remainingQuantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                              {batch.remainingQuantity} kg
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          {usdValue > 0 ? (
                                              <div>
                                                  <div className="font-mono font-bold text-gray-800">${usdValue.toLocaleString()} <span className="text-[10px] text-gray-400">USD</span></div>
                                                  <div className="font-mono text-xs text-gray-500">€{eurValue.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-[10px]">EUR</span></div>
                                              </div>
                                          ) : <span className="text-gray-300">-</span>}
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
          </div>
      )}

      {activeTab === 'logistics' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Fecha</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Material</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Destino (Cliente)</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Distancia</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Estado</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Hoja Ruta</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {seedMovements.length === 0 ? (
                          <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">No hay envíos registrados.</td></tr>
                      ) : seedMovements.map(move => {
                          const batch = seedBatches.find(b => b.id === move.batchId);
                          const vari = varieties.find(v => v.id === batch?.varietyId);
                          const client = clients.find(c => c.id === move.clientId);
                          const loc = locations.find(l => l.id === move.targetLocationId);

                          return (
                              <tr key={move.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 text-xs">{move.date}</td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-800">{vari?.name}</div>
                                      <div className="text-blue-600 font-bold">{move.quantity} kg</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-medium text-gray-700">{client?.name || 'S/D'}</div>
                                      <div className="text-[10px] text-gray-400 flex items-center"><MapPin size={10} className="mr-1"/>{loc?.name}</div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      {move.estimatedDistanceKm ? (
                                          <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full inline-block">
                                              {move.estimatedDistanceKm} km
                                          </div>
                                      ) : <span className="text-gray-300">-</span>}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${move.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 animate-pulse'}`}>
                                          {move.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      {move.routeGoogleLink && (
                                          <a href={move.routeGoogleLink} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-green-600 inline-block">
                                              <RouteIcon size={18}/>
                                          </a>
                                      )}
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
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-purple-800 uppercase flex items-center">
                            <Warehouse size={12} className="mr-1"/> Destino de Almacenamiento
                        </h3>
                        <button type="button" onClick={() => setIsQuickStorageOpen(true)} className="text-xs bg-white text-purple-700 px-2 py-1 rounded border border-purple-200 font-bold hover:bg-purple-100 flex items-center shadow-sm">
                            <Plus size={12} className="mr-1"/> Nuevo Depósito
                        </button>
                    </div>
                    <select required className={inputClass} value={batchFormData.storagePointId} onChange={e => setBatchFormData({...batchFormData, storagePointId: e.target.value})}>
                        <option value="">Seleccionar Depósito...</option>
                        {storagePoints.map(sp => (
                            <option key={sp.id} value={sp.id}>{sp.name} ({sp.city})</option>
                        ))}
                    </select>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center"><Building size={12} className="mr-1"/> Proveedor y Variedad</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                            <select required className={inputClass} value={selectedSupplierId} onChange={e => handleSupplierChange(e.target.value)}>
                                <option value="">-- Seleccionar --</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.country})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Variedad *</label>
                            <select required className={inputClass} value={batchFormData.varietyId} onChange={e => handleVarietyChange(e.target.value)} disabled={!selectedSupplierId}>
                                <option value="">-- Seleccionar --</option>
                                {filteredVarieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center"><DollarSign size={12} className="mr-1"/> Datos de Operación y Trazabilidad</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lot N° (Ref. Lote) *</label>
                            <input required type="text" className={inputClass} value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value})} placeholder="F 0150 T..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 text-blue-600 font-bold">Serie Etiqueta</label>
                            <input type="text" className={inputClass} value={batchFormData.labelSerialNumber || ''} onChange={e => setBatchFormData({...batchFormData, labelSerialNumber: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Orden de Compra</label>
                            <input type="text" className={inputClass} value={batchFormData.purchaseOrder || ''} onChange={e => setBatchFormData({...batchFormData, purchaseOrder: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad (kg) *</label>
                            <input required type="number" step="0.1" className={inputClass} value={batchFormData.initialQuantity} onChange={e => setBatchFormData({...batchFormData, initialQuantity: Number(e.target.value), remainingQuantity: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 text-green-700 font-bold">Precio Unit. (USD/kg)</label>
                            <input required type="number" step="0.01" className={inputClass} value={batchFormData.pricePerKg} onChange={e => setBatchFormData({...batchFormData, pricePerKg: Number(e.target.value)})} />
                        </div>
                        <div className="bg-white border p-2 rounded text-center flex flex-col justify-center">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Valor Total Est.</span>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-gray-800">USD {(batchFormData.initialQuantity! * batchFormData.pricePerKg!).toLocaleString()}</span>
                                <span className="text-[10px] text-gray-500 font-bold">EUR {((batchFormData.initialQuantity! * batchFormData.pricePerKg!) * EXCHANGE_RATES.EUR).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                    <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm font-bold flex items-center disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save size={18} className="mr-2"/>}
                        Guardar Lote
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CREATE STORAGE MODAL */}
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
                      <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 mt-2 flex justify-center items-center shadow-sm">
                          <Save size={16} className="mr-2"/> Guardar y Seleccionar
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* LOGISTICS MODAL */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Registrar Salida / Envío</h2>
            <form onSubmit={handleMoveSubmit} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lote a Enviar (Origen)</label>
                    <select required className={inputClass} value={moveFormData.batchId} onChange={e => setMoveFormData({...moveFormData, batchId: e.target.value})}>
                        <option value="">Seleccionar Lote...</option>
                        {seedBatches.filter(b => b.remainingQuantity > 0).map(b => {
                            const sp = storagePoints.find(s => s.id === b.storagePointId);
                            const vari = varieties.find(v => v.id === b.varietyId);
                            return (
                                <option key={b.id} value={b.id}>[{vari?.name || 'S/V'}] {b.batchCode} @ {sp?.name || 'Depósito'} ({b.remainingQuantity} kg)</option>
                            )
                        })}
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
                                {locations.filter(l => l.clientId === moveFormData.clientId).map(l => <option key={l.id} value={l.id}>{l.name} ({l.city})</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {routeData && (
                    <div className="bg-green-50 p-3 rounded border border-green-200 flex items-center justify-between animate-in fade-in">
                        <div>
                            <span className="text-xs font-bold text-green-800 uppercase block mb-1">Ruta Generada</span>
                            <div className="text-xs text-green-700 flex items-center">
                                <MapPin size={10} className="mr-1"/> {routeData.originName} <ArrowRight size={10} className="mx-1"/> {routeData.destName}
                            </div>
                            <div className="text-xs font-bold mt-1 text-green-900">{routeData.dist} km aprox.</div>
                        </div>
                        <a href={routeData.link} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white p-2 rounded shadow hover:bg-green-700 text-xs font-bold flex items-center"><RouteIcon size={14} className="mr-1"/> Ver en Maps</a>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a Enviar (kg)</label>
                    <input required type="number" step="0.1" className={inputClass} value={moveFormData.quantity} onChange={e => setMoveFormData({...moveFormData, quantity: Number(e.target.value)})} />
                    <p className="text-[10px] text-gray-400 mt-1 italic">* Al guardar se descontará automáticamente del stock central.</p>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={() => setIsMoveModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm font-bold flex items-center disabled:opacity-50">
                        {isSubmitting && <Loader2 className="animate-spin mr-2" size={16}/>}
                        Confirmar Envío
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
