import React, { useState, useEffect, useCallback } from 'react';
import { Box, TextField, Button, Snackbar, Alert, List, ListItemText, ListItemButton, ListItemSecondaryAction, Divider, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Paper, CircularProgress, Container, Tabs, Tab, Menu, MenuItem } from '@mui/material';
import ReactFlow, { 
  Node, 
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeMouseHandler
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
// @ts-ignore
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
// @ts-ignore
import { saveAs } from 'file-saver';
import type { FileSaverOptions } from 'file-saver';

// API URL'leri
const API_URL = 'http://localhost:8001';

// Interfaces
interface User {
  id: string;
  email: string;
  full_name: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

interface WorkflowData {
  id?: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}

interface GptOutput {
  output_text: string;
  gpt_response: string;
}

interface WorkflowExecutionResult {
  workflow_id: string;
  results: {
    node_id: string;
    agent_name: string;
    output: string | GptOutput;
    processed_text: string;
  }[];
  execution_time: number;
  status: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

// App Component
const App: React.FC = () => {
  // Auth State
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: localStorage.getItem('isLoggedIn') === 'true',
    user: JSON.parse(localStorage.getItem('user') || 'null')
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', full_name: '' });

  // App State
  const [workflowName, setWorkflowName] = useState<string>('');
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [openAgentDialog, setOpenAgentDialog] = useState(false);
  const [newAgent, setNewAgent] = useState<Partial<Agent>>({
    name: '',
    description: '',
    prompt: ''
  });
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResults, setExecutionResults] = useState<WorkflowExecutionResult | null>(null);
  const [openResultsDialog, setOpenResultsDialog] = useState<boolean>(false);
  const [executionText, setExecutionText] = useState<string>('');
  const [openExecuteDialog, setOpenExecuteDialog] = useState<boolean>(false);

  // Düğüm silme için menü durumu
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    nodeId: string | null;
  } | null>(null);

  // Notification function
  const showNotification = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

  // Auth Functions
  const handleLogin = useCallback(async () => {
    try {
      // Basit kimlik doğrulama - gerçek uygulamada backend API ile doğrulama yapılır
      if (loginForm.email && loginForm.password) {
        // Örnek bir kullanıcı objesi oluştur
        const user: User = {
          id: '1',
          email: loginForm.email,
          full_name: loginForm.email.split('@')[0]
        };
        
        // Kullanıcı bilgilerini localStorage'a kaydet
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(user));
        
        // Auth state'i güncelle
        setAuth({
          isAuthenticated: true,
          user: user
        });
        
        showNotification('Giriş başarılı', 'success');
      } else {
        showNotification('Lütfen email ve şifre girin', 'error');
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      showNotification('Giriş yapılırken hata oluştu', 'error');
    }
  }, [loginForm, showNotification]);

  const handleRegister = useCallback(async () => {
    try {
      // Basit kayıt işlemi - gerçek uygulamada backend API ile kayıt yapılır
      if (registerForm.email && registerForm.password && registerForm.full_name) {
        // Kullanıcı kaydını simüle et
        showNotification('Kayıt başarılı, lütfen giriş yapın', 'success');
        setAuthMode('login');
        setLoginForm({
          email: registerForm.email,
          password: ''
        });
      } else {
        showNotification('Lütfen tüm bilgileri doldurun', 'error');
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      showNotification('Kayıt olurken hata oluştu', 'error');
    }
  }, [registerForm, showNotification, setAuthMode, setLoginForm]);

  const handleLogout = useCallback(() => {
    // Local storage'dan kullanıcı bilgilerini temizle
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    
    // Auth state'i güncelle
    setAuth({
      isAuthenticated: false,
      user: null
    });
    
    showNotification('Çıkış yapıldı', 'success');
  }, [showNotification]);

  // API Functions
  const loadAgents = useCallback(async () => {
    try {
      const response = await axios.get<Agent[]>(`${API_URL}/agents`);
      setAgents(response.data);
    } catch (error) {
      console.error('Ajanlar yüklenirken hata oluştu:', error);
      showNotification('Ajanlar yüklenirken hata oluştu', 'error');
    }
  }, [showNotification]);

  const loadWorkflows = useCallback(async () => {
    try {
      const response = await axios.get<WorkflowData[]>(`${API_URL}/workflows`);
      setWorkflows(response.data);
    } catch (error) {
      console.error('İş akışları yüklenirken hata oluştu:', error);
      showNotification('İş akışları yüklenirken hata oluştu', 'error');
    }
  }, [showNotification]);

  // Initial data loading
  useEffect(() => {
    if (auth.isAuthenticated) {
      loadAgents();
      loadWorkflows();
    }
  }, [auth.isAuthenticated, loadAgents, loadWorkflows]);

  const handleWorkflowSelect = useCallback((workflow: WorkflowData) => {
    setWorkflowName(workflow.name);
    setCurrentWorkflowId(workflow.id || null);
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    showNotification(`${workflow.name} iş akışı yüklendi`, 'success');
  }, [setWorkflowName, setCurrentWorkflowId, setNodes, setEdges, showNotification]);

  // START düğümü ekleme
  const handleAddStartNode = useCallback(() => {
    // Eğer zaten bir START düğümü varsa ekleme
    const startNodeExists = nodes.some(node => node.data?.agentId === 'START');
    if (startNodeExists) {
      showNotification('Zaten bir START düğümü mevcut', 'error');
      return;
    }
    
    const newNode: Node = {
      id: `START-${Date.now()}`,
      type: 'default',
      position: { x: 100, y: 100 },
      data: { 
        label: 'START', 
        agentId: 'START' 
      },
      style: { 
        background: '#d4edda', 
        color: '#155724',
        border: '1px solid #c3e6cb',
        borderRadius: '4px',
        width: 150,
        padding: '10px'
      }
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, showNotification, setNodes]);

  // END düğümü ekleme
  const handleAddEndNode = useCallback(() => {
    // Eğer zaten bir END düğümü varsa ekleme
    const endNodeExists = nodes.some(node => node.data?.agentId === 'END');
    if (endNodeExists) {
      showNotification('Zaten bir END düğümü mevcut', 'error');
      return;
    }
    
    const newNode: Node = {
      id: `END-${Date.now()}`,
      type: 'default',
      position: { x: 600, y: 100 },
      data: { 
        label: 'END', 
        agentId: 'END' 
      },
      style: { 
        background: '#f8d7da', 
        color: '#721c24',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        width: 150,
        padding: '10px'
      }
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, showNotification, setNodes]);

  // LOOP düğümü ekleme
  const handleAddLoopNode = useCallback(() => {
    // LOOP düğümü eklemek için bir kısıtlama yok, birden fazla eklenebilir
    const newNode: Node = {
      id: `LOOP-${Date.now()}`,
      type: 'default',
      position: { x: 350, y: 100 },
      data: { 
        label: 'LOOP', 
        agentId: 'LOOP' 
      },
      style: { 
        background: '#2196f3', // Mavi renk
        color: '#ffffff',
        border: '1px solid #1976d2',
        borderRadius: '4px',
        width: 150,
        padding: '10px'
      }
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  // Ajan seçme
  const handleAgentSelect = useCallback((agent: Agent) => {
    // Eğer START veya END ise özel stil
    let nodeStyle = {};
    
    if (agent.id === 'START') {
      nodeStyle = { 
        background: '#d4edda', 
        color: '#155724',
        border: '1px solid #c3e6cb',
        borderRadius: '4px',
        width: 150,
        padding: '10px'
      };
    } else if (agent.id === 'END') {
      nodeStyle = { 
        background: '#f8d7da', 
        color: '#721c24',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        width: 150,
        padding: '10px'
      };
    } else if (agent.id === 'LOOP') {
      nodeStyle = { 
        background: '#2196f3', // Mavi renk
        color: '#ffffff',
        border: '1px solid #1976d2',
        borderRadius: '4px',
        width: 150,
        padding: '10px'
      };
    }
    
    const newNode: Node = {
      id: `${agent.id}-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: { label: agent.name, agentId: agent.id },
      style: nodeStyle
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const handleSave = useCallback(async () => {
    if (!workflowName) {
      showNotification('Lütfen iş akışı adını girin', 'error');
      return;
    }

    if (nodes.length === 0) {
      showNotification('Lütfen en az bir ajan ekleyin', 'error');
      return;
    }

    const workflowData: WorkflowData = {
      id: currentWorkflowId || undefined,
      name: workflowName,
      nodes: nodes,
      edges: edges
    };

    try {
      const response = await axios.post<WorkflowData>(`${API_URL}/workflows`, workflowData);
      showNotification(
        currentWorkflowId ? 'İş akışı başarıyla güncellendi' : 'İş akışı başarıyla kaydedildi', 
        'success'
      );
      
      // Güncellenmiş ID'yi set et
      if (!currentWorkflowId && response.data && response.data.id) {
        setCurrentWorkflowId(response.data.id);
      }
      
      loadWorkflows(); // Listeyi yenile
    } catch (error) {
      console.error('İş akışı kaydedilirken hata oluştu:', error);
      showNotification('İş akışı kaydedilirken hata oluştu', 'error');
    }
  }, [workflowName, nodes, edges, currentWorkflowId, showNotification, loadWorkflows, setCurrentWorkflowId]);

  const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
    try {
      await axios.delete(`${API_URL}/workflows/${workflowId}`);
      showNotification('İş akışı başarıyla silindi', 'success');
      loadWorkflows(); // Listeyi yenile
      
      // Eğer silinen iş akışı şu anda yüklüyse, formu temizle
      if (workflowId === currentWorkflowId) {
        setWorkflowName('');
        setCurrentWorkflowId(null);
        setNodes([]);
        setEdges([]);
      }
    } catch (error) {
      console.error('İş akışı silinirken hata oluştu:', error);
      showNotification('İş akışı silinirken hata oluştu', 'error');
    }
  }, [currentWorkflowId, showNotification, loadWorkflows, setWorkflowName, setCurrentWorkflowId, setNodes, setEdges]);

  const handleCreateAgent = useCallback(async () => {
    if (!newAgent.name || !newAgent.prompt) {
      showNotification('Lütfen agent adı ve prompt alanlarını doldurun', 'error');
      return;
    }

    try {
      await axios.post(`${API_URL}/agents`, {
        ...newAgent
      });
      
      showNotification('Agent başarıyla oluşturuldu', 'success');
      setOpenAgentDialog(false);
      setNewAgent({
        name: '',
        description: '',
        prompt: ''
      });
      loadAgents(); // Agent listesini yenile
    } catch (error) {
      console.error('Agent oluşturulurken hata:', error);
      showNotification('Agent oluşturulurken hata oluştu', 'error');
    }
  }, [newAgent, showNotification, setOpenAgentDialog, setNewAgent, loadAgents]);

  const handleExecuteWorkflow = useCallback(async () => {
    if (!currentWorkflowId) {
      showNotification('Lütfen önce iş akışını kaydedin', 'error');
      return;
    }

    if (nodes.length === 0) {
      showNotification('İş akışında çalıştırılacak ajan yok', 'error');
      return;
    }

    try {
      setIsExecuting(true);
      
      // İş akışını yürüt (backend API çağrısı)
      const response = await axios.post<WorkflowExecutionResult>(
        `${API_URL}/workflows/${currentWorkflowId}/execute`, 
        {
          input_text: executionText, // Girilen metni gönder
        }
      );
      
      setExecutionResults(response.data);
      setOpenResultsDialog(true);
      setOpenExecuteDialog(false); // Yürütme diyaloğunu kapat
      showNotification('İş akışı başarıyla yürütüldü', 'success');
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
    } finally {
      setIsExecuting(false);
    }
  }, [currentWorkflowId, nodes.length, executionText, showNotification, setIsExecuting, setExecutionResults, setOpenResultsDialog]);

  // Yürütme diyaloğunu açma
  const handleOpenExecuteDialog = useCallback(() => {
    if (!currentWorkflowId) {
      showNotification('Lütfen önce iş akışını kaydedin', 'error');
      return;
    }

    if (nodes.length === 0) {
      showNotification('İş akışında çalıştırılacak ajan yok', 'error');
      return;
    }

    setOpenExecuteDialog(true);
  }, [currentWorkflowId, nodes.length, showNotification]);

  // Yürütme diyaloğunu kapatma
  const handleCloseExecuteDialog = useCallback(() => {
    setOpenExecuteDialog(false);
  }, []);

  // Sonuçlar diyaloğunu kapatma fonksiyonu
  const handleCloseResultsDialog = useCallback(() => {
    setOpenResultsDialog(false);
  }, [setOpenResultsDialog]);

  // İş akışı sonuçlarını Word olarak kaydetme
  const handleSaveAsWord = useCallback(() => {
    if (!executionResults) return;

    // Yeni Word belgesi oluştur
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "İş Akışı Yürütme Sonuçları",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: `Toplam Süre: ${executionResults.execution_time.toFixed(2)} saniye`,
            }),
            new Paragraph({
              text: `Durum: ${executionResults.status}`,
            }),
            new Paragraph({
              text: "Girilen Metin:",
              heading: HeadingLevel.HEADING_2,
              spacing: {
                before: 400,
                after: 200,
              },
            }),
            new Paragraph({
              text: executionText,
            }),
            new Paragraph({
              text: "Agent Çıktıları:",
              heading: HeadingLevel.HEADING_2,
              spacing: {
                before: 400,
                after: 200,
              },
            }),
            // Her ajan çıktısını ekle
            ...executionResults.results.flatMap((result, index) => [
              new Paragraph({
                text: result.agent_name,
                heading: HeadingLevel.HEADING_3,
                spacing: {
                  before: 300,
                  after: 100,
                },
              }),
              new Paragraph({
                text: "İşlenen Metin:",
                spacing: {
                  before: 200,
                  after: 100,
                },
                bullet: {
                  level: 0,
                },
              }),
              new Paragraph({
                text: result.processed_text,
                spacing: {
                  before: 100,
                  after: 200,
                },
              }),
              new Paragraph({
                text: "Ajan Çıktısı:",
                spacing: {
                  before: 200,
                  after: 100,
                },
                bullet: {
                  level: 0,
                },
              }),
              new Paragraph({
                text: typeof result.output === 'object' && result.output !== null && 'output_text' in result.output
                  ? (result.output as GptOutput).output_text 
                  : result.output as string,
                spacing: {
                  before: 100,
                  after: 300,
                },
              }),
            ]),
          ],
        },
      ],
    });

    // Doc dosyasını Blob'a dönüştür ve kaydet
    Packer.toBlob(doc).then((blob: Blob) => {
      saveAs(blob, `is-akisi-sonuc-${new Date().toISOString().slice(0, 10)}.docx`);
      showNotification("Sonuçlar Word belgesi olarak kaydedildi", "success");
    }).catch((error: Error) => {
      console.error("Word belgesine dönüştürme hatası:", error);
      showNotification("Word belgesine dönüştürürken hata oluştu", "error");
    });
  }, [executionResults, executionText, showNotification]);

  // Sağ tıklama işlemi için
  const handleNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      setContextMenu({
        mouseX: event.clientX - 2,
        mouseY: event.clientY - 4,
        nodeId: node.id,
      });
    },
    []
  );

  // Sağ tıklama menüsünü kapat
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Düğümü sil
  const handleDeleteNode = useCallback(() => {
    if (contextMenu?.nodeId) {
      const nodeId = contextMenu.nodeId;
      
      // Düğümü listeden çıkart
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      
      // Bu düğüme bağlı kenarları da kaldır
      setEdges((eds) => eds.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ));
      
      // Bildirim göster
      showNotification('Düğüm başarıyla silindi', 'success');
      
      // Menüyü kapat
      handleCloseContextMenu();
    }
  }, [contextMenu, setNodes, setEdges, showNotification]);

  // Render Auth Forms
  const renderAuthForms = useCallback(() => {
  return (
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h4" sx={{ mb: 4 }}>
            İş Akışı Yönetim Sistemi
          </Typography>
          
          <Paper sx={{ width: '100%', p: 3 }}>
            <Tabs
              value={authMode}
              onChange={(e, newValue) => setAuthMode(newValue)}
              indicatorColor="primary"
              textColor="primary"
              centered
              sx={{ mb: 3 }}
            >
              <Tab label="Giriş" value="login" />
              <Tab label="Kayıt Ol" value="register" />
            </Tabs>

            {authMode === 'login' ? (
              <Box component="form" noValidate>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Adresi"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Şifre"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
                <Button
                  type="button"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  onClick={handleLogin}
                >
                  Giriş Yap
                </Button>
              </Box>
            ) : (
              <Box component="form" noValidate>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="full_name"
                  label="Ad Soyad"
                  name="full_name"
                  autoComplete="name"
                  autoFocus
                  value={registerForm.full_name}
                  onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Adresi"
                  name="email"
                  autoComplete="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Şifre"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                />
                <Button
                  type="button"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  onClick={handleRegister}
                >
                  Kayıt Ol
                </Button>
              </Box>
            )}
          </Paper>
        </Box>
      </Container>
    );
  }, [authMode, loginForm, registerForm, setAuthMode, setLoginForm, setRegisterForm, handleLogin, handleRegister]);

  // Render Main App
  const renderApp = useCallback(() => {
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
            <Button color="inherit" onClick={handleLogout}>
              Çıkış Yap
            </Button>
          </Box>
        </Box>
        
        <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="İş Akışı Adı"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  sx={{ mr: 2 }}
                />
                <Button variant="contained" onClick={handleSave}>
                  Kaydet
                </Button>
                <Button 
                  variant="contained" 
                  color="secondary"
                  onClick={handleOpenExecuteDialog}
                  disabled={isExecuting || !currentWorkflowId}
                >
                  Yürüt
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary"
                  onClick={() => setOpenAgentDialog(true)}
                >
                  Yeni Agent Oluştur
                </Button>
              </Box>

              {/* İş Akışı Yürütme Dialog'u */}
              <Dialog
                open={openExecuteDialog}
                onClose={handleCloseExecuteDialog}
                maxWidth="md"
                fullWidth
              >
                <DialogTitle>İş Akışını Yürüt</DialogTitle>
                <DialogContent>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      İş akışında kullanılacak metin bilgisini girin:
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      variant="outlined"
                      placeholder="İşlenecek metni buraya girin..."
                      value={executionText}
                      onChange={(e) => setExecutionText(e.target.value)}
                    />
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseExecuteDialog}>İptal</Button>
                  <Button 
                    onClick={handleExecuteWorkflow} 
                    variant="contained" 
                    color="primary"
                    disabled={isExecuting}
                    startIcon={isExecuting ? <CircularProgress size={20} /> : null}
                  >
                    {isExecuting ? 'Yürütülüyor...' : 'Yürüt'}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* İş Akışı Sonuçları Dialog'u */}
              <Dialog
                open={openResultsDialog}
                onClose={handleCloseResultsDialog}
                maxWidth="md"
                fullWidth
              >
                <DialogTitle>İş Akışı Yürütme Sonuçları</DialogTitle>
                <DialogContent>
                  {executionResults && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1">
                        Toplam Süre: {executionResults.execution_time.toFixed(2)} saniye
                      </Typography>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>
                        Durum: {executionResults.status}
                      </Typography>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="h6">Girilen Metin:</Typography>
                      <Box 
                        sx={{ 
                          mt: 1, 
                          mb: 3,
                          p: 1, 
                          backgroundColor: '#f5f5f5',
                          borderRadius: 1,
                          fontSize: '0.9rem',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '100px',
                          overflow: 'auto'
                        }}
                      >
                        {executionText}
                      </Box>
                      
                      <Typography variant="h6">Agent Çıktıları:</Typography>
                      
                      {executionResults.results.map((result, index) => (
                        <Box key={index} sx={{ mt: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {result.agent_name}
                          </Typography>
                          
                          <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>
                            İşlenen Metin:
                          </Typography>
                          <Box 
                            sx={{ 
                              mt: 0.5, 
                              mb: 2,
                              p: 1, 
                              backgroundColor: '#e3f2fd',
                              borderRadius: 1,
                              fontSize: '0.9rem',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              maxHeight: '100px',
                              overflow: 'auto'
                            }}
                          >
                            {result.processed_text}
                          </Box>
                          
                          <Typography variant="subtitle2" color="primary">
                            Ajan Çıktısı:
                          </Typography>
                          <Box 
                            sx={{ 
                              mt: 0.5, 
                              p: 1, 
                              backgroundColor: '#f5f5f5',
                              borderRadius: 1,
                              fontSize: '0.9rem',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              maxHeight: '300px',
                              overflow: 'auto'
                            }}
                          >
                            {typeof result.output === 'object' && result.output !== null && 'output_text' in result.output
                              ? (result.output as GptOutput).output_text 
                              : result.output}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleSaveAsWord}
                    disabled={!executionResults}
                  >
                    Word Olarak Kaydet
                  </Button>
                  <Button onClick={handleCloseResultsDialog}>Kapat</Button>
                </DialogActions>
              </Dialog>

              {/* Agent Oluşturma Dialog'u */}
              <Dialog 
                open={openAgentDialog} 
                onClose={() => setOpenAgentDialog(false)}
                maxWidth="md"
                fullWidth
              >
                <DialogTitle>Yeni Agent Oluştur</DialogTitle>
                <DialogContent>
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        fullWidth
                        label="Agent Adı"
                        value={newAgent.name}
                        onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        fullWidth
                        label="Açıklama"
                        value={newAgent.description}
                        onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Prompt"
                        value={newAgent.prompt}
                        onChange={(e) => setNewAgent({ ...newAgent, prompt: e.target.value })}
                        helperText="Agent'ın davranışını belirleyen prompt'u girin"
                      />
                    </Box>
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setOpenAgentDialog(false)}>İptal</Button>
                  <Button onClick={handleCreateAgent} variant="contained">
                    Oluştur
                  </Button>
                </DialogActions>
              </Dialog>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  İş Akışı Bileşenleri:
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  <Button 
                    variant="contained" 
                    color="success" 
                    onClick={handleAddStartNode}
                    startIcon={<span>▶</span>}
                  >
                    START Ekle
                  </Button>
                  <Button 
                    variant="contained" 
                    color="error" 
                    onClick={handleAddEndNode}
                    startIcon={<span>⬛</span>}
                  >
                    END Ekle
                  </Button>
                  <Button 
                    variant="contained" 
                    sx={{ 
                      backgroundColor: '#2196f3', 
                      '&:hover': { backgroundColor: '#1976d2' } 
                    }}
                    onClick={handleAddLoopNode}
                    startIcon={<span>↻</span>}
                  >
                    LOOP Ekle
                  </Button>
                </Box>
                
                <Typography variant="subtitle1" sx={{ mb: 1, mt: 2 }}>
                  Ajanlar:
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  {agents.filter(agent => agent.id !== 'START' && agent.id !== 'END' && agent.id !== 'LOOP').map((agent) => (
                    <Button
                      key={agent.id}
                      variant="outlined"
                      onClick={() => handleAgentSelect(agent)}
                    >
                      {agent.name}
                    </Button>
                  ))}
                </Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  Not: Düğümleri silmek için üzerlerine sağ tıklayın.
                </Typography>
              </Box>

              <Box sx={{ flexGrow: 1, border: '1px solid #ccc', height: 'calc(100vh - 300px)' }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeContextMenu={handleNodeContextMenu}
                  fitView
                >
                  <Controls />
                  <Background />
                </ReactFlow>
                
                {/* Düğüm sağ tıklama menüsü */}
                <Menu
                  open={contextMenu !== null}
                  onClose={handleCloseContextMenu}
                  anchorReference="anchorPosition"
                  anchorPosition={
                    contextMenu !== null
                      ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                      : undefined
                  }
                >
                  <MenuItem onClick={handleDeleteNode}>Düğümü Sil</MenuItem>
                </Menu>
              </Box>
            </Box>

            <Box sx={{ width: 300, border: '1px solid #ccc', p: 2, height: '100%', overflow: 'auto' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Kaydedilen İş Akışları</Typography>
              <List>
                {workflows.map((workflow, index) => (
                  <React.Fragment key={workflow.id || index}>
                    <ListItemButton 
                      onClick={() => handleWorkflowSelect(workflow)}
                      sx={{ 
                        '&:hover': { 
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          cursor: 'pointer'
                        },
                        backgroundColor: workflow.id === currentWorkflowId ? 'rgba(0, 0, 255, 0.08)' : 'transparent'
                      }}
                    >
                      <ListItemText
                        primary={workflow.name}
                        secondary={`${workflow.nodes.length} ajan, ${workflow.edges.length} bağlantı`}
                      />
                      <ListItemSecondaryAction>
                        <Button 
                          variant="outlined" 
                          color="error"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkflow(workflow.id || '');
                          }}
                        >
                          Sil
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItemButton>
                    {index < workflows.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }, [
    auth.user, 
    workflowName, 
    currentWorkflowId, 
    agents, 
    nodes, 
    edges, 
    workflows, 
    isExecuting, 
    executionResults, 
    executionText, 
    openResultsDialog, 
    openAgentDialog, 
    openExecuteDialog,
    newAgent, 
    contextMenu,
    handleLogout, 
    setWorkflowName, 
    handleSave, 
    handleOpenExecuteDialog, 
    handleExecuteWorkflow, 
    handleCloseExecuteDialog, 
    setOpenAgentDialog, 
    handleCloseResultsDialog, 
    setNewAgent, 
    handleCreateAgent, 
    handleAgentSelect, 
    handleWorkflowSelect, 
    handleDeleteWorkflow,
    handleAddStartNode,
    handleAddEndNode,
    handleAddLoopNode,
    handleNodeContextMenu,
    handleDeleteNode,
    onNodesChange, 
    onEdgesChange, 
    onConnect
  ]);

  return (
    <>
      {!auth.isAuthenticated ? renderAuthForms() : renderApp()}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default App;
