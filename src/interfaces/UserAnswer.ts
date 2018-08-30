import { PluginMetadata } from "./PluginMetadata";

export interface UserAnswer extends PluginMetadata {
    projectChoice?: string;
    projectName?: string;
}

export interface UserCredentialsAnswers {
    url: string;
    tenant: string;
    username: string;
    password: string;
}