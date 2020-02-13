import axios, { AxiosRequestConfig, AxiosResponse } from "axios"
import { Asset, Networks, Server, StellarTomlResolver } from "stellar-sdk"
import { StellarToml } from "./stellar-toml"
import { joinURL } from "./util"

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
  network: Networks,
  options: TransferOptions = {}
) {
  return {
    get assets() {
      return assets
    },
    get domain() {
      return domain
    },
    get network() {
      return network
    },
    get url() {
      return serverURL
    },
    get options() {
      return options
    },
    async get<T = any>(
      path: string,
      reqOptions?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
      return axios.get(joinURL(serverURL, path), reqOptions)
    },
    async post<T = any>(
      path: string,
      body: any,
      reqOptions?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
      return axios.post(joinURL(serverURL, path), body, reqOptions)
    }
  }
}

export async function openTransferServer(
  domain: string,
  network: Networks,
  options?: TransferOptions
) {
  const stellarTomlData = await StellarTomlResolver.resolve(domain)
  const serverURL =
    getTransferServerURL(stellarTomlData) ||
    fail(`There seems to be no transfer server on ${domain}.`)
  const assets = resolveAssets(stellarTomlData, domain)
  return TransferServer(domain, serverURL, assets, network, options)
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
