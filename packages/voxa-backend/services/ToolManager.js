import { MCPTool } from '../tools/MCPTool.js';

class ToolManager {
  constructor() {
    this.tools = new Map();
    this.toolsByType = new Map();
    this.toolCredentials = new Map(); // Map toolId -> credentials
  }

  // Initialize tools from orchestration flow nodes with database lookup
  async initializeFromWorkflow(orchestrationFlow, agentId = null) {
    if (!orchestrationFlow || !orchestrationFlow.nodes) {
      return;
    }

    // Load tool credentials from database if agentId is provided
    if (agentId) {
      await this.loadToolCredentials(agentId);
    }

    orchestrationFlow.nodes.forEach(node => {
      if (node.data?.settings?.tools) {
        node.data.settings.tools.forEach(toolConfig => {
          this.addTool(toolConfig, node.id);
        });
      }
      
      // Handle single tool in node settings
      if (node.data?.settings?.tool) {
        this.addTool(node.data.settings.tool, node.id);
      }
    });
  }

  // Load tool credentials from database
  async loadToolCredentials(agentId) {
    try {
      const { default: Tool } = await import('../models/Tool.js');
      const tools = await Tool.findByAgent(agentId, true); // Include credentials
      
      tools.forEach(tool => {
        this.toolCredentials.set(tool.toolId, {
          credentials: tool.credentials,
          configuration: tool.configuration,
          toolData: tool
        });
      });
      
      console.log(`Loaded credentials for ${tools.length} tools for agent ${agentId}`);
    } catch (error) {
      console.error('Error loading tool credentials:', error);
    }
  }

  addTool(toolConfig, nodeId) {
    try {
      let tool;
      
      // Check if this is an MCP tool
      if (this.isMCPTool(toolConfig)) {
        // Inject credentials if available
        const enhancedConfig = this.enhanceToolConfigWithCredentials(toolConfig);
        tool = MCPTool.createTool(enhancedConfig);
      } else {
        // Handle other tool types here in the future
        tool = this.createGenericTool(toolConfig);
      }

      if (tool) {
        const toolKey = `${nodeId}_${tool.name}`;
        this.tools.set(toolKey, tool);
        
        // Group by type for easier lookup
        if (!this.toolsByType.has(tool.type)) {
          this.toolsByType.set(tool.type, []);
        }
        this.toolsByType.get(tool.type).push(tool);
        
        console.log(`Tool registered: ${tool.name} (${tool.type}) for node ${nodeId}`);
      }
    } catch (error) {
      console.error(`Failed to create tool for node ${nodeId}:`, error);
    }
  }

  // Enhance tool config with credentials from database
  enhanceToolConfigWithCredentials(toolConfig) {
    const toolId = toolConfig.toolId;
    if (!toolId || !this.toolCredentials.has(toolId)) {
      console.warn(`No credentials found for tool ${toolConfig.name} (toolId: ${toolId})`);
      return toolConfig;
    }

    const toolData = this.toolCredentials.get(toolId);
    
    return {
      ...toolConfig,
      credentials: toolData.credentials,
      configuration: toolData.configuration,
      toolData: toolData.toolData
    };
  }

  isMCPTool(toolConfig) {
    const mcpTypes = ['calendly', 'google-calendar', 'outlook-calendar', 'mcp'];
    return mcpTypes.includes(toolConfig.type) || toolConfig.protocol === 'mcp';
  }

  createGenericTool(toolConfig) {
    // Placeholder for other tool types
    return {
      name: toolConfig.name,
      type: toolConfig.type,
      description: toolConfig.description,
      execute: async (operation, params) => {
        throw new Error(`Generic tool execution not implemented for ${toolConfig.type}`);
      }
    };
  }

  // Get tools that can handle a specific intent/input
  getToolsForIntent(intent, input) {
    const matchingTools = [];
    
    for (const tool of this.tools.values()) {
      if (tool.canHandle && tool.canHandle(intent, input)) {
        matchingTools.push(tool);
      }
    }
    
    return matchingTools;
  }

  // Get tools by type
  getToolsByType(type) {
    return this.toolsByType.get(type) || [];
  }

  // Get all tools
  getAllTools() {
    return Array.from(this.tools.values());
  }

  // Get tool by name
  getTool(name) {
    for (const tool of this.tools.values()) {
      if (tool.name === name) {
        return tool;
      }
    }
    return null;
  }

  // Check if any tools are available for a specific type
  hasToolsOfType(type) {
    return this.toolsByType.has(type) && this.toolsByType.get(type).length > 0;
  }

  // Get health status of all tools
  getToolsHealth() {
    const health = {};
    
    for (const [key, tool] of this.tools.entries()) {
      health[key] = {
        name: tool.name,
        type: tool.type,
        isHealthy: tool.isHealthy !== undefined ? tool.isHealthy : true
      };
    }
    
    return health;
  }

  // Execute a tool operation
  async executeTool(toolName, operation, params = {}) {
    const tool = this.getTool(toolName);
    
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }
    
    if (!tool.execute) {
      throw new Error(`Tool '${toolName}' does not support execution`);
    }
    
    return await tool.execute(operation, params);
  }

  // Smart tool selection - find the best tool for a given task
  async selectBestTool(intent, input, context = {}) {
    const candidates = this.getToolsForIntent(intent, input);
    
    if (candidates.length === 0) {
      return null;
    }
    
    if (candidates.length === 1) {
      return candidates[0];
    }
    
    // If multiple tools can handle it, prefer healthy ones
    const healthyTools = candidates.filter(tool => tool.isHealthy !== false);
    
    if (healthyTools.length > 0) {
      // For now, return the first healthy tool
      // In the future, could implement more sophisticated selection logic
      return healthyTools[0];
    }
    
    return candidates[0]; // Fallback to first tool
  }
}

export default ToolManager; 