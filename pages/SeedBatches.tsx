
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement } from '../types';
import { 
  ScanBarcode, Edit2, Trash2, Tag, Package, Truck, Printer, MapPin, 
  AlertCircle, DollarSign, ShoppingCart, Archive, Save, X, 
  Loader2, Search, Eye, Info, CheckCircle, Filter, FilterX, ArrowUpRight, ArrowDownLeft,
  Building
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import { useSearchParams } from 'react-router-dom';

const MetricCard = ({ label, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border dark:border-dark-border shadow-sm flex items-start space-x-4">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-${colorClass.split('-')[1]}-600`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white">{value}</p>
            {subtext && <p className="text-[10px] text-gray-400 mt-1 font-bold">{subtext}</p>}
        </div>
    </div>
);

export default function SeedBatches() {
  const { 
    seedBatches, seedMovements, addLocalSeedBatch, updateSeedBatch, 
    deleteSeedBatch, addSeedMovement, updateSeedMovement, deleteSeedMovement, varieties, 
    locations, currentUser, clients, storagePoints, isEmergencyMode 
  } = useAppContext();
  
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>((searchParams.get('tab') as any) || 'inventory');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dashboard & Filter States
  const [searchTerm, setSearchTerm] = useState(searchParams.get('variety') || '');
  const [filterVariety, setFilterVariety] = useState('');
  const [filterStorage, setFilterStorage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedBatchForView, setSelectedBatchForView] = useState<SeedBatch | null>(null);
  const [selectedMovementForView, setSelectedMovementForView] = useState<SeedMovement | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  const [batchFormData, setBatchFormData] = useState<Partial<SeedBatch>>({
    varietyId: '', batchCode: '', initialQuantity: 0, purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0, storagePointId: '', isActive: true,
    labelSerialNumber: '', category: 'C1', certificationNumber: '', gs1Code: '', analysisDate: '', germination: 90, purity: 99
  });

  const [moveFormData, setMoveFormData] = useState<Partial<SeedMovement>>({
    batchId: '', clientId: '', targetLocationId: '', quantity: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio',
    transportGuideNumber: '', driverName: '', vehiclePlate: '', transportCompany: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // --- LOGIC: FILTERED DATA ---

  // NUEVO: Solo variedades que tienen al menos un lote registrado
  const varietiesWithStock = useMemo(() => {
      const idsWithStock = new Set(seedBatches.map(b => b.varietyId));
      return varieties.filter(v => idsWithStock.has(v.id));
  }, [seedBatches, varieties]);

  const filteredBatches = useMemo(() => seedBatches.filter(b => {
      const v = varieties.find(v => v.id === b.varietyId);
      const matchesSearch = b.batchCode.toLowerCase().includes(searchTerm.toLowerCase()) || (v?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVariety = !filterVariety || b.varietyId === filterVariety;
      const matchesStorage = !filterStorage || b.storagePointId === filterStorage;
      return matchesSearch && matchesVariety && matchesStorage;
  }), [seedBatches, searchTerm, filterVariety, filterStorage, varieties]);

  const filteredMovements = useMemo(() => seedMovements.filter(m => {
      const b = seedBatches.find(batch => batch.id === m.batchId);
      const v = varieties.find(vari => vari.id === b?.varietyId);
      const c = clients.find(cli => cli.id === m.clientId);
      const term = searchTerm.toLowerCase();
      const matchesSearch = (v?.name || '').toLowerCase().includes(term) || (c?.name || '').toLowerCase().includes(term) || (m.transportGuideNumber || '').toLowerCase().includes(term);
      const matchesStatus = !filterStatus || m.status === filterStatus;
      return matchesSearch && matchesStatus;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [seedMovements, seedBatches, varieties, clients, searchTerm, filterStatus]);

  const stats = useMemo(() => {
      const totalKg = seedBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
      const totalValue = seedBatches.reduce((sum, b) => sum + ((b.remainingQuantity || 0) * (b.pricePerKg || 0)), 0);
      const lowStockCount = seedBatches.filter(b => b.remainingQuantity > 0 && b.remainingQuantity < 50).length;
      const activeTransits = seedMovements.filter(m => m.status === 'En Tránsito').length;
      return { totalKg, totalValue, lowStockCount, activeTransits };
  }, [seedBatches, seedMovements]);

  // --- ACTIONS ---

  const handleBatchSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!batchFormData.varietyId || !batchFormData.batchCode || batchFormData.initialQuantity! <= 0) return;
      setIsSubmitting(true);
      const payload = { 
          ...batchFormData, 
          id: editingBatchId || crypto.randomUUID(), 
          remainingQuantity: editingBatchId ? batchFormData.remainingQuantity : batchFormData.initialQuantity, 
          createdAt: new Date().toISOString() 
      } as SeedBatch;
      
      try {
          if (editingBatchId) updateSeedBatch(payload);
          else {
              if (!isEmergencyMode) await supabase.from('seed_batches').insert([payload]);
              addLocalSeedBatch(payload);
          }
          setIsBatchModalOpen(false);
      } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const batch = seedBatches.find(b => b.id === moveFormData.batchId);
      if (!batch || moveFormData.quantity! > batch.remainingQuantity) {
          alert("Stock insuficiente en el lote seleccionado.");
          return;
      }
      setIsSubmitting(true);
      const movePayload = { ...moveFormData, id: crypto.randomUUID(), status: 'En Tránsito' } as SeedMovement;
      try {
          const success = await addSeedMovement(movePayload);
          if (success) {
              updateSeedBatch({ ...batch, remainingQuantity: batch.remainingQuantity - moveFormData.quantity! });
              setIsMoveModalOpen(false);
          }
      } finally { setIsSubmitting(false); }
  };

  const handleReceiveShipment = (move: SeedMovement) => {
      if (window.confirm("¿Confirmar recepción física de este material en el destino?")) {
          updateSeedMovement({ ...move, status: 'Recibido' });
      }
  };

  const handleDeleteBatch = async (id: string, code: string) => {
      const hasMovements = seedMovements.some(m => m.batchId === id);
      if (hasMovements) {
          alert("No se puede eliminar este lote porque ya registra despachos. Primero anula los despachos asociados.");
          return;
      }
      if (window.confirm(`¿Seguro que deseas eliminar permanentemente el lote ${code}?`)) {
          await deleteSeedBatch(id);
      }
  };

  const handleDeleteMovement = async (id: string, guide: string) => {
      if (window.confirm(`¿Anular despacho ${guide}? El stock será devuelto automáticamente al lote master.`)) {
          await deleteSeedMovement(id);
      }
  };

  const clearFilters = () => {
      setSearchTerm('');
      setFilterVariety('');
      setFilterStorage('');
      setFilterStatus('');
  };

  const inputClass = "w-full border border-gray-300 dark:border-dark-border bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 p-2 rounded-lg focus:ring-2 focus:ring-hemp-500 outline-none transition-all";

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center">
                <Archive className="mr-3 text-hemp-600" size={32}/> Inventario & Logística
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Control de stock centralizado y trazabilidad de remitos.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button onClick={() => setIsMoveModalOpen(true)} className="flex-1 md:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center hover:bg-blue-700 transition shadow-lg font-bold text-sm">
                <ArrowUpRight size={18} className="mr-2" /> Despachar
              </button>
              <button onClick={() => { setEditingBatchId(null); setIsBatchModalOpen(true); }} className="flex-1 md:flex-none bg-hemp-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center hover:bg-hemp-700 transition shadow-lg font-bold text-sm">
                <ArrowDownLeft size={18} className="mr-2" /> Ingresar Lote
              </button>
          </div>
        )}
      </div>

      {/* DASHBOARD SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Stock Total" value={`${stats.totalKg.toLocaleString()} kg`} icon={Package} colorClass="bg-blue-500" />
          <MetricCard label="Valorización" value={`$${stats.totalValue.toLocaleString()}`} subtext="Costo estimado USD" icon={DollarSign} colorClass="bg-green-500" />
          <MetricCard label="Lotes Críticos" value={stats.lowStockCount} subtext="Menos de 50kg disp." icon={AlertCircle} colorClass="bg-amber-500" />
          <MetricCard label="En Tránsito" value={stats.activeTransits} subtext="Remitos pendientes de recepción" icon={Truck} colorClass="bg-purple-500" />
      </div>

      {/* TABS & FILTERS BAR */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border dark:border-dark-border p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex space-x-4 border-b dark:border-dark-border md:border-none w-full md:w-auto overflow-x-auto">
                  <button onClick={() => setActiveTab('inventory')} className={`${activeTab === 'inventory' ? 'border-hemp-600 text-hemp-700 dark:text-hemp-400 font-black' : 'border-transparent text-gray-400 font-bold'} pb-2 border-b-4 text-xs transition-all uppercase tracking-widest whitespace-nowrap`}>Stock Central</button>
                  <button onClick={() => setActiveTab('logistics')} className={`${activeTab === 'logistics' ? 'border-hemp-600 text-hemp-700 dark:text-hemp-400 font-black' : 'border-transparent text-gray-400 font-bold'} pb-2 border-b-4 text-xs transition-all uppercase tracking-widest whitespace-nowrap`}>Historial de Despachos</button>
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                      <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-2 border dark:border-dark-border bg-white dark:bg-slate-800 rounded-lg text-xs w-full md:w-48 focus:ring-2 focus:ring-hemp-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  
                  {activeTab === 'inventory' ? (
                      <>
                        <select className="px-3 py-2 border dark:border-dark-border bg-white dark:bg-slate-800 rounded-lg text-[10px] font-bold uppercase outline-none dark:text-gray-300" value={filterVariety} onChange={e => setFilterVariety(e.target.value)}>
                            <option value="">Genéticas en Stock</option>
                            {varietiesWithStock.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <select className="px-3 py-2 border dark:border-dark-border bg-white dark:bg-slate-800 rounded-lg text-[10px] font-bold uppercase outline-none dark:text-gray-300" value={filterStorage} onChange={e => setFilterStorage(e.target.value)}>
                            <option value="">Todos los Depósitos</option>
                            {storagePoints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </>
                  ) : (
                      <select className="px-3 py-2 border dark:border-dark-border bg-white dark:bg-slate-800 rounded-lg text-[10px] font-bold uppercase outline-none dark:text-gray-300" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                          <option value="">Todos los Estados</option>
                          <option value="En Tránsito">En Tránsito</option>
                          <option value="Recibido">Recibido</option>
                      </select>
                  )}
                  
                  <button onClick={clearFilters} className="p-2 text-gray-400 hover:text-red-500 transition" title="Limpiar Filtros"><FilterX size={18}/></button>
              </div>
          </div>
      </div>

      {/* CONTENT AREA */}
      {activeTab === 'inventory' ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border dark:border-dark-border overflow-hidden overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b dark:border-dark-border">
                      <tr>
                          <th className="px-6 py-4">Código Lote</th>
                          <th className="px-6 py-4">Genética</th>
                          <th className="px-6 py-4">Ubicación</th>
                          <th className="px-6 py-4 text-center">Disponible</th>
                          <th className="px-6 py-4 text-center">Valor Est.</th>
                          <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                      {filteredBatches.length === 0 ? (
                          <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic font-medium">No se encontraron lotes con los criterios actuales.</td></tr>
                      ) : filteredBatches.map(batch => {
                          const v = varieties.find(v => v.id === batch.varietyId);
                          const isLow = batch.remainingQuantity > 0 && batch.remainingQuantity < 50;
                          return (
                              <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                  <td className="px-6 py-4 font-black text-gray-800 dark:text-gray-200">
                                      <div className="flex items-center">
                                          <ScanBarcode size={14} className="mr-2 text-hemp-600 opacity-50"/>
                                          {batch.batchCode}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-hemp-800 dark:text-hemp-400">{v?.name || 'S/D'}</div>
                                      <div className="text-[10px] text-gray-400 uppercase font-black">{v?.usage || '-'}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="text-gray-600 dark:text-gray-400 font-medium flex items-center">
                                          <MapPin size={12} className="mr-1 text-blue-500"/>
                                          {storagePoints.find(s => s.id === batch.storagePointId)?.name || 'Central'}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`px-3 py-1 rounded-full font-black flex items-center justify-center w-fit mx-auto ${
                                          batch.remainingQuantity === 0 ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' :
                                          isLow ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                                          'bg-green-100 text-green-700'
                                      }`}>
                                          {batch.remainingQuantity.toLocaleString()} kg
                                          {isLow && <AlertCircle size={12} className="ml-1"/>}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-center font-mono font-bold text-gray-500">
                                      ${((batch.remainingQuantity || 0) * (batch.pricePerKg || 0)).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => setSelectedBatchForView(batch)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="Ver Ficha Técnica"><Eye size={18}/></button>
                                          {isAdmin && (
                                              <>
                                                  <button onClick={() => { setBatchFormData(batch); setEditingBatchId(batch.id); setIsBatchModalOpen(true); }} className="p-2 text-gray-400 hover:text-hemp-600 hover:bg-hemp-50 dark:hover:bg-hemp-900/20 rounded-lg transition"><Edit2 size={18}/></button>
                                                  <button onClick={() => handleDeleteBatch(batch.id, batch.batchCode)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><Trash2 size={18}/></button>
                                              </>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          )
                      })}
                  </tbody>
              </table>
          </div>
      ) : (
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border dark:border-dark-border overflow-hidden overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b dark:border-dark-border">
                      <tr>
                          <th className="px-6 py-4">Remito / Fecha</th>
                          <th className="px-6 py-4">Material & Cantidad</th>
                          <th className="px-6 py-4">Destinatario</th>
                          <th className="px-6 py-4 text-center">Estado</th>
                          <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                      {filteredMovements.length === 0 ? (
                          <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic font-medium">Sin registros de movimientos.</td></tr>
                      ) : filteredMovements.map(move => {
                          const b = seedBatches.find(batch => batch.id === move.batchId);
                          const v = varieties.find(vari => vari.id === b?.varietyId);
                          return (
                              <tr key={move.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                  <td className="px-6 py-4">
                                      <div className="font-black text-gray-800 dark:text-gray-200">{move.date}</div>
                                      <div className="text-[10px] text-blue-600 font-black uppercase tracking-tighter">Guía: {move.transportGuideNumber || 'S/N'}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-800 dark:text-gray-300">{v?.name || 'S/D'}</div>
                                      <div className="text-hemp-700 dark:text-hemp-400 font-black text-base">{move.quantity} <span className="text-xs">kg</span></div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-700 dark:text-gray-300 flex items-center">
                                          <Building size={12} className="mr-1 opacity-50"/>
                                          {clients.find(c => c.id === move.clientId)?.name || 'Externo'}
                                      </div>
                                      <div className="text-[10px] text-gray-400 flex items-center uppercase mt-0.5">
                                          <MapPin size={10} className="mr-1"/> 
                                          {locations.find(l => l.id === move.targetLocationId)?.name || 'Sin destino'}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center ${move.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 animate-pulse'}`}>
                                          {move.status === 'Recibido' ? <CheckCircle size={10} className="mr-1"/> : <Truck size={10} className="mr-1"/>}
                                          {move.status || 'En Tránsito'}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          {isAdmin && move.status === 'En Tránsito' && (
                                              <button onClick={() => handleReceiveShipment(move)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition" title="Confirmar Recepción"><CheckCircle size={18}/></button>
                                          )}
                                          <button onClick={() => setSelectedMovementForView(move)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition"><Eye size={18}/></button>
                                          {isAdmin && (
                                              <button onClick={() => handleDeleteMovement(move.id, move.transportGuideNumber || 'S/N')} className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition" title="Anular Remito"><Trash2 size={18}/></button>
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

      {/* --- MODALS --- */}
      
      {/* BATCH ENTRY MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-2xl w-full p-8 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-800 dark:text-white">{editingBatchId ? 'Editar Lote Master' : 'Nuevo Ingreso de Lote'}</h2>
                <button onClick={() => setIsBatchModalOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-dark-border rounded-full transition dark:text-gray-400"><X size={24}/></button>
            </div>
            <form onSubmit={handleBatchSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Variedad Genética *</label>
                        <select required className={inputClass} value={batchFormData.varietyId} onChange={e => setBatchFormData({...batchFormData, varietyId: e.target.value})}>
                            <option value="">Seleccionar genética autorizada...</option>
                            {varieties.map(v => <option key={v.id} value={v.id}>{v.name} ({v.usage})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Código de Lote Fiscal *</label>
                        <input required type="text" className={inputClass} placeholder="Ej: LOT-FR-2024" value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Punto de Almacenamiento *</label>
                        <select required className={inputClass} value={batchFormData.storagePointId} onChange={e => setBatchFormData({...batchFormData, storagePointId: e.target.value})}>
                            <option value="">Elegir depósito...</option>
                            {storagePoints.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                        </select>
                    </div>
                    
                    <div className="col-span-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex items-center text-blue-800 dark:text-blue-300 font-bold text-xs uppercase mb-2">
                            <Tag size={14} className="mr-1"/> Datos de Trazabilidad (Etiqueta INASE/EU)
                        </div>
                        <input type="text" placeholder="N° Serie Etiqueta" className={inputClass} value={batchFormData.labelSerialNumber} onChange={e => setBatchFormData({...batchFormData, labelSerialNumber: e.target.value})} />
                        <select className={inputClass} value={batchFormData.category} onChange={e => setBatchFormData({...batchFormData, category: e.target.value as any})}>
                            <option value="C1">Categoría C1</option><option value="C2">Categoría C2</option><option value="Base">Categoría Base</option><option value="Original">Categoría Original</option>
                        </select>
                        <input type="date" className={inputClass} title="Fecha de Análisis" value={batchFormData.analysisDate} onChange={e => setBatchFormData({...batchFormData, analysisDate: e.target.value})} />
                        <div className="flex space-x-2">
                            <input type="number" placeholder="PG%" className={inputClass} value={batchFormData.germination} onChange={e => setBatchFormData({...batchFormData, germination: Number(e.target.value)})} />
                            <input type="number" placeholder="Pureza%" className={inputClass} value={batchFormData.purity} onChange={e => setBatchFormData({...batchFormData, purity: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cantidad Inicial (kg) *</label>
                        <input required type="number" step="0.1" className={`${inputClass} font-black text-lg`} value={batchFormData.initialQuantity} onChange={e => setBatchFormData({...batchFormData, initialQuantity: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Costo Unitario (USD/kg)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                            <input type="number" step="0.01" className={`${inputClass} pl-9`} value={batchFormData.pricePerKg} onChange={e => setBatchFormData({...batchFormData, pricePerKg: Number(e.target.value)})} />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t dark:border-dark-border mt-8">
                    <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-10 py-2.5 bg-hemp-600 text-white rounded-xl font-black shadow-lg shadow-hemp-900/20 hover:bg-hemp-700 transition flex items-center">
                        {isSubmitting && <Loader2 className="animate-spin mr-2" size={18}/>}
                        Confirmar Ingreso
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH MODAL */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-2xl w-full p-8 overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-800 dark:text-white flex items-center">
                    <Truck size={32} className="mr-3 text-blue-600"/> 
                    Registrar Despacho de Material
                </h2>
                <button onClick={() => setIsMoveModalOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-dark-border rounded-full transition dark:text-gray-400"><X size={24}/></button>
            </div>
            <form onSubmit={handleMoveSubmit} className="space-y-6">
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Lote Origen de Stock</label>
                    <select required className={inputClass} value={moveFormData.batchId} onChange={e => setMoveFormData({...moveFormData, batchId: e.target.value})}>
                        <option value="">Seleccionar lote master disponible...</option>
                        {seedBatches.filter(b => b.remainingQuantity > 0).map(b => (
                            <option key={b.id} value={b.id}>
                                [{varieties.find(v => v.id === b.varietyId)?.name}] Lote: {b.batchCode} ({b.remainingQuantity}kg disponibles)
                            </option>
                        ))}
                    </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cliente Receptor</label>
                        <select required className={inputClass} value={moveFormData.clientId} onChange={e => setMoveFormData({...moveFormData, clientId: e.target.value, targetLocationId: ''})}>
                            <option value="">Seleccionar titular...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Campo / Sitio de Destino</label>
                        <select required className={inputClass} value={moveFormData.targetLocationId} onChange={e => setMoveFormData({...moveFormData, targetLocationId: e.target.value})} disabled={!moveFormData.clientId}>
                            <option value="">Elegir establecimiento...</option>
                            {locations.filter(l => l.clientId === moveFormData.clientId).map(l => (
                                <option key={l.id} value={l.id}>{l.name} ({l.province})</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cantidad a Despachar (kg) *</label>
                        <input required type="number" step="0.1" className={`${inputClass} font-black text-xl text-blue-600 dark:text-blue-400`} placeholder="0.0" value={moveFormData.quantity || ''} onChange={e => setMoveFormData({...moveFormData, quantity: Number(e.target.value)})} />
                    </div>
                    
                    <div className="col-span-2 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl border dark:border-dark-border border-gray-200 grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex items-center text-gray-500 font-bold text-xs uppercase mb-2">
                            <Info size={14} className="mr-1"/> Datos Logísticos
                        </div>
                        <input type="text" placeholder="N° Guía de Transporte / Remito" className={inputClass} value={moveFormData.transportGuideNumber} onChange={e => setMoveFormData({...moveFormData, transportGuideNumber: e.target.value})} />
                        <input type="text" placeholder="Nombre Chofer / Responsable" className={inputClass} value={moveFormData.driverName} onChange={e => setMoveFormData({...moveFormData, driverName: e.target.value})} />
                        <input type="text" placeholder="Patente Vehículo" className={inputClass} value={moveFormData.vehiclePlate} onChange={e => setMoveFormData({...moveFormData, vehiclePlate: e.target.value})} />
                        <input type="text" placeholder="Empresa Transporte" className={inputClass} value={moveFormData.transportCompany} onChange={e => setMoveFormData({...moveFormData, transportCompany: e.target.value})} />
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t dark:border-dark-border mt-8">
                    <button type="button" onClick={() => setIsMoveModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-10 py-2.5 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition flex items-center">
                        {isSubmitting && <Loader2 className="animate-spin mr-2" size={18}/>}
                        Generar Remito de Salida
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
