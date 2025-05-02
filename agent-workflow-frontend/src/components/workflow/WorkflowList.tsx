import React, { useContext } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItemText,
  ListItemButton,
  ListItemSecondaryAction,
  Button,
  Divider
} from '@mui/material';
import { AppContext } from '../../contexts/AppContext';
import { WorkflowData } from '../../types';

interface WorkflowListProps {
  currentWorkflowId: string | null;
  onWorkflowSelect: (workflow: WorkflowData) => void;
}

const WorkflowList: React.FC<WorkflowListProps> = ({ currentWorkflowId, onWorkflowSelect }) => {
  const { workflows, deleteWorkflow } = useContext(AppContext);

  return (
    <Box sx={{ width: 300, border: '1px solid #ccc', p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Kaydedilen İş Akışları</Typography>
      <List>
        {workflows.map((workflow, index) => (
          <React.Fragment key={workflow.id || index}>
            <ListItemButton 
              onClick={() => onWorkflowSelect(workflow)}
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
                    if (workflow.id) {
                      deleteWorkflow(workflow.id);
                    }
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
  );
};

export default WorkflowList; 