import test from "ava"
import { Networks } from "stellar-sdk"
import { openTransferServer } from "../src/index"

test("can initialize a TransferServer", async t => {
  const transferServer = await openTransferServer(
    "sandbox.anchorusd.com",
    Networks.TESTNET
  )

  t.deepEqual(transferServer.assets.map(asset => asset.code), ["USD"])

  const response = await transferServer.get("/info")
  t.deepEqual(Object.keys(response.data.withdraw), ["USD"])
})
