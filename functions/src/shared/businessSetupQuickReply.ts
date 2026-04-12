/**
 * Business Setup Quick Reply (DEPRECATED)
 * 
 * REFACTORED: All builders moved to ui/quickReplies.ts
 * This file is kept for backward compatibility only.
 */

import { QuickReplyAction } from "./lineQuickReply";

/**
 * @deprecated Use getBusinessSetupSummaryButtons() from ui/quickReplies.ts
 */
export function getBusinessSetupSummaryQuickReply(): QuickReplyAction[] {
  const { getBusinessSetupSummaryButtons } = require('../ui/quickReplies');
  return getBusinessSetupSummaryButtons();
}

/**
 * @deprecated Use getBusinessSetupSavedButtons() from ui/quickReplies.ts
 */
export function getBusinessSetupSavedQuickReply(): QuickReplyAction[] {
  const { getBusinessSetupSavedButtons } = require('../ui/quickReplies');
  return getBusinessSetupSavedButtons();
}

