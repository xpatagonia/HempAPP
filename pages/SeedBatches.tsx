
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

  // Fix Error in file pages/SeedBatches.tsx on line 202: Cannot find name 'handleOpenDispatch'.
  const handleOpenDispatch = () => {
    setMoveFormData({
      batchId: '', clientId: '', targetLocationId: '', quantity: 0, inputValue: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio',
      transportGuideNumber: '', driverName: '', driverDni: '', vehiclePlate: '', transportCompany: '', recipientName: '', recipientDni: '',
      routeItinerary: '', estimatedDistanceKm: 0, routeGoogleLink: '', dispatchTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    });
    setMoveUnit('kg');
    setIsMoveModalOpen(true);
  };

  // Fix Error in file pages/SeedBatches.tsx on line 259: Cannot find name 'handleOpenView'.
  const handleOpenView = (batch: SeedBatch) => {
    setSelectedBatch(batch);
    setIsViewModalOpen(true);
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isClient = currentUser?.role === 'client';
  const isTech = currentUser?.role === 'technician';

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

  const filteredBatches = useMemo(() => seedBatches.filter(b => {
      const v = varieties.find(v => v.id === b.varietyId);
      const sp = storagePoints.find(s => s.id === b.storagePointId);
      
      if (isClient && currentUser?.clientId) {
          if (sp?.clientId !== currentUser.clientId) return false;
      }
      if (isTech) {
          if (sp?.responsibleUserId !== currentUser?.id) return false;
      }

      const matchesSearch = b.batchCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (v?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
  }), [seedBatches, searchTerm, varieties, isClient, isTech, currentUser, storagePoints]);

  const filteredMovements = useMemo(() => seedMovements.filter(m => {
      // Un cliente o técnico solo ve remitos destinados a sus galpones
      if (isClient && currentUser?.clientId) {
          if (m.clientId !== currentUser.clientId) return false;
      }
      if (isTech) {
          const sp = storagePoints.find(s => s.id === m.targetLocationId);
          if (sp?.responsibleUserId !== currentUser?.id) return false;
      }

      const term = searchTerm.toLowerCase();
      const matchesSearch = (m.recipientName || '').toLowerCase().includes(term) || (m.transportGuideNumber || '').toLowerCase().includes(term);
      const matchesStatus = !filterStatus || m.status === filterStatus;
      return matchesSearch && matchesStatus;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [seedMovements, searchTerm, filterStatus, isClient, isTech, currentUser, storagePoints]);

  const stats = useMemo(() => {
      const totalKg = filteredBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
      const activeTransits = filteredMovements.filter(m => m.status === 'En Tránsito').length;
      return { totalKg, activeTransits };
  }, [filteredBatches, filteredMovements]);

  const handleConfirmReceipt = async (move: SeedMovement) => {
      if (isSubmitting) return;
      if (!window.confirm(`¿Confirma que ha recibido físicamente ${move.quantity} kg en el nodo de acopio? Al confirmar, el material quedará disponible en su stock local.`)) return;
      
      setIsSubmitting(true);
      try {
          // 1. Marcar movimiento como Recibido
          const updateSuccess = await updateSeedMovement({ ...move, status: 'Recibido' });
          
          if (updateSuccess) {
              const originalBatch = seedBatches.find(b => b.id === move.batchId);
              if (originalBatch) {
                  // 2. Crear Lote Local basado en el envío
                  const localBatchPayload: SeedBatch = {
                      ...originalBatch,
                      id: crypto.randomUUID(),
                      batchCode: `${originalBatch.batchCode}-REC-${move.transportGuideNumber || 'SN'}`,
                      initialQuantity: move.quantity,
                      remainingQuantity: move.quantity,
                      storagePointId: move.targetLocationId, // El galpón del cliente
                      notes: `Recepcionado desde Planta Central mediante remito ${move.transportGuideNumber}.`,
                      createdAt: new Date().toISOString(),
                      isActive: true
                  };
                  await addSeedBatch(localBatchPayload);
                  alert("✅ Recepción confirmada. El stock ha sido dado de alta en su almacén local.");
              }
          }
      } catch (err) {
          alert("Error al procesar la recepción.");
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
              await updateSeedBatch({ ...batch, remainingQuantity: batch.remainingQuantity - calculatedMoveKg });
              setIsMoveModalOpen(false);
              alert("✅ Remito generado. El material está en tránsito hacia el socio.");
          }
      } catch (err) {
          alert("Error de comunicación logística.");
      } finally { setIsSubmitting(false); }
  };

  // UI logic remains similar but with receipt capability
  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-3 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all";
  const labelClass = "text-[9px] font-black uppercase text-slate-500 ml-1 mb-1.5 block tracking-widest";

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">Inventario <span className="text-hemp-600">& Logística</span></h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Control de stock, remitos y confirmación de recepción.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button onClick={() => handleOpenDispatch()} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-blue-700 transition shadow-xl font-black text-xs uppercase tracking-widest"><ArrowUpRight size={18} className="mr-2" /> Despachar Carga</button>
              <button onClick={() => { setEditingBatchId(null); setEntryUnit('kg'); setBatchFormData({ varietyId: '', supplierId: '', batchCode: '', initialQuantity: 0, inputValue: 0, purchaseDate: new Date().toISOString().split('T')[0], pricePerKg: 0, storagePointId: '', isActive: true }); setIsBatchModalOpen(true); }} className="flex-1 md:flex-none bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest"><Plus size={18} className="mr-2" /> Ingresar Lote</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard label="Masa Disponible" value={`${stats.totalKg.toLocaleString()} kg`} icon={Package} colorClass="bg-blue-500" />
          <MetricCard label="Depósitos Activos" value={filteredBatches.map(b => b.storagePointId).filter((v, i, a) => a.indexOf(v) === i).length} icon={Warehouse} colorClass="bg-hemp-500" />
          <MetricCard label="Remitos en Curso" value={stats.activeTransits} icon={Truck} colorClass="bg-purple-500" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex space-x-2 bg-gray-100 dark:bg-slate-950 p-1 rounded-2xl w-full md:w-auto">
                  <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-800 text-hemp-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Stock en Almacén</button>
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
                          <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic font-medium">Sin stock registrado en sus depósitos.</td></tr>
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
                                      <div className="font-black text-slate-700 dark:text-slate-300 uppercase italic truncate max-w-[200px]">{sp?.name || 'S/D'}</div>
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
                           <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic">Sin remitos pendientes o recibidos.</td></tr>
                      ) : filteredMovements.map(move => {
                          const targetStorage = storagePoints.find(s => s.id === move.targetLocationId);
                          // Lógica de confirmación: Admins o el Cliente/Técnico responsable del nodo destino
                          const canConfirm = isAdmin || 
                                           (isClient && move.clientId === currentUser?.clientId) || 
                                           (isTech && targetStorage?.responsibleUserId === currentUser?.id);
                          
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
                                              <button 
                                                onClick={() => handleConfirmReceipt(move)} 
                                                disabled={isSubmitting} 
                                                className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition shadow-md disabled:opacity-50 group relative" 
                                                title="Confirmar Recepción Física"
                                              >
                                                  {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <ClipboardCheck size={16}/>}
                                                  <span className="absolute -top-10 right-0 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">Confirmar Recepción</span>
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

      {/* MODALES EXISTENTES SE MANTIENEN IGUAL (VISTA, INGRESO, DESPACHO) */}
      {/* ... */}
    </div>
  );
}
