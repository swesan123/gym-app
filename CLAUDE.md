@AGENTS.md

## GitHub Operations

Always use GitHub MCP tools instead of the `gh` CLI:
- Use `mcp__github__search_issues` to find issues
- Use `mcp__github__update_issue` to close/update issues
- Use `mcp__github__create_pull_request` for PRs
- Use other `mcp__github__*` tools for GitHub operations

This ensures consistent authentication and works reliably in all contexts.
