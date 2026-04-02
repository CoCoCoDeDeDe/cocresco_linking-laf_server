// https://dhb91nur4r.bja.sealos.run/iot2/images/GetImgListBase64
import { cloud ,  } from '../../local-cloud.js'
import type { FunctionContext } from '../../local-cloud.js'

export default async function (ctx: FunctionContext) {
  console.log('Hello World')
  return { data: 'hi, laf' }
}
