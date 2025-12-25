
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement } from '../types';
import { 
  ScanBarcode, Edit2, Trash2, Tag, Package, Truck, Printer, MapPin, 
  AlertCircle, DollarSign, Archive, Save, X, 
  Loader2, Search, Eye, Info, CheckCircle, Filter, FilterX, ArrowUpRight,
  Building, User, Calendar, FileText, Globe, ClipboardList, ShieldCheck, Warehouse,
  Plus, CheckCircle2, Navigation, Smartphone, UserCheck, Barcode, FlaskConical, Scale, ClipboardCheck,
  Map as MapIcon, Route, Compass, Weight
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

type MassUnit = 'gr' | 'kg' | 'tn';

const MetricCard = ({ label, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-start space-x-4">
        <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 text-${colorClass.split('-')[1]}-600`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white leading-none">{value}</p>
            {subtext && <p className="text-[10px] text-gray-400 mt-1 font-bold">{subtext}</p>}
        </div>
    </div>
);

export default function SeedBatches() {
  const { 
    seedBatches, seedMovements, addSeedBatch, updateSeedBatch, 
    deleteSeedBatch, addSeedMovement, updateSeedMovement, varieties, 
    currentUser, clients, storagePoints, suppliers 
  } = useAppContext();
  
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>((searchParams.get('tab') as any) || 'inventory');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('variety') || '');
  const [filterStatus, setFilterStatus] = useState('');

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<SeedBatch | null>(null);

  // Unidades locales para carga
  const [entryUnit, setEntryUnit] = useState<MassUnit>('kg');
  const [moveUnit, setMoveUnit] = useState<MassUnit>('kg');

  const [batchFormData, setBatchFormData] = useState<Partial<SeedBatch> & { inputValue: number }>({
    varietyId: '', supplierId: '', batchCode: '', initialQuantity: 0, inputValue: 0, purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0, storagePointId: '', isActive: true,
    labelSerialNumber: '', category: 'C1', certificationNumber: '', gs1Code: '', analysisDate: '', germination: 90, purity: 99, notes: ''
  });

  const [moveFormData, setMoveFormData] = useState<Partial<SeedMovement> & { inputValue: number }>({
    batchId: '', clientId: '', targetLocationId: '', quantity: 0, inputValue: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio',
    transportGuideNumber: '', driverName: '', driverDni: '', vehiclePlate: '', transportCompany: '', recipientName: '', recipientDni: '',
    routeItinerary: '', estimatedDistanceKm: 0, routeGoogleLink: '', dispatchTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isClient = currentUser?.role === 'client';

  // Helper de conversión a KG
  const convertToKg = (val: number, unit: MassUnit) => {
      const numericVal = Number(val) || 0;
      switch(unit) {
          case 'gr': return numericVal / 1000;
          case 'tn': return numericVal * 1000;
          default: return numericVal;
      }
  };

  const calculatedEntryKg = useMemo(() => convertToKg(batchFormData.inputValue || 0, entryUnit), [batchFormData.inputValue, entryUnit]);
  const calculatedMoveKg = useMemo(() => convertToKg(moveFormData.inputValue || 0, moveUnit), [moveFormData.inputValue, moveUnit]);

  // Lotes visibles
  const filteredBatches = useMemo(() => seedBatches.filter(b => {
      const v = varieties.find(v => v.id === b.varietyId);
      const sp = storagePoints.find(s => s.id === b.storagePointId);
      if (isClient && currentUser?.clientId) {
          if (sp?.clientId !== currentUser.clientId) return false;
      }
      const matchesSearch = b.batchCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (v?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
  }), [seedBatches, searchTerm, varieties, isClient, currentUser, storagePoints]);

  const filteredMovements = useMemo(() => seedMovements.filter(m => {
      if (isClient && currentUser?.clientId) {
          if (m.clientId !== currentUser.clientId) return false;
      }
      const term = searchTerm.toLowerCase();
      const matchesSearch = (m.recipientName || '').toLowerCase().includes(term) || (m.transportGuideNumber || '').toLowerCase().includes(term);
      const matchesStatus = !filterStatus || m.status === filterStatus;
      return matchesSearch && matchesStatus;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [seedMovements, searchTerm, filterStatus, isClient, currentUser]);

  const stats = useMemo(() => {
      const totalKg = filteredBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
      const activeTransits = filteredMovements.filter(m => m.status === 'En Tránsito').length;
      return { totalKg, activeTransits };
  }, [filteredBatches, filteredMovements]);

  const filteredVarietiesBySupplier = useMemo(() => {
    if (!batchFormData.supplierId) return [];
    return varieties.filter(v => v.supplierId === batchFormData.supplierId);
  }, [batchFormData.supplierId, varieties]);

  const destinationStorages = useMemo(() => {
      if (!moveFormData.clientId) return [];
      return storagePoints.filter(sp => sp.clientId === moveFormData.clientId);
  }, [moveFormData.clientId, storagePoints]);

  const handleOpenView = (batch: SeedBatch) => {
      setSelectedBatch(batch);
      setIsViewModalOpen(true);
  };

  const handleOpenDispatch = (batchId?: string) => {
      setMoveUnit('kg');
      setMoveFormData({
          batchId: batchId || '', clientId: '', targetLocationId: '', quantity: 0, inputValue: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio',
          transportGuideNumber: '', driverName: '', driverDni: '', vehiclePlate: '', transportCompany: '', recipientName: '', recipientDni: '',
          routeItinerary: '', estimatedDistanceKm: 0, routeGoogleLink: '', dispatchTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      });
      setIsMoveModalOpen(true);
  };

  const handleConfirmReceipt = async (move: SeedMovement) => {
      if (isSubmitting) return;
      if (!window.confirm(`¿Confirma la recepción física de ${move.quantity} kg?`)) return;
      
      setIsSubmitting(true);
      try {
          const updateSuccess = await updateSeedMovement({ ...move, status: 'Recibido' });
          if (updateSuccess) {
              const originalBatch = seedBatches.find(b => b.id === move.batchId);
              if (originalBatch) {
                  const localBatchPayload: SeedBatch = {
                      ...originalBatch,
                      id: crypto.randomUUID(),
                      batchCode: `${originalBatch.batchCode}-REC-${move.transportGuideNumber || 'S/N'}`,
                      initialQuantity: move.quantity,
                      remainingQuantity: move.quantity,
                      storagePointId: move.targetLocationId,
                      notes: `Recibido mediante remito ${move.transportGuideNumber}.`,
                      createdAt: new Date().toISOString(),
                      isActive: true
                  };
                  await addSeedBatch(localBatchPayload);
                  alert("✅ Recepción confirmada. Inventario local actualizado.");
              }
          }
      } finally { setIsSubmitting(false); }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!batchFormData.varietyId || !batchFormData.batchCode || calculatedEntryKg <= 0 || isSubmitting) {
          alert("Debe ingresar una cantidad válida.");
          return;
      }
      setIsSubmitting(true);
      try {
          const { inputValue, ...cleanBatchData } = batchFormData;
          const payload = { 
            ...cleanBatchData, 
            id: editingBatchId || crypto.randomUUID(), 
            initialQuantity: calculatedEntryKg,
            remainingQuantity: editingBatchId ? (batchFormData.remainingQuantity || 0) : calculatedEntryKg, 
            pricePerKg: Number(batchFormData.pricePerKg), 
            isActive: true, 
            createdAt: batchFormData.createdAt || new Date().toISOString() 
          } as SeedBatch;
          
          let success = editingBatchId ? await updateSeedBatch(payload) : await addSeedBatch(payload);
          if (success) { setIsBatchModalOpen(false); setEditingBatchId(null); }
      } finally { setIsSubmitting(false); }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const batch = seedBatches.find(b => b.id === moveFormData.batchId);
      
      if (!batch || calculatedMoveKg > batch.remainingQuantity) {
          alert(`Error: Stock insuficiente. El lote posee ${batch?.remainingQuantity || 0} kg.`);
          return;
      }
      if (!moveFormData.targetLocationId) {
          alert("Nodo destino obligatorio.");
          return;
      }

      setIsSubmitting(true);
      try {
          // LIMPPIEZA CRÍTICA PARA EVITAR FALLO DE COLUMNA 'input_value'
          const { inputValue, ...cleanMoveData } = moveFormData;

          const movePayload = { 
              ...cleanMoveData, 
              id: crypto.randomUUID(), 
              status: 'En Tránsito', 
              quantity: calculatedMoveKg,
              originStorageId: batch.storagePointId
          } as SeedMovement;
          
          const success = await addSeedMovement(movePayload);
          if (success) {
              // Actualizamos el saldo del lote origen
              await updateSeedBatch({ ...batch, remainingQuantity: batch.remainingQuantity - calculatedMoveKg });
              setIsMoveModalOpen(false);
              alert("✅ Despacho registrado correctamente.");
          }
      } catch (err) {
          alert("Error de comunicación con el servidor logístico.");
      } finally { setIsSubmitting(false); }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-3 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all";
  const labelClass = "text-[9px] font-black uppercase text-slate-500 ml-1 mb-1.5 block tracking-widest";

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">Inventario <span className="text-hemp-600">& Logística</span></h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Control de stock y remitos unificado.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button onClick={() => handleOpenDispatch()} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-blue-700 transition shadow-xl font-black text-xs uppercase tracking-widest"><ArrowUpRight size={18} className="mr-2" /> Despachar Carga</button>
              <button onClick={() => { setEditingBatchId(null); setEntryUnit('kg'); setBatchFormData({ varietyId: '', supplierId: '', batchCode: '', initialQuantity: 0, inputValue: 0, purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0, storagePointId: '', isActive: true }); setIsBatchModalOpen(true); }} className="flex-1 md:flex-none bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest"><Plus size={18} className="mr-2" /> Ingresar Lote</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard label="Masa Total en Red" value={`${stats.totalKg.toLocaleString()} kg`} icon={Package} colorClass="bg-blue-500" />
          <MetricCard label="Nodos Logísticos" value={storagePoints.length} icon={Warehouse} colorClass="bg-hemp-500" />
          <MetricCard label="Cargas Activas" value={stats.activeTransits} icon={Truck} colorClass="bg-purple-500" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex space-x-2 bg-gray-100 dark:bg-slate-950 p-1 rounded-2xl w-full md:w-auto">
                  <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-800 text-hemp-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Stock Disponible</button>
                  <button onClick={() => setActiveTab('logistics')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logistics' ? 'bg-white dark:bg-slate-800 text-hemp-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Hoja de Remitos</button>
              </div>
              <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                  <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border-none rounded-xl text-xs w-full md:w-48 focus:ring-2 focus:ring-hemp-500 outline-none dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
          </div>
      </div>

      {activeTab === 'inventory' ? (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
                      <tr>
                          <th className="px-8 py-5">Lote Industrial</th>
                          <th className="px-8 py-5">Ubicación / Nodo</th>
                          <th className="px-8 py-5 text-center">Disponible</th>
                          <th className="px-8 py-5 text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-bold">
                      {filteredBatches.length === 0 ? (
                          <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic font-medium">Sin stock detectado.</td></tr>
                      ) : filteredBatches.map(batch => {
                          const v = varieties.find(v => v.id === batch.varietyId);
                          const sp = storagePoints.find(s => s.id === batch.storagePointId);
                          return (
                              <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                  <td className="px-8 py-5">
                                      <div className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-tighter">{batch.batchCode}</div>
                                      <div className="text-[9px] text-hemp-600 font-black uppercase tracking-widest">{v?.name || 'N/A'}</div>
                                  </td>
                                  <td className="px-8 py-5">
                                      <div className="font-black text-slate-700 dark:text-slate-300 uppercase italic truncate max-w-[200px]">{sp?.name || 'ALMACÉN CENTRAL'}</div>
                                      <div className="text-[9px] text-gray-400 uppercase font-black">{sp?.city || '-'}</div>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                      <span className={`px-4 py-1.5 rounded-full font-black text-xs ${batch.remainingQuantity <= 0 ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700 shadow-sm'}`}>{batch.remainingQuantity.toLocaleString()} kg</span>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => handleOpenView(batch)} className="p-2 text-gray-400 hover:text-blue-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition"><Eye size={16}/></button>
                                          {isAdmin && <button onClick={() => { setBatchFormData({...batch, inputValue: batch.initialQuantity}); setEditingBatchId(batch.id); setIsBatchModalOpen(true); }} className="p-2 text-gray-400 hover:text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition"><Edit2 size={16}/></button>}
                                      </div>
                                  </td>
                              </tr>
                          )
                      })}
                  </tbody>
              </table>
          </div>
      ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-950 text-gray-400 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
                      <tr>
                          <th className="px-8 py-5">Remito / Chofer</th>
                          <th className="px-8 py-5">Nodo Destino</th>
                          <th className="px-8 py-5 text-center">Cantidad</th>
                          <th className="px-8 py-5 text-right">Estatus / Acción</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-bold">
                      {filteredMovements.length === 0 ? (
                           <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic">Sin remitos registrados.</td></tr>
                      ) : filteredMovements.map(move => {
                          const targetStorage = storagePoints.find(s => s.id === move.targetLocationId);
                          const canConfirm = isAdmin || (isClient && move.clientId === currentUser?.clientId);
                          
                          return (
                              <tr key={move.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-8 py-5">
                                      <div className="font-black text-gray-800 dark:text-gray-200">Guía: {move.transportGuideNumber || 'S/N'}</div>
                                      <div className="text-[9px] text-gray-400 font-black uppercase tracking-tighter italic">{move.driverName || 'S/D'} ({move.vehiclePlate || 'S/P'})</div>
                                  </td>
                                  <td className="px-8 py-5">
                                      <div className="font-black text-slate-700 dark:text-slate-300 uppercase">{targetStorage?.name || 'S/D'}</div>
                                      <div className="text-[9px] text-gray-400 uppercase font-black">{targetStorage?.city}</div>
                                  </td>
                                  <td className="px-8 py-5 text-center font-black text-hemp-700 text-base">{move.quantity.toLocaleString()} kg</td>
                                  <td className="px-8 py-5 text-right">
                                      <div className="flex items-center justify-end space-x-2">
                                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm ${move.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 animate-pulse'}`}>
                                            {move.status}
                                          </span>
                                          {move.status !== 'Recibido' && canConfirm && (
                                              <button onClick={() => handleConfirmReceipt(move)} disabled={isSubmitting} className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition shadow-md disabled:opacity-50" title="Confirmar Recepción de Material"><ClipboardCheck size={16}/></button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          )
                      })}
                  </tbody>
              </table>
          </div>
      )}

      {/* MODAL INGRESO LOTE INDUSTRIAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-5xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 border border-white/10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Archive size={24}/></div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Ingresar <span className="text-hemp-600">Lote Industrial</span></h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trazabilidad desde etiqueta fiscal / proveedor</p>
                    </div>
                </div>
                <button onClick={() => setIsBatchModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleBatchSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800 space-y-4">
                        <h3 className="text-[10px] font-black text-hemp-600 uppercase tracking-widest mb-4 flex items-center border-b dark:border-slate-800 pb-2"><Building size={14} className="mr-2"/> Origen del Material</h3>
                        <div>
                            <label className={labelClass}>Proveedor Autorizado *</label>
                            <select 
                                required 
                                className={inputClass} 
                                value={batchFormData.supplierId} 
                                onChange={e => {
                                    setBatchFormData({
                                        ...batchFormData, 
                                        supplierId: e.target.value,
                                        varietyId: '' 
                                    });
                                }}
                            >
                                <option value="">Seleccionar...</option>
                                {suppliers.filter(s => s.category === 'Semillas').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Variedad Genética *</label>
                            <select 
                                required 
                                className={`${inputClass} ${!batchFormData.supplierId ? 'bg-slate-100 dark:bg-slate-800 opacity-60' : ''}`} 
                                value={batchFormData.varietyId} 
                                onChange={e => setBatchFormData({...batchFormData, varietyId: e.target.value})} 
                                disabled={!batchFormData.supplierId}
                            >
                                <option value="">{!batchFormData.supplierId ? '-- Seleccione Proveedor primero --' : 'Seleccionar genética...'}</option>
                                {filteredVarietiesBySupplier.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Código de Lote *</label>
                            <input required type="text" className={`${inputClass} font-mono uppercase text-hemp-600`} value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value.toUpperCase()})} placeholder="EJ: LOTE-2024-X" />
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30 space-y-4">
                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center border-b border-blue-100 dark:border-blue-800 pb-2"><ScanBarcode size={14} className="mr-2"/> Certificación Fiscal</h3>
                        <div>
                            <label className={labelClass}>Nro Serie Etiqueta</label>
                            <input type="text" className={inputClass} value={batchFormData.labelSerialNumber} onChange={e => setBatchFormData({...batchFormData, labelSerialNumber: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelClass}>Nro Certificación / Acta</label>
                            <input type="text" className={inputClass} value={batchFormData.certificationNumber || ''} onChange={e => setBatchFormData({...batchFormData, certificationNumber: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelClass}>Germinación (%)</label><input type="number" className={inputClass} value={batchFormData.germination} onChange={e => setBatchFormData({...batchFormData, germination: Number(e.target.value)})} /></div>
                            <div><label className={labelClass}>Pureza (%)</label><input type="number" className={inputClass} value={batchFormData.purity} onChange={e => setBatchFormData({...batchFormData, purity: Number(e.target.value)})} /></div>
                        </div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 space-y-4">
                        <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center border-b border-emerald-100 dark:border-emerald-800 pb-2"><Warehouse size={14} className="mr-2"/> Recepción y Stock</h3>
                        <div>
                            <label className={labelClass}>Punto de Acopio *</label>
                            <select required className={inputClass} value={batchFormData.storagePointId} onChange={e => setBatchFormData({...batchFormData, storagePointId: e.target.value})}>
                                <option value="">Seleccionar depósito...</option>
                                {storagePoints.map(sp => <option key={sp.id} value={sp.id}>{sp.name} ({sp.nodeCode})</option>)}
                            </select>
                        </div>
                        
                        <div className="space-y-4">
                            <label className={labelClass}>Cantidad Inicial *</label>
                            <div className="flex gap-2">
                                <input 
                                    required 
                                    type="number" 
                                    step="0.001" 
                                    min="0.001"
                                    className={`${inputClass} flex-1 text-2xl font-black text-emerald-700`}
                                    value={batchFormData.inputValue} 
                                    onChange={e => setBatchFormData({...batchFormData, inputValue: Number(e.target.value)})} 
                                />
                                <select 
                                    className="w-24 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-emerald-600 text-center"
                                    value={entryUnit}
                                    onChange={e => setEntryUnit(e.target.value as MassUnit)}
                                >
                                    <option value="gr">GRAMOS</option>
                                    <option value="kg">KILOS</option>
                                    <option value="tn">TONS</option>
                                </select>
                            </div>
                            <div className="bg-white/50 dark:bg-slate-900/50 p-3 rounded-2xl border border-dashed border-emerald-200 dark:border-slate-800 flex justify-between items-center px-4">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Carga Real:</span>
                                <span className="text-sm font-black text-emerald-600">{calculatedEntryKg.toLocaleString()} KG</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center hover:scale-[1.01] transition-all disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                    {editingBatchId ? 'Confirmar Actualización' : 'Finalizar Registro de Lote'}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DESPACHO CARGA (LOGÍSTICA DE ENVÍO) */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-6xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 border border-white/10">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Truck size={28}/></div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Despachar <span className="text-blue-600">Material</span></h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Generación de remito y hoja de ruta logística</p>
                        </div>
                    </div>
                    <button onClick={() => setIsMoveModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
                </div>

                <form onSubmit={handleMoveSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b dark:border-slate-800 pb-2">Material en Origen</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Seleccionar Lote *</label>
                                        <select required className={inputClass} value={moveFormData.batchId} onChange={e => setMoveFormData({...moveFormData, batchId: e.target.value})}>
                                            <option value="">Seleccione stock...</option>
                                            {seedBatches.filter(b => b.remainingQuantity > 0).map(b => {
                                                const v = varieties.find(v => v.id === b.varietyId);
                                                const sp = storagePoints.find(s => s.id === b.storagePointId);
                                                return (
                                                    <option key={b.id} value={b.id}>
                                                        {b.batchCode} - {v?.name} ({b.remainingQuantity}kg en {sp?.name})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Masa a Despachar *</label>
                                        <div className="flex gap-2">
                                            <input required type="number" step="0.001" className={`${inputClass} flex-1 text-xl font-black`} value={moveFormData.inputValue} onChange={e => setMoveFormData({...moveFormData, inputValue: Number(e.target.value)})} />
                                            <select className="w-20 bg-gray-100 dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase text-center" value={moveUnit} onChange={e => setMoveUnit(e.target.value as MassUnit)}>
                                                <option value="gr">GR</option>
                                                <option value="kg">KG</option>
                                                <option value="tn">TN</option>
                                            </select>
                                        </div>
                                        <p className="text-[9px] text-blue-600 font-bold mt-2 uppercase tracking-widest">Carga neta: {calculatedMoveKg.toLocaleString()} kg</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-800">
                                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 border-b border-blue-100 dark:border-blue-800 pb-2">Destino de Carga</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Cliente / Socio Destino *</label>
                                        <select required className={inputClass} value={moveFormData.clientId} onChange={e => setMoveFormData({...moveFormData, clientId: e.target.value, targetLocationId: ''})}>
                                            <option value="">Seleccione socio...</option>
                                            <option value="INTERNAL">LOGÍSTICA INTERNA (CENTRAL)</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Nodo de Recepción *</label>
                                        <select required className={inputClass} value={moveFormData.targetLocationId} onChange={e => setMoveFormData({...moveFormData, targetLocationId: e.target.value})}>
                                            <option value="">Seleccione depósito destino...</option>
                                            {moveFormData.clientId === 'INTERNAL' 
                                                ? storagePoints.filter(sp => !sp.clientId).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)
                                                : destinationStorages.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)
                                            }
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border dark:border-slate-800">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b dark:border-slate-800 pb-2 flex items-center"><Smartphone size={14} className="mr-2"/> Documentación y Transporte</h3>
                            <div className="space-y-4">
                                <div><label className={labelClass}>Nro Remito / Guía de Transporte *</label><input required type="text" className={inputClass} value={moveFormData.transportGuideNumber} onChange={e => setMoveFormData({...moveFormData, transportGuideNumber: e.target.value.toUpperCase()})} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className={labelClass}>Fecha Despacho</label><input type="date" className={inputClass} value={moveFormData.date} onChange={e => setMoveFormData({...moveFormData, date: e.target.value})} /></div>
                                    <div><label className={labelClass}>Hora Salida</label><input type="time" className={inputClass} value={moveFormData.dispatchTime} onChange={e => setMoveFormData({...moveFormData, dispatchTime: e.target.value})} /></div>
                                </div>
                                <div><label className={labelClass}>Empresa de Transporte</label><input type="text" className={inputClass} value={moveFormData.transportCompany} onChange={e => setMoveFormData({...moveFormData, transportCompany: e.target.value})} /></div>
                                <div>
                                    <label className={labelClass}>Tipo de Logística</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setMoveFormData({...moveFormData, transportType: 'Propio'})} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${moveFormData.transportType === 'Propio' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'}`}>Propio</button>
                                        <button type="button" onClick={() => setMoveFormData({...moveFormData, transportType: 'Tercerizado'})} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${moveFormData.transportType === 'Tercerizado' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'}`}>Tercerizado</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border dark:border-slate-800">
                             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b dark:border-slate-800 pb-2 flex items-center"><UserCheck size={14} className="mr-2"/> Identidad del Chofer</h3>
                             <div className="space-y-4">
                                <div><label className={labelClass}>Nombre del Conductor</label><input type="text" className={inputClass} value={moveFormData.driverName} onChange={e => setMoveFormData({...moveFormData, driverName: e.target.value})} /></div>
                                <div><label className={labelClass}>DNI / Licencia</label><input type="text" className={inputClass} value={moveFormData.driverDni} onChange={e => setMoveFormData({...moveFormData, driverDni: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className={labelClass}>Patente Camión</label><input type="text" className={inputClass} value={moveFormData.vehiclePlate} onChange={e => setMoveFormData({...moveFormData, vehiclePlate: e.target.value.toUpperCase()})} /></div>
                                    <div><label className={labelClass}>Patente Acoplado</label><input type="text" className={inputClass} value={moveFormData.vehicleModel} onChange={e => setMoveFormData({...moveFormData, vehicleModel: e.target.value.toUpperCase()})} /></div>
                                </div>
                                <div className="pt-4 border-t dark:border-slate-800">
                                    <label className={labelClass}>Ruta / Itinerario (Opcional)</label>
                                    <textarea className={`${inputClass} text-xs`} rows={2} value={moveFormData.routeItinerary} onChange={e => setMoveFormData({...moveFormData, routeItinerary: e.target.value})} placeholder="Detalle paradas o ruta específica..." />
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800">
                        <button type="button" disabled={isSubmitting} onClick={() => setIsMoveModalOpen(false)} className="px-8 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar Envío</button>
                        <button type="submit" disabled={isSubmitting} className="bg-slate-900 dark:bg-blue-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" size={18}/> : <Truck className="mr-2" size={18}/>}
                            Generar Remito y Despachar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL VISTA DETALLADA LOTE */}
      {isViewModalOpen && selectedBatch && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-2xl w-full p-10 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                          <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Archive size={24}/></div>
                          <div>
                              <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{selectedBatch.batchCode}</h2>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ficha Técnica de Lote</p>
                          </div>
                      </div>
                      <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={28}/></button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-3xl border dark:border-slate-800">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Genética</p>
                          <p className="text-lg font-black text-hemp-600 uppercase">{varieties.find(v => v.id === selectedBatch.varietyId)?.name || 'S/D'}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-3xl border dark:border-slate-800">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Stock Actual</p>
                          <p className="text-lg font-black text-slate-700 dark:text-slate-300">{selectedBatch.remainingQuantity.toLocaleString()} KG</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Categoría</p>
                          <p className="text-lg font-black text-blue-800 dark:text-blue-300 uppercase">{selectedBatch.category}</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">PG (%)</p>
                          <p className="text-lg font-black text-blue-800 dark:text-blue-300 uppercase">{selectedBatch.germination}%</p>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div className="flex items-center text-sm text-gray-500 font-bold"><Calendar size={18} className="mr-3 opacity-50"/> Fecha de Adquisición: {selectedBatch.purchaseDate || 'N/A'}</div>
                      <div className="flex items-center text-sm text-gray-500 font-bold"><ScanBarcode size={18} className="mr-3 opacity-50"/> Serie de Etiqueta: {selectedBatch.labelSerialNumber || 'S/N'}</div>
                      <div className="flex items-center text-sm text-gray-500 font-bold"><Building size={18} className="mr-3 opacity-50"/> Proveedor: {suppliers.find(s => s.id === selectedBatch.supplierId)?.name || 'Origen Desconocido'}</div>
                  </div>

                  <button onClick={() => setIsViewModalOpen(false)} className="mt-10 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Cerrar Ficha</button>
              </div>
          </div>
      )}
    </div>
  );
}
