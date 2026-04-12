/**
 * EzDoc - LINE Draft Reply (DEPRECATED)
 * 
 * REFACTORED: All builders moved to ui/quickReplies.ts
 * This file is kept for backward compatibility only.
 */

import { type QuickReplyAction } from "./lineQuickReply";

/**
 * @deprecated Use getDraftEditorButtons() from ui/quickReplies.ts
 */
export function buildDraftEditorQuickReply(): QuickReplyAction[] {
  const { getDraftEditorButtons } = require('../ui/quickReplies');
  return getDraftEditorButtons();
}

/**
 * @deprecated Use getDraftSummaryButtons() from ui/quickReplies.ts
 */
export function buildDraftSummaryQuickReply(): QuickReplyAction[] {
  const { getDraftSummaryButtons } = require('../ui/quickReplies');
  return getDraftSummaryButtons();
}
