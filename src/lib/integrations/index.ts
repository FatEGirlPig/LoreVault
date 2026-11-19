import type { Connector } from "./types";
import { steam } from "./steam";

const planned = (platform: string, name: string, caveat: string): Connector =>
  ({ platform, name, status: "planned", dataTypes: [], caveat });

export const CONNECTORS: Connector[] = [
  steam,
  planned("playstation", "PlayStation", "Approved API access is being investigated. Add games manually for now."),
  planned("xbox", "Xbox", "Microsoft gaming data permissions are under review. Add games manually for now."),
  planned("gog", "GOG", "Official library access is not yet verified. Add games manually for now."),
  planned("epic", "Epic Games", "Sign-in alone does not grant library access. Add games manually for now."),
  planned("nintendo", "Nintendo", "Limited third-party access is expected. Add games manually for now."),
];

export const PLATFORMS = [...CONNECTORS.map((c) => ({ id: c.platform, name: c.name })), { id: "other", name: "Other" }];
export const getConnector = (platform: string) => CONNECTORS.find((c) => c.platform === platform);
