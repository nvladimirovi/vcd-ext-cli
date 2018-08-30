import program from "commander";
import { UiPlugin } from "./classes/UiPlugin";
import { prompt } from "inquirer";
import { credentialsQuestions } from "./common/questions";
import { UserCredentialsAnswers } from "./interfaces/UserAnswer";

export const launcher = () => {
    program
        .command("deploy")
        .option("-a, --all", "Publish extension for all tenants.")
        .alias("D")
        .description("Deploy plugin with given endpoint, user and password.")
        .action((cmd) => {
            prompt(credentialsQuestions)
                .then((answers: UserCredentialsAnswers) => {
                    const ui = new UiPlugin(answers.url, answers.tenant, answers.username, answers.password, cmd.all);
                    ui.deploy();
                })
                .catch((error) => {
                    console.log(error);
                });
        });
};