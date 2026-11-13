export interface PlatformDefinition {
    status: "supported" | "planned" | "blocked";
    host?: string;
    renderer: string | null;
    detail: string;
}
export const clientRoot: string;
export const platforms: Record<string, PlatformDefinition>;
export function defaultPlatform(host?: string): string | undefined;
export function requireBuildPlatform(
    name: string,
    host?: string,
): PlatformDefinition;
export function installedVersions(): Promise<Record<string, string>>;
