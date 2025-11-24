import React, { useState, useEffect } from 'react';
import { 
  Leaf, Factory, ShieldCheck, Activity, ArrowRightLeft, 
  Trees, FileText, CheckCircle, AlertCircle, Wallet, 
  Globe, Lock, User, Mail, Link as LinkIcon, MapPin, BarChart3, Plus, X, Gavel, Clock, Gauge, ExternalLink, FolderOpen, TrendingUp, CreditCard, DollarSign, Calendar
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { auth, db } from './firebase'; 
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// --- HELPER: LOAD RAZORPAY SCRIPT ---
const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// --- MOCK BLOCKCHAIN SERVICE ---
const BlockchainService = {
  connectWallet: async () => {
    return new Promise(resolve => setTimeout(() => resolve("0x71C...9A23"), 800));
  },
  submitMRV: async (data, type) => {
    return new Promise(resolve => setTimeout(() => resolve("TX_HASH_123"), 1000));
  },
  mintCredits: async (amount, receiver) => {
    return true;
  }
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('home');
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // --- SHARED STATE ---
  const [projects, setProjects] = useState([
    { 
      id: 1, 
      name: "Mangrove Alpha", 
      location: "Coastal Zone A", 
      hectares: 50, 
      rate: 7, 
      period: 1,
      absorbed: 350, 
      status: "Verified",
      evidenceLink: "https://drive.google.com/drive/folders/example1"
    },
    { 
      id: 2, 
      name: "Peatland Beta", 
      location: "Marshland B", 
      hectares: 20, 
      rate: 2.25,
      period: 1,
      absorbed: 45, 
      status: "Auditing",
      evidenceLink: "https://drive.google.com/drive/folders/example2" 
    }
  ]);

  // --- INDUSTRY STATE ---
  const [industryStats, setIndustryStats] = useState({
    creditsOwned: 50, 
    totalEmissions: 12.5,
    dailyLogs: [
      { date: '2023-10-24', amount: 2.1 },
      { date: '2023-10-25', amount: 3.4 },
      { date: '2023-10-26', amount: 1.9 },
      { date: '2023-10-27', amount: 5.1 },
    ]
  });

  // --- AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setUser({ ...currentUser, ...docSnap.data() });
            const role = docSnap.data().role;
            if (activeView === 'home') {
                if (role === 'industry') setActiveView('industry');
                else if (role === 'wetlands') setActiveView('wetlands');
                else if (role === 'admin') setActiveView('admin');
            }
          } else {
            setUser(currentUser);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setWalletAddress(null);
    setActiveView('home');
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    const address = await BlockchainService.connectWallet();
    setWalletAddress(address);
    setIsConnecting(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-teal-800">Loading Carbon Connect...</div>;

  if (!user) return <AuthPage />;

  const renderView = () => {
    switch(activeView) {
      case 'industry': return <IndustryDashboard wallet={walletAddress} user={user} stats={industryStats} setStats={setIndustryStats} />;
      case 'wetlands': return <WetlandDashboard wallet={walletAddress} user={user} projects={projects} setProjects={setProjects} />;
      case 'admin': return <AdminDashboard user={user} projects={projects} setProjects={setProjects} />;
      case 'gov': return <GovernmentView />;
      default: return <LandingPage setView={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => setActiveView('home')}>
              <div className="bg-teal-600 p-2 rounded-lg mr-2">
                <LinkIcon className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-teal-900">Carbon Connect</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              {(user.role === 'industry' || user.role === 'gov' || user.role === 'admin') && (
                <button onClick={() => setActiveView('industry')} className={`text-sm font-medium ${activeView === 'industry' ? 'text-teal-600' : 'text-slate-500 hover:text-teal-600'}`}>Industry</button>
              )}
              {(user.role === 'wetlands' || user.role === 'gov' || user.role === 'admin') && (
                <button onClick={() => setActiveView('wetlands')} className={`text-sm font-medium ${activeView === 'wetlands' ? 'text-teal-600' : 'text-slate-500 hover:text-teal-600'}`}>Wetlands</button>
              )}
              {(user.role === 'admin') && (
                <button onClick={() => setActiveView('admin')} className={`text-sm font-medium ${activeView === 'admin' ? 'text-teal-600' : 'text-slate-500 hover:text-teal-600'}`}>Administrator</button>
              )}
              <button onClick={() => setActiveView('gov')} className={`text-sm font-medium ${activeView === 'gov' ? 'text-teal-600' : 'text-slate-500 hover:text-teal-600'}`}>Oversight</button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600 border-r border-slate-200 pr-4">
                <User className="h-4 w-4" />
                <div className="flex flex-col text-right">
                  <span className="font-medium leading-none">{user.name || user.email}</span>
                  <span className="text-xs text-slate-400 capitalize">{user.role}</span>
                </div>
                <button onClick={handleLogout} className="text-xs text-red-500 hover:underline ml-2">(Logout)</button>
              </div>

              {walletAddress ? (
                <span className="bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-sm font-mono border border-teal-200 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  {walletAddress.substring(0,8)}...
                </span>
              ) : (
                <button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  {isConnecting ? '...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main>{renderView()}</main>
    </div>
  );
};

// --- INDUSTRY DASHBOARD (RAZORPAY INTEGRATED) ---
const IndustryDashboard = ({ wallet, user, stats, setStats }) => {
  const [todaysEmission, setTodaysEmission] = useState('');
  const [showMarketplace, setShowMarketplace] = useState(false);
  const INDUSTRY_DAILY_AVG = 2.5; 

  const handleLogEmission = (e) => {
    e.preventDefault();
    const amount = Number(todaysEmission);
    if (!amount || amount <= 0) return;

    const newLog = { date: new Date().toISOString().split('T')[0], amount: amount };
    
    setStats(prev => ({
      ...prev,
      totalEmissions: prev.totalEmissions + amount,
      dailyLogs: [...prev.dailyLogs, newLog]
    }));
    setTodaysEmission('');
    alert("Daily emissions logged successfully!");
  };

  const handleBuyCredits = async (pack) => {
    const res = await loadRazorpay();
    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      return;
    }

    // In a real app, you would call your backend here to create an order
    // For demo purposes, we perform a direct client-side test transaction
    const options = {
      key: "rzp_test_YOUR_KEY_HERE", // REPLACE WITH YOUR RAZORPAY TEST KEY ID
      amount: pack.price * 100, // Amount in smallest currency unit (paise)
      currency: "INR",
      name: "Carbon Connect",
      description: `Purchase ${pack.amount} Carbon Credits`,
      image: "https://cdn-icons-png.flaticon.com/512/2933/2933116.png",
      handler: function (response) {
        // Success Callback
        setStats(prev => ({
            ...prev,
            creditsOwned: prev.creditsOwned + pack.amount
        }));
        setShowMarketplace(false);
        alert(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
      },
      prefill: {
        name: user.name,
        email: user.email,
        contact: "9999999999"
      },
      theme: {
        color: "#0d9488" // Teal-600
      }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  // Calculations
  const remainingCredits = stats.creditsOwned - stats.totalEmissions;
  const progressPercent = Math.min((stats.totalEmissions / stats.creditsOwned) * 100, 100);
  const statusColor = remainingCredits < 0 ? 'text-red-600' : remainingCredits < 10 ? 'text-amber-600' : 'text-green-600';
  const progressBarColor = remainingCredits < 0 ? 'bg-red-500' : remainingCredits < 10 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Welcome, {user.name}</h2>
          <p className="text-slate-500">Compliance & Trading Portal</p>
        </div>
        <button 
          onClick={() => setShowMarketplace(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center transition transform hover:-translate-y-1"
        >
          <Wallet className="w-5 h-5 mr-2" /> Buy Carbon Credits
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 font-medium">Credits Allotted (Quota)</h3>
            <ShieldCheck className="text-blue-500" />
          </div>
          <p className="text-4xl font-bold text-slate-900">{stats.creditsOwned}</p>
          <p className="text-xs text-slate-400 mt-1">1 Credit = 1 Ton CO2</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 font-medium">Total Emissions</h3>
            <Factory className="text-slate-400" />
          </div>
          <p className="text-4xl font-bold text-slate-900">{stats.totalEmissions.toFixed(1)} <span className="text-lg font-normal text-slate-500">tons</span></p>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
            <div className={`h-2 rounded-full ${progressBarColor}`} style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className={`p-6 rounded-xl shadow-sm border ${remainingCredits < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-600 font-medium">Balance</h3>
            <Activity className={statusColor} />
          </div>
          <p className={`text-4xl font-bold ${statusColor}`}>
            {remainingCredits.toFixed(1)}
          </p>
          <p className={`text-sm font-medium mt-1 ${statusColor}`}>
            {remainingCredits < 0 ? 'CRITICAL DEFICIT' : 'Compliant'}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* LOG EMISSIONS FORM */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <Calendar className="mr-2 text-slate-500" /> 
            Log Daily Output
          </h3>
          <form onSubmit={handleLogEmission} className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg flex items-start">
               <TrendingUp className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
               <div>
                 <p className="text-sm font-bold text-blue-800">Benchmark Insight</p>
                 <p className="text-xs text-blue-600">
                   Average daily emission for an industry of your size is approx <strong>{INDUSTRY_DAILY_AVG} tons</strong>.
                 </p>
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Today's Production (Tons CO2)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.1"
                  required
                  value={todaysEmission}
                  onChange={(e) => setTodaysEmission(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-teal-500 outline-none font-mono text-lg"
                  placeholder="0.00" 
                />
                <span className="absolute right-4 top-3.5 text-slate-400 text-sm font-bold">TONS</span>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition flex justify-center items-center"
            >
              <Plus className="w-4 h-4 mr-2" /> Update Tracker
            </button>
          </form>
        </div>

        {/* RECENT LOGS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
           <h3 className="text-xl font-bold mb-4">Recent Logs</h3>
           <div className="overflow-y-auto max-h-[250px] space-y-3">
             {[...stats.dailyLogs].reverse().map((log, i) => (
               <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                 <span className="text-slate-600 font-mono text-sm">{log.date}</span>
                 <div className="flex items-center">
                    <span className={`font-bold ${log.amount > INDUSTRY_DAILY_AVG ? 'text-red-600' : 'text-green-600'}`}>
                      {log.amount} t
                    </span>
                    {log.amount > INDUSTRY_DAILY_AVG && <AlertCircle className="w-3 h-3 text-red-400 ml-2" />}
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* MARKETPLACE MODAL */}
      {showMarketplace && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-0 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
               <div>
                 <h2 className="text-2xl font-bold flex items-center"><Globe className="mr-2" /> Carbon Marketplace</h2>
                 <p className="text-slate-400 text-sm">Securely purchase verified credits via Razorpay.</p>
               </div>
               <button onClick={() => setShowMarketplace(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-8">
               <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { amount: 10, price: 1500, label: "Starter Pack" },
                    { amount: 50, price: 7000, label: "Factory Standard", best: true },
                    { amount: 100, price: 13500, label: "Enterprise" }
                  ].map((pack, i) => (
                    <div key={i} className={`border rounded-xl p-6 text-center relative hover:border-teal-500 hover:shadow-lg transition cursor-pointer group ${pack.best ? 'border-teal-500 bg-teal-50/30' : 'border-slate-200'}`}>
                       {pack.best && <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-teal-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">Best Value</span>}
                       <h4 className="text-slate-500 font-medium uppercase text-xs mb-2">{pack.label}</h4>
                       <div className="text-3xl font-bold text-slate-900 mb-1">{pack.amount} <span className="text-sm font-normal">Credits</span></div>
                       <div className="text-xl font-bold text-teal-600 mb-6">₹{pack.price}</div>
                       <button 
                         onClick={() => handleBuyCredits(pack)}
                         className="w-full py-2 rounded-lg border border-slate-300 font-bold text-slate-700 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 transition"
                       >
                         Purchase
                       </button>
                    </div>
                  ))}
               </div>

               <div className="mt-8 flex items-center justify-center text-slate-400 text-sm bg-slate-50 p-4 rounded-xl">
                  <Lock className="w-4 h-4 mr-2" />
                  <span>Payments processed securely via <strong>Razorpay</strong></span>
                  <div className="ml-4 flex gap-2">
                     <CreditCard className="w-5 h-5" />
                     <DollarSign className="w-5 h-5" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- AUTH COMPONENT (UNCHANGED) ---
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('industry');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: name,
          email: email,
          role: role,
          createdAt: new Date()
        });
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-teal-900 text-white flex-col justify-center px-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
           <Trees size={400} className="absolute -bottom-20 -left-20" />
           <Factory size={400} className="absolute top-20 -right-20" />
        </div>
        <div className="z-10">
          <div className="flex items-center mb-6">
            <div className="bg-white p-2 rounded-xl mr-3"><LinkIcon className="h-8 w-8 text-teal-900" /></div>
            <h1 className="text-5xl font-bold">Carbon Connect</h1>
          </div>
          <p className="text-xl text-teal-100 mb-8">Bridging the gap between Industrial Progress and Environmental Restoration.</p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 px-8">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">{isLogin ? 'Welcome Back' : 'Join Carbon Connect'}</h2>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-bold">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-teal-500" placeholder="Organization or Name" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-teal-500" placeholder="name@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-teal-500" placeholder="••••••••" />
            </div>
            {!isLogin && (
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">I am registering as:</label>
                 <div className="grid grid-cols-3 gap-2">
                   <button type="button" onClick={() => setRole('industry')} className={`p-2 rounded-lg border flex flex-col items-center justify-center transition ${role === 'industry' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'}`}>
                     <Factory className="h-5 w-5 mb-1" /><span className="text-[10px] font-bold">Industry</span>
                   </button>
                   <button type="button" onClick={() => setRole('wetlands')} className={`p-2 rounded-lg border flex flex-col items-center justify-center transition ${role === 'wetlands' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'}`}>
                     <Trees className="h-5 w-5 mb-1" /><span className="text-[10px] font-bold">Wetlands</span>
                   </button>
                   <button type="button" onClick={() => setRole('admin')} className={`p-2 rounded-lg border flex flex-col items-center justify-center transition ${role === 'admin' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'}`}>
                     <Gavel className="h-5 w-5 mb-1" /><span className="text-[10px] font-bold">Admin</span>
                   </button>
                 </div>
               </div>
            )}
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition shadow-lg mt-6">
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <div className="mt-6 text-center text-sm">
            <button onClick={() => setIsLogin(!isLogin)} className="text-teal-600 font-bold hover:underline">
              {isLogin ? 'Register Now' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ADMIN DASHBOARD ---
const AdminDashboard = ({ user, projects, setProjects }) => {
  const pendingProjects = projects.filter(p => p.status === 'Auditing' || p.status === 'Seedling Stage');
  
  const handleVerify = (id, newStatus) => {
    const updated = projects.map(p => p.id === id ? { ...p, status: newStatus } : p);
    setProjects(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Administrator Dashboard</h2>
        <p className="text-slate-500">Verify projects, manage compliance, and audit MRV submissions.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2"><span className="text-slate-500">Pending Actions</span><AlertCircle className="text-amber-500" /></div>
          <div className="text-3xl font-bold">{pendingProjects.length}</div>
          <div className="text-xs text-slate-400">Projects awaiting verification</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2"><span className="text-slate-500">Verified Land</span><CheckCircle className="text-green-500" /></div>
          <div className="text-3xl font-bold">{projects.filter(p => p.status === 'Verified').length}</div>
          <div className="text-xs text-slate-400">Active projects generating credits</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex justify-between items-start mb-2"><span className="text-slate-500">System Health</span><ShieldCheck className="text-blue-500" /></div>
           <div className="text-3xl font-bold text-green-600">Operational</div>
           <div className="text-xs text-slate-400">Blockchain Sync: Active</div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-4">Verification Queue</h3>
      {pendingProjects.length === 0 ? (
        <div className="bg-slate-50 p-8 rounded-xl text-center text-slate-500">All caught up! No projects pending verification.</div>
      ) : (
        <div className="space-y-4">
          {pendingProjects.map(project => (
            <div key={project.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                   <h4 className="font-bold text-lg">{project.name}</h4>
                   <StatusBadge status={project.status} />
                </div>
                <div className="text-sm text-slate-500 grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 bg-slate-50 p-3 rounded-lg">
                   <span><MapPin className="w-3 h-3 inline mr-1 text-slate-400"/> {project.location}</span>
                   <span><Trees className="w-3 h-3 inline mr-1 text-slate-400"/> {project.hectares} Hectares</span>
                   <span><Gauge className="w-3 h-3 inline mr-1 text-slate-400"/> Rate: {project.rate} t/ha/yr</span>
                   <span><Clock className="w-3 h-3 inline mr-1 text-slate-400"/> {project.period} Year(s)</span>
                </div>
                <div className="mt-2 flex justify-between items-center bg-teal-50 px-3 py-2 rounded border border-teal-100">
                  <span className="font-bold text-teal-800 text-sm">Total Claimed: {project.absorbed} Tons</span>
                  
                  {project.evidenceLink ? (
                    <a 
                      href={project.evidenceLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-white text-teal-600 text-xs font-bold px-3 py-1 rounded border border-teal-200 hover:bg-teal-50 flex items-center shadow-sm"
                    >
                      <FolderOpen className="w-3 h-3 mr-1" /> View Evidence
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  ) : (
                    <span className="text-xs text-red-400 italic">No evidence provided</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleVerify(project.id, 'Verified')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" /> Approve
                </button>
                <button onClick={() => alert("Rejection logic...")} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold flex items-center">
                  <X className="w-4 h-4 mr-2" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- WETLAND DASHBOARD ---
const WetlandDashboard = ({ wallet, user, projects, setProjects }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', location: '', hectares: '', rate: '', period: '', evidenceLink: '' });

  const handleAddProject = (e) => {
    e.preventDefault();
    const calculatedAbsorption = Number(newProject.hectares) * Number(newProject.rate) * Number(newProject.period);
    const project = {
      id: projects.length + 1,
      name: newProject.name,
      location: newProject.location,
      hectares: Number(newProject.hectares),
      rate: Number(newProject.rate),
      period: Number(newProject.period),
      absorbed: calculatedAbsorption,
      evidenceLink: newProject.evidenceLink,
      status: "Auditing" 
    };
    setProjects([...projects, project]);
    setShowAddModal(false);
    setNewProject({ name: '', location: '', hectares: '', rate: '', period: '', evidenceLink: '' });
  };
  
  const totalAbsorbed = projects.reduce((acc, curr) => acc + curr.absorbed, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div><h2 className="text-3xl font-bold text-slate-900">Absorption Tracker</h2><p className="text-slate-500">Monitor wetland health.</p></div>
        <button onClick={() => setShowAddModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center shadow-lg transition"><Plus className="w-4 h-4 mr-2" /> Register New Land</button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-teal-800 to-teal-900 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4"><span className="text-teal-200 font-medium">Total Carbon Absorbed</span><Leaf className="w-6 h-6 text-teal-300" /></div>
          <div className="text-4xl font-bold mb-1">{totalAbsorbed} <span className="text-lg font-normal text-teal-300">tons</span></div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4"><span className="text-slate-500 font-medium">Active Projects</span><Trees className="w-6 h-6 text-teal-600" /></div>
          <div className="text-4xl font-bold text-slate-800">{projects.length}</div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4"><span className="text-slate-500 font-medium">Pending Verification</span><Activity className="w-6 h-6 text-amber-500" /></div>
          <div className="text-4xl font-bold text-slate-800">{projects.filter(p => p.status !== 'Verified').length}</div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-4">Active Projects</h3>
      <div className="grid md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 flex items-center">{project.name}</h4>
                  <div className="flex items-center text-sm text-slate-500 mt-1"><MapPin className="w-3 h-3 mr-1" /> {project.location}</div>
                </div>
                <StatusBadge status={project.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-3 rounded mb-4">
                 <div><span className="text-slate-400 block text-xs">Area</span><span className="font-bold">{project.hectares} ha</span></div>
                 <div><span className="text-slate-400 block text-xs">Rate</span><span className="font-bold">{project.rate} t/ha/yr</span></div>
                 <div><span className="text-slate-400 block text-xs">Duration</span><span className="font-bold">{project.period} yr(s)</span></div>
                 <div><span className="text-slate-400 block text-xs">Total Absorbed</span><span className="font-bold text-teal-600">{project.absorbed} t</span></div>
              </div>

              {project.evidenceLink && (
                 <a href={project.evidenceLink} target="_blank" className="text-xs text-slate-500 hover:text-teal-600 flex items-center mb-4 underline">
                    <FolderOpen className="w-3 h-3 mr-1" /> View Submitted Evidence
                 </a>
              )}

              <div className="flex gap-3">
                 <button disabled={project.status !== 'Verified' || !wallet} onClick={() => wallet ? alert(`Minting ${project.absorbed} credits...`) : alert("Connect wallet first")} className="flex-1 bg-slate-900 text-white text-sm font-bold py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"><Wallet className="w-4 h-4 mr-2" /> Mint Credits</button>
                 <button className="flex-1 border border-slate-200 text-slate-600 text-sm font-bold py-2 rounded-lg hover:bg-slate-50">View Audit Logs</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold mb-4">Register New Wetland</h3>
            <form onSubmit={handleAddProject}>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label><input required type="text" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="w-full border p-2 rounded" placeholder="e.g. Coastal Restoration Delta" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Location / Coordinates</label><input required type="text" value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})} className="w-full border p-2 rounded" placeholder="e.g. 12.45° N, 78.12° E" /></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Area (Hectares)</label><input required type="number" value={newProject.hectares} onChange={e => setNewProject({...newProject, hectares: e.target.value})} className="w-full border p-2 rounded" placeholder="50" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Time (Years)</label><input required type="number" value={newProject.period} onChange={e => setNewProject({...newProject, period: e.target.value})} className="w-full border p-2 rounded" placeholder="1" /></div>
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Absorption Rate (t/ha/year)</label>
                   <input required type="number" step="0.1" value={newProject.rate} onChange={e => setNewProject({...newProject, rate: e.target.value})} className="w-full border p-2 rounded" placeholder="e.g. 5.5" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                     <FolderOpen className="w-4 h-4 mr-1" /> Evidence (Google Drive Link)
                  </label>
                  <input 
                    required 
                    type="url" 
                    value={newProject.evidenceLink} 
                    onChange={e => setNewProject({...newProject, evidenceLink: e.target.value})} 
                    className="w-full border p-2 rounded" 
                    placeholder="https://drive.google.com/drive/folders/..." 
                  />
                  <p className="text-xs text-slate-400 mt-1">Please provide a public link to a folder containing authentic photos/documents.</p>
                </div>

                {newProject.hectares && newProject.rate && newProject.period && (
                  <div className="bg-teal-50 p-3 rounded text-sm text-teal-800 font-bold text-center border border-teal-100">
                    Est. Total Absorption: {(newProject.hectares * newProject.rate * newProject.period).toFixed(2)} Tons
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="flex-1 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold">Register Land</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- GOVERNMENT VIEW ---
const GovernmentView = () => (
  <div className="max-w-7xl mx-auto px-4 py-8"><h2 className="text-3xl font-bold text-slate-900 mb-2">Government Oversight</h2><p className="text-slate-500 mb-8">Public Ledger Monitoring</p><div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div className="bg-slate-50 px-6 py-4 border-b border-slate-200"><h3 className="font-bold text-slate-700 flex items-center"><ArrowRightLeft className="mr-2 h-4 w-4" /> Recent Transactions</h3></div><div className="p-6 text-center text-slate-500">Live ledger transactions would appear here.</div></div></div>
);

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div className="flex justify-between items-start mb-4"><h3 className="text-slate-500 font-medium">{title}</h3>{icon}</div><p className="text-3xl font-bold text-slate-900">{value}</p></div>
);

const StatusBadge = ({ status }) => {
  const styles = { "Verified": "bg-green-100 text-green-700 border-green-200", "Auditing": "bg-blue-100 text-blue-700 border-blue-200", "Seedling Stage": "bg-amber-100 text-amber-700 border-amber-200" };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || styles["Seedling Stage"]}`}>{status}</span>;
};

export default App;