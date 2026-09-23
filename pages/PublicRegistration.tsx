
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    User, Mail, Phone, MapPin, Building, 
    ArrowLeft, CheckCircle2, Loader2, Sparkles,
    Landmark, Sprout, Waves, ShieldCheck
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

export default function PublicRegistration() {
    const { addClient, appName } = useAppContext();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        province: 'Chubut',
        type: 'Productor Pequeño (0-5 ha)',
        interest: [] as string[]
    });

    const programs = [
        "Cultivos con Impacto",
        "Ecosistemas Circulares",
        "Innovación y Tecnologías Verdes",
        "Carbono Neutralidad Activa",
        "Regeneración de Suelos"
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const success = await addClient({
                id: generateId(),
                name: formData.name,
                contactName: formData.contactName,
                contactPhone: formData.phone,
                email: formData.email,
                type: formData.type as any,
                isNetworkMember: false,
                membershipLevel: 'En Observación',
                notes: `REGISTRO PÚBLICO - Intereses: ${formData.interest.join(', ')}`
            });
            if (success) setIsSuccess(true);
        } catch (err) {
            alert("Error al enviar solicitud.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white p-10 rounded-[48px] shadow-2xl text-center animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-brand rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                        <CheckCircle2 size={48} className="text-slate-900" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic mb-4">¡Solicitud Enviada!</h1>
                    <p className="text-slate-500 font-medium leading-relaxed mb-10">
                        Gracias por querer formar parte de la **Red Cooperativa del Cáñamo Industrial Argentino**. Nuestro equipo técnico auditará tu perfil y se pondrá en contacto pronto.
                    </p>
                    <Link to="/login" className="block w-full py-5 bg-hemp-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        );
    }

    const inputClass = "w-full border-b-2 border-slate-100 p-3 focus:border-hemp-600 outline-none transition-all text-sm font-bold text-slate-800 placeholder-slate-300";

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row items-stretch">
            {/* Hero Informativo con color Brand Lima */}
            <div className="hidden lg:flex lg:w-2/5 bg-slate-900 p-16 flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-brand italic uppercase tracking-tighter mb-8 leading-tight">
                        La Red <br />Cooperativa <br />del Cáñamo
                    </h1>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-sm mb-12 italic">
                        "Industrial Argentino"
                    </p>

                    <div className="space-y-8">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-brand rounded-2xl text-slate-900"><Sprout size={24}/></div>
                            <div>
                                <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Genética Certificada</h4>
                                <p className="text-slate-500 text-xs font-bold leading-relaxed">Acceso exclusivo a semillas europeas de alto rendimiento.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-600 rounded-2xl text-white"><ShieldCheck size={24}/></div>
                            <div>
                                <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Trazabilidad Nucleus</h4>
                                <p className="text-slate-500 text-xs font-bold leading-relaxed">Soporte tecnológico y auditoría agronómica satelital.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative z-10 border-t border-white/10 pt-8">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">{appName} Nucleus Industry</p>
                </div>
                <div className="absolute top-1/2 -right-24 w-64 h-64 border-[30px] border-brand/5 rounded-full"></div>
            </div>

            {/* Formulario con botones Verdes */}
            <div className="flex-1 p-8 md:p-16 flex items-center justify-center">
                <div className="w-full max-w-2xl space-y-12">
                    <div className="flex justify-between items-center">
                        <Link to="/login" className="text-slate-400 hover:text-slate-900 flex items-center text-[10px] font-black uppercase tracking-widest group">
                            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform"/> Volver al Login
                        </Link>
                        <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-3 py-1 rounded-full tracking-tighter italic">PatagonianC LTDA</span>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Alta de Productor</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Postulación para la Red Cooperativa</p>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nombre del Campo / Organización</label>
                                <input required className={inputClass} placeholder="Ej: Establecimiento La Aurora" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nombre Completo Responsable</label>
                                <input required className={inputClass} placeholder="Juan Pérez" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Correo Electrónico</label>
                                <input required type="email" className={inputClass} placeholder="contacto@empresa.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">WhatsApp / Teléfono</label>
                                <input required className={inputClass} placeholder="+54 9 280..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Escala de Producción</label>
                                <select className={inputClass} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                    <option value="Productor Pequeño (0-5 ha)">Pequeño (0-5 ha)</option>
                                    <option value="Productor Mediano (5-15 ha)">Mediano (5-15 ha)</option>
                                    <option value="Productor Grande (>20 ha)">Grande (+20 ha)</option>
                                    <option value="Empresa Privada">Empresa / Grupo</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-3">Programas de Interés</label>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {programs.map(p => (
                                        <label key={p} className={`flex items-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                                            formData.interest.includes(p) ? 'border-hemp-600 bg-hemp-50' : 'border-slate-50 hover:border-slate-200'
                                        }`}>
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={formData.interest.includes(p)}
                                                onChange={() => {
                                                    const current = formData.interest;
                                                    setFormData({...formData, interest: current.includes(p) ? current.filter(i => i !== p) : [...current, p]});
                                                }}
                                            />
                                            <span className="text-[10px] font-black uppercase text-slate-700">{p}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-8">
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="w-full bg-hemp-600 hover:bg-hemp-700 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin mr-3"/> : <Sparkles className="mr-3 text-brand"/>}
                                Enviar Postulación a la Red
                            </button>
                            <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-6 italic">
                                Al enviar, acepta ser contactado por los auditores de PatagonianC LTDA.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
