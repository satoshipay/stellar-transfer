import axios, { AxiosRequestConfig, AxiosResponse } from "axios"
import { Asset, Server, StellarTomlResolver } from "stellar-sdk"
import { StellarToml } from "./stellar-toml"
import { TransferTransaction } from "./transactions"
import { joinURL } from "./util"

export interface FetchTransactionsOptions {
  /** The response should contain transactions starting on or after this date & time. */
  noOlderThan?: string
  /** The response should contain at most limit transactions. */
  limit?: number
  /** The kind of transaction that is desired. Should be either deposit or withdrawal. */
  kind?: "deposit" | "withdrawal"
  /** The response should contain transactions starting prior to this ID (exclusive). */
  pagingId?: string
}

export interface TransferOptions {
  lang?: string
  walletName?: string
  walletURL?: string
}

export type TransferServer = ReturnType<typeof TransferServer>

function fail(message: string): never {
  throw Error(message)
}

function getTransferServerURL(stellarTomlData: StellarToml): string | null {
  return stellarTomlData.TRANSFER_SERVER || null
}

export function TransferServer(
  domain: string,
  serverURL: string,
  assets: Asset[],
  options: TransferOptions = {}
) {
  return {
    get assets() {
      return assets
    },
    get domain() {
      return domain
    },
    get url() {
      return serverURL
    },
    get options() {
      return options
    },
    async get<T = any>(
      path: string,
      options?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
      return axios(joinURL(serverURL, path), options)
    },
    async fetchTransaction(
      id: string,
      idType: "transfer" | "stellar" | "external" = "transfer",
      authToken?: string
    ): Promise<{ transaction: TransferTransaction }> {
      const headers: any = {}

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`
      }

      const idParamName =
        idType === "stellar"
          ? "stellar_transaction_id"
          : idType === "external"
          ? "external_transaction_id"
          : "id"

      const response = await axios(joinURL(serverURL, "/transaction"), {
        headers,
        params: { [idParamName]: id }
      })
      return response.data
    },

    async fetchTransactions(
      assetCode: string,
      authToken?: string,
      options: FetchTransactionsOptions = {}
    ): Promise<{ transactions: TransferTransaction[] }> {
      const headers: any = {}

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`
      }

      const response = await axios(joinURL(serverURL, "/transactions"), {
        headers,
        params: {
          asset_code: assetCode,
          kind: options.kind,
          limit: options.limit,
          no_older_than: options.noOlderThan,
          paging_id: options.pagingId
        }
      })
      return response.data
    }
  }
}

export async function openTransferServer(
  domain: string,
  options?: TransferOptions
) {
  const stellarTomlData = await StellarTomlResolver.resolve(domain)
  const serverURL =
    getTransferServerURL(stellarTomlData) ||
    fail(`There seems to be no transfer server on ${domain}.`)
  const assets = resolveAssets(stellarTomlData, domain)
  return TransferServer(domain, serverURL, assets, options)
}

export async function locateTransferServer(
  domain: string,
  options?: StellarTomlResolver.StellarTomlResolveOptions
): Promise<string | null> {
  const stellarTomlData = await StellarTomlResolver.resolve(domain, options)
  return getTransferServerURL(stellarTomlData)
}

export function resolveAssets(
  stellarTomlData: StellarToml,
  domain: string = "?"
): Asset[] {
  if (!stellarTomlData.CURRENCIES) {
    throw Error(`No CURRENCIES found in stellar.toml of domain ${domain}.`)
  }

  return stellarTomlData.CURRENCIES.filter(currency => currency.code).map(
    currency => new Asset(currency.code!, currency.issuer)
  )
}

export async function resolveTransferServerURL(
  horizonURL: string,
  asset: Asset
) {
  if (asset.isNative()) {
    throw Error("Native XLM asset does not have an issuer account.")
  }

  const horizon = new Server(horizonURL)
  const accountData = await horizon.loadAccount(asset.getIssuer())
  const homeDomain: string | undefined = (accountData as any).home_domain

  if (!homeDomain) {
    return null
  }

  return locateTransferServer(homeDomain)
}
