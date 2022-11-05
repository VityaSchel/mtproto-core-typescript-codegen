import fs from 'fs/promises'
import { header, MTProtoClass, namedImports } from './template'
import fetch from 'node-fetch'
import { getParamInputType } from './schemaParamParser'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url)) + '/'

type Schema = {
  constructors: {
    id: string
    predicate: string
    params: {
      name: string
      type: string
    }
    type: string
  }[]
  methods: {
    id: string
    method: string
    params: {
      name: string
      type: string
    }[]
    type: string
  }[]
}

const response = await fetch('https://core.telegram.org/schema/json')
const schema: Schema = await response.json() as Schema

let typesDefinitions = ''
typesDefinitions += header
typesDefinitions += MTProtoClass.replace('%CALL_METHOD_SIGNATURES%', generateMethodSignatures())
// typesDefinitions += generateInterfaces()
typesDefinitions += namedImports

// function generateInterfaces(): string {

// }

function generateMethodSignatures(): string {
  const methodsDefinitions: string[] = []
  for(const method of schema.methods) {
    const params = Object.fromEntries(
      method.params
        .map(param => [param.name, getParamInputType(param.type)])
    )
    // const params: string[] = 
    const paramsDefinitions: string[] = Object.entries(params).map(([paramName, paramType]) => {
      let definition = ''
      definition += paramName
      if(paramType.optional) {
        definition += '?: '
      } else {
        definition += ': '
      }
      if(paramType.isConstructor) {
        definition += paramType.type.replace('.', '_')
      } else {
        definition += {
          'number': 'number',
          'string': 'string',
          'boolean': 'boolean',
          'bytes': 'UInt8Array'
        }[paramType.type]
      }
      if(paramType.array) {
        definition += '[]'
      }
      return definition
    })
    //call(method: 'auth.signIn'): Promise<{ srp_id: number | string, current_algo: passwordKdfAlgoUnknown | passwordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow, srp_B: bytes }>;
    methodsDefinitions.push(`call(method: '${method.method}'): Promise<{ ${paramsDefinitions.join(', ')} }>;`)
  }
  console.log('Generated', methodsDefinitions.length, 'methods signatures!')
  return methodsDefinitions.join('\n')
}

await fs.writeFile(__dirname + '../mtproto__core.d.ts', typesDefinitions, 'utf-8')