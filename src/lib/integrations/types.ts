export type DataType = "identity" | "library" | "playtime" | "achievements";

export interface ImportedGame {
  externalId: string;
  title: string;
  coverUrl?: string;
  playtimeMinutes?: number; // only when the platform supplies it
}

export interface AccountProfile { externalUserId: string; displayName?: string; avatarUrl?: string }

export interface Connector {
  platform: string;
  name: string;
  /** "available": official flow implemented. "planned": not yet verified, so no sync is promised. */
  status: "available" | "planned";
  dataTypes: DataType[];
  caveat: string;
  getAccountProfile?(externalUserId: string): Promise<AccountProfile>;
  fetchLibrary?(externalUserId: string): Promise<{ games: ImportedGame[]; dataTypes: DataType[] }>;
}
