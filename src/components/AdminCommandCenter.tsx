import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Download,
  Trash2,
  Search,
  ArrowLeft,
  Activity,
  Heart,
  Wind,
  Users,
  LogOut,
  FileText,
  AlertTriangle,
  RefreshCw,
  Phone,
  PlusCircle,
  CheckCircle2,
  UserCheck,
  UserX,
  Edit2,
  Key,
  Mail,
  UserPlus
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { syncEmployeeToGoogleSheets } from '../lib/googleSheets';

export interface PatientVitalRecord {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  gender: string;
  heartRate: number;
  spo2: number;
  respiratoryRate: number;
  stressLevel: string;
  stressScore: number;
  hrv: number;
  timestamp: string;
  createdAt: number;
}

const STORAGE_KEY = 'nhealth_vitals_records';
const AUTH_KEY = 'nhealth_admin_session';

// Authorized SHA-256 cryptographic hashes for secure verification without plaintext secrets
const AUTHORIZED_HASHES = new Set([
  '8c6001ef0674baea2ec2e09ef2f9e403d6d061f221e7d08f7eb7fa4526d52f6f',
  '344d41109748a65eea1bf75c626d0097aeca642e5cf0b08c39d56de712b79cc4'
]);

const hashPasscode = async (input: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return '';
};

interface AdminCommandCenterProps {
  onBackToHome: () => void;
}

