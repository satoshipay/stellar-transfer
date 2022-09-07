import test from "ava"
import { Networks } from "stellar-base"
import { openTransferServer } from "../src/index"

test("can initialize a TransferServer", async t => {
  // "sandbox.anchorusd.com"
  const transferServer = await openTransferServer(
    "api.anclap.com",
    Networks.TESTNET
  )

  t.deepEqual(transferServer.assets.map(asset => asset.code), ["USD"])

  const response = await transferServer.get("/info")
  const result: any = await response.json()
  t.deepEqual(Object.keys(result.data.withdraw), ["USD"])
})
