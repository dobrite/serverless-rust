# Serverless-Rust

A plugin for [serverless](https://serverless.com/) to run [Rust](https://www.rust-lang.org/) on [AWS Lambda](https://aws.amazon.com/lambda/). It uses [Rust Musl Bulder](https://github.com/emk/rust-musl-builder).

Compiles a Rust binary per function, spawns it as a process, and passes data back and forth through stdio.

This is still super early and more of a POC. More features and testing are still needed.

### Assumes

* Musl will work for the resultant binary
* Docker is installed and on `PATH` (in Node's runtime)
* Cargo is at `~/.cargo/bin`
* Rust project named same as function
* Single function

### Works (at least on my machine)

* `sls deploy`
* `sls deploy function`
* `sls invoke local`
* `sls invoke`

### Nice-to-haves

* `sls create --template` would be nice. (is this possible?)
  * Python and Node runtime support (currently Node 6.10)

> Based on [Rust on Lambda](http://julienblanchard.com/2015/rust-on-aws-lambda/)
