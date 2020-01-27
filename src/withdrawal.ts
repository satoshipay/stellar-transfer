import { AxiosResponse } from "axios"
import FormData from "form-data"
import {
  Asset,
  Operation,
  Memo,
  OperationOptions,
  Transaction,
  TransactionBuilder
} from "stellar-sdk"
import {
  KYCInteractiveResponse,
  KYCNonInteractiveResponse,
  KYCResponse,
  KYCResponseType,
  KYCStatusResponse
} from "./kyc"
import { TransferResultType } from "./result"
import { TransferServer } from "./transfer-server"

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
  extra_info?: {
    message?: string
    [key: string]: any
  }
}

export interface WithdrawalInstructionsSuccess {
  data: WithdrawalSuccessResponse
  type: TransferResultType.ok
}

type KycDataByType = {
  [KYCResponseType.interactive]: KYCInteractiveResponse
  [KYCResponseType.nonInteractive]: KYCNonInteractiveResponse
  [KYCResponseType.status]: KYCStatusResponse
}

export interface WithdrawalInstructionsKYC<
  KycType extends keyof KycDataByType
> {
  data: KycDataByType[KycType]
  subtype: KycType
  type: TransferResultType.kyc
}

export type WithdrawalInstructions =
  | WithdrawalInstructionsSuccess
  | WithdrawalInstructionsKYC<any>

export enum WithdrawalType {
  bankAccount = "bank_account",
  cash = "cash",
  crypto = "crypto",
  mobile = "mobile",
  billPayment = "bill_payment"
}

export interface WithdrawalOptions {
  /**
   * The stellar account ID of the user that wants to do the withdrawal.
   * This is only needed if the anchor requires KYC information for withdrawal.
   * The anchor can use account to look up the user's KYC information.
   */
  account?: string

  /**
   * Code of the asset the user wants to withdraw. This must match the asset code issued
   * by the anchor. Ex if a user withdraws MyBTC tokens and receives BTC, the asset_code
   * must be MyBTC.
   */
  asset_code: string

  /**
   * The account that the user wants to withdraw their funds to.
   * This can be a crypto account, a bank account number, IBAN, mobile number, or email address.
   */
  dest?: string

  /**
   * Extra information to specify withdrawal location.
   * For crypto it may be a memo in addition to the dest address.
   * It can also be a routing number for a bank, a BIC, or the name of a partner handling the withdrawal.
   */
  dest_extra?: string

  /** Defaults to `en`. Language code specified using ISO 639-1. `error` fields in the response should be in this language. */
  lang?: string

  /**
   * A wallet will send this to uniquely identify a user if the wallet has multiple users sharing one Stellar account.
   * The anchor can use this along with account to look up the user's KYC info.
   */
  memo?: string

  /** Type of memo. One of text, id or hash */
  memo_type?: "hash" | "id" | "text"

  /**
   * Type of withdrawal. Can be: crypto, bank_account, cash, mobile, bill_payment or other custom
   * values. Optional if the anchor will respond that interactive customer information is needed.
   */
  type?: WithdrawalType | string

  /** In communications / pages about the withdrawal, anchor should display the wallet name to the user to explain where funds are coming from. */
  wallet_name?: string

  /** Anchor can show this to the user when referencing the wallet involved in the withdrawal (ex. in the anchor's transaction history) */
  wallet_url?: string
}

export interface Withdrawal {
  asset: Asset
  fields: WithdrawalOptions
  transferServer: TransferServer
}

export function Withdrawal(
  transferServer: TransferServer,
  asset: Asset,
  fields: Omit<WithdrawalOptions, "asset_code"> & Record<string, string> = {}
): Withdrawal {
  if (asset.isNative()) {
    throw Error(
      `Cannot withdraw lumens, but only assets issued by ${
        transferServer.domain
      }.`
    )
  }
  return {
    asset,
    fields: {
      lang: transferServer.options.lang,
      wallet_name: transferServer.options.walletName,
      wallet_url: transferServer.options.walletURL,
      ...fields,
      asset_code: asset.getCode()
    },
    transferServer
  }
}

