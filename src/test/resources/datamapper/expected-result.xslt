<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/source">
        <target>
            <user>
                <fullname>
                    <xsl:value-of select="concat(userSchema/personal/firstName, '  ', userSchema/personal/lastName)"/>
                </fullname>
                <username>
                    <xsl:value-of select="userSchema/username"/>
                </username>
                <email>
                    <xsl:value-of select="userSchema/email"/>
                </email>
                <isAdult>
                    <xsl:choose>
                        <xsl:when test="userSchema/personal/birthYear &lt; 2008">
                            true
                        </xsl:when>
                        <xsl:otherwise>false</xsl:otherwise>
                    </xsl:choose>
                </isAdult>
                <status>
                    <xsl:choose>
                        <xsl:when test="userSchema/status = 'allowed'">
                            true
                        </xsl:when>
                        <xsl:otherwise>false</xsl:otherwise>
                    </xsl:choose>
                </status>
            </user>
            <order>
                <xsl:if test="receipt/orderId">
                    <orderId>
                        <xsl:value-of select="string(receipt/orderId)"/>
                    </orderId>
                </xsl:if>
                <totalPrice>
                    <xsl:value-of select="string(totalPrice)"/>
                </totalPrice>
                <paid>
                    <xsl:choose>
                        <xsl:when test="totalPrice = amountPaid">
                            true
                        </xsl:when>
                        <xsl:otherwise>false</xsl:otherwise>
                    </xsl:choose>
                </paid>
                <receipt>
                    <productId>
                        <xsl:value-of select="translate(productSchema/productId, 'id', 'Product')"/>
                    </productId>
                    <price>
                        <xsl:value-of select="concat(string(productSchema/price), productSchema/currency)"/>
                    </price>
                    <instock>
                        <xsl:choose>
                            <xsl:when test="productSchema/amountOfitems">
                                true
                            </xsl:when>
                            <xsl:otherwise>false</xsl:otherwise>
                        </xsl:choose>
                    </instock>
                    <dimension>
                        <xsl:value-of select="
                            concat(
                                string(productSchema/dimensions/width),
                                productSchema/dimensions/unit,
                                ', ',
                                string(productSchema/dimensions/height),
                                productSchema/dimensions/unit,
                                ', ',
                                string(productSchema/dimensions/depth),
                                productSchema/dimensions/unit
                            )
                        "/>
                    </dimension>
                </receipt>
            </order>
        </target>
    </xsl:template>

</xsl:stylesheet>