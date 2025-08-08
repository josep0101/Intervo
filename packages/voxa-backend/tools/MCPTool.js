import { MCPClient } from '../services/mcp-client.js';

class MCPTool {
  constructor(config) {
    this.name = config.name;
    this.type = config.type; // 'calendly', 'google-calendar', 'outlook-calendar'
    this.serverUrl = config.serverUrl;
    this.description = config.description;
    this.parameters = config.parameters || {};
    this.credentials = config.credentials || {};
    this.configuration = config.configuration || {};
    this.toolData = config.toolData || null; // Full tool model data
    this.isHealthy = false;
    
    // Initialize MCP client
    this.mcpClient = new MCPClient(this.serverUrl, 'sse');
    
    // Initialize health check
    this.checkHealth();
    
    // Set up periodic health checks every 30 seconds
    setInterval(() => {
      this.checkHealth();
    }, 30000);
  }

  async checkHealth() {
    try {
      // Try to connect to MCP server and list tools to verify health
      await this.mcpClient.connect();
      await this.mcpClient.getTools();
      this.isHealthy = true;
    } catch (error) {
      this.isHealthy = false;
      console.warn(`MCP ${this.type} server health check failed:`, error.message);
      // Ensure disconnection on failed health check
      try {
        await this.mcpClient.disconnect();
      } catch (disconnectError) {
        // Ignore disconnect errors during health check
      }
    }
  }

  async execute(operation, params = {}) {
    try {
      // Check health and try to connect if not healthy
      if (!this.isHealthy) {
        console.log(`⚠️ MCP ${this.type} server not healthy, attempting to reconnect...`);
        await this.checkHealth();
        
        if (!this.isHealthy) {
          throw new Error(`MCP ${this.type} server is not available after reconnection attempt`);
        }
      }

      // Ensure MCP client is connected
      await this.mcpClient.ensureConnected();

      // Merge operation parameters with service-specific parameters and credentials
      const toolArgs = {
        ...params,
        ...this.getServiceSpecificParams()
      };

      // Add authentication credentials to the arguments
      this.addCredentialsToArgs(toolArgs);

      console.log(`🔧 MCP CALL: ${this.type} -> ${operation}`);
      console.log(`📤 Args:`, { ...toolArgs, ...this.maskSensitiveData(toolArgs) });

      // Call the MCP tool using proper protocol
      const result = await this.mcpClient.callTool(operation, toolArgs);

      // Update usage stats if tool model is available - make this non-blocking and handle errors gracefully
      if (this.toolData && this.toolData.updateUsageStats) {
        // Use setImmediate to make this asynchronous and prevent blocking the main response
        setImmediate(async () => {
          try {
            await this.toolData.updateUsageStats(true);
          } catch (statsError) {
            // Only log parallel save errors as warnings since they're not critical
            if (statsError.message && statsError.message.includes('parallel')) {
              console.warn(`Non-critical parallel save warning for tool ${this.name}:`, statsError.message);
            } else {
              console.warn(`Failed to update success stats for tool ${this.name}:`, statsError.message);
            }
          }
        });
      }

      console.log(`📥 MCP Response received successfully`);
      return result.content || result;
    } catch (error) {
      console.error(`Error calling MCP ${this.type} tool ${operation}:`, error.message);
      
      // Update error stats if tool model is available - make this non-blocking as well
      if (this.toolData && this.toolData.updateUsageStats) {
        setImmediate(async () => {
          try {
            await this.toolData.updateUsageStats(false, error);
          } catch (statsError) {
            // Only log parallel save errors as warnings since they're not critical
            if (statsError.message && statsError.message.includes('parallel')) {
              console.warn(`Non-critical parallel save warning for tool ${this.name}:`, statsError.message);
            } else {
              console.warn(`Failed to update error stats for tool ${this.name}:`, statsError.message);
            }
          }
        });
      }
      
      // Don't expose internal error details to the user
      const userFriendlyMessage = this._getUserFriendlyErrorMessage(error);
      throw new Error(userFriendlyMessage);
    }
  }

  // Add authentication credentials to tool arguments
  addCredentialsToArgs(args) {
    const primaryCredential = this.getPrimaryCredential();
    
    if (primaryCredential) {
      switch (this.type) {
        case 'calendly':
          args.api_key = primaryCredential;
          break;
        case 'google-calendar':
          args.access_token = primaryCredential;
          break;
        case 'outlook-calendar':
          args.access_token = primaryCredential;
          break;
        default:
          // Default to api_key
          args.api_key = primaryCredential;
      }
      console.log(`🔐 Added ${this.type} credentials to tool arguments`);
    } else {
      console.warn(`No credentials available for ${this.type} tool: ${this.name}`);
    }
  }

  // Mask sensitive data for logging
  maskSensitiveData(args) {
    const masked = {};
    for (const [key, value] of Object.entries(args)) {
      if (key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('key') || 
          key.toLowerCase().includes('secret')) {
        masked[key] = '[REDACTED]';
      }
    }
    return masked;
  }

  // Get primary credential based on tool type
  getPrimaryCredential() {
    if (!this.credentials) return null;
    
    switch (this.type) {
      case 'calendly':
        return this.credentials.apiKey;
      case 'google-calendar':
        return this.credentials.accessToken;
      case 'outlook-calendar':
        return this.credentials.accessToken;
      default:
        return this.credentials.apiKey || this.credentials.accessToken;
    }
  }

