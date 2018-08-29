import fs from "fs";
import path, { resolve } from "path";
import request from "request";
import { UiPluginMetadataResponse, UiPluginMetadata, PluginMetadata } from "../interfaces/PluginMetadata";
import { colors } from "../utilities/colors";
const CWD = process.cwd();

interface UiRequestMetadata {
    method: string;
    path?: string;
    data?: any;
    uri?: string;
    auth?: string;
    content_type?: string;
    accept?: string;
    bodyOnly?: boolean;
}

export class UiPlugin {
    private _url: string;
    private _username: string;
    private _password: string;
    private _org: string;
    private _token: string;
    private _publishForAll: boolean;

    constructor(url: string, org: string, username: string, password: string, forAll: boolean) {
        this.url = url;
        this.org = org;
        this.username = username;
        this.password = password;
        this.publishForAll = forAll;
    }

    /**
     * Url getter.
     */
    get url(): string {
        return this._url;
    }

    /**
     * Url setter.
     */
    set url(val: string) {
        if (!val) {
            throw new Error("Url value can't be null.");
        }

        this._url = val;
    }

    /**
     * Username getter.
     */
    get username(): string {
        return this._username;
    }

    /**
     * Username setter.
     */
    set username(val: string) {
        if (!val) {
            throw new Error("Username value can't be null.");
        }

        this._username = val;
    }

    /**
     * Password getter.
     */
    get password(): string {
        return this._password;
    }

    /**
     * Password setter.
     */
    set password(val: string) {
        if (!val) {
            throw new Error("Password value can't be null.");
        }

        this._password = val;
    }

    /**
     * Org getter.
     */
    get org(): string {
        return this._org;
    }

    /**
     * Org setter.
     */
    set org(val: string) {
        if (!val) {
            throw new Error("Org value can't be null.");
        }

        this._org = val;
    }

    /**
     * Token getter.
     */
    get token(): string {
        return this._token;
    }

    /**
     * Token setter.
     */
    set token(val: string) {
        if (!val) {
            throw new Error("Token value can't be null.");
        }

        this._token = val;
    }

    /**
     * PublishFor getter.
     */
    get publishForAll(): boolean {
        return this._publishForAll;
    }

    /**
     * PublishFor setter.
     */
    set publishForAll(val: boolean) {
        this._publishForAll = val;
    }

    /**
     * Gets origin manifest and convert its data to appropriate format.
     * @param fileAbsPath path to file
     * @param enabled specify plugin like enabled
     */
    private parseManifest(fileAbsPath: string, enabled: true): Promise<UiPluginMetadata> {
        return new Promise<UiPluginMetadata>((resolve, reject) => {
            fs.readFile(fileAbsPath, (error: Error, data: Buffer) => {
                if (error) {
                    reject(new Error(error.message));
                    return;
                }

                const manifest: PluginMetadata = <PluginMetadata>JSON.parse(data.toString("utf8"));

                resolve({
                    "pluginName": manifest["name"],
                    "vendor": manifest["vendor"],
                    "description": manifest["description"],
                    "version": manifest["version"],
                    "license": manifest["license"],
                    "link": manifest["link"],
                    "tenant_scoped": manifest["scope"].indexOf("tenant") !== -1 ? true : false,
                    "provider_scoped": manifest["scope"].indexOf("service-provider") !== -1 ? true : false,
                    "enabled": enabled
                });
            });
        });
    }

