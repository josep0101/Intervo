import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Proper MCP Client using official MCP SDK
 */
class MCPClient {
    constructor(baseUrl, transportType = 'sse') {
        this.baseUrl = baseUrl;
        this.transportType = transportType;
        this.client = null;
        this.transport = null;
        this.connected = false;
    }

    /**
     * Connect to the MCP server
     */
    async connect() {
        try {
            // Initialize client
            this.client = new Client(
                {
                    name: "voxa-calendar-client",
                    version: "1.0.0",
                },
                {
                    capabilities: {
                        tools: {},
                        resources: {},
                        prompts: {}
                    },
                }
            );

            // Create appropriate transport
            if (this.transportType === 'sse') {
                this.transport = new SSEClientTransport(new URL(this.baseUrl + '/sse'));
            } else if (this.transportType === 'stdio') {
                // For stdio, you'd typically pass a command to execute
                throw new Error('STDIO transport requires command parameters - use SSE for HTTP servers');
            } else {
                throw new Error(`Unsupported transport type: ${this.transportType}`);
            }

            // Connect to server
            await this.client.connect(this.transport);
            this.connected = true;
            console.log(`✅ Connected to MCP server at ${this.baseUrl}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to connect to MCP server at ${this.baseUrl}:`, error);
            this.connected = false;
            throw error;
        }
    }

    /**
     * Disconnect from the MCP server
     */
    async disconnect() {
        if (this.client) {
            try {
                await this.client.close();
                this.connected = false;
                console.log(`🔌 Disconnected from MCP server at ${this.baseUrl}`);
            } catch (error) {
                console.warn(`Warning during disconnect from ${this.baseUrl}:`, error);
            }
            this.client = null;
            this.transport = null;
        }
    }

    /**
     * Ensure client is connected
     */
    async ensureConnected() {
        if (!this.connected || !this.client) {
            await this.connect();
        }
    }

    /**
     * Call an MCP tool using proper protocol
     * @param {string} toolName - Name of the tool to call
     * @param {object} args - Arguments for the tool
     * @returns {Promise<any>} Tool result
     */
    async callTool(toolName, args = {}) {
        await this.ensureConnected();

        try {
            console.log(`🔧 Calling MCP tool: ${toolName} with args:`, args);
            const result = await this.client.callTool({
                name: toolName,
                arguments: args
            });
            console.log(`✅ Tool ${toolName} completed successfully`);
            return result;
        } catch (error) {
            console.error(`❌ Error calling tool ${toolName}:`, error);
            throw error;
        }
    }

    /**
     * Get available tools
     * @returns {Promise<array>} List of available tools
     */
    async getTools() {
        await this.ensureConnected();

        try {
            const result = await this.client.listTools();
            return result.tools;
        } catch (error) {
            console.error('Error getting tools:', error);
            throw error;
        }
    }

    /**
     * Get available resources
     * @returns {Promise<array>} List of available resources
     */
    async getResources() {
        await this.ensureConnected();

        try {
            const result = await this.client.listResources();
            return result.resources;
        } catch (error) {
            console.error('Error getting resources:', error);
            throw error;
        }
    }

    /**
     * Read a resource
     * @param {string} uri - Resource URI
     * @returns {Promise<any>} Resource content
     */
    async readResource(uri) {
        await this.ensureConnected();

        try {
            const result = await this.client.readResource({ uri });
            return result;
        } catch (error) {
            console.error(`Error reading resource ${uri}:`, error);
            throw error;
        }
    }

    /**
     * Get available prompts
     * @returns {Promise<array>} List of available prompts
     */
    async getPrompts() {
        await this.ensureConnected();

        try {
            const result = await this.client.listPrompts();
            return result.prompts;
        } catch (error) {
            console.error('Error getting prompts:', error);
            throw error;
        }
    }

    /**
     * Use a prompt
     * @param {string} promptName - Name of the prompt
     * @param {object} args - Arguments for the prompt
     * @returns {Promise<any>} Prompt result
     */
    async getPrompt(promptName, args = {}) {
        await this.ensureConnected();

        try {
            const result = await this.client.getPrompt({
                name: promptName,
                arguments: args
            });
            return result;
        } catch (error) {
            console.error(`Error using prompt ${promptName}:`, error);
            throw error;
        }
    }
}

/**
 * Enhanced Calendar MCP Clients Manager
 */
class CalendarMCPClients {
    constructor() {
        this.calendly = null;
        this.googleCalendar = null;
        this.outlook = null;
    }

