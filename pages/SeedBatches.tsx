
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement } from '../types';
import { 
  ScanBarcode, Edit2, Trash2, Tag, Package, Truck, Printer, MapPin, 
  AlertCircle, DollarSign, Archive, Save, X, 
  Loader2, Search, Eye, Info, CheckCircle, Filter, FilterX, ArrowUpRight,
  Building, User, Calendar, FileText, Globe, ClipboardList, ShieldCheck, Warehouse,
  Plus, CheckCircle2, Navigation, Smartphone, UserCheck, Barcode, FlaskConical, Scale, ClipboardCheck,
  Map as MapIcon, Route, Compass
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

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

  const [batchFormData, setBatchFormData] = useState<Partial<SeedBatch>>({
    varietyId: '', supplierId: '', batchCode: '', initialQuantity: 0, purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0, storagePointId: '', isActive: true,
    labelSerialNumber: '', category: 'C1', certificationNumber: '', gs1Code: '', analysisDate: '', germination: 90, purity: 99, notes: ''
  });

  const [moveFormData, setMoveFormData] = useState<Partial<SeedMovement>>({
    batchId: '', clientId: '', targetLocationId: '', quantity: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio',
    transportGuideNumber: '', driverName: '', driverDni: '', vehiclePlate: '', transportCompany: '', recipientName: '', recipientDni: '',
    routeItinerary: '', estimatedDistanceKm: 0, routeGoogleLink: '', dispatchTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isClient = currentUser?.role === 'client';

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

  // Remitos visibles
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

  const handleOpenView = (batch: SeedBatch) => {
      setSelectedBatch(batch);
      setIsViewModalOpen(true);
  };

  const handleOpenDispatch = (batchId?: string) => {
      setMoveFormData({
          batchId: batchId || '', clientId: '', targetLocationId: '', quantity: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio',
          transportGuideNumber: '', driverName: '', driverDni: '', vehiclePlate: '', transportCompany: '', recipientName: '', recipientDni: '',
          routeItinerary: '', estimatedDistanceKm: 0, routeGoogleLink: '', dispatchTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      });
      setIsMoveModalOpen(true);
  };

  const handleConfirmReceipt = async (move: SeedMovement) => {
      if (isSubmitting) return;
      
      if (!window.confirm(`¿Confirma la recepción física de ${move.quantity} kg?\n\nEste material se sumará al inventario del almacén: ${storagePoints.find(s => s.id === move.targetLocationId)?.name || 'DESCONOCIDO'}.`)) return;
      
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
                      storagePointId: move.targetLocationId, // El almacén destino elegido en el despacho
                      notes: `Recibido mediante remito ${move.transportGuideNumber}. Itinerario: ${move.routeItinerary || 'N/D'}.`,
                      createdAt: new Date().toISOString(),
                      isActive: true
                  };
                  await addSeedBatch(localBatchPayload);
                  alert("✅ Recepción confirmada. Stock actualizado en el almacén de destino.");
              }
          }
      } finally { setIsSubmitting(false); }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!batchFormData.varietyId || !batchFormData.batchCode || batchFormData.initialQuantity! <= 0 || isSubmitting) return;
      setIsSubmitting(true);
      try {
          const payload = { 
            ...batchFormData, 
            id: editingBatchId || crypto.randomUUID(), 
            remainingQuantity: editingBatchId ? batchFormData.remainingQuantity : Number(batchFormData.initialQuantity), 
            initialQuantity: Number(batchFormData.initialQuantity), 
            pricePerKg: Number(batchFormData.pricePerKg), 
            isActive: true, 
            createdAt: batchFormData.createdAt || new Date().toISOString() 
          } as SeedBatch;
          // Fix: Changed editingId to editingBatchId as editingId was not defined in this scope
          let success = editingBatchId ? await updateSeedBatch(payload) : await addSeedBatch(payload);
          if (success) { setIsBatchModalOpen(false); setEditingBatchId(null); }
      } finally { setIsSubmitting(false); }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const batch = seedBatches.find(b => b.id === moveFormData.batchId);
      if (!batch || moveFormData.quantity! > batch.remainingQuantity) {
          alert("Error: Stock insuficiente en origen.");
          return;
      }
      if (!moveFormData.targetLocationId) {
          alert("Debe seleccionar un Nodo Logístico (Almacén) de destino.");
          return;
      }

      setIsSubmitting(true);
      try {
          const movePayload = { 
              ...moveFormData, 
              id: crypto.randomUUID(), 
              status: 'En Tránsito', 
              quantity: Number(moveFormData.quantity),
              originStorageId: batch.storagePointId
          } as SeedMovement;
          
          const success = await addSeedMovement(movePayload);
          if (success) {
              await updateSeedBatch({ ...batch, remainingQuantity: batch.remainingQuantity - Number(moveFormData.quantity) });
              setIsMoveModalOpen(false);
          }
      } finally { setIsSubmitting(false); }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all";
  const labelClass = "text-[9px] font-black uppercase text-slate-500 ml-1 mb-1 block tracking-widest";

  // Almacenes filtrados para el socio seleccionado en el despacho
  const destinationStorages = useMemo(() => {
      if (!moveFormData.clientId) return [];
      return storagePoints.filter(sp => sp.clientId === moveFormData.clientId);
  }, [moveFormData.clientId, storagePoints]);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">Inventario <span className="text-hemp-600">& Logística</span></h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Trazabilidad industrial de remitos y stock.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button onClick={() => handleOpenDispatch()} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-blue-700 transition shadow-xl font-black text-xs uppercase tracking-widest"><ArrowUpRight size={18} className="mr-2" /> Generar Despacho</button>
              <button onClick={() => { setEditingBatchId(null); setIsBatchModalOpen(true); }} className="flex-1 md:flex-none bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest"><Plus size={18} className="mr-2" /> Ingresar Lote</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard label="Stock en Red" value={`${stats.totalKg.toLocaleString()} kg`} icon={Package} colorClass="bg-blue-500" />
          <MetricCard label="Nodos Activos" value={storagePoints.length} icon={Warehouse} colorClass="bg-hemp-500" />
          <MetricCard label="Movimientos" value={stats.activeTransits} icon={Truck} colorClass="bg-purple-500" subtext="Cargas en tránsito" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex space-x-2 bg-gray-100 dark:bg-slate-950 p-1 rounded-2xl w-full md:w-auto">
                  <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-800 text-hemp-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Stock Asignado</button>
                  <button onClick={() => setActiveTab('logistics')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logistics' ? 'bg-white dark:bg-slate-800 text-hemp-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Bitácora Remitos</button>
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
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredBatches.length === 0 ? (
                          <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic">No hay stock disponible para los filtros aplicados.</td></tr>
                      ) : filteredBatches.map(batch => {
                          const v = varieties.find(v => v.id === batch.varietyId);
                          const sp = storagePoints.find(s => s.id === batch.storagePointId);
                          return (
                              <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                  <td className="px-8 py-5">
                                      <div className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-tighter">{batch.batchCode}</div>
                                      <div className="text-[9px] text-hemp-600 font-bold uppercase">{v?.name || 'N/A'}</div>
                                  </td>
                                  <td className="px-8 py-5">
                                      <div className="font-bold text-slate-800 dark:text-slate-200 uppercase">{sp?.name || 'CENTRAL'}</div>
                                      <div className="text-[9px] text-gray-400 uppercase font-black">{sp?.city || '-'}</div>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                      <span className={`px-4 py-1.5 rounded-full font-black text-xs ${batch.remainingQuantity === 0 ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700'}`}>{batch.remainingQuantity.toLocaleString()} kg</span>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => handleOpenView(batch)} title="Auditoría" className="p-2 text-gray-400 hover:text-blue-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition"><Eye size={16}/></button>
                                          {isAdmin && <button onClick={() => { setBatchFormData(batch); setEditingBatchId(batch.id); setIsBatchModalOpen(true); }} className="p-2 text-gray-400 hover:text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition"><Edit2 size={16}/></button>}
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
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredMovements.length === 0 ? (
                           <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic">Sin movimientos registrados.</td></tr>
                      ) : filteredMovements.map(move => {
                          const targetStorage = storagePoints.find(s => s.id === move.targetLocationId);
                          const canConfirm = isAdmin || (isClient && move.clientId === currentUser?.clientId);
                          
                          return (
                              <tr key={move.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-8 py-5">
                                      <div className="font-black text-gray-800 dark:text-gray-200">Guía: {move.transportGuideNumber || 'S/N'}</div>
                                      <div className="text-[9px] text-gray-400 font-bold uppercase">{move.driverName || 'S/D'} ({move.vehiclePlate || 'S/P'})</div>
                                  </td>
                                  <td className="px-8 py-5">
                                      <div className="font-bold text-slate-800 dark:text-slate-200 uppercase">{targetStorage?.name || 'S/D'}</div>
                                      <div className="text-[9px] text-gray-400 uppercase">{targetStorage?.city}</div>
                                  </td>
                                  <td className="px-8 py-5 text-center font-black text-hemp-700">{move.quantity} kg</td>
                                  <td className="px-8 py-5 text-right">
                                      <div className="flex items-center justify-end space-x-2">
                                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm ${move.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 animate-pulse'}`}>
                                            {move.status}
                                          </span>
                                          {move.status !== 'Recibido' && canConfirm && (
                                              <button 
                                                onClick={() => handleConfirmReceipt(move)}
                                                disabled={isSubmitting}
                                                className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition shadow-md disabled:opacity-50"
                                                title="Confirmar Recepción de Material"
                                              >
                                                  <ClipboardCheck size={16}/>
                                              </button>
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

      {/* MODAL DESPACHO AVANZADO (HOJA DE RUTA) */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-6xl w-full p-10 shadow-2xl my-auto animate-in zoom-in-95 border border-white/10">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl"><Truck size={28}/></div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Despacho & <span className="text-blue-600">Hoja de Ruta</span></h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocolo de logística industrial y trazabilidad de carga</p>
                        </div>
                    </div>
                    <button onClick={() => setIsMoveModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={32}/></button>
                </div>
                
                <form onSubmit={handleMoveSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* SECCIÓN 1: CARGA Y ORIGEN */}
                        <div className="space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b dark:border-slate-800 pb-2 flex items-center"><Archive size={14} className="mr-2"/> Carga y Origen</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Lote de Semilla (Stock) *</label>
                                        <select required className={inputClass} value={moveFormData.batchId} onChange={e => setMoveFormData({...moveFormData, batchId: e.target.value})}>
                                            <option value="">Seleccionar lote...</option>
                                            {seedBatches.filter(b => b.remainingQuantity > 0).map(b => (
                                                <option key={b.id} value={b.id}>{b.batchCode} ({b.remainingQuantity} kg disp.)</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Cantidad a Despachar (kg) *</label>
                                        <input required type="number" className={`${inputClass} text-xl font-black`} value={moveFormData.quantity} onChange={e => setMoveFormData({...moveFormData, quantity: Number(e.target.value)})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className={labelClass}>Fecha Despacho</label>
                                            <input type="date" className={inputClass} value={moveFormData.date} onChange={e => setMoveFormData({...moveFormData, date: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Hora Salida</label>
                                            <input type="time" className={inputClass} value={moveFormData.dispatchTime} onChange={e => setMoveFormData({...moveFormData, dispatchTime: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                                <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-6 flex items-center"><UserCheck size={14} className="mr-2"/> Receptor Final</h3>
                                <div className="space-y-4">
                                    <input required type="text" placeholder="Nombre del Receptor" className={inputClass} value={moveFormData.recipientName} onChange={e => setMoveFormData({...moveFormData, recipientName: e.target.value})} />
                                    <input required type="text" placeholder="DNI del Receptor" className={inputClass} value={moveFormData.recipientDni} onChange={e => setMoveFormData({...moveFormData, recipientDni: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: DESTINO Y NODO LOGÍSTICO */}
                        <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                                <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-6 border-b border-blue-100 dark:border-blue-900/30 pb-2 flex items-center"><Building size={14} className="mr-2"/> Destino de Carga</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Socio de Red *</label>
                                        <select required className={inputClass} value={moveFormData.clientId} onChange={e => setMoveFormData({...moveFormData, clientId: e.target.value, targetLocationId: ''})}>
                                            <option value="">Seleccionar socio...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Nodo Logístico (Almacén) Destino *</label>
                                        <select required className={inputClass} value={moveFormData.targetLocationId} onChange={e => setMoveFormData({...moveFormData, targetLocationId: e.target.value})} disabled={!moveFormData.clientId}>
                                            <option value="">-- Seleccionar Almacén --</option>
                                            {destinationStorages.map(sp => (
                                                <option key={sp.id} value={sp.id}>{sp.name} ({sp.city})</option>
                                            ))}
                                        </select>
                                        {!moveFormData.clientId && <p className="text-[8px] text-blue-400 mt-2 font-black uppercase italic">Seleccione primero un socio.</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><Route size={14} className="mr-2"/> Itinerario de Ruta</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Ruta de Viaje (Detalle)</label>
                                        <textarea className={`${inputClass} h-20 text-xs`} placeholder="Ej: Ruta 3 hasta Azul, luego Ruta 226 hacia Tandil..." value={moveFormData.routeItinerary} onChange={e => setMoveFormData({...moveFormData, routeItinerary: e.target.value})}></textarea>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className={labelClass}>Distancia (km)</label>
                                            <input type="number" className={inputClass} value={moveFormData.estimatedDistanceKm} onChange={e => setMoveFormData({...moveFormData, estimatedDistanceKm: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Guía / Remito Nº</label>
                                            <input required type="text" className={`${inputClass} font-mono`} value={moveFormData.transportGuideNumber} onChange={e => setMoveFormData({...moveFormData, transportGuideNumber: e.target.value})} placeholder="TRK-0000" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 3: TRANSPORTE Y UNIDAD */}
                        <div className="space-y-6">
                            <div className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-[32px] border border-purple-100 dark:border-purple-900/30">
                                <h3 className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest mb-6 border-b border-purple-100 dark:border-purple-900/30 pb-2 flex items-center"><Navigation size={14} className="mr-2"/> Unidad de Transporte</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setMoveFormData({...moveFormData, transportType: 'Propio'})} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${moveFormData.transportType === 'Propio' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-purple-400 border-purple-100'}`}>Propio</button>
                                        <button type="button" onClick={() => setMoveFormData({...moveFormData, transportType: 'Tercerizado'})} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${moveFormData.transportType === 'Tercerizado' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-purple-400 border-purple-100'}`}>Flete / Tercero</button>
                                    </div>
                                    
                                    <div>
                                        <label className={labelClass}>Patente Unidad *</label>
                                        <input required type="text" className={`${inputClass} font-mono uppercase`} value={moveFormData.vehiclePlate} onChange={e => setMoveFormData({...moveFormData, vehiclePlate: e.target.value})} placeholder="AAA-000-XX" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input required type="text" placeholder="Nombre Chofer" className={inputClass} value={moveFormData.driverName} onChange={e => setMoveFormData({...moveFormData, driverName: e.target.value})} />
                                        <input required type="text" placeholder="DNI Chofer" className={inputClass} value={moveFormData.driverDni} onChange={e => setMoveFormData({...moveFormData, driverDni: e.target.value})} />
                                    </div>
                                    <input type="text" placeholder="Empresa de Transporte" className={inputClass} value={moveFormData.transportCompany} onChange={e => setMoveFormData({...moveFormData, transportCompany: e.target.value})} />
                                    
                                    <div className="pt-2">
                                        <label className={labelClass}>Google Maps Route Link</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                                            <input type="text" className={`${inputClass} pl-9 text-xs`} value={moveFormData.routeGoogleLink} onChange={e => setMoveFormData({...moveFormData, routeGoogleLink: e.target.value})} placeholder="https://maps.app.goo.gl/..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 dark:bg-blue-600 text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center hover:scale-[1.01] transition-all disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <ArrowUpRight className="mr-2"/>}
                        Emitir Remito Industrial & Hoja de Ruta
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL VISUALIZAR LOTE (Mismo que antes) */}
      {isViewModalOpen && selectedBatch && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 border border-white/10">
                  <div className="p-8 border-b dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Info size={20}/></div>
                          <div>
                              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Ficha Técnica <span className="text-blue-600">Auditoría</span></h2>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trazabilidad Fiscal Industrial</p>
                          </div>
                      </div>
                      <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={24}/></button>
                  </div>
                  
                  <div className="p-10 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                              <div>
                                  <label className={labelClass}>Lote Maestro</label>
                                  <div className="text-2xl font-black text-slate-800 dark:text-white font-mono tracking-tighter uppercase">{selectedBatch.batchCode}</div>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border dark:border-slate-800">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><Barcode size={10} className="mr-1.5"/> Marcación Fiscal</p>
                                  <div className="space-y-2">
                                      <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                                          <span className="text-slate-400">Nro Serie:</span>
                                          <span className="text-slate-800 dark:text-slate-200 font-mono">{selectedBatch.labelSerialNumber || '---'}</span>
                                      </div>
                                      <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                                          <span className="text-slate-400">Certificación:</span>
                                          <span className="text-slate-800 dark:text-slate-200 font-mono">{selectedBatch.certificationNumber || '---'}</span>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-3xl border border-green-100 dark:border-green-900/30 text-center">
                                      <p className="text-[8px] font-black text-green-600 uppercase tracking-widest mb-1">Pureza</p>
                                      <p className="text-xl font-black text-green-700 dark:text-green-400">{selectedBatch.purity || '0'}%</p>
                                  </div>
                                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-3xl border border-blue-100 dark:border-blue-900/30 text-center">
                                      <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1">Poder Germ.</p>
                                      <p className="text-xl font-black text-blue-700 dark:text-blue-400">{selectedBatch.germination || '0'}%</p>
                                  </div>
                              </div>
                              <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-3xl border border-amber-100 dark:border-amber-900/30 text-center">
                                  <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Disponible</p>
                                  <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{selectedBatch.remainingQuantity.toLocaleString()} kg</p>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border dark:border-slate-800">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><Warehouse size={14} className="text-hemp-600 mr-2"/> Ubicación Geográfica</h3>
                          <div className="flex items-center justify-between">
                              <div>
                                  <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">
                                      {storagePoints.find(sp => sp.id === selectedBatch.storagePointId)?.name || 'ALMACÉN CENTRAL'}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase">{storagePoints.find(sp => sp.id === selectedBatch.storagePointId)?.city || 'Ubicación S/D'}</p>
                              </div>
                              <button onClick={() => window.print()} className="bg-white dark:bg-slate-800 p-3 rounded-2xl text-slate-400 hover:text-hemp-600 transition shadow-sm border dark:border-slate-700">
                                  <Printer size={20}/>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL INGRESO LOTE (Mismo que antes) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-5xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 border border-white/10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Archive size={24}/></div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Ingresar <span className="text-hemp-600">Lote Industrial</span></h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trazabilidad desde etiqueta fiscal / proveedor</p>
                    </div>
                </div>
                <button onClick={() => setIsBatchModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleBatchSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* ORIGEN Y GENÉTICA */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800 space-y-4">
                        <h3 className="text-[10px] font-black text-hemp-600 uppercase tracking-widest mb-4 flex items-center"><Building size={14} className="mr-2"/> Origen del Material</h3>
                        <div>
                            <label className={labelClass}>Proveedor Autorizado *</label>
                            <select required className={inputClass} value={batchFormData.supplierId} onChange={e => setBatchFormData({...batchFormData, supplierId: e.target.value})}>
                                <option value="">Seleccionar proveedor...</option>
                                {suppliers.filter(s => s.category === 'Semillas').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Variedad Genética *</label>
                            <select required className={inputClass} value={batchFormData.varietyId} onChange={e => setBatchFormData({...batchFormData, varietyId: e.target.value})}>
                                <option value="">Seleccionar genética...</option>
                                {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Código de Lote *</label>
                            <input required type="text" className={`${inputClass} font-mono uppercase`} value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value})} placeholder="EJ: LOTE-2024-X" />
                        </div>
                    </div>

                    {/* DATOS DE ETIQUETA */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30 space-y-4">
                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center"><ScanBarcode size={14} className="mr-2"/> Especificaciones Fiscales</h3>
                        <div>
                            <label className={labelClass}>Nro Serie Etiqueta</label>
                            <input type="text" className={inputClass} value={batchFormData.labelSerialNumber} onChange={e => setBatchFormData({...batchFormData, labelSerialNumber: e.target.value})} placeholder="Serie de etiqueta adherida" />
                        </div>
                        <div>
                            <label className={labelClass}>Nro Certificación / Acta</label>
                            <input type="text" className={inputClass} value={batchFormData.certificationNumber} onChange={e => setBatchFormData({...batchFormData, certificationNumber: e.target.value})} placeholder="Certificado INASE / SENASA" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Germinación (%)</label>
                                <input type="number" className={inputClass} value={batchFormData.germination} onChange={e => setBatchFormData({...batchFormData, germination: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className={labelClass}>Pureza (%)</label>
                                <input type="number" className={inputClass} value={batchFormData.purity} onChange={e => setBatchFormData({...batchFormData, purity: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>

                    {/* LOGÍSTICA DE INGRESO */}
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 space-y-4">
                        <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center"><Warehouse size={14} className="mr-2"/> Recepción y Stock</h3>
                        <div>
                            <label className={labelClass}>Punto de Acopio *</label>
                            <select required className={inputClass} value={batchFormData.storagePointId} onChange={e => setBatchFormData({...batchFormData, storagePointId: e.target.value})}>
                                <option value="">Seleccionar depósito...</option>
                                {storagePoints.map(sp => <option key={sp.id} value={sp.id}>{sp.name} ({sp.nodeCode})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Cantidad Inicial (kg) *</label>
                            <input required type="number" className={`${inputClass} text-xl font-black`} value={batchFormData.initialQuantity} onChange={e => setBatchFormData({...batchFormData, initialQuantity: Number(e.target.value)})} />
                        </div>
                    </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center hover:scale-[1.01] transition-all disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                    {editingBatchId ? 'Actualizar Lote' : 'Finalizar Registro'}
                </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
