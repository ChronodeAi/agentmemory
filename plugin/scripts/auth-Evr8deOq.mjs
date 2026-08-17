import { createHmac, randomBytes } from "node:crypto";
randomBytes(32);
const PROJECT_CAPABILITY_TOKEN_VERSION = "amcap1";
const DEFAULT_PROJECT_CAPABILITY_AUDIENCE = "agentmemory";
const PROJECT_CAPABILITY_PROJECT_HEADER = "x-agentmemory-project";
function hmac(value, secret) {
	return createHmac("sha256", secret).update(value).digest("base64url");
}
function createProjectCapabilityToken(claims, signingSecret) {
	if (!signingSecret) throw new Error("project capability signing secret is required");
	const normalized = {
		version: 1,
		audience: claims.audience.trim(),
		project: claims.project.trim(),
		expiresAt: claims.expiresAt,
		...claims.issuedAt !== void 0 ? { issuedAt: claims.issuedAt } : {},
		...claims.capabilityId ? { capabilityId: claims.capabilityId.trim() } : {}
	};
	if (!normalized.audience || !normalized.project || !Number.isSafeInteger(normalized.expiresAt)) throw new Error("invalid project capability claims");
	const signed = `${PROJECT_CAPABILITY_TOKEN_VERSION}.${Buffer.from(JSON.stringify(normalized)).toString("base64url")}`;
	return `${signed}.${hmac(signed, signingSecret)}`;
}
function isStrictCapabilityMode(value = process.env["AGENTMEMORY_STRICT_CAPABILITY_MODE"]) {
	return ![
		"false",
		"0",
		"off"
	].includes((value ?? "").trim().toLowerCase());
}
//#endregion
export { isStrictCapabilityMode as i, PROJECT_CAPABILITY_PROJECT_HEADER as n, createProjectCapabilityToken as r, DEFAULT_PROJECT_CAPABILITY_AUDIENCE as t };
