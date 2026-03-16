<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:datamapper="http://example.com/datamapper"
                xmlns:func="http://exslt.org/functions"
                xmlns:map="http://www.w3.org/2005/xpath-functions/map"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                version="3.0"
                exclude-result-prefixes="datamapper xs map func">
   <xsl:output method="xml" indent="yes"/>
   <xsl:variable name="jsonPath" select="/params/jsonPath/text()"/>
   <xsl:variable name="data" select="json-doc($jsonPath)"/>
   <xsl:function name="datamapper:Concat">
      <xsl:param name="items" as="xs:string*"/>
      <xsl:sequence select="string-join($items, '')"/>
   </xsl:function>
   <xsl:function name="datamapper:Equation">
      <xsl:param name="left"/>
      <xsl:param name="op"/>
      <xsl:param name="right"/>
      <xsl:choose>
         <xsl:when test="$op = '&lt;'">
            <xsl:sequence select="$left &lt; $right"/>
         </xsl:when>
         <xsl:when test="$op = '&gt;'">
            <xsl:sequence select="$left &gt; $right"/>
         </xsl:when>
         <xsl:when test="$op = '='">
            <xsl:sequence select="$left = $right"/>
         </xsl:when>
         <xsl:otherwise>
            <xsl:sequence select="false()"/>
         </xsl:otherwise>
      </xsl:choose>
   </xsl:function>
   <xsl:function name="datamapper:ValueEquals">
      <xsl:param name="a"/>
      <xsl:param name="b"/>
      <xsl:sequence select="$a = $b"/>
   </xsl:function>
   <xsl:function name="datamapper:CastToString">
      <xsl:param name="a"/>
      <xsl:sequence select="string($a)"/>
   </xsl:function>
   <xsl:function name="datamapper:NullCheck">
      <xsl:param name="a"/>
      <xsl:sequence select="string-length($a) &gt; 0"/>
   </xsl:function>
   <xsl:function name="datamapper:Replace">
      <xsl:param name="text"/>
      <xsl:param name="search"/>
      <xsl:param name="replace"/>
      <xsl:choose>
         <xsl:when test="contains($text, $search)">
            <xsl:sequence select="concat(substring-before($text, $search),$replace,datamapper:Replace(substring-after($text, $search), $search, $replace))"/>
         </xsl:when>
         <xsl:otherwise>
            <xsl:sequence select="$text"/>
         </xsl:otherwise>
      </xsl:choose>
   </xsl:function>
   <xsl:function name="datamapper:xml-to-json" as="xs:string">
      <xsl:param name="nodes" as="element()*"/>
      <xsl:choose>
         <xsl:when test="empty($nodes)">
            <xsl:sequence select="''"/>
         </xsl:when>
         <xsl:when test="every $n in $nodes satisfies not($n/*)">
            <xsl:variable name="leaf-json">
               <xsl:for-each select="$nodes">
                  <xsl:variable name="value" select="normalize-space(.)"/>
                  <xsl:value-of select="concat('&#34;', name(), '&#34;:', if ($value = '') then 'null' else concat('&#34;', $value, '&#34;'))"/>
                  <xsl:if test="position() != last()">,</xsl:if>
               </xsl:for-each>
            </xsl:variable>
            <xsl:sequence select="concat('{', $leaf-json, '}')"/>
         </xsl:when>
         <xsl:otherwise>
            <xsl:variable name="unique-names" select="distinct-values($nodes/name())"/>
            <xsl:variable name="child-json">
               <xsl:for-each select="$unique-names">
                  <xsl:variable name="name" select="."/>
                  <xsl:variable name="group" select="$nodes[name() = $name]"/>
                  <xsl:choose>
                     <xsl:when test="count($group) = 1">
                        <xsl:variable name="child" select="$group[1]"/>
                        <xsl:choose>
                           <xsl:when test="not($child/*)">
                              <xsl:variable name="value" select="normalize-space($child)"/>
                              <xsl:value-of select="concat('&#34;', $name, '&#34;:', if ($value = '') then 'null' else concat('&#34;', $value, '&#34;'))"/>
                           </xsl:when>
                           <xsl:otherwise>
                              <xsl:value-of select="concat('&#34;', $name, '&#34;:', datamapper:xml-to-json($child/*))"/>
                           </xsl:otherwise>
                        </xsl:choose>
                     </xsl:when>
                     <xsl:otherwise>
                        <xsl:value-of select="concat('&#34;', $name, '&#34;:[', string-join( for $c in $group return if (not($c/*)) then let $val := normalize-space($c) return if ($val = '') then 'null' else concat('&#34;', $val, '&#34;') else datamapper:xml-to-json($c/*) , ',' ), ']' ) "/>
                     </xsl:otherwise>
                  </xsl:choose>
                  <xsl:if test="position() != last()">
                     <xsl:text>,</xsl:text>
                  </xsl:if>
               </xsl:for-each>
            </xsl:variable>
            <xsl:sequence select="concat('{', $child-json, '}')"/>
         </xsl:otherwise>
      </xsl:choose>
   </xsl:function>
   <xsl:template match="/">
      <xsl:if test="true()">
         <orders>
            <xsl:if test="true()">
               <user>
                  <xsl:if test="true()">
                     <xsl:variable name="source-table-group-16-group-20-item-21"
                                   select="$data?userSchema?profile?firstName"/>
                     <xsl:variable name="source-table-group-16-group-20-item-22"
                                   select="$data?userSchema?profile?lastName"/>
                     <xsl:variable name="mutation-_r_9_"
                                   select="datamapper:Concat(($source-table-group-16-group-20-item-21,'  ',$source-table-group-16-group-20-item-22))"/>
                     <fullname>
                        <xsl:value-of select="$mutation-_r_9_"/>
                     </fullname>
                  </xsl:if>
                  <xsl:if test="true()">
                     <xsl:variable name="source-table-group-16-item-17" select="$data?userSchema?username"/>
                     <username>
                        <xsl:value-of select="$source-table-group-16-item-17"/>
                     </username>
                  </xsl:if>
                  <xsl:if test="true()">
                     <xsl:variable name="source-table-group-16-item-18" select="$data?userSchema?email"/>
                     <email>
                        <xsl:value-of select="$source-table-group-16-item-18"/>
                     </email>
                  </xsl:if>
                  <xsl:if test="true()">
                     <xsl:variable name="source-table-group-16-group-20-item-23"
                                   select="$data?userSchema?profile?birthYear"/>
                     <xsl:variable name="condition-_r_g_"
                                   select="datamapper:Equation($source-table-group-16-group-20-item-23,'&lt;','2026-18')"/>
                     <isAdult>
                        <xsl:value-of select="$condition-_r_g_"/>
                     </isAdult>
                  </xsl:if>
                  <xsl:if test="true()">
                     <xsl:variable name="source-table-group-16-item-19" select="$data?userSchema?status"/>
                     <xsl:variable name="condition-_r_i_"
                                   select="datamapper:ValueEquals($source-table-group-16-item-19,'allowed')"/>
                     <status>
                        <xsl:value-of select="$condition-_r_i_"/>
                     </status>
                  </xsl:if>
               </user>
            </xsl:if>
            <xsl:if test="true()">
               <order>
                  <xsl:if test="true()">
                     <xsl:variable name="source-table-group-4-item-5" select="$data?receipt?orderId"/>
                     <xsl:variable name="mutation-_r_n_"
                                   select="datamapper:CastToString($source-table-group-4-item-5)"/>
                     <orderId>
                        <xsl:value-of select="$mutation-_r_n_"/>
                     </orderId>
                  </xsl:if>
                  <xsl:if test="true()">
                     <xsl:variable name="source-table-group-6-item-8" select="$data?productSchema?price"/>
                     <xsl:variable name="source-table-group-6-item-9"
                                   select="$data?productSchema?currency"/>
                     <xsl:variable name="mutation-_r_r_"
                                   select="datamapper:CastToString($source-table-group-6-item-8)"/>
                     <xsl:variable name="mutation-_r_t_"
                                   select="datamapper:Concat(($mutation-_r_r_,$source-table-group-6-item-9))"/>
                     <totalPrice>
                        <xsl:value-of select="$mutation-_r_t_"/>
                     </totalPrice>
                  </xsl:if>
                  <xsl:if test="true()">
                     <xsl:variable name="source-table-item-1" select="$data?amountPaid"/>
                     <xsl:variable name="source-table-item-0" select="$data?totalPrice"/>
                     <xsl:variable name="condition-_r_p_"
                                   select="datamapper:ValueEquals($source-table-item-0,$source-table-item-1)"/>
                     <paid>
                        <xsl:value-of select="$condition-_r_p_"/>
                     </paid>
                  </xsl:if>
                  <xsl:if test="true()">
                     <receipt>
                        <xsl:if test="true()">
                           <xsl:variable name="source-table-group-6-item-7"
                                         select="$data?productSchema?productId"/>
                           <xsl:variable name="mutation-_r_q_"
                                         select="datamapper:Replace($source-table-group-6-item-7,'id','Product')"/>
                           <productId>
                              <xsl:value-of select="$mutation-_r_q_"/>
                           </productId>
                        </xsl:if>
                        <xsl:if test="true()">
                           <xsl:variable name="source-table-item-0" select="$data?totalPrice"/>
                           <xsl:variable name="mutation-_r_o_"
                                         select="datamapper:CastToString($source-table-item-0)"/>
                           <price>
                              <xsl:value-of select="$mutation-_r_o_"/>
                           </price>
                        </xsl:if>
                        <xsl:if test="true()">
                           <xsl:variable name="source-table-group-6-item-10"
                                         select="$data?productSchema?amountOfitems"/>
                           <xsl:variable name="condition-_r_u_" select="datamapper:NullCheck('')"/>
                           <xsl:if test="$condition-_r_u_">
                              <instock>
                                 <xsl:value-of select="$condition-_r_u_"/>
                              </instock>
                           </xsl:if>
                        </xsl:if>
                        <xsl:if test="true()">
                           <xsl:variable name="source-table-group-6-group-11-item-12"
                                         select="$data?productSchema?dimensions?width"/>
                           <xsl:variable name="source-table-group-6-group-11-item-13"
                                         select="$data?productSchema?dimensions?height"/>
                           <xsl:variable name="source-table-group-6-group-11-item-14"
                                         select="$data?productSchema?dimensions?depth"/>
                           <xsl:variable name="source-table-group-6-group-11-item-15"
                                         select="$data?productSchema?dimensions?unit"/>
                           <xsl:variable name="mutation-_r_10_"
                                         select="datamapper:CastToString($source-table-group-6-group-11-item-12)"/>
                           <xsl:variable name="mutation-_r_12_"
                                         select="datamapper:CastToString($source-table-group-6-group-11-item-13)"/>
                           <xsl:variable name="mutation-_r_15_"
                                         select="datamapper:CastToString($source-table-group-6-group-11-item-14)"/>
                           <xsl:variable name="mutation-_r_17_"
                                         select="datamapper:Concat(($mutation-_r_10_,$source-table-group-6-group-11-item-15,', ',$mutation-_r_12_,$source-table-group-6-group-11-item-15,', ',$mutation-_r_15_,$source-table-group-6-group-11-item-15))"/>
                           <dimension>
                              <xsl:value-of select="$mutation-_r_17_"/>
                           </dimension>
                        </xsl:if>
                     </receipt>
                  </xsl:if>
               </order>
            </xsl:if>
         </orders>
      </xsl:if>
   </xsl:template>
</xsl:stylesheet>
