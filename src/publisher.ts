import program from "commander";
import { toggleTenantScope } from "./common/common";
import { options } from "./utilities/options";
import { UiPluginOptions } from "./classes/UiPlugin";
import path from "path";

const iniPath = path.join(process.cwd(), "/ui_ext_api.ini");

export const publisher = () => {
    program
        .command("publish")
        .option(options.all, "Publish extension for all tenants.")
        .description("Publish selected plugin or all of them for all tenants.")
        .action((cmd: UiPluginOptions) => {
            toggleTenantScope(cmd, "publish", iniPath);
        });
};

export const unpublisher = () => {
    program
        .command("unpublish")
        .option(options.all, "Unpublish extension for all tenants.")
        .description("Unpublish selected plugin or all of them for all tenants.")
        .action((cmd: UiPluginOptions) => {
            toggleTenantScope(cmd, "unpublish", iniPath);
        });
};