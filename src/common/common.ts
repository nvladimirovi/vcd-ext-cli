import { UiPlugin, UiPluginOptions } from "../classes/UiPlugin";
import { UiPluginMetadataResponse } from "../interfaces/PluginMetadata";
import { credentialsQuestions } from "../questions";
import { prompt } from "inquirer";
import { UserCredentialsAnswers } from "../interfaces/UserAnswer";
import { getPropsWithout } from "../utilities/object-helpers";
import { colors } from "../utilities/colors";
import fs from "fs";
import ini from "ini";

function scopeChange(data: any[], cmd: UiPluginOptions, action: string, ui: UiPlugin) {
    // Immutable copy of all extensions
    const exts: UiPluginMetadataResponse[] = extractExtensionsOnlyWith(["pluginName", "id"], [...<UiPluginMetadataResponse[]>JSON.parse(data[1])]);

    if (cmd.all) {
        const actions: Promise<void>[] = [];
        exts.forEach((ext) => {
            actions.push(
                action === "publish" ?
                    ui.postUiExtensionTenantsPublishAll(ext.id) :
                    action === "unpublish" ? ui.postUiExtensionTenantsUnpublishAll(ext.id) :
                        null
            );
        });

        Promise
            .all(actions)
            .then(() => {
                console.log(colors.FgGreen, "Completed!", colors.Reset);
            })
            .catch((error) => {
                console.log(error);
            });
        return;
    }

    prompt([
        {
            name: "which",
            type: "list",
            message: "Which plugins would you like to publish?",
            choices: exts.map((ext) => { return `${ext.id}, ${ext.pluginName}`; })
        },
    ])
        .then((answer: { which: string }) => {
            const eid = answer.which.split(", ")[0];

            if (action === "publish") {
                return ui.postUiExtensionTenantsPublishAll(eid);
            }

            if (action === "unpublish") {
                return ui.postUiExtensionTenantsUnpublishAll(eid);
            }
        })
        .then(() => {
            console.log(colors.FgGreen, "Completed!", colors.Reset);
        })
        .catch((error) => {
            console.log(error);
        });
}

export function extractExtensionsOnlyWith(props: string[], exts: UiPluginMetadataResponse[]) {
    exts.forEach((ext, index) => {
        const keysToDelete: string[] = [];

        Object.keys(ext).forEach((key) => {
            if (props.indexOf(key) === -1) {
                keysToDelete.push(key);
            }
        });

        exts[index] = getPropsWithout(keysToDelete, ext);
    });

    return exts;
}

export function toggleTenantScope(cmd: UiPluginOptions, action: string, iniPath: string): void {
    let ui: UiPlugin;

    if (fs.existsSync(iniPath)) {
        const config = ini.parse(fs.readFileSync(iniPath, "utf-8"));
        const ui = new UiPlugin(config.DEFAULT.vcduri, config.DEFAULT.organization, config.DEFAULT.username, config.DEFAULT.password);
        ui.list()
            .then((data: any[]) => {
                scopeChange(data, cmd, action, ui);
            })
            .catch((error) => {
                console.log(error);
            });
        return;
    }

    prompt(credentialsQuestions)
        .then((answers: UserCredentialsAnswers) => {
            ui = new UiPlugin(answers.url, answers.tenant, answers.username, answers.password);
            return ui.list();
        })
        .then((data: any[]) => {
            scopeChange(data, cmd, action, ui);
        })
        .catch((error) => {
            console.log(error);
        });
}