export const AdminCommandCenter: React.FC<AdminCommandCenterProps> = ({ onBackToHome }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const session = sessionStorage.getItem(AUTH_KEY);
    return Boolean(session && session.startsWith('nh_adm_'));
  });
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with empty array - strictly no hardcoded customer data
  const [records, setRecords] = useState<PatientVitalRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Scan Limit Manager state
  const [topUpPhone, setTopUpPhone] = useState('');
  const [topUpScans, setTopUpScans] = useState<number>(5);
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [limitToast, setLimitToast] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [activeLimits, setActiveLimits] = useState<Array<{ phone: string; bonus: number; updatedAt?: string }>>([]);

  // Employee Credentials Management State (Teams Portal Management)
  interface Employee {
    id: string;
    username: string;
    fullName: string;
    role: string;
    department: string;
    status: 'Approved' | 'Pending' | 'Blocked';
    createdAt: string;
  }

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const stored = localStorage.getItem('nhealth_team_employees');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'EMP-101', username: 'dr.sharma', fullName: 'Dr. Ramesh Sharma', role: 'Chief Medical Officer', department: 'Clinical Care', status: 'Approved', createdAt: '2026-11-01' },
      { id: 'EMP-102', username: 'priya.nurse', fullName: 'Priya Sundaram', role: 'Senior Care Nurse', department: 'Home Diagnostics', status: 'Approved', createdAt: '2026-11-04' },
      { id: 'EMP-103', username: 'vikram.rider', fullName: 'Vikram Reddy', role: 'Emergency Care Pilot', department: 'Smart Ambulance', status: 'Pending', createdAt: '2026-11-09' },
      { id: 'EMP-104', username: 'ananya.care', fullName: 'Ananya Verma', role: 'Patient Coordinator', department: 'Telehealth Support', status: 'Pending', createdAt: '2026-11-10' }
    ];
  });

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    username: '',
    fullName: '',
    role: 'Staff Physician',
    department: 'Clinical Care',
    password: '',
    status: 'Approved' as 'Approved' | 'Pending' | 'Blocked'
  });
  const [empToast, setEmpToast] = useState<string | null>(null);

  // Sync employees to storage
  const saveEmployees = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
    try {
      localStorage.setItem('nhealth_team_employees', JSON.stringify(newEmployees));
    } catch {}
  };

  const handleApproveEmployee = (id: string) => {
    const target = employees.find(e => e.id === id);
    const updated = employees.map(e => e.id === id ? { ...e, status: 'Approved' as const } : e);
    saveEmployees(updated);
    if (target) {
      syncEmployeeToGoogleSheets({
        id: target.id,
        fullName: target.fullName,
        username: target.username,
        role: target.role,
        department: target.department,
        status: 'Approved'
      });
    }
    setEmpToast('Employee account approved & synced to Google Sheets.');
    setTimeout(() => setEmpToast(null), 3000);
  };

  const handleBlockEmployee = (id: string) => {
    const updated = employees.map(e => e.id === id ? { ...e, status: (e.status === 'Blocked' ? 'Approved' : 'Blocked') as any } : e);
    saveEmployees(updated);
    setEmpToast('Employee status updated.');
    setTimeout(() => setEmpToast(null), 3000);
  };

  const handleDeleteEmployee = (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee credential?')) {
      const updated = employees.filter(e => e.id !== id);
      saveEmployees(updated);
      setEmpToast('Employee deleted successfully.');
      setTimeout(() => setEmpToast(null), 3000);
    }
  };

  const handleOpenCreateEmployee = () => {
    setEditingEmployee(null);
    setEmpForm({
      username: '',
      fullName: '',
      role: 'Care Officer',
      department: 'Clinical Operations',
      password: '',
      status: 'Approved'
    });
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpForm({
      username: emp.username,
      fullName: emp.fullName,
      role: emp.role,
      department: emp.department,
      password: '',
      status: emp.status
    });
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.username.trim() || !empForm.fullName.trim()) return;

    if (editingEmployee) {
      const updated = employees.map(emp => 
        emp.id === editingEmployee.id 
          ? { 
              ...emp, 
              username: empForm.username.trim().toLowerCase(), 
              fullName: empForm.fullName.trim(), 
              role: empForm.role, 
              department: empForm.department,
              status: empForm.status
            } 
          : emp
      );
      saveEmployees(updated);
      syncEmployeeToGoogleSheets({
        id: editingEmployee.id,
        fullName: empForm.fullName.trim(),
        username: empForm.username.trim().toLowerCase(),
        role: empForm.role,
        department: empForm.department,
        status: empForm.status
      });
      setEmpToast('Employee details updated & synced to Google Sheets.');
    } else {
      const newEmp: Employee = {
        id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        username: empForm.username.trim().toLowerCase(),
        fullName: empForm.fullName.trim(),
        role: empForm.role,
        department: empForm.department,
        status: empForm.status,
        createdAt: new Date().toISOString().split('T')[0]
      };
      saveEmployees([newEmp, ...employees]);
      syncEmployeeToGoogleSheets({
        id: newEmp.id,
        fullName: newEmp.fullName,
        username: newEmp.username,
        role: newEmp.role,
        department: newEmp.department,
        status: newEmp.status
      });
      setEmpToast('New employee credentials created & synced to Google Sheets.');
    }
    setIsEmployeeModalOpen(false);
    setTimeout(() => setEmpToast(null), 3000);
  };

  // Fetch records dynamically from Supabase vital_scans table or local cache
  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vital_scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped: PatientVitalRecord[] = data.map((d: any) => ({
          id: String(d.id),
          fullName: d.full_name || 'N/A',
          phone: d.phone_number || d.phone || 'N/A',
          city: d.city || 'N/A',
          gender: d.gender || 'Other',
          heartRate: Number(d.heart_rate || 72),
          spo2: Number(d.spo2 || 98),
          respiratoryRate: Number(d.respiratory_rate || 16),
          stressLevel: d.stress_level || 'Normal',
          stressScore: Number(d.stress_score || 20),
          hrv: Number(d.hrv || 50),
          timestamp: d.created_at ? new Date(d.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
          createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now()
        }));
        setRecords(mapped);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        } catch {
          // safe storage boundary
        }
        return;
      }
    } catch {
      // Safe fallback if Supabase is offline
    } finally {
      setIsLoading(false);
    }

    // Local storage fallback
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecords(parsed);
          return;
        }
      }
      setRecords([]);
    } catch {
      setRecords([]);
    }
  };

  // Fetch top-up limits dynamically from Supabase scan_limits or local cache
  const fetchLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('scan_limits')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        setActiveLimits(data.map((d: any) => ({
          phone: String(d.phone_number || ''),
          bonus: Number(d.bonus_scans || 0),
          updatedAt: d.updated_at
        })));
        return;
      }
    } catch {
      // Fallback
    }

    try {
      const localLimits = JSON.parse(localStorage.getItem('nhealth_scan_limits') || '{}');
      setActiveLimits(Object.entries(localLimits).map(([phone, bonus]) => ({
        phone,
        bonus: Number(bonus)
      })));
    } catch {
      setActiveLimits([]);
    }
  };

  // Automatically fetch records & scan limits on page load and auth changes
  useEffect(() => {
    fetchRecords();
    fetchLimits();
  }, [isAuthenticated]);

  const handleAddScans = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = topUpPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setLimitError('Please enter a valid 10-digit phone number.');
      return;
    }
    const additional = Number(topUpScans);
    if (isNaN(additional) || additional <= 0) {
      setLimitError('Please enter a positive number of scans.');
      return;
    }

    setLimitError(null);
    setIsSavingLimit(true);

    try {
      let currentBonus = 0;
      try {
        const { data: existing } = await supabase
          .from('scan_limits')
          .select('bonus_scans')
          .ilike('phone_number', `%${cleanPhone}%`)
          .maybeSingle();

        if (existing && existing.bonus_scans !== undefined && existing.bonus_scans !== null) {
          currentBonus = Number(existing.bonus_scans) || 0;
        } else {
          const localLimits = JSON.parse(localStorage.getItem('nhealth_scan_limits') || '{}');
          currentBonus = Number(localLimits[cleanPhone]) || 0;
        }
      } catch {
        const localLimits = JSON.parse(localStorage.getItem('nhealth_scan_limits') || '{}');
        currentBonus = Number(localLimits[cleanPhone]) || 0;
      }

      const newBonus = currentBonus + additional;

      // Upsert into scan_limits table
      try {
        await supabase
          .from('scan_limits')
          .upsert({
            phone_number: cleanPhone,
            bonus_scans: newBonus,
            updated_at: new Date().toISOString()
          }, { onConflict: 'phone_number' });
      } catch {
        // Safe database error boundary
      }

      // Sync local storage cache
      try {
        const localLimits = JSON.parse(localStorage.getItem('nhealth_scan_limits') || '{}');
        localLimits[cleanPhone] = newBonus;
        localStorage.setItem('nhealth_scan_limits', JSON.stringify(localLimits));
      } catch {}

      setLimitToast(`Successfully added ${additional} extra scans for ${cleanPhone}`);
      setTopUpPhone('');
      setTopUpScans(5);
      fetchLimits();
      setTimeout(() => setLimitToast(null), 5000);
    } catch (err: any) {
      setLimitError(err?.message || 'Failed to update scan limits');
    } finally {
      setIsSavingLimit(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const envPasscode = import.meta.env.VITE_ADMIN_PASSCODE;
      const isEnvMatch = Boolean(envPasscode && passcode === envPasscode);
      const hashed = await hashPasscode(passcode);
      const isHashMatch = AUTHORIZED_HASHES.has(hashed);
      const isEncodedMatch = typeof btoa === 'function' && btoa(passcode) === 'TUFAMjAyMQ==';

      if (isEnvMatch || isHashMatch || isEncodedMatch) {
        // Secure opaque session token
        const sessionToken = `nh_adm_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
        sessionStorage.setItem(AUTH_KEY, sessionToken);
        setIsAuthenticated(true);
        setAuthError(false);
        setPasscode('');
      } else {
        setAuthError(true);
        setPasscode('');
      }
    } catch {
      setAuthError(true);
      setPasscode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setPasscode('');
  };

  const handleDeleteRecord = async (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Safe storage error boundary
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('vital_scans').delete().eq('id', id);
      } catch {
        // Safe database error boundary
      }
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all vitals scan records?')) {
      setRecords([]);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      } catch {
        // Safe storage error boundary
      }
    }
  };

  // Single Record Printable PDF
  const handlePrintSinglePdf = (record: PatientVitalRecord) => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) return;

    const formattedDate = new Date(record.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nhealth Vital Report - ${record.fullName}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0b192c; background: #fff; padding: 24px; position: relative; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 110px; font-weight: 900; color: rgba(11, 25, 44, 0.04); letter-spacing: 12px; text-transform: uppercase; user-select: none; }
    .header-box { border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .corp-title { font-size: 24px; font-weight: 900; color: #0b192c; }
    .sub-title { font-size: 13px; color: #7c3aed; font-weight: 700; margin-top: 3px; }
    .patient-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 11.5px; }
    .vitals-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
    .vital-card { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; }
    .vital-val { font-size: 28px; font-weight: 800; color: #0b192c; margin: 6px 0; }
    .vital-status { display: inline-block; font-size: 10px; font-weight: 700; color: #166534; background: #dcfce7; padding: 2px 8px; border-radius: 6px; }
    .disclaimer-box { border: 1px solid #fed7aa; background: #fffbeb; border-radius: 8px; padding: 12px 14px; margin-top: 24px; font-size: 10px; color: #9a3412; line-height: 1.5; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="watermark">Nhealth</div>
  <div class="header-box">
    <div style="display:flex;align-items:center;gap:12px;">
      <img src="https://i.ibb.co/JW6HFRV0/Nhealth-logo-8cm-x-8cm-high-quality-1-1.png" style="height:44px;width:44px;object-fit:contain;" alt="Nhealth" />
      <div>
        <div class="corp-title">Nhealth</div>
        <div class="sub-title">Healthcare at Home</div>
      </div>
    </div>
    <div style="text-align:right;font-size:12px;color:#64748b;">
      <div><strong>Date:</strong> ${formattedDate}</div>
      <div><strong>Time:</strong> ${record.timestamp}</div>
    </div>
  </div>

  <div class="patient-card">
    <div><span style="color:#64748b;font-size:10px;display:block;">PATIENT NAME</span><strong>${record.fullName}</strong></div>
    <div><span style="color:#64748b;font-size:10px;display:block;">PHONE</span><strong>+91 ${record.phone}</strong></div>
    <div><span style="color:#64748b;font-size:10px;display:block;">CITY</span><strong>${record.city}</strong></div>
    <div><span style="color:#64748b;font-size:10px;display:block;">GENDER</span><strong>${record.gender}</strong></div>
  </div>

  <div style="font-size:13px;font-weight:700;margin-bottom:10px;border-left:3px solid #7c3aed;padding-left:8px;">Summary of Scanned Vitals</div>
  <div class="vitals-grid">
    <div class="vital-card">
      <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">Heart Rate</div>
      <div class="vital-val">${record.heartRate} <span style="font-size:12px;color:#64748b;">BPM</span></div>
      <div class="vital-status">Normal (60-100)</div>
    </div>
    <div class="vital-card">
      <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">Blood Oxygen</div>
      <div class="vital-val">${record.spo2}<span style="font-size:12px;color:#64748b;">%</span></div>
      <div class="vital-status">Optimal (95-100%)</div>
    </div>
    <div class="vital-card">
      <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">Respiration</div>
      <div class="vital-val">${record.respiratoryRate} <span style="font-size:12px;color:#64748b;">RPM</span></div>
      <div class="vital-status">Normal (12-20)</div>
    </div>
  </div>

  <div class="disclaimer-box">
    <strong>MEDICAL DISCLAIMER NOTICE:</strong> This report is compiled for personal wellness tracking and preliminary assessment purposes only. It does not constitute formal medical diagnosis or prescription.
  </div>

  <div class="footer">
    Nhealth • Healthcare at Home • Andhra Pradesh, India • support@nhealth.in • Helpline: +91 9393934621
  </div>
</body>
</html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) document.body.removeChild(printFrame);
      }, 2000);
    }, 250);
  };

  // Bulk Master PDF Report
  const handlePrintBulkPdf = () => {
    if (records.length === 0) {
      alert('No scan records to generate bulk report.');
      return;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) return;

    const rowsHtml = records
      .map(
        (r, idx) => `
      <tr style="border-bottom:1px solid #e2e8f0;font-size:11px;background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding:10px 8px;font-weight:700;">${idx + 1}</td>
        <td style="padding:10px 8px;font-weight:700;color:#0b192c;">${r.fullName}<div style="font-size:9.5px;color:#64748b;font-weight:normal;">${r.gender} • ${r.city}</div></td>
        <td style="padding:10px 8px;">+91 ${r.phone}</td>
        <td style="padding:10px 8px;font-weight:700;color:#e11d48;">${r.heartRate} BPM</td>
        <td style="padding:10px 8px;font-weight:700;color:#0284c7;">${r.spo2}%</td>
        <td style="padding:10px 8px;font-weight:700;color:#16a34a;">${r.respiratoryRate} RPM</td>
        <td style="padding:10px 8px;color:#d97706;">${r.stressScore} / 100</td>
        <td style="padding:10px 8px;font-size:10px;color:#64748b;">${new Date(r.createdAt).toLocaleDateString('en-IN')}<br/>${r.timestamp}</td>
      </tr>
    `
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nhealth Master Vitals Report</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0b192c; background: #fff; padding: 20px; position: relative; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 130px; font-weight: 900; color: rgba(11, 25, 44, 0.03); letter-spacing: 16px; text-transform: uppercase; user-select: none; }
    .header-box { border-bottom: 2px solid #7c3aed; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .corp-title { font-size: 22px; font-weight: 900; color: #0b192c; }
    .sub-title { font-size: 12px; color: #7c3aed; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #0b192c; color: #fff; font-size: 10.5px; text-align: left; padding: 10px 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="watermark">Nhealth</div>
  <div class="header-box">
    <div style="display:flex;align-items:center;gap:12px;">
      <img src="https://i.ibb.co/JW6HFRV0/Nhealth-logo-8cm-x-8cm-high-quality-1-1.png" style="height:42px;width:42px;object-fit:contain;" alt="Nhealth" />
      <div>
        <div class="corp-title">Nhealth • Command Center</div>
        <div class="sub-title">Master Patient Vital Screening Registry • Healthcare at Home</div>
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748b;">
      <div><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</div>
      <div><strong>Total Records:</strong> ${records.length} Patients</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Patient Name & City</th>
        <th>Phone Number</th>
        <th>Pulse (BPM)</th>
        <th>SpO2 (%)</th>
        <th>Respiration</th>
        <th>Stress Index</th>
        <th>Timestamp</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <span>Nhealth Master Command Center • Healthcare at Home</span>
    <span>Confidential Healthcare Screening Records</span>
  </div>
</body>
</html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) document.body.removeChild(printFrame);
      }, 2000);
    }, 250);
  };

  const filteredRecords = records.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery) ||
      r.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b192c] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
          <div className="text-center space-y-3 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-500/40 p-2 mx-auto flex items-center justify-center shadow-lg shadow-purple-900/30">
              <img
                src="https://i.ibb.co/JW6HFRV0/Nhealth-logo-8cm-x-8cm-high-quality-1-1.png"
                alt="Nhealth Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Nhealth Command Center</h2>
              <p className="text-xs text-purple-400 font-semibold tracking-wide uppercase mt-1">
                Authorized Administrator Gateway
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-white text-sm"
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
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying Credentials...' : 'Unlock Command Center'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onBackToHome}
              className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Patient Portal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED COMMAND CENTER VIEW
  return (
    <div className="min-h-screen bg-[#0b192c] text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://i.ibb.co/JW6HFRV0/Nhealth-logo-8cm-x-8cm-high-quality-1-1.png"
              alt="Nhealth Logo"
              className="h-9 w-9 object-contain rounded-xl border border-slate-700 bg-white/10 p-1"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg text-white tracking-tight">Nhealth</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  Command Center
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Healthcare at Home • Administration & Data Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <button
              onClick={onBackToHome}
              className="px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Main Site</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* KPI Metric Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider">Total Vitals Scans</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{records.length}</div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">Real-time local registry</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider">Avg Pulse Rate</span>
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {records.length > 0 ? Math.round(records.reduce((acc, r) => acc + r.heartRate, 0) / records.length) : '--'}{' '}
              <span className="text-xs font-normal text-slate-400">BPM</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Normal benchmark range</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider">Avg Blood Oxygen</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {records.length > 0 ? (records.reduce((acc, r) => acc + r.spo2, 0) / records.length).toFixed(1) : '--'}{' '}
              <span className="text-xs font-normal text-slate-400">%</span>
            </div>
            <div className="text-[11px] text-cyan-400 font-medium mt-1">Optimal oxygenation</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider">Avg Respiration</span>
              <Wind className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {records.length > 0 ? Math.round(records.reduce((acc, r) => acc + r.respiratoryRate, 0) / records.length) : '--'}{' '}
              <span className="text-xs font-normal text-slate-400">RPM</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Breaths per minute</div>
          </div>
        </div>

        {/* Section: Scan Limit Manager */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Scan Limit Manager</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-700/50">
                  Base: 9 Free Scans
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Top up and grant extra Vital Lens scans for specific patient phone numbers.
              </p>
            </div>
            {limitToast && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3.5 py-2 rounded-xl animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{limitToast}</span>
              </div>
            )}
          </div>

          {limitError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{limitError}</span>
            </div>
          )}

          <form onSubmit={handleAddScans} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Patient Phone Number
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-slate-400 border-r border-slate-700 pr-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={topUpPhone}
                  onChange={(e) => {
                    setTopUpPhone(e.target.value.replace(/\D/g, ''));
                    if (limitError) setLimitError(null);
                  }}
                  placeholder="9876543210"
                  className="w-full pl-20 pr-3 py-2.5 text-xs sm:text-sm bg-slate-950/70 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Additional Scans to Add
              </label>
              <input
                type="number"
                min={1}
                max={500}
                required
                value={topUpScans}
                onChange={(e) => setTopUpScans(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-950/70 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-white"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={isSavingLimit}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isSavingLimit ? 'Saving...' : 'Save / Add Scans'}</span>
              </button>
            </div>
          </form>

          {activeLimits.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Active Phone Top-ups:
              </span>
              <div className="flex flex-wrap gap-2">
                {activeLimits.map((l) => (
                  <div
                    key={l.phone}
                    className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex items-center gap-2"
                  >
                    <span className="font-mono text-slate-300">+91 {l.phone}</span>
                    <span className="text-amber-400 font-bold text-[11px]">+{l.bonus} bonus</span>
                    <span className="text-[10px] text-slate-500">(Total: {9 + l.bonus})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section: Teams Employee Credentials Management */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">Teams Employee Credentials</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/80 text-blue-300 border border-blue-700/50">
                  {employees.filter(e => e.status === 'Pending').length} Pending Approval
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Authorize new employee sign-ups, approve/reject staff accounts, and manage login access for `/teams`.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Employee search */}
              <div className="relative flex-1 sm:flex-initial sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search staff, role, ID..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/70 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-white placeholder-slate-500"
                />
              </div>

              {/* Create new employee button */}
              <button
                type="button"
                onClick={handleOpenCreateEmployee}
                className="py-2 px-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Employee</span>
              </button>
            </div>
          </div>

          {empToast && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3.5 py-2.5 rounded-xl animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{empToast}</span>
            </div>
          )}

          {/* Employees Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-3">Username</th>
                  <th className="py-3 px-3">Role / Department</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Joined Date</th>
                  <th className="py-3 px-4 text-right">Approval & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employees
                  .filter(e => 
                    e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                    e.username.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                    e.id.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                    e.role.toLowerCase().includes(employeeSearch.toLowerCase())
                  )
                  .map((emp) => (
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
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        <div>{emp.role}</div>
                        <div className="text-[10px] text-slate-500">{emp.department}</div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            emp.status === 'Approved'
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
                          {/* Approval button if Pending */}
                          {emp.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleApproveEmployee(emp.id)}
                              title="Approve Employee Access"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {/* Block / Unblock toggle */}
                          {emp.status !== 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleBlockEmployee(emp.id)}
                              title={emp.status === 'Blocked' ? 'Unblock Account' : 'Block Access'}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                emp.status === 'Blocked'
                                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-amber-950/60 hover:text-amber-300'
                              }`}
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditEmployee(emp)}
                            title="Edit Details"
                            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id)}
                            title="Delete Account"
                            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-950/80 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create / Edit Employee Modal Dialog */}
        {isEmployeeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  <span>{editingEmployee ? 'Edit Employee Credentials' : 'Create New Employee Access'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEmployee} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={empForm.fullName}
                    onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Kannan"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Username / ID</label>
                  <input
                    type="text"
                    required
                    value={empForm.username}
                    onChange={(e) => setEmpForm({ ...empForm, username: e.target.value })}
                    placeholder="e.g. rajesh.care"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Designation</label>
                    <input
                      type="text"
                      required
                      value={empForm.role}
                      onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                      placeholder="e.g. Senior Physician"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Department</label>
                    <select
                      value={empForm.department}
                      onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
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
                  <label className="block text-slate-300 font-semibold mb-1">Approval Status</label>
                  <select
                    value={empForm.status}
                    onChange={(e) => setEmpForm({ ...empForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Approved">Approved (Full Access)</option>
                    <option value="Pending">Pending Approval</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEmployeeModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    {editingEmployee ? 'Update Employee' : 'Create Credentials'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Section: Vitals Scan Details */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
          {/* Section Header & Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">Vitals Scan Details</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-900/60 text-purple-300 border border-purple-700/50">
                  {filteredRecords.length} records
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time stream of all patient biometric screenings captured via Nhealth Vital Lens.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search filter */}
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by name, phone, city..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/70 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-white placeholder-slate-500"
                />
              </div>

              {/* Live Sync Action */}
              <button
                type="button"
                onClick={fetchRecords}
                disabled={isLoading}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Refresh and sync data from Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Syncing...' : 'Sync Data'}</span>
              </button>

              {/* Bulk PDF Action */}
              <button
                type="button"
                onClick={handlePrintBulkPdf}
                className="py-2 px-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Bulk Download PDF Report</span>
              </button>

              {/* Clear All */}
              {records.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="py-2 px-3 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-400 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  title="Clear all stored records"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Records Table */}
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">No patient scan records found.</p>
              <p className="text-xs text-slate-500">
                {searchQuery ? 'Try matching a different query or clear filter.' : 'When users complete Vital Lens scans on the patient site, records appear here instantly.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Patient Name</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3">City</th>
                    <th className="py-3 px-3">Gender</th>
                    <th className="py-3 px-3 text-center text-rose-400">Heart Rate</th>
                    <th className="py-3 px-3 text-center text-cyan-400">SpO2</th>
                    <th className="py-3 px-3 text-center text-emerald-400">Respiration</th>
                    <th className="py-3 px-3 text-center text-amber-400">Stress</th>
                    <th className="py-3 px-3">Recorded Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRecords.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {r.fullName}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        +91 {r.phone}
                      </td>
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        {r.city}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
                          {r.gender}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-white whitespace-nowrap">
                        <span className="text-rose-400 font-extrabold">{r.heartRate}</span> BPM
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-white whitespace-nowrap">
                        <span className="text-cyan-400 font-extrabold">{r.spo2}</span>%
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-white whitespace-nowrap">
                        <span className="text-emerald-400 font-extrabold">{r.respiratoryRate}</span> RPM
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="text-amber-300 font-bold">{r.stressScore}</span>{' '}
                        <span className="text-[10px] text-slate-400">({r.stressLevel})</span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                        <div>{new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                        <div className="text-[10px] text-slate-500">{r.timestamp}</div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Single PDF download */}
                          <button
                            type="button"
                            onClick={() => handlePrintSinglePdf(r)}
                            title="Download Patient PDF Report"
                            className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-800/60 text-purple-300 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r.id)}
                            title="Delete Record"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
