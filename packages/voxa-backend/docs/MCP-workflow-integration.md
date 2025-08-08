# MCP Tools in Workflow Integration Guide

## Overview

This guide shows how to configure MCP (Model Context Protocol) tools within your orchestration workflow nodes. The system automatically detects and initializes tools from your workflow configuration.

## Workflow Node Configuration

### Example Node with Calendly Tool

```json
{
  "id": "calendly-node-1",
  "type": "agent",
  "position": { "x": 100, "y": 200 },
  "data": {
    "label": "Calendar Assistant",
    "settings": {
      "type": "assistant",
      "name": "Calendar Assistant",
      "description": "Handles calendar scheduling and booking",
      "tools": [
        {
          "name": "calendly-scheduler",
          "type": "calendly",
          "description": "Calendly booking and scheduling tool",
          "serverUrl": "http://localhost:8000",
          "parameters": {
            "default_duration": 30,
            "timezone": "UTC"
          }
        }
      ],
      "intents": [
        {
          "name": "schedule_meeting",
          "description": "Schedule a new meeting",
          "required_entities": ["date", "time", "duration"]
        },
        {
          "name": "check_availability",
          "description": "Check calendar availability"
        }
      ]
    }
  }
}
```

### Example Node with Google Calendar Tool

```json
{
  "id": "google-cal-node-1",
  "type": "agent",
  "position": { "x": 300, "y": 200 },
  "data": {
    "label": "Google Calendar Manager",
    "settings": {
      "type": "calendar",
      "name": "Google Calendar Manager",
      "tools": [
        {
          "name": "google-calendar",
          "type": "google-calendar",
          "description": "Google Calendar integration",
          "serverUrl": "http://localhost:8001",
          "parameters": {
            "default_calendar": "primary"
          }
        }
      ]
    }
  }
}
```

### Example Node with Multiple Tools

```json
{
  "id": "multi-tool-node",
  "type": "agent",
  "position": { "x": 500, "y": 200 },
  "data": {
    "label": "Multi-Calendar Assistant",
    "settings": {
      "type": "assistant",
      "tools": [
        {
          "name": "calendly-tool",
          "type": "calendly",
          "serverUrl": "http://localhost:8000"
        },
        {
          "name": "google-tool", 
          "type": "google-calendar",
          "serverUrl": "http://localhost:8001"
        },
        {
          "name": "outlook-tool",
          "type": "outlook-calendar", 
          "serverUrl": "http://localhost:8002"
        }
      ]
    }
  }
}
```

## Tool Configuration Options

### Calendly Tool
```json
{
  "name": "calendly-scheduler",
  "type": "calendly",
  "description": "Calendly booking system",
  "serverUrl": "http://localhost:8000",
  "parameters": {
    "default_duration": 30,
    "timezone": "UTC",
    "event_type": "default"
  }
}
```

### Google Calendar Tool
```json
{
  "name": "google-calendar",
  "type": "google-calendar", 
  "description": "Google Calendar management",
  "serverUrl": "http://localhost:8001",
  "parameters": {
    "default_calendar": "primary",
    "timezone": "America/New_York"
  }
}
```

### Outlook Calendar Tool
```json
{
  "name": "outlook-calendar",
  "type": "outlook-calendar",
  "description": "Microsoft Outlook Calendar",
  "serverUrl": "http://localhost:8002",
  "parameters": {
    "default_calendar": "primary",
    "enable_teams_integration": true
  }
}
```

## How It Works

### 1. Workflow Loading
When the OrchestrationManager initializes with an agentId, it:
```javascript
// Load agent from database and initialize workflow
await orchestrationManager.loadAgentWorkflow(agentId);
```

Or you can initialize directly with a workflow:
```javascript
// Initialize workflow directly
orchestrationManager.initializeWorkflow(orchestrationFlow);
```

### 2. Node-to-Agent Conversion
Each workflow node becomes a BaseAgent instance:
- Only nodes with `type: 'agent'` or similar are converted
- Each agent gets its own isolated tool manager
- Tools are assigned ONLY to agents whose nodes define them

### 3. Tool Isolation
Each agent only has access to tools defined in its specific node:
```javascript
// Agent from node with tools gets those tools
const calendarAgent = workflowAgents.get('calendar-node-id'); 
console.log(calendarAgent.hasAvailableTools()); // true

// Agent from node without tools has no tools  
const generalAgent = workflowAgents.get('general-node-id');
console.log(generalAgent.hasAvailableTools()); // false
```