  // Get service-specific parameters to include in requests
  getServiceSpecificParams() {
    const params = {};
    
    switch (this.type) {
      case 'calendly':
        if (this.configuration.userUri) {
          params.user_uri = this.configuration.userUri;
        }
        break;
      case 'google-calendar':
        if (this.configuration.calendarId) {
          params.calendar_id = this.configuration.calendarId;
        }
        break;
      case 'outlook-calendar':
        if (this.configuration.tenantId) {
          params.tenant_id = this.configuration.tenantId;
        }
        break;
    }
    
    return params;
  }

  async getResource(resourcePath) {
    if (!this.isHealthy) {
      throw new Error(`MCP ${this.type} server is not available`);
    }

    try {
      // Ensure MCP client is connected
      await this.mcpClient.ensureConnected();
      
      // Use proper MCP resource reading
      const result = await this.mcpClient.readResource(resourcePath);
      return result.contents || result;
    } catch (error) {
      console.error(`Error getting MCP ${this.type} resource ${resourcePath}:`, error.message);
      throw new Error(`MCP resource access failed: ${error.message}`);
    }
  }

  // Factory method to create specific MCP tools
  static createTool(toolConfig) {
    const { type } = toolConfig;
    
    switch (type) {
      case 'calendly':
        return new CalendlyTool(toolConfig);
      case 'google-calendar':
        return new GoogleCalendarTool(toolConfig);
      case 'outlook-calendar':
        return new OutlookCalendarTool(toolConfig);
      default:
        return new MCPTool(toolConfig);
    }
  }

  // Helper method to determine if this tool can handle a given intent
  canHandle(intent, input) {
    // This will be overridden in specific tool implementations
    return false;
  }

  // Convert technical errors to user-friendly messages
  _getUserFriendlyErrorMessage(error) {
    const message = error.message || error.toString();
    
    if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
      return `The ${this.type} service is currently unavailable. Please try again later.`;
    }
    
    if (message.includes('401') || message.includes('Unauthorized')) {
      return `Authentication failed for ${this.type}. Please check your credentials.`;
    }
    
    if (message.includes('403') || message.includes('Forbidden')) {
      return `Access denied to ${this.type}. Please check your permissions.`;
    }
    
    if (message.includes('404') || message.includes('Not Found')) {
      return `The requested ${this.type} resource was not found.`;
    }
    
    if (message.includes('timeout')) {
      return `The ${this.type} service took too long to respond. Please try again.`;
    }
    
    if (message.includes('server is not available')) {
      return `The ${this.type} service is temporarily unavailable. Please try again later.`;
    }
    
    // Default fallback for unknown errors
    return `There was an issue with the ${this.type} service. Please try again or contact support if the problem persists.`;
  }
}

class CalendlyTool extends MCPTool {
  constructor(config) {
    super({
      ...config,
      serverUrl: config.serverUrl || process.env.MCP_CALENDLY_URL || 'http://localhost:8000'
    });
  }

  canHandle(intent, input) {
    const calendlyKeywords = ['calendly', 'schedule', 'book', 'appointment'];
    const inputLower = input.toLowerCase();
    return calendlyKeywords.some(keyword => inputLower.includes(keyword));
  }

  async getUserInfo() {
    return await this.execute('get_user_info');
  }

  async listEventTypes() {
    return await this.execute('list_event_types');
  }

  async listScheduledEvents(params = {}) {
    return await this.execute('list_scheduled_events', params);
  }
}

class GoogleCalendarTool extends MCPTool {
  constructor(config) {
    super({
      ...config,
      serverUrl: config.serverUrl || process.env.MCP_GOOGLE_CALENDAR_URL || 'http://localhost:8001'
    });
  }

  canHandle(intent, input) {
    const googleKeywords = ['google calendar', 'google', 'gmail calendar', 'gcal'];
    const inputLower = input.toLowerCase();
    return googleKeywords.some(keyword => inputLower.includes(keyword));
  }

  async listCalendars() {
    return await this.execute('list_calendars');
  }

  async listEvents(calendarId = 'primary', params = {}) {
    return await this.execute('list_events', { calendar_id: calendarId, ...params });
  }

  async createEvent(calendarId = 'primary', eventData) {
    return await this.execute('create_event', { calendar_id: calendarId, ...eventData });
  }
}

class OutlookCalendarTool extends MCPTool {
  constructor(config) {
    super({
      ...config,
      serverUrl: config.serverUrl || process.env.MCP_OUTLOOK_CALENDAR_URL || 'http://localhost:8002'
    });
  }

  canHandle(intent, input) {
    const outlookKeywords = ['outlook', 'office 365', 'microsoft calendar', 'teams'];
    const inputLower = input.toLowerCase();
    return outlookKeywords.some(keyword => inputLower.includes(keyword));
  }

  async getUserProfile() {
    return await this.execute('get_user_profile');
  }

  async listEvents(calendarId = 'primary', params = {}) {
    return await this.execute('list_events', { calendar_id: calendarId, ...params });
  }

  async findMeetingTimes(params) {
    return await this.execute('find_meeting_times', params);
  }
}

export { MCPTool, CalendlyTool, GoogleCalendarTool, OutlookCalendarTool }; 