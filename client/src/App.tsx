import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { DashboardView } from './views/DashboardView';
import { IntakeView } from './views/IntakeView';
import { SuppliersView } from './views/SuppliersView';
import { RequestsQueueView } from './views/RequestsQueueView';
import { ClinicPortalView } from './views/ClinicPortalView';
import { InvoiceClearanceView } from './views/InvoiceClearanceView';
import { AuditLogView } from './views/AuditLogView';
import { ReportsView } from './views/ReportsView';
import { LoginView } from './views/LoginView';
import { AdminView } from './views/AdminView';
import { SlotPortalView } from './views/SlotPortalView';
import { AccessRestrictedGuardrail } from './components/common/AccessRestrictedGuardrail';
import { api } from './api/client';

export interface RoleConfig {
  allowedTabs: string[];
  defaultTab: string;
  label: string;
}

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  HR: {
    allowedTabs: ['dashboard', 'intake', 'requests', 'reports'],
    defaultTab: 'dashboard',
    label: 'HR Coordinator'
  },
  REQUESTER: {
    allowedTabs: ['dashboard', 'intake', 'requests', 'reports'],
    defaultTab: 'intake',
    label: 'HSE Coordinator'
  },
  CENTRAL: {
    allowedTabs: ['slots', 'requests', 'reports', 'suppliers', 'dashboard'],
    defaultTab: 'slots',
    label: 'Central Medical Team'
  },
  CLINIC: {
    allowedTabs: ['clinic'],
    defaultTab: 'clinic',
    label: 'Accredited Medical Center'
  },
  FINANCE: {
    allowedTabs: ['finance', 'dashboard', 'suppliers'],
    defaultTab: 'finance',
    label: 'Finance Controller'
  },
  ADMIN: {
    allowedTabs: ['dashboard', 'intake', 'slots', 'requests', 'reports', 'clinic', 'finance', 'suppliers', 'audit', 'admin'],
    defaultTab: 'admin',
    label: 'System Administrator'
  }
};

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [userRole, setUserRole] = useState('HR');
  const [userName, setUserName] = useState('Marcus Sterling');
  const [vendorId, setVendorId] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Extract current tab from real browser URL pathname (e.g. "/requests" -> "requests")
  const currentPathSegment = location.pathname.replace(/^\//, '').split('/')[0] || '';
  const currentTab = currentPathSegment || (ROLE_CONFIGS[userRole]?.defaultTab || 'dashboard');

  useEffect(() => {
    checkSession();

    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setUserName('');
      setVendorId(null);
    };

    window.addEventListener('ecc_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('ecc_auth_expired', handleAuthExpired);
  }, []);

  const checkSession = async () => {
    const token = localStorage.getItem('ecc_token');
    if (!token) {
      setIsAuthenticated(false);
      setCheckingAuth(false);
      return;
    }

    try {
      const res = await api.me();
      if (res.data?.user) {
        setIsAuthenticated(true);
        setUserRole(res.data.user.role);
        setUserName(res.data.user.name);
        setVendorId(res.data.user.vendorId || null);

        const isRealAdmin = res.data.user.role === 'ADMIN' || !!res.data.user.impersonatorId;
        if (isRealAdmin) {
          localStorage.setItem('ecc_real_role', 'ADMIN');
        } else {
          localStorage.removeItem('ecc_real_role');
        }

        const allowed = ROLE_CONFIGS[res.data.user.role]?.allowedTabs || ['dashboard'];
        if (currentPathSegment && !allowed.includes(currentPathSegment) && res.data.user.role !== 'ADMIN') {
          navigate(`/${ROLE_CONFIGS[res.data.user.role]?.defaultTab || 'dashboard'}`, { replace: true });
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      localStorage.removeItem('ecc_token');
      localStorage.removeItem('ecc_real_role');
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLoginSuccess = (user: any, token: string) => {
    setIsAuthenticated(true);
    setUserRole(user.role);
    setUserName(user.name);
    setVendorId(user.vendorId || null);
    
    if (user.role === 'ADMIN') {
      localStorage.setItem('ecc_real_role', 'ADMIN');
    } else {
      localStorage.removeItem('ecc_real_role');
    }

    // Auto-navigate to role's designated landing module with real URL update
    const targetDefault = ROLE_CONFIGS[user.role]?.defaultTab || 'dashboard';
    navigate(`/${targetDefault}`, { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('ecc_token');
    localStorage.removeItem('ecc_real_role');
    setIsAuthenticated(false);
    setUserName('');
    setVendorId(null);
  };

  const handleSelectTab = (tabId: string) => {
    navigate(`/${tabId}`);
  };

  const handleSwitchRole = async (targetRole: string, targetVendorId?: string) => {
    try {
      const res = await api.switchRole(targetRole, targetVendorId);
      if (res.data?.token) {
        localStorage.setItem('ecc_token', res.data.token);
        setUserRole(res.data.user.role);
        setUserName(res.data.user.name);
        setVendorId(res.data.user.vendorId || null);

        const allowed = ROLE_CONFIGS[res.data.user.role]?.allowedTabs || ['dashboard'];
        if (!allowed.includes(currentTab) && res.data.user.role !== 'ADMIN') {
          navigate(`/${ROLE_CONFIGS[res.data.user.role]?.defaultTab || 'dashboard'}`);
        }
      }
    } catch (e) {
      console.error(e);
      setUserRole(targetRole);
      const allowed = ROLE_CONFIGS[targetRole]?.allowedTabs || ['dashboard'];
      if (!allowed.includes(currentTab) && targetRole !== 'ADMIN') {
        navigate(`/${ROLE_CONFIGS[targetRole]?.defaultTab || 'dashboard'}`);
      }
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-medium">Loading Expertise Health Portal...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const tabLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    intake: 'New Request',
    requests: 'Requests Queue',
    reports: 'Report Library',
    slots: 'Medical Slot Portal',
    clinic: 'Clinic Portal',
    finance: 'Invoice Clearance',
    suppliers: 'Clinics & Contracts',
    audit: 'System Audit Log',
    admin: 'System Administration'
  };

  const allowedTabs = ROLE_CONFIGS[userRole]?.allowedTabs || [];
  const isTabAllowed = userRole === 'ADMIN' || allowedTabs.includes(currentTab);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Dark Navy Sidebar connected with real browser routes */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        userRole={userRole}
        userName={userName}
        onSwitchRole={handleSwitchRole}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopHeader
          currentTabLabel={tabLabels[currentTab] || 'Dashboard'}
          userRole={userRole}
          userName={userName}
          onSwitchRole={handleSwitchRole}
          onLogout={handleLogout}
          onNavigateToTab={handleSelectTab}
        />

        <main className="flex-1 overflow-y-auto">
          {!isTabAllowed ? (
            <AccessRestrictedGuardrail
              currentTab={currentTab}
              userRole={userRole}
              userName={userName}
              onNavigateToTab={handleSelectTab}
              onSwitchRole={handleSwitchRole}
            />
          ) : (
            <Routes>
              {/* Default landing redirect */}
              <Route
                path="/"
                element={<Navigate to={`/${ROLE_CONFIGS[userRole]?.defaultTab || 'dashboard'}`} replace />}
              />
              <Route
                path="/dashboard"
                element={<DashboardView onNavigateToTab={handleSelectTab} />}
              />
              <Route path="/intake" element={<IntakeView />} />
              <Route path="/requests" element={<RequestsQueueView userRole={userRole} />} />
              <Route path="/reports" element={<ReportsView />} />
              <Route path="/slots" element={<SlotPortalView userRole={userRole} userName={userName} onSwitchRole={handleSwitchRole} />} />
              <Route
                path="/clinic"
                element={
                  <ClinicPortalView
                    userRole={userRole}
                    vendorId={vendorId}
                    onNavigateToTab={handleSelectTab}
                  />
                }
              />
              <Route path="/finance" element={<InvoiceClearanceView />} />
              <Route path="/suppliers" element={<SuppliersView />} />
              <Route path="/audit" element={<AuditLogView />} />
              <Route path="/admin" element={<AdminView userRole={userRole} />} />
              {/* Fallback to default */}
              <Route
                path="*"
                element={<Navigate to={`/${ROLE_CONFIGS[userRole]?.defaultTab || 'dashboard'}`} replace />}
              />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
