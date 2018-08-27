import fs from "fs";
import path from "path";
import ejs from "ejs";
import { PluginMetadata, RawPluginMetadata } from "./interfaces/PluginMetadata";

const dynamicFiles = new Set<string>([
    "package.json",
    "manifest.json",
    "i18n.json"
]);
const CURR_DIR = process.cwd();

let parsedOptionsCopy: PluginMetadata;

export const createDirectoryContents = (templatePath: string, newProjectPath: string, options: RawPluginMetadata) => {
    // Read directory in sync
    const filesToCreate = fs.readdirSync(templatePath);
    // If there is any option
    if (options) {
        parsedOptionsCopy = <any>Object.assign({}, options);

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
            // The name of the file (fileName.jpg)
            const fileName = path.basename(origFilePath);
            // The directory where all of static and dynamic files will go
            const writePath = `${CURR_DIR}/${newProjectPath}/${file}`;
            // Writable stream instance to write on the disk
            const writeStream = fs.createWriteStream(writePath);

            // On error log it
            writeStream.on("error", (error: Error) => {
                console.error("Error in generate files function occurred.", error);
            });

            // If passed file name is in the list of dynamic files
            if (dynamicFiles.has(fileName)) {
                ejs.renderFile(origFilePath, { data: parsedOptionsCopy }, {}, (err: Error, data: string) => {
                    // If error log it
                    if (err) console.log("Error in renderFile", err);
                    // Pass the data to the writable stream instance
                    writeStream.write(data);
                });
            } else {
                // Create copy of the file and save it in new project directory
                const readStream = fs.createReadStream(origFilePath);

                // On error log it
                readStream.on("error", (error) => {
                    console.error("Error in generate files copy function occurred.", error);
                });

                // Pass the content to writable stream
                readStream.pipe(writeStream);
            }
        } else if (stats.isDirectory()) {
            // Generate directory in your current directory
            fs.mkdirSync(`${CURR_DIR}/${newProjectPath}/${file}`);
            // Call create directory contents again
            createDirectoryContents(`${templatePath}/${file}`, `${newProjectPath}/${file}`, null);
        }
    });
};