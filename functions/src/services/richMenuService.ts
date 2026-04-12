/**
 * EzDoc - Rich Menu Service
 * 
 * Manages LINE Rich Menu that stays synchronized with Contextual Quick Reply.
 * Rich Menu is the persistent UI layer, Quick Reply is the contextual layer.
 * 
 * Architecture:
 * - Rich Menu = Always visible, mirrors GLOBAL Quick Reply context
 * - Quick Reply = Context-aware, changes based on user state
 * - Both trigger the same intents for consistency
 */

import { getGlobalMenuButtons } from '../ui/quickReplies';
import { QuickReplyAction } from '../shared/lineQuickReply';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

interface RichMenuArea {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  action: {
    type: 'message';
    text: string;
  };
}

interface RichMenu {
  size: {
    width: number;
    height: number;
  };
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: RichMenuArea[];
}

/**
 * Create or update the global Rich Menu
 * This menu mirrors the GLOBAL Quick Reply context
 */
export async function createOrUpdateGlobalRichMenu(accessToken: string): Promise<string> {
  const globalButtons = getGlobalMenuButtons();
  
  // LINE Rich Menu size: 2500x1686 (full) or 2500x843 (half)
  // We use full size for better UX
  const menuWidth = 2500;
  const menuHeight = 1686;
  const buttonHeight = menuHeight / 3; // 3 buttons vertically stacked
  
  const areas: RichMenuArea[] = globalButtons.map((button: QuickReplyAction, index: number) => ({
    bounds: {
      x: 0,
      y: index * buttonHeight,
      width: menuWidth,
      height: buttonHeight,
    },
    action: {
      type: 'message',
      text: button.action.text, // Same text as Quick Reply
    },
  }));

  const richMenu: RichMenu = {
    size: {
      width: menuWidth,
      height: menuHeight,
    },
    selected: true,
    name: 'EzDoc Global Menu',
    chatBarText: 'เมนู',
    areas,
  };

  // Step 1: Create Rich Menu
  const createResponse = await fetch(`${LINE_API_BASE}/richmenu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(richMenu),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create Rich Menu: ${createResponse.status} ${errorText}`);
  }

  const { richMenuId = '' } = await createResponse.json() as { richMenuId?: string };
  
  if (!richMenuId) {
    throw new Error('Rich Menu created but no richMenuId returned');
  }

  console.log(`[RICH_MENU] Created Rich Menu: ${richMenuId}`);

  // Step 2: Upload Rich Menu image (optional - can be done separately)
  // For now, we create a text-based menu (LINE will use default styling)
  // To add custom image, use: POST /v2/bot/richmenu/{richMenuId}/content

  // Step 3: Set as default Rich Menu for all users
  // This makes it visible to all users automatically
  await setDefaultRichMenu(richMenuId, accessToken);

  return richMenuId;
}

/**
 * Set Rich Menu as default for all users
 */
async function setDefaultRichMenu(richMenuId: string, accessToken: string): Promise<void> {
  const response = await fetch(`${LINE_API_BASE}/richmenu/setDefault`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ richMenuId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to set default Rich Menu: ${response.status} ${errorText}`);
  }

  console.log(`[RICH_MENU] Set as default: ${richMenuId}`);
}

/**
 * Get current Rich Menu ID (for reference)
 */
export async function getCurrentRichMenuId(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${LINE_API_BASE}/richmenu/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { richmenus?: Array<{ richMenuId: string }> };
    const richmenus = data.richmenus || [];
    
    // Return the first one (should be the default)
    return richmenus.length > 0 ? richmenus[0].richMenuId : null;
  } catch (err) {
    console.error('[RICH_MENU] Error getting Rich Menu ID:', err);
    return null;
  }
}

/**
 * Delete old Rich Menus (cleanup)
 */
export async function deleteOldRichMenus(accessToken: string, keepLatest: boolean = true): Promise<void> {
  try {
    const response = await fetch(`${LINE_API_BASE}/richmenu/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json() as { richmenus?: Array<{ richMenuId: string }> };
    const richmenus = data.richmenus || [];
    
    if (richmenus.length <= 1) {
      return; // Nothing to delete
    }

    // Delete all except the latest
    const toDelete = keepLatest ? richmenus.slice(1) : richmenus;
    
    for (const menu of toDelete) {
      await fetch(`${LINE_API_BASE}/richmenu/${menu.richMenuId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      console.log(`[RICH_MENU] Deleted old Rich Menu: ${menu.richMenuId}`);
    }
  } catch (err) {
    console.error('[RICH_MENU] Error deleting old Rich Menus:', err);
  }
}

/**
 * Sync Rich Menu with current Quick Reply context
 * Call this whenever Quick Reply buttons change
 */
export async function syncRichMenuWithQuickReply(accessToken: string): Promise<string> {
  // Delete old menus first
  await deleteOldRichMenus(accessToken, true);
  
  // Create new menu based on current GLOBAL context
  const richMenuId = await createOrUpdateGlobalRichMenu(accessToken);
  
  console.log(`[RICH_MENU] Synced with Quick Reply: ${richMenuId}`);
  return richMenuId;
}

