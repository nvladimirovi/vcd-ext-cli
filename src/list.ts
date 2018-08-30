import program from "commander";
import { UiPlugin } from "./classes/UiPlugin";
import { prompt } from "inquirer";
import { credentialsQuestions } from "./questions";
import { UserCredentialsAnswers } from "./interfaces/UserAnswer";
import { colors } from "./utilities/colors";

export const list = () => {
    program
        .command("list")
        .description("List all plugins for given tenant and user.")
        .action(() => {
            prompt(credentialsQuestions)
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
