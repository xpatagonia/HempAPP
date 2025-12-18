
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement, Supplier, StoragePoint } from '../types';
import { Plus, ScanBarcode, Edit2, Trash2, Tag, Calendar, Package, Truck, Printer, MapPin, FileText, ArrowRight, Building, FileDigit, Globe, Clock, Box, ShieldCheck, Map, UserCheck, Briefcase, Wand2, AlertCircle, DollarSign, ShoppingCart, Archive, ChevronRight, Warehouse, Route as RouteIcon, ExternalLink, Save, X, Database, Coins, Loader2, Search, Filter, Sprout, Eye, Info, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import { Link, useSearchParams } from 'react-router-dom';

const EXCHANGE_RATES = { EUR: 0.92, ARS: 880.00 };

export default function SeedBatches() {
  const { seedBatches, seedMovements, addLocalSeedBatch, updateSeedBatch, deleteSeedBatch, addSeedMovement, updateSeedMovement, varieties, locations, currentUser, suppliers, clients, storagePoints, addStoragePoint, isEmergencyMode } = useAppContext();
  const [searchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>( (searchParams.get('tab') as any) || 'inventory');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // -- FILTERS --
  const [invSearch, setInvSearch] = useState(searchParams.get('variety') || '');
  const [invFilterVariety, setInvFilterVariety] = useState('');
  const [invFilterStorage, setInvFilterStorage] = useState('');
  const [logSearch, setLogSearch] = useState('');

  // -- MODAL STATES --
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedBatchForView, setSelectedBatchForView] = useState<SeedBatch | null>(null);
  const [selectedMovementForView, setSelectedMovementForView] = useState<SeedMovement | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  // -- FORMS --
  const [batchFormData, setBatchFormData] = useState<Partial<SeedBatch>>({
    varietyId: '', supplierName: '', batchCode: '', initialQuantity: 0, purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0, storagePointId: '', isActive: true,
    labelSerialNumber: '', category: 'C1', certificationNumber: '', gs1Code: '', analysisDate: '', germination: 90, purity: 99
  });

  const [moveFormData, setMoveFormData] = useState<Partial<SeedMovement>>({
    batchId: '', clientId: '', targetLocationId: '', quantity: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio',
    transportGuideNumber: '', driverName: '', vehiclePlate: '', transportCompany: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // --- LOGIC: SUBMIT BATCH (INCOME) ---
  const handleBatchSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!batchFormData.varietyId || !batchFormData.batchCode || batchFormData.initialQuantity! <= 0) {
          alert("Por favor completa los campos obligatorios.");
          return;
      }

      setIsSubmitting(true);
      const newId = editingBatchId || crypto.randomUUID();
      const payload = {
          ...batchFormData,
          id: newId,
          remainingQuantity: editingBatchId ? batchFormData.remainingQuantity : batchFormData.initialQuantity,
          createdAt: new Date().toISOString()
      } as SeedBatch;

      try {
          if (editingBatchId) {
              updateSeedBatch(payload);
          } else {
              if (!isEmergencyMode) {
                  const { error } = await supabase.from('seed_batches').insert([payload]);
                  if (error) throw error;
              }
              addLocalSeedBatch(payload);
          }
          setIsBatchModalOpen(false);
          setEditingBatchId(null);
          setBatchFormData({ varietyId: '', supplierName: '', batchCode: '', initialQuantity: 0, purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0, storagePointId: '', isActive: true, labelSerialNumber: '', category: 'C1' });
      } catch (err: any) {
          alert("Error al guardar lote: " + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- LOGIC: SUBMIT MOVEMENT (DISPATCH) ---
  const handleMoveSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const batch = seedBatches.find(b => b.id === moveFormData.batchId);
      if (!batch || !moveFormData.targetLocationId || moveFormData.quantity! <= 0) {
          alert("Datos de despacho incompletos.");
          return;
      }

      if (moveFormData.quantity! > batch.remainingQuantity) {
          alert(`Stock insuficiente. Solo hay ${batch.remainingQuantity} kg disponibles.`);
          return;
      }

      setIsSubmitting(true);
      const moveId = crypto.randomUUID();
      const movePayload = {
          ...moveFormData,
          id: moveId,
          transportGuideNumber: moveFormData.transportGuideNumber || `G-${Date.now()}`
      } as SeedMovement;

      try {
          const success = await addSeedMovement(movePayload);
          if (success) {
              const updatedBatch = { ...batch, remainingQuantity: batch.remainingQuantity - moveFormData.quantity! };
              updateSeedBatch(updatedBatch);
              setIsMoveModalOpen(false);
              setMoveFormData({ batchId: '', clientId: '', targetLocationId: '', quantity: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio' });
          }
      } catch (err: any) {
          alert("Error en logística: " + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleReceiveShipment = (move: SeedMovement) => {
      if (window.confirm("¿Confirmar la recepción de este envío en el destino?")) {
          updateSeedMovement({
              ...move,
              status: 'Recibido'
          });
      }
  };

  const openQuickDispatch = (batchId: string) => {
      setMoveFormData({
          ...moveFormData,
          batchId,
          quantity: 0
      });
      setIsMoveModalOpen(true);
  };

  // --- FILTERS LOGIC ---
  const filteredBatches = useMemo(() => {
      return seedBatches.filter(b => {
          const v = varieties.find(v => v.id === b.varietyId);
          const matchesSearch = b.batchCode.toLowerCase().includes(invSearch.toLowerCase()) || (v?.name || '').toLowerCase().includes(invSearch.toLowerCase());
          const matchesVariety = !invFilterVariety || b.varietyId === invFilterVariety;
          const matchesStorage = !invFilterStorage || b.storagePointId === invFilterStorage;
          return matchesSearch && matchesVariety && matchesStorage;
      });
  }, [seedBatches, invSearch, invFilterVariety, invFilterStorage, varieties]);

  const filteredMovements = useMemo(() => {
      return seedMovements.filter(m => {
          const b = seedBatches.find(batch => batch.id === m.batchId);
          const v = varieties.find(vari => vari.id === b?.varietyId);
          const c = clients.find(cli => cli.id === m.clientId);
          const term = logSearch.toLowerCase();
          return (v?.name || '').toLowerCase().includes(term) || (c?.name || '').toLowerCase().includes(term) || (m.transportGuideNumber || '').toLowerCase().includes(term);
      }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [seedMovements, seedBatches, varieties, clients, logSearch]);

  const totalKg = seedBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
  const totalUsd = seedBatches.reduce((sum, b) => sum + ((b.remainingQuantity || 0) * (b.pricePerKg || 0)), 0);

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded-lg focus:ring-2 focus:ring-hemp-500 outline-none transition-all";

  return (
    <div className="animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 flex items-center">
                <Archive className="mr-3 text-hemp-600" size={32}/> Inventario & Logística
            </h1>
            <p className="text-sm text-gray-500">Gestión de stock centralizado, ingresos con trazabilidad y despacho a red.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button onClick={() => setIsMoveModalOpen(true)} className="flex-1 md:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center hover:bg-blue-700 transition shadow-lg font-bold text-sm">
                <Truck size={18} className="mr-2" /> Registrar Salida
              </button>
              <button onClick={() => { setEditingBatchId(null); setIsBatchModalOpen(true); }} className="flex-1 md:flex-none bg-hemp-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center hover:bg-hemp-700 transition shadow-lg font-bold text-sm">
                <ShoppingCart size={18} className="mr-2" /> Registrar Ingreso
              </button>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex space-x-8 border-b border-gray-200 mb-8">
          <button onClick={() => setActiveTab('inventory')} className={`${activeTab === 'inventory' ? 'border-hemp-600 text-hemp-700 font-black' : 'border-transparent text-gray-400 font-bold'} pb-4 px-1 border-b-4 text-sm transition-all flex items-center uppercase tracking-widest`}>
              <Package size={18} className="mr-2"/> STOCK CENTRAL
          </button>
          <button onClick={() => setActiveTab('logistics')} className={`${activeTab === 'logistics' ? 'border-hemp-600 text-hemp-700 font-black' : 'border-transparent text-gray-400 font-bold'} pb-4 px-1 border-b-4 text-sm transition-all flex items-center uppercase tracking-widest`}>
              <Truck size={18} className="mr-2"/> HISTORIAL DE DESPACHOS
          </button>
      </div>

      {/* TAB CONTENT: INVENTORY */}
      {activeTab === 'inventory' && (
          <div className="space-y-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Masa Total en Stock</p>
                      <p className="text-3xl font-black text-gray-800">{totalKg.toLocaleString()} <span className="text-sm font-bold text-gray-400">kg</span></p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100 shadow-sm relative overflow-hidden">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Valorización Estimada</p>
                      <p className="text-3xl font-black text-green-700">${totalUsd.toLocaleString()} <span className="text-xs">USD</span></p>
                      <DollarSign className="absolute -right-4 -bottom-4 text-green-200 opacity-20" size={80}/>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 shadow-sm">
                      <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Puntos de Acopio</p>
                      <p className="text-3xl font-black text-purple-700">{storagePoints.length}</p>
                  </div>
              </div>

              {/* Filters Inventory */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
                  <div className="relative flex-1 min-w-[250px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                      <input type="text" placeholder="Buscar por código de lote o variedad..." className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-sm outline-none border-transparent focus:border-hemp-500 focus:bg-white border transition-all" value={invSearch} onChange={e => setInvSearch(e.target.value)}/>
                  </div>
                  <div className="flex gap-2">
                    <select className="bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-600" value={invFilterVariety} onChange={e => setInvFilterVariety(e.target.value)}>
                        <option value="">Todas las Variedades</option>
                        {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <select className="bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-600" value={invFilterStorage} onChange={e => setInvFilterStorage(e.target.value)}>
                        <option value="">Todas las Ubicaciones</option>
                        {storagePoints.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                    </select>
                  </div>
              </div>

              {/* Table Inventory */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                          <tr>
                              <th className="px-6 py-4 text-left">Código Lote</th>
                              <th className="px-6 py-4 text-left">Genética</th>
                              <th className="px-6 py-4 text-center">Ubicación</th>
                              <th className="px-6 py-4 text-center">Stock Neto</th>
                              <th className="px-6 py-4 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredBatches.length === 0 ? (
                              <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic font-medium">No se encontraron lotes con los filtros seleccionados.</td></tr>
                          ) : filteredBatches.map(batch => {
                              const vari = varieties.find(v => v.id === batch.varietyId);
                              const sp = storagePoints.find(s => s.id === batch.storagePointId);
                              const isLow = batch.remainingQuantity < 50;

                              return (
                                  <tr key={batch.id} className={`hover:bg-gray-50 transition-colors group ${isLow ? 'bg-amber-50/30' : ''}`}>
                                      <td className="px-6 py-4">
                                          <div className="font-black text-gray-800 flex items-center">
                                              {batch.batchCode}
                                              {isLow && <AlertCircle size={14} className="ml-1.5 text-amber-500" title="Alerta: Stock Bajo"/>}
                                          </div>
                                          <div className="text-[10px] text-gray-400 font-mono">PO: {batch.purchaseOrder || 'N/A'}</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-hemp-700">{vari?.name || 'Desconocida'}</div>
                                          <div className="text-[10px] text-gray-400 uppercase font-bold">{vari?.usage || '-'}</div>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] font-black uppercase border border-purple-100 shadow-sm">
                                              {sp?.name || 'S/D'}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <span className={`px-3 py-1 rounded-full font-black ${batch.remainingQuantity > 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                              {batch.remainingQuantity.toLocaleString()} kg
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end space-x-1">
                                              <button onClick={() => setSelectedBatchForView(batch)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ver Detalles Técnicos">
                                                  <Eye size={18}/>
                                              </button>
                                              {isAdmin && (
                                                  <>
                                                      <button onClick={() => openQuickDispatch(batch.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Enviar / Despachar">
                                                          <Truck size={18}/>
                                                      </button>
                                                      <button onClick={() => { setBatchFormData(batch); setEditingBatchId(batch.id); setIsBatchModalOpen(true); }} className="p-2 text-gray-400 hover:text-hemp-600 hover:bg-gray-50 rounded-lg transition"><Edit2 size={18}/></button>
                                                      <button onClick={() => deleteSeedBatch(batch.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={18}/></button>
                                                  </>
                                              )}
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* TAB CONTENT: LOGISTICS */}
      {activeTab === 'logistics' && (
          <div className="space-y-6">
              {/* Filters Logistics */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center">
                  <Search className="text-gray-400 mr-3 ml-2" size={20}/>
                  <input 
                    type="text" 
                    placeholder="Buscar por cliente, genética o N° de guía de transporte..." 
                    className="flex-1 bg-transparent border-none outline-none text-sm py-2 font-medium"
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                  />
              </div>

              {/* Table Logistics */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                          <tr>
                              <th className="px-6 py-4 text-left">Fecha / Guía</th>
                              <th className="px-6 py-4 text-left">Material & Cantidad</th>
                              <th className="px-6 py-4 text-left">Consignatario (Destino)</th>
                              <th className="px-6 py-4 text-center">Estado</th>
                              <th className="px-6 py-4 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredMovements.length === 0 ? (
                              <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic font-medium">No se registran movimientos logísticos.</td></tr>
                          ) : filteredMovements.map(move => {
                              const batch = seedBatches.find(b => b.id === move.batchId);
                              const vari = varieties.find(v => v.id === batch?.varietyId);
                              const client = clients.find(c => c.id === move.clientId);
                              const loc = locations.find(l => l.id === move.targetLocationId);

                              return (
                                  <tr key={move.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4">
                                          <div className="font-black text-gray-800">{move.date}</div>
                                          <div className="text-[10px] text-gray-400 font-mono flex items-center"><Tag size={10} className="mr-1"/> {move.transportGuideNumber}</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-gray-800">{vari?.name || 'Genética'}</div>
                                          <div className="text-blue-600 font-black text-lg">{move.quantity} kg</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-gray-700">{client?.name || 'Venta Directa'}</div>
                                          <div className="text-[10px] text-gray-400 flex items-center font-bold uppercase"><MapPin size={10} className="mr-1 text-red-400"/> {loc?.name}</div>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${move.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                              {move.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end space-x-1">
                                              {isAdmin && move.status === 'En Tránsito' && (
                                                  <button onClick={() => handleReceiveShipment(move)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Marcar como Recibido">
                                                      <CheckCircle size={18}/>
                                                  </button>
                                              )}
                                              <button onClick={() => setSelectedMovementForView(move)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ver Detalle Despacho">
                                                  <Eye size={18}/>
                                              </button>
                                              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition" title="Imprimir Remito">
                                                  <Printer size={18}/>
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
      {/* ... (rest of modals remain unchanged) ... */}
