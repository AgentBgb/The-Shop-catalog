import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { User } from '../types';
import { 
  Users, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Mail, 
  UserPlus, 
  Calendar,
  Lock,
  UserCheck,
  ShieldAlert,
  UserX
} from 'lucide-react';
import Loader from '../components/Loader';

export default function Workers() {
  const navigate = useNavigate();
  const { currentUser, getWorkers, createWorker, toggleWorkerStatus, addToast } = useApp();

  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Registration Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loadWorkers = async () => {
    setLoading(true);
    const data = await getWorkers();
    setWorkers(data);
    setLoading(false);
  };

  useEffect(() => {
    // Owner authorization lock
    if (currentUser && currentUser.role !== 'owner') {
      addToast('Unauthorized. Worker account management requires Owner permissions.', 'error');
      navigate('/dashboard', { replace: true });
    } else {
      loadWorkers();
    }
  }, [currentUser]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      addToast('All fields are required to register a worker.', 'error');
      return;
    }

    setSubmitting(true);
    const success = await createWorker({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (success) {
      setName('');
      setEmail('');
      setPassword('');
      loadWorkers();
    }
  };

  const handleToggleStatus = async (worker: User) => {
    const nextStatus = !worker.is_active;
    const success = await toggleWorkerStatus(worker._id, nextStatus);
    if (success) {
      loadWorkers();
    }
  };

  if (loading && workers.length === 0) {
    return <Loader message="Accessing active worker registers..." />;
  }

  return (
    <div className="space-y-6" id="workers-view">
      {/* Page Header */}
      <div className="flex flex-col space-y-1" id="workers-hdr">
        <h2 className="text-xl md:text-2xl font-black text-slate-800">Shop Worker Management</h2>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">Registered System Operators</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="workers-body-layout">
        {/* Left Column: Register Worker Form (1 col) */}
        <div className="lg:col-span-1" id="register-worker-flow">
          <div className="bg-white border border-slate-100 p-6 rounded-3xl space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <UserPlus className="w-4.5 h-4.5 mr-1.5 text-indigo-500" />
              Register Shop Worker
            </h3>

            <form onSubmit={handleRegister} className="space-y-4" id="register-worker-form">
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-semibold text-slate-700">Worker Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <UserPlus className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white outline-none transition-all"
                    id="worker-name-in"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-sm font-semibold text-slate-700">Login Email Address</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="rahul@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white outline-none transition-all"
                    id="worker-email-in"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-sm font-semibold text-slate-700">Operational Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white outline-none transition-all"
                    id="worker-pass-in"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 font-bold text-sm text-white rounded-xl shadow-md transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer"
                id="worker-register-submit-btn"
              >
                <Plus className="w-4 h-4" />
                <span>{submitting ? 'Registering...' : 'Register Worker Account'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Workers Directory list (2 cols) */}
        <div className="lg:col-span-2" id="workers-directory">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <Users className="w-4.5 h-4.5 mr-1.5 text-indigo-500" />
              Operational Worker Accounts ({workers.length})
            </h3>

            {workers.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center space-y-2 border border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                <Users className="w-10 h-10 text-slate-300" />
                <h4 className="text-slate-700 font-bold text-sm">No worker accounts registered</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Register assistant worker accounts on the left panel to allow assistants to access, view inventory, and build shareable links.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-50 rounded-2xl" id="workers-table-wrapper">
                <table className="w-full text-left text-xs text-slate-500 min-w-[500px]" id="workers-table">
                  <thead className="bg-slate-50 text-[10px] uppercase font-mono text-slate-400 tracking-wider h-11 border-b border-slate-100">
                    <tr>
                      <th className="px-4 font-bold">Worker Profile</th>
                      <th className="px-4 font-bold">Email Username</th>
                      <th className="px-4 font-bold">Registered Date</th>
                      <th className="px-4 font-bold text-center">Account Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100" id="workers-table-rows">
                    {workers.map((worker) => (
                      <tr key={worker._id} className="hover:bg-slate-50/50 transition-colors h-14" id={`worker-row-${worker._id}`}>
                        <td className="px-4 font-bold text-slate-700">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold font-mono">
                              {worker.name[0]?.toUpperCase() || 'W'}
                            </div>
                            <span>{worker.name}</span>
                          </div>
                        </td>
                        <td className="px-4 font-bold text-slate-600 font-mono">{worker.email}</td>
                        <td className="px-4 font-semibold text-slate-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                            <span>{new Date(worker.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(worker)}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                              worker.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                            }`}
                            id={`worker-toggle-btn-${worker._id}`}
                            title={worker.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                          >
                            {worker.is_active ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Active Operator</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Account Sleeping</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
