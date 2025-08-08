# MCP Calendar Integration Guide

## Overview

This document provides comprehensive integration instructions for the **MCP (Model Context Protocol) Calendar Servers**. These servers provide unified access to multiple calendar platforms through a standardized API interface.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your App     │────│  MCP Calendar    │────│  Calendar APIs  │
│   (Client)     │    │    Servers       │    │ (Calendly, etc) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌──────┼──────┐
                       │      │      │
                  ┌─────▼─┐ ┌─▼──┐ ┌─▼────┐
                  │Calendly│ │Google│ │Outlook│
                  │ :8000  │ │:8001 │ │:8002 │
                  └────────┘ └─────┘ └──────┘
```

## 📦 Available Servers

| Server | Port | Purpose | API Provider |
|--------|------|---------|-------------|
| **Calendly** | 8000 | Event booking, availability | Calendly API |
| **Google Calendar** | 8001 | Calendar management | Google Calendar API |
| **Outlook Calendar** | 8002 | Microsoft calendar integration | Microsoft Graph API |

## 🚀 Quick Start

### 1. Server Management

**Option A: Command Line Tool**
```bash
# Start all servers
python mcp_server_manager.py start

# Check status
python mcp_server_manager.py status

# Stop all servers
python mcp_server_manager.py stop
```

**Option B: Programmatic (Python)**
```python
from mcp_manager import start_mcp_servers, stop_mcp_servers

# Start servers
manager = start_mcp_servers()

# Your application logic here
# ...

# Clean shutdown
stop_mcp_servers(manager)
```

### 2. Environment Setup

Create a `.env` file with the required API credentials:

```bash
# Calendly
CALENDLY_API_KEY=your_calendly_api_key_here

# Google Calendar
GOOGLE_CALENDAR_API_KEY=your_google_api_key_here
GOOGLE_CALENDAR_ACCESS_TOKEN=your_oauth_access_token_here

# Outlook
OUTLOOK_ACCESS_TOKEN=your_microsoft_graph_token_here
```

## 🔌 Client Integration

### JavaScript/Node.js Integration

Use the provided `mcp-client.js` for easy integration:

```javascript
const { CalendarMCPClients } = require('./mcp-client');

const calendars = new CalendarMCPClients();

// Initialize connections
await calendars.initialize();

// Get user's Calendly profile
const profile = await calendars.calendly.callTool('get_user_info');

// List Google Calendar events
const events = await calendars.google.callTool('list_events', {
    calendar_id: 'primary',
    time_min: new Date().toISOString()
});

// Create Outlook meeting
const meeting = await calendars.outlook.callTool('create_event', {
    calendar_id: 'primary',
    subject: 'Team Meeting',
    start_time: '2024-01-15T10:00:00Z',
    end_time: '2024-01-15T11:00:00Z'
});
```

### Python Integration

```python
import requests
import json

class MCPCalendarClient:
    def __init__(self, base_url):
        self.base_url = base_url
    
    def call_tool(self, tool_name, parameters=None):
        response = requests.post(f"{self.base_url}/tools/{tool_name}", 
                               json=parameters or {})
        return response.json()
    
    def get_resource(self, resource_path):
        response = requests.get(f"{self.base_url}/resources/{resource_path}")
        return response.json()

# Usage
calendly = MCPCalendarClient("http://localhost:8000")
google = MCPCalendarClient("http://localhost:8001")
outlook = MCPCalendarClient("http://localhost:8002")

# Get Calendly events
events = calendly.call_tool('list_scheduled_events')
```

### REST API Direct Integration

Each server exposes standard HTTP endpoints:

```bash
# Health check
GET http://localhost:8000/health

# Call a tool
POST http://localhost:8000/tools/get_user_info
Content-Type: application/json
{}

# Get a resource
GET http://localhost:8000/resources/calendly://user/profile

# Use a prompt
POST http://localhost:8000/prompts/create_scheduling_message
Content-Type: application/json
{
    "event_type": "30-minute-meeting",
    "available_times": ["2024-01-15T10:00:00Z", "2024-01-15T14:00:00Z"]
}
```

## 🛠️ Available Tools

### Calendly Server (Port 8000)

| Tool | Purpose | Parameters |
|------|---------|------------|
| `get_user_info` | Get user profile | None |
| `list_event_types` | List available event types | None |
| `list_scheduled_events` | Get scheduled events | `status`, `sort`, `count` |
| `get_event_details` | Get specific event | `event_uuid` |
| `cancel_event` | Cancel an event | `event_uuid`, `reason` |

### Google Calendar Server (Port 8001)

| Tool | Purpose | Parameters |
|------|---------|------------|
| `list_calendars` | List user's calendars | None |
| `get_calendar_info` | Get calendar details | `calendar_id` |
| `list_events` | List events | `calendar_id`, `time_min`, `time_max`, `max_results` |
| `get_event_details` | Get event details | `calendar_id`, `event_id` |
| `create_event` | Create new event | `calendar_id`, `summary`, `start_time`, `end_time`, etc. |
| `delete_event` | Delete event | `calendar_id`, `event_id` |

### Outlook Calendar Server (Port 8002)

| Tool | Purpose | Parameters |
|------|---------|------------|
| `get_user_profile` | Get user profile | None |
| `list_calendars` | List calendars | None |
| `get_calendar_info` | Get calendar details | `calendar_id` |
| `list_events` | List events | `calendar_id`, `start_time`, `end_time` |
| `get_event_details` | Get event details | `event_id` |
| `create_event` | Create event | `calendar_id`, `subject`, `start_time`, `end_time`, etc. |
| `delete_event` | Delete event | `event_id` |
| `find_meeting_times` | Find available slots | `attendees`, `duration`, `start_time`, `end_time` |

## 📊 Resources

Each server exposes resources for direct data access:

### Calendly Resources
- `calendly://user/profile` - User profile information
- `calendly://events/upcoming` - Upcoming events

