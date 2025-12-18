
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ChevronRight, FileSpreadsheet, LayoutGrid, List, Tag, FlaskConical, Tractor, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Plots() {
  const { plots, locations, varieties, projects, currentUser, getLatestRecord, seedBatches, deletePlot } = useAppContext();
  const [searchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [filterLoc, setFilterLoc] = useState('all');
  const [filterProj, setFilterProj] = useState(searchParams.get('project') || 'all');
  const [filterType, setFilterType] = useState<'all' | 'Ensayo' | 'Producción'>('all');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isClient = currentUser?.role === 'client';

  const filteredPlots = plots.filter(p => {
      const matchLoc = filterLoc === 'all' || p.locationId === filterLoc;
      const matchProj = filterProj === 'all' || p.projectId === filterProj;
      const matchType = filterType === 'all' || p.type === filterType;
      let hasAccess = isAdmin || (isClient && locations.find(l => l.id === p.locationId)?.clientId === currentUser.clientId) || p.responsibleIds?.includes(currentUser?.id || '');
      return matchLoc && matchProj && matchType && hasAccess;
  });

  const handleDeletePlot = async (id: string, name: string) => {
      if (window.confirm(`¿Estás seguro de eliminar el lote "${name}"? Se perderán todos los registros técnicos asociados.`)) {
          await deletePlot(id);
      }
  };

  const handleExport = () => {
    const exportData = filteredPlots.map(p => ({
        'Tipo': p.type, 'Proyecto': projects.find(proj => proj.id === p.projectId)?.name,
        'Locación': locations.find(l => l.id === p.locationId)?.name,
        'Variedad': varieties.find(v => v.id === p.varietyId)?.name,
        'Lote Semilla': seedBatches.find(bat => bat.id === p.seedBatchId)?.batchCode || '-',
        'Etapa Actual': getLatestRecord(p.id)?.stage || '-',
        'Estado': p.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Planilla_Global");
    XLSX.writeFile(workbook, `HempC_Planilla_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Planilla Global de Cultivos</h1>
            <p className="text-sm text-gray-500">Unidades de ensayo y producción activas.</p>
        </div>
        <div className="flex space-x-2">
          <div className="bg-gray-100 p-1 rounded-lg flex mr-2">
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition ${viewMode === 'table' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}><List size={18} /></button>
              <button onClick={() => setViewMode('gallery')} className={`p-2 rounded-md transition ${viewMode === 'gallery' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}><LayoutGrid size={18} /></button>
          </div>
          <button onClick={handleExport} className="border border-gray-300 bg-white text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 flex items-center transition"><FileSpreadsheet size={18} /> <span className="ml-2">Exportar</span></button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${filterType === 'all' ? 'bg-white shadow' : 'text-gray-500'}`}>Todos</button>
              <button onClick={() => setFilterType('Ensayo')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${filterType === 'Ensayo' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><FlaskConical size={12} className="mr-1"/> I+D</button>
              <button onClick={() => setFilterType('Producción')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${filterType === 'Producción' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}><Tractor size={12} className="mr-1"/> Producción</button>
          </div>
      </div>

      {viewMode === 'table' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[10px]">
                <tr>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Variedad</th>
                  <th className="px-6 py-4">Lote Semilla</th>
                  <th className="px-6 py-4">Locación</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPlots.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">No se encontraron registros.</td></tr>
                ) : filteredPlots.map(p => {
                  const batch = seedBatches.find(b => b.id === p.seedBatchId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 group transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                      <td className="px-6 py-4 text-hemp-800 font-semibold">{varieties.find(v => v.id === p.varietyId)?.name}</td>
                      <td className="px-6 py-4">
                          {batch ? (
                              <span className="flex items-center text-gray-600 text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-200 w-fit font-mono"><Tag size={10} className="mr-1 text-hemp-600"/> {batch.batchCode}</span>
                          ) : <span className="text-gray-300 italic text-[10px]">S/L</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{locations.find(l => l.id === p.locationId)?.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.status === 'Activa' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{p.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-3">
                          {isAdmin && (
                            <button onClick={() => handleDeletePlot(p.id, p.name)} className="p-1 text-gray-300 hover:text-red-600 transition" title="Eliminar Lote">
                              <Trash2 size={16}/>
                            </button>
                          )}
                          <Link to={`/plots/${p.id}`} className="text-hemp-600 hover:text-hemp-900 font-black inline-flex items-center group-hover:translate-x-1 transition-transform">Ficha <ChevronRight size={16} /></Link>
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
                  <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow relative group">
                      {isAdmin && (
                        <button onClick={() => handleDeletePlot(p.id, p.name)} className="absolute top-4 right-4 p-2 bg-white text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition rounded-lg border shadow-sm" title="Eliminar">
                          <Trash2 size={16}/>
                        </button>
                      )}
                      <Link to={`/plots/${p.id}`} className="block">
                        <h4 className="font-black text-gray-800 mb-1">{p.name}</h4>
                        <p className="text-xs text-gray-500 mb-3">{varieties.find(v => v.id === p.varietyId)?.name}</p>
                        <div className="flex justify-between items-end border-t pt-3">
                            <span className="text-[10px] text-gray-400 font-black uppercase">{p.type}</span>
                            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-bold uppercase border border-green-100">{p.status}</span>
                        </div>
                      </Link>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}
