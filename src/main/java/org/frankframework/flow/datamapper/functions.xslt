<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:outputxsl="http://www.w3.org/1999/XSL/TransformAlias">

    <xsl:namespace-alias stylesheet-prefix="outputxsl" result-prefix="xsl"/>

    <xsl:template name="functions">

        <outputxsl:function name="datamapper:Concat">
            <outputxsl:param name="items" as="xs:string*"/>
            <outputxsl:sequence select="string-join($items, '')"/>
        </outputxsl:function>

        <!-- Equation -->
        <outputxsl:function name="datamapper:Equation">

            <outputxsl:param name="left"/>
            <outputxsl:param name="op"/>
            <outputxsl:param name="right"/>

            <outputxsl:choose>

                <outputxsl:when test="$op = '&lt;'">
                    <outputxsl:sequence select="$left &lt; $right"/>
                </outputxsl:when>

                <outputxsl:when test="$op = '&gt;'">
                    <outputxsl:sequence select="$left &gt; $right"/>
                </outputxsl:when>

                <outputxsl:when test="$op = '='">
                    <outputxsl:sequence select="$left = $right"/>
                </outputxsl:when>

                <outputxsl:otherwise>
                    <outputxsl:sequence select="false()"/>
                </outputxsl:otherwise>

            </outputxsl:choose>

        </outputxsl:function>

        <!-- ValueEquals -->
        <outputxsl:function name="datamapper:ValueEquals">
            <outputxsl:param name="a"/>
            <outputxsl:param name="b"/>
            <outputxsl:sequence select="$a = $b"/>
        </outputxsl:function>

        <!-- CastToString -->
        <outputxsl:function name="datamapper:CastToString">
            <outputxsl:param name="a"/>
            <outputxsl:sequence select="string($a)"/>
        </outputxsl:function>

        <!-- Nullcheck -->
        <outputxsl:function name="datamapper:NullCheck">
            <outputxsl:param name="a"/>
            <outputxsl:sequence select="string-length($a) &gt; 0"/>
        </outputxsl:function>

        <!-- Replace -->
        <outputxsl:function name="datamapper:Replace">

            <outputxsl:param name="text"/>
            <outputxsl:param name="search"/>
            <outputxsl:param name="replace"/>

            <outputxsl:choose>

                <outputxsl:when test="contains($text, $search)">
                    <outputxsl:sequence
                            select="concat(substring-before($text, $search),$replace,datamapper:Replace(substring-after($text, $search), $search, $replace))"/>
                </outputxsl:when>

                <outputxsl:otherwise>
                    <outputxsl:sequence select="$text"/>
                </outputxsl:otherwise>

            </outputxsl:choose>

        </outputxsl:function>

        <outputxsl:function name="datamapper:xml-to-json" as="xs:string">
            <outputxsl:param name="nodes" as="element()*"/>

            <outputxsl:choose>

                <!-- No nodes -->
                <outputxsl:when test="empty($nodes)">
                    <xsl:attribute name="test">empty($nodes)</xsl:attribute>
                    <xsl:element name="xsl:sequence">
                        <xsl:attribute name="select">''</xsl:attribute>
                    </xsl:element>
                </outputxsl:when>

                <!-- Leaf nodes -->
                <outputxsl:when test="every $n in $nodes satisfies not($n/*)">
                    <outputxsl:variable name="leaf-json">
                        <outputxsl:for-each select="$nodes">
                            <outputxsl:variable name="value" select="normalize-space(.)"/>
                            <outputxsl:value-of
                                    select="concat('&quot;', name(), '&quot;:', if ($value = '') then 'null' else concat('&quot;', $value, '&quot;'))"/>
                            <outputxsl:if test="position() != last()">
                                <xsl:text>,</xsl:text>
                            </outputxsl:if>
                        </outputxsl:for-each>
                    </outputxsl:variable>
                    <outputxsl:sequence>
                        <xsl:attribute name="select">concat('{', $leaf-json, '}')</xsl:attribute>
                    </outputxsl:sequence>
                </outputxsl:when>
                <outputxsl:otherwise>
                    <outputxsl:variable name="unique-names" select="distinct-values($nodes/name())"/>
                    <outputxsl:variable name="child-json">
                        <outputxsl:for-each select="$unique-names">
                            <outputxsl:variable name="name" select="."/>
                            <outputxsl:variable name="group" select="$nodes[name() = $name]"/>
                            <outputxsl:choose>
                                <outputxsl:when test="count($group) = 1">
                                    <outputxsl:variable name="child" select="$group[1]"/>
                                    <outputxsl:choose>
                                        <outputxsl:when test="not($child/*)">
                                            <outputxsl:variable name="value" select="normalize-space($child)"/>
                                            <outputxsl:value-of
                                                    select="concat('&#34;', $name, '&#34;:', if ($value = '') then 'null' else concat('&#34;', $value, '&#34;'))"/>
                                        </outputxsl:when>
                                        <outputxsl:otherwise>
                                            <outputxsl:value-of
                                                    select="concat('&#34;', $name, '&#34;:', datamapper:xml-to-json($child/*))"/>
                                        </outputxsl:otherwise>
                                    </outputxsl:choose>
                                </outputxsl:when>
                                <outputxsl:otherwise>
                                    <outputxsl:value-of
                                            select="concat('&#34;', $name, '&#34;:[', string-join( for $c in $group return if (not($c/*)) then let $val := normalize-space($c) return if ($val = '') then 'null' else concat('&#34;', $val, '&#34;') else datamapper:xml-to-json($c/*) , ',' ), ']' ) "/>
                                </outputxsl:otherwise>
                            </outputxsl:choose>
                            <outputxsl:if test="position() != last()">
                                <outputxsl:text>,</outputxsl:text>
                            </outputxsl:if>
                        </outputxsl:for-each>
                    </outputxsl:variable>
                    <outputxsl:sequence>
                        <xsl:attribute name="select">concat('{', $child-json, '}')</xsl:attribute>
                    </outputxsl:sequence>
                </outputxsl:otherwise>
            </outputxsl:choose>
        </outputxsl:function>
    </xsl:template>

</xsl:stylesheet>