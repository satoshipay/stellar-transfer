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
  }
  transaction?: {
    /** Indicates that the optional /transaction endpoint is supported. */
    enabled: boolean
  }
  transactions?: {
    /** Indicates that the optional /transactions endpoint is supported. */
    enabled: boolean
  }
}

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
