import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box, 
  Typography,
  Divider
} from '@mui/material';
import { WorkflowExecutionResult, GptOutput } from '../../types';

interface ResultsDialogProps {
  open: boolean;
  onClose: () => void;
  executionResults: WorkflowExecutionResult | null;
  executionText: string;
  onSaveAsWord: () => void;
}

const ResultsDialog: React.FC<ResultsDialogProps> = ({
  open,
  onClose,
  executionResults,
  executionText,
  onSaveAsWord
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          onClick={onSaveAsWord}
          disabled={!executionResults}
        >
          Word Olarak Kaydet
        </Button>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResultsDialog; 