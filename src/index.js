"use strict";

const fs = require("fs");
const childProcess = require("child_process");

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      "before:invoke:local:invoke": this.beforeInvokeLocal.bind(this),
      "after:invoke:local:invoke": this.afterInvokeLocal.bind(this),
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
    childProcess.spawnSync(
      `${process.env["HOME"]}/.cargo/bin/cargo`,
      ["build", "--release"],
      {
        stdio: "inherit",
        terminal: true
      }
    );
  }

  _buildMuslBinary() {
    const { servicePath } = this.serverless.config;
    const { status, error } = childProcess.spawnSync(
      "docker",
      [
        "run",
        "--rm",
        "-it",
        "-v",
        `${servicePath}:/home/rust/src`,
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

  _copyBinary(target) {
    const { service } = this.serverless.service;
    const { status, error } = childProcess.spawnSync(
      "cp",
      [`${target}/${service}`, `./${service}`],
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

  _deploy() {
    const { service } = this.serverless;
    let { include } = service.package;

    this._buildMuslBinary();
    this._copyBinary(`./target/x86_64-unknown-linux-musl/release`);

    include ? include.push(service) : (include = [service]);
  }

  _clean() {
    const { service } = this.serverless.service;
    fs.unlinkSync(service);
  }

  beforePackageDeploy() {
    this._deploy();
  }

  afterPackageDeploy() {
    this._clean();
  }

  beforeFunctionDeploy() {
    this._deploy();
  }

  afterFunctionDeploy() {
    this._clean();
  }

  beforeInvokeLocal() {
    this._buildLocalBinary();
    this._copyBinary(`./target/release`);
  }

  afterInvokeLocal() {
    this._clean();
  }
}

module.exports = ServerlessPlugin;
