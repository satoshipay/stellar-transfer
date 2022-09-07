## SEP 24 SDK for Cloudflare Workers


[Stellar Ecosystem Proposal 24 - "Anchor/Client interoperability"](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md)

Allows Stellar wallets to withdraw or deposit third-party fiat or crypto assets like USD, EURT, BTC, ETH, ...

Users can send EURT to the anchor, requesting a payout in fiat EUR to their SEPA account via bank transfer, for instance.

## Installation

```
npm install @hacksur/stellar-transfer
# or with yarn:
yarn add @hacksur/stellar-transfer
```

## Concepts

- _Deposit_ - Send some value outside the Stellar network to the anchor who will send us tokens on the Stellar network
- _KYC_ (Know your customer) - Prove your identity to the anchor to meet anti-money-laundering regulations
- _Transfer server_ - That is the anchor's service responsible for deposit/withdrawal of tokens
- _Withdrawal_ - Send tokens on the Stellar network to its anchor who will pay us out outside the Stellar network

## Usage

### Fetch transfer server metadata

```ts
import {
  openTransferServer,
  fetchTransferInfos,
  TransferServer
} from "@hacksur/stellar-transfer"
import { Networks } from "stellar-sdk"

const transferServer = await openTransferServer(
  "www.anchorusd.com",
  Networks.TESTNET,
  {
    // Optional
    lang: "en",
    wallet_name: "Demo wallet",
    wallet_version: "1.2.3"
  }
)

const transferInfos = await fetchTransferInfos(transferServer)
const { depositableAssets, withdrawableAssets } = transferInfos

console.log(
  `Depositable assets: ${depositableAssets
    .map(asset => asset.getCode())
    .join(", ")}`
)
console.log(
  `Withdrawable assets: ${withdrawableAssets
    .map(asset => asset.getCode())
    .join(", ")}`
)
```

### Request a withdrawal

```ts
import {
  openTransferServer,
  KYCResponseType,
  TransferResultType,
  TransferServer,
  Withdrawal,
  WithdrawalType
} from "@hacksur/stellar-transfer"
import { Networks } from "stellar-sdk"

const transferServer = await openTransferServer(
  "www.anchorusd.com",
  Networks.TESTNET
)
const transferInfos = await fetchTransferInfos(transferServer)

const { withdrawableAssets } = transferInfos
const assetToWithdraw = withdrawableAssets.find(asset => asset.code === "USD")

const withdrawal = Withdrawal(transferServer, assetToWithdraw, {
  // Optional if using interactive withdrawal (SEP-6 / SEP-24, not SEP-26)
  type: WithdrawalType.bankAccount,
  dest: "DE00 1234 5678 9012 3456 00",
  dest_extra: "NOLADEXYZ"
})

const instructions = await withdrawal.interactive(
  /*
   * SEP-10 auth might be necessary or not, depending on anchor.
   * Check `authentication_required` in info response.
   */
  sep10AuthToken
)

if (instructions.type === TransferResultType.ok) {
  // `instructions.data` contains the information where and how to send the tokens
  // to conduct the withdrawal
} else if (
  instructions.type === TransferResultType.kyc &&
  instructions.subtype === KYCResponseType.interactive
) {
  // Open interactive KYC page at `instructions.data.url`
  // Use `instructions.data.id` to query the withdrawal transaction status
} else if (
  instructions.type === TransferResultType.kyc &&
  instructions.subtype === KYCResponseType.nonInteractive
) {
  // SEP-12 data submission
} else if (
  instructions.type === TransferResultType.kyc &&
  instructions.subtype === KYCResponseType.status
) {
  if (instructions.data.status === "pending") {
    // KYC data is being reviewed – poll the withdrawal transaction status until it changes, then proceed
  } else if (instructions.data.status === "denied") {
    throw Error(
      `KYC has failed. Get more details here: ${
        instructions.data.more_info_url
      }`
    )
  }
}
```

### Bulk operations

```ts
import {
  fetchAssetTransferInfos,
  fetchTransferServers,
  TransferInfo
} from "@hacksur/stellar-transfer"
import { Asset, Server } from "stellar-sdk"

const assets = [
  new Asset("EURT", "GAP5LETOV6YIE62YAM56STDANPRDO7ZFDBGSNHJQIYGGKSMOZAHOOS2S"),
  new Asset("USD", "GDUKMGUGDZQK6YHYA5Z6AY2G4XDSZPSZ3SW5UN3ARVMO6QSRDWP5YLEX")
]
const horizon = new Server("https://stellar-horizon.satoshipay.io/")

const assetTransferServers: Map<
  Asset,
  TransferServer | null
> = await fetchTransferServers(horizon, assets)
const assetTransferInfos: Map<
  Asset,
  AssetTransferInfo
> = await fetchAssetTransferInfos(assetTransferServers)

interface AssetTransferInfo {
  deposit: TransferInfo["deposit"][""] // Deposit metadata for this asset
  transferInfo: TransferInfo // Complete server metadata of this anchor
  withdraw: TransferInfo["withdraw"][""] // Withdrawal metadata for this asset
}
```

### Response types

We provide TypeScript type declarations for all responses of the `/info`, `/deposit` & `/withdraw` endpoints. See [`src/responses.ts`](./src/responses.ts).

## License

GPL v3
