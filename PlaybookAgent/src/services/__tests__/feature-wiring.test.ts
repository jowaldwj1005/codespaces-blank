/**
 * Feature Wiring Tests
 *
 * Verify that built features are actually connected end-to-end.
 * These tests read source files and check for the presence of wiring code.
 *
 * Each test documents a past bug where a feature was built but never connected.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../..');

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_DIR, relativePath), 'utf-8');
}

describe('create_visual → VisualizationCard wiring', () => {
  it('toolExecutor emits visual_created event after create_visual', () => {
    const content = readSrc('services/toolExecutor.ts');
    expect(content).toContain("tool.name === 'create_visual'");
    expect(content).toContain("type: 'visual_created'");
  });

  it('ToolCallCard imports and renders VisualizationCard', () => {
    const content = readSrc('components/chat/ToolCallCard.tsx');
    expect(content).toContain('VisualizationCard');
    expect(content).toContain("'create_visual'");
  });

  it('useAgentChat handles visual_created event', () => {
    const content = readSrc('hooks/useAgentChat.ts');
    expect(content).toContain("case 'visual_created'");
    expect(content).toContain('visualizations');
  });
});

describe('run_data_code → Terminal display wiring', () => {
  it('ToolCallCard detects run_data_code and renders terminal', () => {
    const content = readSrc('components/chat/ToolCallCard.tsx');
    expect(content).toContain("'run_data_code'");
    expect(content).toContain('TerminalDisplay');
    expect(content).toContain('tool-call-card__terminal');
  });
});

describe('Citations → MessageBubble wiring', () => {
  it('agentLoop extracts citations from response', () => {
    const content = readSrc('services/agentLoop.ts');
    expect(content).toContain('extractCitations');
    expect(content).toContain('citations');
  });

  it('ChatMessage type includes citations field', () => {
    const content = readSrc('types/agent.ts');
    expect(content).toContain('citations');
    expect(content).toContain('url: string');
  });

  it('MessageBubble renders citations', () => {
    const content = readSrc('components/chat/MessageBubble.tsx');
    expect(content).toContain('message.citations');
    expect(content).toContain('message__citations');
    expect(content).toContain('message__citation-link');
  });
});

describe('CloudFlow tools return honest errors', () => {
  it('executeCloudFlowTool throws an error, not fake success', () => {
    const content = readSrc('services/toolExecutor.ts');
    // Check it throws, not returns
    expect(content).toMatch(/async function executeCloudFlowTool[\s\S]*?throw new Error/);
    // Ensure no "not_implemented" status that masquerades as success
    expect(content).not.toContain("status: 'not_implemented'");
  });
});

describe('Agent event types are complete', () => {
  it('AgentEvent union includes visual_created', () => {
    const content = readSrc('types/agent.ts');
    expect(content).toContain("type: 'visual_created'");
  });

  it('AgentEvent union includes token_update', () => {
    const content = readSrc('types/agent.ts');
    expect(content).toContain("type: 'token_update'");
  });
});

describe('Seed data completeness', () => {
  it('seed data includes all core builtin tools', () => {
    const content = readSrc('services/seedData.ts');
    const requiredTools = [
      'search_dataverse',
      'get_table_schema',
      'execute_dataverse_query',
      'create_visual',
      'run_data_code',
      'cross_table_analysis',
      'create_dataverse_record',
      'update_dataverse_record',
    ];
    for (const tool of requiredTools) {
      expect(content, `Missing seed tool: ${tool}`).toContain(`jw_name: '${tool}'`);
    }
  });

  it('seed data links instructions to playbooks via playbookName', () => {
    const content = readSrc('services/seedData.ts');
    // Every instruction record should have a playbookName field
    const instructionBlocks = content.split("type: 'instruction'").slice(1);
    for (const block of instructionBlocks) {
      const nextChunk = block.slice(0, 200);
      expect(nextChunk, 'Instruction missing playbookName').toContain('playbookName');
    }
  });

  it('seed executor binds instructions to playbooks via OData', () => {
    const content = readSrc('services/seedData.ts');
    expect(content).toContain("jw_playbookid@odata.bind");
    expect(content).toContain('lookupBind');
  });
});
