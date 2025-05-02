import React, { useContext } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { AppContext } from '../../contexts/AppContext';

interface AgentListProps {
  onAgentSelect: (agentId: string, agentName: string) => void;
}

const AgentList: React.FC<AgentListProps> = ({ onAgentSelect }) => {
  const { agents } = useContext(AppContext);

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Ajanlar:
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {agents
          .filter(agent => agent.id !== 'START' && agent.id !== 'END' && agent.id !== 'LOOP')
          .map((agent) => (
            <Button
              key={agent.id}
              variant="outlined"
              onClick={() => onAgentSelect(agent.id, agent.name)}
            >
              {agent.name}
            </Button>
        ))}
      </Box>
    </Box>
  );
};

export default AgentList; 