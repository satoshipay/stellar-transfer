# @satoshipay/stellar-sep-6

[Stellar Ecosystem Proposal 6 - "Anchor/Client interoperability"](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0006.md) client SDK, allowing Stellar wallets to withdraw or deposit third-party fiat or crypto assets like USD, EURT, BTC, ETH, ...

That means that users can send EURT to the anchor, requesting a payout in fiat EUR to their SEPA account via bank transfer, for instance.

**Note: This package is still considered experimental. Breaking changes should be expected.**

## Installation

```
npm install @satoshipay/stellar-sep-6
# or with yarn:
yarn add @satoshipay/stellar-sep-6
```

## Concepts

- _Deposit_ - Send some value outside the Stellar network to the anchor who will send us tokens on the Stellar network
- _KYC_ (Know your customer) - Prove your identity to the anchor to meet anti-money-laundering regulations
- _Transfer server_ - That is the anchor's service responsible for deposit/withdrawal of tokens
- _Withdrawal_ - Send tokens on the Stellar network to its anchor who will pay us out outside the Stellar network

## Usage

### Look up an anchor's transfer server

```ts
import { fetchTransferServerURL } from "@satoshipay/stellar-sep-6"
import { Server } from "stellar-sdk"

const horizon = new Server("https://stellar-horizon.satoshipay.io/")
const eurtIssuer = "GAP5LETOV6YIE62YAM56STDANPRDO7ZFDBGSNHJQIYGGKSMOZAHOOS2S"

const transferServerURL: string | null = await fetchTransferServerURL(
  horizon,
  eurtIssuer
)
```

### Fetch transfer server metadata

```ts
import { TransferServer } from "@satoshipay/stellar-sep-6"

const transferServer = TransferServer(transferServerURL)
const info = await transferServer.fetchInfo()
```

### Request a withdrawal

```ts
import { TransferServer } from "@satoshipay/stellar-sep-6"
import { Keypair } from "stellar-sdk"

const myKeypair = Keypair.fromSecret("S...")
const transferServer = TransferServer(transferServerURL)

const result = await transferServer.withdraw("bank_account", "EURT", {
  account: myKeypair.publicKey(),

  // The `fetchInfo()` result describes what needs to be passed here
  dest: "DE00 1234 5678 9012 3456 00",
  dest_extra: "NOLADEXYZ"
})

if (result.type === "success") {
  // `result.data` contains the information where and how to send the tokens
  // to initiate the withdrawal...
} else if (
  result.type === "kyc" &&
  result.data.type === "interactive_customer_info_needed"
) {
  // Redirect to anchor's KYC page...
} else if (
  result.type === "kyc" &&
  result.data.type === "non_interactive_customer_info_needed"
) {
  // Request KYC data from the user in our app, then send to anchor...
} else if (
  result.type === "kyc" &&
  result.data.type === "customer_info_status"
) {
  // `result.data.status` will be "pending" or "denied"
  // If the KYC succeeded, the anchor will not send this response, but `result.type = "success"`
}
```

### Bulk operations

```ts
import {
  fetchAssetTransferInfos,
  fetchTransferServers,
  TransferInfo
} from "@satoshipay/stellar-sep-6"
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
