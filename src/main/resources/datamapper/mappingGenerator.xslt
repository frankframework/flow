<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:map="http://www.w3.org/2005/xpath-functions/map"
                xmlns:func="http://exslt.org/functions"
                xmlns:datamapper="http://example.com/datamapper"
                xmlns:outputxsl="http://www.w3.org/1999/XSL/TransformAlias"
>

    <xsl:namespace-alias stylesheet-prefix="outputxsl" result-prefix="xsl"/>
    <xsl:output method="xml" indent="yes"/>
    <xsl:include href="functions.xslt"/>
    <xsl:variable name="jsonPath" select="/params/jsonPath/text()"/>

    <xsl:function name="datamapper:lookUp" as="xs:string?">
        <xsl:param name="passedData" as="array(*)?"/>
        <xsl:param name="internalId" as="xs:string"/>
        <xsl:param name="path" as="xs:string"/>
        <xsl:param name="operator" as="xs:string"/>

        <xsl:sequence>
            <xsl:if test="not(empty($passedData))">
                <xsl:for-each select="$passedData?*">
                    <!-- Check if operator should be prepended -->
                    <xsl:variable name="needsOperator" select="not(starts-with($path, '$'))"/>

                    <!-- Build the new path -->
                    <xsl:variable name="newPath" as="xs:string">
                        <xsl:choose>
                            <!-- If it's a schematic, start with $/ -->
                            <xsl:when test="?type = 'schematic'">
                                <xsl:value-of select="concat('$', ?label )"/>
                            </xsl:when>

                            <!-- Otherwise, use $data and the provided operator -->
                            <xsl:otherwise>
                                <xsl:value-of select="
                concat(
                    if ($path != '' and not(starts-with($path, '$'))) then concat('$data', $operator) else '',
                    $path,
                    if ($path != '' and not(ends-with($path, '$'))) then $operator else '',
                    ?label
                )
            "/>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:variable>

                    <!-- Return result if internalId matches, otherwise recurse -->
                    <xsl:sequence select="
                    if (?internalId = $internalId) then
                        if(starts-with($newPath, '$')) then $newPath
                        else concat('$data',$operator, $newPath)

                    else if (exists(?children)) then
                        datamapper:lookUp(?children, $internalId, $newPath, $operator)
                    else ()
                "/>
                </xsl:for-each>
            </xsl:if>
        </xsl:sequence>
    </xsl:function>

    <xsl:function name="datamapper:createFunction" as="xs:string">
        <xsl:param name="type"/>
        <xsl:param name="name"/>
        <xsl:param name="inputs"/>

        <xsl:variable name="args">
            <xsl:if test="$type?inputs?1?expandable = true()">
                <xsl:text>(</xsl:text>
            </xsl:if>
            <xsl:for-each select="$inputs?*">
                <xsl:choose>
                    <xsl:when test="?type != 'source'">
                        <xsl:text>'</xsl:text>
                        <xsl:value-of select="?value"/>
                        <xsl:text>'</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>$</xsl:text>
                        <xsl:value-of select="?sourceId"/>
                    </xsl:otherwise>
                </xsl:choose>
                <xsl:if test="position() != last()">,</xsl:if>
            </xsl:for-each>
            <xsl:if test="$type?inputs?1?expandable = true()">
                <xsl:text>)</xsl:text>
            </xsl:if>

        </xsl:variable>

        <xsl:sequence select="concat('datamapper:', $type?name, '(', $args, ')')"/>
    </xsl:function>
    <!-- Entry point -->
    <xsl:template name="main" match="/">


        <xsl:variable name="data" select="json-doc($jsonPath)"/>
        <!--        Output XSLT stylesheet, using xsl:text here because it's the only way to pass xmlns attributes-->
        <outputxsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                              version="3.0"
                              xmlns:xs="http://www.w3.org/2001/XMLSchema"
                              xmlns:datamapper="http://example.com/datamapper"
                              exclude-result-prefixes="datamapper xs map func"
        >
            <xsl:choose>
                <xsl:when test="$data?targetType = 'JSON'">
                    <outputxsl:output method="text" indent="no"/>
                </xsl:when>
                <xsl:otherwise>
                    <outputxsl:output method="xml" indent="yes"/>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:choose>
                <xsl:when test="$data?sourceType = 'JSON'">
                    <outputxsl:variable name="jsonPath" select="/params/jsonPath/text()"/>
                    <outputxsl:variable name="data" select="json-doc(resolve-uri($jsonPath, base-uri(.)))"/>
                </xsl:when>
                <xsl:when test="$data?sourceType = 'XML'">
                    <outputxsl:variable name="data" select="/*"/>
                </xsl:when>
            </xsl:choose>
            <xsl:call-template name="functions"/>

            <xsl:choose>
                <xsl:when test="$data?targetType = 'JSON'">
                    <outputxsl:template name="source">
                        <xsl:attribute name="match">/</xsl:attribute>
                        <outputxsl:variable name="xmlOutput">
                            <xsl:for-each select="$data?sourceStructure?*">
                                <xsl:if test="?type = 'schematic'">
                                    <xsl:choose>
                                        <xsl:when test="$data?sourceType = 'XML'">
                                            <outputxsl:variable name="{?label}"
                                                                select="doc('{?label}.xml')"/>
                                        </xsl:when>
                                        <xsl:when test="$data?sourceType = 'JSON'">
                                            <outputxsl:variable name="{?label}"
                                                                select="json-doc('{?label}.json')"/>
                                        </xsl:when>
                                    </xsl:choose>

                                </xsl:if>
                            </xsl:for-each>
                            <xsl:for-each select="$data?targetStructure?*">

                                <xsl:call-template name="outer-property">
                                    <xsl:with-param name="node" select="."/>
                                    <xsl:with-param name="data" select="$data"/>
                                </xsl:call-template>
                            </xsl:for-each>
                        </outputxsl:variable>
                        <outputxsl:value-of select="datamapper:xml-to-json($xmlOutput/*)"></outputxsl:value-of>
                    </outputxsl:template>

                </xsl:when>
                <xsl:when test="$data?targetType = 'XML'">
                    <outputxsl:template>
                        <xsl:attribute name="match">
                            <xsl:text>/</xsl:text>
                            <xsl:if test="$data?sourceType = 'XML'"></xsl:if>
                        </xsl:attribute>
                        <xsl:for-each select="$data?sourceStructure?*">
                            <xsl:if test="?type = 'schematic'">
                                <xsl:choose>
                                    <xsl:when test="$data?sourceType = 'XML'">
                                        <outputxsl:variable name="{?label}"
                                                            select="doc('{?label}.xml')"/>
                                    </xsl:when>
                                    <xsl:when test="$data?sourceType = 'JSON'">
                                        <outputxsl:variable name="{?label}"
                                                            select="json-doc('{?label}.json')"/>
                                    </xsl:when>
                                </xsl:choose>
                            </xsl:if>
                        </xsl:for-each>

                        <xsl:for-each select="$data?targetStructure?*">
                            <xsl:call-template name="outer-property">
                                <xsl:with-param name="node" select="."/>
                                <xsl:with-param name="data" select="$data"/>
                            </xsl:call-template>
                        </xsl:for-each>
                    </outputxsl:template>

                </xsl:when>
            </xsl:choose>
        </outputxsl:stylesheet>
    </xsl:template>

    <!-- Recursive template for processing targets -->
    <xsl:template name="outer-property">
        <xsl:param name="node"/>
        <xsl:param name="data"/>
        <!--
         The XSS:IF here exists purely to keep the variables in the scope of the element.
        They can't go inside the element because they might be needed for the outer if.
        -->
        <xsl:variable name="operator">
            <xsl:choose>
                <xsl:when test="$data?sourceType = 'JSON'">?</xsl:when>
            </xsl:choose>
            <xsl:choose>
                <xsl:when test="$data?sourceType = 'XML'">/</xsl:when>
            </xsl:choose>
        </xsl:variable>
        <!--        If statement here is to create a scope to restrict the fields variables in-->
        <outputxsl:if test="true()">
            <xsl:for-each select="$node?mapping?sources?*">
                <xsl:variable name="location">
                    <xsl:choose>
                        <xsl:when test="?parentArray">
                            <xsl:variable name="parentArrayPath"
                                          select="datamapper:lookUp($data?sourceStructure, ?parentArray, '', $operator)"/>

                            <xsl:variable name="internalPath"
                                          select="datamapper:lookUp($data?sourceStructure, ?internalId, '', $operator)"/>

                            <xsl:value-of select="substring-after($internalPath, concat($parentArrayPath, '/'))"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of
                                    select="concat('', datamapper:lookUp($data?sourceStructure, ?internalId, '', $operator))"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <outputxsl:variable name="{?internalId}" select="{$location}"/>
            </xsl:for-each>
            <xsl:for-each select="$node?mapping?mutations?*">
                <outputxsl:variable name="{?id}" select="{datamapper:createFunction(?mutationType, ?name, ?inputs)}"/>
            </xsl:for-each>
            <xsl:for-each select="$node?mapping?conditions?*">
                <outputxsl:variable name="{?id}" select="{datamapper:createFunction(?type, ?name, ?inputs)}"/>
            </xsl:for-each>
            <xsl:choose>
                <xsl:when test="not(empty($node?mapping?conditional))">
                    <outputxsl:if test="${$node?mapping?conditional?id}">
                        <xsl:choose>
                            <xsl:when test="$node?type = 'array'">
                                <outputxsl:for-each select="${$node?mapping?output}">
                                    <xsl:call-template name="inner-property">
                                        <xsl:with-param name="node" select="."/>
                                        <xsl:with-param name="data" select="$data"/>
                                    </xsl:call-template>
                                </outputxsl:for-each>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:call-template name="inner-property">
                                    <xsl:with-param name="node" select="."/>
                                    <xsl:with-param name="data" select="$data"/>
                                </xsl:call-template>
                            </xsl:otherwise>
                        </xsl:choose>
                    </outputxsl:if>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:choose>
                        <xsl:when test="$node?type = 'array'">
                            <outputxsl:for-each select="${$node?mapping?output}">
                                <xsl:call-template name="inner-property">
                                    <xsl:with-param name="node" select="."/>
                                    <xsl:with-param name="data" select="$data"/>
                                </xsl:call-template>
                            </outputxsl:for-each>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:call-template name="inner-property">
                                <xsl:with-param name="node" select="."/>
                                <xsl:with-param name="data" select="$data"/>
                            </xsl:call-template>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:otherwise>
            </xsl:choose>
        </outputxsl:if>

        <!-- Create element with the label -->

    </xsl:template>
    <xsl:template name="inner-property">
        <xsl:param name="node"/>
        <xsl:param name="data"/>

        <xsl:element name="{$node?label}">
            <xsl:if test="empty($node?children)">
                <xsl:choose>
                    <xsl:when test="exists($node?mapping)">
                        <outputxsl:value-of select="${$node?mapping?output}"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="$node?defaultValue"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:if>

            <!-- Recurse if there are children -->
            <xsl:if test="exists($node?children) and count($node?children) > 0">

                <xsl:for-each select="$node?children?*">
                    <xsl:call-template name="outer-property">
                        <xsl:with-param name="node" select="."/>
                        <xsl:with-param name="data" select="$data"/>
                    </xsl:call-template>
                </xsl:for-each>
            </xsl:if>
        </xsl:element>
    </xsl:template>
</xsl:stylesheet>