// import { AxiosResponse } from "axios"
import { TransferResultType } from "./result"

export interface KYCInteractiveResponse {
  /** The anchor's internal ID for this deposit / withdrawal request. Can be passed to the `/transaction` endpoint to check status of the request. */
  id: string
  /** URL hosted by the anchor. The wallet should show this URL to the user either as a popup or an iframe. */
  url: string
  type: "interactive_customer_info_needed"
}

export interface KYCNonInteractiveResponse {
  /** A list of field names that need to be transmitted via SEP-12 for the deposit to proceed. */
  fields: string[]
  type: "non_interactive_customer_info_needed"
}

export interface KYCStatusResponse<
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

export enum KYCResponseType {
  interactive = "interactive",
  nonInteractive = "non-interactive",
  status = "status"
}

export type KYCResponse =
  | KYCInteractiveResponse
  | KYCNonInteractiveResponse
  | KYCStatusResponse

interface KycDataByType {
  [KYCResponseType.interactive]: KYCInteractiveResponse
  [KYCResponseType.nonInteractive]: KYCNonInteractiveResponse
  [KYCResponseType.status]: KYCStatusResponse
}

export interface KYCInstructions<
  KycType extends keyof KycDataByType = keyof KycDataByType
> {
  data: KycDataByType[KycType]
  subtype: KycType
  type: TransferResultType.kyc
}

const kycSubTypes: Record<KYCResponse["type"], KYCResponseType> = {
  customer_info_status: KYCResponseType.status,
  interactive_customer_info_needed: KYCResponseType.interactive,
  non_interactive_customer_info_needed: KYCResponseType.nonInteractive
}

export function createKYCInstructions(
  response: Response,
  domain: string
): KYCInstructions {
  const data: any = response.json();

  const subtype = kycSubTypes[(data as KYCResponse).type]
  if (!subtype) {
    throw Error(
      `${domain} requires KYC, but did not specify valid KYC instructions.`
    )
  }
  return {
    data: data as KYCResponse,
    subtype,
    type: TransferResultType.kyc
  }
}

export function isKYCRequired (response: Response) {
  const data: any = response.json();

  return (
    response.status === 403 ||
    data.type === "interactive_customer_info_needed"
  )
}
