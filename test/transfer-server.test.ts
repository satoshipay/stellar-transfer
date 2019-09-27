import test from "ava"
import { TransferServer } from "../src/index"

test("fetchTransferServerURL() can fetch the AnchorUSD transfer server", async t => {
  const transferServer = TransferServer("https://api.anchorusd.com/transfer/")
  const transferInfo = await transferServer.fetchInfo()

  t.true(transferInfo && typeof transferInfo === "object")
  t.true(
    "deposit" in transferInfo,
    `Expected key "deposit" to be present in transfer info:\n${JSON.stringify(
      transferInfo,
      null,
      2
    )}`
  )
  t.true(
    "withdraw" in transferInfo,
    `Expected key "withdraw" to be present in transfer info:\n${JSON.stringify(
      transferInfo,
      null,
      2
    )}`
  )
  t.true("USD" in transferInfo.deposit)
  t.true("USD" in transferInfo.withdraw)
})