### Google Calendar Resources
- `google-calendar://calendars/list` - List of calendars
- `google-calendar://events/upcoming/{calendar_id}` - Upcoming events

### Outlook Resources
- `outlook://user/profile` - User profile
- `outlook://calendars/list` - List of calendars
- `outlook://events/upcoming` - Upcoming events

## 🎯 Prompts

Pre-built templates for common operations:

### Calendly
- `create_scheduling_message` - Generate booking messages

### Google Calendar
- `create_meeting_invitation` - Generate meeting invites

### Outlook
- `create_teams_meeting_invitation` - Generate Teams meeting invites

## 🔒 Security & Authentication

### API Keys Setup

1. **Calendly**: Get API key from [Calendly Developer Portal](https://developer.calendly.com/)
2. **Google Calendar**: Setup OAuth 2.0 at [Google Cloud Console](https://console.cloud.google.com/)
3. **Outlook**: Register app in [Azure Portal](https://portal.azure.com/)

### Best Practices

- Store credentials in environment variables, never in code
- Use HTTPS in production
- Implement proper error handling for API rate limits
- Monitor server health and implement auto-restart logic

## 📈 Monitoring & Health Checks

### Server Status Monitoring

```python
# Check server health
response = requests.get("http://localhost:8000/health")
if response.status_code == 200:
    print("Server is healthy")

# Get detailed status
from mcp_manager import MCPManager
manager = MCPManager()
status = manager.get_status()
print(status)
```

### Production Monitoring

```bash
# Monitor with auto-restart
python mcp_server_manager.py monitor --monitor-interval 30
```

## ⚡ Performance Considerations

### Rate Limits

| Service | Rate Limit | Recommendation |
|---------|------------|----------------|
| Calendly | 1000 requests/hour | Implement caching |
| Google Calendar | 1M queries/day | Use batch requests |
| Outlook | 10,000 requests/10 min | Queue operations |

### Optimization Tips

1. **Cache frequently accessed data** (user profiles, calendar lists)
2. **Batch operations** when possible
3. **Use webhooks** for real-time updates instead of polling
4. **Implement circuit breakers** for external API failures

## 🐛 Error Handling

### Common Error Patterns

```python
try:
    result = calendly.call_tool('get_user_info')
except requests.exceptions.ConnectionError:
    # Server is down
    print("Calendar server is unavailable")
except requests.exceptions.Timeout:
    # Request timed out
    print("Request timed out")
except Exception as e:
    # API error
    if hasattr(e, 'response') and e.response.status_code == 401:
        print("Authentication failed - check API keys")
    elif hasattr(e, 'response') and e.response.status_code == 429:
        print("Rate limit exceeded - implement backoff")
```

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 401 | Unauthorized | Check API credentials |
| 403 | Forbidden | Check permissions/scopes |
| 429 | Rate Limited | Implement exponential backoff |
| 500 | Server Error | Check server logs, retry |

## 🚀 Deployment

### Development
```bash
# Start in development mode
python mcp_server_manager.py start
```

### Production
```bash
# Start with monitoring
python mcp_server_manager.py monitor &

# Or use process manager like PM2/systemd
```

### Docker Deployment (Optional)

```dockerfile
FROM python:3.9

WORKDIR /app
COPY . .
RUN pip install fastmcp requests

EXPOSE 8000 8001 8002

CMD ["python", "mcp_server_manager.py", "start"]
```

## 📞 Support & Troubleshooting

### Common Issues

1. **Server won't start**: Check if ports are available
2. **Authentication errors**: Verify environment variables
3. **Connection refused**: Ensure servers are running

### Debug Mode

```bash
# Start with verbose logging
python mcp_server_manager.py start --verbose

# Check individual server logs
tail -f calendly-mcp/logs/server.log
```

### Getting Help

- Check server status: `python mcp_server_manager.py status`
- Review environment variables
- Verify API credentials are valid
- Check network connectivity to external APIs

---

## 📝 Example Integration Patterns

### Event Synchronization
```javascript
// Sync events across platforms
const syncEvents = async () => {
    const googleEvents = await google.callTool('list_events', {
        calendar_id: 'primary'
    });
    
    const outlookEvents = await outlook.callTool('list_events', {
        calendar_id: 'primary'
    });
    
    // Merge and deduplicate events
    const allEvents = mergeEvents(googleEvents, outlookEvents);
    return allEvents;
};
```

### Availability Checking
```javascript
// Check availability across all platforms
const checkAvailability = async (startTime, endTime) => {
    const [googleBusy, outlookBusy, calendlyBusy] = await Promise.all([
        google.callTool('list_events', { time_min: startTime, time_max: endTime }),
        outlook.callTool('list_events', { start_time: startTime, end_time: endTime }),
        calendly.callTool('list_scheduled_events', { start_time: startTime, end_time: endTime })
    ]);
    
    return calculateAvailability(googleBusy, outlookBusy, calendlyBusy);
};
```

---

*This documentation covers the complete integration process. For additional support or custom implementations, refer to the individual server README files or contact the development team.* 