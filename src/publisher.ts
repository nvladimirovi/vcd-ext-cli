import program from "commander";
import { toggleTenantScope } from "./common/toggleTenantScope";

export const publisher = () => {
    program
        .command("publish")
        .option("-a, --all", "Publish extension for all tenants.")
        .description("Publish selected plugin or all ot them for all tenants.")
        .action((cmd) => {
            toggleTenantScope(cmd, "publish");
        });
};

export const unpublisher = () => {
    program
        .command("unpublish")
        .option("-a, --all", "Unpublish extension for all tenants.")
        .description("Unpublish selected plugin or all ot them for all tenants.")
        .action((cmd) => {
            toggleTenantScope(cmd, "unpublish");
        });
};