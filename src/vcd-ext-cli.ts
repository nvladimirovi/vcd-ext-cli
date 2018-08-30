#!/usr/bin/env node

import program from "commander";
import { generator } from "./generator";
import { launcher } from "./launcher";
import { publisher, unpublisher } from "./publisher";
import { list } from "./list";
import { destroyer } from "./destroy";

program
    .version("1.0.0")
    .description("vClould Director Extension CLI");

list();
generator();
launcher();
publisher();
unpublisher();
destroyer();

program.parse(process.argv);