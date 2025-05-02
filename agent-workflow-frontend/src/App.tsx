import React, { useContext } from 'react';
import { Box, Button, Typography } from '@mui/material';
import 'reactflow/dist/style.css';

import { AppProvider, AppContext } from './contexts/AppContext';
import AuthForm from './components/auth/AuthForm';
import WorkflowEditor from './components/workflow/WorkflowEditor';

const AppContent: React.FC = () => {
  const { auth, logout } = useContext(AppContext);

  if (!auth.isAuthenticated) {
    return <AuthForm />;
  }

    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, backgroundColor: '#1976d2', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            İş Akışı Yönetim Sistemi
          </Typography>
          <Box display="flex" alignItems="center">
            {auth.user && (
              <Typography variant="subtitle1" sx={{ mr: 2 }}>
                {auth.user.full_name}
              </Typography>
            )}
          <Button color="inherit" onClick={logout}>
              Çıkış Yap
            </Button>
          </Box>
        </Box>
        
      <WorkflowEditor />
      </Box>
    );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
