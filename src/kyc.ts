export interface KYCInteractiveResponse {
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

export type KYCResponse = KYCInteractiveResponse | KYCStatusResponse
