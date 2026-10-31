import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Users, 
  Upload, 
  PlusCircle, 
  LogOut, 
  ShieldAlert, 
  CreditCard, 
  Stethoscope,
  TrendingUp,
  Search,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  AlertCircle,
  Edit3,
  Sliders,
  Pill,
  Sparkles,
  History,
  Thermometer,
  Calendar,
  ChevronRight,
  Bell,
  Trash2
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [criticalAlert, setCriticalAlert] = useState(null);
  
  // Login State
  const [loginMode, setLoginMode] = useState('patient'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [patientIdInput, setPatientIdInput] = useState('');

  // Axios Security Header
  useEffect(() => {
    if (user?.role) {
      axios.defaults.headers.common['X-Role'] = user.role;
    } else {
      delete axios.defaults.headers.common['X-Role'];
    }
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (loginMode === 'admin') {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        const res = await axios.post(`${API_BASE}/login`, formData);
        setUser(res.data);
        setView('admin');
      } else {
        // Patient Login: Verify ID and set session
        try {
          const res = await axios.get(`${API_BASE}/patient/${patientIdInput}`);
          setUser({ role: 'patient', patient_id: patientIdInput, ...res.data });
          setView('patient');
        } catch (err) {
          setError("Invalid Patient ID");
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    }
  };

  const logout = () => {
    setUser(null);
    setView('login');
    setEmail('');
    setPassword('');
    setPatientIdInput('');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <AnimatePresence>
        {criticalAlert && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-red-500 rounded-2xl p-4 shadow-2xl flex items-center gap-4 border border-red-400">
              <div className="bg-white/20 p-2 rounded-xl">
                <AlertTriangle className="text-white w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white uppercase text-xs tracking-widest">⚠ CRITICAL VITAL ALERT</h4>
                <p className="text-white font-medium">{criticalAlert}</p>
              </div>
              <button onClick={() => setCriticalAlert(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <XCircle className="w-5 h-5 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {view === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-[#1e293b] rounded-3xl p-8 shadow-2xl border border-white/5"
          >
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-indigo-500/10 rounded-2xl">
                <Activity className="w-12 h-12 text-indigo-500" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent italic">
              VitalGuard AI
            </h1>
            <p className="text-gray-400 text-center mb-8">Smart Hospital Management System</p>

            <div className="flex bg-[#0f172a] p-1 rounded-xl mb-8">
              {['patient', 'admin'].map(mode => (
                <button 
                  key={mode}
                  onClick={() => {setLoginMode(mode); setError('')}}
                  className={`flex-1 py-2 rounded-lg font-medium capitalize transition-all ${loginMode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {loginMode === 'admin' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Admin Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Patient ID</label>
                  <input type="text" value={patientIdInput} onChange={(e) => setPatientIdInput(e.target.value)} required className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3" />
                </div>
              )}

              {error && <div className="p-3 bg-red-500/10 text-red-400 text-sm rounded-lg flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}

              <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
                Access System <ChevronRight size={20}/>
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {view === 'admin' && <AdminPanel logout={logout} onSelectPatient={(pid) => { setPatientIdInput(pid); setView('patient_detail'); }} setAlert={setCriticalAlert} />}
      {view === 'patient_detail' && <PatientDashboard patient_id={patientIdInput} role={user.role} logout={() => setView('admin')} setAlert={setCriticalAlert} onDischarge={() => setView('discharge_page')} />}
      {view === 'patient' && <PatientDashboard patient_id={user.patient_id} role={user.role} logout={logout} setAlert={setCriticalAlert} onDischarge={() => setView('discharge_page')} />}
      {view === 'discharge_page' && <DischargePage patient_id={user?.role === 'patient' ? user.patient_id : patientIdInput} role={user.role} goBack={() => setView(user?.role === 'patient' ? 'patient' : 'patient_detail')} />}
    </div>
  );
}

function AdminPanel({ logout, onSelectPatient, setAlert }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('registry'); // 'registry', 'scan', 'pharmacy'
  const [patientFilter, setPatientFilter] = useState('all'); // 'all', 'admitted', 'discharged'

  // Scan state
  const [scanPatientId, setScanPatientId] = useState('');
  const [scanMode, setScanMode] = useState('ocr'); // 'ocr' or 'manual'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadingScan, setUploadingScan] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [manualVitals, setManualVitals] = useState({
    heart_rate: '',
    spo2: '',
    bp: '',
    resp_rate: '',
    temperature: ''
  });
  const [isEditingScan, setIsEditingScan] = useState(false);
  const [editVitalsData, setEditVitalsData] = useState({
    heart_rate: '',
    spo2: '',
    bp: '',
    resp_rate: '',
    temperature: ''
  });

  const applyPreset = (preset) => {
    if (preset === 'normal') {
      setManualVitals({ heart_rate: '76', spo2: '98', bp: '120/80', resp_rate: '16', temperature: '37.0' });
    } else if (preset === 'high_risk') {
      setManualVitals({ heart_rate: '128', spo2: '88', bp: '155/96', resp_rate: '26', temperature: '39.2' });
    } else if (preset === 'critical_tachy') {
      setManualVitals({ heart_rate: '151', spo2: '84', bp: '190/115', resp_rate: '32', temperature: '40.2' });
    }
  };

  // Pharmacy state
  const [pharmPatientId, setPharmPatientId] = useState('');
  const [pharmError, setPharmError] = useState('');
  const [pharmSuccess, setPharmSuccess] = useState('');
  const [medQuery, setMedQuery] = useState('');
  const [medSuggestions, setMedSuggestions] = useState([]);

  const handleMedQueryChange = async (val) => {
    setMedQuery(val);
    setPharmError('');
    if (val.trim().length >= 2) {
      try {
        const res = await axios.get(`${API_BASE}/search_medicines?q=${encodeURIComponent(val)}`);
        setMedSuggestions(res.data || []);
      } catch (e) {
        setMedSuggestions([]);
      }
    } else {
      setMedSuggestions([]);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API_BASE}/patients`);
      setPatients(res.data);
      if (res.data && res.data.length > 0) {
        setScanPatientId(prev => prev || res.data[0].patient_id);
        setPharmPatientId(prev => prev || res.data[0].patient_id);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchPatients(); }, []);

  const registerPatient = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const res = await axios.post(`${API_BASE}/register_patient`, formData, {
        headers: { 'X-Role': 'admin' }
      });
      alert(`Patient Registered! ID: ${res.data.patient_id}`);
      fetchPatients();
      e.target.reset();
    } catch (err) {
      alert("Registration failed: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setScanError('');
      setScanResult(null);
    }
  };

  const uploadVitals = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!scanPatientId.trim()) {
      setScanError("Please select or specify a Patient ID.");
      return;
    }
    if (scanMode === 'ocr' && !selectedFile) {
      setScanError("Please select or drop a monitor snapshot image.");
      return;
    }
    setUploadingScan(true);
    setScanError('');
    setScanResult(null);

    const formData = new FormData();
    formData.append('patient_id', scanPatientId.trim().toLowerCase());
    if (scanMode === 'ocr' && selectedFile) {
      formData.append('image', selectedFile);
    }
    if (manualVitals.heart_rate) formData.append('heart_rate', manualVitals.heart_rate);
    if (manualVitals.spo2) formData.append('spo2', manualVitals.spo2);
    if (manualVitals.bp) formData.append('bp', manualVitals.bp);
    if (manualVitals.resp_rate) formData.append('resp_rate', manualVitals.resp_rate);
    if (manualVitals.temperature) formData.append('temperature', manualVitals.temperature);

    const endpoint = (scanMode === 'ocr' && selectedFile) ? `${API_BASE}/upload_vitals` : `${API_BASE}/add_vitals`;

    try {
      const res = await axios.post(endpoint, formData, {
        headers: { 'X-Role': 'admin' }
      });
      if (res.data.critical_alerts?.length > 0) {
        setAlert(res.data.critical_alerts[0]);
      } else if (res.data.risk_alerts?.length > 0) {
        setAlert(res.data.risk_alerts[0]);
      } else {
        setAlert(null); // Next vitals good: clear alert popup
      }
      setScanResult(res.data);
      if (res.data.vitals) {
        setEditVitalsData({
          heart_rate: res.data.vitals.heart_rate ?? '',
          spo2: res.data.vitals.spo2 ?? '',
          bp: res.data.vitals.bp ?? '',
          resp_rate: res.data.vitals.resp_rate ?? '',
          temperature: res.data.vitals.temperature ?? ''
        });
      }
    } catch (err) {
      setScanError(err.response?.data?.detail || err.message || "Error analyzing monitor snapshot");
    } finally {
      setUploadingScan(false);
    }
  };

  const handleSaveEditedVitals = async () => {
    setUploadingScan(true);
    const formData = new FormData();
    formData.append('patient_id', scanPatientId.trim().toLowerCase());
    if (editVitalsData.heart_rate) formData.append('heart_rate', editVitalsData.heart_rate);
    if (editVitalsData.spo2) formData.append('spo2', editVitalsData.spo2);
    if (editVitalsData.bp) formData.append('bp', editVitalsData.bp);
    if (editVitalsData.resp_rate) formData.append('resp_rate', editVitalsData.resp_rate);
    if (editVitalsData.temperature) formData.append('temperature', editVitalsData.temperature);

    try {
      const res = await axios.post(`${API_BASE}/add_vitals`, formData, {
        headers: { 'X-Role': 'admin' }
      });
      if (res.data.critical_alerts?.length > 0) {
        setAlert(res.data.critical_alerts[0]);
      } else if (res.data.risk_alerts?.length > 0) {
        setAlert(res.data.risk_alerts[0]);
      } else {
        setAlert(null); // Next vitals good: clear alert popup
      }
      setScanResult(res.data);
      setIsEditingScan(false);
    } catch (err) {
      setScanError(err.response?.data?.detail || err.message || "Error saving adjusted vitals");
    } finally {
      setUploadingScan(false);
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="h-20 border-b border-white/5 bg-[#1e293b]/50 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="text-indigo-500" />
          <span className="font-bold text-xl tracking-tight">Admin Console</span>
        </div>
        <div className="flex bg-[#0f172a] p-1 rounded-xl">
          {['registry', 'scan', 'pharmacy'].map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize ${view === v ? 'bg-indigo-600' : 'text-gray-400'}`}>{v}</button>
          ))}
        </div>
        <button onClick={logout} className="text-gray-400 hover:text-white transition-colors"><LogOut/></button>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {view === 'registry' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-[#1e293b] rounded-3xl p-8 border border-white/5 h-fit sticky top-28 shadow-xl">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6"><PlusCircle className="text-indigo-400"/> New Registration</h2>
              <form onSubmit={registerPatient} className="space-y-4">
                <input name="name" placeholder="Full Name" required className="w-full bg-[#0f172a] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-indigo-500" />
                <div className="grid grid-cols-2 gap-4">
                  <input name="age" type="number" placeholder="Age" required className="w-full bg-[#0f172a] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-indigo-500" />
                  <input name="doctor" placeholder="Doctor" required className="w-full bg-[#0f172a] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-indigo-500" />
                </div>
                <input name="disease" placeholder="Primary Diagnosis" required className="w-full bg-[#0f172a] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-indigo-500" />
                <input name="bed_number" placeholder="Bed / Ward" required className="w-full bg-[#0f172a] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-indigo-500" />
                <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all">Register Patient</button>
              </form>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold flex items-center gap-3"><Users className="text-purple-400"/> Registered Patients</h2>
                <div className="flex items-center bg-[#0f172a] p-1 rounded-xl border border-white/5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPatientFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${patientFilter === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    All ({patients.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientFilter('admitted')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${patientFilter === 'admitted' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    Admitted ({patients.filter(p => !p.discharge && p.status !== 'discharged').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientFilter('discharged')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${patientFilter === 'discharged' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    Discharged ({patients.filter(p => p.discharge || p.status === 'discharged').length})
                  </button>
                </div>
              </div>
              {loading ? <div className="text-gray-500 italic">Fetching patients...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patients
                    .filter(p => {
                      const isDischarged = p.discharge === true || p.status === 'discharged';
                      if (patientFilter === 'admitted') return !isDischarged;
                      if (patientFilter === 'discharged') return isDischarged;
                      return true;
                    })
                    .map(p => {
                      const isDischarged = p.discharge === true || p.status === 'discharged';
                      return (
                        <motion.div 
                          whileHover={{ scale: 1.02 }} 
                          key={p.patient_id} 
                          onClick={() => onSelectPatient(p.patient_id)} 
                          className={`p-6 rounded-3xl border cursor-pointer transition-all group relative overflow-hidden ${
                            isDischarged 
                              ? 'bg-[#1e293b]/80 border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/5' 
                              : 'bg-[#1e293b] border-white/5 hover:border-indigo-500/50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                              isDischarged 
                                ? 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white' 
                                : 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
                            }`}>
                              {isDischarged ? <CheckCircle2 size={24}/> : <Activity size={24}/>}
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              {isDischarged ? (
                                <span className="text-[10px] font-black text-emerald-300 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                                  <CheckCircle2 size={12} className="text-emerald-400" /> Discharged
                                </span>
                              ) : p.status === 'critical' ? (
                                <span className="text-[10px] font-black text-red-300 px-2.5 py-1 bg-red-500/20 border border-red-500/40 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                                  <AlertTriangle size={11} className="text-red-400" /> Critical
                                </span>
                              ) : p.status === 'high_risk' ? (
                                <span className="text-[10px] font-black text-amber-300 px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full uppercase tracking-wider flex items-center gap-1">
                                  <AlertCircle size={11} className="text-amber-400" /> High Risk
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-indigo-300 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full uppercase tracking-wider">
                                  Admitted
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-gray-400 px-2 py-0.5 bg-white/5 rounded-md uppercase tracking-widest font-mono">
                                {p.patient_id}
                              </span>
                            </div>
                          </div>
                          <h3 className={`text-lg font-bold transition-colors ${isDischarged ? 'text-white group-hover:text-emerald-400' : 'group-hover:text-indigo-400'}`}>
                            {p.name || p.full_name}
                          </h3>
                          <p className="text-sm text-gray-400 mb-4">{p.disease || p.primary_diagnosis || "General Checkup"}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-white/5">
                            <div className="flex items-center gap-2">
                              <Calendar size={12}/> {new Date(p.admission_date?.$date || p.admission_date || Date.now()).toLocaleDateString()}
                            </div>
                            <span className={`font-medium ${isDischarged ? 'text-emerald-400 font-bold' : 'text-indigo-400'}`}>
                              {isDischarged 
                                ? (p.discharged_at ? `Discharged: ${new Date(p.discharged_at).toLocaleDateString()}` : 'Discharged') 
                                : `Bed: ${p.bed_number || 'N/A'}`
                              }
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'scan' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-white/5 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Activity className="text-indigo-400"/> Vital Monitor & Risk Assessment
                </h2>
                <div className="flex bg-[#0f172a] p-1 rounded-xl border border-white/5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => { setScanMode('ocr'); setScanError(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${scanMode === 'ocr' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Upload size={14} /> Monitor Snapshot (OCR)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setScanMode('manual'); setScanError(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${scanMode === 'manual' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Sliders size={14} /> Manual / Simulator
                  </button>
                </div>
              </div>

              <form onSubmit={uploadVitals} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Select Target Patient</label>
                  {patients.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={scanPatientId}
                        onChange={(e) => { setScanPatientId(e.target.value); setScanError(''); setScanResult(null); }}
                        className="w-full bg-[#0f172a] border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-indigo-500 text-sm cursor-pointer"
                      >
                        <option value="">-- Select Patient --</option>
                        {patients.map(p => {
                          const isDischarged = p.discharge === true || p.status === 'discharged';
                          return (
                            <option key={p.patient_id} value={p.patient_id}>
                              {p.name || p.full_name} ({p.patient_id}) {isDischarged ? '— [DISCHARGED]' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <input
                        name="patient_id"
                        value={scanPatientId}
                        onChange={(e) => { setScanPatientId(e.target.value); setScanError(''); setScanResult(null); }}
                        placeholder="Or type Patient ID"
                        required
                        className="w-full bg-[#0f172a] border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-indigo-500 font-mono text-sm"
                      />
                    </div>
                  ) : (
                    <input
                      name="patient_id"
                      value={scanPatientId}
                      onChange={(e) => { setScanPatientId(e.target.value); setScanError(''); setScanResult(null); }}
                      placeholder="Enter Patient ID (e.g. a4a737db)"
                      required
                      className="w-full bg-[#0f172a] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-indigo-500 font-mono"
                    />
                  )}
                </div>

                {/* Quick Presets for Rapid Risk Testing */}
                <div className="p-4 bg-[#0f172a]/70 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles size={12} className="text-indigo-400" /> Rapid Test Presets
                    </span>
                    <span className="text-[9px] text-gray-500 italic">Pre-fill clinical scenarios</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset('normal')}
                      className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-left transition-all group"
                    >
                      <span className="block text-[10px] font-black text-emerald-400 uppercase">Normal Vitals</span>
                      <span className="block text-[9px] text-gray-400">HR 76 • SpO2 98% • 120/80</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('high_risk')}
                      className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-left transition-all group"
                    >
                      <span className="block text-[10px] font-black text-amber-400 uppercase">High Risk Warning</span>
                      <span className="block text-[9px] text-gray-400">HR 128 • SpO2 88% • 155/96</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('critical_tachy')}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-left transition-all group"
                    >
                      <span className="block text-[10px] font-black text-rose-400 uppercase">Critical Tachycardia</span>
                      <span className="block text-[9px] text-gray-400">HR 151 • SpO2 84% • 190/115</span>
                    </button>
                  </div>
                </div>

                {scanMode === 'ocr' ? (
                  <div className="space-y-4">
                    {/* Dropzone with relative container to fix positioning */}
                    <div className="relative border-2 border-dashed border-white/15 rounded-2xl p-8 text-center hover:border-indigo-500/70 transition-all bg-[#0f172a]/50">
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      />
                      {previewUrl ? (
                        <div className="flex flex-col items-center gap-3">
                          <img src={previewUrl} alt="Monitor snapshot preview" className="max-h-52 rounded-xl object-contain shadow-lg border border-white/10" />
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-indigo-300">{selectedFile?.name}</span>
                            <span className="text-xs text-gray-500">({(selectedFile?.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <p className="text-xs text-gray-400">Click or drag another image to replace</p>
                        </div>
                      ) : (
                        <div className="py-4">
                          <Activity size={48} className="mx-auto text-gray-500 mb-3 group-hover:text-indigo-400 transition-colors" />
                          <p className="text-white font-medium mb-1">Click to browse or drop monitor snapshot here</p>
                          <p className="text-xs text-gray-500">Supports JPG, PNG, WEBP medical monitor snapshots</p>
                        </div>
                      )}
                    </div>

                    {/* Optional Vitals Overrides / Direct Verification */}
                    <details className="bg-[#0f172a]/40 rounded-2xl border border-white/5 p-4 text-xs">
                      <summary className="font-bold text-gray-400 cursor-pointer uppercase tracking-wider select-none hover:text-indigo-300 transition-colors">
                        ⚙️ Optional: Verify or Override Vitals (e.g. Set HR to 151)
                      </summary>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">HR (bpm)</label>
                          <input
                            type="number"
                            value={manualVitals.heart_rate}
                            onChange={(e) => setManualVitals({...manualVitals, heart_rate: e.target.value})}
                            placeholder="e.g. 151"
                            className="w-full bg-[#1e293b] border border-white/10 p-2.5 rounded-xl text-white outline-none focus:border-indigo-500 font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">SpO2 (%)</label>
                          <input
                            type="number"
                            value={manualVitals.spo2}
                            onChange={(e) => setManualVitals({...manualVitals, spo2: e.target.value})}
                            placeholder="e.g. 88"
                            className="w-full bg-[#1e293b] border border-white/10 p-2.5 rounded-xl text-white outline-none focus:border-indigo-500 font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">BP (mmHg)</label>
                          <input
                            type="text"
                            value={manualVitals.bp}
                            onChange={(e) => setManualVitals({...manualVitals, bp: e.target.value})}
                            placeholder="120/80"
                            className="w-full bg-[#1e293b] border border-white/10 p-2.5 rounded-xl text-white outline-none focus:border-indigo-500 font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Resp (br/min)</label>
                          <input
                            type="number"
                            value={manualVitals.resp_rate}
                            onChange={(e) => setManualVitals({...manualVitals, resp_rate: e.target.value})}
                            placeholder="e.g. 24"
                            className="w-full bg-[#1e293b] border border-white/10 p-2.5 rounded-xl text-white outline-none focus:border-indigo-500 font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Temp (°C)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={manualVitals.temperature}
                            onChange={(e) => setManualVitals({...manualVitals, temperature: e.target.value})}
                            placeholder="e.g. 39.5"
                            className="w-full bg-[#1e293b] border border-white/10 p-2.5 rounded-xl text-white outline-none focus:border-indigo-500 font-bold text-center"
                          />
                        </div>
                      </div>
                    </details>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#0f172a] rounded-2xl border border-white/10 space-y-3">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Direct Clinical Vitals Input</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Heart Rate (bpm)</label>
                          <input
                            type="number"
                            value={manualVitals.heart_rate}
                            onChange={(e) => setManualVitals({...manualVitals, heart_rate: e.target.value})}
                            placeholder="e.g. 151"
                            required
                            className="w-full bg-[#1e293b] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-indigo-500 font-bold text-center text-lg text-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">SpO2 (%)</label>
                          <input
                            type="number"
                            value={manualVitals.spo2}
                            onChange={(e) => setManualVitals({...manualVitals, spo2: e.target.value})}
                            placeholder="e.g. 84"
                            required
                            className="w-full bg-[#1e293b] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-indigo-500 font-bold text-center text-lg text-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Blood Pressure</label>
                          <input
                            type="text"
                            value={manualVitals.bp}
                            onChange={(e) => setManualVitals({...manualVitals, bp: e.target.value})}
                            placeholder="190/115"
                            required
                            className="w-full bg-[#1e293b] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-indigo-500 font-bold text-center text-lg text-purple-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Resp (br/min)</label>
                          <input
                            type="number"
                            value={manualVitals.resp_rate}
                            onChange={(e) => setManualVitals({...manualVitals, resp_rate: e.target.value})}
                            placeholder="e.g. 28"
                            required
                            className="w-full bg-[#1e293b] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-indigo-500 font-bold text-center text-lg text-emerald-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Temp (°C)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={manualVitals.temperature}
                            onChange={(e) => setManualVitals({...manualVitals, temperature: e.target.value})}
                            placeholder="e.g. 40.2"
                            required
                            className="w-full bg-[#1e293b] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-indigo-500 font-bold text-center text-lg text-rose-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {scanError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2">
                    <AlertTriangle size={18} className="shrink-0" /> <span>{scanError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadingScan}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploadingScan ? (
                    <>
                      <Activity className="animate-spin" size={20} />
                      {scanMode === 'ocr' ? 'Extracting Vitals & Evaluating Risk...' : 'Recording Vitals & Evaluating Risk...'}
                    </>
                  ) : (
                    <>
                      {scanMode === 'ocr' ? <Upload size={20} /> : <Activity size={20} />}
                      {scanMode === 'ocr' ? 'Analyze Monitor Snapshot' : 'Record Vitals & Assess Risk'}
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Extracted Vitals Result Card */}
            {scanResult && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-8 rounded-3xl border shadow-2xl space-y-6 ${
                  scanResult.risk_level === 'HIGH_RISK'
                    ? 'bg-[#1e293b] border-red-500/40 shadow-red-500/10'
                    : 'bg-[#1e293b] border-emerald-500/30'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-400 w-6 h-6" />
                    <div>
                      <h3 className="font-bold text-lg text-white">Vitals Processed Successfully</h3>
                      <p className="text-xs text-gray-400">Recorded for Patient ID: <span className="font-mono text-indigo-400 font-bold">{scanPatientId}</span></p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                    scanResult.risk_level === 'HIGH_RISK'
                      ? 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  }`}>
                    {scanResult.risk_level}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-[#0f172a] p-4 rounded-2xl text-center border border-white/5">
                    <span className="block text-[10px] text-gray-400 font-bold uppercase">Heart Rate</span>
                    <span className={`text-2xl font-black ${
                      (scanResult.vitals?.heart_rate > 120 || scanResult.vitals?.heart_rate < 50) ? 'text-rose-400' : 'text-indigo-400'
                    }`}>
                      {scanResult.vitals?.heart_rate ?? '--'}
                    </span>
                    <span className="block text-[10px] text-gray-500">bpm</span>
                  </div>
                  <div className="bg-[#0f172a] p-4 rounded-2xl text-center border border-white/5">
                    <span className="block text-[10px] text-gray-400 font-bold uppercase">SpO2</span>
                    <span className={`text-2xl font-black ${
                      scanResult.vitals?.spo2 < 90 ? 'text-rose-400' : 'text-cyan-400'
                    }`}>
                      {scanResult.vitals?.spo2 ?? '--'}%
                    </span>
                    <span className="block text-[10px] text-gray-500">oxygen</span>
                  </div>
                  <div className="bg-[#0f172a] p-4 rounded-2xl text-center border border-white/5">
                    <span className="block text-[10px] text-gray-400 font-bold uppercase">Blood Pressure</span>
                    <span className="text-2xl font-black text-purple-400">{scanResult.vitals?.bp ?? '--'}</span>
                    <span className="block text-[10px] text-gray-500">mmHg</span>
                  </div>
                  <div className="bg-[#0f172a] p-4 rounded-2xl text-center border border-white/5">
                    <span className="block text-[10px] text-gray-400 font-bold uppercase">Resp Rate</span>
                    <span className={`text-2xl font-black ${
                      (scanResult.vitals?.resp_rate > 24 || scanResult.vitals?.resp_rate < 10) ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {scanResult.vitals?.resp_rate ?? '--'}
                    </span>
                    <span className="block text-[10px] text-gray-500">br/min</span>
                  </div>
                  <div className="bg-[#0f172a] p-4 rounded-2xl text-center border border-white/5">
                    <span className="block text-[10px] text-gray-400 font-bold uppercase">Temperature</span>
                    <span className={`text-2xl font-black ${
                      (scanResult.vitals?.temperature > 38.5 || scanResult.vitals?.temperature < 35.5) ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {scanResult.vitals?.temperature ?? '--'}
                    </span>
                    <span className="block text-[10px] text-gray-500">°C</span>
                  </div>
                </div>

                {/* Inline Vitals Correction if reading needs adjustment */}
                {isEditingScan ? (
                  <div className="p-4 bg-[#0f172a] rounded-2xl border border-indigo-500/40 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-indigo-400 uppercase">Correct Extracted Vitals (e.g. Set HR to 151)</span>
                      <button onClick={() => setIsEditingScan(false)} className="text-xs text-gray-500 hover:text-white">Cancel</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <input
                        type="number"
                        placeholder="HR"
                        value={editVitalsData.heart_rate}
                        onChange={(e) => setEditVitalsData({...editVitalsData, heart_rate: e.target.value})}
                        className="bg-[#1e293b] p-2.5 rounded-xl border border-white/10 text-center font-bold text-sm text-indigo-300"
                      />
                      <input
                        type="number"
                        placeholder="SpO2"
                        value={editVitalsData.spo2}
                        onChange={(e) => setEditVitalsData({...editVitalsData, spo2: e.target.value})}
                        className="bg-[#1e293b] p-2.5 rounded-xl border border-white/10 text-center font-bold text-sm text-cyan-300"
                      />
                      <input
                        type="text"
                        placeholder="BP"
                        value={editVitalsData.bp}
                        onChange={(e) => setEditVitalsData({...editVitalsData, bp: e.target.value})}
                        className="bg-[#1e293b] p-2.5 rounded-xl border border-white/10 text-center font-bold text-sm text-purple-300"
                      />
                      <input
                        type="number"
                        placeholder="Resp"
                        value={editVitalsData.resp_rate}
                        onChange={(e) => setEditVitalsData({...editVitalsData, resp_rate: e.target.value})}
                        className="bg-[#1e293b] p-2.5 rounded-xl border border-white/10 text-center font-bold text-sm text-emerald-300"
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Temp"
                        value={editVitalsData.temperature}
                        onChange={(e) => setEditVitalsData({...editVitalsData, temperature: e.target.value})}
                        className="bg-[#1e293b] p-2.5 rounded-xl border border-white/10 text-center font-bold text-sm text-rose-300"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveEditedVitals}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all shadow"
                    >
                      Save & Re-calculate Risk Alerts
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingScan(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 size={14} /> Adjust / Correct Vitals (e.g. Set HR to 151)
                    </button>
                  </div>
                )}

                {/* Critical Alerts Triggered */}
                {scanResult.critical_alerts && scanResult.critical_alerts.length > 0 && (
                  <div className="p-4 bg-red-500/15 border border-red-500/40 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-400 animate-pulse" /> Critical Alerts Triggered
                    </h4>
                    {scanResult.critical_alerts.map((alertMsg, idx) => (
                      <p key={idx} className="text-sm font-semibold text-red-200 pl-6">• {alertMsg}</p>
                    ))}
                  </div>
                )}

                {/* High Risk Alerts Triggered */}
                {scanResult.risk_alerts && scanResult.risk_alerts.length > 0 && (
                  <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-400" /> High-Risk Clinical Warnings
                    </h4>
                    {scanResult.risk_alerts.map((alertMsg, idx) => (
                      <p key={idx} className="text-sm font-semibold text-amber-200 pl-6">• {alertMsg}</p>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => onSelectPatient(scanPatientId)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    Open Patient Dashboard <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setScanResult(null); setSelectedFile(null); setPreviewUrl(null); }}
                    className="px-6 bg-white/5 hover:bg-white/10 py-3.5 rounded-xl font-medium text-sm transition-all text-gray-300"
                  >
                    Scan Another
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {view === 'pharmacy' && (
          <div className="max-w-2xl mx-auto bg-[#1e293b] p-8 rounded-3xl border border-white/5 shadow-2xl">
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-8"><Stethoscope className="text-green-400"/> Prescription Manager</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setPharmError('');
              setPharmSuccess('');
              const formData = new FormData(e.target);
              try {
                const res = await axios.post(`${API_BASE}/assign_medicine`, formData, {
                  headers: { 'X-Role': 'admin' }
                });
                if (res.data.status === "success") {
                  setPharmSuccess(`Medicine assigned successfully! Total cost: $${res.data.total_cost}`);
                  e.target.reset();
                } else {
                  setPharmError(res.data.message || "Medicine unavailable in inventory");
                }
              } catch (err) {
                setPharmError(err.response?.data?.detail || err.message || "Failed to assign prescription");
              }
            }} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Select Target Patient</label>
                {patients.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={pharmPatientId}
                      onChange={(e) => { setPharmPatientId(e.target.value); setPharmError(''); setPharmSuccess(''); }}
                      className="w-full bg-[#0f172a] border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-green-500 text-sm cursor-pointer"
                    >
                      <option value="">-- Select Patient --</option>
                      {patients.map(p => {
                        const isDischarged = p.discharge === true || p.status === 'discharged';
                        return (
                          <option key={p.patient_id} value={p.patient_id}>
                            {p.name || p.full_name} ({p.patient_id}) {isDischarged ? '— [DISCHARGED]' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <input
                      name="patient_id"
                      value={pharmPatientId}
                      onChange={(e) => { setPharmPatientId(e.target.value); setPharmError(''); setPharmSuccess(''); }}
                      placeholder="Or enter Patient ID"
                      required
                      className="w-full bg-[#0f172a] border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-green-500 font-mono text-sm"
                    />
                  </div>
                ) : (
                  <input
                    name="patient_id"
                    value={pharmPatientId}
                    onChange={(e) => { setPharmPatientId(e.target.value); setPharmError(''); setPharmSuccess(''); }}
                    placeholder="Enter Patient ID"
                    required
                    className="w-full bg-[#0f172a] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-green-500 font-mono"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Medicine Name</label>
                <div className="relative">
                  <input
                    name="medicine_name"
                    value={medQuery}
                    onChange={(e) => handleMedQueryChange(e.target.value)}
                    placeholder="Search or enter medicine (e.g. Amoxicillin, Paracetamol)"
                    required
                    autoComplete="off"
                    className="w-full bg-[#0f172a] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-green-500"
                  />
                  {medSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/15 rounded-2xl shadow-2xl z-30 overflow-hidden max-h-60 overflow-y-auto">
                      {medSuggestions.map((m, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setMedQuery(m.medicine_name);
                            setMedSuggestions([]);
                          }}
                          className="p-3.5 hover:bg-white/5 cursor-pointer border-b border-white/5 flex items-center justify-between text-sm transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-white">{m.medicine_name}</span>
                            <span className="text-xs text-gray-500 block">Stock: {m.quantity} available</span>
                          </div>
                          <span className="text-xs font-mono text-green-400 font-bold">${m.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Medicine Quick Chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider self-center">Popular:</span>
                  {[
                    "Amoxicillin 500mg Capsule",
                    "Paracetamol 500mg Tablet",
                    "Dolo 650 Tablet",
                    "Azithromycin 500mg Tablet"
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => { setMedQuery(chip); setMedSuggestions([]); setPharmError(''); }}
                      className="text-xs bg-white/5 hover:bg-green-500/20 hover:text-green-300 text-gray-400 px-3 py-1.5 rounded-lg border border-white/5 transition-all"
                    >
                      {chip.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Quantity</label>
                <input name="quantity" type="number" min="1" placeholder="Quantity" defaultValue="1" required className="w-full bg-[#0f172a] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-green-500" />
              </div>
              
              {pharmError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2">
                  <AlertTriangle size={18} className="shrink-0" /> {pharmError}
                </div>
              )}
              {pharmSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={18} className="shrink-0" /> {pharmSuccess}
                </div>
              )}

              <button className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-green-600/20">Assign Prescription</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

function PatientDashboard({ patient_id, role, logout, setAlert, onDischarge }) {
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [latestVitals, setLatestVitals] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [billing, setBilling] = useState(null);
  const [payments, setPayments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showPayForm, setShowPayForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prescribing, setPrescribing] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [manualVitals, setManualVitals] = useState({
    heart_rate: 151,
    spo2: 84,
    bp: '190/115',
    resp_rate: 28,
    temperature: 39.5
  });

  const isAdmin = role === 'admin';

  const handleResolveAlert = async (alertId) => {
    try {
      if (alertId) {
        await axios.post(`${API_BASE}/resolve_alert/${alertId}`);
      } else {
        await axios.post(`${API_BASE}/resolve_alerts/${patient_id}`);
      }
      if (setAlert) setAlert(null);
      fetchData();
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    }
  };

  const fetchData = async () => {
    try {
      const [patRes, vitalsRes, latestRes, rxRes, billRes, payRes, alertsRes] = await Promise.all([
        axios.get(`${API_BASE}/patient/${patient_id}`).catch(() => null),
        axios.get(`${API_BASE}/vitals/${patient_id}`).catch(() => null),
        axios.get(`${API_BASE}/latest_vitals/${patient_id}`).catch(() => null),
        axios.get(`${API_BASE}/prescriptions/${patient_id}`).catch(() => null),
        axios.get(`${API_BASE}/billing/${patient_id}`).catch(() => null),
        axios.get(`${API_BASE}/payments/${patient_id}`).catch(() => null),
        axios.get(`${API_BASE}/alerts/${patient_id}`).catch(() => null),
      ]);

      if (patRes?.data) setPatient(patRes.data);
      if (vitalsRes?.data) setVitals(vitalsRes.data);
      if (latestRes?.data) setLatestVitals(latestRes.data);
      if (rxRes?.data) setPrescriptions(rxRes.data);
      if (billRes?.data) setBilling(billRes.data);
      if (payRes?.data) setPayments(payRes.data);

      const alertList = alertsRes?.data || [];
      setAlerts(alertList);

      const latest = latestRes?.data;
      const isLatestGood = latest && (
        latest.risk_level === 'LOW_RISK' ||
        (latest.heart_rate >= 50 && latest.heart_rate < 100 &&
         latest.spo2 >= 95 &&
         (!latest.temperature || (latest.temperature >= 35.5 && latest.temperature < 38.0)))
      );

      // If next vitals are good or patient is admitted normally, dismiss popup!
      if (isLatestGood || patRes?.data?.status === 'admitted') {
        if (setAlert) setAlert(null);
      } else if (Array.isArray(alertList)) {
        // Only trigger popup if there is an active (unresolved) critical alert AND vitals are critical
        const activeCrit = alertList.find(a => !a.resolved && (a.severity === 'CRITICAL' || a.alert_type === 'CRITICAL_VITAL'));
        const activeHigh = alertList.find(a => !a.resolved && (a.severity === 'HIGH' || a.alert_type === 'HIGH_RISK_VITAL'));
        if (activeCrit && setAlert) {
          setAlert(activeCrit.message);
        } else if (activeHigh && setAlert) {
          setAlert(activeHigh.message);
        } else if (setAlert) {
          setAlert(null);
        }
      }
    } catch (err) {
      console.error("Parallel fetch failed", err);
    }
  };

  useEffect(() => {
    fetchData();
    const inv = setInterval(fetchData, 10000);
    return () => clearInterval(inv);
  }, [patient_id]);

  const handleUploadVitals = async (e) => {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.target);
    formData.append('patient_id', patient_id);
    try {
      const res = await axios.post(`${API_BASE}/upload_vitals`, formData, {
        headers: { 'X-Role': role || 'admin' }
      });
      if (res.data.critical_alerts?.length > 0) {
        setAlert(res.data.critical_alerts[0]);
      } else if (res.data.risk_alerts?.length > 0) {
        setAlert(res.data.risk_alerts[0]);
      } else {
        // Next vitals are good: clear any active alert popup!
        setAlert(null);
      }
      fetchData();
    } catch (err) { alert("Upload failed: " + (err.response?.data?.detail || err.message)); }
    finally { setUploading(false); }
  };

  const handleManualVitalsSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const payload = {
        patient_id,
        heart_rate: Number(manualVitals.heart_rate),
        spo2: Number(manualVitals.spo2),
        bp: manualVitals.bp,
        resp_rate: Number(manualVitals.resp_rate),
        temperature: Number(manualVitals.temperature)
      };
      const res = await axios.post(`${API_BASE}/add_vitals`, payload, {
        headers: { 'X-Role': role || 'admin' }
      });
      if (res.data.critical_alerts?.length > 0) {
        setAlert(res.data.critical_alerts[0]);
      } else if (res.data.risk_alerts?.length > 0) {
        setAlert(res.data.risk_alerts[0]);
      } else {
        // Next vitals are good: clear any active alert popup!
        setAlert(null);
      }
      setShowVitalsModal(false);
      fetchData();
    } catch (err) {
      alert("Failed to log vitals: " + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleAssignMedicine = async (e) => {
    e.preventDefault();
    setPrescribing(true);
    const formData = new FormData(e.target);
    formData.append('patient_id', patient_id);
    try {
      const res = await axios.post(`${API_BASE}/assign_medicine`, formData);
      if (res.data.status === "unavailable") {
        alert(res.data.message);
      }
      fetchData();
      e.target.reset();
    } catch (err) { alert("Prescription failed: " + (err.response?.data?.detail || err.message)); }
    finally { setPrescribing(false); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('patient_id', patient_id);
    try {
      await axios.post(`${API_BASE}/add_payment`, formData);
      setShowPayForm(false);
      fetchData();
    } catch (err) { alert("Payment failed"); }
  };

  const handleDeleteMedicine = async (prescId) => {
    if (!window.confirm("Remove this medicine record?")) return;
    try {
      console.log(`DELETING: ${API_BASE}/prescription/${prescId}`);
      const res = await axios.delete(`${API_BASE}/prescription/${prescId}`);
      console.log("DELETE SUCCESS:", res.data);
      fetchData();
    } catch (err) { 
      console.error("Delete failed:", err.response?.data || err.message);
      alert(`Delete failed: ${err.response?.data?.detail || err.message}`); 
    }
  };

  const handleUpdateCost = async (field, label) => {
    const currentValue = field === 'bed_cost_per_day' ? billing?.bed_rate : billing?.treatment_cost;
    const newValue = window.prompt(`Enter new cost for ${label} (₹):`, currentValue);
    if (newValue === null || newValue === "" || isNaN(newValue)) return;
    
    try {
      await axios.post(`${API_BASE}/update_billing_costs`, {
        patient_id,
        field,
        new_value: parseFloat(newValue)
      });
      fetchData();
    } catch (err) { alert("Update failed: " + (err.response?.data?.detail || err.message)); }
  };

  const chartData = {
    labels: vitals.slice(0, 15).map(v => new Date(v.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})).reverse(),
    datasets: [
      {
        label: 'Heart Rate',
        data: vitals.slice(0, 15).map(v => v.heart_rate).reverse(),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true, tension: 0.4,
      },
      {
        label: 'SpO2',
        data: vitals.slice(0, 15).map(v => v.spo2).reverse(),
        borderColor: '#22d3ee',
        fill: false, tension: 0.4,
      },
      {
        label: 'Temp',
        data: vitals.slice(0, 15).map(v => v.temperature).reverse(),
        borderColor: '#fb7185',
        fill: false, tension: 0.4,
      }
    ]
  };

  if (!patient) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
      <div className="text-center">
        <Activity className="animate-spin text-indigo-500 mb-4 mx-auto" size={48} />
        <p className="text-gray-400 italic">Syncing Health Data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Navigation */}
      <nav className="h-20 border-b border-white/5 bg-[#1e293b]/50 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="text-indigo-500" />
          <span className="font-bold text-xl tracking-tight hidden md:block">{isAdmin ? 'Clinical Management' : 'Patient Monitoring Portal'}</span>
          <span className="font-bold text-xl tracking-tight md:hidden">{isAdmin ? 'Clinical' : 'Portal'}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isAdmin ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-white/5 text-gray-500 border-white/5'}`}>
            {isAdmin ? 'ADMIN CONTROL' : 'READ ONLY'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <h4 className="text-xs font-bold text-white leading-none">{patient.name}</h4>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{patient.patient_id}</span>
          </div>
          {isAdmin && (
             <button
               onClick={async () => {
                 if (!patient.discharge) {
                   try { await axios.get(`${API_BASE}/decision/${patient_id}`); } catch (e) {}
                 }
                 if (onDischarge) onDischarge();
               }}
               disabled={patient.discharge}
               className={`hidden md:block px-4 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${patient.discharge ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed border border-white/5' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'}`}
             >
               {patient.discharge ? 'Already Discharged' : 'Check Discharge'}
             </button>
          )}
          {!isAdmin && patient.discharge && (
             <button onClick={onDischarge} className="hidden md:block px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] tracking-widest">
               View Discharge Report
             </button>
          )}
          <button onClick={logout} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
            <LogOut size={20}/>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-8 pb-20">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. PATIENT PROFILE CARD */}
            <section className="bg-[#1e293b] rounded-3xl p-8 border border-white/5 shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-3"><Users className="text-indigo-400"/> Patient Profile</h3>
                  {(patient.discharge || patient.status === 'discharged') && (
                    <p className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" /> Patient has been medically and administratively discharged
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(patient.discharge || patient.status === 'discharged') ? (
                    <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-emerald-500/20 border-emerald-500/50 text-emerald-300 flex items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                      <CheckCircle2 size={12} className="text-emerald-400" /> Discharged
                    </span>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      patient.status === 'critical' ? 'bg-red-500/10 border-red-500/50 text-red-500 animate-pulse' : 
                      patient.status === 'high_risk' ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' :
                      'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                    }`}>
                      {patient.status || 'Admitted'}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <ProfileItem label="Patient Name" value={patient.name} />
                <ProfileItem label="Patient ID" value={patient.patient_id} />
                <ProfileItem label="Doctor" value={patient.doctor} />
                <ProfileItem label="Diagnosis" value={patient.disease} />
                <ProfileItem label="Ward / Bed" value={patient.bed_number} />
                <ProfileItem 
                  label={patient.discharge || patient.status === 'discharged' ? "Discharged Date" : "Admission Date"} 
                  value={patient.discharge && patient.discharged_at ? new Date(patient.discharged_at).toLocaleDateString() : new Date(patient.admission_date).toLocaleDateString()} 
                />
              </div>
            </section>

            {/* 2. LATEST VITALS CARD */}
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <VitalValueCard 
                label="Heart Rate" 
                value={latestVitals?.heart_rate ? `${latestVitals.heart_rate} bpm` : '--'} 
                unit="bpm" 
                icon={<Activity size={18}/>} 
                color={latestVitals?.heart_rate >= 140 || (latestVitals?.heart_rate && latestVitals?.heart_rate < 50) ? 'red' : latestVitals?.heart_rate > 100 ? 'amber' : 'indigo'} 
              />
              <VitalValueCard 
                label="SpO2" 
                value={latestVitals?.spo2 ? `${latestVitals.spo2}%` : '--'} 
                unit="%" 
                icon={<Thermometer size={18}/>} 
                color={latestVitals?.spo2 && latestVitals.spo2 < 85 ? 'red' : latestVitals?.spo2 && latestVitals.spo2 < 92 ? 'amber' : 'cyan'} 
              />
              <VitalValueCard 
                label="Blood Pressure" 
                value={latestVitals?.bp ? latestVitals.bp : '--'} 
                unit="mmHg" 
                icon={<Activity size={18}/>} 
                color={latestVitals?.bp && (latestVitals.bp.includes('180') || latestVitals.bp.includes('190') || latestVitals.bp.startsWith('7') || latestVitals.bp.startsWith('6')) ? 'red' : latestVitals?.bp && (latestVitals.bp.includes('140') || latestVitals.bp.includes('150') || latestVitals.bp.includes('160')) ? 'amber' : 'emerald'} 
              />
              <VitalValueCard 
                label="Temperature" 
                value={latestVitals?.temperature ? `${latestVitals.temperature}°C` : '--'} 
                unit="°C" 
                icon={<Thermometer size={18}/>} 
                color={latestVitals?.temperature >= 40.0 || (latestVitals?.temperature && latestVitals.temperature < 35.0) ? 'red' : latestVitals?.temperature >= 38.0 ? 'amber' : 'rose'} 
              />
              <VitalValueCard 
                label="Resp Rate" 
                value={latestVitals?.resp_rate ? `${latestVitals.resp_rate} br` : '--'} 
                unit="br" 
                icon={<Activity size={18}/>} 
                color={latestVitals?.resp_rate >= 30 || (latestVitals?.resp_rate && latestVitals.resp_rate < 8) ? 'red' : latestVitals?.resp_rate >= 24 ? 'amber' : 'emerald'} 
              />
            </section>

            {/* 4. VITALS GRAPH */}
            <section className="bg-[#1e293b] rounded-3xl p-8 border border-white/5 relative shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold flex items-center gap-3"><Activity size={24} className="text-indigo-400"/> Telemetry Dashboard</h3>
                    {latestVitals?.news2_score !== undefined && (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        latestVitals.news2_score >= 7 
                          ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                          : latestVitals.news2_score >= 5
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        NEWS2 Score: {latestVitals.news2_score} ({latestVitals.news2_category || 'LOW'} Risk)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Real-time health indicators and OCR vital extraction</p>
                </div>
                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowVitalsModal(!showVitalsModal)}
                      className="bg-white/10 hover:bg-white/15 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-white/10"
                    >
                      <Sliders size={14} className="text-indigo-400" /> Log / Simulate
                    </button>
                    <form onSubmit={handleUploadVitals} className="flex items-center gap-2">
                      <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                        <Upload size={14}/> {uploading ? 'Analyzing...' : 'Upload Snapshot'}
                        <input type="file" name="image" className="hidden" onChange={(e) => e.target.form.requestSubmit()} />
                      </label>
                    </form>
                  </div>
                )}
              </div>

              {/* Log / Simulate Vitals Panel */}
              {showVitalsModal && (
                <div className="mb-6 p-6 bg-[#0f172a] rounded-2xl border border-indigo-500/30 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                      <Sliders size={14}/> Log or Simulate Patient Vitals
                    </h4>
                    <button onClick={() => setShowVitalsModal(false)} className="text-gray-400 hover:text-white">
                      <X size={16}/>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold self-center">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setManualVitals({ heart_rate: 151, spo2: 84, bp: '190/115', resp_rate: 28, temperature: 39.5 })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                    >
                      Severe Tachycardia (HR 151)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualVitals({ heart_rate: 125, spo2: 89, bp: '155/98', resp_rate: 24, temperature: 38.6 })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                    >
                      High Risk (HR 125, SpO2 89)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualVitals({ heart_rate: 72, spo2: 98, bp: '120/80', resp_rate: 16, temperature: 37.0 })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                    >
                      Normal (HR 72, SpO2 98)
                    </button>
                  </div>
                  <form onSubmit={handleManualVitalsSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">HR (bpm)</label>
                        <input
                          type="number"
                          value={manualVitals.heart_rate}
                          onChange={(e) => setManualVitals({...manualVitals, heart_rate: e.target.value})}
                          required
                          className="w-full bg-[#1e293b] p-2.5 rounded-xl border border-white/10 text-white font-bold text-center text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">SpO2 (%)</label>
                        <input
                          type="number"
                          value={manualVitals.spo2}
                          onChange={(e) => setManualVitals({...manualVitals, spo2: e.target.value})}
                          required
                          className="w-full bg-[#1e293b] p-2.5 rounded-xl border border-white/10 text-white font-bold text-center text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">BP (mmHg)</label>
                        <input
                          type="text"
                          value={manualVitals.bp}
                          onChange={(e) => setManualVitals({...manualVitals, bp: e.target.value})}
                          required
                          className="w-full bg-[#1e293b] p-2.5 rounded-xl border border-white/10 text-white font-bold text-center text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Resp (br/m)</label>
                        <input
                          type="number"
                          value={manualVitals.resp_rate}
                          onChange={(e) => setManualVitals({...manualVitals, resp_rate: e.target.value})}
                          required
                          className="w-full bg-[#1e293b] p-2.5 rounded-xl border border-white/10 text-white font-bold text-center text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Temp (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={manualVitals.temperature}
                          onChange={(e) => setManualVitals({...manualVitals, temperature: e.target.value})}
                          required
                          className="w-full bg-[#1e293b] p-2.5 rounded-xl border border-white/10 text-white font-bold text-center text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowVitalsModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploading}
                        className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-600/30"
                      >
                        {uploading ? 'Processing...' : 'Save & Evaluate Alerts'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              <div className="h-[350px]">
                {vitals.length > 0 ? (
                  <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#64748b' } } } }} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-600 italic">No telemetry data available</div>
                )}
              </div>
            </section>

            {/* 3. VITALS HISTORY SECTION */}
            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-3"><History className="text-purple-400"/> Vitals Logs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vitals.slice(0, 6).map((v, i) => (
                  <div key={i} className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 shadow-md">
                    <p className="text-[10px] text-gray-500 font-bold mb-3">{new Date(v.timestamp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                    <div className="grid grid-cols-3 gap-2">
                       <div className="text-center">
                         <span className="block text-[8px] text-gray-500 uppercase font-bold">HR</span>
                         <span className="text-sm font-bold">{v.heart_rate}</span>
                       </div>
                       <div className="text-center">
                         <span className="block text-[8px] text-gray-500 uppercase font-bold">SpO2</span>
                         <span className="text-sm font-bold">{v.spo2}</span>
                       </div>
                       <div className="text-center">
                         <span className="block text-[8px] text-gray-500 uppercase font-bold">TEMP</span>
                         <span className="text-sm font-bold">{v.temperature}</span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* 5. PRESCRIPTIONS CARD */}
            <section className="bg-[#1e293b] rounded-3xl p-7 border border-white/5 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Stethoscope size={16}/> PHARMACY DISPENSARY ({prescriptions.length})</h3>
                {isAdmin && <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-3 py-1 rounded-full border border-indigo-500/10">Admin Access</span>}
              </div>
              
              {isAdmin && (
                <form onSubmit={handleAssignMedicine} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <input name="medicine_name" placeholder="Medicine Name" required className="bg-[#0f172a] border border-white/5 rounded-xl p-3 text-xs focus:border-indigo-500 outline-none" />
                  <input name="quantity" type="number" placeholder="Qty" required className="bg-[#0f172a] border border-white/5 rounded-xl p-3 text-xs focus:border-indigo-500 outline-none" />
                  <button type="submit" disabled={prescribing} className="bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50">
                    {prescribing ? 'Checking...' : 'Assign'}
                  </button>
                </form>
              )}

              {/* DEBUG: {JSON.stringify(prescriptions.length)} */}
              <div className="space-y-3">
                {prescriptions.map((m, i) => (
                  <div key={i} className="p-4 bg-[#0f172a]/60 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-white text-sm italic">{m.medicine_name}</h4>
                      <div className="text-right flex flex-col items-end">
                         <div className="flex items-center gap-2">
                            {isAdmin && (
                              <button onClick={() => handleDeleteMedicine(m._id)} className="p-1 hover:text-rose-500 transition-colors">
                                <Trash2 size={12}/>
                              </button>
                            )}
                            <span className="text-[10px] font-black text-indigo-400 block tracking-wider">₹{m.total_cost?.toLocaleString()}</span>
                         </div>
                         <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">Total Bill</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-t border-white/5 pt-2">
                      <div className="flex gap-4">
                        <div className="space-y-0.5">
                          <p className="text-[8px] text-gray-600 font-black uppercase">Qty</p>
                          <p className="text-[10px] text-white font-bold">{m.quantity} Units</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[8px] text-gray-600 font-black uppercase">Unit Price</p>
                          <p className="text-[10px] text-white font-bold">₹{m.price?.toLocaleString() || '0'}</p>
                        </div>
                      </div>
                      <span className="text-[8px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-lg uppercase font-black border border-indigo-500/10">{m.status || 'Active'}</span>
                    </div>
                  </div>
                ))}
                {prescriptions.length === 0 && <p className="text-xs text-gray-600 italic py-4 text-center">No medications assigned</p>}
              </div>
            </section>

            {/* 6. BILLING SUMMARY CARD */}
            <section className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl p-7 border border-white/5 shadow-xl">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2"><CreditCard size={16}/> Billing Summary</h3>
              <div className="space-y-4">
                <div className="space-y-4 text-[11px]">
                  <div className="flex justify-between text-gray-400 items-center">
                    <span>Medicine Fees</span>
                    <span className="text-white font-bold">₹{billing?.medicine_cost?.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-400 items-center">
                    <div className="flex items-center gap-2">
                       <span>Bed / Facility</span>
                       {isAdmin && (
                         <button onClick={() => handleUpdateCost('bed_cost_per_day', 'Bed Rate')} className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase underline">Update</button>
                       )}
                    </div>
                    <div className="text-right">
                       <span className="text-white font-bold block">₹{billing?.bed_cost?.toLocaleString()}</span>
                       <span className="text-[8px] text-gray-500 italic">{billing?.bed_days} days @ ₹{billing?.bed_rate}/day</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-gray-400 items-center">
                    <div className="flex items-center gap-2">
                       <span>Treatment</span>
                       {isAdmin && (
                         <button onClick={() => handleUpdateCost('treatment_cost', 'Treatment')} className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase underline">Update</button>
                       )}
                    </div>
                    <span className="text-white font-bold">₹{billing?.treatment_cost?.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="border-t border-white/10 pt-4 flex justify-between items-end">
                  <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Total Bill:</span>
                  <span className="text-2xl font-black text-white">₹{billing?.total_bill?.toLocaleString()}</span>
                </div>
                
                {billing?.insurance_coverage > 0 && (
                  <div className="flex justify-between text-[10px] text-emerald-400 font-bold px-1">
                    <span>Insurance Coverage</span>
                    <span>- ₹{billing.insurance_coverage.toLocaleString()}</span>
                  </div>
                )}

                {billing?.paid_amount > 0 && (
                  <div className="flex justify-between text-[10px] text-blue-400 font-bold px-1">
                    <span>Paid Amount</span>
                    <span>- ₹{billing.paid_amount.toLocaleString()}</span>
                  </div>
                )}

                <div className="p-4 bg-indigo-500/10 rounded-2xl flex flex-col items-center justify-center border border-indigo-500/20">
                  <span className="text-[9px] font-black uppercase text-indigo-400 mb-1">Balance Remaining</span>
                  <span className="text-3xl font-black text-white">₹{billing?.remaining_balance?.toLocaleString()}</span>
                </div>
              </div>
            </section>

            {/* 7. PAYMENT HISTORY CARD */}
            <section className="bg-[#1e293b] rounded-3xl p-7 border border-white/5 shadow-xl flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><History size={16}/> Payment History</h3>
                {isAdmin && (
                  <button onClick={() => setShowPayForm(!showPayForm)} className={`p-2 rounded-xl transition-all ${showPayForm ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white'}`}>
                    {showPayForm ? <X size={16}/> : <PlusCircle size={16}/>}
                  </button>
                )}
              </div>

              {isAdmin && showPayForm && (
                <motion.form initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} onSubmit={handlePayment} className="mb-6 space-y-3 bg-[#0f172a] p-4 rounded-2xl border border-white/5">
                  <input name="amount" type="number" placeholder="Amount ₹" required className="w-full bg-transparent border-b border-white/10 p-2 text-xs focus:border-indigo-500 outline-none" />
                  <input name="purpose" placeholder="Purpose" required className="w-full bg-transparent border-b border-white/10 p-2 text-xs focus:border-indigo-500 outline-none" />
                  <button className="w-full bg-indigo-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500">Record</button>
                </motion.form>
              )}

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-[#0f172a]/40 rounded-xl border border-white/5">
                    <div>
                      <p className="font-bold text-xs">₹{p.amount.toLocaleString()}</p>
                      <p className="text-[9px] text-gray-500 italic mt-0.5">{p.purpose}</p>
                    </div>
                    <span className="text-[8px] text-gray-600 font-bold">{new Date(p.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 8. ALERT HISTORY CARD */}
            <section className="bg-[#1e293b] rounded-3xl p-7 border border-white/5 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert size={16}/> Clinical & System Alerts ({alerts.length})
                </h3>
                <div className="flex items-center gap-2">
                  {alerts.some(a => !a.resolved && (a.severity === 'CRITICAL' || a.alert_type === 'CRITICAL_VITAL')) && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                      Action Required
                    </span>
                  )}
                  {alerts.some(a => !a.resolved) && isAdmin && (
                    <button
                      onClick={() => handleResolveAlert()}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Mark All Solved
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-center">
                    <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-emerald-300">All Vitals Normal</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">No critical or high-risk clinical alerts recorded.</p>
                  </div>
                ) : (
                  alerts.slice(0, 8).map((a, i) => {
                    const isCritical = a.severity === 'CRITICAL' || a.alert_type === 'CRITICAL_VITAL';
                    const isHigh = a.severity === 'HIGH' || a.alert_type === 'HIGH_RISK_VITAL';
                    const isResolved = a.resolved;

                    return (
                      <div
                        key={i}
                        className={`p-4 rounded-2xl border flex gap-3.5 items-start transition-all ${
                          isResolved
                            ? 'bg-slate-800/40 border-slate-700/50 opacity-80'
                            : isCritical
                            ? 'bg-red-500/10 border-red-500/40 shadow-sm shadow-red-500/10'
                            : isHigh
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-indigo-500/5 border-indigo-500/20'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {isResolved ? (
                            <CheckCircle2 size={18} className="text-emerald-400" />
                          ) : isCritical ? (
                            <AlertTriangle size={18} className="text-red-400 animate-pulse" />
                          ) : isHigh ? (
                            <AlertCircle size={18} className="text-amber-400" />
                          ) : (
                            <Pill size={18} className="text-indigo-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isResolved
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isCritical
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : isHigh
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              {isResolved ? '✓ Solved' : isCritical ? 'Critical Vital' : isHigh ? 'High Risk' : 'Pharmacy'}
                            </span>
                            <span className="text-[9px] text-gray-500">
                              {new Date(a.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {!isResolved && isAdmin && (
                              <button
                                onClick={() => handleResolveAlert(a._id)}
                                className="ml-auto text-[10px] text-emerald-400 hover:text-emerald-300 underline font-semibold"
                              >
                                Mark Solved
                              </button>
                            )}
                          </div>
                          <p
                            className={`text-xs font-semibold leading-relaxed ${
                              isResolved ? 'text-gray-400' : isCritical ? 'text-red-200 font-bold' : isHigh ? 'text-amber-200' : 'text-gray-300'
                            }`}
                          >
                            {a.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileItem({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-white truncate">{value || '--'}</p>
    </div>
  );
}

function VitalValueCard({ label, value, unit, icon, color }) {
  const themes = {
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/10",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/10",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/10",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/10",
    red: "bg-red-500/15 text-red-400 border-red-500/40 shadow-sm shadow-red-500/10",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  return (
    <div className={`p-5 rounded-3xl border ${themes[color] || themes.indigo} group hover:bg-opacity-20 transition-all`}>
      <div className="flex justify-between items-start mb-3">
        {icon}
        <span className="text-[8px] font-black uppercase opacity-40">{unit}</span>
      </div>
      <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">{label}</p>
      <div className="text-2xl font-black italic">{value}</div>
    </div>
  );
}

function VitalCard({ icon, label, value, unit, color }) {
  const themes = {
    indigo: "text-indigo-400 bg-indigo-500/10",
    cyan: "text-cyan-400 bg-cyan-500/10",
    rose: "text-rose-400 bg-rose-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
  };
  return (
    <div className="bg-[#1e293b] p-6 rounded-3xl border border-white/5 hover:border-indigo-500/20 transition-all group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110 ${themes[color]}`}>{icon}</div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold italic tracking-tight">{value}</span>
        <span className="text-[10px] font-bold text-gray-500 uppercase">{unit}</span>
      </div>
    </div>
  );
}

function DischargePage({ patient_id, role, goBack }) {
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const isAdmin = role === 'admin';

  useEffect(() => {
    axios.get(`${API_BASE}/discharge_report/${patient_id}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, [patient_id]);

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
      <div className="text-center">
        <Activity className="animate-spin text-indigo-500 mb-4 mx-auto" size={48} />
        <p className="text-gray-400 italic">Generating Discharge Report...</p>
      </div>
    </div>
  );

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await axios.post(`${API_BASE}/generate_report/${patient_id}`);
      window.open(`${API_BASE}${res.data.file_url}`, '_blank');
    } catch (err) {
      alert("Error generating PDF: " + (err.response?.data?.detail || err.message));
    }
    setDownloading(false);
  };

  const isDischarged = data.patient?.discharge === true;
  const decisionDecision = data.decision?.discharge === true;
  const isReady = isDischarged || decisionDecision;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6 md:p-10 space-y-8 pb-20">
      {/* Top Banner */}
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#1e293b] p-6 rounded-3xl border border-white/5 shadow-xl">
        <div>
          <button onClick={goBack} className="text-gray-400 hover:text-white mb-4 text-xs font-bold uppercase tracking-widest">
            ← Back to Patient
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <CheckCircle2 className="text-emerald-400"/> Discharge Summary
          </h1>
          <p className="text-gray-400 mt-2">Patient ID: {patient_id} | Name: {data.patient?.name}</p>
        </div>
        <div className="flex gap-4 items-center">
            {isDischarged ? (
                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold flex flex-col items-center">
                   <span className="uppercase text-[10px] tracking-widest">Already Discharged</span>
                   <span className="text-xs">{data.patient?.discharged_at ? new Date(data.patient.discharged_at).toLocaleString() : ''}</span>
                </div>
            ) : isReady ? (
                <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold uppercase text-xs tracking-widest">
                  ✅ Ready for Discharge
                </span>
            ) : (
                <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl max-w-xs">
                  <span className="font-bold uppercase text-[10px] tracking-widest block mb-1">❌ Not Ready</span>
                  <span className="text-xs italic">{data.decision?.reason || 'Criteria not met'}</span>
                </div>
            )}
            
            {isAdmin && isReady && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl uppercase text-xs tracking-widest flex items-center gap-2"
                >
                  <Activity size={16} /> {downloading ? 'Generating...' : 'Download PDF'}
                </button>
            )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Profile Snapshot */}
        <div className="bg-[#1e293b] rounded-3xl p-6 border border-white/5">
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Users size={16}/> Profile Snapshot</h3>
           <div className="space-y-4">
              <ProfileItem label="Diagnosis" value={data.patient?.disease} />
              <ProfileItem label="Doctor Notes" value={data.patient?.doctor_notes || 'No notes provided.'} />
              <ProfileItem label="Admission Date" value={data.patient?.admission_date ? new Date(data.patient.admission_date).toLocaleDateString() : 'N/A'} />
           </div>
        </div>
        
        {/* Billing Overview */}
        <div className="bg-[#1e293b] rounded-3xl p-6 border border-white/5">
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4"><CreditCard size={16}/> Financial Settlment</h3>
           <div className="space-y-4 text-sm mt-6">
              <div className="flex justify-between">
                 <span className="text-gray-400">Total Bill</span>
                 <span className="font-bold text-white">₹{data.billing?.total_bill?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                 <span className="text-gray-400">Total Paid</span>
                 <span className="font-bold text-blue-400">₹{data.payments?.reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between">
                 <span className="font-bold text-gray-400 uppercase text-xs tracking-widest">Balance</span>
                 <span className="font-black text-white text-lg">₹{data.billing?.remaining_balance?.toLocaleString()}</span>
              </div>
           </div>
        </div>
      </div>
      
      {/* Vitals & Alerts Highlights */}
      <div className="max-w-4xl mx-auto space-y-6">
        <h3 className="text-lg font-bold flex items-center gap-2"><Thermometer/> Critical Highlights</h3>
        {data.alerts?.length > 0 && (
           <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl mb-4">
              <h4 className="text-rose-400 text-xs font-bold uppercase tracking-widest mb-2">Recent Alerts</h4>
              <ul className="list-disc pl-5 space-y-1">
                 {data.alerts.slice(0, 3).map((a, i) => (
                    <li key={i} className="text-xs text-rose-200">{a.message} <span className="text-gray-500">({new Date(a.timestamp).toLocaleDateString()})</span></li>
                 ))}
              </ul>
           </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {data.vitals?.slice(0, 4).map((v, i) => (
             <div key={i} className="bg-[#1e293b] border border-white/5 p-4 rounded-xl text-center">
                 <span className="block text-[8px] text-gray-500 uppercase font-bold mb-2">{new Date(v.timestamp).toLocaleString([], {hour:'2-digit', minute:'2-digit', month: 'short', day: 'numeric'})}</span>
                 <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[8px] uppercase">HR</span>
                      <span className="font-bold">{v.heart_rate}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[8px] uppercase">SpO2</span>
                      <span className="font-bold">{v.spo2}%</span>
                    </div>
                 </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

export default App;
