import React, { useContext } from 'react';
import { Box, Button, TextField, Typography, Tooltip } from '@mui/material';
import { AppContext } from '../../contexts/AppContext';

interface WorkflowControlsProps {
  workflowName: string;
  setWorkflowName: (name: string) => void;
  onSave: () => void;
  onExecute: () => void;
  onAddAgentDialogOpen: () => void;
  onAddStartNode: () => void;
  onAddEndNode: () => void;
  onAddLoopNode: () => void;
}

const WorkflowControls: React.FC<WorkflowControlsProps> = ({
  workflowName,
  setWorkflowName,
  onSave,
  onExecute,
  onAddAgentDialogOpen,
  onAddStartNode,
  onAddEndNode,
  onAddLoopNode
}) => {
  const { auth } = useContext(AppContext);

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="İş Akışı Adı"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          sx={{ mr: 2 }}
        />
        <Button variant="contained" onClick={onSave}>
          Kaydet
        </Button>
        <Button 
          variant="contained" 
          color="secondary"
          onClick={onExecute}
        >
          Yürüt
        </Button>
        <Button 
          variant="outlined" 
          color="primary"
          onClick={onAddAgentDialogOpen}
        >
          Yeni Agent Oluştur
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Önemli: Her iş akışı bir START düğümü ile başlamalı ve bir END düğümü ile bitmelidir.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
          <Tooltip title="İş akışı her zaman START düğümü ile başlamalıdır">
            <Button 
              variant="contained" 
              color="success" 
              onClick={onAddStartNode}
              startIcon={<span>▶</span>}
            >
              START Ekle
            </Button>
          </Tooltip>
          
          <Tooltip title="İş akışı her zaman END düğümü ile bitmelidir">
            <Button 
              variant="contained" 
              color="error" 
              onClick={onAddEndNode}
              startIcon={<span>⬛</span>}
            >
              END Ekle
            </Button>
          </Tooltip>
          
          <Tooltip title="LOOP düğümü, önceki bir ajanın işlemini tekrarlamak için kullanılır">
            <Button 
              variant="contained" 
              sx={{ 
                backgroundColor: '#2196f3', 
                '&:hover': { backgroundColor: '#1976d2' } 
              }}
              onClick={onAddLoopNode}
              startIcon={<span>↻</span>}
            >
              LOOP Ekle
            </Button>
          </Tooltip>
        </Box>
      </Box>
    </>
  );
};

export default WorkflowControls; 