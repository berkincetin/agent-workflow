import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Box, 
  Typography,
  CircularProgress
} from '@mui/material';

interface ExecuteDialogProps {
  open: boolean;
  onClose: () => void;
  executionText: string;
  setExecutionText: (text: string) => void;
  onExecute: () => void;
  isExecuting: boolean;
}

const ExecuteDialog: React.FC<ExecuteDialogProps> = ({
  open,
  onClose,
  executionText,
  setExecutionText,
  onExecute,
  isExecuting
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
        <Button onClick={onClose}>İptal</Button>
        <Button 
          onClick={onExecute} 
          variant="contained" 
          color="primary"
          disabled={isExecuting}
          startIcon={isExecuting ? <CircularProgress size={20} /> : null}
        >
          {isExecuting ? 'Yürütülüyor...' : 'Yürüt'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExecuteDialog; 