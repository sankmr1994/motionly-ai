import type { Db } from "mongodb";

export type Migration = {
  id: string;
  description: string;
  up(database: Db): Promise<void>;
};
