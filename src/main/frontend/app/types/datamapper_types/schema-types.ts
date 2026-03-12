// JSON schema types

export type JsonSchema = JsonSchemaObject | JsonSchemaArray | JsonSchemaPrimitive

export interface JsonSchemaBase {
  type?: string
  defaultValue?: string
}

export interface JsonSchemaObject extends JsonSchemaBase {
  type: 'object'
  properties: Record<string, JsonSchema>
}

export interface JsonSchemaArray extends JsonSchemaBase {
  type: 'array'
  items: JsonSchema
}

export interface JsonSchemaPrimitive extends JsonSchemaBase {
  type: 'string' | 'number' | 'boolean' | 'date'
}

// XSD schema types

export interface XsdSchema {
  'xs:complexType'?: XsdComplexType | XsdComplexType[]
  'xs:element'?: XsdElement | XsdElement[]
}

export interface XsdComplexType {
  '@_name'?: string
  'xs:sequence'?: XsdSequence
  'xs:attribute'?: XsdAttribute[]
}

export interface XsdSequence {
  xs: {
    element: XsdElement | XsdElement[]
  }
}

export interface XsdElement {
  '@_name'?: string
  '@_type'?: string
  '@_maxOccurs'?: string
  '@_minOccurs'?: string
  '@_default'?: string
  'xs:complexType'?: XsdComplexType // inline complexType
  'xs:attribute'?: XsdAttribute[]
}

export interface XsdAttribute {
  '@_name': string
  '@_type': string
  '@_use'?: string
}

// SAX parser context type

export interface SaxContext {
  node: XsdComplexType | XsdSequence | XsdElement
  parentId: string | null
}

// Attributes from SAX parser

export type SaxAttributes = Record<string, string>
