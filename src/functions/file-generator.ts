import fs from "fs";
import path from "path";
import ejs from "ejs";
import { UserInput } from "../interfaces/UserInput";

const CURR_DIR = process.cwd();

const dynamicFiles = new Set<string>([
  "package.json",
  "manifest.json",
  "i18n.json"
]);

/**
 * Generates staic file copy
 */
function genereateFileCopy (origFilePath: string, filesize: number, writeStream: fs.WriteStream) {
  // Create readable stream instance with orginal file path
  const readStream = fs.createReadStream(origFilePath);

  // On error log it
  readStream.on("error", (error) => {
    console.error("Error in generate files copy function occurred.", error);
  });

  // Pass the content to writable stream
  readStream.pipe(writeStream);
}

/**
 * Generates files with dynamic content populated with ejs.
 * @param {*} origFilePath orginal file path
 * @param {*} writeStream writable stream instance
 * @param {*} options options passed by the user
 */
function generateDynamicFile (origFilePath: string, writeStream: fs.WriteStream, options: UserInput) {
  // Render file with dynamic content which is in options object
  ejs.renderFile(origFilePath, { options }, {}, (err: Error, data) => {
    // If error log it
    if (err) console.log("Error in renderFile", err);
    // Pass the data to the writable stream instance
    writeStream.write(data);
  });
}

/**
 * Generates static or dynamic files in your new project directory.
 */
export function generateFiles (origFilePath: string, newProjectPath: string, file: string, filesize: number, options: UserInput) {
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
    // Copy and populate file from template and save it in new project directory
    generateDynamicFile(origFilePath, writeStream, options);
  } else {
    // Create copy of the file and save it in new project directory
    genereateFileCopy(origFilePath, filesize, writeStream);
  }
}