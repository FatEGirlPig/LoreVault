import type { Connector } from "./types";
import { steam } from "./steam";

/** Platforms users can link. Steam only; other platforms are added manually. */
export const CONNECTORS: Connector[] = [steam];

/** Platforms available for manual library entries. */
export const PLATFORMS = [
  { id: "steam", name: "Steam" }, { id: "playstation", name: "PlayStation" }, { id: "xbox", name: "Xbox" },
  { id: "nintendo", name: "Nintendo" }, { id: "epic", name: "Epic Games" }, { id: "gog", name: "GOG" }, { id: "other", name: "Other" },
];
export const getConnector = (platform: string) => CONNECTORS.find((c) => c.platform === platform);
