
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement } from '../types';
import { 
  ScanBarcode, Edit2, Trash2, Tag, Package, Truck, Printer, MapPin, 
  AlertCircle, DollarSign, ShoppingCart, Archive, Save, X, 
  Loader2, Search, Eye, Info, CheckCircle 
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import { useSearchParams } from 'react-router-dom';

export default function SeedBatches() {
  const { 
    seedBatches, seedMovements, addLocalSeedBatch, updateSeedBatch, 
    deleteSeedBatch, addSeedMovement, updateSeedMovement, varieties, 
    locations, currentUser, clients, storagePoints, isEmergencyMode 
  } = useAppContext();
  
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>((searchParams.get('tab') as any) || 'inventory');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [invSearch, setInvSearch] = useState(searchParams.get('variety') || '');
  const [invFilterVariety, setInvFilterVariety] = useState('');
  const [invFilterStorage, setInvFilterStorage] = useState('');
  const [logSearch, setLogSearch] = useState('');

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

  const handleBatchSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!batchFormData.varietyId || !batchFormData.batchCode || batchFormData.initialQuantity! <= 0) return;
      setIsSubmitting(true);
      const payload = { ...batchFormData, id: editingBatchId || crypto.randomUUID(), remainingQuantity: editingBatchId ? batchFormData.remainingQuantity : batchFormData.initialQuantity, createdAt: new Date().toISOString() } as SeedBatch;
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
          alert("Stock insuficiente");
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
      if (window.confirm("¿Confirmar recepción de este material en el destino?")) {
          updateSeedMovement({ ...move, status: 'Recibido' });
      }
  };

  const openQuickDispatch = (batchId: string) => {
      setMoveFormData({ ...moveFormData, batchId, quantity: 0 });
      setIsMoveModalOpen(true);
  };

  const filteredBatches = useMemo(() => seedBatches.filter(b => {
      const v = varieties.find(v => v.id === b.varietyId);
      const matchesSearch = b.batchCode.toLowerCase().includes(invSearch.toLowerCase()) || (v?.name || '').toLowerCase().includes(invSearch.toLowerCase());
      return matchesSearch && (!invFilterVariety || b.varietyId === invFilterVariety) && (!invFilterStorage || b.storagePointId === invFilterStorage);
  }), [seedBatches, invSearch, invFilterVariety, invFilterStorage, varieties]);

  const filteredMovements = useMemo(() => seedMovements.filter(m => {
      const b = seedBatches.find(batch => batch.id === m.batchId);
      const v = varieties.find(vari => vari.id === b?.varietyId);
      const c = clients.find(cli => cli.id === m.clientId);
      const term = logSearch.toLowerCase();
      return (v?.name || '').toLowerCase().includes(term) || (c?.name || '').toLowerCase().includes(term) || (m.transportGuideNumber || '').toLowerCase().includes(term);
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [seedMovements, seedBatches, varieties, clients, logSearch]);

  const totalKg = seedBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
  const totalUsd = seedBatches.reduce((sum, b) => sum + ((b.remainingQuantity || 0) * (b.pricePerKg || 0)), 0);

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded-lg focus:ring-2 focus:ring-hemp-500 outline-none";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 flex items-center">
                <Archive className="mr-3 text-hemp-600" size={32}/> Inventario & Logística
            </h1>
            <p className="text-sm text-gray-500">Gestión de stock centralizado y seguimiento de envíos.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2">
              <button onClick={() => setIsMoveModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center hover:bg-blue-700 transition shadow-lg font-bold text-sm">
                <Truck size={18} className="mr-2" /> Registrar Salida
              </button>
              <button onClick={() => { setEditingBatchId(null); setIsBatchModalOpen(true); }} className="bg-hemp-600 text-white px-5 py-2.5 rounded-xl flex items-center hover:bg-hemp-700 transition shadow-lg font-bold text-sm">
                <ShoppingCart size={18} className="mr-2" /> Registrar Ingreso
              </button>
          </div>
        )}
      </div>

      <div className="flex space-x-8 border-b border-gray-200 mb-8">
          <button onClick={() => setActiveTab('inventory')} className={`${activeTab === 'inventory' ? 'border-hemp-600 text-hemp-700 font-black' : 'border-transparent text-gray-400 font-bold'} pb-4 border-b-4 text-sm transition-all uppercase tracking-widest`}>Stock Central</button>
          <button onClick={() => setActiveTab('logistics')} className={`${activeTab === 'logistics' ? 'border-hemp-600 text-hemp-700 font-black' : 'border-transparent text-gray-400 font-bold'} pb-4 border-b-4 text-sm transition-all uppercase tracking-widest`}>Historial de Despachos</button>
      </div>

      {activeTab === 'inventory' ? (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Masa Total</p>
                      <p className="text-3xl font-black text-gray-800">{totalKg.toLocaleString()} kg</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100 shadow-sm relative overflow-hidden">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Valorización (USD)</p>
                      <p className="text-3xl font-black text-green-700">${totalUsd.toLocaleString()}</p>
                      <DollarSign className="absolute -right-4 -bottom-4 text-green-200 opacity-20" size={80}/>
                  </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <table className="min-w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                          <tr>
                              <th className="px-6 py-4">Código Lote</th>
                              <th className="px-6 py-4">Genética</th>
                              <th className="px-6 py-4">Ubicación</th>
                              <th className="px-6 py-4 text-center">Stock</th>
                              <th className="px-6 py-4 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredBatches.map(batch => (
                              <tr key={batch.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-black text-gray-800">{batch.batchCode}</td>
                                  <td className="px-6 py-4 font-bold text-hemp-700">{varieties.find(v => v.id === batch.varietyId)?.name}</td>
                                  <td className="px-6 py-4 text-gray-500">{storagePoints.find(s => s.id === batch.storagePointId)?.name}</td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`px-3 py-1 rounded-full font-black ${batch.remainingQuantity > 50 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                          {batch.remainingQuantity.toLocaleString()} kg
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end space-x-1">
                                          <button onClick={() => setSelectedBatchForView(batch)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ver Detalles"><Eye size={18}/></button>
                                          {isAdmin && (
                                              <>
                                                  <button onClick={() => openQuickDispatch(batch.id)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Despachar (Camioncito)"><Truck size={18}/></button>
                                                  <button onClick={() => { setBatchFormData(batch); setEditingBatchId(batch.id); setIsBatchModalOpen(true); }} className="p-2 text-gray-400 hover:text-hemp-600 rounded-lg"><Edit2 size={18}/></button>
                                              </>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      ) : (
          <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <table className="min-w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                          <tr>
                              <th className="px-6 py-4">Fecha / Guía</th>
                              <th className="px-6 py-4">Material & Cantidad</th>
                              <th className="px-6 py-4">Destino</th>
                              <th className="px-6 py-4 text-center">Estado</th>
                              <th className="px-6 py-4 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredMovements.map(move => (
                              <tr key={move.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4">
                                      <div className="font-black text-gray-800">{move.date}</div>
                                      <div className="text-[10px] text-gray-400 font-mono">#{move.transportGuideNumber}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-800">{varieties.find(v => v.id === seedBatches.find(b => b.id === move.batchId)?.varietyId)?.name}</div>
                                      <div className="text-blue-600 font-black">{move.quantity} kg</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-700">{clients.find(c => c.id === move.clientId)?.name}</div>
                                      <div className="text-[10px] text-gray-400 flex items-center uppercase"><MapPin size={10} className="mr-1"/> {locations.find(l => l.id === move.targetLocationId)?.name}</div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${move.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                          {move.status || 'En Tránsito'}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end space-x-1">
                                          {isAdmin && move.status === 'En Tránsito' && (
                                              <button onClick={() => handleReceiveShipment(move)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Confirmar Recepción"><CheckCircle size={18}/></button>
                                          )}
                                          <button onClick={() => setSelectedMovementForView(move)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"><Eye size={18}/></button>
                                          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><Printer size={18}/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- MODALS --- */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-black mb-6">{editingBatchId ? 'Editar Lote' : 'Ingreso de Semilla'}</h2>
            <form onSubmit={handleBatchSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs font-black text-gray-500 uppercase">Genética</label>
                        <select required className={inputClass} value={batchFormData.varietyId} onChange={e => setBatchFormData({...batchFormData, varietyId: e.target.value})}>
                            <option value="">Seleccionar variedad...</option>
                            {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-500 uppercase">Código de Lote</label>
                        <input required type="text" className={inputClass} value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-500 uppercase">Ubicación</label>
                        <select required className={inputClass} value={batchFormData.storagePointId} onChange={e => setBatchFormData({...batchFormData, storagePointId: e.target.value})}>
                            <option value="">Depósito...</option>
                            {storagePoints.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2 bg-blue-50 p-4 rounded-xl">
                        <p className="text-xs font-bold text-blue-700 uppercase mb-2">Trazabilidad</p>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Serie Etiqueta" className={inputClass} value={batchFormData.labelSerialNumber} onChange={e => setBatchFormData({...batchFormData, labelSerialNumber: e.target.value})} />
                            <select className={inputClass} value={batchFormData.category} onChange={e => setBatchFormData({...batchFormData, category: e.target.value as any})}>
                                <option value="C1">C1</option><option value="C2">C2</option><option value="Base">Base</option><option value="Original">Original</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-500 uppercase">Cantidad (kg)</label>
                        <input required type="number" step="0.1" className={inputClass} value={batchFormData.initialQuantity} onChange={e => setBatchFormData({...batchFormData, initialQuantity: Number(e.target.value)})} />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-5 font-bold">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-hemp-600 text-white rounded-xl font-black shadow-lg">Confirmar</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-black mb-6 flex items-center"><Truck size={28} className="mr-3 text-blue-600"/> Registrar Despacho</h2>
            <form onSubmit={handleMoveSubmit} className="space-y-6">
                <div>
                    <label className="text-xs font-black text-gray-500 uppercase">Lote Origen</label>
                    <select required className={inputClass} value={moveFormData.batchId} onChange={e => setMoveFormData({...moveFormData, batchId: e.target.value})}>
                        <option value="">Seleccionar lote...</option>
                        {seedBatches.filter(b => b.remainingQuantity > 0).map(b => (
                            <option key={b.id} value={b.id}>[{varieties.find(v => v.id === b.varietyId)?.name}] Lote: {b.batchCode} ({b.remainingQuantity}kg)</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-black text-gray-500 uppercase">Cliente Receptor</label>
                        <select required className={inputClass} value={moveFormData.clientId} onChange={e => setMoveFormData({...moveFormData, clientId: e.target.value, targetLocationId: ''})}>
                            <option value="">Seleccionar cliente...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-500 uppercase">Campo de Destino</label>
                        <select required className={inputClass} value={moveFormData.targetLocationId} onChange={e => setMoveFormData({...moveFormData, targetLocationId: e.target.value})} disabled={!moveFormData.clientId}>
                            <option value="">Campo...</option>
                            {locations.filter(l => l.clientId === moveFormData.clientId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-black text-gray-500 uppercase">Cantidad (kg)</label>
                        <input required type="number" step="0.1" className={inputClass} value={moveFormData.quantity || ''} onChange={e => setMoveFormData({...moveFormData, quantity: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-500 uppercase">N° Guía / Remito</label>
                        <input type="text" className={inputClass} value={moveFormData.transportGuideNumber} onChange={e => setMoveFormData({...moveFormData, transportGuideNumber: e.target.value})} />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={() => setIsMoveModalOpen(false)} className="px-5 font-bold">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black shadow-lg">Confirmar Envío</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
