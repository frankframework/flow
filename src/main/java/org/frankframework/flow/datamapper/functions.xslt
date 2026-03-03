<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:map="http://www.w3.org/2005/xpath-functions/map"
                xmlns:func="http://exslt.org/functions"
>
<xsl:template name="functions" match="/">

<xsl:element name="xsl:function">
    <xsl:attribute name="name">datamapper:Concat</xsl:attribute>

    <xsl:element name="xsl:param">
        <xsl:attribute name="name">items</xsl:attribute>
        <xsl:attribute name="as">xs:string*</xsl:attribute>
    </xsl:element>

    <xsl:element name="xsl:sequence">
        <xsl:attribute name="select">string-join($items, '')</xsl:attribute>
    </xsl:element>
</xsl:element>

        <!-- Equation -->
<xsl:element name="xsl:function">
<xsl:attribute name="name">datamapper:Equation</xsl:attribute>

<xsl:element name="xsl:param">
    <xsl:attribute name="name">left</xsl:attribute>
</xsl:element>

<xsl:element name="xsl:param">
    <xsl:attribute name="name">op</xsl:attribute>
</xsl:element>

<xsl:element name="xsl:param">
    <xsl:attribute name="name">right</xsl:attribute>
</xsl:element>

<xsl:element name="xsl:choose">
    <xsl:element name="xsl:when">
        <xsl:attribute name="test">$op = '&lt;'</xsl:attribute>
        <xsl:element name="xsl:sequence">
            <xsl:attribute name="select">$left &lt; $right</xsl:attribute>
        </xsl:element>
    </xsl:element>
    <xsl:element name="xsl:when">
        <xsl:attribute name="test">$op = '&gt;'</xsl:attribute>
        <xsl:element name="xsl:sequence">
            <xsl:attribute name="select">$left &gt; $right</xsl:attribute>
        </xsl:element>
    </xsl:element>
    <xsl:element name="xsl:when">
        <xsl:attribute name="test">$op = '='</xsl:attribute>
        <xsl:element name="xsl:sequence">
            <xsl:attribute name="select">$left = $right</xsl:attribute>
        </xsl:element>
    </xsl:element>
    <xsl:element name="xsl:otherwise">
        <xsl:element name="xsl:sequence">
            <xsl:attribute name="select">false()</xsl:attribute>
        </xsl:element>
    </xsl:element>
</xsl:element>
</xsl:element>

        <!-- ValueEquals -->
<xsl:element name="xsl:function">
<xsl:attribute name="name">datamapper:ValueEquals</xsl:attribute>
<xsl:element name="xsl:param">
    <xsl:attribute name="name">a</xsl:attribute>
</xsl:element>
<xsl:element name="xsl:param">
    <xsl:attribute name="name">b</xsl:attribute>
</xsl:element>
<xsl:element name="xsl:sequence">
    <xsl:attribute name="select">$a = $b</xsl:attribute>
</xsl:element>
</xsl:element>

        <!-- CastToString -->
<xsl:element name="xsl:function">
<xsl:attribute name="name">datamapper:CastToString</xsl:attribute>
<xsl:element name="xsl:param">
    <xsl:attribute name="name">a</xsl:attribute>
</xsl:element>
<xsl:element name="xsl:sequence">
    <xsl:attribute name="select">string($a)</xsl:attribute>
</xsl:element>
</xsl:element>



        <!-- Nullcheck -->
<xsl:element name="xsl:function">
<xsl:attribute name="name">datamapper:NullCheck</xsl:attribute>
<xsl:element name="xsl:param">
    <xsl:attribute name="name">a</xsl:attribute>
</xsl:element>
<xsl:element name="xsl:sequence">
    <xsl:attribute name="select">string-length($a) &gt; 0</xsl:attribute>
</xsl:element>
</xsl:element>
        <!-- Replace -->
<xsl:element name="xsl:function">
<xsl:attribute name="name">datamapper:Replace</xsl:attribute>
<xsl:element name="xsl:param">
    <xsl:attribute name="name">text</xsl:attribute>
</xsl:element>
<xsl:element name="xsl:param">
    <xsl:attribute name="name">search</xsl:attribute>
</xsl:element>
<xsl:element name="xsl:param">
    <xsl:attribute name="name">replace</xsl:attribute>
</xsl:element>
<xsl:element name="xsl:choose">
    <xsl:element name="xsl:when">
        <xsl:attribute name="test">contains($text, $search)</xsl:attribute>
        <xsl:element name="xsl:sequence">
            <xsl:attribute name="select">
                concat(substring-before($text, $search),
                $replace,
                datamapper:Replace(substring-after($text, $search), $search, $replace))
            </xsl:attribute>
        </xsl:element>
    </xsl:element>
    <xsl:element name="xsl:otherwise">
        <xsl:element name="xsl:sequence">
            <xsl:attribute name="select">$text</xsl:attribute>
        </xsl:element>
    </xsl:element>
</xsl:element>
</xsl:element>
</xsl:template>
</xsl:stylesheet>