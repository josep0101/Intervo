# Tool Model Integration with MCP Calendar System

## Overview

The Tool model provides secure credential management for MCP (Model Context Protocol) calendar integrations. This system allows you to store API keys and configuration separately from your workflow definitions while maintaining security and proper isolation.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Tool Model    │────│  OrchestrationMgr│────│  MCP Servers    │
│  (Database)     │    │   + ToolManager  │    │ (Calendly, etc) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │
         │                        │
    ┌────▼────┐              ┌────▼────┐
    │Credentials│              │ BaseAgent│
    │& Config   │              │ + Tools  │
    └─────────┘              └─────────┘
```

## Tool Model Schema

### Core Fields

```javascript
{
  // Identification
  name: String,                    // Human-readable name
  type: String,                    // 'calendly', 'google-calendar', 'outlook-calendar'
  description: String,             // Tool description
  toolId: String,                  // Unique identifier (UUID)
  
  // Associations
  user: ObjectId,                  // User who owns this tool
  workspace: ObjectId,             // Workspace association
  agent: ObjectId,                 // Agent that uses this tool
  
  // Configuration
  serverUrl: String,               // MCP server URL
  protocol: String,                // 'mcp', 'rest', 'graphql'
  
  // Credentials (encrypted, not returned by default)
  credentials: {
    apiKey: String,
    accessToken: String,
    refreshToken: String,
    clientId: String,
    clientSecret: String,
    additionalCredentials: Map
  },
  
  // Service-specific configuration
  configuration: {
    userUri: String,               // Calendly user URI
    calendarId: String,            // Google Calendar ID
    tenantId: String,              // Outlook tenant ID
    parameters: Map                // Additional parameters
  },
  
  // Status & Health
  isActive: Boolean,
  isHealthy: Boolean,
  lastHealthCheck: Date,
  
  // Usage Tracking
  usageStats: {
    totalCalls: Number,
    lastUsed: Date,
    errorCount: Number,
    lastError: { message: String, timestamp: Date }
  }
}
```

## Usage Guide

### 1. Creating Tool Records

```javascript
const Tool = require('./models/Tool');

// Create a Calendly tool
const calendlyTool = new Tool({
  name: 'Calendly Scheduler',
  type: 'calendly',
  description: 'Calendly booking and scheduling integration',
  user: userId,
  workspace: workspaceId,
  agent: agentId,
  serverUrl: 'http://localhost:8000',
  credentials: {
    apiKey: process.env.CALENDLY_API_KEY
  },
  configuration: {
    userUri: 'https://calendly.com/your-username',
    defaultEventType: '30-minute-meeting'
  }
});

await calendlyTool.save();
console.log('Tool ID:', calendlyTool.toolId);
```

### 2. Agent orchestrationFlow Configuration

Update your Agent model's `orchestrationFlow` to reference tools by `toolId`:

```javascript
const orchestrationFlow = {
  nodes: [
    {
      id: 'calendar-agent-node',
      type: 'agent',
      position: { x: 100, y: 100 },
      data: {
        label: 'Calendar Assistant',
        settings: {
          tools: [
            {
              toolId: 'uuid-of-calendly-tool', // Reference to Tool model
              name: 'calendly-scheduler',
              type: 'calendly',
              serverUrl: 'http://localhost:8000'
            }
          ]
        }
      }
    }
  ],
  edges: []
};

agent.orchestrationFlow = orchestrationFlow;
await agent.save();
```

### 3. MCP Request Flow

When a BaseAgent makes an MCP call, credentials are automatically injected:

```javascript
// Your application code (BaseAgent)
const result = await this.executeTool('list_events', {
  start_time: '2024-01-15T00:00:00Z',
  end_time: '2024-01-15T23:59:59Z'
});

// Internally, this becomes an HTTP request like:
const response = await fetch('http://localhost:8000/tools/list_events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${tool.credentials.apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'list_events',
    arguments: {
      start_time: '2024-01-15T00:00:00Z',
      end_time: '2024-01-15T23:59:59Z',
      user_uri: tool.configuration.userUri // Auto-injected
    }
  })
});
```

## Security Features

### 1. Credential Protection

```javascript
// Credentials are NOT returned by default
const tool = await Tool.findById(toolId);
console.log(tool.credentials); // undefined

// Must explicitly request credentials
const toolWithCredentials = await Tool.findById(toolId)
  .select('+credentials.apiKey +credentials.accessToken');
console.log(toolWithCredentials.credentials.apiKey); // Available
```

### 2. Virtual Primary Credential

```javascript
const tool = await Tool.findByToolId(toolId);
const primaryCred = tool.primaryCredential; // Returns appropriate credential based on type
```

### 3. Usage Tracking

```javascript
// Automatically tracked by MCPTool
await tool.updateUsageStats(true); // Success
await tool.updateUsageStats(false, error); // Error
```

## Tool Model API

### Static Methods

```javascript
// Find by toolId
const tool = await Tool.findByToolId('uuid-here');

// Find by agent (with/without credentials)
const tools = await Tool.findByAgent(agentId, true);

// Find by user and workspace
const tools = await Tool.findByUserAndWorkspace(userId, workspaceId);

// Find by type
const calendlyTools = await Tool.findByType('calendly', userId, workspaceId);
```

### Instance Methods

```javascript
// Update usage statistics
await tool.updateUsageStats(success, error);

// Update health status
await tool.updateHealthStatus(isHealthy);

