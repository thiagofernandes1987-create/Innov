export type ObjectState = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'DEPRECATED' | 'ARCHIVED';
export type ObjectEvent = 'SUBMIT_REVIEW' | 'RETURN_DRAFT' | 'PUBLISH' | 'DEPRECATE' | 'ARCHIVE';

export interface TransitionContext {
  expectedVersion: number;
  currentVersion: number;
  authorized: boolean;
  schemaValid?: boolean;
  noBreakingChanges?: boolean;
  reasonCode?: string;
}

export class LifecycleError extends Error {
  constructor(public readonly code: string) { super(code); }
}

const transitions: Record<ObjectState, Partial<Record<ObjectEvent, ObjectState>>> = {
  DRAFT: { SUBMIT_REVIEW: 'IN_REVIEW' },
  IN_REVIEW: { RETURN_DRAFT: 'DRAFT', PUBLISH: 'PUBLISHED' },
  PUBLISHED: { DEPRECATE: 'DEPRECATED' },
  DEPRECATED: { ARCHIVE: 'ARCHIVED' },
  ARCHIVED: {},
};

const reasonRequired = new Set<ObjectEvent>(['RETURN_DRAFT', 'DEPRECATE', 'ARCHIVE']);

export function transitionObject(state: ObjectState, event: ObjectEvent, context: TransitionContext): ObjectState {
  if (!context.authorized) throw new LifecycleError('FORBIDDEN');
  if (context.expectedVersion !== context.currentVersion) throw new LifecycleError('VERSION_CONFLICT');
  if (reasonRequired.has(event) && !context.reasonCode?.trim()) throw new LifecycleError('REASON_REQUIRED');
  if (event === 'PUBLISH' && context.schemaValid !== true) throw new LifecycleError('SCHEMA_INVALID');
  if (event === 'PUBLISH' && context.noBreakingChanges !== true) throw new LifecycleError('BREAKING_CHANGE_UNAPPROVED');
  const next = transitions[state][event];
  if (!next) throw new LifecycleError('INVALID_TRANSITION');
  return next;
}
