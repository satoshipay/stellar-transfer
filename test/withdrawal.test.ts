import test from "ava"
import { Keypair } from "stellar-sdk"
import {
  fetchTransferInfos,
  openTransferServer,
  requestInteractiveWithdrawal,
  KYCResponseType,
  TransferResultType,
  Withdrawal
} from "../src/index"

test("interactive withdrawal works", async t => {
  const keypair = Keypair.random()

  const transferServer = await openTransferServer("sandbox.anchorusd.com")
  const infos = await fetchTransferInfos(transferServer)
  const asset = infos.withdrawableAssets.find(asset => asset.code === "USD")!

  const withdrawal = Withdrawal(transferServer, asset, {
    account: keypair.publicKey(),
    email_address: "test-withdrawal@solarwallet.io"
  })
  const instructions = await requestInteractiveWithdrawal(withdrawal)

  t.is(instructions.type, TransferResultType.kyc)
  t.is((instructions as any).subtype, KYCResponseType.interactive)
  t.is((instructions as any).data.type, "interactive_customer_info_needed")
})
