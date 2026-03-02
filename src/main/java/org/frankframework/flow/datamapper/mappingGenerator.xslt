<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:map="http://www.w3.org/2005/xpath-functions/map"
                xmlns:func="http://exslt.org/functions"
>
    <xsl:output method="xml" indent="yes"/>

    <!-- Entry point -->
    <xsl:template name="main" match="/">
        <xsl:variable name="data" select="json-doc('input.json')"/>
        <!-- Start recursion on target structure -->
        <xsl:element name="xsl:stylesheet">
               <xsl:attribute name="version" >1.0</xsl:attribute>
            <xsl:element name="xsl:output">
                <xsl:attribute name="method">xml</xsl:attribute>
                <xsl:attribute name="indent">yes</xsl:attribute>
            </xsl:element>
            <xsl:element name="xsl:template">
                <xsl:attribute name="match">/source</xsl:attribute>

<!--        <xsl:output method="xml" indent="yes"/>-->
        <xsl:for-each select="$data?targetStructure?*">
            <xsl:call-template name="outer-property">
                <xsl:with-param name="node" select="."/>
                <xsl:with-param name="data" select="$data"/>
            </xsl:call-template>
        </xsl:for-each>
        </xsl:element>
        </xsl:element>
    </xsl:template>

    <!-- Recursive template for processing targets -->
    <xsl:template name="outer-property">
        <xsl:param name="node"/>
        <xsl:param name="data"/>
        <xsl:variable name="labelmap" as="map(xs:string, xs:string)">
            <xsl:map>
                <xsl:for-each select="$node?mapping?sources?*">
                     <xsl:map-entry  key="?internalId" select="?label"/>
                </xsl:for-each>
                <xsl:for-each select="$node?mapping?mutations?*">
                    <xsl:map-entry  key="?id" select="?id"/>
                </xsl:for-each>
                <xsl:for-each select="$node?mapping?conditions?*">
                    <xsl:map-entry  key="?id" select="?id"/>
                </xsl:for-each>
            </xsl:map>
        </xsl:variable>
        <xsl:for-each select="$node?mapping?mutations?*">
            <!--                This could be changed to use variables -->
            <xsl:element name="func:function">
                <xsl:attribute name="name"><xsl:value-of select="?id"></xsl:value-of></xsl:attribute>
                <xsl:element name="func:result">
                    <xsl:element name="xsl:value-of">
                        <xsl:attribute name="select"><xsl:value-of select="?name"/> This will be replaced with actual function</xsl:attribute>
                    </xsl:element>
                </xsl:element>
            </xsl:element>
        </xsl:for-each>
        <xsl:for-each select="$node?mapping?conditions?*">
            <xsl:element name="func:function">
                <xsl:attribute name="name"><xsl:value-of select="?id"></xsl:value-of></xsl:attribute>
                <xsl:element name="func:result">
                    <xsl:element name="xsl:value-of">
                        <xsl:attribute name="select"><xsl:value-of select="?name"/> This will be replaced with actual function</xsl:attribute>
                    </xsl:element>
                </xsl:element>
            </xsl:element>
        </xsl:for-each>
        <xsl:choose>
        <xsl:when test="not(empty($node?mapping?conditional))">
            <xsl:element name="xsl:if">
                <xsl:attribute name="test">
                    <xsl:value-of select="$node?mapping?conditional?name"></xsl:value-of>
                </xsl:attribute>

        <xsl:call-template name="inner-property">
            <xsl:with-param name="node" select="."/>
            <xsl:with-param name="data" select="$data"/>
            <xsl:with-param name="labelmap" select="$labelmap"/>
        </xsl:call-template>
            </xsl:element>
        </xsl:when>
            <xsl:otherwise>
                <xsl:call-template name="inner-property">
                    <xsl:with-param name="node" select="."/>
                    <xsl:with-param name="data" select="$data"/>
                    <xsl:with-param name="labelmap" select="$labelmap"/>
                </xsl:call-template>
            </xsl:otherwise>
        </xsl:choose>

        <!-- Create element with the label -->

    </xsl:template>
    <xsl:template name="inner-property">
        <xsl:param name="node"/>
        <xsl:param name="data"/>
        <xsl:param name="labelmap"/>
        <xsl:element name="{$node?label}" >

            <xsl:if test="empty($node?children)">

                <xsl:element name="xsl:value-of">
                    <xsl:if test="not(empty($node?mapping?output))">
                        <xsl:attribute name="select">
                            <xsl:value-of select="map:get($labelmap, $node?mapping?output)"/>
                        </xsl:attribute>
                    </xsl:if>
                </xsl:element>
            </xsl:if>

            <!--            <xsl:for-each select="map:keys($labelmap)">-->
            <!--                <xsl:variable name="id" select="."/>-->
            <!--                <xsl:element name="test">-->
            <!--                    <xsl:attribute name="internalId" select="$id"/>-->
            <!--                    <xsl:attribute name="label" select="$labelmap($id)"/>-->
            <!--                </xsl:element>-->
            <!--            </xsl:for-each>-->
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