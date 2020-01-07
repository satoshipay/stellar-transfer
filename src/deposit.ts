import axios from "axios"
import { KYCInteractiveResponse, KYCResponse, KYCStatusResponse } from "./kyc"
import { TransferServer } from "./transfer-server"
import { joinURL } from "./util"

export interface DepositSuccessResponse {
  /**
   * Terse but complete instructions for how to deposit the asset.
   * In the case of most cryptocurrencies it is just an address to which the deposit should be sent.
   */
  how: string

  /** Estimate of how long the withdrawal will take to credit in seconds. */
  eta?: number

  /** Minimum amount of an asset that a user can withdraw. */
  min_amount?: number

  /** Maximum amount of asset that a user can withdraw. */
  max_amount?: number

  /** If there is a fee for withdraw. In units of the withdrawn asset. */
  fee_fixed?: number

  /** If there is a percent fee for withdraw. */
  fee_percent?: number

  /** Any additional data needed as an input for this withdraw, example: Bank Name */
  extra_info?: {
    message?: string
    [key: string]: any
  }
}

export interface DepositRequestSuccess {
  data: DepositSuccessResponse
  type: "success"
}

export interface DepositRequestKYC {
  data: KYCInteractiveResponse | KYCStatusResponse
  type: "kyc"
}

export interface DepositOptions {
  /**
   * The stellar account ID of the user that wants to do the deposit.
   * This is only needed if the anchor requires KYC information for depositing.
   * The anchor can use account to look up the user's KYC information.
   */
  account: string

  /** Email address of depositor. If desired, an anchor can use this to send email updates to the user about the deposit. */
  email_address?: string

  /** Defaults to `en`. Language code specified using ISO 639-1. `error` fields in the response should be in this language. */
  lang?: string

  /**
   * A wallet will send this to uniquely identify a user if the wallet has multiple users sharing one Stellar account.
   * The anchor can use this along with account to look up the user's KYC info.
   */
  memo?: string

  /** Type of memo. One of text, id or hash */
  memo_type?: "hash" | "id" | "text"

  /** In communications / pages about the deposit, anchor should display the wallet name to the user to explain where funds are coming from. */
  wallet_name?: string

  /** Anchor can show this to the user when referencing the wallet involved in the deposit (ex. in the anchor's transaction history) */
  wallet_url?: string
}

export enum DepositType {
  SEPA = "SEPA",
  SWIFT = "SWIFT"
}

export async function deposit(
  transferServer: TransferServer,
  type: DepositType | string,
  assetCode: string,
  authToken: string | null | undefined,
  options: DepositOptions
): Promise<DepositRequestSuccess | DepositRequestKYC> {
  const headers: any = {}

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`
  }

  const params = {
    lang: transferServer.options.lang,
    wallet_name: transferServer.options.walletName,
    wallet_url: transferServer.options.walletURL,
    ...options,
    type,
    asset_code: assetCode
  }

  const url = joinURL(transferServer.url, "/deposit")
  const validateStatus = (status: number) =>
    status === 200 || status === 201 || status === 403 // 201 is a TEMPO fix
  const response = await axios(url, { headers, params, validateStatus })

  if (response.status === 200) {
    return {
      data: response.data as DepositSuccessResponse,
      type: "success"
    }
  } else if (response.status === 403) {
    return {
      data: response.data as KYCResponse,
      type: "kyc"
    }
  } else if (response.data && response.data.message) {
    throw Error(
      `Anchor responded with status code ${response.status}: ${
        response.data.message
      }`
    )
  } else {
    throw Error(
      `Anchor responded with unexpected status code: ${response.status}`
    )
  }
}
