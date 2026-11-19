import type { Condition, ConditionGroup, FormField, FormPage, FormSchema } from './types';

export function evaluateCondition(cond: Condition, answers: Record<string, any>): boolean {
  if (!cond || !cond.fieldId) return true;
  const rawValue = answers[cond.fieldId];

  const isEmpty =
    rawValue === undefined ||
    rawValue === null ||
    rawValue === '' ||
    (Array.isArray(rawValue) && rawValue.length === 0);

  switch (cond.operator) {
    case 'empty':
      return isEmpty;

    case 'notEmpty':
      return !isEmpty;

    case 'eq': {
      if (isEmpty) return false;
      if (Array.isArray(rawValue)) {
        return rawValue.some((item) => String(item).trim() === String(cond.value).trim());
      }
      return String(rawValue).trim() === String(cond.value).trim();
    }

    case 'neq': {
      if (isEmpty) return true;
      if (Array.isArray(rawValue)) {
        return !rawValue.some((item) => String(item).trim() === String(cond.value).trim());
      }
      return String(rawValue).trim() !== String(cond.value).trim();
    }

    case 'contains': {
      if (isEmpty) return false;
      const target = String(cond.value ?? '').toLowerCase();
      if (Array.isArray(rawValue)) {
        return rawValue.some((item) => String(item).toLowerCase().includes(target));
      }
      return String(rawValue).toLowerCase().includes(target);
    }

    default:
      return true;
  }
}

export function evaluateConditionGroup(
  group: ConditionGroup | undefined | null,
  answers: Record<string, any>
): boolean {
  if (!group || !Array.isArray(group.conditions) || group.conditions.length === 0) {
    return true;
  }

  if (group.logicalOperator === 'OR') {
    return group.conditions.some((cond) => evaluateCondition(cond, answers));
  }

  // Default: AND
  return group.conditions.every((cond) => evaluateCondition(cond, answers));
}

export function isPageVisible(page: FormPage, answers: Record<string, any>): boolean {
  if (!page) return false;
  return evaluateConditionGroup(page.visibleIf, answers);
}

export function isFieldVisible(field: FormField, page: FormPage, answers: Record<string, any>): boolean {
  if (!field || field.archived) return false;
  if (!isPageVisible(page, answers)) return false;
  return evaluateConditionGroup(field.visibleIf, answers);
}

export function getNextPageId(
  currentPageId: string,
  schema: FormSchema,
  answers: Record<string, any>
): string | 'SUBMIT' | null {
  const currentIndex = schema.pages.findIndex((p) => p.id === currentPageId);
  if (currentIndex === -1) return null;

  const currentPage = schema.pages[currentIndex];

  // 1. Check custom jump rules on current page
  if (currentPage.pageJumpRules && currentPage.pageJumpRules.length > 0) {
    for (const rule of currentPage.pageJumpRules) {
      if (evaluateConditionGroup(rule.conditionGroup, answers)) {
        return rule.targetPageId;
      }
    }
  }

  // 2. Fallback: find next visible page in order
  for (let i = currentIndex + 1; i < schema.pages.length; i++) {
    const candidate = schema.pages[i];
    if (isPageVisible(candidate, answers)) {
      return candidate.id;
    }
  }

  return 'SUBMIT';
}

export function detectJumpCycles(schema: FormSchema): { hasCycle: boolean; error?: string } {
  if (!schema || !schema.pages || schema.pages.length === 0) {
    return { hasCycle: false };
  }

  const pageIds = new Set(schema.pages.map((p) => p.id));
  const adj = new Map<string, string[]>();

  for (let i = 0; i < schema.pages.length; i++) {
    const page = schema.pages[i];
    const targets: string[] = [];

    // Jump rules
    if (page.pageJumpRules) {
      for (const rule of page.pageJumpRules) {
        if (rule.targetPageId && rule.targetPageId !== 'SUBMIT' && pageIds.has(rule.targetPageId)) {
          targets.push(rule.targetPageId);
        }
      }
    }

    // Default sequential transition to next page
    if (i + 1 < schema.pages.length) {
      targets.push(schema.pages[i + 1].id);
    }

    adj.set(page.id, targets);
  }

  // Detect cycle using DFS (0 = unvisited, 1 = visiting/in stack, 2 = visited)
  const state = new Map<string, number>();
  for (const pageId of pageIds) {
    state.set(pageId, 0);
  }

  function dfs(u: string): boolean {
    state.set(u, 1);
    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      const vState = state.get(v) || 0;
      if (vState === 1) {
        return true; // Cycle detected
      }
      if (vState === 0) {
        if (dfs(v)) return true;
      }
    }
    state.set(u, 2);
    return false;
  }

  for (const pageId of pageIds) {
    if ((state.get(pageId) || 0) === 0) {
      if (dfs(pageId)) {
        return {
          hasCycle: true,
          error: 'SIKLUS_LOMPAT_HALAMAN',
        };
      }
    }
  }

  return { hasCycle: false };
}

export function filterVisibleAnswersAndFiles(
  schema: FormSchema,
  answers: Record<string, any>
): { visibleAnswers: Record<string, any>; hiddenFieldIds: string[] } {
  // Use fixed-point iteration so cascading field dependencies
  // (e.g. Field C depends on Field B, which depends on Field A)
  // are properly resolved when upstream fields become hidden.
  const activeAnswers = { ...answers };
  let hiddenSet = new Set<string>();

  const maxPasses = 20; // safety ceiling for cyclic or deep dependencies
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    const currentPassHidden = new Set<string>();

    for (const page of schema.pages) {
      const pageIsVis = isPageVisible(page, activeAnswers);
      for (const field of page.fields) {
        if (field.archived) {
          currentPassHidden.add(field.id);
          continue;
        }

        if (pageIsVis && evaluateConditionGroup(field.visibleIf, activeAnswers)) {
          // Visible in this pass
        } else {
          currentPassHidden.add(field.id);
          if (activeAnswers[field.id] !== undefined) {
            delete activeAnswers[field.id];
            changed = true;
          }
        }
      }
    }

    hiddenSet = currentPassHidden;
    if (!changed) break;
  }

  const visibleAnswers: Record<string, any> = {};
  for (const [key, val] of Object.entries(activeAnswers)) {
    if (!hiddenSet.has(key)) {
      visibleAnswers[key] = val;
    }
  }

  return {
    visibleAnswers,
    hiddenFieldIds: Array.from(hiddenSet),
  };
}
