import program from "commander";
import { UiPlugin, UiPluginOptions } from "./classes/UiPlugin";
import { prompt } from "inquirer";
import { credentialsQuestions } from "./questions";
import { UserCredentialsAnswers } from "./interfaces/UserAnswer";
import { UiPluginMetadataResponse } from "./interfaces/PluginMetadata";
import { extractExtensionsOnlyWith } from "./common/common";
import { colors } from "./utilities/colors";
import { options } from "./utilities/options";
import path from "path";
import fs from "fs";
import ini from "ini";

let ui: UiPlugin;

function destroy(cmd: UiPluginOptions, data: any[], ui: UiPlugin) {
    const extsOriginal: UiPluginMetadataResponse[] = <UiPluginMetadataResponse[]>JSON.parse(data[1]);
    // Immutable copy of all extensions
    const exts: UiPluginMetadataResponse[] = extractExtensionsOnlyWith(["pluginName", "id"], [...extsOriginal]);

    if (cmd.all) {
        ui.delete(exts.map((ext) => ext.id))
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
            message: "Which plugins would you like to delete?",
            choices: exts.map((ext) => { return `${ext.id}, ${ext.pluginName}`; })
        },
    ])
        .then((answer: { which: string }) => {
            const eid = answer.which.split(", ")[0];

            return ui.delete([eid]);
        })
        .then(() => {
            console.log(colors.FgGreen, "Completed!", colors.Reset);
        })
        .catch((error) => {
            console.log(error);
        });
}

export const destroyer = () => {
    program
        .command("delete")
        .option(options.all, "Delete all extensions.")
        .description("Delete single extension or all.")
        .action((cmd: UiPluginOptions) => {
            const iniPath = path.join(process.cwd(), "/ui_ext_api.ini");

            if (fs.existsSync(iniPath)) {
                const config = ini.parse(fs.readFileSync(iniPath, "utf-8"));
                const ui = new UiPlugin(config.DEFAULT.vcduri, config.DEFAULT.organization, config.DEFAULT.username, config.DEFAULT.password, cmd);
                ui.list()
                    .then((data: any[]) => {
                        destroy(cmd, data, ui);
                    })
                    .catch((error) => {
                        console.log(error);
                    });
                return;
            }


            prompt(credentialsQuestions)
                .then((answers: UserCredentialsAnswers) => {
                    ui = new UiPlugin(answers.url, answers.tenant, answers.username, answers.password, cmd);
                    return ui.list();
                })
                .then((data: any[]) => {
                    destroy(cmd, data, ui);
                })
                .catch((error) => {
                    console.log(error);
                });
        });
};