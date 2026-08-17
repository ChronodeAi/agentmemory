import type { ISdk } from "iii-sdk";
import type {
  CompressedObservation,
  Session,
  ProjectProfile,
} from "../types.js";
import { KV } from "../state/schema.js";
import { StateKV } from "../state/kv.js";
import { recordAudit } from "./audit.js";
import { logger } from "../logger.js";
import { isAbsolute, relative, resolve } from "node:path";
import {
  isProjectPathExcluded,
  resolveProjectConfig,
} from "../project-config.js";

const PROJECT_PROFILE_SCHEMA_VERSION = 3;
const PROFILE_SIGNAL_TYPES = new Set<CompressedObservation["type"]>([
  "file_write",
  "file_edit",
  "conversation",
  "decision",
  "discovery",
  "subagent",
  "task",
]);

function isProjectLocalFile(file: string, cwd: string): boolean {
  const candidate = file.trim();
  if (!candidate || candidate.startsWith("~") || /^[a-z]+:\/\//i.test(candidate)) {
    return false;
  }
  if (!isAbsolute(candidate)) {
    const resolved = resolve(cwd, candidate);
    const fromRoot = relative(resolve(cwd), resolved);
    return fromRoot === "" || (!fromRoot.startsWith("..") && !isAbsolute(fromRoot));
  }
  if (!isAbsolute(cwd)) return false;
  const fromRoot = relative(resolve(cwd), resolve(candidate));
  return fromRoot === "" || (!fromRoot.startsWith("..") && !isAbsolute(fromRoot));
}

export function registerProfileFunction(sdk: ISdk, kv: StateKV): void {
  sdk.registerFunction("mem::profile", 
    async (data: { project: string; refresh?: boolean } | undefined) => {
      if (!data || typeof data.project !== "string" || !data.project.trim()) {
        return { success: false, error: "project is required" };
      }
      const project = data.project.trim();

      if (!data.refresh) {
        const cached = await kv
          .get<ProjectProfile>(KV.profiles, project)
          .catch(() => null);
        if (cached?.schemaVersion === PROJECT_PROFILE_SCHEMA_VERSION) {
          const age = Date.now() - new Date(cached.updatedAt).getTime();
          if (age < 3600_000) {
            return { profile: cached, cached: true };
          }
        }
      }

      const sessions = await kv.list<Session>(KV.sessions);
      const projectSessions = sessions.filter(
        (s) => s.project === project,
      );

      if (projectSessions.length === 0) {
        return { profile: null, reason: "no_sessions" };
      }

      const conceptFreq = new Map<string, number>();
      const fileFreq = new Map<string, number>();
      const errors: string[] = [];
      const recentActivity: string[] = [];
      let totalObs = 0;

      const sortedSessions = projectSessions.sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );

      const top20Sessions = sortedSessions.slice(0, 20);
      const projectConfigs = new Map<
        string,
        ReturnType<typeof resolveProjectConfig>
      >();
      for (const session of top20Sessions) {
        if (!projectConfigs.has(session.cwd)) {
          projectConfigs.set(session.cwd, resolveProjectConfig(session.cwd));
        }
      }
      const obsPerSession = await Promise.all(
        top20Sessions.map((s) =>
          kv
            .list<CompressedObservation>(KV.observations(s.id))
            .catch(() => [] as CompressedObservation[]),
        ),
      );

      for (let i = 0; i < top20Sessions.length; i++) {
        const session = top20Sessions[i];
        const observations = obsPerSession[i];
        const config = projectConfigs.get(session.cwd)!;
        totalObs += observations.length;

        for (const obs of observations) {
          const projectFiles = (obs.files || []).filter(
            (file) =>
              isProjectLocalFile(file, session.cwd) &&
              !isProjectPathExcluded(file, config),
          );
          const belongsToProject =
            (obs.files || []).length === 0 || projectFiles.length > 0;
          if (!belongsToProject) continue;

          if (!PROFILE_SIGNAL_TYPES.has(obs.type)) {
            if (obs.type === "error") errors.push(obs.title);
            continue;
          }
          for (const concept of obs.concepts || []) {
            conceptFreq.set(concept, (conceptFreq.get(concept) || 0) + 1);
          }
          for (const file of projectFiles) {
            fileFreq.set(file, (fileFreq.get(file) || 0) + 1);
          }
        }

        const important = observations
          .filter(
            (o) =>
              o.importance >= 7 &&
              PROFILE_SIGNAL_TYPES.has(o.type) &&
              ((o.files || []).length === 0 ||
                (o.files || []).some((file) =>
                  isProjectLocalFile(file, session.cwd) &&
                  !isProjectPathExcluded(file, config),
                )),
          )
          .sort((a, b) => b.importance - a.importance);
        if (important.length > 0) {
          recentActivity.push(
            `[${session.startedAt.slice(0, 10)}] ${important[0].title}`,
          );
        }
      }

      const topConcepts = Array.from(conceptFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([concept, frequency]) => ({ concept, frequency }));

      const topFiles = Array.from(fileFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([file, frequency]) => ({ file, frequency }));

      const uniqueErrors = [...new Set(errors)].slice(0, 10);

      const profile: ProjectProfile = {
        schemaVersion: PROJECT_PROFILE_SCHEMA_VERSION,
        project,
        updatedAt: new Date().toISOString(),
        topConcepts,
        topFiles,
        conventions: extractConventions(topConcepts, topFiles),
        commonErrors: uniqueErrors,
        recentActivity: recentActivity.slice(0, 10),
        sessionCount: projectSessions.length,
        totalObservations: totalObs,
      };

      await kv.set(KV.profiles, project, profile);
      await recordAudit(kv, "share", "mem::profile", [project], {
        sessionCount: projectSessions.length,
        totalObservations: totalObs,
      });

      logger.info("Profile generated", {
        project,
        sessions: projectSessions.length,
        observations: totalObs,
      });
      return { profile, cached: false };
    },
  );
}

