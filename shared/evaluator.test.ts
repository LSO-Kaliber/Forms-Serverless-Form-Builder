import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  evaluateConditionGroup,
  getNextPageId,
  detectJumpCycles,
  filterVisibleAnswersAndFiles,
} from './evaluator';
import type { FormSchema } from './types';

describe('Logic Evaluator', () => {
  it('evaluates conditions correctly (eq, neq, contains, empty, notEmpty)', () => {
    // eq
    expect(evaluateCondition({ fieldId: 'role', operator: 'eq', value: 'admin' }, { role: 'admin' })).toBe(true);
    expect(evaluateCondition({ fieldId: 'role', operator: 'eq', value: 'user' }, { role: 'admin' })).toBe(false);

    // eq with array (checkbox)
    expect(evaluateCondition({ fieldId: 'skills', operator: 'eq', value: 'vue' }, { skills: ['vue', 'node'] })).toBe(true);
    expect(evaluateCondition({ fieldId: 'skills', operator: 'eq', value: 'react' }, { skills: ['vue', 'node'] })).toBe(false);

    // neq
    expect(evaluateCondition({ fieldId: 'role', operator: 'neq', value: 'admin' }, { role: 'user' })).toBe(true);

    // contains
    expect(evaluateCondition({ fieldId: 'name', operator: 'contains', value: 'kal' }, { name: 'LSO Kaliber' })).toBe(true);
    expect(evaluateCondition({ fieldId: 'name', operator: 'contains', value: 'xyz' }, { name: 'LSO Kaliber' })).toBe(false);

    // empty / notEmpty
    expect(evaluateCondition({ fieldId: 'notes', operator: 'empty' }, { notes: '' })).toBe(true);
    expect(evaluateCondition({ fieldId: 'notes', operator: 'empty' }, { notes: undefined })).toBe(true);
    expect(evaluateCondition({ fieldId: 'notes', operator: 'notEmpty' }, { notes: 'ada' })).toBe(true);
    expect(evaluateCondition({ fieldId: 'notes', operator: 'notEmpty' }, { notes: [] })).toBe(false);
  });

  it('evaluates condition groups with AND and OR', () => {
    const groupAnd = {
      logicalOperator: 'AND' as const,
      conditions: [
        { fieldId: 'f1', operator: 'eq' as const, value: 'A' },
        { fieldId: 'f2', operator: 'eq' as const, value: 'B' },
      ],
    };
    expect(evaluateConditionGroup(groupAnd, { f1: 'A', f2: 'B' })).toBe(true);
    expect(evaluateConditionGroup(groupAnd, { f1: 'A', f2: 'C' })).toBe(false);

    const groupOr = {
      logicalOperator: 'OR' as const,
      conditions: [
        { fieldId: 'f1', operator: 'eq' as const, value: 'A' },
        { fieldId: 'f2', operator: 'eq' as const, value: 'B' },
      ],
    };
    expect(evaluateConditionGroup(groupOr, { f1: 'A', f2: 'C' })).toBe(true);
    expect(evaluateConditionGroup(groupOr, { f1: 'X', f2: 'Y' })).toBe(false);
  });

  it('calculates next page id and jumps', () => {
    const schema: FormSchema = {
      pages: [
        {
          id: 'p1',
          title: 'Page 1',
          fields: [{ id: 'choice', type: 'radio', label: 'Lanjut?', required: true }],
          pageJumpRules: [
            {
              id: 'j1',
              conditionGroup: {
                logicalOperator: 'AND',
                conditions: [{ fieldId: 'choice', operator: 'eq', value: 'skip' }],
              },
              targetPageId: 'p3',
            },
          ],
        },
        {
          id: 'p2',
          title: 'Page 2',
          fields: [],
        },
        {
          id: 'p3',
          title: 'Page 3',
          fields: [],
        },
      ],
    };

    // When condition matches, jump to p3
    expect(getNextPageId('p1', schema, { choice: 'skip' })).toBe('p3');
    // When condition doesn't match, sequentially advance to p2
    expect(getNextPageId('p1', schema, { choice: 'normal' })).toBe('p2');
    // Last page returns SUBMIT
    expect(getNextPageId('p3', schema, {})).toBe('SUBMIT');
  });

  it('detects cycles in page jump rules', () => {
    const schemaWithCycle: FormSchema = {
      pages: [
        {
          id: 'p1',
          title: 'Page 1',
          fields: [],
          pageJumpRules: [
            {
              id: 'j1',
              conditionGroup: { logicalOperator: 'AND', conditions: [] },
              targetPageId: 'p2',
            },
          ],
        },
        {
          id: 'p2',
          title: 'Page 2',
          fields: [],
          pageJumpRules: [
            {
              id: 'j2',
              conditionGroup: { logicalOperator: 'AND', conditions: [] },
              targetPageId: 'p1', // Back to p1 forms a cycle
            },
          ],
        },
      ],
    };

    const result = detectJumpCycles(schemaWithCycle);
    expect(result.hasCycle).toBe(true);
    expect(result.error).toBe('SIKLUS_LOMPAT_HALAMAN');

    const schemaWithoutCycle: FormSchema = {
      pages: [
        { id: 'p1', title: 'P1', fields: [], pageJumpRules: [{ id: 'j', conditionGroup: { logicalOperator: 'AND', conditions: [] }, targetPageId: 'p2' }] },
        { id: 'p2', title: 'P2', fields: [] },
      ],
    };
    expect(detectJumpCycles(schemaWithoutCycle).hasCycle).toBe(false);
  });

  it('filters visible answers and identifies hidden fields', () => {
    const schema: FormSchema = {
      pages: [
        {
          id: 'p1',
          title: 'Page 1',
          fields: [
            { id: 'f_show', type: 'text', label: 'Show', required: true },
            {
              id: 'f_extra',
              type: 'text',
              label: 'Extra',
              required: true,
              visibleIf: {
                logicalOperator: 'AND',
                conditions: [{ fieldId: 'f_show', operator: 'eq', value: 'yes' }],
              },
            },
            { id: 'f_archived', type: 'text', label: 'Archived', required: false, archived: true },
          ],
        },
      ],
    };

    // When f_show is 'no', f_extra should be hidden
    const res1 = filterVisibleAnswersAndFiles(schema, { f_show: 'no', f_extra: 'secret', f_archived: 'old' });
    expect(res1.visibleAnswers).toEqual({ f_show: 'no' });
    expect(res1.hiddenFieldIds).toContain('f_extra');
    expect(res1.hiddenFieldIds).toContain('f_archived');

    // When f_show is 'yes', f_extra should be visible
    const res2 = filterVisibleAnswersAndFiles(schema, { f_show: 'yes', f_extra: 'open' });
    expect(res2.visibleAnswers).toEqual({ f_show: 'yes', f_extra: 'open' });
    expect(res2.hiddenFieldIds).not.toContain('f_extra');
  });
});
