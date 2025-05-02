import React, { useState, useCallback, useContext } from 'react';
import { Box } from '@mui/material';
import { useNodesState, useEdgesState, addEdge, Connection, NodeMouseHandler } from 'reactflow';
import 'reactflow/dist/style.css';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

import WorkflowControls from './WorkflowControls';
import WorkflowGraph from './WorkflowGraph';
import WorkflowList from './WorkflowList';
import AgentList from '../agent/AgentList';
import AgentDialog from '../agent/AgentDialog';
import ExecuteDialog from '../execution/ExecuteDialog';
import ResultsDialog from '../execution/ResultsDialog';

import { AppContext } from '../../contexts/AppContext';
import { WorkflowData, ContextMenuState, WorkflowExecutionResult, Node, Edge, NodeData } from '../../types';

const WorkflowEditor: React.FC = () => {
  const { saveWorkflow, executeWorkflow, showNotification } = useContext(AppContext);
  
  // İş akışı state'i
  const [workflowName, setWorkflowName] = useState<string>('');
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Diyalog state'leri
  const [openAgentDialog, setOpenAgentDialog] = useState(false);
  const [openExecuteDialog, setOpenExecuteDialog] = useState(false);
  const [openResultsDialog, setOpenResultsDialog] = useState(false);
  
  // Yürütme state'leri
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionText, setExecutionText] = useState('');
  const [executionResults, setExecutionResults] = useState<WorkflowExecutionResult | null>(null);
  
  // Sağ tıklama menüsü state'i
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // START düğümü ekleme
  const handleAddStartNode = useCallback(() => {
    // Eğer zaten bir START düğümü varsa ekleme
    const startNodeExists = nodes.some((node) => node.data.agentId === 'START');
    
    if (startNodeExists) {
      showNotification('Zaten bir START düğümü mevcut', 'error');
      return;
    }
    
    const newNode = {
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
    const endNodeExists = nodes.some((node) => node.data.agentId === 'END');
    
    if (endNodeExists) {
      showNotification('Zaten bir END düğümü mevcut', 'error');
      return;
    }
    
    const newNode = {
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
    const newNode = {
      id: `LOOP-${Date.now()}`,
      type: 'default',
      position: { x: 350, y: 100 },
      data: { 
        label: 'LOOP', 
        agentId: 'LOOP' 
      },
      style: { 
        background: '#2196f3',
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
  const handleAgentSelect = useCallback((agentId: string, agentName: string) => {
    const newNode = {
      id: `${agentId}-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: { label: agentName, agentId: agentId }
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  // Bağlantı ekleme
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // İş akışı kaydetme
  const handleSave = useCallback(async () => {
    if (!workflowName) {
      showNotification('Lütfen iş akışı adını girin', 'error');
      return;
    }

    if (nodes.length === 0) {
      showNotification('Lütfen en az bir ajan ekleyin', 'error');
      return;
    }

    // START ve END düğümlerinin varlığını kontrol et
    const hasStartNode = nodes.some(node => node.data.agentId === 'START');
    const hasEndNode = nodes.some(node => node.data.agentId === 'END');
    
    if (!hasStartNode) {
      showNotification('İş akışı START düğümü içermelidir', 'error');
    }
    
    if (!hasEndNode) {
      showNotification('İş akışı END düğümü içermelidir', 'error');
    }

    const workflowData: WorkflowData = {
      id: currentWorkflowId || undefined,
      name: workflowName,
      nodes: nodes as unknown as Node[],
      edges: edges as unknown as Edge[]
    };

    try {
      const result = await saveWorkflow(workflowData);
      
      // Güncellenmiş ID'yi set et
      if (!currentWorkflowId && result && result.id) {
        setCurrentWorkflowId(result.id);
      }
      
      showNotification('İş akışı başarıyla kaydedildi', 'success');
    } catch (error) {
      console.error('İş akışı kaydedilirken hata oluştu:', error);
      showNotification('İş akışı kaydedilemedi', 'error');
    }
  }, [workflowName, nodes, edges, currentWorkflowId, saveWorkflow, showNotification]);

  // İş akışı seçme
  const handleWorkflowSelect = useCallback((workflow: WorkflowData) => {
    setWorkflowName(workflow.name);
    setCurrentWorkflowId(workflow.id || null);
    setNodes(workflow.nodes as any);
    setEdges(workflow.edges as any);
    showNotification(`${workflow.name} iş akışı yüklendi`, 'success');
  }, [setWorkflowName, setCurrentWorkflowId, setNodes, setEdges, showNotification]);

  // Düğüm sağ tıklama
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

  // İş akışı yürütme diyaloğunu açma
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

  // İş akışı yürütme
  const handleExecuteWorkflow = useCallback(async () => {
    if (!currentWorkflowId) {
      showNotification('Lütfen önce iş akışını kaydedin', 'error');
      return;
    }

    if (nodes.length === 0) {
      showNotification('İş akışında çalıştırılacak ajan yok', 'error');
      return;
    }

    // START ve END düğümlerinin varlığını kontrol et
    const hasStartNode = nodes.some(node => node.data.agentId === 'START');
    const hasEndNode = nodes.some(node => node.data.agentId === 'END');
    
    if (!hasStartNode) {
      showNotification('İş akışı START düğümü içermelidir', 'error');
      return;
    }
    
    if (!hasEndNode) {
      showNotification('İş akışı END düğümü içermelidir', 'error');
      return;
    }

    try {
      setIsExecuting(true);
      
      const results = await executeWorkflow(currentWorkflowId, executionText);
      
      setExecutionResults(results);
      setOpenResultsDialog(true);
      setOpenExecuteDialog(false);
    } catch (error) {
      console.error('İş akışı yürütülürken hata oluştu:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [currentWorkflowId, nodes, executionText, executeWorkflow, showNotification]);

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
                  ? (result.output as any).output_text 
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

  return (
    <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
        <Box sx={{ flex: 1 }}>
          {/* İş Akışı Kontrolleri */}
          <WorkflowControls
            workflowName={workflowName}
            setWorkflowName={setWorkflowName}
            onSave={handleSave}
            onExecute={handleOpenExecuteDialog}
            onAddAgentDialogOpen={() => setOpenAgentDialog(true)}
            onAddStartNode={handleAddStartNode}
            onAddEndNode={handleAddEndNode}
            onAddLoopNode={handleAddLoopNode}
          />
          
          {/* Ajanlar Listesi */}
          <AgentList onAgentSelect={handleAgentSelect} />
          
          {/* İş Akışı Grafiği */}
          <WorkflowGraph
            nodes={nodes as any}
            edges={edges}
            onNodesChange={onNodesChange as any}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            contextMenu={contextMenu}
            onContextMenu={handleNodeContextMenu}
            onCloseContextMenu={handleCloseContextMenu}
            onDeleteNode={handleDeleteNode}
          />
        </Box>
        
        {/* İş Akışları Listesi */}
        <WorkflowList
          currentWorkflowId={currentWorkflowId}
          onWorkflowSelect={handleWorkflowSelect}
        />
      </Box>

      {/* Diyaloglar */}
      <AgentDialog 
        open={openAgentDialog} 
        onClose={() => setOpenAgentDialog(false)} 
      />
      
      <ExecuteDialog
        open={openExecuteDialog}
        onClose={() => setOpenExecuteDialog(false)}
        executionText={executionText}
        setExecutionText={setExecutionText}
        onExecute={handleExecuteWorkflow}
        isExecuting={isExecuting}
      />
      
      <ResultsDialog
        open={openResultsDialog}
        onClose={() => setOpenResultsDialog(false)}
        executionResults={executionResults}
        executionText={executionText}
        onSaveAsWord={handleSaveAsWord}
      />
    </Box>
  );
};

export default WorkflowEditor; 