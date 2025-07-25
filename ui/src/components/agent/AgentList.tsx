import React, { useContext, useState, useEffect } from 'react'
import { Box, Button, Typography, CircularProgress } from '@mui/material'
import { AppContext } from '../../contexts/AppContext'

interface AgentListProps {
  onAgentSelect: (agentId: string, agentName: string) => void
}

const AgentList: React.FC<AgentListProps> = ({ onAgentSelect }) => {
  const { agents, loadAgents } = useContext(AppContext)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Ajanları yenileme fonksiyonu
  const handleRefreshAgents = async () => {
    setIsRefreshing(true)
    try {
      await loadAgents()
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Ajanlar yenilenirken hata oluştu:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // 30 saniyede bir otomatik yenileme (AI Agent App'den silinmiş ajanları tespit etmek için)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await loadAgents()
        setLastRefresh(new Date())
      } catch (error) {
        console.error('Otomatik ajan yenileme hatası:', error)
      }
    }, 30000) // 30 saniye

    return () => clearInterval(interval)
  }, [loadAgents])

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Box>
          <Typography variant="subtitle1">
            Ajanlar: (
            {
              agents.filter(
                (agent) =>
                  agent.id !== 'START' &&
                  agent.id !== 'END' &&
                  agent.id !== 'LOOP'
              ).length
            }
            )
          </Typography>
          {lastRefresh && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontSize: '0.7em' }}
            >
              Son güncelleme: {lastRefresh.toLocaleTimeString('tr-TR')}
            </Typography>
          )}
        </Box>
        <Button
          variant="text"
          size="small"
          onClick={handleRefreshAgents}
          disabled={isRefreshing}
          sx={{ minWidth: 'auto', p: 1 }}
        >
          {isRefreshing ? <CircularProgress size={16} /> : '🔄 Yenile'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {agents
          .filter(
            (agent) =>
              agent.id !== 'START' && agent.id !== 'END' && agent.id !== 'LOOP'
          )
          .map((agent) => (
            <Button
              key={agent.id}
              variant="outlined"
              onClick={() => onAgentSelect(agent.id, agent.name)}
              sx={{
                // External agentleri ayırt etmek için farklı stil
                ...(agent.source === 'ai-agent-app-main' && {
                  borderColor: '#2196f3',
                  color: '#2196f3',
                  '&:hover': {
                    borderColor: '#1976d2',
                    backgroundColor: 'rgba(33, 150, 243, 0.04)',
                  },
                }),
              }}
            >
              {agent.name}
              {agent.source === 'ai-agent-app-main' && (
                <span
                  style={{ marginLeft: '4px', fontSize: '0.8em', opacity: 0.7 }}
                >
                  (AI)
                </span>
              )}
            </Button>
          ))}
      </Box>
    </Box>
  )
}

export default AgentList
