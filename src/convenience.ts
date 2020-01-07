import { Asset, Server } from "stellar-sdk"
import { debug } from "./logger"
import {
  locateTransferServer,
  TransferInfo,
  TransferOptions,
  TransferServer
} from "./transfer-server"

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
  type NormalizedValue = NoUndefined<V>

  const unorderedMap = new Map<K, NormalizedValue>()
  await Promise.all(
    inputs.map(async input => {
      const mapped = await mapper(input)
      if (typeof mapped !== "undefined") {
        unorderedMap.set(input, mapped as NormalizedValue)
      }
    })
  )

  // Now restore order of items by iterating synchronously
  // Important, since some of that data is used for form building

  const orderedMap = new Map<K, NormalizedValue>()
  for (const input of Array.from(unorderedMap.keys())) {
    if (unorderedMap.has(input)) {
      orderedMap.set(input, unorderedMap.get(input) as NormalizedValue)
    }
  }
  return orderedMap
}

export async function fetchTransferServers(
  horizonURL: string,
  assets: Asset[],
  transferOptions?: TransferOptions
): Promise<AssetTransferServerCache> {
  for (const asset of assets) {
    if (asset.isNative()) {
      throw Error("Native XLM asset does not have an issuer account.")
    }
  }

  const fetchErrors: Error[] = []
  const horizon = new Server(horizonURL)

  const issuers = dedupe(assets.map(asset => asset.getIssuer()))
  const transferServerURLsByIssuer = await map(
    issuers,
    async issuerAccountID => {
      try {
        const accountData = await horizon.loadAccount(issuerAccountID)
        const homeDomain: string | undefined = (accountData as any).home_domain
        const url = homeDomain
          ? await locateTransferServer(homeDomain)
          : undefined
        return url || undefined
      } catch (error) {
        fetchErrors.push(error)
        return undefined
      }
    }
  )

  if (fetchErrors.length > 0 && fetchErrors.length === issuers.length) {
    // Ignore single failing transfer servers when there are multiple
    debug("Transfer server URLs could not be fetched:", fetchErrors)
    throw fetchErrors[0]
  }

  return map(assets, asset => {
    const url = transferServerURLsByIssuer.get(asset.getIssuer())
    if (!url) {
      return null
    }

    return TransferServer(url, transferOptions)
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

  const fetchErrors: Error[] = []

  // Important to keep the fetchInfo() as a separate step,
  // so we fetch once per server, not once per asset
  const transferServerInfosByURL = await map<string, TransferInfo | null>(
    transferServerURLs,
    url =>
      TransferServer(url)
        .fetchInfo()
        .catch(error => {
          fetchErrors.push(error)
          return null
        })
  )

  if (
    fetchErrors.length > 0 &&
    fetchErrors.length === transferServerURLs.length
  ) {
    // Ignore single failing transfer servers when there are multiple
    debug("Transfer server information could not be fetched:", fetchErrors)
    throw fetchErrors[0]
  }

  return map<Asset, AssetTransferInfo | EmptyAssetTransferInfo>(
    assets,
    async asset => {
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
    }
  )
}
