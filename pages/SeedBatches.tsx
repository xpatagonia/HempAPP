
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement } from '../types';
import { 
  ScanBarcode, Edit2, Trash2, Tag, Package, Truck, Printer, MapPin, 
  AlertCircle, DollarSign, ShoppingCart, Archive, Save, X, 
  Loader2, Search, Eye, Info, CheckCircle, Filter, FilterX, ArrowUpRight, ArrowDownLeft,
  Building, User, Calendar, FileText, Globe, ClipboardList, ShieldCheck, Warehouse,
  FlaskConical, RefreshCw, Plus
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
    deleteSeedBatch, addSeedMovement, updateSeedMovement, deleteSeedMovement, varieties, 
    locations, currentUser, clients, storagePoints, suppliers 
  } = useAppContext();
  
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>((searchParams.get('tab') as any) || 'inventory');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('variety') || '');
  const [filterVariety, setFilterVariety] = useState('');
  const [filterStorage, setFilterStorage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  const [batchFormData, setBatchFormData] = useState<Partial<SeedBatch>>({
    varietyId: '', supplierId: '', batchCode: '', initialQuantity: 0, purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0, storagePointId: '', isActive: true,
    labelSerialNumber: '', category: 'C1', certificationNumber: '', gs1Code: '', analysisDate: '', germination: 90, purity: 99, notes: ''
  });

  const [moveFormData, setMoveFormData] = useState<Partial<SeedMovement>>({
    batchId: '', clientId: '', targetLocationId: '', quantity: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio',
    transportGuideNumber: '', driverName: '', vehiclePlate: '', transportCompany: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isClient = currentUser?.role === 'client';

  // --- FILTRADO DE SEGURIDAD POR ROL ---
  const filteredBatches = useMemo(() => seedBatches.filter(b => {
      const v = varieties.find(v => v.id === b.varietyId);
      const sp = storagePoints.find(s => s.id === b.storagePointId);
      
      // Si es cliente, solo ve lotes en sus propios depósitos
      if (isClient && currentUser?.clientId) {
          if (sp?.clientId !== currentUser.clientId) return false;
      }

      const matchesSearch = b.batchCode.toLowerCase().includes(searchTerm.toLowerCase()) || (v?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVariety = !filterVariety || b.varietyId === filterVariety;
      const matchesStorage = !filterStorage || b.storagePointId === filterStorage;
      return matchesSearch && matchesVariety && matchesStorage;
  }), [seedBatches, searchTerm, filterVariety, filterStorage, varieties, isClient, currentUser, storagePoints]);

  const filteredMovements = useMemo(() => seedMovements.filter(m => {
      const b = seedBatches.find(batch => batch.id === m.batchId);
      const v = varieties.find(vari => vari.id === b?.varietyId);
      const c = clients.find(cli => cli.id === m.clientId);

      // Si es cliente, solo ve movimientos que le pertenecen
      if (isClient && currentUser?.clientId) {
          if (m.clientId !== currentUser.clientId) return false;
      }

      const term = searchTerm.toLowerCase();
      const matchesSearch = (v?.name || '').toLowerCase().includes(term) || (c?.name || '').toLowerCase().includes(term) || (m.transportGuideNumber || '').toLowerCase().includes(term);
      const matchesStatus = !filterStatus || m.status === filterStatus;
      return matchesSearch && matchesStatus;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [seedMovements, seedBatches, varieties, clients, searchTerm, filterStatus, isClient, currentUser]);

  const stats = useMemo(() => {
      const totalKg = filteredBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
      const totalValue = filteredBatches.reduce((sum, b) => sum + ((b.remainingQuantity || 0) * (b.pricePerKg || 0)), 0);
      const lowStockCount = filteredBatches.filter(b => b.remainingQuantity > 0 && b.remainingQuantity < 50).length;
      const activeTransits = filteredMovements.filter(m => m.status === 'En Tránsito').length;
      return { totalKg, totalValue, lowStockCount, activeTransits };
  }, [filteredBatches, filteredMovements]);

  const handleOpenDispatch = (batchId?: string) => {
      setMoveFormData({
          batchId: batchId || '', clientId: '', targetLocationId: '', quantity: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio', transportGuideNumber: '', driverName: '', vehiclePlate: '', transportCompany: ''
      });
      setIsMoveModalOpen(true);
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!batchFormData.varietyId || !batchFormData.batchCode || batchFormData.initialQuantity! <= 0 || isSubmitting) return;
      setIsSubmitting(true);
      try {
          const payload = { ...batchFormData, id: editingBatchId || crypto.randomUUID(), remainingQuantity: editingBatchId ? batchFormData.remainingQuantity : batchFormData.initialQuantity, initialQuantity: Number(batchFormData.initialQuantity), pricePerKg: Number(batchFormData.pricePerKg), purity: Number(batchFormData.purity), germination: Number(batchFormData.germination), isActive: true, createdAt: batchFormData.createdAt || new Date().toISOString() } as SeedBatch;
          let success = false;
          if (editingBatchId) success = await updateSeedBatch(payload);
          else success = await addSeedBatch(payload);
          if (success) { setIsBatchModalOpen(false); setEditingBatchId(null); }
      } catch (err: any) { alert("Fallo en el registro."); } finally { setIsSubmitting(false); }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const batch = seedBatches.find(b => b.id === moveFormData.batchId);
      if (!batch || moveFormData.quantity! > batch.remainingQuantity) {
          alert("Error: Stock insuficiente en el lote de origen.");
          return;
      }
      setIsSubmitting(true);
      try {
          const movePayload = { ...moveFormData, id: crypto.randomUUID(), status: 'En Tránsito', quantity: Number(moveFormData.quantity) } as SeedMovement;
          const success = await addSeedMovement(movePayload);
          if (success) {
              await updateSeedBatch({ ...batch, remainingQuantity: batch.remainingQuantity - Number(moveFormData.quantity) });
              setIsMoveModalOpen(false);
          }
      } catch (err) { alert("No se pudo procesar el despacho."); } finally { setIsSubmitting(false); }
  };

  const clearFilters = () => { setSearchTerm(''); setFilterVariety(''); setFilterStorage(''); setFilterStatus(''); };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all";

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">Inventario <span className="text-hemp-600">& Logística</span></h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Control de stock y trazabilidad de remitos industriales.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button onClick={() => handleOpenDispatch()} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-blue-700 transition shadow-xl font-black text-xs uppercase tracking-widest"><ArrowUpRight size={18} className="mr-2" /> Despachar</button>
              <button onClick={() => { setEditingBatchId(null); setBatchFormData({ varietyId: '', batchCode: '', initialQuantity: 0, purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0, storagePointId: '', isActive: true }); setIsBatchModalOpen(true); }} className="flex-1 md:flex-none bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest"><Plus size={18} className="mr-2" /> Ingresar Lote</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Stock Disponible" value={`${stats.totalKg.toLocaleString()} kg`} icon={Package} colorClass="bg-blue-500" />
          <MetricCard label="Valor en Suelo" value={`$${stats.totalValue.toLocaleString()}`} subtext="Estimado según costo" icon={DollarSign} colorClass="bg-green-500" />
          <MetricCard label="Lotes Críticos" value={stats.lowStockCount} subtext="Niveles bajos detectados" icon={AlertCircle} colorClass="bg-amber-500" />
          <MetricCard label="En Tránsito" value={stats.activeTransits} subtext="Remitos pendientes" icon={Truck} colorClass="bg-purple-500" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex space-x-2 bg-gray-100 dark:bg-slate-950 p-1 rounded-2xl w-full md:w-auto">
                  <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-800 text-hemp-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Stock Asignado</button>
                  <button onClick={() => setActiveTab('logistics')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logistics' ? 'bg-white dark:bg-slate-800 text-hemp-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Mis Remitos</button>
              </div>
              <div className="flex gap-2 w-full md:w-auto justify-end">
                  <div className="relative flex-1 md:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                      <input type="text" placeholder="Buscar código..." className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border-none rounded-xl text-xs w-full md:w-48 focus:ring-2 focus:ring-hemp-500 outline-none dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <button onClick={clearFilters} className="p-2 text-gray-400 hover:text-red-500 transition"><FilterX size={18}/></button>
              </div>
          </div>
      </div>

      {activeTab === 'inventory' ? (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
                      <tr>
                          <th className="px-8 py-5">Código de Lote</th>
                          <th className="px-8 py-5">Genética</th>
                          <th className="px-8 py-5">Ubicación / Almacén</th>
                          <th className="px-8 py-5 text-center">Disponible</th>
                          {isAdmin && <th className="px-8 py-5 text-right">Acciones</th>}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredBatches.length === 0 ? (
                          <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic font-medium">No hay material asignado a su organización.</td></tr>
                      ) : filteredBatches.map(batch => {
                          const v = varieties.find(v => v.id === batch.varietyId);
                          const sp = storagePoints.find(s => s.id === batch.storagePointId);
                          return (
                              <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                  <td className="px-8 py-5 font-black text-gray-800 dark:text-gray-200">{batch.batchCode}</td>
                                  <td className="px-8 py-5">
                                      <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tighter">{v?.name || 'N/A'}</div>
                                      <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{v?.usage || '-'}</div>
                                  </td>
                                  <td className="px-8 py-5">
                                      <div className="text-gray-600 dark:text-gray-400 font-black text-xs flex items-center uppercase tracking-tighter"><Warehouse size={12} className="mr-2 text-blue-500 opacity-70"/>{sp?.name || 'CENTRAL'}</div>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                      <span className={`px-4 py-1.5 rounded-full font-black text-xs flex items-center justify-center w-fit mx-auto ${batch.remainingQuantity === 0 ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700'}`}>{batch.remainingQuantity.toLocaleString()} kg</span>
                                  </td>
                                  {isAdmin && (
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setBatchFormData(batch); setEditingBatchId(batch.id); setIsBatchModalOpen(true); }} className="p-2 text-gray-400 hover:text-hemp-600"><Edit2 size={18}/></button>
                                        </div>
                                    </td>
                                  )}
                              </tr>
                          )
                      })}
                  </tbody>
              </table>
          </div>
      ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
                      <tr>
                          <th className="px-8 py-5">Remito / Fecha</th>
                          <th className="px-8 py-5">Material & Cantidad</th>
                          <th className="px-8 py-5">Origen / Depósito</th>
                          <th className="px-8 py-5 text-center">Estado</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredMovements.length === 0 ? (
                          <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic font-medium">No se registran despachos recibidos.</td></tr>
                      ) : filteredMovements.map(move => {
                          const b = seedBatches.find(batch => batch.id === move.batchId);
                          const v = varieties.find(vari => vari.id === b?.varietyId);
                          return (
                              <tr key={move.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-8 py-5"><div className="font-black text-gray-800 dark:text-gray-200">{move.date}</div><div className="text-[10px] text-blue-600 font-black uppercase">Guía: {move.transportGuideNumber || 'S/N'}</div></td>
                                  <td className="px-8 py-5"><div className="font-bold text-slate-800 dark:text-slate-200 uppercase">{v?.name || 'N/A'}</div><div className="text-hemp-700 dark:text-hemp-400 font-black">{move.quantity} kg</div></td>
                                  <td className="px-8 py-5"><div className="font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase text-xs"><Warehouse size={12} className="mr-2 opacity-50"/>{move.originStorageId || 'Sede Central'}</div></td>
                                  <td className="px-8 py-5 text-center"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center shadow-sm ${move.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 animate-pulse'}`}>{move.status || 'En Tránsito'}</span></td>
                              </tr>
                          )
                      })}
                  </tbody>
              </table>
          </div>
      )}

      {/* MODAL BATCH (RESTRICTED TO ADMIN) */}
      {isBatchModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-4xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4"><div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Archive size={24}/></div><div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Registrar <span className="text-hemp-600">Ingreso</span></h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recepción de lotes industriales</p></div></div>
                <button onClick={() => setIsBatchModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>
            <form onSubmit={handleBatchSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                            <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Código de Lote *</label>
                            <input required type="text" className={inputClass} value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value.toUpperCase()})} />
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div><label className="text-[9px] font-black uppercase text-slate-500 ml-1">Genética *</label><select required className={inputClass} value={batchFormData.varietyId} onChange={e => setBatchFormData({...batchFormData, varietyId: e.target.value})}>{varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                                <div><label className="text-[9px] font-black uppercase text-slate-500 ml-1">Cantidad (kg)</label><input required type="number" className={inputClass} value={batchFormData.initialQuantity} onChange={e => setBatchFormData({...batchFormData, initialQuantity: Number(e.target.value)})} /></div>
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                            <label className="text-[9px] font-black uppercase text-blue-700 ml-1">Asignar a Almacén / Socio</label>
                            <select required className={inputClass} value={batchFormData.storagePointId} onChange={e => setBatchFormData({...batchFormData, storagePointId: e.target.value})}>{storagePoints.map(s => <option key={s.id} value={s.id}>{s.name} ({s.nodeCode})</option>)}</select>
                        </div>
                    </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center hover:scale-[1.02] disabled:opacity-50">{isSubmitting ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>} Confirmar Registro</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
