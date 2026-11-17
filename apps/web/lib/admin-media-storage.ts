import type { AdminMediaOwner } from "@motionly/db";
import { getPrivateObjectMetadata } from "./object-storage";

export type ReconciledAdminMediaProject =
  AdminMediaOwner["projects"][number] & {
    narrationR2Count: number;
    videoR2Count: number;
    missingR2Count: number;
    storedBytes: number;
  };

export type ReconciledAdminMediaOwner = Omit<AdminMediaOwner, "projects"> & {
  narrationCount: number;
  videoFileCount: number;
  videoProjectCount: number;
  missingR2Count: number;
  storedBytes: number;
  projects: ReconciledAdminMediaProject[];
};

export async function reconcileAdminMediaOwners(
  owners: AdminMediaOwner[],
): Promise<ReconciledAdminMediaOwner[]> {
  return Promise.all(
    owners.map(async (owner) => {
      const projects = await Promise.all(
        owner.projects.map(async (project) => {
          const narrationObjects = await Promise.all(
            project.narrationAssetKeys.map(getPrivateObjectMetadata),
          );
          const videoObjects = await Promise.all(
            project.videoAssetKeys.map(getPrivateObjectMetadata),
          );
          const allObjects = [...narrationObjects, ...videoObjects];
          return {
            ...project,
            narrationR2Count: narrationObjects.filter((item) => item.exists)
              .length,
            videoR2Count: videoObjects.filter((item) => item.exists).length,
            missingR2Count: allObjects.filter((item) => !item.exists).length,
            storedBytes: allObjects.reduce(
              (total, item) => total + item.byteLength,
              0,
            ),
          };
        }),
      );
      return {
        ...owner,
        narrationCount: projects.reduce(
          (total, project) => total + project.narrationR2Count,
          0,
        ),
        videoFileCount: projects.reduce(
          (total, project) => total + project.videoR2Count,
          0,
        ),
        videoProjectCount: projects.filter(
          (project) => project.videoR2Count > 0,
        ).length,
        missingR2Count: projects.reduce(
          (total, project) => total + project.missingR2Count,
          0,
        ),
        storedBytes: projects.reduce(
          (total, project) => total + project.storedBytes,
          0,
        ),
        projects,
      };
    }),
  );
}
