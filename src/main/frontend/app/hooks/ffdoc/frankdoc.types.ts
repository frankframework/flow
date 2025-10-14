export interface FFDocJson {
  metadata: Metadata
  types: Record<string, string[]>
  elements: Record<string, ElementClass>
  elementNames: Record<string, ElementInfo>
  enums: Record<string, EnumValues>
  labels: Record<string, string[]>
  properties: Property[]
  credentialProviders: Record<string, CredentialProvider>
  servletAuthenticators: Record<string, ServletAuthenticator>
}

export interface Metadata {
  version: string
}

export interface ElementClass {
  name: string
  abstract?: boolean
  deprecated?: DeprecationInfo
  description?: string
  parent?: string
  attributes?: Record<string, Attribute>
  children?: Child[]
  forwards?: Record<string, ElementProperty>
  parameters?: Record<string, ElementProperty>
  parametersDescription?: string
  notes?: Note[]
  links?: Link[]
}

export interface DeprecationInfo {
  forRemoval: boolean
  since?: string
  description?: string
}

export interface Attribute {
  mandatory?: boolean
  describer?: string
  description?: string
  type?: string
  default?: string
  deprecated?: DeprecationInfo
  enum?: string
}

export interface Child {
  multiple: boolean
  roleName: string
  description?: string
  type?: string
  deprecated?: boolean
  mandatory?: boolean
}

export interface ElementProperty {
  description?: string
}

export interface Note {
  type: 'INFO' | 'WARNING' | 'DANGER' | 'TIP'
  value: string
}

export interface Link {
  label: string
  url: string
}

export interface ElementInfo {
  labels: Record<string, string>
  className: string
}

export type EnumValues = Record<string, EnumValue>

export interface EnumValue {
  description?: string
  deprecated?: boolean
}

export interface Property {
  name: string
  properties: {
    name: string
    description: string
    defaultValue?: string
    flags?: string[]
  }[]
}

export interface CredentialProvider {
  fullName: string
  description?: string
}

export interface ServletAuthenticator {
  fullName: string
  description?: string
  methods?: {
    name: string
    description?: string
  }[]
}
