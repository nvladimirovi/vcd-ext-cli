export interface RawPluginMetadata {
    urn?: string;
    name?: string;
    containerVersion?: string;
    version?: string;
    scope?: string;
    permissions?: string;
    description?: string;
    vendor?: string;
    license?: string;
    link?: string;
    module?: string;
    route?: string;
}

export interface PluginMetadata {
    urn?: string;
    name?: string;
    containerVersion?: string;
    version?: string;
    scope?: string[];
    permissions?: string[];
    description?: string;
    vendor?: string;
    license?: string;
    link?: string;
    module?: string;
    route?: string;
}

export interface UiPluginMetadata {
    pluginName: string;
    vendor: string;
    description?: string;
    version: string;
    license: string;
    link: string;
    tenant_scoped?: boolean;
    provider_scoped?: boolean;
    enabled?: boolean;
}

export interface UiPluginMetadataResponse {
    pluginName: string;
    vendor: string;
    description?: string;
    version: string;
    license: string;
    link: string;
    tenant_scoped?: boolean;
    provider_scoped?: boolean;
    enabled?: boolean;
    id?: string;
    plugin_status?: UiPluginMetadataResponse.PluginStatusEnum;
    resourcePath?: string;
}

export declare namespace UiPluginMetadataResponse {
    type PluginStatusEnum = "unavailable" | "ready";
    const PluginStatusEnum: {
        Unavailable: PluginStatusEnum;
        Ready: PluginStatusEnum;
    };
}