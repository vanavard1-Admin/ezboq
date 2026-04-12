function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙/.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const rememberedWorkspaceByChannel = new Map();

function workspaceNeedles(workspaceId, workspace = {}) {
  return [
    workspaceId,
    workspace.name,
    workspace.cwd,
    ...(workspace.keywords || []),
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function matchesWorkspace(text, workspaceId, workspace) {
  const haystack = normalizeText(text);
  if (!haystack) return false;
  return workspaceNeedles(workspaceId, workspace).some((needle) => haystack.includes(needle));
}

export function rememberWorkspace(channelId, workspaceId) {
  if (!channelId || !workspaceId) return;
  rememberedWorkspaceByChannel.set(String(channelId), String(workspaceId));
}

export function resolveWorkspace({ config, prompt = "", channelId = "", recentHistory = [] } = {}) {
  const workspaces = config?.workspaces || {};
  const entries = Object.entries(workspaces);
  if (entries.length === 0) {
    throw new Error("No workspaces configured");
  }

  const searchText = [
    prompt,
    ...(Array.isArray(recentHistory) ? recentHistory.map((item) => item?.content || "") : []),
  ].join("\n");

  for (const [workspaceId, workspace] of entries) {
    if (matchesWorkspace(searchText, workspaceId, workspace)) {
      rememberWorkspace(channelId, workspaceId);
      return { id: workspaceId, ...workspace, selectionReason: "keyword" };
    }
  }

  const rememberedId = channelId ? rememberedWorkspaceByChannel.get(String(channelId)) : "";
  if (rememberedId && workspaces[rememberedId]) {
    return { id: rememberedId, ...workspaces[rememberedId], selectionReason: "memory" };
  }

  const defaultWorkspaceId = workspaces[config?.runtime?.defaultWorkspace]
    ? config.runtime.defaultWorkspace
    : entries[0][0];
  rememberWorkspace(channelId, defaultWorkspaceId);
  return { id: defaultWorkspaceId, ...workspaces[defaultWorkspaceId], selectionReason: "default" };
}

export function buildWorkspacePromptBlock(workspace) {
  if (!workspace) return "";
  return [
    "# Active Workspace",
    `- Project: ${workspace.name}`,
    `- Repo path: ${workspace.cwd}`,
    `- Selected via: ${workspace.selectionReason || "default"}`,
    "- Work inside this repository unless the user explicitly switches projects.",
    "- If the user asks for implementation, you may inspect files, edit code, and run build/test commands in this repo.",
  ].join("\n");
}

export function formatWorkspaceLog(workspace) {
  if (!workspace) return "unknown";
  return `${workspace.id} -> ${workspace.cwd} (${workspace.selectionReason || "default"})`;
}
