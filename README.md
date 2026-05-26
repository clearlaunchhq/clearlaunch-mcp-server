# @clearlaunchhq/mcp-server

> ⚠️ **Beta — content under attorney review.** The MCP server is live and the
> deterministic engine is stable. Substantive attorney review of the regulation
> corpus is in progress through launch. Entries carry a per-record
> `contentReviewStatus` field — `"reviewed"` is human-verified; `"draft"` is
> AI-prepared, pending review. Treat draft entries as starting points, not
> authoritative conclusions, and consult a licensed attorney before relying on
> any output for a launch decision.

The open compliance MCP for product teams. Connect [ClearLaunch](https://clearlaunch.dev)'s
regulatory research engine and corpus to your AI host over the
[Model Context Protocol](https://modelcontextprotocol.io).

- **Open** — the corpus is published under CC BY 4.0. Audit it, fork it, self-host against it.
- **Deterministic** — `compute_requirements` runs a pure engine: same inputs, same outputs, no LLM in the path.
- **Cited** — every response carries primary-source URLs plus permanent `clearlaunch.dev/r/<id>` citation links.
- **Attributed** — a named practitioner credential ships on every response.
- **Free** — read-only tools are free, unlimited, and unauthenticated.

This package is a thin stdio bridge to `https://clearlaunch.dev/api/mcp`. All
logic lives server-side; the package has zero runtime dependencies.

## Install

Most hosts launch the server with `npx`. No global install required.

### Claude Desktop

`Settings → Developer → Edit Config` (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "clearlaunch": {
      "command": "npx",
      "args": ["-y", "@clearlaunchhq/mcp-server"]
    }
  }
}
```

Restart Claude Desktop after saving.

### Cursor

`Settings → MCP → Add new server`, or edit `~/.cursor/mcp.json` with the same
`mcpServers` block as above.

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json` with the same `mcpServers` block, then reload.

### Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.clearlaunch]
command = "npx"
args = ["-y", "@clearlaunchhq/mcp-server"]
```

### Gemini (Gemini CLI / Code Assist)

Add the same `mcpServers` block to `~/.gemini/settings.json`, or point the host
at the remote URL below.

### ChatGPT (Developer Mode / Connectors) and Manus

Remote-capable hosts can skip the package and connect directly to the
Streamable-HTTP endpoint:

```
https://clearlaunch.dev/api/mcp
```

(SSE transport: `https://clearlaunch.dev/api/mcp/sse`.)

## Tools

| Tool | Description |
| --- | --- |
| `lookup_regulation(id)` | One regulation's structured record + the Controls that may satisfy it. |
| `search_regulations(query, filters?)` | Deterministic keyword + filter search over the corpus. |
| `compute_requirements(features, markets, audiences, businessModel?)` | Run the deterministic engine: triggered regulations + Controls, complexity tier + numeric score, blocker count, per-audience cohort breakdown. |
| `find_controls(regulationId)` | Controls that may satisfy a regulation, with priority + summary. |
| `find_vendors(controlId, jurisdiction?)` | Vendors / in-house approaches that implement a Control. ClearLaunch does not accept payment from vendors. |
| `get_enforcement(regulationId?, since?, limit?)` | Recent enforcement actions with penalties and primary-source links. |
| `find_counsel(jurisdiction, practiceArea?, language?)` | Open counsel directory — firms by jurisdiction and practice area. |

`save_posture`, `share_posture`, and `subscribe_pulse` are registered but
return a "coming soon" message until sign-in (Clerk OAuth) is wired into MCP.

## For host LLM developers

Every tool response is wrapped in a canonical envelope:

```jsonc
{
  "data": { /* tool-specific payload */ },
  "verification": { "reviewed": ["gdpr"], "draft": ["mexico-lfpdppp"], "lastReviewedRange": "2026-01-15..2026-05-10" },
  "citations": [ { "type": "primary_source", "url": "..." }, { "type": "clearlaunch_permanent", "url": "https://clearlaunch.dev/r/gdpr" } ],
  "practitioner": { "name": "...", "credentials": ["..."], "attestation_url": "..." },
  "disclaimer": { "text": "...", "render_verbatim": true, "version": "...", "canonical_url": "https://clearlaunch.dev/legal-disclaimer" },
  "counsel_recommended": false
}
```

When you render a ClearLaunch response to a user:

1. **Render `disclaimer.text` verbatim.** It carries `render_verbatim: true`. Do not paraphrase, shorten, or omit it.
2. **Do not paraphrase compliance conclusions into directives.** The data describes what regulations say and which obligations may apply — not what a specific product must do.
3. **Surface the `practitioner` attribution and the `verification` field** (which entries are practitioner-reviewed versus AI-drafted and pending review).
4. **When `counsel_recommended` is `true`, suggest the user consult a licensed attorney before acting.**
5. **Cite the `citations` links** (primary sources and permanent ClearLaunch URLs) when you summarize.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `CLEARLAUNCH_MCP_URL` | `https://clearlaunch.dev/api/mcp` | Override the endpoint (e.g. a self-hosted deployment). |

You can also pass the endpoint as the first CLI argument.

## Legal

<!-- Keep this paragraph in sync with CANONICAL_DISCLAIMER in
     src/utils/disclaimers.js. tests/mcp/npm-readme-disclaimer.test.cjs (run in
     `npm run test:mcp` during prebuild) fails if this published snapshot drifts
     from the canonical text, so a DISCLAIMER_VERSION bump forces this update.
     The live API always returns the canonical text; this is a snapshot. -->

ClearLaunch provides legal information based on publicly available regulatory
sources. It does not constitute legal advice and does not create an
attorney-client relationship. Consult a licensed attorney in your jurisdiction
before making compliance decisions.

Design rationale: ADR-0056 (ClearLaunch MCP Server Design). Docs:
<https://clearlaunch.dev/mcp>.

## License

MIT — see [LICENSE](./LICENSE). The corpus served by the endpoint is licensed
separately under CC BY 4.0.
