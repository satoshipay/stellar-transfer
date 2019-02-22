import { Server, StellarTomlResolver } from "stellar-sdk"
import { debug } from "./logger"

interface StellarTomlData {
  [key: string]: any
}

export function getTransferServerURL(
  stellarTomlData: StellarTomlData
): string | null {
  return stellarTomlData.TRANSFER_SERVER || null
}

export async function fetchTransferServerURL(
  horizon: Server,
  issuerAccountID: string
): Promise<string | null> {
  const account = await horizon.loadAccount(issuerAccountID)
  const domainName = (account as any).home_domain

  if (!domainName) {
    debug(
      `Transfer server cannot be resolved. Issuing account has no home_domain: ${issuerAccountID}`
    )
    return null
  }

  const stellarTomlData = await StellarTomlResolver.resolve(domainName)
  return getTransferServerURL(stellarTomlData)
}
