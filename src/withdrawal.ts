import axios from "axios"
import { TransferServer } from "./transfer-server"
import { joinURL } from "./util"

export interface WithdrawalKYCInteractiveResponse {
  /** The anchor's internal ID for this deposit / withdrawal request. Can be passed to the `/transaction` endpoint to check status of the request. */
  id?: string
  /**
   * Flag indicating that depositing is also handled in the anchor's interactive customer info flow.
   * The wallet need not make additional requests to /deposit to complete the deposit.
   * Defaults to false. Only relevant for responses to /deposit requests.
   */
  interactive_deposit?: boolean
  /** URL hosted by the anchor. The wallet should show this URL to the user either as a popup or an iframe. */
  url: string
  type: "interactive_customer_info_needed"
}

export interface WithdrawalKYCNonInteractiveResponse {
  /** A list of field names that need to be transmitted via SEP-12 for the deposit to proceed. */
  fields: string[]
  type: "non_interactive_customer_info_needed"
}

export interface WithdrawalKYCStatusResponse<
  Status extends "pending" | "denied" = "pending" | "denied"
> {
  /** Estimated number of seconds until the deposit status will update. */
  eta?: number
  /** A URL the user can visit if they want more information about their account / status. */
  more_info_url?: string
  /** Status of customer information processing. */
  status: Status
  type: "customer_info_status"
}

export interface WithdrawalSuccessResponse {
  /** The account the user should send its token back to. */
  account_id: string

  /** Type of memo to attach to transaction, one of text, id or hash. */
  memo_type?: "hash" | "id" | "text"

  /** Value of memo to attach to transaction, for hash this should be base64-encoded. */
  memo?: string

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
  extra_info?: any
}

export type WithdrawalKYCResponse =
  | WithdrawalKYCInteractiveResponse
  | WithdrawalKYCNonInteractiveResponse
  | WithdrawalKYCStatusResponse

export interface WithdrawalOptions {
  /**
   * The stellar account ID of the user that wants to do the withdrawal.
   * This is only needed if the anchor requires KYC information for withdrawal.
   * The anchor can use account to look up the user's KYC information.
   */
  account: string

  /**
   * The account that the user wants to withdraw their funds to.
   * This can be a crypto account, a bank account number, IBAN, mobile number, or email address.
   */
  dest: string

  /**
   * Extra information to specify withdrawal location.
   * For crypto it may be a memo in addition to the dest address.
   * It can also be a routing number for a bank, a BIC, or the name of a partner handling the withdrawal.
   */
  dest_extra: string

  /**
   * A wallet will send this to uniquely identify a user if the wallet has multiple users sharing one Stellar account.
   * The anchor can use this along with account to look up the user's KYC info.
   */
  memo?: string

  /** Type of memo. One of text, id or hash */
  memo_type?: "hash" | "id" | "text"

  /** In communications / pages about the withdrawal, anchor should display the wallet name to the user to explain where funds are coming from. */
  wallet_name?: string

  /** Anchor can show this to the user when referencing the wallet involved in the withdrawal (ex. in the anchor's transaction history) */
  wallet_url?: string
}

export interface WithdrawalRequestSuccess {
  data: WithdrawalSuccessResponse
  type: "success"
}

export interface WithdrawalRequestKYC {
  data:
    | WithdrawalKYCInteractiveResponse
    | WithdrawalKYCNonInteractiveResponse
    | WithdrawalKYCStatusResponse
  type: "kyc"
}

export enum WithdrawalType {
  bankAccount = "bank_account",
  cash = "cash",
  crypto = "crypto",
  mobile = "mobile",
  billPayment = "bill_payment"
}

export async function withdraw(
  transferServer: TransferServer,
  type: WithdrawalType | string,
  assetCode: string,
  authToken: string | null | undefined,
  options: WithdrawalOptions
): Promise<WithdrawalRequestSuccess | WithdrawalRequestKYC> {
  const headers: any = {}
  const params = {
    ...options,
    type,
    asset_code: assetCode
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const url = joinURL(transferServer.url, "/withdraw")
  const validateStatus = (status: number) =>
    status === 200 || status === 201 || status === 403 // 201 is a TEMPO fix
  const response = await axios(url, { headers, params, validateStatus })

  if (response.status === 200) {
    return {
      data: response.data as WithdrawalSuccessResponse,
      type: "success"
    }
  } else if (response.status === 403) {
    return {
      data: response.data as WithdrawalKYCResponse,
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
