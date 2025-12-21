
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement } from '../types';
import { 
  ScanBarcode, Edit2, Trash2, Tag, Package, Truck, Printer, MapPin, 
  AlertCircle, DollarSign, ShoppingCart, Archive, Save, X, 
  Loader2, Search, Eye, Info, CheckCircle, Filter, FilterX, ArrowUpRight, ArrowDownLeft,
  Building, User, Calendar, FileText, Globe, ClipboardList, ShieldCheck, Warehouse,
  FlaskConical, RefreshCw,
  // Added missing Plus icon
  Plus
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
  const [selectedBatchForView, setSelectedBatchForView] = useState<SeedBatch | null>(null);
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

  const handleOpenDispatch = (batchId?: string) => {
      setMoveFormData({
          batchId: batchId || '',
          clientId: '',
          targetLocationId: '',
          quantity: 0,
          date: new Date().toISOString().split('T')[0],
          status: 'En Tránsito',
          transportType: 'Propio',
          transportGuideNumber: '',
          driverName: '',
          vehiclePlate: '',
          transportCompany: ''
      });
      setIsMoveModalOpen(true);
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!batchFormData.varietyId || !batchFormData.batchCode || batchFormData.initialQuantity! <= 0 || isSubmitting) return;
      
      setIsSubmitting(true);
      try {
          const payload = { 
              ...batchFormData, 
              id: editingBatchId || crypto.randomUUID(), 
              remainingQuantity: editingBatchId ? batchFormData.remainingQuantity : batchFormData.initialQuantity, 
              initialQuantity: Number(batchFormData.initialQuantity),
              pricePerKg: Number(batchFormData.pricePerKg),
              purity: Number(batchFormData.purity),
              germination: Number(batchFormData.germination),
              isActive: true,
              createdAt: batchFormData.createdAt || new Date().toISOString() 
          } as SeedBatch;
          
          let success = false;
          if (editingBatchId) {
              success = await updateSeedBatch(payload);
          } else {
              success = await addSeedBatch(payload);
          }
          
          if (success) {
              setIsBatchModalOpen(false);
              setEditingBatchId(null);
          } else {
              alert("Error de conexión. El servidor no pudo procesar el ingreso.");
          }
      } catch (err: any) { 
          alert("Fallo en el registro: " + err.message); 
      } finally { 
          setIsSubmitting(false); 
      }
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
          const movePayload = { 
              ...moveFormData, 
              id: crypto.randomUUID(), 
              status: 'En Tránsito',
              quantity: Number(moveFormData.quantity)
          } as SeedMovement;

          const success = await addSeedMovement(movePayload);
          if (success) {
              await updateSeedBatch({ ...batch, remainingQuantity: batch.remainingQuantity - Number(moveFormData.quantity) });
              setIsMoveModalOpen(false);
          }
      } catch (err) {
          alert("No se pudo procesar el despacho.");
      } finally {
          setIsSubmitting(false);
      }
  };

  // Added missing handleDeleteBatch function
  const handleDeleteBatch = async (id: string, code: string) => {
      if (window.confirm(`¿Eliminar lote ${code}? Esta acción es irreversible.`)) {
          await deleteSeedBatch(id);
      }
  };

  // Added missing handleDeleteMovement function
  const handleDeleteMovement = async (id: string, guide: string) => {
      if (window.confirm(`¿Anular remito ${guide}? Se restaurará el stock al lote de origen.`)) {
          await deleteSeedMovement(id);
      }
  };

  const clearFilters = () => {
      setSearchTerm('');
      setFilterVariety('');
      setFilterStorage('');
      setFilterStatus('');
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all";

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">Inventario <span className="text-hemp-600">& Logística</span></h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Control de stock y trazabilidad de remitos industriales.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button onClick={() => handleOpenDispatch()} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-blue-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
                <ArrowUpRight size={18} className="mr-2" /> Despachar
              </button>
              <button onClick={() => { setEditingBatchId(null); setBatchFormData({ varietyId: '', supplierId: '', batchCode: '', initialQuantity: 0, purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0, storagePointId: '', isActive: true, labelSerialNumber: '', category: 'C1', certificationNumber: '', germination: 90, purity: 99, notes: '' }); setIsBatchModalOpen(true); }} className="flex-1 md:flex-none bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
                <Plus size={18} className="mr-2" /> Ingresar Lote
              </button>
          </div>
        )}
      </div>

      {/* DASHBOARD SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Stock Total" value={`${stats.totalKg.toLocaleString()} kg`} icon={Package} colorClass="bg-blue-500" />
          <MetricCard label="Valorización" value={`$${stats.totalValue.toLocaleString()}`} subtext="Estimado según costo unitario" icon={DollarSign} colorClass="bg-green-500" />
          <MetricCard label="Lotes Críticos" value={stats.lowStockCount} subtext="Bajo nivel de disponibilidad" icon={AlertCircle} colorClass="bg-amber-500" />
          <MetricCard label="En Tránsito" value={stats.activeTransits} subtext="Remitos sin confirmar recepción" icon={Truck} colorClass="bg-purple-500" />
      </div>

      {/* TABS & FILTERS BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex space-x-2 bg-gray-100 dark:bg-slate-950 p-1 rounded-2xl w-full md:w-auto">
                  <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-800 text-hemp-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Stock Central</button>
                  <button onClick={() => setActiveTab('logistics')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logistics' ? 'bg-white dark:bg-slate-800 text-hemp-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Historial Logístico</button>
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                  <div className="relative flex-1 md:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                      <input type="text" placeholder="Buscar por código..." className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border-none rounded-xl text-xs w-full md:w-48 focus:ring-2 focus:ring-hemp-500 outline-none dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <button onClick={clearFilters} className="p-2 text-gray-400 hover:text-red-500 transition" title="Limpiar Filtros"><FilterX size={18}/></button>
              </div>
          </div>
      </div>

      {/* INVENTORY TABLE */}
      {activeTab === 'inventory' ? (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
                      <tr>
                          <th className="px-8 py-5">Código de Lote</th>
                          <th className="px-8 py-5">Genética</th>
                          <th className="px-8 py-5">Ubicación / Almacén</th>
                          <th className="px-8 py-5 text-center">Disponible</th>
                          <th className="px-8 py-5 text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredBatches.length === 0 ? (
                          <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic font-medium">No se encontraron lotes de material.</td></tr>
                      ) : filteredBatches.map(batch => {
                          const v = varieties.find(v => v.id === batch.varietyId);
                          const sp = storagePoints.find(s => s.id === batch.storagePointId);
                          const isLow = batch.remainingQuantity > 0 && batch.remainingQuantity < 50;
                          return (
                              <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                  <td className="px-8 py-5 font-black text-gray-800 dark:text-gray-200">
                                      <div className="flex items-center">
                                          <ScanBarcode size={14} className="mr-2 text-hemp-600 opacity-50"/>
                                          {batch.batchCode}
                                      </div>
                                  </td>
                                  <td className="px-8 py-5">
                                      <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tighter">{v?.name || 'DESCONOCIDA'}</div>
                                      <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{v?.usage || '-'}</div>
                                  </td>
                                  <td className="px-8 py-5">
                                      <div className="text-gray-600 dark:text-gray-400 font-black text-xs flex items-center uppercase tracking-tighter">
                                          <Warehouse size={12} className="mr-2 text-blue-500 opacity-70"/>
                                          {sp?.name || 'CENTRAL'}
                                      </div>
                                      {sp?.nodeCode && <div className="text-[9px] text-slate-400 mt-0.5">Cod: {sp.nodeCode}</div>}
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                      <span className={`px-4 py-1.5 rounded-full font-black text-xs flex items-center justify-center w-fit mx-auto ${
                                          batch.remainingQuantity === 0 ? 'bg-gray-100 text-gray-400' :
                                          isLow ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                                          'bg-green-100 text-green-700'
                                      }`}>
                                          {batch.remainingQuantity.toLocaleString()} kg
                                      </span>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          {isAdmin && batch.remainingQuantity > 0 && (
                                              <button onClick={() => handleOpenDispatch(batch.id)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition" title="Despachar"><Truck size={18}/></button>
                                          )}
                                          {isAdmin && (
                                              <>
                                                  <button onClick={() => { setBatchFormData(batch); setEditingBatchId(batch.id); setIsBatchModalOpen(true); }} className="p-2 text-gray-400 hover:text-hemp-600 hover:bg-hemp-50 dark:hover:bg-hemp-900/20 rounded-xl transition"><Edit2 size={18}/></button>
                                                  <button onClick={() => handleDeleteBatch(batch.id, batch.batchCode)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"><Trash2 size={18}/></button>
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
          /* LOGISTICS VIEW */
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
                      <tr>
                          <th className="px-8 py-5">Remito / Fecha</th>
                          <th className="px-8 py-5">Material & Cantidad</th>
                          <th className="px-8 py-5">Destinatario</th>
                          <th className="px-8 py-5 text-center">Estado</th>
                          <th className="px-8 py-5 text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredMovements.length === 0 ? (
                          <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic font-medium">No se registran despachos.</td></tr>
                      ) : filteredMovements.map(move => {
                          const b = seedBatches.find(batch => batch.id === move.batchId);
                          const v = varieties.find(vari => vari.id === b?.varietyId);
                          return (
                              <tr key={move.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                  <td className="px-8 py-5">
                                      <div className="font-black text-gray-800 dark:text-gray-200">{move.date}</div>
                                      <div className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Guía: {move.transportGuideNumber || 'S/N'}</div>
                                  </td>
                                  <td className="px-8 py-5">
                                      <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tighter">{v?.name || 'N/A'}</div>
                                      <div className="text-hemp-700 dark:text-hemp-400 font-black text-base">{move.quantity} kg</div>
                                  </td>
                                  <td className="px-8 py-5">
                                      <div className="font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-tighter text-xs">
                                          <Building size={12} className="mr-2 opacity-50"/>
                                          {clients.find(c => c.id === move.clientId)?.name || 'CLIENTE EXTERNO'}
                                      </div>
                                      <div className="text-[10px] text-gray-400 flex items-center uppercase mt-1">
                                          <MapPin size={10} className="mr-1"/> 
                                          {locations.find(l => l.id === move.targetLocationId)?.name || 'SIN DESTINO'}
                                      </div>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center shadow-sm ${move.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 animate-pulse'}`}>
                                          {move.status === 'Recibido' ? <CheckCircle size={10} className="mr-1"/> : <Truck size={10} className="mr-1"/>}
                                          {move.status || 'En Tránsito'}
                                      </span>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          {isAdmin && (
                                              <button onClick={() => handleDeleteMovement(move.id, move.transportGuideNumber || 'S/N')} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition" title="Anular"><Trash2 size={18}/></button>
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

      {/* BATCH ENTRY MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-4xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Archive size={24}/></div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Registrar <span className="text-hemp-600">Ingreso de Material</span></h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocolo de recepción de lotes industriales</p>
                    </div>
                </div>
                <button onClick={() => setIsBatchModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleBatchSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* DATOS MAESTROS */}
                    <div className="space-y-6">
                        <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><Tag size={14} className="mr-2"/> Identificación Fiscal</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Código de Lote Comercial *</label>
                                    <input required type="text" className={inputClass} value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value.toUpperCase()})} placeholder="EJ: L-2024-HNC" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Genética *</label>
                                        <select required className={inputClass} value={batchFormData.varietyId} onChange={e => setBatchFormData({...batchFormData, varietyId: e.target.value})}>
                                            <option value="">Seleccionar...</option>
                                            {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Proveedor</label>
                                        <select className={inputClass} value={batchFormData.supplierId} onChange={e => setBatchFormData({...batchFormData, supplierId: e.target.value})}>
                                            <option value="">Seleccionar...</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                            <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center"><Warehouse size={14} className="mr-2"/> Almacenamiento</h3>
                            <div className="space-y-4">
                                <select required className={inputClass} value={batchFormData.storagePointId} onChange={e => setBatchFormData({...batchFormData, storagePointId: e.target.value})}>
                                    <option value="">-- Nodo de Depósito --</option>
                                    {storagePoints.map(s => <option key={s.id} value={s.id}>{s.name} ({s.nodeCode})</option>)}
                                </select>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Cantidad Inicial (kg)</label>
                                        <input required type="number" className={inputClass} value={batchFormData.initialQuantity} onChange={e => setBatchFormData({...batchFormData, initialQuantity: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Costo Unit. USD/kg</label>
                                        <input type="number" step="0.01" className={inputClass} value={batchFormData.pricePerKg} onChange={e => setBatchFormData({...batchFormData, pricePerKg: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CALIDAD Y TRAZABILIDAD */}
                    <div className="space-y-6">
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                            <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-4 flex items-center"><FlaskConical size={14} className="mr-2"/> Reporte de Calidad</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-500 ml-1">PG (%)</label>
                                    <input type="number" className={inputClass} value={batchFormData.germination} onChange={e => setBatchFormData({...batchFormData, germination: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Pureza (%)</label>
                                    <input type="number" className={inputClass} value={batchFormData.purity} onChange={e => setBatchFormData({...batchFormData, purity: Number(e.target.value)})} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Fecha de Análisis</label>
                                    <input type="date" className={inputClass} value={batchFormData.analysisDate} onChange={e => setBatchFormData({...batchFormData, analysisDate: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-[32px] border border-purple-100 dark:border-purple-900/30">
                            <h3 className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest mb-4 flex items-center"><ShieldCheck size={14} className="mr-2"/> Certificación GS1</h3>
                            <div className="space-y-4">
                                <input type="text" className={inputClass} placeholder="Número de Etiqueta / Precinto" value={batchFormData.labelSerialNumber} onChange={e => setBatchFormData({...batchFormData, labelSerialNumber: e.target.value})} />
                                <input type="text" className={inputClass} placeholder="Código GS1 / GTIN" value={batchFormData.gs1Code} onChange={e => setBatchFormData({...batchFormData, gs1Code: e.target.value})} />
                                <input type="text" className={inputClass} placeholder="Nº Certificación INASE / SENASA" value={batchFormData.certificationNumber} onChange={e => setBatchFormData({...batchFormData, certificationNumber: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800">
                    <button type="button" disabled={isSubmitting} onClick={() => setIsBatchModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                        Confirmar Registro Maestro
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH MODAL */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-2xl w-full p-10 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Despacho de <span className="text-blue-600">Material</span></h2>
                    <button onClick={() => setIsMoveModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={28}/></button>
                </div>

                <form onSubmit={handleMoveSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Lote de Origen *</label>
                            <select required className={inputClass} value={moveFormData.batchId} onChange={e => setMoveFormData({...moveFormData, batchId: e.target.value})}>
                                <option value="">Seleccionar Lote...</option>
                                {seedBatches.filter(b => b.remainingQuantity > 0).map(b => (
                                    <option key={b.id} value={b.id}>{b.batchCode} - Disp: {b.remainingQuantity} kg ({varieties.find(v => v.id === b.varietyId)?.name})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Cantidad a Despachar (kg)</label>
                            <input required type="number" step="0.1" className={inputClass} value={moveFormData.quantity} onChange={e => setMoveFormData({...moveFormData, quantity: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Fecha de Salida</label>
                            <input type="date" className={inputClass} value={moveFormData.date} onChange={e => setMoveFormData({...moveFormData, date: e.target.value})} />
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                        <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-4">Destinatario & Guía</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <select required className={inputClass} value={moveFormData.clientId} onChange={e => setMoveFormData({...moveFormData, clientId: e.target.value})}>
                                    <option value="">-- Cliente / Socio --</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <select required className={inputClass} value={moveFormData.targetLocationId} onChange={e => setMoveFormData({...moveFormData, targetLocationId: e.target.value})}>
                                    <option value="">-- Campo de Destino --</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <input type="text" className={inputClass} placeholder="Nº de Guía / Remito de Transporte" value={moveFormData.transportGuideNumber} onChange={e => setMoveFormData({...moveFormData, transportGuideNumber: e.target.value})} />
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Truck className="mr-2"/>}
                        Generar Remito Logístico
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
