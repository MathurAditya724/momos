#!/usr/bin/env node
require("dotenv").config();
const builder = require("electron-builder");

const config = {};

builder.build({ config });
