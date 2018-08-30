import fs from "fs";
import path from "path";
import request from "request";
import { UiPluginMetadataResponse, PluginMetadata } from "../interfaces/PluginMetadata";
import { colors } from "../utilities/colors";
import { Spinner } from "cli-spinner";
import { Serial } from "./Serial";
import { options } from "../utilities/options";

export interface UiPluginOptions {
    all?: boolean;
    replace?: boolean;
}

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

const loader = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

export class UiPlugin {
    private _url: string;
    private _username: string;
    private _password: string;
    private _tenant: string;
    private _token: string;
    private _serial = new Serial();

    private _options: UiPluginOptions;

    constructor(url: string, tenant: string, username: string, password: string, opts?: UiPluginOptions) {
        this.url = url;
        this.tenant = tenant;
        this.username = username;
        this.password = password;

        this._options = {
            all: opts.all || null,
            replace: opts.replace || null
        };
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
     * Tenant getter.
     */
    get tenant(): string {
        return this._tenant;
    }

    /**
     * Tenant setter.
     */
    set tenant(val: string) {
        if (!val) {
            throw new Error("Tenant value can't be null.");
        }

        this._tenant = val;
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
     * Replace plugin.
     * @param parsedData parsed version of the manifest json.
     */
    private replace(data: { parsedData: UiPluginMetadataResponse, eid: string }): Promise<string> {
        const spinner = new Spinner();
        spinner.setSpinnerString(loader);
        spinner.setSpinnerTitle("%s Replacing");
        spinner.start();

        return new Promise<string>((resolve, reject) => {
            if (!data.eid) {
                this.postUiExtension(data.parsedData)
                    .then((res: string) => {
                        const ext: UiPluginMetadataResponse = JSON.parse(res);
                        const eid = ext.id;
                        spinner.stop();
                        resolve(eid);
                    })
                    .catch((error) => {
                        spinner.stop(true);
                        reject(error);
                    });
                return;
            }

            this.delete([data.eid])
                .then(() => {
                    return this.postUiExtension(data.parsedData);
                })
                .then((res: string) => {
                    const ext: UiPluginMetadataResponse = JSON.parse(res);
                    const eid = ext.id;
                    spinner.stop();
                    resolve(eid);
                })
                .catch((error) => {
                    spinner.stop(true);
                    reject(error);
                });
        });
    }

    /**
     * Gets origin manifest and convert its data to appropriate format.
     * @param fileAbsPath path to file
     * @param enabled specify plugin like enabled
     */
    private parseManifest(body: string): Promise<{ parsedData: UiPluginMetadataResponse, eid: string }> {
        const spinner = new Spinner();
        spinner.setSpinnerString(loader);
        spinner.setSpinnerTitle("%s Parse Manifest");
        spinner.start();

        return new Promise<{ parsedData: UiPluginMetadataResponse, eid: string }>((resolve, reject) => {
            fs.readFile(`${CWD}/src/public/manifest.json`, (error: Error, data: Buffer) => {
                if (error) {
                    spinner.stop(true);
                    reject(error);
                    return;
                }

                const manifest: PluginMetadata = <PluginMetadata>JSON.parse(data.toString("utf8"));

                let eid: string;
                const extensions: UiPluginMetadataResponse[] = JSON.parse(body);

                extensions.forEach((ext: UiPluginMetadataResponse) => {
                    if (
                        manifest.name === ext.pluginName &&
                        manifest.version === ext.version
                    ) {
                        eid = ext.id;
                        return;
                    }
                });

                const parsedData: UiPluginMetadataResponse = {
                    "pluginName": manifest["name"],
                    "vendor": manifest["vendor"],
                    "description": manifest["description"],
                    "version": manifest["version"],
                    "license": manifest["license"],
                    "link": manifest["link"],
                    "tenant_scoped": manifest["scope"].indexOf("tenant") !== -1 ? true : false,
                    "provider_scoped": manifest["scope"].indexOf("service-provider") !== -1 ? true : false,
                    "enabled": true
                };

                if (!eid || this._options.replace) {
                    spinner.stop(true);
                    resolve({ parsedData, eid });
                    return;
                }

                spinner.stop(true);
                console.log(
                    colors.FgYellow,
                    `Extensions with this name and version already exists, run command with replace flag (${options.replace}), to replace the plugin`,
                    colors.Reset
                );
            });
        });
    }

    /**
     * Gets authorize token from server
     */
    private authorize(): Promise<void> {
        const spinner = new Spinner();
        spinner.setSpinnerString(loader);
        spinner.setSpinnerTitle("%s Authorization");
        spinner.start();

        return new Promise<void>((resolve, reject) => {
            this.request<request.Response>({
                method: "POST",
                path: "/api/sessions",
                auth: `Basic ${Buffer.from(`${this.username}@${this.tenant}:${this.password}`).toString("base64")}`,
                accept: "application/*+xml;version=30.0"
            })
                .then((res) => {
                    if (!res.headers["x-vcloud-authorization"]) {
                        spinner.stop(true);
                        reject(new Error("x-vcloud-authorization wasn't found..."));
                        return;
                    }

                    this.token = <string>res.headers["x-vcloud-authorization"];
                    spinner.stop(true);
                    resolve();
                })
                .catch((err: Error) => {
                    spinner.stop(true);
                    reject(err);
                });
        });
    }

    /**
     * Makes request to given endpoint.
     */
    private request<T>(opts: UiRequestMetadata): Promise<T> {
        return new Promise<T>((resolve, reject) => {
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
                /* This flag disables ssl security turn it on if your env is with valid certificate.*/
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
        const spinner = new Spinner();
        spinner.setSpinnerString(loader);
        spinner.setSpinnerTitle("%s Get Ui Extensions");
        spinner.start();

        return new Promise<string>((resolve, reject) => {
            this.request<string>({
                method: "GET",
                path: "/cloudapi/extensions/ui/",
                bodyOnly: true
            })
                .then((body) => {
                    spinner.stop(true);
                    resolve(body);
                })
                .catch((error) => {
                    spinner.stop(true);
                    reject(error);
                });
        });
    }

    /**
     * Post ui extension with given manifest json.
     * @param manifest the manifest of the extension which will be uploaded.
     */
    private postUiExtension(manifest: UiPluginMetadataResponse): Promise<string> {
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
     */
    private putUiExtensionPluginFromFile(data: { link: string, eid: string }): Promise<string> {
        const spinner = new Spinner();
        spinner.setSpinnerString(loader);
        spinner.setSpinnerTitle("%s Put Ui Extension Plugin From File");
        spinner.start();

        return new Promise<string>((resolve, reject) => {
            const file = fs.readFileSync(`${CWD}/dist/plugin.zip`);
            this.putUiExtensionPlugin(data.link, file)
                .then(() => {
                    spinner.stop(true);
                    resolve(data.eid);
                })
                .catch((error) => {
                    spinner.stop(true);
                    reject(error);
                });
        });
    }

    /**
     * Publish extension for all tenants.
     * @param eid id of the extension.
     */
    public postUiExtensionTenantsPublishAll(eid: string): Promise<void> {
        const spinner = new Spinner();
        spinner.setSpinnerString(loader);
        spinner.setSpinnerTitle("%s Publishing for all tenants.");
        spinner.start();

        return new Promise<void>((resolve, reject) => {
            this.request<request.Response>({
                method: "POST",
                path: `/cloudapi/extensions/ui/${eid}/tenants/publishAll`
            })
                .then(() => {
                    spinner.stop(true);
                    resolve();
                })
                .catch((error) => {
                    spinner.stop(true);
                    reject(error);
                });
        });
    }

    /**
     * Unpublish extension for all tenants.
     * @param eid id of the extension.
     */
    public postUiExtensionTenantsUnpublishAll(eid: string): Promise<void> {
        const spinner = new Spinner();
        spinner.setSpinnerString(loader);
        spinner.setSpinnerTitle("%s Unpublishing for all tenants.");
        spinner.start();

        return new Promise<void>((resolve, reject) => {
            this.request<request.Response>({
                method: "POST",
                path: `/cloudapi/extensions/ui/${eid}/tenants/unpublishAll`
            })
                .then(() => {
                    spinner.stop(true);
                    resolve();
                })
                .catch((error) => {
                    spinner.stop(true);
                    reject(error);
                });
        });
    }

    /**
     * Upload extension.
     * @param eid id of the extension.
     */
    private addPlugin(eid: string): Promise<{ link: string, eid: string }> {
        const spinner = new Spinner();
        spinner.setSpinnerString(loader);
        spinner.setSpinnerTitle("%s Add Plugin");
        spinner.start();

        return new Promise<{ link: string, eid: string }>((resolve, reject) => {
            this.postUiExtensionPluginFromFile(eid, `${CWD}/dist/plugin.zip`)
                .then((response: request.Response) => {
                    const responseCopy: any = Object.assign({}, response);
                    responseCopy.headers["link"] = responseCopy.headers["link"].split(">")[0];
                    const link = <string>responseCopy.headers["link"];

                    spinner.stop(true);
                    resolve({ link: link.substr(1), eid });
                })
                .catch((error: Error) => {
                    spinner.stop(true);
                    reject(error);
                });
        });
    }

    /**
     * Upload extension.
     * @param manifest manifest.json of the extensions which will be uploaded
     */
    private addExtension(data: { parsedData: UiPluginMetadataResponse, eid: string }): Promise<string> {
        const spinner = new Spinner();
        spinner.setSpinnerString(loader);
        spinner.setSpinnerTitle("%s Add Extension");
        spinner.start();

        return new Promise<string>((resolve, reject) => {
            this.postUiExtension(data.parsedData)
                .then((res: string) => {
                    const ext: UiPluginMetadataResponse = JSON.parse(res);
                    const eid = ext.id;
                    spinner.stop(true);
                    resolve(eid);
                })
                .catch((error) => {
                    spinner.stop(true);
                    reject(error);
                });
        });
    }

    /**
     * Deploy extension to endpoint.
     */
    public deploy(): Promise<any[]> {
        console.log(colors.FgGreen, "Deploying...", colors.Reset);

        return this._serial.serial([
            this.authorize.bind(this),
            this.getUiExtensions.bind(this),
            this.parseManifest.bind(this),
            this._options.replace ? this.replace.bind(this) : this.addExtension.bind(this),
            this.addPlugin.bind(this),
            this.putUiExtensionPluginFromFile.bind(this),
            this._options.all ? this.postUiExtensionTenantsPublishAll.bind(this) : null
        ]);
    }

    /**
     * List all plugins.
     */
    public list(): Promise<any[]> {
        return this._serial.serial([
            this.authorize.bind(this),
            this.getUiExtensions.bind(this)
        ]);
    }

    /**
     * Deletes list of extensions.
     * @param exts list of extensions to be deleted.
     */
    public delete(eids: string[]): Promise<request.Response[]> {
        const actions: Promise<request.Response>[] = [];

        eids.forEach((id) => {
            actions.push(this.request<request.Response>({
                method: "DELETE",
                path: `/cloudapi/extensions/ui/${id}`,
                accept: "application/*+json;version=31.0,application/json;version=31.0",
                content_type: "application/json"
            }));
        });

        return Promise
            .all(actions);
    }
}