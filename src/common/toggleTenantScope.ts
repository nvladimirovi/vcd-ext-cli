import { UiPlugin } from "../classes/UiPlugin";
import { UiPluginMetadataResponse } from "../interfaces/PluginMetadata";
import { credentialsQuestions } from "../questions";
import { prompt } from "inquirer";
import { UserCredentialsAnswers } from "../interfaces/UserAnswer";
import { getPropsWithout } from "../utilities/object-helpers";
import { colors } from "../utilities/colors";
import request from "request";

export function toggleTenantScope(cmd: any, action: string): void {
    let ui: UiPlugin;

    prompt(credentialsQuestions)
        .then((answers: UserCredentialsAnswers) => {
            ui = new UiPlugin(answers.url, answers.tenant, answers.username, answers.password);
            return ui.list();
        })
        .then((data: any[]) => {
            // Immutable copy of all extensions
            const exts: UiPluginMetadataResponse[] = [...<UiPluginMetadataResponse[]>JSON.parse(data[1])];

            exts.forEach((ext, index) => {
                const keysToDelete: string[] = [];

                Object.keys(ext).forEach((key) => {
                    if (key !== "pluginName" && key !== "id") {
                        keysToDelete.push(key);
                    }
                });

                exts[index] = getPropsWithout(keysToDelete, ext);
            });

            if (cmd.all) {
                const actions: Promise<request.Response>[] = [];
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
        })
        .catch((error) => {
            console.log(error);
        });
}