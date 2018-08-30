import program from "commander";
import { UiPlugin, UiPluginOptions } from "./classes/UiPlugin";
import { prompt } from "inquirer";
import { credentialsQuestions } from "./questions";
import { UserCredentialsAnswers } from "./interfaces/UserAnswer";
import { colors } from "./utilities/colors";
import { options } from "./utilities/options";

export const launcher = () => {
    program
        .command("deploy")
        .option(options.all, "Publish extension for all tenants.")
        .option(options.replace, "Replace uploaded one with the current.")
        .alias("D")
        .description("Deploy plugin with given endpoint, user and password.")
        .action((cmd: UiPluginOptions) => {
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