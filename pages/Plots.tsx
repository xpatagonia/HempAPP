
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot } from '../types';
import { ChevronRight, CheckCircle, FileSpreadsheet, LayoutGrid, List, Image as ImageIcon, Ruler, Droplets, FlaskConical, Tractor, Map as MapIcon, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Plots() {
  const { plots, locations, varieties, projects, currentUser, getLatestRecord, logs } = useAppContext();
  const [searchParams] = useSearchParams();
  
  // Set default to Table for performance
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
        const d = getLatestRecord(p.id);

        return {
            'Tipo': p.type || 'Ensayo',
            'Proyecto': pr?.name,
            'Locación': l?.name,
            'Variedad': v?.name,
            'Bloque/Lote': p.block,
            'Repetición': p.replicate,
            'Sup. Siembra': p.surfaceArea ? `${p.surfaceArea} ${p.surfaceUnit}` : '-',
            'Fecha Siembra': p.sowingDate,
            'Último Reg': d?.date || '-',
            'Etapa': d?.stage || '-',
            'Altura Planta': d?.plantHeight || '-',
            'Rendimiento': d?.yield || '-',
            'Observaciones': p.observations || '-',
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registro_Cultivos");
    XLSX.writeFile(workbook, "HempAPP_Planilla_Global.xlsx");
  };

  const getLatestPhoto = (plotId: string) => {
      const plotLogs = logs.filter(l => l.plotId === plotId && l.photoUrl).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return plotLogs.length > 0 ? plotLogs[0].photoUrl : null;
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase hidden sm:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Variedad</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase hidden md:table-cell">Locación</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase hidden sm:table-cell">Superficie</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPlots.length === 0 ? (
                    <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">
                            No se encontraron registros.
                        </td>
                    </tr>
                ) : filteredPlots.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 font-medium text-gray-900">
                          {p.name}
                          <div className="sm:hidden text-xs text-gray-500 mt-1">{loc?.name}</div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                          {p.type === 'Producción' ? (
                              <span className="flex items-center text-green-700 text-xs bg-green-50 px-2 py-0.5 rounded border border-green-100 w-fit"><Tractor size={10} className="mr-1"/> Prod.</span>
                          ) : (
                              <span className="flex items-center text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit"><FlaskConical size={10} className="mr-1"/> I+D</span>
                          )}
                      </td>
                      <td className="px-4 py-3 text-hemp-800 font-semibold">{vari?.name}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{loc?.name}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.surfaceArea ? `${p.surfaceArea} ${p.surfaceUnit}` : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'Activa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {p.status === 'Activa' && <CheckCircle size={10} className="mr-1"/>}
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <Link to={`/plots/${p.id}`} className="text-gray-400 hover:text-hemp-900 font-medium inline-flex items-center p-1.5 rounded hover:bg-gray-100 transition">
                            <span className="mr-1 text-xs">Ver Ficha</span> <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPlots.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  const latestPhoto = getLatestPhoto(p.id);
                  const latestData = getLatestRecord(p.id);

                  return (
                      <Link to={`/plots/${p.id}`} key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group flex flex-col h-full relative">
                          <div className="absolute top-2 left-2 z-10">
                              {p.type === 'Producción' ? (
                                  <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center"><Tractor size={10} className="mr-1"/> COMERCIAL</span>
                              ) : (
                                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center"><FlaskConical size={10} className="mr-1"/> ENSAYO</span>
                              )}
                          </div>
                          <div className="h-48 bg-gray-100 relative overflow-hidden">
                              {latestPhoto ? (
                                  <img src={latestPhoto} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50 pattern-grid-lg">
                                      {p.coordinates || (p.polygon && p.polygon.length > 0) ? (
                                          <><MapIcon size={32} className="mb-2 opacity-50" /><span className="text-xs font-medium">Ubicada</span></>
                                      ) : (
                                          <><ImageIcon size={32} className="mb-2 opacity-50" /><span className="text-xs font-medium">Sin datos</span></>
                                      )}
                                  </div>
                              )}
                              <div className="absolute top-2 right-2">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-sm uppercase ${p.status === 'Activa' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>{p.status}</span>
                              </div>
                              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
                                  <h3 className="text-white font-bold text-lg leading-tight shadow-black drop-shadow-md">{p.name}</h3>
                                  <p className="text-gray-200 text-xs">{vari?.name} • {loc?.name}</p>
                              </div>
                          </div>
                          <div className="p-4 flex-1 flex flex-col">
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Altura</span>
                                      <div className="text-sm font-bold text-gray-800 flex items-center"><Ruler size={14} className="mr-1 text-blue-500"/> {latestData?.plantHeight ? `${latestData.plantHeight} cm` : '-'}</div>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Superficie</span>
                                      <div className="text-sm font-bold text-gray-800 truncate">{p.surfaceArea ? `${p.surfaceArea} ${p.surfaceUnit}` : '-'}</div>
                                  </div>
                              </div>
                              <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                                  <div className="flex items-center"><Calendar size={12} className="mr-1" /> Siembra: {p.sowingDate}</div>
                                  {p.irrigationType && <div className="flex items-center"><Droplets size={12} className="mr-1 text-blue-400" /> {p.irrigationType}</div>}
                              </div>
                          </div>
                      </Link>
                  );
              })}
          </div>
      )}
    </div>
  );
}
