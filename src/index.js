"use strict";

const fs = require("fs");
const childProcess = require("child_process");

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      "before:invoke:local:invoke": this.beforeInvokeLocal.bind(this),
      "before:package:createDeploymentArtifacts": this.beforePackageDeploy.bind(
        this
      ),
      "after:package:createDeploymentArtifacts": this.afterPackageDeploy.bind(
        this
      ),
      "before:deploy:function:packageFunction": this.beforeFunctionDeploy.bind(
        this
      ),
      "after:deploy:function:packageFunction": this.afterFunctionDeploy.bind(
        this
      )
    };
  }

  _buildLocalBinary() {
    const { f } = this.options;
    const { status, error } = childProcess.spawnSync(
      `${process.env["HOME"]}/.cargo/bin/cargo`,
      ["build", "--release", "--manifest-path", `./${f}/Cargo.toml`],
      {
        stdio: "inherit",
        terminal: true,
        env: process.env
      }
    );

    if (status) {
      process.exit(status);
    }
  }

  _buildMuslBinary(f) {
    const { servicePath } = this.serverless.config;
    const { status, error } = childProcess.spawnSync(
      "docker",
      [
        "run",
        "--rm",
        "-it",
        "-v",
        `${servicePath}/${f}:/home/rust/src`,
        "ekidd/rust-musl-builder",
        "cargo",
        "build",
        "--release"
      ],
      {
        stdio: "inherit",
        terminal: true
      }
    );

    if (status) {
      console.log(error);
      process.exit(status);
    }
  }

  _copyBinary(f, target) {
    childProcess.spawnSync("mkdir", ["bin"], {
      stdio: "inherit",
      terminal: true
    });

    const { status, error } = childProcess.spawnSync(
      "cp",
      [`${target}/${f}`, `./bin/${f}`],
      {
        stdio: "inherit",
        terminal: true
      }
    );

    if (status) {
      console.log(error);
      process.exit(status);
    }
  }

  _deploy(f) {
    let { include } = this.serverless.service.package;

    this._buildMuslBinary(f);
    this._copyBinary(f, `./${f}/target/x86_64-unknown-linux-musl/release`);

    const path = `./bin/${f}`;
    include ? include.push(path) : (include = [path]);
  }

  _clean(f) {
    fs.unlinkSync(`./bin/${f}`);
  }

  beforePackageDeploy() {
    const { functions } = this.serverless.service;
    Object.keys(functions).forEach(this._deploy.bind(this));
  }

  afterPackageDeploy() {
    const { functions } = this.serverless.service;
    Object.keys(functions).forEach(this._clean.bind(this));
  }

  beforeFunctionDeploy() {
    const { f } = this.options;
    this._deploy(f);
  }

  afterFunctionDeploy() {
    const { f } = this.options;
    this._clean(f);
  }

  beforeInvokeLocal() {
    const { f } = this.options;
    this._buildLocalBinary();
  }
}

module.exports = ServerlessPlugin;
