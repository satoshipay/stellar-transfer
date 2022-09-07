import { Asset, Networks } from "stellar-base"
import { StellarToml } from "./stellar-toml"
import { joinURL } from "./util"
import * as toml from 'toml';

export interface TransferOptions {
  lang?: string
  walletName?: string
  walletURL?: string
}

// async function loadAccount(publicKey: any) {
//   try {
//     const accountInfo = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
//     return accountInfo.json();
//   } catch {
//     throw new Error(`Unable to fetch account with publicKey ${publicKey}`);
//   }
// }


export type TransferServer = ReturnType<typeof TransferServer>

function fail(message: string): never {
  throw Error(message)
}

function getTransferServerURL(stellarTomlData: StellarToml): string | null {
  return (
    stellarTomlData.TRANSFER_SERVER_SEP0024 ||
    stellarTomlData.TRANSFER_SERVER ||
    null
  )
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
    async get(
      path: string,
      options?: any,
    ): Promise<Response> {
      const init = {
        method: 'GET',
        headers: {
          'content-type': 'application/json;charset=UTF-8',
        },
        ...options
      };
      return await fetch(joinURL(serverURL, path), init);
    },
    async post(
      path: string,
      body: any,
      options?: any
    ): Promise<Response> {
      const init = {
        body: JSON.stringify(body),
        method: 'POST',
        headers: {
          'content-type': 'application/json;charset=UTF-8',
        },
        ...options
      };
      return await fetch(joinURL(serverURL, path), init);
    }
  }
}

export async function openTransferServer(
  domain: string,
  network: Networks,
  options?: TransferOptions
) {
  const response = await fetch(`https://${domain}/.well-known/stellar.toml`)
  const result = await response.text()
  const stellarTomlData = toml.parse(result)
  const serverURL =
    getTransferServerURL(stellarTomlData) ||
    fail(`There seems to be no transfer server on ${domain}.`)
  const assets = resolveAssets(stellarTomlData, domain)
  return TransferServer(domain, serverURL, assets, network, options)
}

export async function locateTransferServer(
  domain: string,
  // options?: StellarTomlResolver.StellarTomlResolveOptions
): Promise<string | null> {
  const response = await fetch(`https://${domain}/.well-known/stellar.toml`)
  const result = await response.text()
  const stellarTomlData = toml.parse(result)
  // const stellarTomlData = await StellarTomlResolver.resolve(domain, options)
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

  // const horizon = new Server(horizonURL)
  // const accountData = await horizon.loadAccount(asset.getIssuer())
  // const homeDomain: string | undefined = (accountData as any).home_domain
  const homeDomain = 'api.anclap.com'
  if (!homeDomain) {
    return null
  }

  // return locateTransferServer(homeDomain)
  return null
}
