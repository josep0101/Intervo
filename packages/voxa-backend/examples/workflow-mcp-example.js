const OrchestrationManager = require('../services/OrchestrationManager');

// Example orchestration flow with MCP tools
const exampleOrchestrationFlow = {
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
          aiService: 'groq',
          aiConfig: {
            temperature: 0.7,
            maxTokens: 150
          },
          tools: [
            {
              name: 'calendly-scheduler',
              type: 'calendly',
              description: 'Calendly booking and scheduling tool',
              serverUrl: 'http://localhost:8000',
              parameters: {
                default_duration: 30,
                timezone: 'UTC'
              }
            }
          ],
          intents: [
            {
              name: 'schedule_meeting',
              description: 'Schedule a new meeting',
              required_entities: ['date', 'time']
            },
            {
              name: 'list_events',
              description: 'List scheduled events'
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
          description: 'Handles general questions and requests',
          aiService: 'groq',
          aiConfig: {
            temperature: 0.7,
            maxTokens: 100
          }
          // Note: No tools defined - this agent won't have access to MCP tools
        }
      }
    },
    {
      id: 'multi-calendar-node',
      type: 'agent',
      position: { x: 500, y: 100 },
      data: {
        label: 'Multi-Calendar Manager',
        settings: {
          type: 'multi-calendar',
          name: 'Multi-Calendar Manager', 
          description: 'Manages multiple calendar platforms',
          tools: [
            {
              name: 'calendly-tool',
              type: 'calendly',
              serverUrl: 'http://localhost:8000'
            },
            {
              name: 'google-calendar-tool',
              type: 'google-calendar',
              serverUrl: 'http://localhost:8001'
            }
          ]
        }
      }
    }
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'calendar-agent-node',
      target: 'general-agent-node'
    }
  ]
};

async function testWorkflowWithMCP() {
  console.log('=== Testing Workflow-based MCP Integration ===');
  
  // Create orchestration manager
  const config = {
    conversationId: 'test-workflow-' + Date.now(),
    agentId: null // We'll use the flow directly instead of loading from DB
  };
  
  const orchestrator = new OrchestrationManager(config);
  await orchestrator.initialize();
  
  // Initialize workflow directly (instead of loading from Agent model)
  console.log('\n1. Initializing workflow...');
  orchestrator.initializeWorkflow(exampleOrchestrationFlow);
  
  // Check which agents were created
  console.log('\n2. Workflow agents created:');
  const workflowAgents = orchestrator.getWorkflowAgents();
  workflowAgents.forEach(agent => {
    console.log(`  - ${agent.name} (node: ${agent.nodeId})`);
    console.log(`    Has tools: ${agent.toolManager ? agent.toolManager.getAllTools().length : 0}`);
    if (agent.toolManager) {
      agent.toolManager.getAllTools().forEach(tool => {
        console.log(`      * ${tool.name} (${tool.type})`);
      });
    }
  });
  
  // Test tool availability
  console.log('\n3. Testing tool availability...');
  for (const agent of workflowAgents) {
    const hasTools = await agent.hasAvailableTools();
    console.log(`  ${agent.name}: hasTools=${hasTools}`);
    
    if (hasTools) {
      const shouldUseForScheduling = await agent.shouldUseTool('schedule a meeting', 'schedule_meeting');
      console.log(`    Should use tool for scheduling: ${shouldUseForScheduling}`);
    }
  }
  
  // Test processing calendar request
  console.log('\n4. Testing calendar request processing...');
  try {
    const testInput = "I need to schedule a meeting for tomorrow at 2 PM";
    const conversationState = {
      phase: 'active',
      currentAgent: null,
      memoryState: {},
      conversationHistory: []
    };
    
    // This will now include workflow agents in processing
    const response = await orchestrator.process(testInput, conversationState, 'userInput');
    
    console.log('Response:', {
      agent: response?.agent,
      canProcess: response?.canProcess,
      confidence: response?.confidence,
      hasToolResult: !!response?.toolResult,
      text: response?.text?.substring(0, 100) + '...'
    });
    
  } catch (error) {
    console.error('Error processing request:', error.message);
  }
  
  console.log('\n=== Test Complete ===');
}

// Export for testing
module.exports = {
  testWorkflowWithMCP,
  exampleOrchestrationFlow
};

// Run test if this file is executed directly
if (require.main === module) {
  testWorkflowWithMCP().catch(console.error);
} 