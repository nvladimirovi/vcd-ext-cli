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