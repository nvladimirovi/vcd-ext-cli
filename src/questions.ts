import fs from "fs";
import inquirer from "inquirer";

const CHOICES = fs.readdirSync(`${__dirname}/templates`);
const CURR_DIR = process.cwd();

// Craft questions to present to users
export const questions: inquirer.Questions<{}> = [
    {
        name: "projectChoice",
        type: "list",
        message: "What project template would you like to generate?",
        choices: CHOICES
    },
    {
        name: "projectName",
        type: "input",
        message: "Project name:",
        validate: function (input: string) {
            if (fs.existsSync(`${CURR_DIR}/${input}`)) {
                return "You have this directory already.";
            }

            if (/^([A-Za-z\-_\d])+$/.test(input)) {
                return true;
            } else {
                return "Project name may only include letters, numbers, underscores and hashes.";
            }
        }
    },
    {
        name: "urn",
        type: "input",
        message: "Plug-in urn:",
        default: "vmware:vcloud:plugin:seed"
    },
    {
        name: "name",
        type: "input",
        message: "Plug-in name:",
        validate: function (input: string) {
            if (input.length >= 3) return true;
            else return "Plug-in name may can not contain less then 3 letters.";
        }
    },
    {
        name: "containerVersion",
        type: "input",
        message: "Plug-in containerVersion:",
        default: "9.1.0"
    },
    {
        name: "version",
        type: "input",
        message: "Plug-in version:",
        default: "1.0.0"
    },
    {
        name: "scope",
        type: "input",
        message: "Plug-in scope:",
        default: "tenant"
    },
    {
        name: "permissions",
        type: "input",
        message: "Plug-in permissions:",
        default: ""
    },
    {
        name: "description",
        type: "input",
        message: "Plug-in description:",
        default: ""
    },
    {
        name: "vendor",
        type: "input",
        message: "Plug-in vendor:",
        validate: function (input: string) {
            if (input.length >= 3) return true;
            else return "Plug-in name may can not contain less then 3 letters.";
        }
    },
    {
        name: "license",
        type: "input",
        message: "Plug-in license:",
        default: "MIT"
    },
    {
        name: "link",
        type: "input",
        message: "Plug-in link:",
        validate: (input: string) => {
            if (/^(http|https):\/\//g.test(input)) return true;
            else return "Url link has to be http or https";
        }
    },
    {
        name: "route",
        type: "input",
        message: "Plug-in route",
        default: "plugin"
    }
];