# Agent Workflow System

A flexible platform for creating, managing, and executing AI agent workflows, allowing seamless collaboration between different types of agents.

## Features

- **Visual Workflow Builder:** Create complex agent workflows using an intuitive drag-and-drop interface powered by React Flow
- **Multiple Agent Types:** Integrate various agent types, including research agents, specialized agents, and system agents (START, END, LOOP)
- **GPT Integration:** Leverage OpenAI's GPT models to power intelligent agent responses
- **Custom Prompts:** Define custom prompts for each agent to control behavior and output
- **Workflow Execution:** Run workflows and observe the cumulative processing of information through the agent chain
- **Export Functionality:** Save execution results as Word documents for sharing and review
- **Real-time Updates:** See results from each agent in the execution chain and their outputs

## System Requirements

- Node.js 14+
- Python 3.8+
- FastAPI
- OpenAI API key

## Project Structure

The project consists of two main components:

### Frontend (`ui`)
- React-based UI with Material UI components
- ReactFlow for workflow visualization and editing
- Handles user interaction, workflow design, and result visualization

### Backend (`agents`)
- FastAPI server providing REST endpoints
- Agent simulation and management
- Workflow execution and state tracking
- OpenAI API integration for intelligent agent processing

## Installation

### Backend Setup
1. Navigate to the backend directory:
```bash
cd agents
```

2. Install dependencies:
```bash
poetry install
```

3. Create a `.env` file with your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

4. Start the backend server:
```bash
poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8001
```

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Usage

1. Access the application at http://localhost:3000
2. Create a new workflow or select an existing one
3. Add agents by selecting from the agent library or create custom agents
4. Connect agents to define the workflow process
5. Save your workflow
6. Execute the workflow with custom input text
7. View the results and export as needed

## Special Agents

- **START:** Represents the beginning of a workflow, receiving the initial input
- **END:** Represents the end of a workflow, collecting the final output
- **LOOP:** Reprocesses output using the previous agent's prompt for deeper analysis

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues to improve the system.

## License

MIT 