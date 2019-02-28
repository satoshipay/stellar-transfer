import { Asset, Server } from "stellar-sdk"
import { fetchTransferServerURL } from "./resolver"
import { TransferInfo, TransferServer } from "./transfer-server"

type MaybeAsync<T> = T | Promise<T>
type NoUndefined<T> = T extends (infer X | undefined) ? X : T

type AssetTransferServerCache = Map<Asset, TransferServer | null>

export interface AssetTransferInfo {
  transferInfo: TransferInfo
  deposit?: TransferInfo["deposit"][""]
  withdraw?: TransferInfo["withdraw"][""]
}

export interface EmptyAssetTransferInfo {
  deposit: undefined
  transferInfo: undefined
  withdraw: undefined
}

const dedupe = <T>(array: T[]): T[] => Array.from(new Set(array))

async function map<K, V>(
  inputs: K[],
  mapper: (input: K) => MaybeAsync<V | undefined>
): Promise<Map<K, NoUndefined<V>>> {
  const unorderedMap = new Map<K, NoUndefined<V>>()
  await Promise.all(
    inputs.map(async input => {
      const mapped = await mapper(input)
      if (typeof mapped !== "undefined") {
        unorderedMap.set(input, mapped as NoUndefined<V>)
      }
    })
  )

  // Now restore order of items by iterating synchronously
  // Important, since some of that data is used for form building

  const orderedMap = new Map<K, NoUndefined<V>>()
  for (const input of Array.from(unorderedMap.keys())) {
    if (unorderedMap.has(input)) {
      orderedMap.set(input, unorderedMap.get(input) as NoUndefined<V>)
    }
  }
  return orderedMap
}

export async function fetchTransferServers(
  horizon: Server,
  assets: Asset[]
): Promise<AssetTransferServerCache> {
  for (const asset of assets) {
    if (asset.isNative()) {
      throw Error("Native XLM asset does not have an issuer account.")
    }
  }

  const issuers = dedupe(assets.map(asset => asset.getIssuer()))
  const transferServerURLsByIssuer = await map(
    issuers,
    async issuerAccountID => {
      const url = await fetchTransferServerURL(horizon, issuerAccountID)
      return url || undefined
    }
  )

  return map(assets, asset => {
    const url = transferServerURLsByIssuer.get(asset.getIssuer())
    if (!url) {
      return null
    }

    return TransferServer(url)
  })
}

export async function fetchAssetTransferInfos(
  transferServers: AssetTransferServerCache
) {
  const assets = Array.from(transferServers.keys())

  // This dedupe() is important to only resolve each transfer server once
  const transferServerURLs = dedupe(
    Array.from(transferServers.values())
      .filter((server): server is TransferServer => server !== null)
      .map(server => server.url)
  )

  // Important to keep the fetchInfo() as a separate step,
  // so we fetch once per server, not once per asset
  const transferServerInfosByURL = await map(transferServerURLs, url =>
    TransferServer(url).fetchInfo()
  )

  return map(assets, async asset => {
    const transferServer = transferServers.get(asset)

    const transferInfo = transferServer
      ? transferServerInfosByURL.get(transferServer.url)
      : null

    if (!transferInfo) {
      return {
        deposit: undefined,
        transferInfo: undefined,
        withdraw: undefined
      }
    }
    return {
      transferInfo,
      deposit: transferInfo.deposit[asset.getCode()],
      withdraw: transferInfo.withdraw[asset.getCode()]
    }
  })
}
