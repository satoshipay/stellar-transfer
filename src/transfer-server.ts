import axios from "axios"
import { StellarTomlResolver } from "stellar-sdk"
import { TransferInfo } from "./responses"
import { joinURL } from "./util"

export { TransferInfo }

export type TransferServer = ReturnType<typeof TransferServer>

export function TransferServer(serverURL: string) {
  return {
    get url() {
      return serverURL
    },
    async fetchInfo(): Promise<TransferInfo> {
      const response = await axios(joinURL(serverURL, "/info"))
      return response.data
    }
  }
}

interface StellarTomlData {
  [key: string]: any
}

export function getTransferServerURL(
  stellarTomlData: StellarTomlData
): string | null {
  return stellarTomlData.TRANSFER_SERVER || null
}

export async function locateTransferServer(
  domain: string,
  options?: StellarTomlResolver.StellarTomlResolveOptions
): Promise<string | null> {
  const stellarTomlData = await StellarTomlResolver.resolve(domain, options)
  return getTransferServerURL(stellarTomlData)
}
