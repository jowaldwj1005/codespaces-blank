/**
 * Dataverse Field Type Guards
 *
 * These tests prevent the recurring bug where choice fields (jw_status, jw_requiresapproval, etc.)
 * are passed as the wrong type (number instead of string, boolean instead of integer).
 *
 * Run: npm test
 * These tests read source files directly and grep for patterns — no mocking needed.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../..');

/** Read a source file and return its content */
function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_DIR, relativePath), 'utf-8');
}

/** Find all occurrences of a pattern and return line numbers + content */
function findPattern(content: string, pattern: RegExp): { line: number; text: string }[] {
  const lines = content.split('\n');
  const matches: { line: number; text: string }[] = [];
  lines.forEach((text, i) => {
    if (pattern.test(text)) {
      matches.push({ line: i + 1, text: text.trim() });
    }
  });
  return matches;
}

describe('jw_status must always be a string value', () => {
  const STATUS_FILES = [
    'services/builtinTools.ts',
    'components/semantic/CaseDashboard.tsx',
    'components/semantic/PlaybookProgress.tsx',
    'hooks/useCaseManager.ts',
    'services/seedData.ts',
  ];

  for (const file of STATUS_FILES) {
    it(`${file} — no numeric jw_status assignments`, () => {
      const content = readSrc(file);
      // Match: jw_status: 100000000 or jw_status: 100000001 (without quotes)
      const badAssignments = findPattern(content, /jw_status:\s*\d{9}/);
      // Filter out string versions like jw_status: '100000000'
      const actualBad = badAssignments.filter(m => !m.text.includes("'") && !m.text.includes('"'));

      expect(actualBad, `Found numeric jw_status in ${file}:\n${actualBad.map(m => `  Line ${m.line}: ${m.text}`).join('\n')}`).toHaveLength(0);
    });
  }

  it('CaseDashboard STATUS_MAP uses string keys', () => {
    const content = readSrc('components/semantic/CaseDashboard.tsx');
    const mapDecl = findPattern(content, /STATUS_MAP:\s*Record</);
    expect(mapDecl.length).toBeGreaterThan(0);
    expect(mapDecl[0].text).toContain('Record<string');
  });

  it('useCaseManager THREAD_STATUS_MAP uses string keys', () => {
    const content = readSrc('hooks/useCaseManager.ts');
    const mapDecl = findPattern(content, /THREAD_STATUS_MAP:\s*Record</);
    expect(mapDecl.length).toBeGreaterThan(0);
    expect(mapDecl[0].text).toContain('Record<string');
  });

  it('PlaybookProgress caseStatus type is string, not number', () => {
    const content = readSrc('components/semantic/PlaybookProgress.tsx');
    const typeDecl = findPattern(content, /caseStatus:\s*(number|string)/);
    expect(typeDecl.length).toBeGreaterThan(0);
    expect(typeDecl[0].text).toContain('string');
  });
});

describe('Seed data choice fields must be integers, not booleans', () => {
  it('jw_requiresapproval uses 0 or 1, never true/false', () => {
    const content = readSrc('services/seedData.ts');
    const booleanValues = findPattern(content, /jw_requiresapproval:\s*(true|false)\b/);
    expect(booleanValues, `Found boolean jw_requiresapproval:\n${booleanValues.map(m => `  Line ${m.line}: ${m.text}`).join('\n')}`).toHaveLength(0);
  });

  it('jw_allowmcp uses 0 or 1, never true/false', () => {
    const content = readSrc('services/seedData.ts');
    const booleanValues = findPattern(content, /jw_allowmcp:\s*(true|false)\b/);
    expect(booleanValues, `Found boolean jw_allowmcp:\n${booleanValues.map(m => `  Line ${m.line}: ${m.text}`).join('\n')}`).toHaveLength(0);
  });
});

describe('OData filter strings use escapeOData', () => {
  it('builtinTools.ts imports escapeOData', () => {
    const content = readSrc('services/builtinTools.ts');
    expect(content).toContain('escapeOData');
  });
});
