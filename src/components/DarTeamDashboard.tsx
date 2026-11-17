import React, { useState, useEffect } from 'react';
import {
  Database,
  Building2,
  MapPin,
  Phone,
  User,
  Briefcase,
  FileText,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  AlertCircle,
  Save,
  LogOut,
  ArrowLeft,
  ChevronDown,
  Layers,
  Sparkles,
  Filter,
  RefreshCw,
  Edit3,
  Search,
  ExternalLink
} from 'lucide-react';
import {
  submitDarRecordToGoogleSheets,
  fetchDarRecordsFromGoogleSheets,
  updateDarRecordStatusInGoogleSheets
} from '../lib/googleSheets';

interface DarTeamDashboardProps {
  currentUser?: string;
  onLogout: () => void;
  onBackToHome?: () => void;
}

export const DAR_DEPARTMENTS = [
  'Doctors',
  'Labs',
  'Pharmacies',
  'Manpower',
  'Imaging Centers',
  'Human Support',
  'Hospitals',
  'Blood Banks',
  'Ambulance Services',
  'Surgicals',
  'Riders',
  'Assistants',
  'Insurers',
  'Clients'
] as const;

export type DarDepartment = typeof DAR_DEPARTMENTS[number];
export type DarStatusAction = 'Pending' | 'Accepted' | 'Recall' | 'Rejected';

export interface DarRecord {
  slNo: number;
  organisationName: string;
  designation: string;
  personName: string;
  contactNumber: string;
  city: string;
  state: string;
  pincode: string;
  numberOfCenters: string;
  location: string;
  address: string;
  remarks: string;
  status: DarStatusAction;
  rejectionReason?: string;
  timestamp: string;
  department: string;
  submittedBy: string;
}

