import React, { useState, useContext } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField,
  Box
} from '@mui/material';
import { Agent } from '../../types';
import { AppContext } from '../../contexts/AppContext';

interface AgentDialogProps {
  open: boolean;
  onClose: () => void;
}

const AgentDialog: React.FC<AgentDialogProps> = ({ open, onClose }) => {
  const { createAgent } = useContext(AppContext);
  const [newAgent, setNewAgent] = useState<Partial<Agent>>({
    name: '',
    description: '',
    prompt: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewAgent(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateAgent = async () => {
    if (!newAgent.name || !newAgent.prompt) {
      return; // Form doğrulama
    }

    await createAgent(newAgent);
    setNewAgent({
      name: '',
      description: '',
      prompt: ''
    });
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
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
              name="name"
              value={newAgent.name}
              onChange={handleChange}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Açıklama"
              name="description"
              value={newAgent.description}
              onChange={handleChange}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Prompt"
              name="prompt"
              value={newAgent.prompt}
              onChange={handleChange}
              helperText="Agent'ın davranışını belirleyen prompt'u girin"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleCreateAgent} variant="contained">
          Oluştur
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgentDialog; 