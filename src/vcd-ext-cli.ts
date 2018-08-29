#!/usr/bin/env node

import program from "commander";
import { generator } from "./generator";
import { launcher } from "./launcher";

program
    .version("1.0.0")
    .description("vClould Director Extension CLI");

generator();
launcher();

program.parse(process.argv);