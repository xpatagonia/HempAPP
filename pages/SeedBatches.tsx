
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement, Supplier, StoragePoint } from '../types';
import { Plus, ScanBarcode, Edit2, Trash2, Tag, Calendar, Package, Truck, Printer, MapPin, FileText, ArrowRight, Building, FileDigit, Globe, Clock, Box, ShieldCheck, Map, UserCheck, Briefcase, Wand2, AlertCircle, DollarSign, ShoppingCart, Archive, ChevronRight, Warehouse, Route as RouteIcon, ExternalLink, Save, X, Database, Coins, Loader2, Search, Filter, Sprout, Eye, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient'; 
import { Link } from 'react-router-dom';

const EXCHANGE_RATES = { EUR: 0.92, ARS: 880.00 };

export default function SeedBatches() {
  const { seedBatches, seedMovements, addLocalSeedBatch, updateSeedBatch, deleteSeedBatch, addSeedMovement, varieties, locations, currentUser, suppliers, clients, storagePoints, addStoragePoint, isEmergencyMode } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>('inventory');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [invSearch, setInvSearch] = useState('');
  const [invFilterVariety, setInvFilterVariety] = useState('');
  const [invFilterStorage, setInvFilterStorage] = useState('');

  // Search for Logistics
  const [logSearch, setLogSearch] = useState('');

  // Detailed View Modals
  const [selectedBatchForView, setSelectedBatchForView] = useState<SeedBatch | null>(null);
  const [selectedMovementForView, setSelectedMovementForView] = useState<SeedMovement | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Filters Inventory
  const filteredBatches = useMemo(() => {
      return seedBatches.filter(b => {
          const variety = varieties.find(v => v.id === b.varietyId);
          const matchesSearch = b.batchCode.toLowerCase().includes(invSearch.toLowerCase()) || 
                               variety?.name.toLowerCase().includes(invSearch.toLowerCase());
          const matchesVariety = !invFilterVariety || b.varietyId === invFilterVariety;
          const matchesStorage = !invFilterStorage || b.storagePointId === invFilterStorage;
          return matchesSearch && matchesVariety && matchesStorage;
      });
  }, [seedBatches, invSearch, invFilterVariety, invFilterStorage, varieties]);

  // Filters Logistics
  const filteredMovements = useMemo(() => {
      return seedMovements.filter(m => {
          const batch = seedBatches.find(b => b.id === m.batchId);
          const vari = varieties.find(v => v.id === batch?.varietyId);
          const client = clients.find(c => c.id === m.clientId);
          const search = logSearch.toLowerCase();
          
          return (vari?.name || '').toLowerCase().includes(search) || 
                 (client?.name || '').toLowerCase().includes(search) ||
                 (m.transportGuideNumber || '').toLowerCase().includes(search);
      }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [seedMovements, seedBatches, varieties, clients, logSearch]);

  const totalKg = seedBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
  const totalUsd = seedBatches.reduce((sum, b) => sum + ((b.remainingQuantity || 0) * (b.pricePerKg || 0)), 0);

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 outline-none transition-colors";

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 flex items-center">
                <Archive className="mr-3 text-hemp-600" size={32}/> Inventario & Logística
            </h1>
            <p className="text-sm text-gray-500">Gestión de stock centralizado y trazabilidad de despachos.</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2">
              <button onClick={() => {/* logic to open dispatch modal */}} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center hover:bg-blue-700 transition shadow-lg font-bold text-sm">
                <Truck size={18} className="mr-2" /> Registrar Despacho
              </button>
          </div>
        )}
      </div>

      <div className="flex space-x-8 border-b border-gray-200 mb-8">
          <button onClick={() => setActiveTab('inventory')} className={`${activeTab === 'inventory' ? 'border-hemp-600 text-hemp-700 font-black' : 'border-transparent text-gray-400 font-bold'} pb-4 px-1 border-b-4 text-sm transition-all flex items-center`}>
              <Package size={18} className="mr-2"/> STOCK CENTRAL
          </button>
          <button onClick={() => setActiveTab('logistics')} className={`${activeTab === 'logistics' ? 'border-hemp-600 text-hemp-700 font-black' : 'border-transparent text-gray-400 font-bold'} pb-4 px-1 border-b-4 text-sm transition-all flex items-center`}>
              <Truck size={18} className="mr-2"/> HISTORIAL DE DESPACHOS
          </button>
      </div>

      {activeTab === 'inventory' && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Masa en Stock</p>
                      <p className="text-3xl font-black text-gray-800">{totalKg.toLocaleString()} <span className="text-sm font-bold text-gray-400">kg</span></p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100 shadow-sm">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Valorización USD</p>
                      <p className="text-3xl font-black text-green-700">${totalUsd.toLocaleString()}</p>
                  </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
                  <div className="relative flex-1 min-w-[250px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                      <input type="text" placeholder="Buscar lote o genética..." className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-sm outline-none" value={invSearch} onChange={e => setInvSearch(e.target.value)}/>
                  </div>
                  <select className="border-none bg-gray-50 rounded-xl px-3 py-2 text-sm font-bold text-gray-600" value={invFilterVariety} onChange={e => setInvFilterVariety(e.target.value)}>
                      <option value="">Todas las Variedades</option>
                      {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-tighter">
                          <tr>
                              <th className="px-6 py-4 text-left">Referencia</th>
                              <th className="px-6 py-4 text-left">Genética</th>
                              <th className="px-6 py-4 text-center">Ubicación</th>
                              <th className="px-6 py-4 text-center">Stock</th>
                              <th className="px-6 py-4 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredBatches.map(batch => {
                              const vari = varieties.find(v => v.id === batch.varietyId);
                              const sp = storagePoints.find(s => s.id === batch.storagePointId);
                              return (
                                  <tr key={batch.id} className="hover:bg-gray-50 transition-colors group">
                                      <td className="px-6 py-4 font-black text-gray-800">{batch.batchCode}</td>
                                      <td className="px-6 py-4 font-bold text-hemp-700">{vari?.name}</td>
                                      <td className="px-6 py-4 text-center"><span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-black uppercase">{sp?.name || 'S/D'}</span></td>
                                      <td className="px-6 py-4 text-center font-black text-gray-700">{batch.remainingQuantity} kg</td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end space-x-1">
                                              <button onClick={() => setSelectedBatchForView(batch)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ver Detalles"><Eye size={18}/></button>
                                              {isAdmin && <button className="p-2 text-gray-400 hover:text-hemp-600 hover:bg-gray-50 rounded-lg transition"><Edit2 size={18}/></button>}
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

      {activeTab === 'logistics' && (
          <div className="space-y-6">
              <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center">
                  <Search className="text-gray-400 mr-3 ml-2" size={20}/>
                  <input 
                    type="text" 
                    placeholder="Filtrar por cliente, variedad o número de guía..." 
                    className="flex-1 bg-transparent border-none outline-none text-sm py-2"
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                  />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-tighter">
                          <tr>
                              <th className="px-6 py-4 text-left">Fecha / Guía</th>
                              <th className="px-6 py-4 text-left">Material</th>
                              <th className="px-6 py-4 text-left">Destino</th>
                              <th className="px-6 py-4 text-center">Estado</th>
                              <th className="px-6 py-4 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredMovements.map(move => {
                              const batch = seedBatches.find(b => b.id === move.batchId);
                              const vari = varieties.find(v => v.id === batch?.varietyId);
                              const client = clients.find(c => c.id === move.clientId);
                              return (
                                  <tr key={move.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4">
                                          <div className="font-black text-gray-800">{move.date}</div>
                                          <div className="text-[10px] text-gray-400 font-mono">{move.transportGuideNumber}</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-gray-800">{vari?.name}</div>
                                          <div className="text-blue-600 font-black">{move.quantity} kg</div>
                                      </td>
                                      <td className="px-6 py-4 text-gray-600 font-medium">{client?.name || 'Venta Directa'}</td>
                                      <td className="px-6 py-4 text-center">
                                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${move.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                              {move.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <button onClick={() => setSelectedMovementForView(move)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Hoja de Ruta"><Eye size={18}/></button>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* DETAIL MODAL: SEED BATCH */}
      {selectedBatchForView && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-in zoom-in-95">
                  <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                      <div>
                          <p className="text-[10px] font-black text-hemp-400 uppercase tracking-widest">Detalle de Stock</p>
                          <h2 className="text-2xl font-black">Lote {selectedBatchForView.batchCode}</h2>
                      </div>
                      <button onClick={() => setSelectedBatchForView(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-4 rounded-2xl border">
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Genética</p>
                              <p className="text-lg font-black text-gray-800">{varieties.find(v => v.id === selectedBatchForView.varietyId)?.name}</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-2xl border">
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Origen</p>
                              <p className="text-lg font-black text-gray-800">{selectedBatchForView.originCountry || 'N/A'}</p>
                          </div>
                      </div>
                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 grid grid-cols-3 gap-4">
                          <div className="text-center"><p className="text-[10px] font-bold text-blue-600 uppercase">Pureza</p><p className="text-xl font-black text-blue-900">{selectedBatchForView.purity}%</p></div>
                          <div className="text-center border-x border-blue-200"><p className="text-[10px] font-bold text-blue-600 uppercase">PG</p><p className="text-xl font-black text-blue-900">{selectedBatchForView.germination}%</p></div>
                          <div className="text-center"><p className="text-[10px] font-bold text-blue-600 uppercase">Categoría</p><p className="text-xl font-black text-blue-900">{selectedBatchForView.category}</p></div>
                      </div>
                      <div>
                          <h4 className="text-xs font-black text-gray-400 uppercase mb-3 flex items-center"><Info size={14} className="mr-1"/> Datos de Trazabilidad</h4>
                          <div className="space-y-2 text-sm">
                              <div className="flex justify-between border-b pb-1"><span>N° Serie Etiqueta:</span> <span className="font-bold">{selectedBatchForView.labelSerialNumber || '-'}</span></div>
                              <div className="flex justify-between border-b pb-1"><span>Certificado:</span> <span className="font-bold">{selectedBatchForView.certificationNumber || '-'}</span></div>
                              <div className="flex justify-between border-b pb-1"><span>Código GS1:</span> <span className="font-mono text-xs">{selectedBatchForView.gs1Code || '-'}</span></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* DETAIL MODAL: MOVEMENT */}
      {selectedMovementForView && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-in zoom-in-95">
                  <div className="bg-blue-900 p-6 flex justify-between items-center text-white">
                      <div>
                          <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Hoja de Ruta & Despacho</p>
                          <h2 className="text-2xl font-black">Guía {selectedMovementForView.transportGuideNumber}</h2>
                      </div>
                      <button onClick={() => setSelectedMovementForView(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl border">
                          <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Material Despachado</p>
                              <p className="text-xl font-black text-gray-800">{varieties.find(v => v.id === seedBatches.find(b => b.id === selectedMovementForView.batchId)?.varietyId)?.name}</p>
                              <p className="text-2xl font-black text-blue-600 mt-1">{selectedMovementForView.quantity} kg</p>
                          </div>
                          <div className="text-right">
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Destino</p>
                              <p className="text-xl font-black text-gray-800">{clients.find(c => c.id === selectedMovementForView.clientId)?.name || 'Cliente'}</p>
                              <p className="text-xs text-gray-500 font-bold">{locations.find(l => l.id === selectedMovementForView.targetLocationId)?.name}</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <h4 className="text-xs font-black text-gray-400 uppercase mb-3">Logística</h4>
                              <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span>Tipo:</span> <span className="font-bold">{selectedMovementForView.transportType}</span></div>
                                  <div className="flex justify-between"><span>Distancia:</span> <span className="font-bold">{selectedMovementForView.estimatedDistanceKm || '-'} km</span></div>
                                  <div className="flex justify-between"><span>Chofer:</span> <span className="font-bold">{selectedMovementForView.driverName || '-'}</span></div>
                              </div>
                          </div>
                          <div>
                              <h4 className="text-xs font-black text-gray-400 uppercase mb-3">Vehículo</h4>
                              <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span>Patente:</span> <span className="font-mono font-bold uppercase">{selectedMovementForView.vehiclePlate || '-'}</span></div>
                                  <div className="flex justify-between"><span>Modelo:</span> <span className="font-bold">{selectedMovementForView.vehicleModel || '-'}</span></div>
                                  <div className="flex justify-between"><span>Empresa:</span> <span className="font-bold">{selectedMovementForView.transportCompany || '-'}</span></div>
                              </div>
                          </div>
                      </div>
                      {selectedMovementForView.routeGoogleLink && (
                          <a href={selectedMovementForView.routeGoogleLink} target="_blank" rel="noopener noreferrer" className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-center block shadow-lg hover:bg-green-700 transition">
                              ABRIR RUTA EN GOOGLE MAPS
                          </a>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
