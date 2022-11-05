import fs from 'fs/promises'
import { header, disabledRules, MTProtoClass, namedImports } from './template'
import fetch from 'node-fetch'
import { getParamInputType, ParamTypeResult } from './schemaParamParser'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import dedent from 'dedent'

const __dirname = dirname(fileURLToPath(import.meta.url)) + '/'
const blacklistedInterfaces = [
  'bool',
  'boolTrue',
  'boolFalse',
  'true',
  'null'
]
const blacklistedConstructors = [
  'Bool',
  'True',
  'Vector',
  'Vector t'
]
const ident = (text: string[], repeat = 1) => text.map(line => '  '.repeat(repeat) + line).join('\n')

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

const generationStart = Date.now()

let typesDefinitions = ''
typesDefinitions += header
typesDefinitions += '\n\n'
typesDefinitions += disabledRules
typesDefinitions += '\n\n'
typesDefinitions += MTProtoClass.replace('%CALL_METHOD_SIGNATURES%', generateMethodSignatures())
typesDefinitions += generateInterfaces()
typesDefinitions += '\n\n'
typesDefinitions += generateConstructors()
typesDefinitions += '\n\n'
typesDefinitions += namedImports

function formatParams([paramName, paramType]: [string, ParamTypeResult]) {
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
      'bytes': 'Uint8Array'
    }[paramType.type] as string
  }
  definition += `: ${/^!?X$/.test(paramDefinition) ? 'unknown' : paramDefinition}`
  
  if(paramType.array) {
    definition += '[]'
  }
  return definition
}

function generateMethodSignatures(): string {
  const methodsDefinitions: string[] = []
  for(const method of schema.methods) {
    const params = Object.fromEntries(
      method.params
        .filter(param => param.name !== 'flags' && param.type !== '#')
        .map(param => [param.name, getParamInputType(param.type)])
    )
    const paramsDefinitions: string[] = Object.entries(params).map(formatParams)
    const methodParams = paramsDefinitions.length > 0 ? `, params: { ${paramsDefinitions.join(', ')} }` : ''
    
    const methodResultType = getParamInputType(method.type)
    let methodResult = methodResultType.type.replace('.', '_')
    if(/^!?X$/.test(methodResult)) methodResult = 'unknown'
    else {
      if(methodResult === 'Bool') methodResult = 'boolean'
      if(methodResultType.array) methodResult += '[]'
    }

    methodsDefinitions.push(`call(method: '${method.method}'${methodParams}): Promise<${methodResult}>;`)
  }
  console.log('Generated', methodsDefinitions.length, 'methods signatures!')
  return ident(methodsDefinitions)
}

function generateInterfaces(): string {
  const interfacesDefinitions: string[] = []
  for(const intf of schema.constructors) {
    if(blacklistedInterfaces.includes(intf.predicate)) continue
    const params = Object.fromEntries(
      intf.params
        .filter(param => param.name !== 'flags' && param.type !== '#')
        .map(param => [param.name, getParamInputType(param.type)])
    )
    let paramsDefinitions: string[] = Object.entries(params)
      .map(formatParams)
      .map(line => line + ';')

    let interfaceDefinition = dedent`export interface ${intf.predicate.replace('.', '_')} {
      _: '${intf.predicate}';${paramsDefinitions.length > 0 ? '\n' + ident(paramsDefinitions, 3) : ''}
    }`
    interfaceDefinition.split('\n').map(line => '  ' + line).join('\n')
    interfacesDefinitions.push(interfaceDefinition)
  }
  console.log('Generated', interfacesDefinitions.length, 'interfaces definitions!')
  return interfacesDefinitions.join('\n')
}

function generateConstructors() {
  const constructors: string[] = schema.constructors.map(c => c.type)
  const constructorsNames: string[] = [...new Set(constructors)]
  let constructorsDefinitions: string[] = []
  for(const constructorName of constructorsNames) {
    if(blacklistedConstructors.includes(constructorName)) continue
    const predicatesList = schema.constructors
      .filter(c => c.type === constructorName)
      .map(c => c.predicate.replace('.', '_'))
    constructorsDefinitions.push(`export type ${constructorName.replace('.', '_')} = ${predicatesList.join(' | ')};`)
  }
  console.log('Generated', constructorsDefinitions.length, 'constructors definitions!')
  return constructorsDefinitions.join('\n')
}

const generationEnd = Date.now()
typesDefinitions += `// Auto-generated with https://github.com/VityaSchel/mtproto-core-typescript-codegen in ${((generationEnd - generationStart) / 1000).toFixed(3)}s`

await fs.writeFile(__dirname + '../../index.d.ts', typesDefinitions + '\n', 'utf-8')