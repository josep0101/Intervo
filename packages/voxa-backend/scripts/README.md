# Migration Scripts

## Add API Keys to Existing Agents

This script adds secure API keys to all existing agents that don't have one, and copies the same apiKey to corresponding published agents.

### Usage

```bash
# Navigate to the project root directory
cd /path/to/your/project

# Run the migration script
node scripts/addApiKeyToExistingAgents.js
```

### What it does

1. **Connects to MongoDB** using the `MONGODB_URI` from your environment variables
2. **Finds all agents** that don't have an `apiKey` (missing, null, or empty)
3. **Generates secure API keys** using `crypto.randomBytes(32).toString('hex')` (64-character hex string)
4. **Ensures uniqueness** by checking for collisions in both Agent and AgentPublished collections
5. **Updates agents** in the database with their new API keys
6. **Updates corresponding published agents** with the same apiKey (matching by _id)
7. **Provides detailed logging** of the migration progress

### Collections Updated

- **`agents`** - Main agent collection (draft agents)
- **`agents_published`** - Published agent collection (same _id as draft)

Both collections will have the same apiKey for matching agents to ensure consistency.

### Security Features

- **Cryptographically secure**: Uses Node.js `crypto.randomBytes()` 
- **64-character hex strings**: 256 bits of entropy
- **Collision detection**: Automatically handles the rare case of duplicate keys across both collections
- **Unique constraints**: Respects the MongoDB unique index on the apiKey field

### Prerequisites

- MongoDB connection configured via `MONGODB_URI` environment variable
- All necessary dependencies installed (`npm install`)
- Proper access permissions to the database

### Output

The script provides real-time feedback including:
- Number of agents found without API keys
- Success/failure status for each agent
- Count of published agents updated
- Final summary with counts of successful and failed updates

### Safety

- **Non-destructive**: Only adds API keys to agents that don't have them
- **Idempotent**: Safe to run multiple times
- **Transaction-safe**: Each agent update is atomic
- **Error handling**: Continues processing even if individual agents fail
- **Graceful published updates**: Won't fail if published agent doesn't exist 