    /**
     * Initialize all calendar clients
     * @param {object} config - Configuration object
     */
    async initialize(config = {}) {
        const {
            calendlyUrl = "http://localhost:8000",
            googleCalendarUrl = "http://localhost:8001",
            outlookUrl = "http://localhost:8002",
            transportType = "sse"
        } = config;

        // Initialize clients
        this.calendly = new MCPClient(calendlyUrl, transportType);
        this.googleCalendar = new MCPClient(googleCalendarUrl, transportType);
        this.outlook = new MCPClient(outlookUrl, transportType);

        // Connect to available servers
        const connections = await Promise.allSettled([
            this.calendly.connect().catch(e => console.warn('Calendly server not available:', e.message)),
            this.googleCalendar.connect().catch(e => console.warn('Google Calendar server not available:', e.message)),
            this.outlook.connect().catch(e => console.warn('Outlook server not available:', e.message))
        ]);

        console.log('📅 Calendar MCP Clients initialized');
        return this;
    }

    /**
     * Disconnect all clients
     */
    async disconnect() {
        await Promise.allSettled([
            this.calendly?.disconnect(),
            this.googleCalendar?.disconnect(),
            this.outlook?.disconnect()
        ]);
    }

    /**
     * Get all upcoming events from all connected calendar services
     * @param {object} options - Options for fetching events
     * @returns {Promise<object>} Events from all services
     */
    async getAllUpcomingEvents(options = {}) {
        const events = {};

        if (this.calendly?.connected) {
            try {
                const result = await this.calendly.callTool('list_scheduled_events', {
                    days_ahead: options.daysAhead || 30,
                    days_back: options.daysBack || 7
                });
                events.calendly = result.content;
            } catch (error) {
                console.warn('Failed to fetch Calendly events:', error.message);
                events.calendly = { error: error.message };
            }
        }

        if (this.googleCalendar?.connected) {
            try {
                const result = await this.googleCalendar.callTool('list_events', {
                    calendar_id: options.googleCalendarId || 'primary',
                    days_ahead: options.daysAhead || 30,
                    days_back: options.daysBack || 7,
                    max_results: options.maxResults || 50
                });
                events.googleCalendar = result.content;
            } catch (error) {
                console.warn('Failed to fetch Google Calendar events:', error.message);
                events.googleCalendar = { error: error.message };
            }
        }

        if (this.outlook?.connected) {
            try {
                const result = await this.outlook.callTool('list_events', {
                    calendar_id: options.outlookCalendarId,
                    days_ahead: options.daysAhead || 30,
                    days_back: options.daysBack || 7,
                    max_results: options.maxResults || 50
                });
                events.outlook = result.content;
            } catch (error) {
                console.warn('Failed to fetch Outlook events:', error.message);
                events.outlook = { error: error.message };
            }
        }

        return events;
    }

    /**
     * Get Calendly event types
     * @returns {Promise<any>} Event types
     */
    async getCalendlyEventTypes() {
        if (!this.calendly?.connected) {
            throw new Error('Calendly client not connected');
        }
        const result = await this.calendly.callTool('list_event_types', {});
        return result.content;
    }

    /**
     * Get user information from all services
     * @returns {Promise<object>} User info from all services
     */
    async getAllUserInfo() {
        const userInfo = {};

        if (this.calendly?.connected) {
            try {
                const result = await this.calendly.callTool('get_user_info', {});
                userInfo.calendly = result.content;
            } catch (error) {
                userInfo.calendly = { error: error.message };
            }
        }

        if (this.googleCalendar?.connected) {
            try {
                const result = await this.googleCalendar.callTool('get_user_profile', {});
                userInfo.google = result.content;
            } catch (error) {
                userInfo.google = { error: error.message };
            }
        }

        if (this.outlook?.connected) {
            try {
                const result = await this.outlook.callTool('get_user_profile', {});
                userInfo.outlook = result.content;
            } catch (error) {
                userInfo.outlook = { error: error.message };
            }
        }

        return userInfo;
    }
}

// Export the classes
export { MCPClient, CalendarMCPClients };

// Example usage:
/*
import { CalendarMCPClients } from './mcp-client.js';

async function main() {
    const calendarClients = new CalendarMCPClients();
    
    try {
        // Initialize and connect to all servers
        await calendarClients.initialize({
            transportType: 'sse'  // or 'stdio' for command-line servers
        });
        
        // Test Calendly event types
        const eventTypes = await calendarClients.getCalendlyEventTypes();
        console.log('📅 Calendly Event Types:', eventTypes);
        
        // Get all upcoming events
        const events = await calendarClients.getAllUpcomingEvents({
            daysAhead: 14,
            daysBack: 7
        });
        console.log('📋 All Events:', events);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        // Clean up connections
        await calendarClients.disconnect();
    }
}

// Uncomment to run example
// main();
*/ 