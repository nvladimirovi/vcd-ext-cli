import fs from "fs";
import path, { resolve } from "path";
import request from "request";
import { UiPluginMetadataResponse, UiPluginMetadata, PluginMetadata } from "../interfaces/PluginMetadata";
import { colors } from "../utilities/colors";
import { Spinner } from "cli-spinner";
import { EventEmitter } from "events";
import { Serial } from "./Serial";
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

const spinner = new Spinner();
spinner.setSpinnerString("⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏");

export class UiPlugin {
    private _url: string;
    private _username: string;
    private _password: string;
    private _tenant: string;
    private _token: string;
    private _publishForAll: boolean;
    private _serial = new Serial();

    constructor(url: string, tenant: string, username: string, password: string, forAll: boolean = false) {
        this.url = url;
        this.tenant = tenant;
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
    private parseManifest(body: string): Promise<UiPluginMetadataResponse> {
        return new Promise<UiPluginMetadataResponse>((resolve, reject) => {
            spinner.setSpinnerTitle("%s Parse Manifest");
            spinner.start();

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

                if (!eid) {
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
                    spinner.stop(true);
                    resolve(parsedData);
                } else {
                    spinner.stop(true);
                    console.log(colors.FgYellow, "Extensions with this name and version already exists.", colors.Reset);
                }
            });
        });
    }

    /**
     * Gets authorize token from server
     */
    private authorize(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            spinner.setSpinnerTitle("%s Authorization");
            spinner.start();

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
        return new Promise<string>((resolve, reject) => {
            spinner.setSpinnerTitle("%s Get Ui Extensions");
            spinner.start();

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
     */
    private putUiExtensionPluginFromFile(data: { link: string, eid: string }): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            spinner.setSpinnerTitle("%s Put Ui Extension Plugin From File");
            spinner.start();

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
    public postUiExtensionTenantsPublishAll(eid: string): Promise<request.Response> {
        return this.request<request.Response>({
            method: "POST",
            path: `/cloudapi/extensions/ui/${eid}/tenants/publishAll`
        });
    }

    /**
     * Unpublish extension for all tenants.
     * @param eid id of the extension.
     */
    public postUiExtensionTenantsUnpublishAll(eid: string): Promise<request.Response> {
        return this.request<request.Response>({
            method: "POST",
            path: `/cloudapi/extensions/ui/${eid}/tenants/unpublishAll`
        });
    }

    /**
     * Upload extension.
     * @param eid id of the extension.
     */
    private addPlugin(eid: string): Promise<{ link: string, eid: string }> {
        return new Promise<{ link: string, eid: string }>((resolve, reject) => {
            spinner.setSpinnerTitle("%s Add Plugin");
            spinner.start();

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
    private addExtension(manifest: UiPluginMetadata): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            spinner.setSpinnerTitle("%s Add Extension");
            spinner.start();

            this.postUiExtension(manifest)
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
    public deploy(): void {
        console.log(colors.FgGreen, "Deploying...", colors.Reset);

        this._serial.serial([
            this.authorize.bind(this),
            this.getUiExtensions.bind(this),
            this.parseManifest.bind(this),
            this.addExtension.bind(this),
            this.addPlugin.bind(this),
            this.putUiExtensionPluginFromFile.bind(this),
            this.publishForAll ? this.postUiExtensionTenantsPublishAll.bind(this) : null
        ])
        .then(() => {
            console.log(colors.FgGreen, "Completed!", colors.Reset);
        })
        .catch((error: Error) => {
            console.log(colors.FgRed, error, colors.Reset);
        });
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
}