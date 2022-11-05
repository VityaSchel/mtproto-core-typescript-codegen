// Taken from https://github.com/vityaschel/mtproto-mobile
// Credit to me
// Source: https://github.com/VityaSchel/mtproto-mobile/blob/master/src/mtproto/schemaParamParser.ts

export type ParamType = 'number' | 'string' | 'boolean' | 'bytes' | string
export type ParamTypeResult = { array: boolean, type: ParamType, isConstructor: boolean, optional: boolean, optionalDefault: any | null }

export const getParamInputType = (mtprotoType: string): ParamTypeResult => {
  const result: ParamTypeResult = { array: false, type: '', isConstructor: false, optional: false, optionalDefault: null }
  const optionalPrefixRegex = /^flags.\d+\?(.+)$/
  if(optionalPrefixRegex.test(mtprotoType)) {
    result.optional = true
    const postPrefixPartRegex = mtprotoType.match(optionalPrefixRegex)
    if(postPrefixPartRegex === null) throw 'Unknown param format'
    mtprotoType = postPrefixPartRegex[1]
  }
  
  const arrayTypeRegex = /^Vector<(.+)>$/
  if(arrayTypeRegex.test(mtprotoType)) {
    const subMtprotoTypeRegex = mtprotoType.match(arrayTypeRegex)
    if(subMtprotoTypeRegex === null) throw 'Unknown subtype format'
    const subType = getParamInputType(subMtprotoTypeRegex[1])
    if(subType.isConstructor !== undefined) result.isConstructor = subType.isConstructor
    return { ...result, array: true, type: subType.type, isConstructor: subType.isConstructor }
  } else if(['long', 'int', 'double'].includes(mtprotoType)) {
    return { ...result, type: 'number' }
  } else if('bytes' === mtprotoType) {
    return { ...result, type: 'bytes' }
  } else if('string' === mtprotoType) {
    return { ...result, type: 'string' }
  } else if('Bool' === mtprotoType) {
    return { ...result, type: 'boolean' }
  } else if(['true', 'false'].includes(mtprotoType)) {
    return { ...result, type: 'boolean', optionalDefault: mtprotoType === 'true' }
  } else if(/^\d+$/.test(mtprotoType)) {
    return { ...result, type: 'number', optionalDefault: mtprotoType }
  } else {
    return { ...result, type: mtprotoType, isConstructor: true }
  }
}