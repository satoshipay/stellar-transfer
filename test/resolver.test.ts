import test from "ava"
import { fetchTransferServerURL } from "../src/index"

test("fetchTransferServerURL() can fetch the AnchorUSD transfer server", async t => {
  const transferServerURL = await fetchTransferServerURL(
    "https://horizon.stellar.org/",
    "GDUKMGUGDZQK6YHYA5Z6AY2G4XDSZPSZ3SW5UN3ARVMO6QSRDWP5YLEX"
  )

  t.is(transferServerURL, "https://api.anchorusd.com/transfer/")
})
