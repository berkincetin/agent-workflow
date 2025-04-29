# Agent Workflow Frontend

A React-based frontend for the Agent Workflow System. This application provides a visual interface for creating, editing, and executing agent workflows.

## Features

- **Visual Workflow Editor:** Interactive diagram editor powered by ReactFlow
- **Agent Management:** Create and manage custom agents with specialized prompts
- **Execution Dashboard:** Run workflows and view detailed results from each agent
- **Word Export:** Export execution results as Word documents
- **Right-Click Context Menu:** Easily delete nodes with the right-click menu

## Technologies Used

- **React:** Frontend framework
- **TypeScript:** Type-safe JavaScript
- **Material UI:** Component library for consistent design
- **ReactFlow:** Workflow diagram creation and editing
- **Axios:** API communication
- **docx:** Document generation for Word exports
- **file-saver:** Browser file downloads

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

## Usage

1. Start the backend server first (see main README)
2. Start the frontend development server
3. Access the application at http://localhost:3000
4. Log in (demo login accepts any email/password)
5. Create or select a workflow
6. Add agents and connect them to define the workflow process
7. Save your workflow
8. Execute with the "Run" button and provide input text
9. View results and export as needed

## Component Structure

- **Authentication:** Login/register functionality
- **Workflow Editor:** Diagram editor with ReactFlow
- **Agent Management:** Create and configure agents
- **Execution Interface:** Run workflows and view results

## Dependencies

- React 18+
- Material UI 5+
- ReactFlow 11+
- Node.js 14+

## Connecting with Backend

The frontend communicates with the backend API at `http://localhost:8001`. Make sure the backend server is running before using the application.

## License

MIT
