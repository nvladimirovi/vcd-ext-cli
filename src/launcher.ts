import program from "commander";
import { UiPlugin, UiPluginOptions } from "./classes/UiPlugin";
import { prompt } from "inquirer";
import { credentialsQuestions } from "./questions";
import { UserCredentialsAnswers } from "./interfaces/UserAnswer";
import { colors } from "./utilities/colors";
import { options } from "./utilities/options";
import fs from "fs";
import path from "path";
import ini from "ini";

export const launcher = () => {
    program
        .command("deploy")
        .option(options.all, "Publish extension for all tenants.")
        .option(options.replace, "Replace uploaded one with the current.")
        .alias("D")
        .description("Deploy plugin with given endpoint, user and password.")
        .action((cmd: UiPluginOptions) => {
            const iniPath = path.join(process.cwd(), "/ui_ext_api.ini");

            if (fs.existsSync(iniPath)) {
                const config = ini.parse(fs.readFileSync(iniPath, "utf-8"));
                const ui = new UiPlugin(config.DEFAULT.vcduri, config.DEFAULT.organization, config.DEFAULT.username, config.DEFAULT.password, cmd);
                ui.deploy()
                    .then(() => {
                        console.log(colors.FgGreen, "Completed!", colors.Reset);
                    })
                    .catch((error: Error) => {
                        console.log(colors.FgRed, error, colors.Reset);
                    });
                return;
            }

            prompt(credentialsQuestions)
                .then((answers: UserCredentialsAnswers) => {
                    const ui = new UiPlugin(answers.url, answers.tenant, answers.username, answers.password, cmd);
                    return ui.deploy();
                })
                .then(() => {
                    console.log(colors.FgGreen, "Completed!", colors.Reset);
                })
                .catch((error: Error) => {
                    console.log(colors.FgRed, error, colors.Reset);
                });
        });
};