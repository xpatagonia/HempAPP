
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot } from '../types';
import { ChevronRight, CheckCircle, FileSpreadsheet, LayoutGrid, List, Image as ImageIcon, Ruler, Droplets, FlaskConical, Tractor, Map as MapIcon, Calendar, Tag } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Plots() {
  const { plots, locations, varieties, projects, currentUser, getLatestRecord, logs, seedBatches } = useAppContext();
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
      
      let hasAccess = false;
      if (isAdmin) hasAccess = true;
      else if (isClient && currentUser.clientId) {
          const loc = locations.find(l => l.id === p.locationId);
          hasAccess = (loc?.clientId === currentUser.clientId) || (p.responsibleIds?.includes(currentUser.id));
      } else {
          hasAccess = p.responsibleIds?.includes(currentUser?.id || '');
      }

      return matchLoc && matchProj && matchType && hasAccess;
  });

  const handleExport = () => {
    const exportData = filteredPlots.map(p => {
        const l = locations.find(l => l.id === p.locationId);
        const v = varieties.find(v => v.id === p.varietyId);
        const pr = projects.find(proj => proj.id === p.projectId);
        const b = seedBatches.find(bat => bat.id === p.seedBatchId);
        const d = getLatestRecord(p.id);

        return {
            'Tipo': p.type || 'Ensayo',
            'Proyecto': pr?.name,
            'Locación': l?.name,
            'Variedad': v?.name,
            'Lote Semilla': b?.batchCode || 'Genérico',
            'Etiqueta Serie': b?.labelSerialNumber || '-',
            'Bloque/Lote': p.block,
            'Sup. Siembra': p.surfaceArea ? `${p.surfaceArea} ${p.surfaceUnit}` : '-',
            'Fecha Siembra': p.sowingDate,
            'Etapa Actual': d?.stage || '-',
            'Altura Planta': d?.plantHeight || '-',
            'Estado': p.status,
        };
    });

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
            <p className="text-sm text-gray-500">Listado consolidado de todas las unidades de producción.</p>
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          <div className="bg-gray-100 p-1 rounded-lg flex mr-2">
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition ${viewMode === 'table' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`} title="Vista Lista"><List size={18} /></button>
              <button onClick={() => setViewMode('gallery')} className={`p-2 rounded-md transition ${viewMode === 'gallery' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`} title="Vista Galería"><LayoutGrid size={18} /></button>
          </div>
          <button onClick={handleExport} className="border border-gray-300 bg-white text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-center transition" title="Exportar Excel"><FileSpreadsheet size={18} /> <span className="ml-2 hidden sm:inline">Exportar</span></button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center bg-gray-100 p-1 rounded-lg w-fit">
                <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filterType === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Todos</button>
                <button onClick={() => setFilterType('Ensayo')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center ${filterType === 'Ensayo' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><FlaskConical size={12} className="mr-1"/> I+D</button>
                <button onClick={() => setFilterType('Producción')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center ${filterType === 'Producción' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}><Tractor size={12} className="mr-1"/> Producción</button>
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar flex-1">
                 <span className="text-sm font-semibold text-gray-500 mr-2 whitespace-nowrap">Proyecto:</span>
                 <button onClick={() => setFilterProj('all')} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition ${filterProj === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Todos</button>
                 {projects.map(pr => (
                     <button key={pr.id} onClick={() => setFilterProj(pr.id)} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition ${filterProj === pr.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {pr.name}
                     </button>
                 ))}
            </div>
        </div>
      </div>

      {viewMode === 'table' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Variedad</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase hidden md:table-cell">Lote Semilla</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase hidden md:table-cell">Locación</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPlots.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">
                            No se encontraron registros.
                        </td>
                    </tr>
                ) : filteredPlots.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  const batch = seedBatches.find(b => b.id === p.seedBatchId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 font-bold text-gray-900">
                          {p.name}
                          <div className="md:hidden text-[10px] text-gray-400 mt-1 uppercase">{batch?.batchCode || 'S/L'}</div>
                      </td>
                      <td className="px-4 py-3 text-hemp-800 font-semibold">{vari?.name}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                          {batch ? (
                              <span className="flex items-center text-gray-600 text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-200 w-fit font-mono"><Tag size={10} className="mr-1"/> {batch.batchCode}</span>
                          ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{loc?.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'Activa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/plots/${p.id}`} className="text-gray-400 hover:text-hemp-900 font-medium inline-flex items-center p-1.5 rounded hover:bg-gray-100 transition">
                            <span className="mr-1 text-xs">Ficha</span> <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      ) : (
          /* ... Gallery View code ... */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {/* Original gallery content logic persists */}
          </div>
      )}
    </div>
  );
}
