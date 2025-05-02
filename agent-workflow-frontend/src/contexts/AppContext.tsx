import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { 
  AuthState, 
  User, 
  SnackbarState, 
  Agent, 
  WorkflowData,
  WorkflowExecutionResult
} from '../types';
import api from '../api';

interface AppContextType {
  // Auth durumu
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => void;
  
  // Bildirim (snackbar) durumu
  snackbar: SnackbarState;
  showNotification: (message: string, severity: 'success' | 'error') => void;
  
  // Ajanlar
  agents: Agent[];
  loadAgents: () => Promise<Agent[]>;
  createAgent: (agent: Partial<Agent>) => Promise<void>;
  
  // İş akışları
  workflows: WorkflowData[];
  loadWorkflows: () => Promise<WorkflowData[]>;
  saveWorkflow: (workflow: WorkflowData) => Promise<WorkflowData>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  executeWorkflow: (workflowId: string, inputText: string) => Promise<WorkflowExecutionResult>;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Auth durumu
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: localStorage.getItem('isLoggedIn') === 'true',
    user: JSON.parse(localStorage.getItem('user') || 'null')
  });

  // Bildirim durumu
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Ajanlar ve iş akışları
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);

  // Bildirim gösterme
  const showNotification = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

  // Giriş işlemi
  const login = useCallback(async (email: string, password: string) => {
    try {
      const user = await api.auth.login(email, password);
      
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('user', JSON.stringify(user));
      
      setAuth({
        isAuthenticated: true,
        user
      });
      
      showNotification('Giriş başarılı', 'success');
    } catch (error) {
      console.error('Giriş hatası:', error);
      showNotification('Giriş yapılırken hata oluştu', 'error');
      throw error;
    }
  }, [showNotification]);

  // Kayıt işlemi
  const register = useCallback(async (email: string, password: string, full_name: string) => {
    try {
      await api.auth.register(email, password, full_name);
      showNotification('Kayıt başarılı, lütfen giriş yapın', 'success');
    } catch (error) {
      console.error('Kayıt hatası:', error);
      showNotification('Kayıt olurken hata oluştu', 'error');
      throw error;
    }
  }, [showNotification]);

  // Çıkış işlemi
  const logout = useCallback(() => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    
    setAuth({
      isAuthenticated: false,
      user: null
    });
    
    showNotification('Çıkış yapıldı', 'success');
  }, [showNotification]);

  // Ajan listesini yükleme
  const loadAgents = useCallback(async (): Promise<Agent[]> => {
    try {
      const data = await api.agents.getAll();
      setAgents(data);
      return data;
    } catch (error) {
      console.error('Ajanlar yüklenirken hata oluştu:', error);
      showNotification('Ajanlar yüklenirken hata oluştu', 'error');
      throw error;
    }
  }, [showNotification]);

  // Yeni ajan oluşturma
  const createAgent = useCallback(async (agent: Partial<Agent>) => {
    try {
      await api.agents.create(agent);
      showNotification('Agent başarıyla oluşturuldu', 'success');
      await loadAgents();
    } catch (error) {
      console.error('Agent oluşturulurken hata:', error);
      showNotification('Agent oluşturulurken hata oluştu', 'error');
      throw error;
    }
  }, [showNotification, loadAgents]);

  // İş akışı listesini yükleme
  const loadWorkflows = useCallback(async (): Promise<WorkflowData[]> => {
    try {
      const data = await api.workflows.getAll();
      setWorkflows(data);
      return data;
    } catch (error) {
      console.error('İş akışları yüklenirken hata oluştu:', error);
      showNotification('İş akışları yüklenirken hata oluştu', 'error');
      throw error;
    }
  }, [showNotification]);

  // İş akışı kaydetme
  const saveWorkflow = useCallback(async (workflow: WorkflowData) => {
    try {
      const data = await api.workflows.save(workflow);
      showNotification(
        workflow.id ? 'İş akışı başarıyla güncellendi' : 'İş akışı başarıyla kaydedildi', 
        'success'
      );
      await loadWorkflows();
      return data;
    } catch (error) {
      console.error('İş akışı kaydedilirken hata oluştu:', error);
      showNotification('İş akışı kaydedilirken hata oluştu', 'error');
      throw error;
    }
  }, [showNotification, loadWorkflows]);

  // İş akışı silme
  const deleteWorkflow = useCallback(async (workflowId: string) => {
    try {
      await api.workflows.delete(workflowId);
      showNotification('İş akışı başarıyla silindi', 'success');
      await loadWorkflows();
    } catch (error) {
      console.error('İş akışı silinirken hata oluştu:', error);
      showNotification('İş akışı silinirken hata oluştu', 'error');
      throw error;
    }
  }, [showNotification, loadWorkflows]);

  // İş akışı yürütme
  const executeWorkflow = useCallback(async (workflowId: string, inputText: string) => {
    try {
      const result = await api.workflows.execute(workflowId, inputText);
      showNotification('İş akışı başarıyla yürütüldü', 'success');
      return result;
    } catch (error) {
      console.error('İş akışı yürütülürken hata oluştu:', error);
      let errorMessage = 'İş akışı yürütülürken hata oluştu';
      
      // API yanıt hatasını kontrol et
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data && typeof axiosError.response.data === 'object' && 'detail' in axiosError.response.data) {
          errorMessage = axiosError.response.data.detail as string;
        }
      }
      
      showNotification(errorMessage, 'error');
      throw error;
    }
  }, [showNotification]);

  // Kullanıcı oturum açtığında, ilk verileri yükle
  useEffect(() => {
    if (auth.isAuthenticated) {
      loadAgents();
      loadWorkflows();
    }
  }, [auth.isAuthenticated, loadAgents, loadWorkflows]);

  const contextValue: AppContextType = {
    auth,
    setAuth,
    login,
    register,
    logout,
    snackbar,
    showNotification,
    agents,
    loadAgents,
    createAgent,
    workflows,
    loadWorkflows,
    saveWorkflow,
    deleteWorkflow,
    executeWorkflow
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      
      {/* Global Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppContext.Provider>
  );
}; 