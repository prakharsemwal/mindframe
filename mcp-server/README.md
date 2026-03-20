# Mindframe MCP Server

An MCP (Model Context Protocol) server that allows Claude to interact directly with Mindframe - creating nodes, reading project context, and managing mind maps from within conversations.

## Prerequisites

- Node.js 18+
- Mindframe dev server running on `localhost:3001`

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mindframe": {
      "command": "node",
      "args": ["/Users/prakhar/Desktop/Mindframe/mcp-server/dist/index.js"],
      "env": {
        "MINDFRAME_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

### Claude Code

The MCP server will be automatically available when configured in your Claude settings.

## Available Tools

### Read Operations

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_workspaces` | Get all workspaces | none |
| `list_projects` | Get projects in workspace | `workspaceId` |
| `get_project` | Get project with nodes/edges | `projectId` |
| `search_nodes` | Search nodes by text | `projectId`, `query` |

### Write Operations

| Tool | Description | Parameters |
|------|-------------|------------|
| `create_workspace` | Create new workspace | `name` |
| `create_project` | Create new project | `name`, `workspaceId` |
| `create_node` | Create single node | `projectId`, `title`, `body`, `tag?`, `position?` |
| `create_nodes` | Batch create nodes | `projectId`, `nodes[]` |
| `create_edge` | Connect two nodes | `projectId`, `sourceId`, `targetId` |
| `update_node` | Update existing node | `projectId`, `nodeId`, `title?`, `body?`, `tag?`, `bgColor?` |
| `delete_node` | Remove a node | `projectId`, `nodeId` |

### Conversation Import

| Tool | Description | Parameters |
|------|-------------|------------|
| `import_conversation` | Parse text into structured nodes | `projectId`, `conversation`, `context?` |

## Node Tags

Nodes can be tagged with one of four categories:

- **commit** - "Use this" - Decisions or ideas to implement
- **discard** - "Don't use" - Rejected ideas
- **hold** - "Park it" - Ideas to consider later
- **reference** - Background information or context

## Example Usage

### List workspaces

```
"List my Mindframe workspaces"
```

### Create nodes from discussion points

```
"Add these key points from our discussion to my 'Product Strategy' project in Mindframe:
- Focus on enterprise customers first
- Build API before UI
- Target Q3 launch"
```

### Import a conversation

```
"Import this meeting summary into my Mindframe project:

Decision: Use PostgreSQL for the database
Question: Should we add caching layer?
Rejected: MongoDB - doesn't fit our relational needs
Note: Team prefers familiar tech stack"
```

### Search existing nodes

```
"Search for nodes about 'authentication' in my project"
```

## Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Run the server directly
npm start
```

## Troubleshooting

### "Connection refused" errors

Make sure Mindframe is running:
```bash
cd /Users/prakhar/Desktop/Mindframe
npm run dev
```

### Tools not appearing in Claude

1. Check that the MCP server is built: `npm run build`
2. Verify the path in your Claude config is correct
3. Restart Claude Desktop/Claude Code

### API errors

Check the Mindframe dev server logs for more details on what went wrong.