    private authorize(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.request<request.Response>({
                method: "POST",
                path: "/api/sessions",
                auth: `Basic ${Buffer.from(`${this.username}@${this.org}:${this.password}`).toString("base64")}`,
                accept: "application/*+xml;version=30.0"
            })
                .then((res) => {
                    if (!res.headers["x-vcloud-authorization"]) {
                        reject(new Error("x-vcloud-authorization wasn't found..."));
                        return;
                    }

                    this.token = <string>res.headers["x-vcloud-authorization"];
                    resolve();
                })
                .catch((err: Error) => {
                    reject(err);
                });
        });
    }

    /**
     * Makes request to given endpoint.
     */
    private request<T>(opts: UiRequestMetadata): Promise<T> {
        return new Promise((resolve, reject) => {
            const headers: any = {};
            if (this.token) {
                headers["x-vcloud-authorization"] = this.token;
            }
            if (opts.auth) {
                headers["Authorization"] = opts.auth;
            }
            if (opts.content_type) {
                headers["Content-Type"] = opts.content_type;
            }
            if (opts.accept) {
                headers["Accept"] = opts.accept;
            }
            if (opts.path) {
                opts.uri = this.url + opts.path;
            }

            const requestOptions = {
                method: opts.method,
                headers,
                strictSSL: false,
                body: opts.data
            };

            request(opts.uri, requestOptions, (error: any, response: any, body: any) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (opts.bodyOnly && body) {
                    resolve(body);
                    return;
                }

                if (200 <= response.statusCode && response.statusCode <= 299) {
                    resolve(response);
                    return;
                }

                reject(new Error(`Unsupported HTTP status code ${response.statusCode} encountered`));
            });
        });
    }

    /**
     * Get all ui extensions.
     */
    private getUiExtensions(): Promise<string> {
        return this.request<string>({
            method: "GET",
            path: "/cloudapi/extensions/ui/",
            bodyOnly: true
        });
    }

    /**
     * Post ui extension with given manifest json.
     * @param manifest the manifest of the extension which will be uploaded.
     */
    private postUiExtension(manifest: UiPluginMetadata): Promise<string> {
        return this.request<string>({
            method: "POST",
            path: "/cloudapi/extensions/ui/",
            data: JSON.stringify(manifest),
            content_type: "application/json",
            accept: "application/json",
            bodyOnly: true
        });
    }

    /**
     * Register extension with given id and file stat.
     * @param eid extension id.
     * @param data file stat.
     */
    private postUiExtensionPlugin(eid: string, data: { fileName: string, size: number }): Promise<request.Response> {
        return this.request<request.Response>({
            method: "POST",
            path: `/cloudapi/extensions/ui/${eid}/plugin`,
            data: JSON.stringify(data),
            content_type: "application/json",
            accept: "application/json"
        });
    }

    /**
     * Register extensions file which will be uploaded.
     * @param eid id of the extension.
     * @param dir absolute path to extensions directory.
     */
    private postUiExtensionPluginFromFile(eid: string, dir: string): Promise<request.Response> {
        const fileName = path.basename(dir);
        const size = fs.statSync(dir).size;

        const data = {
            fileName,
            size
        };

        return this.postUiExtensionPlugin(eid, data);
    }

    /**
     * Upload given file to given transferlink.
     * @param link transfer link where extension will be uploaded.
     * @param file file which will be uploaded.
     */
    private putUiExtensionPlugin(link: string, file: Buffer): Promise<request.Response> {
        return this.request<request.Response>({
            method: "PUT",
            uri: link,
            content_type: "application/zip",
            accept: null,
            data: file
        });
    }

    /**
     * Reads the file in-memory and send it.
     * @param link transfer link where extension will be uploaded.
     * @param dir absolute path to extensions directory.
     */
    private putUiExtensionPluginFromFile(link: string, dir: string): Promise<request.Response> {
        const file = fs.readFileSync(dir);
        return this.putUiExtensionPlugin(link, file);
    }

    /**
     * Publish extension for all tenants.
     * @param eid id of the extension.
     */
    private postUiExtensionTenantsPublishAll(eid: string): Promise<request.Response> {
        return this.request<request.Response>({
            method: "POST",
            path: `/cloudapi/extensions/ui/${eid}/tenants/publishAll`
        });
    }

    /**
     * Upload extension.
     * @param eid id of the extension.
     * @param dir absolute path to extensions directory.
     * @param publishAll flag for publish
     */
    private addPlugin(eid: string, dir: string, publishAll: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.postUiExtensionPluginFromFile(eid, dir)
                .then((response: request.Response) => {
                    const responseCopy: any = Object.assign({}, response);
                    responseCopy.headers["link"] = responseCopy.headers["link"].split(">")[0];
                    const link = <string>responseCopy.headers["link"];

                    return this.putUiExtensionPluginFromFile(link.substr(1), dir);
                })
                .then(() => {
                    if (publishAll) {
                        this.postUiExtensionTenantsPublishAll(eid);
                    }

                    resolve();
                })
                .catch((error: Error) => {
                    reject(error);
                });
        });
    }

    /**
     * Upload extension.
     * @param manifest manifest.json of the extensions which will be uploaded
     * @param dir the absolute path to the extensions build.
     * @param publishAll flag which determinates the availability to tenants.
     */
    private addExtension(manifest: UiPluginMetadata, dir: string, publishAll: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.postUiExtension(manifest)
                .then((res: string) => {
                    const ext: UiPluginMetadataResponse = JSON.parse(res);
                    const eid = ext.id;
                    return this.addPlugin(eid, dir, publishAll);
                })
                .then(() => {
                    resolve();
                })
                .catch((error: Error) => {
                    reject(error);
                });
        });
    }

    /**
     * Deploy plugin to given endpoint.
     */
    public deploy(): void {
        console.log(colors.FgGreen, "Deploying...", colors.Reset);

        let manifest: UiPluginMetadata;

        this.parseManifest(`${CWD}/src/public/manifest.json`, true)
            .then((data) => {
                manifest = data;
                return this.authorize();
            })
            .then(() => {
                return this.getUiExtensions();
            })
            .then((body) => {
                let eid: string;
                const extensions: UiPluginMetadataResponse[] = JSON.parse(body);

                extensions.forEach((ext: UiPluginMetadataResponse) => {
                    if (
                        manifest.pluginName === ext.pluginName &&
                        manifest.version === ext.pluginName
                    ) {
                        eid = ext.id;
                        return;
                    }
                });

                if (!eid) {
                    return this.addExtension(manifest, `${CWD}/dist/plugin.zip`, this.publishForAll);
                } else {
                    console.log(colors.FgYellow, "Extensions with this name and version already exists.", colors.Reset);
                }
            })
            .then(() => {
                console.log(colors.FgGreen, "Deploying Completed!", colors.Reset);
            })
            .catch((error: Error) => {
                console.log(colors.BgRed, error.message, colors.Reset);
            });
    }
}