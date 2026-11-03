import React from 'react';
import { MedicalDispatchDashboard } from '../components/dashboard/MedicalDispatchDashboard';

interface ClinicPortalViewProps {
  userRole: string;
  vendorId?: string | null;
  onNavigateToTab?: (tab: string) => void;
}

export const ClinicPortalView: React.FC<ClinicPortalViewProps> = ({
  userRole,
  vendorId,
  onNavigateToTab
}) => {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      <MedicalDispatchDashboard
        userRole={userRole}
        vendorId={vendorId}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
};
