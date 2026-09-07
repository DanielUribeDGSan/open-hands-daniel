#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import util from "node:util";

const execAsync = util.promisify(exec);

const server = new Server(
  {
    name: "ssh-executor",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper to get active SSH connection details
function getActiveSshContext() {
  const contextPath = path.join(os.homedir(), ".openhands", "openhands_active_ssh.json");
  if (!fs.existsSync(contextPath)) {
    return null;
  }
  try {
    const data = fs.readFileSync(contextPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to parse ssh context:", err);
    return null;
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_ssh_command",
        description:
          "Executes a bash command on the currently connected SSH remote server.",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The bash command to execute on the remote server",
            },
          },
          required: ["command"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "execute_ssh_command") {
    throw new Error("Unknown tool");
  }

  const { command } = request.params.arguments;
  const sshContext = getActiveSshContext();

  if (!sshContext) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No active SSH connection found. Connect to a server first in the UI.",
        },
      ],
      isError: true,
    };
  }

  const { host, user, port, socketPath, identityFile } = sshContext;
  let sshArgs = `-p ${port} -o StrictHostKeyChecking=no`;

  if (socketPath && fs.existsSync(socketPath)) {
    sshArgs += ` -S "${socketPath}"`;
  } else if (identityFile) {
    sshArgs += ` -i "${identityFile}"`;
  } else {
    return {
      content: [
        {
          type: "text",
          text: "Error: No control master socket or identity file found for SSH connection.",
        },
      ],
      isError: true,
    };
  }

  // Escape the command appropriately for SSH
  const escapedCommand = command.replace(/'/g, "'\\''");
  const fullCommand = `ssh ${sshArgs} ${user}@${host} '${escapedCommand}'`;

  try {
    const { stdout, stderr } = await execAsync(fullCommand);
    let resultText = "";
    if (stdout) resultText += `STDOUT:\n${stdout}\n`;
    if (stderr) resultText += `STDERR:\n${stderr}\n`;
    if (!stdout && !stderr) resultText = "Command executed successfully with no output.";

    return {
      content: [
        {
          type: "text",
          text: resultText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Command failed with exit code ${error.code}.\nSTDOUT:\n${error.stdout}\nSTDERR:\n${error.stderr}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
