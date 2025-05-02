import { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';

export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export interface NodeData {
  label: string;
  agentId: string;
}

export type Node = ReactFlowNode<NodeData>;
export type Edge = ReactFlowEdge;

export interface WorkflowData {
  id?: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}

export interface GptOutput {
  output_text: string;
  gpt_response: string;
}

export interface WorkflowExecutionResult {
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

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

export interface ContextMenuState {
  mouseX: number;
  mouseY: number;
  nodeId: string | null;
} 