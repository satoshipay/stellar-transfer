import { Asset, Server } from "stellar-sdk"
import { fetchTransferServerURL } from "./resolver"
import { TransferServer } from "./transfer-server"

type MaybeAsync<T> = T | Promise<T>
type NoUndefined<T> = T extends (infer X | undefined) ? X : T

const dedupe = <T>(array: T[]): T[] => Array.from(new Set(array))

async function map<K, V>(
  inputs: K[],
  mapper: (input: K) => MaybeAsync<V | undefined>
): Promise<Map<K, NoUndefined<V>>> {
  const results = new Map<K, NoUndefined<V>>()
  await Promise.all(
    inputs.map(async input => {
      const mapped = await mapper(input)
      if (typeof mapped !== "undefined") {
        results.set(input, mapped as NoUndefined<V>)
      }
    })
  )
  return results
}

export async function fetchAssetTransferInfos(
  horizon: Server,
  assets: Asset[]
) {
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

  // This dedupe() is important to only resolve each transfer server once
  const transferServerURLs = dedupe(
    Array.from(transferServerURLsByIssuer.values())
  )
  const transferServerInfosByURL = await map(transferServerURLs, url =>
    TransferServer(url).fetchInfo()
  )

  const transferInfoByIssuer = await map(issuers, issuerAccountID => {
    const url = transferServerURLsByIssuer.get(issuerAccountID)
    if (!url) {
      // Ignore this one
      return undefined
    }

    const transferInfo = transferServerInfosByURL.get(url)
    if (!transferInfo) {
      throw Error(
        `Invariant violation: No transfer server information fetched for URL ${url}`
      )
    }

    return transferInfo
  })

  return map(assets, asset => {
    const transferInfo = transferInfoByIssuer.get(asset.getIssuer())
    return {
      transferInfo,
      deposit: transferInfo ? transferInfo.deposit[asset.getCode()] : undefined,
      withdraw: transferInfo
        ? transferInfo.withdraw[asset.getCode()]
        : undefined
    }
  })
}
