export const VERSION = "0.9.28-chronode.1";
export const API_CONTRACT_VERSION = 1;
export const BACKEND_BUILD_ID =
  process.env["AGENTMEMORY_BUILD_ID"] ?? `agentmemory-${VERSION}`;
export const VIEWER_BUILD_ID =
  process.env["AGENTMEMORY_VIEWER_BUILD_ID"] ?? `agentmemory-viewer-${VERSION}`;
