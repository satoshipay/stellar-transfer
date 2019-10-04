import test from "ava"
import { locateTransferServer } from "../src/index"

test("fetchTransferServerURL() can fetch the AnchorUSD transfer server", async t => {
  const transferServerURL = await locateTransferServer("www.anchorusd.com")

  t.is(transferServerURL, "https://api.anchorusd.com/transfer/")
})