const kycSubTypes: Record<
  KYCResponse["type"],
  "interactive" | "non-interactive" | "pending"
> = {
  customer_info_status: "pending",
  interactive_customer_info_needed: "interactive",
  non_interactive_customer_info_needed: "non-interactive"
}

/**
 * Withdraw using the SEP-24 endpoint
 */
export async function requestInteractiveWithdrawal(
  withdrawal: Withdrawal,
  authToken?: string | null | undefined
): Promise<WithdrawalInstructions> {
  const { fields, transferServer } = withdrawal
  const body = new FormData()
  const headers: any = {}

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`
  }

  ;(Object.keys(fields) as Array<keyof typeof fields>).forEach(fieldName => {
    body.append(fieldName, fields[fieldName])
  })

  const validateStatus = (status: number) =>
    status === 200 || status === 201 || status === 403 // 201 is a TEMPO fix

  try {
    return requestWithdrawal(withdrawal, () => {
      return transferServer.post("/transactions/withdraw/interactive", {
        data: body,
        headers,
        validateStatus
      })
    })
  } catch (error) {
    if (error && error.response && error.response.status === 404) {
      return requestLegacyWithdrawal(withdrawal, authToken)
    } else {
      throw error
    }
  }
}

/**
 * Withdraw using the old SEP-6 endpoint
 */
export async function requestLegacyWithdrawal(
  withdrawal: Withdrawal,
  authToken?: string | null | undefined
): Promise<WithdrawalInstructions> {
  const { fields, transferServer } = withdrawal
  const headers: any = {}

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`
  }

  const validateStatus = (status: number) =>
    status === 200 || status === 201 || status === 403 // 201 is a TEMPO fix

  return requestWithdrawal(withdrawal, () =>
    transferServer.get("/withdraw", {
      headers,
      params: fields,
      validateStatus
    })
  )
}

async function requestWithdrawal(
  withdrawal: Withdrawal,
  sendRequest: () => Promise<AxiosResponse>
): Promise<WithdrawalInstructions> {
  const { transferServer } = withdrawal
  const response = await sendRequest()

  if (response.status === 200) {
    return {
      data: response.data as WithdrawalSuccessResponse,
      type: TransferResultType.ok
    }
  } else if (response.status === 403) {
    const subtype = kycSubTypes[(response.data as KYCResponse).type]
    if (!subtype) {
      throw Error(
        `${
          transferServer.domain
        } requires KYC, but did not specify valid KYC instructions.`
      )
    }
    return {
      data: response.data as KYCResponse,
      subtype,
      type: TransferResultType.kyc
    }
  } else if (response.data && response.data.message) {
    throw Error(
      `${transferServer.domain} responded with status code ${
        response.status
      }: ${response.data.message}`
    )
  } else {
    throw Error(
      `${transferServer.domain} responded with unexpected status code: ${
        response.status
      }`
    )
  }
}

/**
 * @returns An unsigned transaction containing a payment to conduct the actual withdrawal.
 */
export function createWithdrawalPayment(
  response: WithdrawalInstructionsSuccess,
  builder: TransactionBuilder,
  asset: Asset,
  amount: OperationOptions.Payment["amount"],
  options: {
    sourceAccountID?: string
  } = {}
): Transaction {
  // TODO: Support path payments
  builder.addOperation(
    Operation.payment({
      amount,
      asset,
      destination: response.data.account_id,
      source: options.sourceAccountID
    })
  )

  if (response.data.memo_type === "hash" && response.data.memo) {
    builder.addMemo(Memo.hash(response.data.memo))
  } else if (response.data.memo_type === "id" && response.data.memo) {
    builder.addMemo(Memo.id(response.data.memo))
  } else if (response.data.memo_type === "text" && response.data.memo) {
    builder.addMemo(Memo.text(response.data.memo))
  } else if (response.data.memo) {
    throw Error(
      `Anchor requires a memo on the withdrawal transaction, but did not specify a valid memo type.`
    )
  }

  return builder.build()
}
