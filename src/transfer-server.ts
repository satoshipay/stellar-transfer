import axios from "axios"
import { StellarTomlResolver } from "stellar-sdk"
import { joinURL } from "./util"

export interface TransferFields {
  /** Can be a deposit / withdrawal property or some custom field. */
  [fieldName: string]: {
    /** Description of field to show to user. */
    description: string
    /** If field is optional. Defaults to false. */
    optional?: boolean
    /** List of possible values for the field. */
    choices?: string[]
  }
}

export interface TransferInfo {
  deposit: {
    [assetCode: string]: {
      /** Optional. `true` if client must be authenticated before accessing the deposit endpoint for this asset. `false` if not specified. */
      authentication_required?: boolean
      /** Set if SEP-6 deposit for this asset is supported. */
      enabled: boolean
      /**
       * Optional fixed (flat) fee for deposit. In units of the deposited asset.
       * Blank if there is no fee or the fee schedule is complex.
       */
      fee_fixed?: number
      /**
       * Optional percentage fee for deposit. In percentage points.
       * Blank if there is no fee or the fee schedule is complex.
       */
      fee_percent?: number
      /**
       * The fields object allows an anchor to describe fields that are passed into /deposit.
       * It can explain standard fields like dest and dest_extra for withdrawal, and it can also
       * specify extra fields that should be passed into /deposit such as an email address or bank name.
       * Only fields that are passed to /deposit need appear here.
       */
      fields?: TransferFields
      /** Optional minimum amount. No limit if not specified. */
      min_amount?: number
      /** Optional maximum amount. No limit if not specified. */
      max_amount?: number
    }
  }
  withdraw: {
    [assetCode: string]: {
      /** Optional. `true` if client must be authenticated before accessing the deposit endpoint for this asset. `false` if not specified. */
      authentication_required?: boolean
      /** Set if SEP-6 deposit for this asset is supported. */
      enabled: boolean
      /**
       * Optional fixed (flat) fee for withdraw. In units of the deposited asset.
       * Blank if there is no fee or the fee schedule is complex.
       */
      fee_fixed?: number
      /**
       * Optional percentage fee for withdraw. In percentage points.
       * Blank if there is no fee or the fee schedule is complex.
       */
      fee_percent?: number
      /** Optional minimum amount. No limit if not specified. */
      min_amount?: number
      /** Optional maximum amount. No limit if not specified. */
      max_amount?: number
      /**
       * Each type of withdrawal supported for that asset as a key.
       * Each type can specify a fields object explaining what fields are needed and what they do.
       */
      types?: {
        [withdrawalMethod: string]: {
          /**
           * The fields object allows an anchor to describe fields that are passed into /withdraw.
           * It can explain standard fields like dest and dest_extra for withdrawal, and it can also
           * specify extra fields that should be passed into /withdraw such as an email address or bank name.
           * Only fields that are passed to /withdraw need appear here.
           */
          fields?: TransferFields
        }
      }
    }
  }
  fee?: {
    /** Indicates that the optional /fee endpoint is supported. */
    enabled: boolean

    /** Optional. `true` if client must be authenticated before accessing the deposit endpoint for this asset. `false` if not specified. */
    authentication_required?: boolean
  }
  transaction?: {
    /** Indicates that the optional /transaction endpoint is supported. */
    enabled: boolean

    /** Optional. `true` if client must be authenticated before accessing the deposit endpoint for this asset. `false` if not specified. */
    authentication_required?: boolean
  }
  transactions?: {
    /** Indicates that the optional /transactions endpoint is supported. */
    enabled: boolean

    /** Optional. `true` if client must be authenticated before accessing the deposit endpoint for this asset. `false` if not specified. */
    authentication_required?: boolean
  }
}

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