### 4. Agent Tool Access
Only agents with tools defined can use them:
```javascript
class MyAgent extends BaseAgent {
  async process(input, conversationState) {
    // Check if tools are available for this input
    const shouldUseTools = await this.shouldUseTool(input, 'schedule_meeting');
    
    if (shouldUseTools) {
      // Execute the appropriate tool
      const result = await this.selectAndExecuteTool('schedule_meeting', input);
      return {
        canProcess: true,
        confidence: 0.9,
        text: `Meeting scheduled: ${result}`,
        toolResult: result
      };
    }
    
    // Continue with normal processing...
  }
}
```

## Integration with OrchestrationManager

The OrchestrationManager now works with Agent model's orchestrationFlow:

```javascript
// Option 1: Load from Agent model (recommended)
const config = {
  conversationId: 'conv-123',
  agentId: 'agent-id-from-database' // Agent model ID
};

const orchestrationManager = new OrchestrationManager(config);
await orchestrationManager.initialize(); // Automatically loads agent's orchestrationFlow

// Option 2: Initialize workflow directly  
const orchestrationManager = new OrchestrationManager(config);
await orchestrationManager.initialize();
orchestrationManager.initializeWorkflow(customOrchestrationFlow);
```

### Accessing Workflow Agents

```javascript
// Get all workflow-based agents
const workflowAgents = orchestrationManager.getWorkflowAgents();

// Get specific workflow agent by node ID
const calendarAgent = orchestrationManager.getWorkflowAgent('calendar-node-id');

// Check which agents have tools
workflowAgents.forEach(agent => {
  console.log(`${agent.name}: ${agent.hasAvailableTools() ? 'HAS TOOLS' : 'NO TOOLS'}`);
});
```

## Usage Examples

### User Says: "Schedule a meeting for tomorrow at 2 PM"

1. **Intent Classification**: IntentClassifierAgent identifies `schedule_meeting` intent
2. **Tool Detection**: BaseAgent detects calendar tools are available
3. **Tool Selection**: System selects best available calendar tool (Calendly, Google, etc.)
4. **Tool Execution**: Calls appropriate MCP server operation
5. **Response Generation**: Agent responds with booking confirmation

### User Says: "What's on my calendar today?"

1. **Intent**: `list_events` 
2. **Tool Selection**: Chooses calendar tool that can list events
3. **Execution**: Calls `list_events` operation
4. **Response**: Returns formatted calendar information

## Environment Variables

Ensure these are set in your `.env` file:

```bash
# MCP Server URLs
MCP_CALENDLY_URL=http://localhost:8000
MCP_GOOGLE_CALENDAR_URL=http://localhost:8001  
MCP_OUTLOOK_CALENDAR_URL=http://localhost:8002

# API Keys (used by MCP servers)
CALENDLY_API_KEY=your_calendly_api_key
GOOGLE_CALENDAR_API_KEY=your_google_api_key
GOOGLE_CALENDAR_ACCESS_TOKEN=your_oauth_token
OUTLOOK_ACCESS_TOKEN=your_graph_token
```

## Error Handling

The system includes comprehensive error handling:

```javascript
// Tool health is monitored automatically
const toolsHealth = orchestrationManager.getToolManager().getToolsHealth();

// Graceful degradation when tools are unavailable
if (!await agent.hasAvailableTools()) {
  return {
    canProcess: true,
    confidence: 0.6,
    text: "Calendar services are currently unavailable. Please try again later."
  };
}
```

## Debugging

### Check Tool Status
```javascript
const toolManager = orchestrationManager.getToolManager();
console.log('Available tools:', toolManager.getAllTools());
console.log('Tools health:', toolManager.getToolsHealth());
console.log('Calendar tools:', toolManager.getToolsByType('calendly'));
```

### Monitor Tool Usage
Tool usage is automatically logged:
```javascript
// Logs include:
// - tool_usage: When a tool is selected
// - tool_execution_success: When tool completes successfully  
// - tool_execution_error: When tool execution fails
```

## Integration Benefits

✅ **Automatic Discovery**: Tools are automatically discovered from workflow configuration  
✅ **Health Monitoring**: Built-in health checks for all MCP servers  
✅ **Graceful Degradation**: System continues working when tools are unavailable  
✅ **Logging & Monitoring**: Comprehensive logging of tool usage and performance  
✅ **Smart Selection**: Automatically selects best available tool for each task  
✅ **Error Recovery**: Robust error handling with fallback mechanisms  

This approach allows you to configure calendar tools (and other MCP tools) directly in your workflow editor, and the system automatically handles the integration without requiring code changes. 