import { PluginMetadata } from "./PluginMetadata";

export interface UserAnswer extends PluginMetadata {
    projectChoice?: string;
    projectName?: string;
}