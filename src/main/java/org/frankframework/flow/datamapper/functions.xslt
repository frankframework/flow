<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:map="http://www.w3.org/2005/xpath-functions/map"
                xmlns:func="http://exslt.org/functions"
>
    <xsl:template name="functions">

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
        <xsl:element name="xsl:function">
            <xsl:attribute name="name">datamapper:xml-to-json</xsl:attribute>
            <xsl:attribute name="as">xs:string</xsl:attribute>

            <!-- Parameter nodes -->
            <xsl:element name="xsl:param">
                <xsl:attribute name="name">nodes</xsl:attribute>
                <xsl:attribute name="as">element()*</xsl:attribute>
            </xsl:element>

            <xsl:element name="xsl:choose">

                <!-- No nodes -->
                <xsl:element name="xsl:when">
                    <xsl:attribute name="test">empty($nodes)</xsl:attribute>
                    <xsl:element name="xsl:sequence">
                        <xsl:attribute name="select">''</xsl:attribute>
                    </xsl:element>
                </xsl:element>

                <!-- Leaf nodes -->
                <xsl:element name="xsl:when">
                    <xsl:attribute name="test">every $n in $nodes satisfies not($n/*)</xsl:attribute>
                    <xsl:element name="xsl:variable">
                        <xsl:attribute name="name">leaf-json</xsl:attribute>
                        <xsl:element name="xsl:for-each">
                            <xsl:attribute name="select">$nodes</xsl:attribute>
                            <xsl:element name="xsl:variable">
                                <xsl:attribute name="name">value</xsl:attribute>
                                <xsl:attribute name="select">normalize-space(.)</xsl:attribute>
                            </xsl:element>
                            <xsl:element name="xsl:value-of">
                                <xsl:attribute name="select">
                                    concat('&quot;', name(), '&quot;:',
                                    if ($value = '') then 'null' else concat('&quot;', $value, '&quot;'))
                                </xsl:attribute>
                            </xsl:element>
                            <xsl:element name="xsl:if">
                                <xsl:attribute name="test">position() != last()</xsl:attribute>
                                <xsl:element name="xsl:text">,</xsl:element>
                            </xsl:element>
                        </xsl:element>
                    </xsl:element>
                    <xsl:element name="xsl:sequence">
                        <xsl:attribute name="select">concat('{', $leaf-json, '}')</xsl:attribute>
                    </xsl:element>
                </xsl:element>

                <!-- Nodes with children -->
                <xsl:element name="xsl:otherwise">

                    <xsl:element name="xsl:variable">
                        <xsl:attribute name="name">unique-names</xsl:attribute>
                        <xsl:attribute name="select">distinct-values($nodes/name())</xsl:attribute>
                    </xsl:element>

                    <xsl:element name="xsl:variable">
                        <xsl:attribute name="name">child-json</xsl:attribute>
                        <xsl:element name="xsl:for-each">
                            <xsl:attribute name="select">$unique-names</xsl:attribute>
                            <xsl:element name="xsl:variable">
                                <xsl:attribute name="name">name</xsl:attribute>
                                <xsl:attribute name="select">.</xsl:attribute>
                            </xsl:element>
                            <xsl:element name="xsl:variable">
                                <xsl:attribute name="name">group</xsl:attribute>
                                <xsl:attribute name="select">$nodes[name() = $name]</xsl:attribute>
                            </xsl:element>

                            <xsl:element name="xsl:choose">

                                <!-- Single node -->
                                <xsl:element name="xsl:when">
                                    <xsl:attribute name="test">count($group) = 1</xsl:attribute>
                                    <xsl:element name="xsl:variable">
                                        <xsl:attribute name="name">child</xsl:attribute>
                                        <xsl:attribute name="select">$group[1]</xsl:attribute>
                                    </xsl:element>

                                    <xsl:element name="xsl:choose">
                                        <!-- Leaf node -->
                                        <xsl:element name="xsl:when">
                                            <xsl:attribute name="test">not($child/*)</xsl:attribute>
                                            <xsl:element name="xsl:variable">
                                                <xsl:attribute name="name">value</xsl:attribute>
                                                <xsl:attribute name="select">normalize-space($child)</xsl:attribute>
                                            </xsl:element>
                                            <xsl:element name="xsl:value-of">
                                                <xsl:attribute name="select">
                                                    concat('&quot;', $name, '&quot;:',
                                                    if ($value = '') then 'null' else concat('&quot;', $value, '&quot;'))
                                                </xsl:attribute>
                                            </xsl:element>
                                        </xsl:element>

                                        <!-- Node with children -->
                                        <xsl:element name="xsl:otherwise">
                                            <xsl:element name="xsl:value-of">
                                                <xsl:attribute name="select">
                                                    concat('&quot;', $name, '&quot;:', datamapper:xml-to-json($child/*))
                                                </xsl:attribute>
                                            </xsl:element>
                                        </xsl:element>
                                    </xsl:element>
                                </xsl:element>

                                <!-- Multiple nodes with same name -->
                                <xsl:element name="xsl:otherwise">
                                    <xsl:element name="xsl:value-of">
                                        <xsl:attribute name="select">
                                            concat('&quot;', $name, '&quot;:[',
                                            string-join(
                                            for $c in $group
                                            return
                                            if (not($c/*)) then
                                            let $val := normalize-space($c) return
                                            if ($val = '') then 'null' else concat('&quot;', $val, '&quot;')
                                            else
                                            datamapper:xml-to-json($c/*)
                                            , ','
                                            ), ']'
                                            )
                                        </xsl:attribute>
                                    </xsl:element>
                                </xsl:element>

                            </xsl:element>

                            <xsl:element name="xsl:if">
                                <xsl:attribute name="test">position() != last()</xsl:attribute>
                                <xsl:element name="xsl:text">,</xsl:element>
                            </xsl:element>

                        </xsl:element>
                    </xsl:element>

                    <xsl:element name="xsl:sequence">
                        <xsl:attribute name="select">concat('{', $child-json, '}')</xsl:attribute>
                    </xsl:element>

                </xsl:element>

            </xsl:element>
        </xsl:element>

    </xsl:template>
</xsl:stylesheet>