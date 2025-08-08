const Tool = require('../models/Tool');
const Agent = require('../models/Agent');

// Example: Creating tools with credentials
async function createExampleTools() {
  console.log('=== Creating Example Tools ===');

  // Example user, workspace, and agent IDs (replace with real ones)
  const userId = '507f1f77bcf86cd799439011';
  const workspaceId = '507f1f77bcf86cd799439012';
  const agentId = '507f1f77bcf86cd799439013';

  // 1. Create a Calendly tool
  const calendlyTool = new Tool({
    name: 'Calendly Scheduler',
    type: 'calendly',
    description: 'Calendly booking and scheduling integration',
    user: userId,
    workspace: workspaceId,
    agent: agentId,
    serverUrl: 'http://localhost:8000',
    protocol: 'mcp',
    credentials: {
      apiKey: 'your_calendly_api_key_here'
    },
    configuration: {
      userUri: 'https://calendly.com/your-username',
      defaultEventType: '30-minute-meeting',
      parameters: {
        timezone: 'UTC',
        default_duration: 30
      }
    },
    isActive: true
  });

  await calendlyTool.save();
  console.log('Created Calendly tool:', calendlyTool.toolId);

  // 2. Create a Google Calendar tool
  const googleTool = new Tool({
    name: 'Google Calendar Manager',
    type: 'google-calendar',
    description: 'Google Calendar integration for event management',
    user: userId,
    workspace: workspaceId,
    agent: agentId,
    serverUrl: 'http://localhost:8001',
    protocol: 'mcp',
    credentials: {
      accessToken: 'your_google_access_token_here',
      refreshToken: 'your_google_refresh_token_here',
      clientId: 'your_google_client_id',
      clientSecret: 'your_google_client_secret'
    },
    configuration: {
      calendarId: 'primary',
      timezone: 'America/New_York',
      parameters: {
        max_results: 10
      }
    },
    isActive: true
  });

  await googleTool.save();
  console.log('Created Google Calendar tool:', googleTool.toolId);

  // 3. Create an Outlook tool
  const outlookTool = new Tool({
    name: 'Outlook Calendar',
    type: 'outlook-calendar',
    description: 'Microsoft Outlook Calendar integration',
    user: userId,
    workspace: workspaceId,
    agent: agentId,
    serverUrl: 'http://localhost:8002',
    protocol: 'mcp',
    credentials: {
      accessToken: 'your_outlook_access_token_here',
      refreshToken: 'your_outlook_refresh_token_here'
    },
    configuration: {
      tenantId: 'your_tenant_id',
      parameters: {
        enable_teams_integration: true
      }
    },
    isActive: true
  });

  await outlookTool.save();
  console.log('Created Outlook tool:', outlookTool.toolId);

  return {
    calendlyTool,
    googleTool,
    outlookTool
  };
}

// Example: Update Agent's orchestrationFlow to reference tools
async function updateAgentWithTools(agentId, tools) {
  console.log('\n=== Updating Agent OrchestrationFlow ===');

  const agent = await Agent.findById(agentId);
  if (!agent) {
    console.log('Agent not found');
    return;
  }

  // Example orchestration flow with tool references
  const orchestrationFlow = {
    nodes: [
      {
        id: 'calendar-agent-node',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: {
          label: 'Calendar Assistant',
          settings: {
            type: 'calendar-assistant',
            name: 'Calendar Assistant',
            description: 'Handles calendar scheduling and booking requests',
            tools: [
              {
                toolId: tools.calendlyTool.toolId, // Reference to Tool model
                name: 'calendly-scheduler',
                type: 'calendly',
                serverUrl: 'http://localhost:8000'
              },
              {
                toolId: tools.googleTool.toolId, // Reference to Tool model
                name: 'google-calendar',
                type: 'google-calendar',
                serverUrl: 'http://localhost:8001'
              }
            ],
            intents: [
              {
                name: 'schedule_meeting',
                description: 'Schedule a new meeting',
                required_entities: ['date', 'time']
              }
            ]
          }
        }
      },
      {
        id: 'general-agent-node',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'General Assistant',
          settings: {
            type: 'general-assistant',
            name: 'General Assistant',
            description: 'Handles general questions'
            // No tools - this agent won't have MCP access
          }
        }
      }
    ],
    edges: []
  };

  agent.orchestrationFlow = orchestrationFlow;
  await agent.save();

  console.log('Updated agent orchestrationFlow with tool references');
  return agent;
}

// Example: Query tools
async function queryToolExamples() {
  console.log('\n=== Querying Tools ===');

  // Find tools by agent
  const agentId = '507f1f77bcf86cd799439013';
  const agentTools = await Tool.findByAgent(agentId, true); // Include credentials
  console.log(`Found ${agentTools.length} tools for agent`);

  // Find tools by type
  const calendlyTools = await Tool.findByType('calendly');
  console.log(`Found ${calendlyTools.length} Calendly tools`);

  // Find by toolId
  if (agentTools.length > 0) {
    const tool = await Tool.findByToolId(agentTools[0].toolId);
    console.log('Found tool by toolId:', tool?.name);
    
    // Test primary credential virtual
    console.log('Primary credential available:', !!tool?.primaryCredential);
  }

  // Update usage stats
  if (agentTools.length > 0) {
    await agentTools[0].updateUsageStats(true);
    console.log('Updated usage stats for tool:', agentTools[0].name);
  }
}

// Example: Integration with OrchestrationManager
async function testWithOrchestrationManager() {
  console.log('\n=== Testing with OrchestrationManager ===');

  const OrchestrationManager = require('../services/OrchestrationManager');

  const config = {
    conversationId: 'test-' + Date.now(),
    agentId: '507f1f77bcf86cd799439013' // Agent with tools
  };

  const orchestrator = new OrchestrationManager(config);
  await orchestrator.initialize(); // This will load tools from database

  // Test if tools were loaded
  const toolManager = orchestrator.getToolManager();
  console.log('Tools loaded:', toolManager.getAllTools().length);
  console.log('Tool health:', toolManager.getToolsHealth());

  // Test workflow agents
  const workflowAgents = orchestrator.getWorkflowAgents();
  workflowAgents.forEach(agent => {
    const hasTools = agent.toolManager ? agent.toolManager.getAllTools().length : 0;
    console.log(`Agent ${agent.name}: ${hasTools} tools`);
  });
}

// Main example function
async function runToolModelExample() {
  try {
    // 1. Create example tools
    const tools = await createExampleTools();

    // 2. Update agent with tool references
    const agentId = '507f1f77bcf86cd799439013';
    await updateAgentWithTools(agentId, tools);

    // 3. Query examples
    await queryToolExamples();

    // 4. Test with OrchestrationManager
    await testWithOrchestrationManager();

    console.log('\n=== Tool Model Example Complete ===');
  } catch (error) {
    console.error('Error in tool model example:', error);
  }
}

module.exports = {
  createExampleTools,
  updateAgentWithTools,
  queryToolExamples,
  testWithOrchestrationManager,
  runToolModelExample
};

// Run if called directly
if (require.main === module) {
  runToolModelExample().catch(console.error);
} 