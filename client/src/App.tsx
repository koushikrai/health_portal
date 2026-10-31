import React, { useState, useEffect } from 'react';
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
import { AccessRestrictedGuardrail } from './components/common/AccessRestrictedGuardrail';
import { api } from './api/client';

export interface RoleConfig {
  allowedTabs: string[];
  defaultTab: string;
  label: string;
}

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  HR: {
    allowedTabs: ['dashboard', 'intake', 'requests', 'reports', 'suppliers'],
    defaultTab: 'dashboard',
    label: 'HR Coordinator'
  },
  REQUESTER: {
    allowedTabs: ['dashboard', 'intake', 'requests', 'reports', 'suppliers'],
    defaultTab: 'intake',
    label: 'HSE Coordinator'
  },
  CENTRAL: {
    allowedTabs: ['dashboard', 'requests', 'intake', 'reports', 'suppliers', 'audit'],
    defaultTab: 'requests',
    label: 'Central Medical Team'
  },
  CLINIC: {
    allowedTabs: ['clinic', 'reports', 'suppliers'],
    defaultTab: 'clinic',
    label: 'Accredited Medical Center'
  },
  FINANCE: {
    allowedTabs: ['dashboard', 'finance', 'reports', 'suppliers', 'audit'],
    defaultTab: 'finance',
    label: 'Finance Controller'
  },
  ADMIN: {
    allowedTabs: ['dashboard', 'intake', 'requests', 'reports', 'clinic', 'finance', 'suppliers', 'audit', 'admin'],
    defaultTab: 'admin',
    label: 'System Administrator'
  }
};

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('HR');
  const [userName, setUserName] = useState('Marcus Sterling');
  const [vendorId, setVendorId] = useState<string | null>(null);

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

        const allowed = ROLE_CONFIGS[res.data.user.role]?.allowedTabs || ['dashboard'];
        if (!allowed.includes(currentTab)) {
          setCurrentTab(ROLE_CONFIGS[res.data.user.role]?.defaultTab || 'dashboard');
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      localStorage.removeItem('ecc_token');
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
    
    // Auto-navigate to role's designated landing module
    const targetDefault = ROLE_CONFIGS[user.role]?.defaultTab || 'dashboard';
    setCurrentTab(targetDefault);
  };

  const handleLogout = () => {
    localStorage.removeItem('ecc_token');
    setIsAuthenticated(false);
    setUserName('');
    setVendorId(null);
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
        if (!allowed.includes(currentTab)) {
          setCurrentTab(ROLE_CONFIGS[res.data.user.role]?.defaultTab || 'dashboard');
        }
      }
    } catch (e) {
      console.error(e);
      setUserRole(targetRole);
      const allowed = ROLE_CONFIGS[targetRole]?.allowedTabs || ['dashboard'];
      if (!allowed.includes(currentTab)) {
        setCurrentTab(ROLE_CONFIGS[targetRole]?.defaultTab || 'dashboard');
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
    clinic: 'Clinic Portal',
    finance: 'Invoice Clearance',
    suppliers: 'Clinics & Contracts',
    audit: 'System Audit Log',
    admin: 'System Administration'
  };

  const allowedTabs = ROLE_CONFIGS[userRole]?.allowedTabs || [];
  const isTabAllowed = userRole === 'ADMIN' || allowedTabs.includes(currentTab);

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Dark Navy Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        userRole={userRole}
        userName={userName}
        onSwitchRole={handleSwitchRole}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          currentTabLabel={tabLabels[currentTab] || 'Dashboard'}
          userRole={userRole}
          userName={userName}
          onSwitchRole={handleSwitchRole}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto">
          {!isTabAllowed ? (
            <AccessRestrictedGuardrail
              currentTab={currentTab}
              userRole={userRole}
              userName={userName}
              onNavigateToTab={setCurrentTab}
              onSwitchRole={handleSwitchRole}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && <DashboardView />}
              {currentTab === 'intake' && <IntakeView />}
              {currentTab === 'requests' && <RequestsQueueView userRole={userRole} />}
              {currentTab === 'reports' && <ReportsView />}
              {currentTab === 'clinic' && <ClinicPortalView userRole={userRole} vendorId={vendorId} />}
              {currentTab === 'finance' && <InvoiceClearanceView />}
              {currentTab === 'suppliers' && <SuppliersView />}
              {currentTab === 'audit' && <AuditLogView />}
              {currentTab === 'admin' && <AdminView userRole={userRole} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
