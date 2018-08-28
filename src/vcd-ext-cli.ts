#!/usr/bin/env node

import fs from "fs";
import program from "commander";
import inquirer from "inquirer";
import { UserAnswer } from "./interfaces/UserAnswer";
import { PluginMetadata } from "./interfaces/PluginMetadata";
import ejs from "ejs";
import unzipper from "unzipper";
import { questions } from "./questions";

const { prompt } = inquirer;
const CURR_DIR = process.cwd();

const dynamicFiles = new Set<string>([
    "src\\public\\i18n.json",
    "src\\public\\manifest.json",
    "package.json"
]);

function populateOptions(answers: inquirer.Answers): PluginMetadata {
    const options: any = {};
    Object
        .keys(answers)
        .forEach((key) => {
            if (key === "projectChoice" || key === "projectName") return;

            options[key] = answers[key];
        });

    const parsedOptionsCopy: PluginMetadata = <any>Object.assign({}, options);

    // If plugin scope property of options object isn't array
    if (!Array.isArray(options["scope"])) {
        // Split the string and assign the result array to options scope property
        parsedOptionsCopy["scope"] = options["scope"].split(", ");
    } else {
        // Assign the array to options scope property
        parsedOptionsCopy["scope"] = [options["scope"]];
    }

    // If permission property of options isn't array
    if (!Array.isArray(options["permissions"])) {
        // Split the string and assign the result array to options permission property
        parsedOptionsCopy["permissions"] = options["permissions"].split(", ");
    } else {
        // Assign the array to options permission property
        parsedOptionsCopy["permissions"] = [options["permissions"]];
    }

    return parsedOptionsCopy;
}

function parseFileName(fileName: string) {
    const pathArray = fileName.split("/");
    pathArray.splice(pathArray.indexOf(pathArray[0]), 1);

    let parsedName = "";
    pathArray.forEach((el, index) => {
        if (index === 0) {
            parsedName += el;
            return;
        }

        parsedName += `\\${el}`;
    });

    return parsedName;
}

program.version("1.0.0").description("vClould Director Extension CLI");
program
    .command("generate")
    .alias("g")
    .description("Generate Project Template")
    .action(() => {
        prompt(questions)
            .then((answers: UserAnswer) => {
                const projectChoice = answers["projectChoice"];
                const projectName = answers["projectName"];
                const templatePath = `${__dirname}\\templates\\${projectChoice}`;

                const parsedOptionsCopy = populateOptions(answers);
                fs.mkdirSync(`${CURR_DIR}\\${projectName}`);

                fs.createReadStream(templatePath)
                    .pipe(unzipper.Parse())
                    .on("entry", function (entry) {
                        const fileName: string = entry.path;
                        const type: string = entry.type; // 'Directory' or 'File'

                        const parsedName = parseFileName(fileName);
                        const filePath = `${CURR_DIR}\\${projectName}\\${parsedName}`;

                        if (type === "File") {
                            entry
                                .buffer()
                                .then((content: Buffer) => {
                                    fs.writeFileSync(filePath, content, "UTF-8");

                                    if (dynamicFiles.has(parsedName)) {
                                        ejs.renderFile(filePath, { data: parsedOptionsCopy }, {}, (err: Error, data: string) => {
                                            const writeStream = fs.createWriteStream(filePath);
                                            // If error log it
                                            if (err) console.log("Error in renderFile", err);
                                            // Pass the data to the writable stream instance
                                            writeStream.write(data);
                                            // Close the stream after data is wrotten.
                                            writeStream.close();
                                        });
                                    }
                                });
                        } else if (type === "Directory") {
                            fs.mkdirSync(`${CURR_DIR}\\${projectName}\\${parsedName}`);
                        }
                    });
            });
    });

program.parse(process.argv);