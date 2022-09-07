// import { AxiosResponse } from "axios"
import { TransferServer } from "./transfer-server"

export async function ResponseError(
  response: Response,
  transferServer: TransferServer
) {
  const data: any = await response.json()

  const isJsonResponse = true;
  // const isJsonResponse =
  //   response.headers["content-type"] &&
  //   /json/.test(response.headers["content-type"])
  const message =
    isJsonResponse &&
    data &&
    (data.error || data.message)
  return Error(
    message
      ? `Request to ${transferServer.domain} failed: ${message}`
      : `Request to ${transferServer.domain} failed with status ${
          response.status
        }`
  )
}
