import axios from 'axios';
import { 
  Agent, 
  WorkflowData, 
  WorkflowExecutionResult 
} from '../types';

const API_URL = 'http://localhost:8001';

const api = {
  // Auth işlemleri için simüle edilmiş fonksiyonlar
  auth: {
    // Gerçek uygulamada burada API çağrıları olur
    login: async (email: string, password: string) => {
      // Basit simülasyon
      if (email && password) {
        return {
          id: '1',
          email,
          full_name: email.split('@')[0]
        };
      }
      throw new Error('Email ve şifre gerekli');
    },
    
    register: async (email: string, password: string, full_name: string) => {
      // Basit simülasyon
      if (email && password && full_name) {
        return { success: true };
      }
      throw new Error('Tüm bilgiler gerekli');
    }
  },
  
  // Agent işlemleri
  agents: {
    getAll: async () => {
      const response = await axios.get<Agent[]>(`${API_URL}/agents`);
      return response.data;
    },
    
    create: async (agent: Partial<Agent>) => {
      const response = await axios.post<Agent>(`${API_URL}/agents`, agent);
      return response.data;
    }
  },
  
  // Workflow işlemleri
  workflows: {
    getAll: async () => {
      const response = await axios.get<WorkflowData[]>(`${API_URL}/workflows`);
      return response.data;
    },
    
    save: async (workflow: WorkflowData) => {
      const response = await axios.post<WorkflowData>(`${API_URL}/workflows`, workflow);
      return response.data;
    },
    
    delete: async (workflowId: string) => {
      await axios.delete(`${API_URL}/workflows/${workflowId}`);
      return { success: true };
    },
    
    execute: async (workflowId: string, input_text: string) => {
      const response = await axios.post<WorkflowExecutionResult>(
        `${API_URL}/workflows/${workflowId}/execute`, 
        { input_text }
      );
      return response.data;
    }
  }
};

export default api; 