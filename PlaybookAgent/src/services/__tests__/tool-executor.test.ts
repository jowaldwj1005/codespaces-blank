/**
 * Tool Executor Tests
 *
 * Verifies tool routing, event emission, and error handling.
 * These tests check the structure and logic of toolExecutor.ts
 * without requiring live Dataverse/connector connections.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../..');

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_DIR, relativePath), 'utf-8');
}

describe('Tool Executor routing', () => {
  const content = readSrc('services/toolExecutor.ts');

  it('routes InternalReact to builtin tools', () => {
    expect(content).toContain("case 'InternalReact'");
    expect(content).toContain('executeBuiltinTool');
  });

  it('routes CustomConnector to connector handlers', () => {
    expect(content).toContain("case 'CustomConnector'");
    expect(content).toContain('executeConnectorTool');
  });

  it('routes CloudFlow to cloud flow handler', () => {
    expect(content).toContain("case 'CloudFlow'");
    expect(content).toContain('executeCloudFlowTool');
  });

  it('throws on unknown endpoint type', () => {
    expect(content).toContain('Unknown endpoint type');
  });
});

describe('Connector handler registry', () => {
  const content = readSrc('services/toolExecutor.ts');

  it('has handler for AzureOpenAI.createResponse', () => {
    expect(content).toContain("'AzureOpenAI.createResponse'");
  });

  it('has handler for AzureDocIntelligence.analyzeDocument', () => {
    expect(content).toContain("'AzureDocIntelligence.analyzeDocument'");
  });

  it('has handler for AzureDocIntelligence.analyzeAndWait', () => {
    expect(content).toContain("'AzureDocIntelligence.analyzeAndWait'");
  });

  it('has handler for AzureDocIntelligence.getAnalyzeResult', () => {
    expect(content).toContain("'AzureDocIntelligence.getAnalyzeResult'");
  });

  it('has handler for SAPOData.execute', () => {
    expect(content).toContain("'SAPOData.execute'");
  });

  it('throws when connector target is unknown', () => {
    expect(content).toContain('No handler for connector target');
  });
});

describe('Builtin tool registry completeness', () => {
  const content = readSrc('services/builtinTools.ts');

  const EXPECTED_TOOLS = [
    'create_visual',
    'exit',
    'search_dataverse',
    'get_table_schema',
    'execute_dataverse_query',
    'run_data_code',
    'cross_table_analysis',
    'create_dataverse_record',
    'update_dataverse_record',
  ];

  it('BUILTIN_TOOLS registry has all expected tools', () => {
    for (const tool of EXPECTED_TOOLS) {
      expect(content, `Missing builtin tool handler: ${tool}`).toMatch(
        new RegExp(`['"]?${tool}['"]?:\\s*handle`)
      );
    }
  });

  it('BUILTIN_TOOL_DEFINITIONS matches BUILTIN_TOOLS', () => {
    // Every handler should have a matching definition
    for (const tool of EXPECTED_TOOLS) {
      expect(content, `Missing tool definition for: ${tool}`).toContain(`name: '${tool}'`);
    }
  });
});

describe('Tool executor emits debug events for connector calls', () => {
  const content = readSrc('services/toolExecutor.ts');

  it('emits debug events before and after connector execution', () => {
    expect(content).toContain('emitDebugEvent');
    // Should have both pending and success/error events
    expect(content).toContain("status: 'pending'");
    expect(content).toContain("status: 'success'");
    expect(content).toContain("status: 'error'");
  });
});

describe('HitL approval flow', () => {
  const content = readSrc('services/toolExecutor.ts');

  it('checks requiresApproval flag', () => {
    expect(content).toContain('tool.requiresApproval');
  });

  it('supports edited args from approval', () => {
    expect(content).toContain('decision.editedArgs');
  });

  it('returns rejection response when denied', () => {
    expect(content).toContain("'Tool call rejected by user'");
  });

  it('emits audit records via onToolExecuted', () => {
    expect(content).toContain('config.onToolExecuted');
  });
});
