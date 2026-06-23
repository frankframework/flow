// JSON schema types

export type JsonSchema = JsonSchemaObject | JsonSchemaArray | JsonSchemaPrimitive

export type JsonSchemaBase = {
  type?: string
  defaultValue?: string
}

export type JsonSchemaObject = {
  type: 'object'
  properties: Record<string, JsonSchema>
} & JsonSchemaBase

export type JsonSchemaArray = {
  type: 'array'
  items: JsonSchema
} & JsonSchemaBase

export type JsonSchemaPrimitive = {
  type: 'string' | 'number' | 'boolean' | 'date'
} & JsonSchemaBase

// XSD schema types

export type XsdSchema = {
  'xs:complexType'?: XsdComplexType | XsdComplexType[]
  'xs:element'?: XsdElement | XsdElement[]
}

export type XsdComplexType = {
  '@_name'?: string
  'xs:sequence'?: XsdSequence
  'xs:attribute'?: XsdAttribute[]
}

export type XsdSequence = {
  xs: {
    element: XsdElement[]
  }
}

export type XsdElement = {
  '@_name'?: string
  '@_type'?: string
  '@_maxOccurs'?: string
  '@_minOccurs'?: string
  '@_default'?: string
  'xs:complexType'?: XsdComplexType // inline complexType
  'xs:attribute'?: XsdAttribute[]
}

export type XsdAttribute = {
  '@_name': string
  '@_type': string
  '@_use'?: string
}

// SAX parser context type

export type SaxContext = {
  node: XsdComplexType | XsdSequence | XsdElement
  parentId: string | null
}

// Attributes from SAX parser

export type SaxAttributes = Record<string, string>
