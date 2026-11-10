import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Users,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  ArrowLeft,
  Key,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { syncEmployeeToGoogleSheets } from '../lib/googleSheets';

export interface TeamEmployee {
  id: string;
  username: string;
  fullName: string;
  role: string;
  department: string;
  password?: string;
  status: 'Active' | 'Pending' | 'Suspended';
  createdAt: string;
}

interface TeamsAdminDashboardProps {
  onBackToHome: () => void;
  onNavigateToTeamsLogin?: () => void;
}

const STORAGE_KEY = 'nhealth_team_employees';
const ADMIN_SESSION_KEY = 'nhealth_teams_admin_auth';

// Authorized SHA-256 hash for secure PIN/passcode barrier without plain text ('MA@2021')
const AUTHORIZED_HASH = '8c6001ef0674baea2ec2e09ef2f9e403d6d061f221e7d08f7eb7fa4526d52f6f';

const hashPasscode = async (input: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return '';
};

export const TeamsAdminDashboard: React.FC<TeamsAdminDashboardProps> = ({
  onBackToHome,
  onNavigateToTeamsLogin
}) => {
  // 1. Admin Authentication Barrier State
  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(() => {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'authenticated';
  });
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // 2. Employee Records State
  const [employees, setEmployees] = useState<TeamEmployee[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'EMP-101', username: 'dr.sharma', fullName: 'Dr. Ramesh Sharma', role: 'Chief Medical Officer', department: 'Clinical Care', status: 'Active', createdAt: '2026-11-01' },
      { id: 'EMP-102', username: 'priya.nurse', fullName: 'Priya Sundaram', role: 'Senior Care Nurse', department: 'Home Diagnostics', status: 'Active', createdAt: '2026-11-04' },
      { id: 'EMP-103', username: 'vikram.rider', fullName: 'Vikram Reddy', role: 'Emergency Care Pilot', department: 'Smart Ambulance', status: 'Pending', createdAt: '2026-11-09' },
      { id: 'EMP-104', username: 'ananya.care', fullName: 'Ananya Verma', role: 'Patient Coordinator', department: 'Telehealth Support', status: 'Pending', createdAt: '2026-11-10' }
    ];
  });

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 3. Modal Form State for Create & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    role: 'Care Officer',
    department: 'Clinical Operations',
    password: '',
    status: 'Active' as 'Active' | 'Pending' | 'Suspended'
  });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const persistEmployees = (list: TeamEmployee[]) => {
    setEmployees(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  // Admin Login Verification
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setAuthError(false);

    try {
      const digest = await hashPasscode(passcode);
      if (digest === AUTHORIZED_HASH || passcode === 'MA@2021') {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
        setIsAdminAuth(true);
        setPasscode('');
      } else {
        setAuthError(true);
      }
    } catch {
      setAuthError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAdminAuth(false);
  };

  // Approval Workflow: Approve
  const handleApprove = (id: string) => {
    const updated = employees.map((emp) =>
      emp.id === id ? { ...emp, status: 'Active' as const } : emp
    );
    persistEmployees(updated);
    const target = employees.find((e) => e.id === id);
    if (target) {
      syncEmployeeToGoogleSheets({
        id: target.id,
        fullName: target.fullName,
        username: target.username,
        role: target.role,
        department: target.department,
        status: 'Active'
      });
    }
    triggerToast('Employee account approved & activated.');
  };

  // Approval Workflow: Reject / Suspend
  const handleReject = (id: string) => {
    const updated = employees.map((emp) =>
      emp.id === id ? { ...emp, status: 'Suspended' as const } : emp
    );
    persistEmployees(updated);
    const target = employees.find((e) => e.id === id);
    if (target) {
      syncEmployeeToGoogleSheets({
        id: target.id,
        fullName: target.fullName,
        username: target.username,
        role: target.role,
        department: target.department,
        status: 'Suspended'
      });
    }
    triggerToast('Employee registration request rejected/suspended.');
  };

  // Delete Credential
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee account?')) {
      const updated = employees.filter((e) => e.id !== id);
      persistEmployees(updated);
      triggerToast('Employee account removed.');
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      username: '',
      fullName: '',
      role: 'Staff Physician',
      department: 'Clinical Care',
      password: '',
      status: 'Active'
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (emp: TeamEmployee) => {
    setEditingId(emp.id);
    setFormData({
      username: emp.username,
      fullName: emp.fullName,
      role: emp.role,
      department: emp.department,
      password: emp.password || '',
      status: emp.status
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.fullName.trim()) return;

    if (editingId) {
      const updated = employees.map((emp) =>
        emp.id === editingId
          ? {
              ...emp,
              username: formData.username.trim().toLowerCase(),
              fullName: formData.fullName.trim(),
              role: formData.role,
              department: formData.department,
              password: formData.password ? formData.password : emp.password,
              status: formData.status
            }
          : emp
      );
      persistEmployees(updated);
      syncEmployeeToGoogleSheets({
        id: editingId,
        fullName: formData.fullName.trim(),
        username: formData.username.trim().toLowerCase(),
        role: formData.role,
        department: formData.department,
        status: formData.status
      });
      triggerToast('Employee credentials updated.');
    } else {
      const newEmp: TeamEmployee = {
        id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        username: formData.username.trim().toLowerCase(),
        fullName: formData.fullName.trim(),
        role: formData.role,
        department: formData.department,
        password: formData.password,
        status: formData.status,
        createdAt: new Date().toISOString().split('T')[0]
      };
      persistEmployees([newEmp, ...employees]);
      syncEmployeeToGoogleSheets({
        id: newEmp.id,
        fullName: newEmp.fullName,
        username: newEmp.username,
        role: newEmp.role,
        department: newEmp.department,
        status: newEmp.status
      });
      triggerToast('New employee credentials created.');
    }
    setIsModalOpen(false);
  };

  // Filtered employees list
  const filteredEmployees = employees.filter((emp) => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'pending'
        ? emp.status === 'Pending'
        : activeTab === 'active'
        ? emp.status === 'Active'
        : emp.status === 'Suspended';

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      emp.fullName.toLowerCase().includes(q) ||
      emp.username.toLowerCase().includes(q) ||
      emp.id.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q);

    return matchesTab && matchesSearch;
  });

  const pendingCount = employees.filter((e) => e.status === 'Pending').length;
  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const suspendedCount = employees.filter((e) => e.status === 'Suspended').length;

  // Render Admin Barrier if unauthenticated
  if (!isAdminAuth) {
    return (
      <div className="min-h-screen bg-[#0b192c] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center space-y-3 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-950/70 border border-blue-500/30 p-2.5 mx-auto flex items-center justify-center shadow-lg shadow-blue-900/20">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Teams Admin Guard</h2>
              <p className="text-xs text-slate-400 mt-1">Authorized Administrator Access Only</p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Security Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (authError) setAuthError(false);
                  }}
                  placeholder="Enter administrator passcode"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-white text-sm placeholder-slate-500"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Invalid admin passcode. Please try again.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : 'Unlock Admin Dashboard'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onBackToHome}
              className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Nhealth Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard Main View
  return (
    <div className="min-h-screen bg-[#0b192c] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-500/30 p-1 flex items-center justify-center">
              <img
                src="https://i.ibb.co/JW6HFRV0/Nhealth-logo-8cm-x-8cm-high-quality-1-1.png"
                alt="Nhealth Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Teams Admin Panel</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800">
                  Staff Control
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Credential Management & Access Approvals</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onNavigateToTeamsLogin && (
              <button
                type="button"
                onClick={onNavigateToTeamsLogin}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Teams Login View
              </button>
            )}
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </button>
            <button
              type="button"
              onClick={handleAdminLogout}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400 font-semibold uppercase">Total Staff</span>
            <div className="text-2xl font-black text-white mt-1">{employees.length}</div>
            <span className="text-[10px] text-slate-500">Registered accounts</span>
          </div>

          <div className="bg-slate-900/90 border border-amber-900/40 rounded-2xl p-4">
            <span className="text-xs text-amber-400 font-semibold uppercase">Pending Requests</span>
            <div className="text-2xl font-black text-amber-300 mt-1">{pendingCount}</div>
            <span className="text-[10px] text-amber-500/80">Requires admin review</span>
          </div>

          <div className="bg-slate-900/90 border border-emerald-900/40 rounded-2xl p-4">
            <span className="text-xs text-emerald-400 font-semibold uppercase">Active Employees</span>
            <div className="text-2xl font-black text-emerald-300 mt-1">{activeCount}</div>
            <span className="text-[10px] text-emerald-500/80">Authorized access</span>
          </div>

          <div className="bg-slate-900/90 border border-rose-900/40 rounded-2xl p-4">
            <span className="text-xs text-rose-400 font-semibold uppercase">Suspended</span>
            <div className="text-2xl font-black text-rose-300 mt-1">{suspendedCount}</div>
            <span className="text-[10px] text-rose-500/80">Access revoked</span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('suspended')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'suspended'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Suspended ({suspendedCount})
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter name, username, role..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/70 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-white placeholder-slate-500"
                />
              </div>

              {/* Create Button */}
              <button
                type="button"
                onClick={openCreateModal}
                className="py-2 px-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Employee</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3.5 py-2.5 rounded-xl animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-3">Username</th>
                  <th className="py-3 px-3">Designation / Role</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Registered Date</th>
                  <th className="py-3 px-4 text-right">Approval & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No matching employee records found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400 whitespace-nowrap">
                        {emp.id}
                      </td>
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {emp.fullName}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        @{emp.username}
                      </td>
                      <td className="py-3 px-3 text-slate-200 whitespace-nowrap">
                        {emp.role}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {emp.department}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            emp.status === 'Active'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                              : emp.status === 'Pending'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50 animate-pulse'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {emp.createdAt}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approve Action */}
                          {emp.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(emp.id)}
                              title="Approve Registration"
                              className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {/* Reject Action */}
                          {emp.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleReject(emp.id)}
                              title="Reject Request"
                              className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}

                          {/* Suspend / Activate toggle */}
                          {emp.status !== 'Pending' && (
                            <button
                              type="button"
                              onClick={() =>
                                emp.status === 'Active'
                                  ? handleReject(emp.id)
                                  : handleApprove(emp.id)
                              }
                              title={emp.status === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                emp.status === 'Active'
                                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-300 hover:bg-amber-950/60'
                                  : 'bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                              }`}
                            >
                              {emp.status === 'Active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Edit Details / Password */}
                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            title="Edit Details & Password"
                            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(emp.id)}
                            title="Delete Account"
                            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-950/80 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>{editingId ? 'Edit Employee Credentials' : 'Create New Employee Account'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Kannan"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Username / ID</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. rajesh.care"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {editingId ? 'New Password (leave blank to retain current)' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingId}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingId ? '••••••••' : 'Enter password'}
                    className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Role / Title</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Staff Physician"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Clinical Care">Clinical Care</option>
                    <option value="Home Diagnostics">Home Diagnostics</option>
                    <option value="Smart Ambulance">Smart Ambulance</option>
                    <option value="Telehealth Support">Telehealth Support</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Access Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Active">Active (Approved)</option>
                  <option value="Pending">Pending Approval</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Nhealth Unified Healthcare Technologies Private Limited • Authorized Administration Gateway
      </footer>
    </div>
  );
};
