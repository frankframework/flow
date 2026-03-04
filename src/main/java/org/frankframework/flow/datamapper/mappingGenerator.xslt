<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:map="http://www.w3.org/2005/xpath-functions/map"
                xmlns:func="http://exslt.org/functions"
>
    <xsl:output method="xml" indent="yes"/>
    <xsl:include href="functions.xslt"/>
    <xsl:variable name="jsonPath" select="/params/jsonPath/text()"/>

    <!-- Entry point -->
    <xsl:template name="main" match="/">

        <xsl:variable name="data" select="json-doc($jsonPath)"/>
        <!--        Output XSLT stylesheet, using xsl:text here because it's the only way to pass xmlns attributes-->
        <xsl:text disable-output-escaping="yes">
            &lt;xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                version="2.0"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:datamapper="http://example.com/datamapper"
                exclude-result-prefixes="datamapper"&gt;
        </xsl:text>
        <xsl:element name="xsl:output">
            <xsl:attribute name="method">xml</xsl:attribute>
            <xsl:attribute name="indent">yes</xsl:attribute>
        </xsl:element>

        <xsl:call-template name="functions"/>

        <xsl:element name="xsl:template">
            <xsl:attribute name="match">/source</xsl:attribute>
            <xsl:for-each select="$data?targetStructure?*">
                <xsl:call-template name="outer-property">
                    <xsl:with-param name="node" select="."/>
                    <xsl:with-param name="data" select="$data"/>
                </xsl:call-template>
            </xsl:for-each>
        </xsl:element>
        <xsl:text disable-output-escaping="yes">
            &lt;/xsl:stylesheet&gt;
        </xsl:text>
    </xsl:template>

    <!-- Recursive template for processing targets -->
    <xsl:template name="outer-property">
        <xsl:param name="node"/>
        <xsl:param name="data"/>
        <!--
         The XSS:IF here exists purely to keep the variables in the scope of the element.
        They can't go inside the element because they might be needed for the outer if.
        -->
        <xsl:element name="xsl:if">
            <xsl:attribute name="test">true()</xsl:attribute>
            <xsl:for-each select="$node?mapping?sources?*">
                <xsl:element name="xsl:variable">
                    <xsl:attribute name="name">
                        <xsl:value-of select="?internalId"></xsl:value-of>
                    </xsl:attribute>
                    <xsl:attribute name="select">
                        <xsl:value-of select="?label"/>
                    </xsl:attribute>
                </xsl:element>
            </xsl:for-each>
            <xsl:for-each select="$node?mapping?mutations?*">
                <xsl:element name="xsl:variable">
                    <xsl:attribute name="name">
                        <xsl:value-of select="?id"></xsl:value-of>
                    </xsl:attribute>
<!--                    The empty XSL-Ifs here exists to ensure no empty newline gets added-->
                    <xsl:attribute name="select">datamapper:<xsl:value-of select="?mutationType?name"/>(<xsl:if test="true()"></xsl:if>
                        <xsl:if test="?mutationType?inputs?1?expandable = true()">(</xsl:if>
                        <xsl:for-each select="?inputs?*">
                            <xsl:choose>
                                <xsl:when test="compare(?type, 'source')">'<xsl:value-of select="?value"/>'<xsl:if test="true()"></xsl:if>
                                </xsl:when>
                                <xsl:otherwise>$<xsl:value-of select="?sourceId"/>
                                </xsl:otherwise>
                            </xsl:choose>
                            <xsl:if test="position() != last()">,</xsl:if>
                        </xsl:for-each>
                        <xsl:if test="true()"></xsl:if>)<xsl:if test="true()"></xsl:if>
                        <xsl:if test="?mutationType?inputs?1?expandable = true()">)</xsl:if>
                    </xsl:attribute>
                </xsl:element>
            </xsl:for-each>
            <xsl:for-each select="$node?mapping?conditions?*">

                <xsl:element name="xsl:variable">
                    <xsl:attribute name="name">
                        <xsl:value-of select="?id"></xsl:value-of>
                    </xsl:attribute>
                    <xsl:attribute name="select">datamapper:<xsl:value-of select="?type?name"/>(<xsl:if test="true()"></xsl:if>
                        <xsl:for-each select="?inputs?*">
                            <xsl:choose>
                                <xsl:when test="compare(?type, 'source')">'<xsl:value-of select="?value"
                                                                                         disable-output-escaping="yes"/>'<xsl:if test="true()"></xsl:if>
                                </xsl:when>
                                <xsl:otherwise>$<xsl:value-of select="?sourceId"/>
                                </xsl:otherwise>
                            </xsl:choose>
                            <xsl:if test="position() != last()">,</xsl:if>
                        </xsl:for-each>
                        <xsl:if test="true()"></xsl:if>)<xsl:if test="true()"></xsl:if>
                    </xsl:attribute>
                </xsl:element>
            </xsl:for-each>
            <xsl:choose>
                <xsl:when test="not(empty($node?mapping?conditional))">
                    <xsl:element name="xsl:if">
                        <xsl:attribute name="test">$<xsl:value-of select="$node?mapping?conditional?id"></xsl:value-of>
                        </xsl:attribute>

                        <xsl:call-template name="inner-property">
                            <xsl:with-param name="node" select="."/>
                            <xsl:with-param name="data" select="$data"/>
                        </xsl:call-template>
                    </xsl:element>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:call-template name="inner-property">
                        <xsl:with-param name="node" select="."/>
                        <xsl:with-param name="data" select="$data"/>
                    </xsl:call-template>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:element>

        <!-- Create element with the label -->

    </xsl:template>
    <xsl:template name="inner-property">
        <xsl:param name="node"/>
        <xsl:param name="data"/>

        <xsl:element name="{$node?label}">

            <xsl:if test="empty($node?children)">
                <xsl:element name="xsl:value-of">
                    <xsl:attribute name="select">$<xsl:value-of select="$node?mapping?output"/>
                    </xsl:attribute>
                </xsl:element>

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