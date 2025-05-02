import React from 'react';
import ReactFlow, {
  Controls,
  Background,
  Connection,
  NodeMouseHandler
} from 'reactflow';
import { Box, Menu, MenuItem } from '@mui/material';
import { ContextMenuState, Node, Edge } from '../../types';

interface WorkflowGraphProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  contextMenu: ContextMenuState | null;
  onContextMenu: NodeMouseHandler;
  onCloseContextMenu: () => void;
  onDeleteNode: () => void;
}

const WorkflowGraph: React.FC<WorkflowGraphProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  contextMenu,
  onContextMenu,
  onCloseContextMenu,
  onDeleteNode
}) => {
  return (
    <Box sx={{ flexGrow: 1, border: '1px solid #ccc', height: 'calc(100vh - 300px)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeContextMenu={onContextMenu}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
      
      {/* Düğüm sağ tıklama menüsü */}
      <Menu
        open={contextMenu !== null}
        onClose={onCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={onDeleteNode}>Düğümü Sil</MenuItem>
      </Menu>
    </Box>
  );
};

export default WorkflowGraph; 