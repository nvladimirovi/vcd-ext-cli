import fs from "fs";
import { generateFiles } from "./functions/file-generator";
import { UserInput } from "./interfaces/UserInput";

const CURR_DIR = process.cwd();
let OPTIONS_FROM_INPUT: UserInput;

export const createDirectoryContents = (templatePath: string, newProjectPath: string, options: any) => {
    // Read directory in sync
    const filesToCreate = fs.readdirSync(templatePath);
    // If there is any option
    if (options) {
        // If plugin scope property of options object isn't array
        if (!Array.isArray(options["scope"])) {
            // Split the string and assign the result array to options scope property
            options["scope"] = options["scope"].split(", ");
        } else {
            // Assign the array to options scope property
            options["scope"] = [options["scope"]];
        }

        // If permission property of options isn't array
        if (!Array.isArray(options["permissions"])) {
            // Split the string and assign the result array to options permission property
            options["permissions"] = options["permissions"].split(", ");
        } else {
            // Assign the array to options permission property
            options["permissions"] = options["permissions"];
        }

        // Assign this options to the global variable declarated above
        OPTIONS_FROM_INPUT = options;
    }

    // Loop throught the entries array
    filesToCreate.forEach(file => {
        // Create original file path
        const origFilePath = `${templatePath}/${file}`;
        // get stats about the current file
        const stats = fs.statSync(origFilePath);

        // If this entrie is a file
        if (stats.isFile()) {
            // Generate file with passed in your current directory
            generateFiles(origFilePath, newProjectPath, file, stats.size, OPTIONS_FROM_INPUT);
        } else if (stats.isDirectory()) {
            // Generate directory in your current directory
            fs.mkdirSync(`${CURR_DIR}/${newProjectPath}/${file}`);
            // Call create directory contents again
            createDirectoryContents(`${templatePath}/${file}`, `${newProjectPath}/${file}`, null);
        }
    });
};