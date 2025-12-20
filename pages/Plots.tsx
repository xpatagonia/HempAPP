
import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot, Variety, Location, Project, TrialRecord } from '../types';
import { 
  ChevronRight, FileSpreadsheet, LayoutGrid, List, Tag, FlaskConical, 
  Tractor, Trash2, Edit2, QrCode, X, Save, Search, Filter, 
  MapPin, Calendar, Sprout, Printer, Ruler, Activity, CheckCircle2, AlertCircle, Download, ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Plots() {
  const { plots, locations, varieties, projects, currentUser, getLatestRecord, seedBatches, deletePlot, updatePlot, trialRecords } = useAppContext();
  const [searchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoc, setFilterLoc] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'Ensayo' | 'Producción'>('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal States
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [qrPlot, setQrPlot] = useState<Plot | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isClient = currentUser?.role === 'client';

  const filteredPlots = useMemo(() => plots.filter(p => {
      const latest = getLatestRecord(p.id);
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoc = filterLoc === 'all' || p.locationId === filterLoc;
      const matchStage = filterStage === 'all' || latest?.stage === filterStage;
      const matchType = filterType === 'all' || p.type === filterType;
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      let hasAccess = isAdmin || (isClient && locations.find(l => l.id === p.locationId)?.clientId === currentUser.clientId) || p.responsibleIds?.includes(currentUser?.id || '');
      return matchSearch && matchLoc && matchStage && matchType && matchStatus && hasAccess;
  }), [plots, searchTerm, filterLoc, filterStage, filterType, filterStatus, isAdmin, isClient, currentUser, trialRecords]);

  const handleDeletePlot = async (id: string, name: string) => {
      if (window.confirm(`¿Estás seguro de eliminar la unidad "${name}"? Se perderán todos los registros técnicos asociados.`)) {
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
        'Etapa Actual': getLatestRecord(p.id)?.stage || 'S/D',
        'Altura (cm)': getLatestRecord(p.id)?.plantHeight || '-',
        'Estado': p.status,
        'Fecha Siembra': p.sowingDate
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Planilla_Global");
    XLSX.writeFile(workbook, `HempC_Planilla_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-lg focus:ring-2 focus:ring-hemp-500 outline-none transition-all";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center">
                <LayoutGrid className="mr-3 text-hemp-600" size={32}/> Planilla de Unidades
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium ml-11">Control centralizado de unidades productivas y de investigación.</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="bg-white dark:bg-slate-900 p-1 rounded-xl flex border dark:border-slate-800 shadow-sm">
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-hemp-600 text-white shadow-md' : 'text-gray-400'}`}><List size={20} /></button>
              <button onClick={() => setViewMode('gallery')} className={`p-2 rounded-lg transition ${viewMode === 'gallery' ? 'bg-hemp-600 text-white shadow-md' : 'text-gray-400'}`}><LayoutGrid size={20} /></button>
          </div>
          <button onClick={handleExport} className="flex-1 sm:flex-none border dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-black hover:bg-gray-50 transition shadow-sm flex items-center justify-center">
            <FileSpreadsheet size={18} className="mr-2 text-green-600" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por identificador..." 
                className="w-full pl-10 pr-4 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none focus:ring-2 focus:ring-hemp-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <select className="px-3 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-gray-300" value={filterLoc} onChange={e => setFilterLoc(e.target.value)}>
              <option value="all">Todas las Locaciones</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="px-3 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-gray-300" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
              <option value="all">Ensayo & Prod.</option>
              <option value="Ensayo">Solo Ensayos</option>
              <option value="Producción">Solo Producción</option>
          </select>
          <select className="px-3 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-gray-300" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Todos los Estados</option>
              <option value="Activa">Activa</option>
              <option value="Cosechada">Cosechada</option>
              <option value="Cancelada">Cancelada</option>
          </select>
          <button onClick={() => { setSearchTerm(''); setFilterLoc('all'); setFilterStage('all'); setFilterType('all'); setFilterStatus('all'); }} className="text-xs font-black text-hemp-600 hover:text-hemp-700 uppercase tracking-widest text-center">Reset</button>
      </div>

      {viewMode === 'table' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 uppercase font-black text-[10px] tracking-widest border-b dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Identificación</th>
                  <th className="px-6 py-4">Variedad / Tipo</th>
                  <th className="px-6 py-4">Locación</th>
                  <th className="px-6 py-4">Último Monitoreo</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredPlots.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-gray-400 italic font-medium">No se encontraron registros con los filtros actuales.</td></tr>
                ) : filteredPlots.map(p => {
                  const latest = getLatestRecord(p.id);
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 group transition-colors">
                      <td className="px-6 py-4">
                          <div className="font-black text-gray-900 dark:text-white text-base">{p.name}</div>
                          <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Siembra: {p.sowingDate}</div>
                      </td>
                      <td className="px-6 py-4">
                          <div className="text-hemp-700 dark:text-hemp-400 font-black flex items-center">
                            <Sprout size={14} className="mr-1.5 opacity-50"/>
                            {vari?.name || 'S/D'}
                          </div>
                          <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border inline-block mt-1 ${p.type === 'Ensayo' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                            {p.type}
                          </div>
                      </td>
                      <td className="px-6 py-4">
                          <div className="text-gray-600 dark:text-gray-300 font-bold flex items-center">
                              <MapPin size={12} className="mr-1 text-blue-500 opacity-50"/>
                              {loc?.name || 'N/A'}
                          </div>
                      </td>
                      <td className="px-6 py-4">
                          {latest ? (
                              <div className="space-y-1">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-100">{latest.stage}</span>
                                  <div className="flex items-center text-[11px] font-bold text-gray-500">
                                      <Ruler size={10} className="mr-1"/> {latest.plantHeight || 0} cm
                                  </div>
                              </div>
                          ) : (
                              <span className="text-gray-300 italic text-xs">Sin registros</span>
                          )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center ${
                            p.status === 'Activa' ? 'bg-green-100 text-green-700' : 
                            p.status === 'Cosechada' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {p.status === 'Activa' && <Activity size={10} className="mr-1.5 animate-pulse"/>}
                            {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setQrPlot(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="Generar Etiqueta QR"><QrCode size={18}/></button>
                          {isAdmin && (
                            <>
                                <button onClick={() => setEditingPlot(p)} className="p-2 text-gray-400 hover:text-hemp-600 hover:bg-hemp-50 dark:hover:bg-hemp-900/20 rounded-lg transition"><Edit2 size={18}/></button>
                                <button onClick={() => handleDeletePlot(p.id, p.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><Trash2 size={18}/></button>
                            </>
                          )}
                          <Link to={`/plots/${p.id}`} className="p-2 text-hemp-600 hover:bg-hemp-50 dark:hover:bg-hemp-900/20 rounded-lg transition"><ChevronRight size={20} /></Link>
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
                  <div key={p.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border dark:border-slate-800 hover:shadow-xl transition-all relative group overflow-hidden flex flex-col">
                      <div className="absolute top-0 right-0 p-3 bg-hemp-600 text-white rounded-bl-2xl font-black text-[10px] uppercase tracking-widest">{p.status}</div>
                      <h4 className="font-black text-xl text-gray-800 dark:text-white mb-1">{p.name}</h4>
                      <p className="text-xs text-gray-500 mb-4 font-bold uppercase">{varieties.find(v => v.id === p.varietyId)?.name} • {p.type}</p>
                      
                      <div className="space-y-2 mb-6 flex-1">
                          <div className="flex items-center text-xs text-gray-500"><MapPin size={14} className="mr-2 text-blue-500"/> {locations.find(l => l.id === p.locationId)?.name}</div>
                          <div className="flex items-center text-xs text-gray-500"><Calendar size={14} className="mr-2 text-hemp-500"/> Siembra: {p.sowingDate}</div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t dark:border-slate-800">
                          <div className="flex space-x-2">
                             <button onClick={() => setQrPlot(p)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-500 hover:text-blue-600 transition"><QrCode size={16}/></button>
                             {isAdmin && <button onClick={() => setEditingPlot(p)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-500 hover:text-hemp-600 transition"><Edit2 size={16}/></button>}
                          </div>
                          <Link to={`/plots/${p.id}`} className="bg-hemp-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-hemp-700 transition shadow-lg shadow-hemp-900/20">Detalles</Link>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* QR MODAL (NUEVO) */}
      {qrPlot && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-sm w-full p-10 text-center animate-in zoom-in-95 relative overflow-hidden">
                  <button onClick={() => setQrPlot(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition dark:text-white"><X size={24}/></button>
                  
                  <div className="mb-8">
                    <div className="bg-hemp-50 dark:bg-hemp-900/20 p-4 rounded-3xl inline-block mb-4">
                        <QrCode size={40} className="text-hemp-600"/>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Etiqueta de Campo</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Identificador: {qrPlot.name}</p>
                  </div>

                  <div className="bg-white p-6 rounded-[32px] shadow-inner border border-slate-100 mb-8 inline-block mx-auto">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/#/plots/' + qrPlot.id)}`} 
                        alt="QR Code" 
                        className="w-48 h-48"
                      />
                  </div>

                  <div className="space-y-4">
                    <button onClick={() => window.print()} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all">
                        <Printer size={18} className="mr-2"/> Imprimir Etiqueta
                    </button>
                    <p className="text-[10px] text-slate-400 font-medium px-6 leading-relaxed">Escanee este código para acceder directamente a la bitácora técnica desde cualquier dispositivo móvil.</p>
                  </div>
              </div>
          </div>
      )}

      {/* EDIT MODAL */}
      {editingPlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-xl w-full p-10 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Editar Unidad</h2>
                    <button onClick={() => setEditingPlot(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition dark:text-gray-400"><X size={24}/></button>
                </div>
                <form onSubmit={handleUpdatePlot} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Identificador Único *</label>
                        <input required className={inputClass} value={editingPlot.name} onChange={e => setEditingPlot({...editingPlot, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Tipo de Unidad</label>
                            <select className={inputClass} value={editingPlot.type} onChange={e => setEditingPlot({...editingPlot, type: e.target.value as any})}>
                                <option value="Ensayo">Ensayo (I+D)</option>
                                <option value="Producción">Producción (Escala)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Estatus Actual</label>
                            <select className={inputClass} value={editingPlot.status} onChange={e => setEditingPlot({...editingPlot, status: e.target.value as any})}>
                                <option value="Activa">Activa</option>
                                <option value="Cosechada">Cosechada</option>
                                <option value="Cancelada">Cancelada</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Fecha de Siembra</label>
                        <input type="date" className={inputClass} value={editingPlot.sowingDate} onChange={e => setEditingPlot({...editingPlot, sowingDate: e.target.value})} />
                    </div>
                    <div className="flex justify-end gap-3 pt-8 border-t dark:border-slate-800 mt-4">
                        <button type="button" onClick={() => setEditingPlot(null)} className="px-8 py-3 text-gray-500 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" className="px-10 py-3 bg-hemp-600 text-white rounded-2xl font-black shadow-lg hover:bg-hemp-700 transition uppercase text-[10px] tracking-widest">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
