import { closeDatabaseConnection, listAdminMediaOwners } from "@motionly/db";
import { resolve } from "node:path";
import { reconcileAdminMediaOwners } from "../lib/admin-media-storage";

async function main() {
  process.loadEnvFile(resolve(process.cwd(), "../../.env.local"));
  try {
    const owners = await reconcileAdminMediaOwners(
      await listAdminMediaOwners(),
    );
    if (owners.some((owner) => !owner.email || !owner.r2Prefix)) {
      throw new Error("Admin media view returned an incomplete owner record.");
    }
    console.log(
      `Admin media view verified for ${owners.length} user(s), ${owners.reduce((total, owner) => total + owner.projectCount, 0)} active project(s), ${owners.reduce((total, owner) => total + owner.narrationCount, 0)} R2 narration asset(s), ${owners.reduce((total, owner) => total + owner.videoProjectCount, 0)} video project(s), ${owners.reduce((total, owner) => total + owner.videoFileCount, 0)} R2 MP4 file(s), and ${owners.reduce((total, owner) => total + owner.missingR2Count, 0)} missing object(s).`,
    );
    owners
      .flatMap((owner) => owner.projects)
      .filter((project) => project.videoR2Count > 1)
      .forEach((project) =>
        console.log(
          `Multiple renders: "${project.title}" has ${project.videoR2Count} verified R2 MP4 files.`,
        ),
      );
  } finally {
    await closeDatabaseConnection();
  }
}

void main();
