import fs from 'fs/promises'
import { header, MTProtoClass, namedImports } from './template'
import fetch from 'node-fetch'
import { getParamInputType } from './schemaParamParser'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import dedent from 'dedent'

const __dirname = dirname(fileURLToPath(import.meta.url)) + '/'

const ident = (text: string[]) => text.map(line => '  ' + line).join('\n')

type Schema = {
  constructors: {
    id: string
    predicate: string
    params: {
      name: string
      type: string
    }[]
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
typesDefinitions += generateInterfaces()
typesDefinitions += namedImports

function generateMethodSignatures(): string {
  const methodsDefinitions: string[] = []
  for(const method of schema.methods) {
    const params = Object.fromEntries(
      method.params
        .filter(param => param.name !== 'flags' && param.type !== '#')
        .map(param => [param.name, getParamInputType(param.type)])
    )
    const paramsDefinitions: string[] = Object.entries(params).map(([paramName, paramType]) => {
      let definition = ''
      definition += paramName

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

      // if(paramType.optional && paramType.optionalDefault !== null) {
      //   definition += ` = ${paramType.optionalDefault}`
      // }
      
      if(paramType.array) {
        definition += '[]'
      }
      return definition
    })
    const methodParams = paramsDefinitions.length > 0 ? `, params: { ${paramsDefinitions.join(', ')} }` : ''
    
    const methodResultType = getParamInputType(method.type)
    let methodResult = methodResultType.type.replace('.', '_')
    if(methodResult === 'Bool') methodResult = 'boolean'
    if(methodResultType.array) methodResult += '[]'

    methodsDefinitions.push(`call(method: '${method.method}'${methodParams}): Promise<${methodResult}>;`)
  }
  console.log('Generated', methodsDefinitions.length, 'methods signatures!')
  return ident(methodsDefinitions)
}

function generateInterfaces(): string {
  const interfacesDefinitions: string[] = []
  for(const intf of schema.constructors) {
    const params = Object.fromEntries(intf.params.map(param => [param.name, getParamInputType(param.type)]))
    let paramsDefinitions: string[] = Object.entries(params)
      .map(([paramName, paramType]) => {
        return `${paramName}: `
      })

    let interfaceDefinition = dedent`interface ${intf.predicate.replace('.', '_')} {
      _: '${intf.predicate}';
    ${ident(paramsDefinitions)}
    }`
    interfaceDefinition.split('\n').map(line => '  ' + line).join('\n')
    interfacesDefinitions.push(interfaceDefinition)
  }
  console.log('Generated', interfacesDefinitions.length, 'constructors definitions!')
  return interfacesDefinitions.join('\n')//ident(interfacesDefinitions)
}

await fs.writeFile(__dirname + '../mtproto__core.d.ts', typesDefinitions, 'utf-8')