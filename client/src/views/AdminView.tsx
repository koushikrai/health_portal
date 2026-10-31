import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

interface AdminViewProps {
  userRole: string;
}

export const AdminView: React.FC<AdminViewProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'clinics' | 'matrix'>('users');
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<any>(null);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // User Form State
  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('HR');
  const [formPassword, setFormPassword] = useState('Exp@2026');
  const [formVendorId, setFormVendorId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [userModalError, setUserModalError] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Clinics & Contracts State
  const [clinics, setClinics] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [editingClinic, setEditingClinic] = useState<any>(null);
  const [clinicForm, setClinicForm] = useState({
    code: '',
    name: '',
    sapVendorNo: '',
    crNumber: '',
    vatNumber: '',
    tier: 'Tier 1 Primary',
    saudization: 38.5,
    notes: ''
  });

  // Contract Modal State
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractVendorId, setContractVendorId] = useState('');
  const [contractForm, setContractForm] = useState({
    contractNo: '',
    quoteNo: '',
    invoicingType: 'Ariba portal',
    paymentTerms: 30,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
    notes: ''
  });

  // Rate Modal State
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateContractId, setRateContractId] = useState('');
  const [rateForm, setRateForm] = useState({
    testId: '',
    rate: 110,
    includesVat: false
  });

  // Status message
  const [actionSuccess, setActionSuccess] = useState('');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [statsRes, usersRes, clinicsRes, testsRes] = await Promise.all([
        api.admin.getOverview(),
        api.admin.getUsers(),
        api.getClinics(),
        api.getTests()
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
      setClinics(clinicsRes.data.clinics || []);
      setTests(testsRes.data.tests || []);
    } catch (e: any) {
      console.error('Error fetching admin data:', e);
      setFetchError(e.response?.data?.error || 'Failed to connect to backend administration service.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 6000);
  };

  // ==========================================
  // User Actions
  // ==========================================
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormName('');
    setFormRole('HR');
    setFormPassword('Exp@2026');
    setFormVendorId('');
    setFormIsActive(true);
    setUserModalError('');
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormName(user.name);
    setFormRole(user.role);
    setFormPassword(''); // blank = keep
    setFormVendorId(user.vendorId || '');
    setFormIsActive(user.isActive);
    setUserModalError('');
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalError('');
    setSavingUser(true);

    try {
      if (editingUser) {
        // Update User
        const payload: any = {
          name: formName,
          role: formRole,
          vendorId: formRole === 'CLINIC' ? formVendorId : null,
          isActive: formIsActive
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }
        await api.admin.updateUser(editingUser.id, payload);
        showNotification(`User '${editingUser.username}' successfully updated!`);
      } else {
        // Create User
        await api.admin.createUser({
          username: formUsername,
          name: formName,
          role: formRole,
          password: formPassword,
          vendorId: formRole === 'CLINIC' ? formVendorId : null,
          isActive: formIsActive
        });
        showNotification(`New user '${formUsername}' provisioned successfully!`);
      }
      setShowUserModal(false);
      loadAllAdminData();
    } catch (err: any) {
      setUserModalError(err.response?.data?.error || err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(`Are you sure you want to deactivate or remove user '${user.username}'?`)) return;
    try {
      await api.admin.deleteUser(user.id);
      showNotification(`User '${user.username}' account updated.`);
      loadAllAdminData();
    } catch (e: any) {
      alert(`Failed to delete user: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    try {
      await api.admin.updateUser(user.id, { isActive: !user.isActive });
      showNotification(`User '${user.username}' marked as ${!user.isActive ? 'Active' : 'Inactive'}.`);
      loadAllAdminData();
    } catch (e: any) {
      alert(`Failed to update status: ${e.response?.data?.error || e.message}`);
    }
  };

  // ==========================================
  // Clinic & Contract Actions
  // ==========================================
  const handleOpenCreateClinic = () => {
    setEditingClinic(null);
    setClinicForm({
      code: '',
      name: '',
      sapVendorNo: '',
      crNumber: '',
      vatNumber: '',
      tier: 'Tier 1 Primary',
      saudization: 38.5,
      notes: ''
    });
    setShowClinicModal(true);
  };

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClinic) {
        await api.admin.updateClinic(editingClinic.id, clinicForm);
        showNotification(`Clinic '${clinicForm.name}' updated!`);
      } else {
        await api.admin.createClinic(clinicForm);
        showNotification(`Accredited clinic '${clinicForm.name}' (${clinicForm.code}) onboarded!`);
      }
      setShowClinicModal(false);
      loadAllAdminData();
    } catch (err: any) {
      alert(`Clinic save failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleOpenAddContract = (vendorId: string) => {
    setContractVendorId(vendorId);
    setContractForm({
      contractNo: `462000${Math.floor(1000 + Math.random() * 9000)}`,
      quoteNo: `QT26/0${Math.floor(1 + Math.random() * 9)}/${Math.floor(100 + Math.random() * 900)}`,
      invoicingType: 'Ariba portal',
      paymentTerms: 30,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
      notes: 'Negotiated Medical Clearance Agreement'
    });
    setShowContractModal(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createContract({
        ...contractForm,
        vendorId: contractVendorId
      });
      showNotification(`SAP Contract #${contractForm.contractNo} recorded successfully!`);
      setShowContractModal(false);
      loadAllAdminData();
    } catch (e: any) {
      alert(`Contract creation failed: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleOpenAddRate = (contractId: string) => {
    setRateContractId(contractId);
    setRateForm({
      testId: tests[0]?.id || '5004955',
      rate: 110,
      includesVat: false
    });
    setShowRateModal(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.addContractRate({
        contractId: rateContractId,
        testId: rateForm.testId,
        rate: rateForm.rate,
        includesVat: rateForm.includesVat
      });
      showNotification(`Test rate card entry updated (SAR ${rateForm.rate})!`);
      setShowRateModal(false);
      loadAllAdminData();
    } catch (e: any) {
      alert(`Rate card update failed: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    if (!window.confirm('Remove this test from contract rate card?')) return;
    try {
      await api.admin.deleteContractRate(rateId);
      showNotification('Rate card entry removed.');
      loadAllAdminData();
    } catch (e: any) {
      alert(`Failed to delete rate: ${e.response?.data?.error || e.message}`);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.vendor?.name || '').toLowerCase().includes(userSearch.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const roleColors: Record<string, string> = {
    HR: 'bg-orange-50 text-orange-700 border-orange-200',
    REQUESTER: 'bg-amber-50 text-amber-700 border-amber-200',
    CENTRAL: 'bg-blue-50 text-blue-700 border-blue-200',
    CLINIC: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FINANCE: 'bg-purple-50 text-purple-700 border-purple-200',
    ADMIN: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-rose-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
              System Administrator Mode
            </span>
            <span className="text-slate-400 text-xs">&bull;</span>
            <span className="text-slate-500 text-xs font-mono">ECC Portal Master Console</span>
          </div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
            Administration & Governance Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage user accounts, assign operational roles, configure accredited medical clinics, SAP contracts, and permissions.
          </p>
        </div>

        {/* Global Stats Capsules */}
        {stats && (
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-center shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Users</span>
              <span className="text-sm font-extrabold text-slate-800">{stats.totalUsers}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-center shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Clinics</span>
              <span className="text-sm font-extrabold text-emerald-600">{stats.activeClinics}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-center shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Contracts</span>
              <span className="text-sm font-extrabold text-blue-600">{stats.totalContracts}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-900">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Error Retry Banner */}
      {fetchError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{fetchError}</span>
          </div>
          <button
            onClick={loadAllAdminData}
            className="bg-red-800 text-white text-[11px] font-bold px-3 py-1 rounded-lg hover:bg-red-900 cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
          <span>User IAM & Roles ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('clinics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'clinics'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">domain_add</span>
          <span>Clinics, Contracts & Rates ({clinics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">security</span>
          <span>Role Security Matrix & Guardrails</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: USERS & IAM MANAGEMENT                            */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter users by name, username..."
                  className="bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-secondary w-64"
                />
              </div>

              {/* Role Filter Pills */}
              {['ALL', 'HR', 'CENTRAL', 'CLINIC', 'FINANCE', 'ADMIN'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                    roleFilter === r
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              onClick={handleOpenCreateUser}
              className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Add New User</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-500">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role Assignment</th>
                    <th className="py-3 px-4">Facility / Clinic Scope</th>
                    <th className="py-3 px-4">Activity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {u.name ? u.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] font-mono text-slate-400">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full border ${roleColors[u.role] || 'bg-slate-100 text-slate-700'}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                          <span>{u.role}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {u.vendor ? (
                          <div className="leading-tight">
                            <span className="font-bold text-slate-800">{u.vendor.code}</span>
                            <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{u.vendor.name}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Corporate System-Wide</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {u.requestsCount > 0 ? (
                          <span className="text-slate-700 font-semibold">{u.requestsCount} clearances</span>
                        ) : (
                          <span className="text-slate-400">0 requests</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          title="Click to toggle account status"
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                          <span>{u.isActive ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit User Profile & Role"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Deactivate or Remove User"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No users found matching search or role filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CLINICS & CONTRACTS GOVERNANCE                     */}
      {/* ========================================================= */}
      {activeTab === 'clinics' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="font-display font-bold text-sm text-slate-900">Accredited Healthcare Providers</h3>
              <p className="text-xs text-slate-500">Manage partner clinics, SAP Vendor Numbers, ZATCA VAT IDs, and contract rate cards.</p>
            </div>
            <button
              onClick={handleOpenCreateClinic}
              className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              <span>Onboard New Clinic</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {clinics.map(c => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 text-secondary font-extrabold flex items-center justify-center text-sm shadow-inner">
                      {c.code}
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-base text-slate-900">{c.name}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span>SAP Vendor #: <strong className="font-mono text-slate-800">{c.sapVendorNo || 'N/A'}</strong></span>
                        <span>&bull;</span>
                        <span>CR #: <strong className="font-mono text-slate-800">{c.crNumber || 'N/A'}</strong></span>
                        <span>&bull;</span>
                        <span>VAT (ZATCA): <strong className="font-mono text-slate-800">{c.vatNumber || 'N/A'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                      {c.tier || 'Tier 1 Primary'} &bull; {c.saudization}% Saudization
                    </span>
                    <button
                      onClick={() => handleOpenAddContract(c.id)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">post_add</span>
                      <span>+ Contract</span>
                    </button>
                  </div>
                </div>

                {/* Contracts List */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Active Contracts & Negotiated Rate Cards ({c.contracts?.length || 0})
                  </span>

                  {(!c.contracts || c.contracts.length === 0) ? (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                      No active contract registered. Click "+ Contract" above to record an approved SAP agreement.
                    </div>
                  ) : (
                    c.contracts.map((con: any) => (
                      <div key={con.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                            <span className="font-bold text-slate-900">SAP Contract #{con.contractNo}</span>
                            {con.quoteNo && (
                              <span className="text-slate-500 font-mono text-[11px]">({con.quoteNo})</span>
                            )}
                            <span className="text-slate-400">&bull;</span>
                            <span className="text-slate-600">Terms: Net {con.paymentTerms || 30}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="text-slate-600">{con.invoicingType}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenAddRate(con.id)}
                              className="bg-white border border-slate-300 hover:border-secondary text-slate-800 font-bold text-[11px] px-2.5 py-1 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">price_change</span>
                              <span>+ Add Rate</span>
                            </button>
                          </div>
                        </div>

                        {/* Rate Cards Items */}
                        {con.rates && con.rates.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                            {con.rates.map((r: any) => (
                              <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-2 text-xs flex items-center justify-between">
                                <div className="truncate pr-2">
                                  <div className="font-bold text-slate-800 truncate text-[11px]">{r.test?.name || r.testId}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">SAP #{r.testId}</div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-extrabold text-secondary font-mono">SAR {Number(r.rate).toFixed(2)}</span>
                                  <button
                                    onClick={() => handleDeleteRate(r.id)}
                                    className="text-slate-300 hover:text-red-500 p-0.5 rounded cursor-pointer"
                                    title="Delete rate entry"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            No specific test rate cards mapped under this contract. Click "+ Add Rate" to add test pricing.
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ROLE SECURITY MATRIX & ACCESS GOVERNANCE          */}
      {/* ========================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-display font-bold text-sm text-slate-900 mb-1">
              Enterprise Role-Based Access Control (RBAC) Matrix
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Overview of module clearance privileges, operational restrictions, and security boundaries across the portal.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] uppercase font-bold">
                    <th className="py-3 px-4">Workspace Module</th>
                    <th className="py-3 px-4 text-center">HR Coordinator</th>
                    <th className="py-3 px-4 text-center">HSE Requester</th>
                    <th className="py-3 px-4 text-center">Central Medical</th>
                    <th className="py-3 px-4 text-center">Clinic Desk</th>
                    <th className="py-3 px-4 text-center">Finance Controller</th>
                    <th className="py-3 px-4 text-center">System Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[
                    { module: 'Executive KPI Dashboard', hr: true, req: true, central: true, clinic: false, fin: true, admin: true },
                    { module: 'Clearance Intake (Single & Bulk)', hr: true, req: true, central: true, clinic: false, fin: false, admin: true },
                    { module: 'Requests Queue & Triage', hr: true, req: true, central: true, clinic: false, fin: false, admin: true },
                    { module: 'Report & Certificate Library', hr: true, req: true, central: true, clinic: true, fin: true, admin: true },
                    { module: 'Clinic Examination & Outcomes', hr: false, req: false, central: false, clinic: true, fin: false, admin: true },
                    { module: 'Invoice Clearance & 3-Way Match', hr: false, req: false, central: false, clinic: false, fin: true, admin: true },
                    { module: 'Clinics & Contract Rate Cards', hr: true, req: true, central: true, clinic: true, fin: true, admin: true },
                    { module: 'Regulatory System Audit Trail', hr: true, req: false, central: true, clinic: false, fin: true, admin: true },
                    { module: 'Administration & User IAM Console', hr: false, req: false, central: false, clinic: false, fin: false, admin: true }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{row.module}</td>
                      {[row.hr, row.req, row.central, row.clinic, row.fin, row.admin].map((allowed, i) => (
                        <td key={i} className="py-3.5 px-4 text-center">
                          {allowed ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <span className="material-symbols-outlined text-[16px]">check</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-slate-400">
                              <span className="material-symbols-outlined text-[14px]">remove</span>
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT USER                                 */}
      {/* ========================================================= */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-slate-900 text-secondary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-900">
                    {editingUser ? `Edit User: ${editingUser.username}` : 'Provision New System User'}
                  </h3>
                  <span className="text-[11px] text-slate-400">User Identity & Access Management</span>
                </div>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {userModalError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{userModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingUser)}
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="e.g. jdoe, clinic_dina"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-secondary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Dr. John Doe, MD"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Operational Role *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-secondary cursor-pointer"
                >
                  <option value="HR">HR Coordinator (Personnel Intake)</option>
                  <option value="REQUESTER">HSE Coordinator (Pre-Check Intake)</option>
                  <option value="CENTRAL">Central Medical Team (Triage & Quota Allocation)</option>
                  <option value="CLINIC">Accredited Clinic Desk (Exams & Certificates)</option>
                  <option value="FINANCE">Finance Controller (3-Way Match & SES Clearance)</option>
                  <option value="ADMIN">System Administrator (Full Enterprise Governance)</option>
                </select>
              </div>

              {/* Clinic selection if CLINIC role */}
              {formRole === 'CLINIC' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <label className="block text-xs font-bold text-emerald-900 mb-1">Assigned Clinic Center *</label>
                  <select
                    value={formVendorId}
                    onChange={(e) => setFormVendorId(e.target.value)}
                    required
                    className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-950 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Clinic Facility --</option>
                    {clinics.map(c => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-emerald-700 mt-1 block">
                    User will only be granted access to patient queues and invoices for this facility.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingUser ? 'Reset Password (leave blank to keep unchanged)' : 'Initial Password *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? '••••••••' : 'Enter password'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-secondary focus:ring-secondary cursor-pointer"
                />
                <label htmlFor="userActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Account is Active and authorized to log in
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {savingUser ? 'Saving...' : editingUser ? 'Update User' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ONBOARD NEW CLINIC                                 */}
      {/* ========================================================= */}
      {showClinicModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-slate-900 text-secondary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">domain</span>
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-900">Onboard Accredited Clinic</h3>
                  <span className="text-[11px] text-slate-400">Add medical facility & auto-generate SAP contract</span>
                </div>
              </div>
              <button
                onClick={() => setShowClinicModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveClinic} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clinic Code *</label>
                  <input
                    type="text"
                    required
                    value={clinicForm.code}
                    onChange={(e) => setClinicForm({ ...clinicForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. ALMANA"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SAP Vendor ID</label>
                  <input
                    type="text"
                    value={clinicForm.sapVendorNo}
                    onChange={(e) => setClinicForm({ ...clinicForm, sapVendorNo: e.target.value })}
                    placeholder="e.g. 1001920"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Legal Name *</label>
                <input
                  type="text"
                  required
                  value={clinicForm.name}
                  onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                  placeholder="e.g. Al Mana General Hospital Co."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CR Number (Ministry)</label>
                  <input
                    type="text"
                    value={clinicForm.crNumber}
                    onChange={(e) => setClinicForm({ ...clinicForm, crNumber: e.target.value })}
                    placeholder="10-digit CR"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">VAT Number (ZATCA)</label>
                  <input
                    type="text"
                    value={clinicForm.vatNumber}
                    onChange={(e) => setClinicForm({ ...clinicForm, vatNumber: e.target.value })}
                    placeholder="15-digit ZATCA ID"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Accreditation Tier</label>
                  <select
                    value={clinicForm.tier}
                    onChange={(e) => setClinicForm({ ...clinicForm, tier: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary cursor-pointer"
                  >
                    <option value="Tier 1 Primary">Tier 1 Primary</option>
                    <option value="Tier 2 Subcontractor">Tier 2 Subcontractor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Saudization %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={clinicForm.saudization}
                    onChange={(e) => setClinicForm({ ...clinicForm, saudization: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClinicModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Onboard Clinic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD CONTRACT                                       */}
      {/* ========================================================= */}
      {showContractModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-display font-extrabold text-base text-slate-900">Add SAP Contract</h3>
              <button onClick={() => setShowContractModal(false)} className="text-slate-400 p-1">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveContract} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SAP Contract # *</label>
                <input
                  type="text"
                  required
                  value={contractForm.contractNo}
                  onChange={(e) => setContractForm({ ...contractForm, contractNo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quote Reference</label>
                <input
                  type="text"
                  value={contractForm.quoteNo}
                  onChange={(e) => setContractForm({ ...contractForm, quoteNo: e.target.value })}
                  placeholder="e.g. QT26/11/040"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={contractForm.endDate}
                    onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Invoicing Type</label>
                  <select
                    value={contractForm.invoicingType}
                    onChange={(e) => setContractForm({ ...contractForm, invoicingType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                  >
                    <option value="Ariba portal">Ariba portal</option>
                    <option value="E-invoice email">E-invoice email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Terms (Days)</label>
                  <input
                    type="number"
                    value={contractForm.paymentTerms}
                    onChange={(e) => setContractForm({ ...contractForm, paymentTerms: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Record Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD TEST RATE CARD                                 */}
      {/* ========================================================= */}
      {showRateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-display font-extrabold text-base text-slate-900">Add Negotiated Test Rate</h3>
              <button onClick={() => setShowRateModal(false)} className="text-slate-400 p-1">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SAP Medical Test Package *</label>
                <select
                  required
                  value={rateForm.testId}
                  onChange={(e) => setRateForm({ ...rateForm, testId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-secondary cursor-pointer"
                >
                  {tests.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.id} — {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contracted Rate (SAR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">SAR</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rateForm.rate}
                    onChange={(e) => setRateForm({ ...rateForm, rate: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="incVat"
                  checked={rateForm.includesVat}
                  onChange={(e) => setRateForm({ ...rateForm, includesVat: e.target.checked })}
                  className="rounded text-secondary focus:ring-secondary cursor-pointer"
                />
                <label htmlFor="incVat" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Price includes 15% VAT
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Save Rate Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
