import axios from "axios"
import { joinURL } from "./util"

export interface TransferFields {
  [fieldName: string]: {
    description: string
    optional?: boolean
    choices?: string[]
  }
}

export interface TransferInfo {
  deposit: {
    [assetCode: string]: {
      enabled: boolean
      fee_fixed?: number
      fee_percent?: number
      fields?: TransferFields
      min_amount?: number
      max_amount?: number
    }
  }
  withdraw: {
    [assetCode: string]: {
      enabled: boolean
      fee_fixed?: number
      fee_percent?: number
      min_amount?: number
      max_amount?: number
      types?: {
        [withdrawalMethod: string]: {
          fields?: TransferFields
        }
      }
    }
  }
  fee?: {
    enabled: boolean
  }
  transaction?: {
    enabled: boolean
  }
  transactions?: {
    enabled: boolean
  }
}

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
