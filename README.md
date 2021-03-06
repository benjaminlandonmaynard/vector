![master](https://github.com/connext/vector/workflows/Master/badge.svg)

# ↗️ Vector

Vector is an ultra-simple, flexible state channel protocol and implementation.

At Connext, our goal is to build the cross-chain routing and micropayment layer of the decentralized web. Vector sits on top of Ethereum, evm-compatible L2 blockchains, and other turing-complete chains, and enables instant, near free transfers that can be routed across chains and over liquidity in any asset.

Out of the box, it supports the following features:

- 💸 Conditional transfers with arbitrary generality routed over one (eventually many) intermediary nodes.
- 🔀 Instant cross-chain and cross-asset transfers/communication. Works with any evm-compatible chain.
- 🔌 Plug in support for non-evm turing complete chains.
- 💳 Simplified deposits/withdraw, just send funds directly to the channel address from anywhere and use your channel as a wallet!
- ⛽ Native e2e gas abstraction for end-users.
- 💤 Transfers to offline recipients.

This monorepo contains a number of packages hoisted using lerna. Documentation for each package can be found in their respective readme, with some helpful links in [Architecture](#architecture) below.

Contents:

- [Quick Start](#quick-start)
- [Configuration API](#configuration-api)
- [Architecture and Module Breakdown](#architecture-and-module-breakdown)
- [Development and Running Tests](#development-and-running-tests)
- Deploying Vector to Production // TODO

## Quick start

**Prerequisites:**

- `make`: Probably already installed, otherwise install w `brew install make` or `apt install make` or similar.
- `jq`: Probably not installed yet, install w `brew install jq` or `apt install jq` or similar.
- `docker`: See the [Docker website](https://www.docker.com/) for installation instructions.

To start, clone & enter the Vector repo:

```bash
git clone https://github.com/connext/vector.git
cd vector
```

To build everything and deploy a Vector node in dev-mode, run the following:

```bash
make start

# view the node's logs
bash ops/logs.sh node
```

That's all! But beware: the first time `make start` is run, it will take a very long time (maybe 10 minutes, depends on your internet speed) but have no fear: downloads will be cached & most build steps won't ever need to be repeated again so subsequent `make start` runs will go much more quickly. Get this started asap & browse the rest of the README while the first `make start` runs.

By default, Vector will launch using two local chains (ganache with chain id `1337` and `1338`) but you can also run a local Vector stack against a public chain (or multiple chains!) such as Rinkeby. To do so, edit the `chainProviders` and `chainAddresses` fields of `config.json` according to the chain you want to support.

Note: this will start a local Connext node pointed at a remote chain, so make sure the mnemonic used to start your node is funded in the appropriate native currencies and supported chain assets. By default, the node starts with the account:

```node
mnemonic: "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
privateKey: "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3";
address: "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
```

To apply updates to `config.json`, you'll need to restart your vector node with `make restart`.

(`make start`/`make restart` are aliases for `make start-node`/`make restart-node`)

Four different Vector stacks are supported:

- `global`: standalone messaging service (+ EVMs in dev-mode)
- `node`: vector node + database
- `router`: vector node + router + database
- `duet`: 2x node/db pairs, used to test one-on-one node interactions
- `trio`: 2x node/db pairs + 1x node/router/db , used to test node interactions via a routing node.

For any of these stacks, you can manage them with:

- `make ${stack}` eg `make duet` builds everything required by the given stack
- `make start-${stack}` eg `make start-router` will start up the router stack.
- `make stop-${stack}` stops the stack
- `make restart-${stack}` stops the stack if it's running & starts it again
- `make test-${stack}` runs unit tests against some stack. It will build & start the stack if that hasn't been done already.

## Configuration Layout

The `node` and `router` stacks are configurable via the `config-node.json` and `config-router.json` files respectively. Note that the `duet` and `trio` stacks are designed exclusively for development/testing so these are not configurable.

There is an additional `config-prod.json` file that can apply to either the node or router but not both. The `config-prod.json` file contains your domain name and, because it's _not_ tracked by git, it's a good place to put overrides for secret values like API keys. A prod-mode deployment using a domain name w https must be exposed on port 443, therefore only a single prod-mode stack can run on a given machine at a time.

### Node Configuration API

`config-node.json` contains the default configuration for the `node` stack: `make start-node`.

Any of these values can be overwritten by providing the same key with a new value to `config-prod.json`.

**Node Config Keys:**

- `adminToken` (type: `string`): Currently, this is only used during development to protect a few admin endpoints eg to reset the database between tests. If/when we add admin-only features in prod, they will only be accessible to those who provide the correct adminToken.
- `chainAddresses` (type: `object`): Specifies the addresses of all relevant contracts, keyed by `chainId`.
- `chainProviders` (type: `object`): Specifies the URL to use to connect to each chain's provider, keyed by `chainId`
- `logLevel` (type: `string`): one of `"debug"`, `"info"`, `"warn"`, `"error"` to specify the maximum log level that will be printed.
- `messagingUrl` (type: `string`): The url used to connect to the messaging service.
- `mnemonic` (type: `string`): Optional. If provided, the node will use this mnemonic. If not provided, the node will use a hard coded mnemonic with testnet funds in dev-mode (production=false). If not provided in prod, docker secrets will be used to manage the mnemonic; this is a much safer place to store a mnemonic that eg holds mainnet funds.
- `port` (type: `number`): The port number on which the stack should be exposed to the outside world.
- `redisUrl` (type: `string`): The URL of the redis instance used to negotiate channel-locks.

### Router Configuration API

`config-router.json` contains the default configuration for the `router` stack's router module. The router stack also contains a node and this node's default configuration is also pulled from `config-node.json`.

The router's node can be configured by adding any of the keys in `config-node.json` to `config-router.json` (any values in `config-router.json` will take precedence). This strategy is useful if you want to run tests on a router & node stack running on the same machine.

Any config values for either the router or the node can be overwritten by adding the same key with a new value to `config-prod.json`. This is a good strategy if this machine will only be running a routing node bc these prod config changes will also be applied to a `node` stack thats running on the same machine.

**Router Config Keys:**

- `allowedSwaps` (type: `object`): Specifies which swaps are allowed & how swap rates are determined.
- `nodeUrl` (type: `string`): The URL of the node instance used to power the router's channels.
- `port` (type: `number`): The port number on which the stack should be exposed to the outside world.
- `rebalanceProfiles` (type: `object`): Specifies the thresholds & target while collateralizing some `assetId` on some `chainId`.

### Prod Configuration API

Changes to `config-prod.json` aren't tracked by git so this is a good place to store secret API keys, etc.

Be careful, changes to this file will be applied to both `node` & `router` stacks running on this machine.

**Prod Config Keys:**

- `awsAccessId` (type: `string`): An API KEY id that specifies credentials for a remote AWS S3 bucket for storing db backups
- `awsAccessKey` (type: `string`): An API KEY secret that to authenticate on a remote AWS S3 bucket for storing db backups.
- `domainName` (type: `string`): If provided, https will be auto-configured & the stack will be exposed on port 443.
- `production` (type: `boolean`): Enables prod-mode if true. Implications of this flag:
  - if `false`, ops will automatically build anything that isn't available locally before starting up a given stack. If `true`, nothing will be built locally. Instead, all images will be pulled from docker hub.
  - if `false`, the `global` stack will start up 2 local testnet evm.
  - Mnemonic handling is affected, see docs for the `mnemonic` key in node config.

## Architecture and Module Breakdown

Vector uses a layered-approach to compartmentalize risk and delegate tasks throughout protocol usage. In general, lower layers are not context-aware of higher level actions. Information flows downwards through call params and upwards through events. The only exception to this are services, which are set up at the services layer and passed down to the protocol directly.

![alt](https://i.ibb.co/wRnskD4/Vector-System-Architecture-3.png)

You can find documentation on each layer in its respective readme:

- [Contracts](https://github.com/connext/vector/blob/master/modules/contracts/) - holds user funds and disburses them during a dispute based on commitments provided by channel parties.
- [Protocol](https://github.com/connext/vector/tree/master/modules/protocol/) - creates channels, generates channel updates/commitments, validates them, and then synchronizes channel state with a peer.
- [Engine](https://github.com/connext/vector/blob/master/modules/engine/) - implements default business logic for channel updates and wraps the protocol in a JSON RPC interface.
- [Server-Node](https://github.com/connext/vector/blob/master/modules/server-node/) - sets up services to be consumed by the engine, spins up the engine, and wraps everything in REST and gRPC interfaces.
- [Router](https://github.com/connext/vector/blob/master/modules/router/) - consumes the server-node interface to route transfers across multiple channels (incl across chains/assets)

Note that the engine and protocol are isomorphic. Immediately after the core implementation is done, we plan to build a `browser-node` implementation which sets up services in a browser-compatible way and exposes a direct JS interface to be consumed by a dApp developer.

## Development and Running Tests

You can build the whole stack by running `make`.

Running tests:

- Unit tests are run using `make test-{{$moduleName}}`.
- Two party integration tests are run using `make start-duet` and then `make test-duet`
- Three party (incl routing node) itests are run using `make start-trio` and then `make test-trio`
