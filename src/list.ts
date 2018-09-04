import program from "commander";
import { UiPlugin } from "./classes/UiPlugin";
import { prompt } from "inquirer";
import { credentialsQuestions } from "./questions";
import { UserCredentialsAnswers } from "./interfaces/UserAnswer";
import { colors } from "./utilities/colors";
import fs from "fs";
import path from "path";
import ini from "ini";

export const list = () => {
    program
        .command("list")
        .description("List all plugins for given tenant and user.")
        .action(() => {
            const iniPath = path.join(process.cwd(), "/ui_ext_api.ini");

            if (fs.existsSync(iniPath)) {
                const config = ini.parse(fs.readFileSync(iniPath, "utf-8"));
                const ui = new UiPlugin(config.DEFAULT.vcduri, config.DEFAULT.organization, config.DEFAULT.username, config.DEFAULT.password);
                ui.list()
                    .then((data) => {
                        console.log(data[1]);
                    })
                    .catch((error) => {
                        console.log(colors.FgRed, error, colors.Reset);
                    });
                return;
            }

            return prompt(credentialsQuestions)
                .then((answers: UserCredentialsAnswers) => {
                    const ui = new UiPlugin(answers.url, answers.tenant, answers.username, answers.password);
                    return ui.list();
                })
                .then((data) => {
                    console.log(data[1]);
                })
                .catch((error) => {
                    console.log(colors.FgRed, error, colors.Reset);
                });
        });
};
