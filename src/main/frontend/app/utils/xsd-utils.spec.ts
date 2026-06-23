import { describe, expect, it } from 'vitest'
import { getAllowedChildElementsForElement, parseXsd, resolveElementTypeName } from './xsd-utils'

const XSD = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="SenderPipe">
    <xs:complexType>
      <xs:complexContent>
        <xs:extension base="SenderPipeType" />
      </xs:complexContent>
    </xs:complexType>
  </xs:element>
  <xs:complexType name="SenderPipeType">
    <xs:group ref="SenderPipeCumulativeChildGroup" />
  </xs:complexType>
  <xs:group name="SenderPipeCumulativeChildGroup">
    <xs:sequence>
      <xs:group ref="SenderPipeDeclaredChildGroup" />
      <xs:group ref="AbstractPipeDeclaredChildGroup" />
    </xs:sequence>
  </xs:group>
  <xs:group name="SenderPipeDeclaredChildGroup">
    <xs:choice>
      <xs:element name="FixedQuerySender" />
      <xs:element name="EchoSender" />
    </xs:choice>
  </xs:group>
  <xs:group name="AbstractPipeDeclaredChildGroup">
    <xs:sequence>
      <xs:group ref="ParamElementGroup" minOccurs="0" maxOccurs="unbounded" />
      <xs:element name="Forward" type="ForwardType" />
    </xs:sequence>
  </xs:group>
  <xs:group name="ParamElementGroup">
    <xs:choice>
      <xs:element name="Param" />
      <xs:element name="BooleanParam" />
    </xs:choice>
  </xs:group>

  <xs:element name="EchoSender" type="EchoSenderType" />
  <xs:complexType name="EchoSenderType">
    <xs:sequence>
      <xs:element name="Forward" type="ForwardType" />
    </xs:sequence>
  </xs:complexType>
</xs:schema>`

describe('getAllowedChildElementsForElement', () => {
  const doc = parseXsd(XSD)

  it('resolves an element to its complexType via an inline extension base', () => {
    expect(resolveElementTypeName(doc, 'SenderPipe')).toBe('SenderPipeType')
  })

  it('resolves an element to its complexType via the type attribute', () => {
    expect(resolveElementTypeName(doc, 'EchoSender')).toBe('EchoSenderType')
  })

  it('allows Param on SenderPipe because it is inherited through AbstractPipe', () => {
    const allowed = getAllowedChildElementsForElement(doc, 'SenderPipe')
    expect(allowed).toContain('Param')
    expect(allowed).toContain('BooleanParam')
    expect(allowed).toContain('FixedQuerySender')
  })

  it('does not allow Param on an element that lacks the inherited param group', () => {
    const allowed = getAllowedChildElementsForElement(doc, 'EchoSender')
    expect(allowed).not.toContain('Param')
    expect(allowed).toContain('Forward')
  })

  it('returns nothing for an unknown element', () => {
    expect(getAllowedChildElementsForElement(doc, 'DoesNotExist')).toEqual([])
  })
})