// Get primary credential (virtual)
const credential = tool.primaryCredential;
```

## Service-Specific Configuration

### Calendly Tools

```javascript
{
  type: 'calendly',
  credentials: {
    apiKey: 'your_calendly_api_key'
  },
  configuration: {
    userUri: 'https://calendly.com/your-username',
    defaultEventType: '30-minute-meeting'
  }
}
```

### Google Calendar Tools

```javascript
{
  type: 'google-calendar',
  credentials: {
    accessToken: 'your_google_access_token',
    refreshToken: 'your_google_refresh_token',
    clientId: 'your_google_client_id',
    clientSecret: 'your_google_client_secret'
  },
  configuration: {
    calendarId: 'primary',
    timezone: 'America/New_York'
  }
}
```

### Outlook Calendar Tools

```javascript
{
  type: 'outlook-calendar',
  credentials: {
    accessToken: 'your_outlook_access_token',
    refreshToken: 'your_outlook_refresh_token'
  },
  configuration: {
    tenantId: 'your_tenant_id'
  }
}
```

## Integration with OrchestrationManager

The OrchestrationManager automatically loads tool credentials when initializing:

```javascript
const orchestrator = new OrchestrationManager({
  conversationId: 'conv-123',
  agentId: 'agent-456' // Tools will be loaded for this agent
});

await orchestrator.initialize(); // Loads tools from database
```

## Environment Variables

While credentials are stored in the database, you may still need these environment variables for MCP server configuration:

```bash
# MCP Server URLs
MCP_CALENDLY_URL=http://localhost:8000
MCP_GOOGLE_CALENDAR_URL=http://localhost:8001
MCP_OUTLOOK_CALENDAR_URL=http://localhost:8002
```

## Database Indexes

The Tool model includes optimized indexes for performance:

```javascript
// Compound indexes
{ user: 1, workspace: 1, type: 1 }
{ agent: 1, isActive: 1 }
{ toolId: 1, isActive: 1 }

// Single field indexes
{ type: 1 }
{ createdAt: 1 }
```

## Error Handling

### Tool Not Found

```javascript
const tool = await Tool.findByToolId('invalid-id');
if (!tool) {
  throw new Error('Tool not found or inactive');
}
```

### Missing Credentials

```javascript
const tool = await Tool.findByToolId(toolId);
if (!tool.primaryCredential) {
  throw new Error('No credentials configured for tool');
}
```

### Health Check Failures

```javascript
// Tools automatically track health
if (!tool.isHealthy) {
  console.warn(`Tool ${tool.name} is unhealthy`);
}
```

## Migration Guide

### From Environment Variables to Tool Model

1. **Create Tool records** for existing configurations
2. **Update orchestrationFlow** to reference toolId instead of hardcoded credentials
3. **Remove credentials** from environment variables (keep server URLs)
4. **Test** that credentials are properly loaded and used

### Example Migration Script

```javascript
async function migrateToToolModel() {
  // Create tools from environment variables
  const calendlyTool = new Tool({
    name: 'Calendly Integration',
    type: 'calendly',
    user: userId,
    workspace: workspaceId,
    agent: agentId,
    serverUrl: process.env.MCP_CALENDLY_URL,
    credentials: {
      apiKey: process.env.CALENDLY_API_KEY
    }
  });
  
  await calendlyTool.save();
  
  // Update agent orchestrationFlow
  const agent = await Agent.findById(agentId);
  agent.orchestrationFlow.nodes.forEach(node => {
    if (node.data?.settings?.tools) {
      node.data.settings.tools.forEach(tool => {
        if (tool.type === 'calendly') {
          tool.toolId = calendlyTool.toolId;
        }
      });
    }
  });
  
  await agent.save();
  console.log('Migration complete');
}
```

## Testing

### Unit Tests

```javascript
describe('Tool Model', () => {
  it('should create tool with credentials', async () => {
    const tool = new Tool({
      name: 'Test Tool',
      type: 'calendly',
      user: userId,
      workspace: workspaceId,
      agent: agentId,
      serverUrl: 'http://localhost:8000',
      credentials: { apiKey: 'test-key' }
    });
    
    await tool.save();
    expect(tool.toolId).toBeDefined();
    expect(tool.primaryCredential).toBe('test-key');
  });
});
```

### Integration Tests

```javascript
describe('MCP Integration', () => {
  it('should inject credentials in MCP calls', async () => {
    const tool = await Tool.findByToolId(toolId);
    const mcpTool = MCPTool.createTool({
      ...toolConfig,
      credentials: tool.credentials
    });
    
    // Mock MCP server
    nock('http://localhost:8000')
      .post('/tools/list_events')
      .matchHeader('Authorization', `Bearer ${tool.credentials.apiKey}`)
      .reply(200, { events: [] });
    
    const result = await mcpTool.execute('list_events', {});
    expect(result.events).toBeDefined();
  });
});
```

## Best Practices

1. **Always use toolId references** in orchestrationFlow, never hardcode credentials
2. **Rotate credentials regularly** and update Tool records
3. **Monitor usage statistics** to detect unusual activity
4. **Use health checks** to ensure MCP servers are available
5. **Implement proper error handling** for missing tools/credentials
6. **Use environment variables** only for server URLs, not credentials
7. **Test credential injection** in development environments

## Troubleshooting

### Common Issues

1. **Tool not found**: Check that toolId exists and isActive is true
2. **No credentials**: Ensure credentials are saved and query includes them
3. **Wrong credential type**: Verify tool type matches expected credential format
4. **Health check failures**: Check MCP server availability and configuration

### Debug Logging

```javascript
// Enable debug logging in MCPTool
console.log(`🔧 MCP CALL: ${this.type} -> ${this.serverUrl}/tools/${operation}`);
console.log(`🔑 Headers:`, { ...headers, Authorization: '[REDACTED]' });
console.log(`📤 Body:`, requestBody);
```

This integration provides a secure, scalable way to manage MCP calendar credentials while maintaining the flexibility of your workflow-based architecture. 