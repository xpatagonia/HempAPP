
import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot, Variety, Location, Project } from '../types';
import { 
  ChevronRight, FileSpreadsheet, LayoutGrid, List, Tag, FlaskConical, 
  Tractor, Trash2, Edit2, QrCode, X, Save, Search, Filter, 
  MapPin, Calendar, Sprout, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Plots() {
  const { plots, locations, varieties, projects, currentUser, getLatestRecord, seedBatches, deletePlot, updatePlot } = useAppContext();
  const [searchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoc, setFilterLoc] = useState('all');
  const [filterProj, setFilterProj] = useState(searchParams.get('project') || 'all');
  const [filterType, setFilterType] = useState<'all' | 'Ensayo' | 'Producción'>('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal States
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [qrPlot, setQrPlot] = useState<Plot | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isClient = currentUser?.role === 'client';

  const filteredPlots = useMemo(() => plots.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoc = filterLoc === 'all' || p.locationId === filterLoc;
      const matchProj = filterProj === 'all' || p.projectId === filterProj;
      const matchType = filterType === 'all' || p.type === filterType;
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      let hasAccess = isAdmin || (isClient && locations.find(l => l.id === p.locationId)?.clientId === currentUser.clientId) || p.responsibleIds?.includes(currentUser?.id || '');
      return matchSearch && matchLoc && matchProj && matchType && matchStatus && hasAccess;
  }), [plots, searchTerm, filterLoc, filterProj, filterType, filterStatus, isAdmin, isClient, currentUser]);

  const handleDeletePlot = async (id: string, name: string) => {
      if (window.confirm(`¿Estás seguro de eliminar el lote "${name}"? Se perderán todos los registros técnicos asociados.`)) {
          await deletePlot(id);
      }
  };

  const handleUpdatePlot = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingPlot) {
          updatePlot(editingPlot);
          setEditingPlot(null);
      }
  };

  const handleExport = () => {
    const exportData = filteredPlots.map(p => ({
        'Nombre': p.name,
        'Tipo': p.type, 
        'Proyecto': projects.find(proj => proj.id === p.projectId)?.name || 'N/A',
        'Locación': locations.find(l => l.id === p.locationId)?.name || 'N/A',
        'Variedad': varieties.find(v => v.id === p.varietyId)?.name || 'N/A',
        'Lote Semilla': seedBatches.find(bat => bat.id === p.seedBatchId)?.batchCode || '-',
        'Etapa Actual': getLatestRecord(p.id)?.stage || '-',
        'Estado': p.status,
        'Fecha Siembra': p.sowingDate
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Planilla_Global");
    XLSX.writeFile(workbook, `HempC_Planilla_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const inputClass = "w-full border border-gray-300 dark:border-dark-border bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 p-2.5 rounded-lg focus:ring-2 focus:ring-hemp-500 outline-none transition-all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white">Planilla Global</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Control total de unidades de ensayo y producción.</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="bg-white dark:bg-dark-card p-1 rounded-xl flex border dark:border-dark-border shadow-sm">
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-hemp-600 text-white shadow-md' : 'text-gray-400'}`}><List size={20} /></button>
              <button onClick={() => setViewMode('gallery')} className={`p-2 rounded-lg transition ${viewMode === 'gallery' ? 'bg-hemp-600 text-white shadow-md' : 'text-gray-400'}`}><LayoutGrid size={20} /></button>
          </div>
          <button onClick={handleExport} className="flex-1 sm:flex-none border dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-black hover:bg-gray-50 transition shadow-sm flex items-center justify-center">
            <FileSpreadsheet size={18} className="mr-2 text-green-600" /> Exportar
          </button>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <div className="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border dark:border-dark-border grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar nombre..." 
                className="w-full pl-10 pr-4 py-2 border dark:border-dark-border bg-gray-50 dark:bg-slate-900 rounded-xl text-sm outline-none focus:ring-2 focus:ring-hemp-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <select className="px-3 py-2 border dark:border-dark-border bg-gray-50 dark:bg-slate-900 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-gray-300" value={filterLoc} onChange={e => setFilterLoc(e.target.value)}>
              <option value="all">Todas las Locaciones</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="px-3 py-2 border dark:border-dark-border bg-gray-50 dark:bg-slate-900 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-gray-300" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
              <option value="all">Cualquier Tipo</option>
              <option value="Ensayo">Solo Ensayos</option>
              <option value="Producción">Solo Producción</option>
          </select>
          <select className="px-3 py-2 border dark:border-dark-border bg-gray-50 dark:bg-slate-900 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-gray-300" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Todos los Estados</option>
              <option value="Activa">Activa</option>
              <option value="Cosechada">Cosechada</option>
              <option value="Cancelada">Cancelada</option>
          </select>
          <button onClick={() => { setSearchTerm(''); setFilterLoc('all'); setFilterProj('all'); setFilterType('all'); setFilterStatus('all'); }} className="text-xs font-black text-hemp-600 hover:text-hemp-700 uppercase tracking-widest text-center">Limpiar</button>
      </div>

      {viewMode === 'table' ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border dark:border-dark-border overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 uppercase font-black text-[10px] tracking-widest border-b dark:border-dark-border">
                <tr>
                  <th className="px-6 py-4">Lote / Parcela</th>
                  <th className="px-6 py-4">Genética</th>
                  <th className="px-6 py-4">Locación</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {filteredPlots.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic font-medium">No se encontraron registros coincidentes.</td></tr>
                ) : filteredPlots.map(p => {
                  const batch = seedBatches.find(b => b.id === p.seedBatchId);
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 group transition-colors">
                      <td className="px-6 py-4">
                          <div className="font-black text-gray-900 dark:text-white">{p.name}</div>
                          <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">{p.type} • {p.sowingDate}</div>
                      </td>
                      <td className="px-6 py-4">
                          <div className="text-hemp-700 dark:text-hemp-400 font-black">{vari?.name || 'S/D'}</div>
                          {batch && <div className="text-[10px] text-gray-400 font-mono">Lote: {batch.batchCode}</div>}
                      </td>
                      <td className="px-6 py-4">
                          <div className="text-gray-600 dark:text-gray-300 font-bold flex items-center">
                              <MapPin size={12} className="mr-1 text-blue-500 opacity-50"/>
                              {loc?.name || 'N/A'}
                          </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            p.status === 'Activa' ? 'bg-green-100 text-green-700' : 
                            p.status === 'Cosechada' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-1">
                          <button onClick={() => setQrPlot(p)} className="p-2 text-gray-400 hover:text-blue-600 transition" title="Generar Código QR"><QrCode size={18}/></button>
                          {isAdmin && (
                            <>
                                <button onClick={() => setEditingPlot(p)} className="p-2 text-gray-400 hover:text-hemp-600 transition" title="Editar Registro"><Edit2 size={18}/></button>
                                <button onClick={() => handleDeletePlot(p.id, p.name)} className="p-2 text-gray-400 hover:text-red-600 transition" title="Eliminar"><Trash2 size={18}/></button>
                            </>
                          )}
                          <Link to={`/plots/${p.id}`} className="p-2 text-hemp-600 hover:bg-hemp-50 dark:hover:bg-hemp-900/20 rounded-lg transition" title="Ir a Ficha Técnica"><ChevronRight size={20} /></Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlots.map(p => (
                  <div key={p.id} className="bg-white dark:bg-dark-card p-6 rounded-3xl shadow-sm border dark:border-dark-border hover:shadow-xl transition-all relative group overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 bg-hemp-600 text-white rounded-bl-2xl font-black text-[10px] uppercase tracking-widest">{p.status}</div>
                      <h4 className="font-black text-xl text-gray-800 dark:text-white mb-1">{p.name}</h4>
                      <p className="text-xs text-gray-500 mb-4 font-bold uppercase">{varieties.find(v => v.id === p.varietyId)?.name}</p>
                      
                      <div className="space-y-2 mb-6">
                          <div className="flex items-center text-xs text-gray-500"><MapPin size={14} className="mr-2 text-blue-500"/> {locations.find(l => l.id === p.locationId)?.name}</div>
                          <div className="flex items-center text-xs text-gray-500"><Calendar size={14} className="mr-2 text-hemp-500"/> Siembra: {p.sowingDate}</div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t dark:border-dark-border">
                          <div className="flex space-x-2">
                             <button onClick={() => setQrPlot(p)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-500 hover:text-blue-600 transition"><QrCode size={16}/></button>
                             {isAdmin && <button onClick={() => setEditingPlot(p)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-500 hover:text-hemp-600 transition"><Edit2 size={16}/></button>}
                          </div>
                          <Link to={`/plots/${p.id}`} className="bg-hemp-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-hemp-700 transition shadow-lg shadow-hemp-900/20">Ver Ficha</Link>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* EDIT MODAL */}
      {editingPlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-xl w-full p-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white flex items-center">
                        <Edit2 size={24} className="mr-2 text-hemp-600"/> Editar Parcela
                    </h2>
                    <button onClick={() => setEditingPlot(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-dark-border rounded-full transition dark:text-gray-400"><X size={24}/></button>
                </div>
                <form onSubmit={handleUpdatePlot} className="space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Identificador del Lote *</label>
                        <input required className={inputClass} value={editingPlot.name} onChange={e => setEditingPlot({...editingPlot, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Variedad Asignada</label>
                            <select className={inputClass} value={editingPlot.varietyId} onChange={e => setEditingPlot({...editingPlot, varietyId: e.target.value})}>
                                {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Estado Operativo</label>
                            <select className={inputClass} value={editingPlot.status} onChange={e => setEditingPlot({...editingPlot, status: e.target.value as any})}>
                                <option value="Activa">Activa</option>
                                <option value="Cosechada">Cosechada</option>
                                <option value="Cancelada">Cancelada</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Fecha de Siembra</label>
                        <input type="date" className={inputClass} value={editingPlot.sowingDate} onChange={e => setEditingPlot({...editingPlot, sowingDate: e.target.value})} />
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t dark:border-dark-border">
                        <button type="button" onClick={() => setEditingPlot(null)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-dark-border rounded-xl transition">Cancelar</button>
                        <button type="submit" className="px-10 py-2.5 bg-hemp-600 text-white rounded-xl font-black shadow-lg hover:bg-hemp-700 transition">Actualizar Registro</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrPlot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] shadow-2xl max-w-sm w-full p-10 text-center animate-in zoom-in-90 duration-300">
                <div className="flex justify-center mb-6">
                    <div className="bg-hemp-600 p-4 rounded-3xl text-white shadow-xl shadow-hemp-900/20">
                        <Sprout size={48} />
                    </div>
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-1">{qrPlot.name}</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-6">Identificador de Parcela</p>
                
                <div className="bg-gray-50 p-6 rounded-[32px] border-2 border-dashed border-gray-200 inline-block mb-8">
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/#/plots/' + qrPlot.id)}&color=166534`} 
                        alt="QR Code" 
                        className="w-48 h-48 mx-auto"
                    />
                </div>

                <div className="space-y-3">
                    <button onClick={() => window.print()} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center hover:bg-black transition shadow-lg">
                        <Printer size={18} className="mr-2" /> Imprimir Etiqueta
                    </button>
                    <button onClick={() => setQrPlot(null)} className="w-full text-gray-400 font-bold py-2 hover:text-gray-600 transition uppercase text-xs tracking-widest">Cerrar Ventana</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
