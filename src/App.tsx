import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Plus, 
  Briefcase, 
  Building2, 
  DollarSign, 
  X, 
  Send,
  Loader2,
  ChevronRight,
  Filter,
  User,
  LogOut,
  CheckCircle2,
  Clock,
  AlertCircle,
  LayoutDashboard,
  FileText,
  Users,
  Menu,
  Sparkles
} from 'lucide-react';
import { Job, User as UserType, Company, AuthResponse, Application, AdminStats } from './types';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER_USER' | 'REGISTER_COMPANY'>('LOGIN');
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [view, setView] = useState<'HOME' | 'DASHBOARD'>('HOME');
  const [dashboardView, setDashboardView] = useState<'OVERVIEW' | 'RESUME' | 'ADMIN' | 'PAYMENT' | 'PROFILE'>('OVERVIEW');
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Auth State
  const [token, setToken] = useState<string | null>(localStorage.getItem('vaga_token'));
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [userRole, setUserRole] = useState<string | null>(localStorage.getItem('vaga_role'));

  // Dashboard Data
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [companyApplications, setCompanyApplications] = useState<Application[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<Job[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const cities = ["Cuiabá", "Várzea Grande", "Rondonópolis", "Sinop", "Sorriso", "Tangará da Serra", "Lucas do Rio Verde", "Primavera do Leste"].sort();
  const categories = ["Varejo", "Vendas", "Administrativo", "Marketing", "Tecnologia", "Logística", "Indústria", "Saúde", "Educação", "Construção Civil", "Atendimento", "Financeiro", "Recursos Humanos"].sort();

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCity, selectedCategory]);

  const fetchAiRecommendations = async () => {
    setLoadingAI(true);
    try {
      const response = await fetch('/api/recommendations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAiRecommendations(data);
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleQuickApply = async (jobId: string) => {
    if (!token) {
      setIsAuthModalOpen(true);
      setAuthMode('LOGIN');
      return;
    }
    if (userRole !== 'CANDIDATE') return;

    setApplyingId(jobId);
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ job_id: jobId, message: 'Candidatura rápida via VAGA MT PRO.' })
      });
      if (response.ok) {
        // Update local state to show applied status immediately
        setMyApplications(prev => [...prev, { 
          id: Math.random().toString(), 
          job_id: jobId, 
          user_id: currentUser?.id || '',
          status: 'PENDING',
          message: 'Candidatura rápida',
          created_at: new Date().toISOString(),
          job_title: jobs.find(j => j.id === jobId)?.title || '',
          company_name: jobs.find(j => j.id === jobId)?.company_name || ''
        } as Application]);
      }
    } catch (error) {
      console.error('Quick apply error:', error);
    } finally {
      setApplyingId(null);
    }
  };

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('vaga_user');
      const savedCompany = localStorage.getItem('vaga_company');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));
      if (savedCompany) setCurrentCompany(JSON.parse(savedCompany));
      
      if (userRole === 'CANDIDATE') {
        fetchMyApplications();
        fetchAiRecommendations();
      }
      if (userRole === 'COMPANY') fetchCompanyApplications();
      if (userRole === 'ADMIN') fetchAdminStats();
    }
  }, [token, userRole]);

  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAdminStats(data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const handleUpdateAdminSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const pix_key = formData.get('pix_key');
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pix_key })
      });
      if (response.ok) {
        alert('Configurações salvas!');
        fetchAdminStats();
      }
    } catch (error) {
      console.error('Update settings error:', error);
    }
  };

  const handleCompanyPayment = async () => {
    try {
      const response = await fetch('/api/company/pay', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchAdminStats(); // Refresh if admin is viewing
      }
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const payload = Object.fromEntries(formData);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        alert('Perfil atualizado com sucesso!');
        fetchUserProfile();
        setIsSideMenuOpen(false);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/jobs?${params.toString()}`);
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const response = await fetch('/api/my-applications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMyApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentUser(data);
        localStorage.setItem('vaga_user', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };


  const handleProcessPayment = async () => {
    try {
      const response = await fetch('/api/company/pay', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        // In a real app, we'd redirect to PIX or Stripe
      }
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  const handleSaveAdminSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const pix_key = formData.get('pix_key');

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pix_key })
      });
      if (response.ok) {
        alert('Configurações salvas!');
        fetchAdminStats();
      }
    } catch (error) {
      console.error('Admin settings error:', error);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch('/api/user/resume', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        alert('Currículo enviado com sucesso!');
        fetchUserProfile();
      } else {
        const data = await response.json();
        alert(data.error || 'Falha no upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const fetchCompanyApplications = async () => {
    try {
      const response = await fetch('/api/company/applications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCompanyApplications(data);
    } catch (error) {
      console.error('Error fetching company applications:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data: AuthResponse = await response.json();
      if (response.ok) {
        setToken(data.token);
        setUserRole(data.role);
        localStorage.setItem('vaga_token', data.token);
        localStorage.setItem('vaga_role', data.role);
        if (data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('vaga_user', JSON.stringify(data.user));
        }
        if (data.company) {
          setCurrentCompany(data.company);
          localStorage.setItem('vaga_company', JSON.stringify(data.company));
        }
        setIsAuthModalOpen(false);
      } else {
        alert(data.user || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const payload = Object.fromEntries(formData);

    try {
      const response = await fetch('/api/auth/register/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data: AuthResponse = await response.json();
      if (response.ok) {
        setToken(data.token);
        setUserRole('CANDIDATE');
        setCurrentUser(data.user!);
        localStorage.setItem('vaga_token', data.token);
        localStorage.setItem('vaga_role', 'CANDIDATE');
        localStorage.setItem('vaga_user', JSON.stringify(data.user));
        setIsAuthModalOpen(false);
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const payload = Object.fromEntries(formData);

    try {
      const response = await fetch('/api/auth/register/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data: AuthResponse = await response.json();
      if (response.ok) {
        setToken(data.token);
        setUserRole('COMPANY');
        setCurrentCompany(data.company!);
        localStorage.setItem('vaga_token', data.token);
        localStorage.setItem('vaga_role', 'COMPANY');
        localStorage.setItem('vaga_company', JSON.stringify(data.company));
        setIsAuthModalOpen(false);
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setCurrentCompany(null);
    setUserRole(null);
    localStorage.removeItem('vaga_token');
    localStorage.removeItem('vaga_role');
    localStorage.removeItem('vaga_user');
    localStorage.removeItem('vaga_company');
    setView('HOME');
  };

  const handleApply = async (jobId: string) => {
    if (!token) {
      setIsAuthModalOpen(true);
      setAuthMode('LOGIN');
      return;
    }
    if (userRole !== 'CANDIDATE') {
      alert('Somente candidatos podem se candidatar a vagas.');
      return;
    }

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ job_id: jobId, message: 'Tenho interesse nesta vaga.' })
      });
      if (response.ok) {
        alert('Candidatura enviada com sucesso!');
        fetchMyApplications();
      } else {
        const data = await response.json();
        alert(data.error || 'Falha ao se candidatar');
      }
    } catch (error) {
      console.error('Application error:', error);
    }
  };

  const handleUpdateApplicationStatus = async (appId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/applications/${appId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        fetchCompanyApplications();
      }
    } catch (error) {
      console.error('Update status error:', error);
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const payload = Object.fromEntries(formData);

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setIsJobModalOpen(false);
        fetchJobs();
      }
    } catch (error) {
      console.error('Post job error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-vaga-dark text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setView('HOME')}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setIsSideMenuOpen(true); }}
              className="p-2 mr-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="bg-vaga-yellow p-1.5 rounded-lg">
              <Briefcase className="w-6 h-6 text-vaga-dark" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              VAGA MT <span className="text-vaga-yellow">PRO</span>
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => setView('HOME')} className="nav-link text-white hover:text-vaga-yellow">Vagas</button>
            <button className="nav-link text-white hover:text-vaga-yellow">Empresas</button>
            {token ? (
              <div className="flex items-center gap-4">
                {userRole === 'COMPANY' && (
                  <button 
                    onClick={() => { setView('DASHBOARD'); setIsJobModalOpen(true); }}
                    className="btn-accent px-4 py-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Postar Vaga
                  </button>
                )}
                <button 
                  onClick={() => setView('DASHBOARD')}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Painel
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-300 hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setIsAuthModalOpen(true); setAuthMode('LOGIN'); }}
                  className="px-4 py-2 font-semibold hover:text-vaga-yellow transition-colors"
                >
                  Entrar
                </button>
                <button 
                  onClick={() => { setIsAuthModalOpen(true); setAuthMode('REGISTER_USER'); }}
                  className="btn-accent"
                >
                  Criar Conta
                </button>
              </div>
            )}
          </div>

          <button className="md:hidden p-2">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {view === 'HOME' ? (
        <>
          {/* Hero Section */}
          <section className="bg-vaga-dark text-white py-20 px-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#FFC107_0%,transparent_50%)]" />
            </div>
            
            <div className="max-w-5xl mx-auto text-center relative z-10">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
              >
                Conectando talentos de Mato Grosso às <br />
                <span className="text-vaga-yellow">melhores oportunidades.</span>
              </motion.h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                A plataforma profissional de vagas focada no crescimento do nosso estado. 
                Simples, rápida e moderna.
              </p>

              <div className="bg-white p-2 max-w-4xl mx-auto flex flex-col md:flex-row gap-2 rounded-2xl shadow-2xl relative z-20">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cargo, empresa ou palavra-chave..."
                    className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-vaga-blue/20 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-64 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select 
                    className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 text-slate-900 appearance-none focus:ring-2 focus:ring-vaga-blue/20 outline-none"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                  >
                    <option value="">Todas as cidades</option>
                    {cities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={fetchJobs}
                  className="btn-accent px-8 py-4 rounded-xl"
                >
                  Buscar Vagas
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <p className="text-vaga-yellow text-2xl font-bold">500+</p>
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Vagas Ativas</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <p className="text-vaga-yellow text-2xl font-bold">120+</p>
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Empresas</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <p className="text-vaga-yellow text-2xl font-bold">15k+</p>
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Candidatos</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <p className="text-vaga-yellow text-2xl font-bold">MT</p>
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Foco Total</p>
                </div>
              </div>
            </div>
          </section>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar Filters */}
              <aside className="w-full lg:w-64 space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Categorias</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => { setSelectedCategory(''); fetchJobs(); }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedCategory === '' ? 'bg-vaga-blue text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                    >
                      Todas as áreas
                    </button>
                    {categories.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => { setSelectedCategory(cat); fetchJobs(); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedCategory === cat ? 'bg-vaga-blue text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Job List */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">Vagas Disponíveis</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    <Filter className="w-4 h-4" />
                    {jobs.length} resultados encontrados
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-vaga-blue animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Buscando as melhores oportunidades...</p>
                  </div>
                ) : jobs.length > 0 ? (
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-6 hover:border-vaga-blue hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center gap-6"
                      >
                        <div className="bg-slate-100 w-16 h-16 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-vaga-blue/5 transition-colors">
                          <Building2 className="w-8 h-8 text-slate-400 group-hover:text-vaga-blue transition-colors" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-xl font-bold text-slate-900 group-hover:text-vaga-blue transition-colors">
                              {job.title}
                            </h4>
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              {job.contract_type}
                            </span>
                            {new Date(job.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
                              <span className="bg-vaga-yellow text-vaga-dark text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Nova
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 font-medium mb-3">{job.company_name}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              {job.city}
                            </div>
                            {job.salary && (
                              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                                <DollarSign className="w-4 h-4" />
                                {job.salary}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-slate-400" />
                              {new Date(job.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {userRole === 'CANDIDATE' && myApplications.some(app => app.job_id === job.id) ? (
                            <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-lg">
                              <CheckCircle2 className="w-4 h-4" />
                              Candidatado
                            </span>
                          ) : (
                            <>
                              <button 
                                onClick={() => { setSelectedJob(job); setIsDetailsModalOpen(true); }}
                                className="btn-primary"
                              >
                                Detalhes
                              </button>
                              <button 
                                onClick={() => handleQuickApply(job.id)}
                                disabled={applyingId === job.id}
                                className="btn-accent hidden sm:flex items-center gap-2 min-w-[180px]"
                              >
                                {applyingId === job.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Sparkles className="w-4 h-4" />
                                )}
                                {applyingId === job.id ? 'Enviando...' : 'Candidatura Rápida'}
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Nenhuma vaga encontrada</h4>
                    <p className="text-slate-500">Tente mudar os filtros ou pesquisar por outro termo.</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </>
      ) : (
        /* Dashboard View */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Dashboard Sidebar */}
            <aside className="w-full md:w-64 space-y-2">
              <div className="p-6 bg-vaga-dark text-white rounded-2xl mb-6">
                <p className="text-xs font-bold text-vaga-yellow uppercase tracking-widest mb-1">Bem-vindo,</p>
                <h3 className="text-lg font-bold truncate">
                  {userRole === 'CANDIDATE' ? currentUser?.name : currentCompany?.name}
                </h3>
                <p className="text-xs text-slate-400 mt-2">{userRole === 'CANDIDATE' ? 'Candidato' : 'Empresa'}</p>
              </div>
              
              <button 
                onClick={() => setDashboardView('OVERVIEW')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${dashboardView === 'OVERVIEW' ? 'bg-vaga-blue text-white' : 'hover:bg-slate-200 text-slate-600 font-medium'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Visão Geral
              </button>
              {userRole === 'CANDIDATE' && (
                <>
                  <button 
                    onClick={() => setDashboardView('RESUME')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${dashboardView === 'RESUME' ? 'bg-vaga-blue text-white' : 'hover:bg-slate-200 text-slate-600 font-medium'}`}
                  >
                    <FileText className="w-5 h-5" />
                    Meu Currículo
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-200 text-slate-600 font-medium transition-colors">
                    <CheckCircle2 className="w-5 h-5" />
                    Candidaturas
                  </button>
                </>
              )}
              {userRole === 'COMPANY' && (
                <>
                  <button 
                    onClick={() => setDashboardView('PAYMENT')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${dashboardView === 'PAYMENT' ? 'bg-vaga-blue text-white' : 'hover:bg-slate-200 text-slate-600 font-medium'}`}
                  >
                    <DollarSign className="w-5 h-5" />
                    Assinatura Premium
                  </button>
                  <button 
                    onClick={() => { setDashboardView('OVERVIEW'); setIsJobModalOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Publicar Vaga
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-200 text-slate-600 font-medium transition-colors">
                    <Users className="w-5 h-5" />
                    Candidatos
                  </button>
                </>
              )}
              {userRole === 'ADMIN' && (
                <button 
                  onClick={() => setDashboardView('ADMIN')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${dashboardView === 'ADMIN' ? 'bg-vaga-blue text-white' : 'hover:bg-slate-200 text-slate-600 font-medium'}`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Painel Admin
                </button>
              )}
            </aside>

            {/* Dashboard Content */}
            <div className="flex-1 space-y-8">
              {dashboardView === 'OVERVIEW' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="glass-card p-6 border-l-4 border-vaga-blue">
                      <p className="text-sm font-bold text-slate-400 uppercase mb-1">
                        {userRole === 'CANDIDATE' ? 'Candidaturas' : 'Vagas Ativas'}
                      </p>
                      <h4 className="text-3xl font-bold text-slate-900">
                        {userRole === 'CANDIDATE' ? myApplications.length : jobs.filter(j => j.company_id === currentCompany?.id).length}
                      </h4>
                    </div>
                    <div className="glass-card p-6 border-l-4 border-vaga-yellow">
                      <p className="text-sm font-bold text-slate-400 uppercase mb-1">
                        {userRole === 'CANDIDATE' ? 'Visualizações' : 'Total Candidatos'}
                      </p>
                      <h4 className="text-3xl font-bold text-slate-900">
                        {userRole === 'CANDIDATE' ? '12' : companyApplications.length}
                      </h4>
                    </div>
                    <div className="glass-card p-6 border-l-4 border-emerald-500">
                      <p className="text-sm font-bold text-slate-400 uppercase mb-1">Status</p>
                      <h4 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Verificado
                      </h4>
                    </div>
                  </div>

                  <div className="glass-card">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-900">
                        {userRole === 'CANDIDATE' ? 'Minhas Candidaturas Recentes' : 'Últimos Candidatos'}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          <tr>
                            {userRole === 'CANDIDATE' ? (
                              <>
                                <th className="px-6 py-4">Vaga</th>
                                <th className="px-6 py-4">Empresa</th>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Status</th>
                              </>
                            ) : (
                              <>
                                <th className="px-6 py-4">Candidato</th>
                                <th className="px-6 py-4">Vaga</th>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Contato</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {userRole === 'CANDIDATE' ? (
                            myApplications.map(app => (
                              <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900">{app.job_title}</td>
                                <td className="px-6 py-4 text-slate-600">{app.company_name}</td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{new Date(app.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                  <span className="bg-vaga-blue/10 text-vaga-blue text-[10px] font-bold px-2 py-1 rounded uppercase">
                                    {app.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            companyApplications.map(app => (
                              <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900">{app.user_name}</td>
                                <td className="px-6 py-4 text-slate-600">{app.job_title}</td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{new Date(app.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                  <select 
                                    value={app.status}
                                    onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold uppercase text-vaga-blue outline-none focus:ring-1 focus:ring-vaga-blue"
                                  >
                                    <option value="PENDING">Pendente</option>
                                    <option value="REVIEWING">Em Análise</option>
                                    <option value="INTERVIEW">Entrevista</option>
                                    <option value="ACCEPTED">Aprovado</option>
                                    <option value="REJECTED">Reprovado</option>
                                  </select>
                                </td>
                              </tr>
                            ))
                          )}
                          {(userRole === 'CANDIDATE' ? myApplications : companyApplications).length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                Nenhuma atividade registrada ainda.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {userRole === 'CANDIDATE' && (
                    <div className="glass-card overflow-hidden">
                      <div className="p-6 border-b border-slate-100 bg-vaga-blue/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-vaga-blue p-2 rounded-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">Recomendações da IA</h3>
                            <p className="text-xs text-slate-500">Vagas que combinam com seu perfil em Mato Grosso</p>
                          </div>
                        </div>
                        {loadingAI && <div className="animate-spin rounded-full h-5 w-5 border-2 border-vaga-blue border-t-transparent"></div>}
                      </div>
                      <div className="p-6">
                        {aiRecommendations.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {aiRecommendations.map(job => (
                              <div key={job.id} className="p-4 border border-slate-100 rounded-xl hover:border-vaga-blue/30 transition-all group">
                                <h4 className="font-bold text-slate-900 mb-1 group-hover:text-vaga-blue transition-colors">{job.title}</h4>
                                <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {job.city}
                                </p>
                                <button 
                                  onClick={() => {
                                    setView('HOME');
                                    setSearchTerm(job.title);
                                    fetchJobs();
                                  }}
                                  className="text-xs font-bold text-vaga-blue hover:underline"
                                >
                                  Ver Detalhes
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-slate-400 text-sm">
                              {loadingAI ? 'Analisando vagas...' : 'Nenhuma recomendação disponível no momento.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : dashboardView === 'RESUME' ? (
                /* Resume View */
                <div className="glass-card p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-vaga-blue p-3 rounded-xl">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">Meu Currículo</h3>
                      <p className="text-slate-500">Mantenha seu currículo atualizado para aumentar suas chances.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                        <Plus className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                        <h4 className="font-bold text-slate-900 mb-2">Upload de Novo Currículo</h4>
                        <p className="text-sm text-slate-500 mb-6">Apenas arquivos PDF são aceitos.</p>
                        <label className="btn-primary cursor-pointer inline-flex">
                          Selecionar PDF
                          <input 
                            type="file" 
                            accept=".pdf" 
                            className="hidden" 
                            onChange={handleResumeUpload}
                          />
                        </label>
                      </div>

                      <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          Dica Profissional
                        </h4>
                        <p className="text-sm text-emerald-700">
                          Empresas em Mato Grosso valorizam currículos claros e objetivos. 
                          Certifique-se de incluir suas experiências mais recentes e contatos atualizados.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-900">Currículo Atual</h4>
                      {currentUser?.resume_url ? (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Visualização do PDF</span>
                            <a 
                              href={currentUser.resume_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-vaga-blue text-sm font-bold hover:underline"
                            >
                              Abrir em nova aba
                            </a>
                          </div>
                          <iframe 
                            src={currentUser.resume_url} 
                            className="w-full h-[400px]"
                            title="Currículo"
                          />
                        </div>
                      ) : (
                        <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-100">
                          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400">Você ainda não enviou um currículo.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : dashboardView === 'ADMIN' ? (
                /* Admin View */
                <div className="space-y-8">
                  <div className="glass-card p-8">
                    <h3 className="text-2xl font-bold text-slate-900 mb-6">Configurar Recebimentos</h3>
                    <form onSubmit={handleUpdateAdminSettings} className="max-w-md space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chave PIX ou Conta Bancária</label>
                        <input 
                          name="pix_key"
                          type="text" 
                          defaultValue={adminStats?.pix_key}
                          placeholder="Digite sua chave PIX" 
                          className="input-field" 
                        />
                      </div>
                      <button type="submit" className="btn-primary">Salvar Configurações</button>
                    </form>
                  </div>

                  <div className="glass-card">
                    <div className="p-6 border-b border-slate-100">
                      <h3 className="text-xl font-bold text-slate-900">Empresas Pagantes</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Empresa</th>
                            <th className="px-6 py-4">Valor</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {adminStats?.subscriptions.map(sub => (
                            <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900">{sub.company_name}</td>
                              <td className="px-6 py-4 text-emerald-600 font-bold">R$ {sub.amount.toFixed(2)}</td>
                              <td className="px-6 py-4 text-slate-500 text-sm">{new Date(sub.created_at).toLocaleDateString()}</td>
                              <td className="px-6 py-4">
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded uppercase">
                                  {sub.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(!adminStats?.subscriptions || adminStats.subscriptions.length === 0) && (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Nenhum pagamento registrado.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : dashboardView === 'PAYMENT' ? (
                /* Payment View */
                <div className="glass-card p-12 text-center max-w-2xl mx-auto">
                  <div className="bg-vaga-yellow/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <DollarSign className="w-10 h-10 text-vaga-yellow" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Plano Premium - R$ 50/mês</h2>
                  <p className="text-slate-600 mb-8 text-lg">
                    Para divulgar vagas ilimitadas e ter destaque em Mato Grosso, assine nosso plano premium.
                  </p>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 text-left">
                    <h4 className="font-bold text-slate-900 mb-4">Benefícios do Plano:</h4>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Vagas ilimitadas por mês
                      </li>
                      <li className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Selo de Empresa Verificada
                      </li>
                      <li className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Destaque no topo das buscas
                      </li>
                    </ul>
                  </div>
                  <button 
                    onClick={handleCompanyPayment}
                    className="btn-accent w-full py-4 text-lg"
                  >
                    Gerar Pagamento (PIX)
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="bg-vaga-dark text-white py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-vaga-yellow p-1.5 rounded-lg">
                <Briefcase className="w-6 h-6 text-vaga-dark" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                VAGA MT <span className="text-vaga-yellow">PRO</span>
              </h1>
            </div>
            <p className="text-slate-400 max-w-sm mb-6">
              A plataforma definitiva para quem busca crescer profissionalmente em Mato Grosso. 
              Vagas verificadas e empresas de confiança.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 text-vaga-yellow uppercase tracking-widest text-sm">Links Úteis</h4>
            <ul className="space-y-3 text-slate-400">
              <li><button className="hover:text-white transition-colors">Sobre Nós</button></li>
              <li><button className="hover:text-white transition-colors">Para Empresas</button></li>
              <li><button className="hover:text-white transition-colors">Privacidade</button></li>
              <li><button className="hover:text-white transition-colors">Termos de Uso</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-vaga-yellow uppercase tracking-widest text-sm">Suporte</h4>
            <ul className="space-y-3 text-slate-400">
              <li><button className="hover:text-white transition-colors">Central de Ajuda</button></li>
              <li><button className="hover:text-white transition-colors">Contato</button></li>
              <li><button className="hover:text-white transition-colors">FAQ</button></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-white/10 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} VAGA MT PRO. Todos os direitos reservados.
        </div>
      </footer>

      {/* Side Menu / Profile Drawer */}
      <AnimatePresence>
        {isSideMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSideMenuOpen(false)}
              className="fixed inset-0 z-50 bg-vaga-dark/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-vaga-dark text-white">
                <h3 className="text-xl font-bold">Meu Perfil</h3>
                <button onClick={() => setIsSideMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</label>
                    <input 
                      name="name"
                      type="text" 
                      defaultValue={currentUser?.name || currentCompany?.name}
                      className="input-field" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</label>
                    <input 
                      name="email"
                      type="email" 
                      defaultValue={currentUser?.email || currentCompany?.email}
                      className="input-field" 
                    />
                  </div>
                  
                  {userRole === 'CANDIDATE' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bairro (Cuiabá)</label>
                        <select 
                          name="neighborhood"
                          defaultValue={currentUser?.neighborhood || ''}
                          className="input-field"
                        >
                          <option value="">Selecione seu bairro</option>
                          <option>Alvorada</option>
                          <option>Areão</option>
                          <option>Boa Esperança</option>
                          <option>Campo Velho</option>
                          <option>Centro Norte</option>
                          <option>Centro Sul</option>
                          <option>Coophamil</option>
                          <option>Coxipó</option>
                          <option>Dom Aquino</option>
                          <option>Duque de Caxias</option>
                          <option>Goiabeiras</option>
                          <option>Jardim Itália</option>
                          <option>Jardim Leblon</option>
                          <option>Jardim Petrópolis</option>
                          <option>Jardim Tropical</option>
                          <option>Morada da Serra</option>
                          <option>Morada do Ouro</option>
                          <option>Osmar Cabral</option>
                          <option>Pedra 90</option>
                          <option>Planalto</option>
                          <option>Porto</option>
                          <option>Praeiro</option>
                          <option>Ribeirão do Lipa</option>
                          <option>Santa Amália</option>
                          <option>Santa Helena</option>
                          <option>Santa Isabel</option>
                          <option>Santa Marta</option>
                          <option>Santa Rosa</option>
                          <option>São João Del Rey</option>
                          <option>Terra Nova</option>
                          <option>Tijucal</option>
                          <option>Verdão</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interesse</label>
                        <select 
                          name="interest"
                          defaultValue={currentUser?.interest || 'Procurando Emprego'}
                          className="input-field"
                        >
                          <option>Procurando Emprego</option>
                          <option>Sou Empresa</option>
                        </select>
                      </div>
                    </>
                  )}

                  <button type="submit" className="btn-primary w-full py-4 mt-8">Salvar Perfil</button>
                </form>

                <div className="mt-12 pt-8 border-t border-slate-100">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-50 py-3 rounded-xl transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Sair da Conta
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Job Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsModalOpen(false)}
              className="absolute inset-0 bg-vaga-dark/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="bg-vaga-blue p-2 rounded-lg">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-vaga-dark">{selectedJob.title}</h3>
                    <p className="text-sm text-slate-500">{selectedJob.company_name}</p>
                  </div>
                </div>
                <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cidade</p>
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {selectedJob.city}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Salário</p>
                    <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> {selectedJob.salary || 'A combinar'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Contrato</p>
                    <p className="text-sm font-bold text-slate-700">{selectedJob.contract_type}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Categoria</p>
                    <p className="text-sm font-bold text-slate-700">{selectedJob.category}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-vaga-blue" />
                    Descrição da Vaga
                  </h4>
                  <div className="text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedJob.description}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => {
                    handleApply(selectedJob.id);
                    setIsDetailsModalOpen(false);
                  }}
                  className="btn-primary flex-1 py-4"
                >
                  Candidatar-se Agora
                </button>
                <button 
                  onClick={() => {
                    handleQuickApply(selectedJob.id);
                    setIsDetailsModalOpen(false);
                  }}
                  className="btn-accent px-8"
                >
                  Candidatura Rápida
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-vaga-dark/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-vaga-dark">
                    {authMode === 'LOGIN' ? 'Bem-vindo de volta' : 'Criar nova conta'}
                  </h3>
                  <button onClick={() => setIsAuthModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                {authMode === 'LOGIN' ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                      <input required name="email" type="email" placeholder="seu@email.com" className="input-field" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
                      <input required name="password" type="password" placeholder="••••••••" className="input-field" />
                    </div>
                    <button type="submit" className="btn-primary w-full py-4">Entrar na Plataforma</button>
                    <div className="text-center pt-4">
                      <p className="text-sm text-slate-500">
                        Não tem uma conta? <br />
                        <button 
                          type="button"
                          onClick={() => setAuthMode('REGISTER_USER')}
                          className="text-vaga-blue font-bold hover:underline"
                        >
                          Cadastrar como Candidato
                        </button>
                        <span className="mx-2 text-slate-300">|</span>
                        <button 
                          type="button"
                          onClick={() => setAuthMode('REGISTER_COMPANY')}
                          className="text-vaga-blue font-bold hover:underline"
                        >
                          Empresa
                        </button>
                      </p>
                    </div>
                  </form>
                ) : authMode === 'REGISTER_USER' ? (
                  <form onSubmit={handleRegisterUser} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                      <input required name="name" type="text" placeholder="Seu nome" className="input-field" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                      <input required name="email" type="email" placeholder="seu@email.com" className="input-field" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Cidade</label>
                      <select required name="city" className="input-field appearance-none">
                        <option value="">Selecione sua cidade</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
                      <input required name="password" type="password" placeholder="Mínimo 6 caracteres" className="input-field" />
                    </div>
                    <button type="submit" className="btn-primary w-full py-4">Criar Perfil Profissional</button>
                    <button 
                      type="button"
                      onClick={() => setAuthMode('LOGIN')}
                      className="w-full text-sm text-slate-500 hover:text-vaga-blue transition-colors"
                    >
                      Já tenho uma conta
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterCompany} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Nome da Empresa</label>
                      <input required name="name" type="text" placeholder="Nome fantasia" className="input-field" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">CNPJ</label>
                      <input required name="cnpj" type="text" placeholder="00.000.000/0000-00" className="input-field" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">E-mail Corporativo</label>
                      <input required name="email" type="email" placeholder="contato@empresa.com" className="input-field" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Cidade Sede</label>
                      <select required name="city" className="input-field appearance-none">
                        <option value="">Selecione a cidade</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
                      <input required name="password" type="password" placeholder="Senha de acesso" className="input-field" />
                    </div>
                    <button type="submit" className="btn-primary w-full py-4">Cadastrar Empresa</button>
                    <button 
                      type="button"
                      onClick={() => setAuthMode('LOGIN')}
                      className="w-full text-sm text-slate-500 hover:text-vaga-blue transition-colors"
                    >
                      Já tenho uma conta
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Job Post Modal */}
      <AnimatePresence>
        {isJobModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJobModalOpen(false)}
              className="absolute inset-0 bg-vaga-dark/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-bold text-vaga-dark">Publicar Nova Oportunidade</h3>
                <button onClick={() => setIsJobModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handlePostJob} className="p-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Título da Vaga</label>
                    <input required name="title" type="text" placeholder="Ex: Analista Financeiro" className="input-field" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                    <select required name="category" className="input-field appearance-none">
                      <option value="">Selecione a área</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Cidade</label>
                    <select required name="city" className="input-field appearance-none">
                      <option value="">Selecione a cidade</option>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Contrato</label>
                    <select required name="contract_type" className="input-field appearance-none">
                      <option value="CLT">CLT</option>
                      <option value="PJ">PJ</option>
                      <option value="Estágio">Estágio</option>
                      <option value="Freelancer">Freelancer</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Salário (Opcional)</label>
                    <input name="salary" type="text" placeholder="Ex: R$ 3.500,00 ou A combinar" className="input-field" />
                  </div>
                </div>

                <div className="space-y-1 mb-6">
                  <label className="text-xs font-bold text-slate-500 uppercase">Descrição e Requisitos</label>
                  <textarea required name="description" rows={6} placeholder="Descreva as responsabilidades, requisitos e benefícios da vaga..." className="input-field resize-none" />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsJobModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Publicar Vaga</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
