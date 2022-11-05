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
        .filter(param => param.name !== 'flags' && param.type !== '#')
        .map(param => [param.name, getParamInputType(param.type)])
    )
    // const params: string[] = 
    const paramsDefinitions: string[] = Object.entries(params).map(([paramName, paramType]) => {
      let definition = ''
      definition += paramName

      if(paramType.optional && paramType.optionalDefault !== null) {
        definition += ` = ${paramType.optionalDefault}`
      } else {
        let paramDefinition = ''
        if(paramType.isConstructor) {
          paramDefinition = paramType.type.replace('.', '_')
        } else {
          paramDefinition = {
            'number': 'number',
            'string': 'string',
            'boolean': 'boolean',
            'bytes': 'UInt8Array'
          }[paramType.type] as string
        }
        definition += `: ${paramDefinition}`
      }
      
      if(paramType.array) {
        definition += '[]'
      }
      return definition
    })
    const methodParams = paramsDefinitions.length > 0 ? `, params: { ${paramsDefinitions.join(', ')} }` : ''
    
    let methodResult = method.type.replace('.', '_')
    if(methodResult === 'Bool') methodResult = 'boolean'

    methodsDefinitions.push(`call(method: '${method.method}'${methodParams}): Promise<${methodResult}>;`)
  }
  console.log('Generated', methodsDefinitions.length, 'methods signatures!')
  return methodsDefinitions.map(line => '  ' + line).join('\n')
}

await fs.writeFile(__dirname + '../mtproto__core.d.ts', typesDefinitions, 'utf-8')