function extractConventions(
  concepts: Array<{ concept: string; frequency: number }>,
  files: Array<{ file: string; frequency: number }>,
): string[] {
  const conventions: string[] = [];

  const sourceLanguages = [
    { extension: ".py", language: "Python" },
    { extension: ".ts", language: "TypeScript" },
    { extension: ".tsx", language: "TypeScript" },
    { extension: ".js", language: "JavaScript" },
    { extension: ".jsx", language: "JavaScript" },
    { extension: ".go", language: "Go" },
    { extension: ".rs", language: "Rust" },
    { extension: ".java", language: "Java" },
  ];
  const languageWeights = new Map<string, number>();
  for (const { file, frequency } of files) {
    const match = sourceLanguages.find(({ extension }) =>
      file.toLowerCase().endsWith(extension),
    );
    if (match) {
      languageWeights.set(
        match.language,
        (languageWeights.get(match.language) ?? 0) + frequency,
      );
    }
  }
  const rankedLanguages = [...languageWeights.entries()].sort(
    (a, b) => b[1] - a[1],
  );
  const totalLanguageWeight = rankedLanguages.reduce(
    (sum, [, frequency]) => sum + frequency,
    0,
  );
  if (
    rankedLanguages.length > 0 &&
    rankedLanguages[0][1] >= 2 &&
    rankedLanguages[0][1] / totalLanguageWeight >= 0.6
  ) {
    conventions.push(`Observed ${rankedLanguages[0][0]} source activity`);
  }

  const totalFileWeight = files.reduce((sum, file) => sum + file.frequency, 0);
  const srcFiles = files
    .filter((f) => f.file.includes("/src/") || f.file.startsWith("src/"))
    .reduce((sum, file) => sum + file.frequency, 0);
  if (totalFileWeight > 0 && srcFiles > totalFileWeight * 0.5) {
    conventions.push("Standard src/ directory structure");
  }

  const testFiles = files
    .filter((f) => f.file.includes("test") || f.file.includes("spec"))
    .reduce((sum, file) => sum + file.frequency, 0);
  if (testFiles > 0) {
    conventions.push("Has test files");
  }

  for (const { concept, frequency } of concepts.slice(0, 5)) {
    if (frequency >= 3) {
      conventions.push(`Frequently uses: ${concept}`);
    }
  }

  return conventions;
}
