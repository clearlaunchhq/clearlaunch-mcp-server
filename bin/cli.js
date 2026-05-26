#!/usr/bin/env node
'use strict'

/*
 * @clearlaunchhq/mcp-server
 *
 * A thin MCP stdio<->HTTP bridge. Host clients (Claude Desktop, Cursor,
 * Windsurf, Codex, Gemini, ...) spawn this over stdio; it forwards each
 * JSON-RPC message to the ClearLaunch Streamable-HTTP endpoint and writes the
 * response back to stdout. All engine + corpus logic lives server-side
 * (ADR-0056 § Architecture); this package adds no logic of its own, which is
 * why it has zero runtime dependencies (Node >= 18 built-ins only).
 *
 * Endpoint resolution order:
 *   1. CLEARLAUNCH_MCP_URL environment variable
 *   2. first CLI argument
 *   3. default: https://clearlaunch.dev/api/mcp
 */

const readline = require('node:readline')

const DEFAULT_ENDPOINT = 'https://clearlaunch.dev/api/mcp'
const ENDPOINT = process.env.CLEARLAUNCH_MCP_URL || process.argv[2] || DEFAULT_ENDPOINT

if (typeof fetch !== 'function') {
  process.stderr.write(
    'clearlaunch-mcp-server requires Node 18+ (global fetch). Please upgrade Node.\n',
  )
  process.exit(1)
}

function send(obj) {
  // MCP stdio framing: one JSON message per line, no embedded newlines.
  process.stdout.write(JSON.stringify(obj) + '\n')
}

function errorResponse(id, code, message) {
  return { jsonrpc: '2.0', id: id === undefined ? null : id, error: { code, message } }
}

async function forward(message) {
  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'clearlaunch-mcp-server',
      },
      body: JSON.stringify(message),
    })
  } catch (err) {
    return errorResponse(
      message.id,
      -32603,
      `ClearLaunch MCP request failed: ${err && err.message ? err.message : 'network error'} (endpoint: ${ENDPOINT})`,
    )
  }

  // 202 Accepted = nothing to return (notifications/responses-only batch).
  if (res.status === 202) return null

  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return errorResponse(
      message.id,
      -32603,
      `ClearLaunch returned a non-JSON response (HTTP ${res.status}).`,
    )
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })

rl.on('line', async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return

  let message
  try {
    message = JSON.parse(trimmed)
  } catch {
    send(errorResponse(null, -32700, 'Parse error: stdin line is not valid JSON.'))
    return
  }

  // A single notification (object, no id) expects no reply and needs no round
  // trip. A batch (array) always carries messages to forward — the HTTP server
  // handles batches — so never short-circuit an array here. (MCP stdio clients
  // send one message per line, so batches are unusual over this bridge, but
  // dropping one silently would be wrong.)
  if (!Array.isArray(message) && message && message.id === undefined) return

  const response = await forward(message)
  if (response !== null) send(response)
})

rl.on('close', () => process.exit(0))