export const DarTeamDashboard: React.FC<DarTeamDashboardProps> = ({
  currentUser = 'dar.staff',
  onLogout,
  onBackToHome
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<DarDepartment>('Doctors');
  const [slNoCounter, setSlNoCounter] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('nhealth_dar_slno');
      return stored ? parseInt(stored, 10) : 101;
    } catch {
      return 101;
    }
  });

  const [formData, setFormData] = useState({
    organisationName: '',
    designation: '',
    personName: '',
    contactNumber: '',
    city: '',
    state: '',
    pincode: '',
    numberOfCenters: '',
    location: '',
    address: '',
    remarks: '',
    status: 'Pending' as DarStatusAction,
    rejectionReason: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter & Personal Follow-Up state
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'recall' | 'accepted'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing status modal/state for follow-ups
  const [editingRecord, setEditingRecord] = useState<DarRecord | null>(null);
  const [editStatus, setEditStatus] = useState<DarStatusAction>('Accepted');
  const [editRemarks, setEditRemarks] = useState('');
  const [editRejectionReason, setEditRejectionReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // All submissions strictly filtered by currentUser
  const [myRecords, setMyRecords] = useState<DarRecord[]>(() => {
    try {
      const stored = localStorage.getItem('nhealth_dar_submissions');
      if (stored) {
        const all: DarRecord[] = JSON.parse(stored);
        return all.filter((r) => !r.submittedBy || r.submittedBy.toLowerCase() === currentUser.toLowerCase());
      }
    } catch {}
    return [
      {
        slNo: 101,
        organisationName: 'Sri Care PolyClinic & Labs',
        department: 'Labs',
        designation: 'Managing Director',
        personName: 'Dr. Srinivas Rao',
        contactNumber: '+91 9848012345',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500034',
        numberOfCenters: '2',
        location: 'Banjara Hills',
        address: 'Rd No 12, MLA Colony, Banjara Hills',
        remarks: 'Interested in partnering with Nhealth home diagnostics network.',
        status: 'Pending',
        timestamp: '10/11/2026, 11:30:00 AM',
        submittedBy: currentUser
      },
      {
        slNo: 102,
        organisationName: 'City Trauma Emergency Hub',
        department: 'Ambulance Services',
        designation: 'Operations Lead',
        personName: 'K. Mahesh',
        contactNumber: '+91 9700124455',
        city: 'Secunderabad',
        state: 'Telangana',
        pincode: '500003',
        numberOfCenters: '5',
        location: 'Clock Tower',
        address: 'MG Road, Secunderabad',
        remarks: 'Needs tariff revision and insurance SLA review. Call back on Friday.',
        status: 'Recall',
        timestamp: '10/11/2026, 02:15:00 PM',
        submittedBy: currentUser
      }
    ];
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync personal submissions with Google Sheets
  const refreshFromSheets = async () => {
    try {
      const res = await fetchDarRecordsFromGoogleSheets(currentUser);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setMyRecords(res.data);
        localStorage.setItem('nhealth_dar_submissions', JSON.stringify(res.data));
        showToast('success', `Refreshed ${res.data.length} personal entries from Google Sheets.`);
      }
    } catch (e) {
      console.warn('Sheets fetch fallback:', e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.organisationName.trim()) {
      showToast('error', 'Please enter Organisation Name.');
      return;
    }
    if (!formData.personName.trim()) {
      showToast('error', 'Please enter Contact Person Name.');
      return;
    }
    if (!formData.contactNumber.trim()) {
      showToast('error', 'Please enter Contact Number.');
      return;
    }
    if (formData.status === 'Rejected' && !formData.rejectionReason.trim()) {
      showToast('error', 'Please provide a Rejection Reason note.');
      return;
    }

    setIsSubmitting(true);
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium'
    });

    const newRecord: DarRecord = {
      slNo: slNoCounter,
      organisationName: formData.organisationName.trim(),
      designation: formData.designation.trim(),
      personName: formData.personName.trim(),
      contactNumber: formData.contactNumber.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      numberOfCenters: formData.numberOfCenters.trim() || '1',
      location: formData.location.trim(),
      address: formData.address.trim(),
      remarks: formData.remarks.trim(),
      status: formData.status,
      rejectionReason: formData.status === 'Rejected' ? formData.rejectionReason.trim() : '',
      timestamp,
      department: selectedDepartment,
      submittedBy: currentUser
    };

    try {
      const res = await submitDarRecordToGoogleSheets(newRecord);

      // Save locally
      const updatedList = [newRecord, ...myRecords];
      setMyRecords(updatedList);
      localStorage.setItem('nhealth_dar_submissions', JSON.stringify(updatedList));

      const nextSlNo = slNoCounter + 1;
      setSlNoCounter(nextSlNo);
      localStorage.setItem('nhealth_dar_slno', nextSlNo.toString());

      // Reset form
      setFormData({
        organisationName: '',
        designation: '',
        personName: '',
        contactNumber: '',
        city: '',
        state: '',
        pincode: '',
        numberOfCenters: '',
        location: '',
        address: '',
        remarks: '',
        status: 'Pending',
        rejectionReason: ''
      });

      if (res.success) {
        showToast('success', `Record #${newRecord.slNo} saved and synced to Google Sheets!`);
      } else {
        showToast('success', `Record #${newRecord.slNo} saved locally.`);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to submit record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle follow-up status update
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (editStatus === 'Rejected' && !editRejectionReason.trim()) {
      showToast('error', 'Please provide a reason for rejection.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await updateDarRecordStatusInGoogleSheets({
        slNo: editingRecord.slNo,
        status: editStatus,
        rejectionReason: editStatus === 'Rejected' ? editRejectionReason.trim() : '',
        remarks: editRemarks.trim() || editingRecord.remarks,
        updatedBy: currentUser
      });

      const updated = myRecords.map((r) =>
        r.slNo === editingRecord.slNo
          ? {
              ...r,
              status: editStatus,
              remarks: editRemarks.trim() ? `${r.remarks} | [Follow-up: ${editRemarks.trim()}]` : r.remarks,
              rejectionReason: editStatus === 'Rejected' ? editRejectionReason.trim() : r.rejectionReason
            }
          : r
      );

      setMyRecords(updated);
      localStorage.setItem('nhealth_dar_submissions', JSON.stringify(updated));
      showToast('success', `Record #${editingRecord.slNo} status updated to ${editStatus}!`);
      setEditingRecord(null);
    } catch (err: any) {
      showToast('error', 'Failed to update record status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: DarStatusAction) => {
    switch (status) {
      case 'Accepted':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Recall':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Rejected':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  // Filtered counts strictly for current logged in user
  const pendingCount = myRecords.filter((r) => r.status === 'Pending').length;
  const recallCount = myRecords.filter((r) => r.status === 'Recall').length;
  const acceptedCount = myRecords.filter((r) => r.status === 'Accepted').length;

  const filteredRecords = myRecords.filter((r) => {
    if (activeTab === 'pending' && r.status !== 'Pending') return false;
    if (activeTab === 'recall' && r.status !== 'Recall') return false;
    if (activeTab === 'accepted' && r.status !== 'Accepted') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.organisationName.toLowerCase().includes(q) ||
        r.personName.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.contactNumber.includes(q) ||
        r.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#070e17] text-slate-100 font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Back to Main Site"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 p-1 flex items-center justify-center">
                <Database className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    DAR Team Portal
                  </h1>
                  <span className="text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                    Personal Follow-ups & Acquisition
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Nhealth Unified Healthcare Technologies
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refreshFromSheets}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
              title="Sync from Google Sheets"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
              <span>Sync Sheets</span>
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/70 border border-slate-700/60 px-3 py-1.5 rounded-xl">
              <User className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-medium text-white">{currentUser}</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between shadow-lg transition-all animate-in fade-in ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* 1. Personal Follow-Up Quick Filter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Pending Follow-ups */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'pending' ? 'all' : 'pending')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'pending'
                ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Pending Follow-ups
              </span>
              <span className="text-xl font-black text-white font-mono">{pendingCount}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              My submissions awaiting decision or verification.
            </p>
          </button>

          {/* Recall List */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'recall' ? 'all' : 'recall')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'recall'
                ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                Recall List
              </span>
              <span className="text-xl font-black text-white font-mono">{recallCount}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Leads needing urgent re-engagement or SLA follow-up.
            </p>
          </button>

          {/* Accepted Acquisitions */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'accepted' ? 'all' : 'accepted')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'accepted'
                ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Accepted (Closed)
              </span>
              <span className="text-xl font-black text-white font-mono">{acceptedCount}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Successfully closed partnerships created by you.
            </p>
          </button>
        </div>

        {/* 2. Department Selector Bar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                Select Department Category
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose the healthcare service domain for this data acquisition entry.
              </p>
            </div>
            <div className="relative min-w-[240px]">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value as DarDepartment)}
                className="w-full appearance-none bg-slate-950 border border-teal-500/40 rounded-xl px-4 py-2.5 text-sm font-semibold text-teal-200 focus:outline-none focus:border-teal-400 cursor-pointer pr-10 shadow-inner"
              >
                {DAR_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-slate-900 text-white">
                    {dept}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-teal-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 3. Dynamic Data Acquisition Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                New Acquisition: <span className="text-teal-300">{selectedDepartment}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Logged as <span className="text-teal-300 font-medium">{currentUser}</span>. Your entries are mapped to your personal follow-up stream.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 block">Next ID</span>
              <span className="text-sm font-black text-teal-400 font-mono">#{slNoCounter}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sl. No (Auto-generated)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`#${slNoCounter}`}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-teal-400 font-mono font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Organisation Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    name="organisationName"
                    value={formData.organisationName}
                    onChange={handleInputChange}
                    placeholder="e.g. Apollo Diagnostics / Care Clinic"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Person Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    name="personName"
                    value={formData.personName}
                    onChange={handleInputChange}
                    placeholder="e.g. Dr. K. Venkat / Manager"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Designation</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    placeholder="e.g. Managing Director / Partner"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contact Number / Alternate <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 9876543210"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Number of Centers Associated
                </label>
                <input
                  type="text"
                  name="numberOfCenters"
                  value={formData.numberOfCenters}
                  onChange={handleInputChange}
                  placeholder="e.g. 1 or 4 branches"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g. Hyderabad / Bengaluru"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="e.g. Telangana / Karnataka"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  placeholder="e.g. 500081"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Location / Area Landmark
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g. Hitec City / Near Metro"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Status Action
                </label>
                <div className="relative">
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full appearance-none px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 cursor-pointer pr-10"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Recall">Recall</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Complete Address
              </label>
              <textarea
                rows={2}
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Full street address, building/floor details"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Remarks</label>
              <textarea
                rows={2}
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                placeholder="Discussion notes, equipment details, pricing or follow-up notes"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
              />
            </div>

            {formData.status === 'Rejected' && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 animate-in fade-in space-y-2">
                <label className="block text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  Rejection Reason Note Box <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  name="rejectionReason"
                  value={formData.rejectionReason}
                  onChange={handleInputChange}
                  placeholder="Specify why this entry was rejected"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-rose-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-rose-400 placeholder-slate-500"
                />
              </div>
            )}

            <div className="pt-3 flex items-center justify-between border-t border-slate-800/80">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Synced directly with Google Sheets.</span>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving to Sheets...' : 'Save Record'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* 4. Personal Follow-ups & Submissions Table */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                My Personal Acquisitions & Follow-ups ({filteredRecords.length})
              </h3>
              <p className="text-xs text-slate-400">
                Only records created by <span className="text-teal-300 font-semibold">{currentUser}</span> are displayed here.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search my records..."
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-teal-400 w-44 sm:w-56"
                />
              </div>

              {activeTab !== 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="text-xs text-teal-400 hover:text-teal-300 px-2 py-1 bg-teal-950/40 border border-teal-800/40 rounded-lg cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Sl.No</th>
                  <th className="py-2.5 px-3">Organisation</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Contact Person</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Remarks / Follow-up</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No records found in this view.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr key={`${rec.slNo}-${rec.timestamp}`} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-teal-300 font-bold">#{rec.slNo}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{rec.organisationName}</td>
                      <td className="py-2.5 px-3 text-slate-300">{rec.department}</td>
                      <td className="py-2.5 px-3 text-slate-300">{rec.personName}</td>
                      <td className="py-2.5 px-3 text-slate-400">{rec.contactNumber}</td>
                      <td className="py-2.5 px-3 text-slate-400">{rec.city || rec.location || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-semibold ${getStatusBadge(
                            rec.status
                          )}`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate" title={rec.remarks}>
                        {rec.remarks || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecord(rec);
                            setEditStatus(rec.status === 'Recall' ? 'Accepted' : rec.status);
                            setEditRemarks('');
                            setEditRejectionReason(rec.rejectionReason || '');
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-400 hover:text-teal-300 bg-teal-950/40 hover:bg-teal-900/50 border border-teal-800/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Update</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Follow-up Status Update Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-teal-400" />
              Update Acquisition Status #{editingRecord.slNo}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {editingRecord.organisationName} • {editingRecord.personName} ({editingRecord.department})
            </p>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Update Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as DarStatusAction)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="Accepted">Accepted (Closed Partner)</option>
                  <option value="Pending">Pending (Under review)</option>
                  <option value="Recall">Recall (Call back required)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Follow-up Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="e.g. Spoke to Director, agreed on partnership terms."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 placeholder-slate-500"
                />
              </div>

              {editStatus === 'Rejected' && (
                <div>
                  <label className="block text-xs font-bold text-rose-300 mb-1.5">
                    Rejection Reason
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={editRejectionReason}
                    onChange={(e) => setEditRejectionReason(e.target.value)}
                    placeholder="State reason for rejecting this entry"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-rose-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-rose-400 placeholder-slate-500"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-3 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Nhealth Unified Healthcare Technologies Private Limited • DAR Follow-up System
      </footer>
    </div>
  );
};
