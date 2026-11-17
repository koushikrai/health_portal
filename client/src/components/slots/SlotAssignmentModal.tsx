import React from 'react';
import {
  SlotAllocationWorkspace,
  SlotAllocationWorkspaceProps
} from './SlotAllocationWorkspace';

export type SlotWorkforcePanelProps = SlotAllocationWorkspaceProps;

export const SlotWorkforcePanel: React.FC<SlotWorkforcePanelProps> = (props) => {
  return <SlotAllocationWorkspace {...props} />;
};

export interface SlotAssignmentModalProps {
  slotId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssignmentUpdated?: () => void;
}

export const SlotAssignmentModal: React.FC<SlotAssignmentModalProps> = ({
  slotId,
  isOpen,
  onClose,
  onAssignmentUpdated
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <SlotAllocationWorkspace
        slotId={slotId}
        isActive={isOpen}
        inline={false}
        onClose={onClose}
        onAssignmentUpdated={onAssignmentUpdated}
      />
    </div>
  );
};
