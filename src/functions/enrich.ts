import type { ISdk } from "iii-sdk";
import type { Memory, Session } from "../types.js";
import { KV } from "../state/schema.js";
import { StateKV } from "../state/kv.js";
import { logger } from "../logger.js";

const MAX_CONTEXT_LENGTH = 4000;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function registerEnrichFunction(sdk: ISdk, kv: StateKV): void {
  sdk.registerFunction("mem::enrich",
    async (data: {
      sessionId: string;
      files: string[];
      terms?: string[];
      toolName?: string;
      project?: string;
    }) => {
      const project =
        typeof data.project === "string" && data.project.trim().length > 0
          ? data.project.trim()
          : "";
      if (!project) {
        return { context: "", truncated: false, error: "project is required" };
      }
      const session = await kv.get<Session>(KV.sessions, data.sessionId);
      if (!session || session.project !== project) {
        return {
          context: "",
          truncated: false,
          error: "session does not belong to project",
        };
      }

      const parts: string[] = [];

      const fileContextPromise = sdk
        .trigger<
          { sessionId: string; files: string[]; project: string },
          { context: string }
        >({
          function_id: "mem::file-context",
          payload: {
            sessionId: data.sessionId,
            files: data.files,
            project,
          },
        })
        .catch(() => ({ context: "" }));

      const searchQueries: string[] = [
        ...data.files.map((f) => f.split("/").pop() || f),
        ...(data.terms || []),
      ].filter((q) => q.length > 0);

      const searchPromise =
        searchQueries.length > 0
          ? sdk
              .trigger<
                { query: string; limit: number; project: string },
                { results: Array<{ observation: { narrative: string } }> }
              >({
                function_id: "mem::search",
                payload: {
                  query: searchQueries.join(" "),
                  limit: 5,
                  project,
                },
              })
              .catch(() => ({ results: [] }))
          : Promise.resolve({ results: [] });

      const bugMemoriesPromise = kv
        .list<Memory>(KV.memories)
        .then((memories) =>
          memories
            .filter(
              (m) =>
                m.type === "bug" &&
                m.isLatest &&
                m.project === project &&
                m.files.some((f) =>
                  data.files.some((df) => f.includes(df) || df.includes(f)),
                ),
            )
            .sort(
              (a, b) =>
                new Date(b.updatedAt || b.createdAt).getTime() -
                new Date(a.updatedAt || a.createdAt).getTime(),
            ),
        )
        .catch(() => []);

      const [fileContext, searchResult, bugMemories] = await Promise.all([
        fileContextPromise,
        searchPromise,
        bugMemoriesPromise,
      ]);

      if (fileContext.context) {
        parts.push(fileContext.context);
      }

      if (searchResult.results.length > 0) {
        const observations = searchResult.results
          .map((r) => r.observation?.narrative)
          .filter(Boolean)
          .map((n) => escapeXml(n as string))
          .join("\n");
        if (observations) {
          parts.push(
            `<agentmemory-relevant-context>\n${observations}\n</agentmemory-relevant-context>`,
          );
        }
      }

      if (bugMemories.length > 0) {
        const bugs = bugMemories
          .slice(0, 3)
          .map((m) => `- ${escapeXml(m.title)}: ${escapeXml(m.content)}`)
          .join("\n");
        parts.push(
          `<agentmemory-past-errors>\n${bugs}\n</agentmemory-past-errors>`,
        );
      }

      let context = parts.join("\n\n");
      let truncated = false;
      if (context.length > MAX_CONTEXT_LENGTH) {
        context = context.slice(0, MAX_CONTEXT_LENGTH);
        truncated = true;
      }

      logger.info("Enrichment completed", {
        sessionId: data.sessionId,
        project,
        fileCount: data.files.length,
        contextLength: context.length,
        truncated,
      });

      return { context, truncated };
    },
  );
}
