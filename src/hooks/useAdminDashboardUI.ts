/**
 * Hook useAdminDashboardUI - Admin dashboard UI state
 * 
 * Pattern: State Colocation for complex dashboard
 * - Multiple dialogs (createUser, restore)
 * - Toast notifications
 * - Forms state
 * 
 * References:
 * - https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster
 */

import { useState } from 'react';

interface Toast {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
}

export function useAdminDashboardUI() {
  // Toast
  const [toast, setToast] = useState<Toast>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Create User Dialog
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Restore Dialog
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // Strava (for future)
  const [stravaConnected, setStravaConnected] = useState(false);

  // Helpers
  const showToast = (message: string, severity: Toast['severity'] = 'success') => {
    setToast({ open: true, message, severity });
  };

  const closeToast = () => {
    setToast({ ...toast, open: false });
  };

  const resetCreateUserForm = () => {
    setNewUserEmail('');
    setNewUserName('');
    setNewUserPassword('');
  };

  const closeCreateUserDialog = () => {
    setCreateUserDialogOpen(false);
    resetCreateUserForm();
  };

  const resetRestoreDialog = () => {
    setRestoreFile(null);
  };

  const closeRestoreDialog = () => {
    setRestoreDialogOpen(false);
    resetRestoreDialog();
  };

  return {
    // Toast
    toast,
    setToast,
    showToast,
    closeToast,

    // Create User Dialog
    createUserDialogOpen,
    setCreateUserDialogOpen,
    closeCreateUserDialog,
    newUserEmail,
    setNewUserEmail,
    newUserName,
    setNewUserName,
    newUserPassword,
    setNewUserPassword,
    resetCreateUserForm,

    // Restore Dialog
    restoreDialogOpen,
    setRestoreDialogOpen,
    closeRestoreDialog,
    restoreFile,
    setRestoreFile,
    resetRestoreDialog,

    // Strava
    stravaConnected,
    setStravaConnected,
  };
}
