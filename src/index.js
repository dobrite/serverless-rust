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
    const { service } = this.serverless.service;
    childProcess.spawnSync(
      `${process.env["HOME"]}/.cargo/bin/cargo`,
      ["build", "--release", "--manifest-path", `./${service}/Cargo.toml`],
      {
        stdio: "inherit",
        terminal: true
      }
    );
  }

  _buildMuslBinary() {
    const { service } = this.serverless.service;
    const { servicePath } = this.serverless.config;
    const { status, error } = childProcess.spawnSync(
      "docker",
      [
        "run",
        "--rm",
        "-it",
        "-v",
        `${servicePath}/${service}:/home/rust/src`,
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
    childProcess.spawnSync("mkdir", ["bin"], {
      stdio: "inherit",
      terminal: true
    });

    const { status, error } = childProcess.spawnSync(
      "cp",
      [`${target}/${service}`, `./bin/${service}`],
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
    this._copyBinary(
      `./${service.service}/target/x86_64-unknown-linux-musl/release`
    );

    const path = `./bin/${service.service}`;

    include ? include.push(path) : (include = [path]);
  }

  _clean() {
    const { service } = this.serverless.service;
    fs.unlinkSync(`./bin/${service}`);
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
    const { service } = this.serverless.service;
    this._buildLocalBinary();
    this._copyBinary(`./${service}/target/release`);
  }

  afterInvokeLocal() {
    this._clean();
  }
}

module.exports = ServerlessPlugin;
