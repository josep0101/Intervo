# Tool Creation Flow Documentation

## Overview

When an agent's `orchestrationFlow` is updated with tools that contain credentials, the system automatically creates `Tool` records in the database and replaces the tool configurations with `toolId` references. This ensures credentials are stored securely and separately from the workflow configuration.

## How It Works

### 1. Agent Update Process

When a `PUT /agent/:id` request is made with an `orchestrationFlow` containing tools:

```javascript
// Example request body
{
  "orchestrationFlow": {
    "nodes": [
      {
        "id": "booking-agent-node",
        "type": "agentNode",
        "data": {
          "settings": {
            "tools": [
              {
                "name": "calendly",
                "type": "calendly",
                "serverUrl": "http://localhost:8000",
                "config": {
                  "apiKey": "your-calendly-api-key"
                }
              }
            ]
          }
        }
      }
    ]
  }
}
```

### 2. Automatic Tool Creation

The system detects tools with credentials (`config.apiKey`) and:

1. **Creates a Tool record** in the database with:
   - Secure credential storage
   - User/workspace/agent associations
   - Unique `toolId` identifier

2. **Replaces the tool configuration** with a reference:
   ```javascript
   {
     "toolId": "generated-uuid-here",
     "name": "calendly",
     "type": "calendly",
     "serverUrl": "http://localhost:8000",
     "parameters": {}
   }
   ```

### 3. Database Storage

The `Tool` model stores:
- **Credentials**: Securely stored with `select: false` by default
- **Configuration**: Service-specific settings
- **Associations**: Links to user, workspace, and agent
- **Metadata**: Usage stats, health status, etc.

## Code Flow

### 1. Agent Update Endpoint (`routes/agentRouter.js`)

```javascript
router.put("/:id", async (req, res) => {
  // ... authentication and validation ...

  // Handle orchestrationFlow updates with tool creation
  if (req.body.orchestrationFlow) {
    const processedFlow = await processOrchestrationFlowTools(
      req.body.orchestrationFlow, 
      agent, 
      req.user.id
    );
    req.body.orchestrationFlow = processedFlow;
  }

  // ... save agent ...
});
```

### 2. Tool Processing Function

```javascript
const processOrchestrationFlowTools = async (orchestrationFlow, agent, userId) => {
  // Deep clone the flow to avoid mutations
  const processedFlow = JSON.parse(JSON.stringify(orchestrationFlow));
  
  // Get user workspace information
  const user = await User.findById(userId).populate("defaultWorkspace").populate("lastActiveWorkspace");
  const { workspaceId, ownerId } = getWorkspaceAndOwner(user);

  // Process each node
  for (const node of processedFlow.nodes) {
    if (node.data?.settings?.tools) {
      const processedTools = [];

      for (const tool of node.data.settings.tools) {
        // Check if tool has credentials (new tool)
        if (tool.config?.apiKey) {
          // Create Tool record
          const toolRecord = new Tool({
            name: tool.name,
            type: tool.type,
            serverUrl: tool.serverUrl,
            user: ownerId,
            workspace: workspaceId,
            agent: agent._id,
            credentials: { apiKey: tool.config.apiKey },
            configuration: tool.config,
            protocol: 'mcp',
            createdBy: userId
          });

          await toolRecord.save();

          // Replace with reference
          processedTools.push({
            toolId: toolRecord.toolId,
            name: tool.name,
            type: tool.type,
            serverUrl: tool.serverUrl,
            parameters: tool.parameters || {}
          });
        } else {
          // Existing tool or no credentials
          processedTools.push(tool);
        }
      }

      node.data.settings.tools = processedTools;
    }
  }

  return processedFlow;
};
```

## Security Benefits

1. **Credential Isolation**: API keys are stored separately from workflow configuration
2. **Secure Access**: Credentials have `select: false` by default
3. **Access Control**: Tools are associated with specific users/workspaces/agents
4. **Audit Trail**: Track tool creation and usage

## Usage in Runtime

When the `OrchestrationManager` loads an agent:

1. **Loads the agent** with `orchestrationFlow` containing `toolId` references
2. **Fetches Tool records** from database using `toolId`
3. **Injects credentials** into MCP tool instances
4. **Creates isolated ToolManager** for each agent

## Example Tool Model Record

```javascript
{
  "_id": "ObjectId",
  "toolId": "uuid-generated-id",
  "name": "calendly",
  "type": "calendly",
  "serverUrl": "http://localhost:8000",
  "user": "user-object-id",
  "workspace": "workspace-object-id",
  "agent": "agent-object-id",
  "credentials": {
    "apiKey": "your-api-key-here"  // select: false by default
  },
  "configuration": {
    "apiKey": "your-api-key-here",
    "userUri": "optional-user-uri"
  },
  "protocol": "mcp",
  "isActive": true,
  "isHealthy": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

If tool creation fails:
- The system logs the error
- Removes credentials from the tool configuration
- Continues processing other tools
- The agent update still succeeds

## Testing

Run the test script to verify functionality:

```bash
node test-tool-creation.js
```

This will:
1. Connect to the database
2. Find a test user and agent
3. Process a sample orchestrationFlow with tools
4. Verify Tool records are created
5. Clean up test data

## Migration Notes

Existing agents with tools in their `orchestrationFlow` will continue to work, but their tools won't have the security benefits until they're updated through the API. 