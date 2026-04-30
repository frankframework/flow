package org.frankframework.flow.utility;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import javax.xml.XMLConstants;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.Attributes;

public class XsdAttributeOrdererUtils {
	private static final String XSD_ATTRIBUTE = "attribute";
	private static final String XSD_EXTENSION = "extension";

	private final Map<String, Map<String, Element>> index;
	private final Map<String, OrderInfo> cache = new HashMap<>();

	private record OrderInfo(List<String> xsdOrder, Set<String> required) {}

	public XsdAttributeOrdererUtils(Document xsdDoc) {
		this.index = buildIndex(xsdDoc);
	}

	private static Map<String, Map<String, Element>> buildIndex(Document doc) {
		Map<String, Map<String, Element>> idx = new HashMap<>();
		NodeList all = doc.getElementsByTagNameNS(XMLConstants.W3C_XML_SCHEMA_NS_URI, "*");
		for (int i = 0; i < all.getLength(); i++) {
			Element elem = (Element) all.item(i);
			String name = elem.getAttribute("name");
			if (!name.isEmpty()) {
				idx.computeIfAbsent(elem.getLocalName(), k -> new HashMap<>()).put(name, elem);
			}
		}
		return idx;
	}

	List<String[]> reorder(String elementName, Attributes attrs) {
		OrderInfo info = cache.computeIfAbsent(elementName, this::computeOrderInfo);
		Map<String, String> attrMap = buildAttrMap(attrs);
		Set<String> xsdSet = new HashSet<>(info.xsdOrder());

		List<String[]> result = new ArrayList<>();
		result.addAll(namespacedAttrs(attrMap));
		result.addAll(inXsdOrderFiltered(info.xsdOrder(), info.required(), attrMap, true));
		result.addAll(inXsdOrderFiltered(info.xsdOrder(), info.required(), attrMap, false));
		result.addAll(unknownAttrs(attrMap, xsdSet));
		return result;
	}

	private static Map<String, String> buildAttrMap(Attributes attrs) {
		Map<String, String> map = new LinkedHashMap<>();
		for (int i = 0; i < attrs.getLength(); i++) {
			map.put(attrs.getQName(i), attrs.getValue(i));
		}
		return map;
	}

	private static List<String[]> inXsdOrderFiltered(List<String> xsdOrder, Set<String> required,
			Map<String, String> attrMap, boolean requiredOnly) {
		List<String[]> result = new ArrayList<>();
		for (String name : xsdOrder) {
			if (required.contains(name) != requiredOnly) continue;
			String value = attrMap.get(name);
			if (value != null) result.add(pair(name, value));
		}
		return result;
	}

	private static List<String[]> unknownAttrs(Map<String, String> attrMap, Set<String> xsdSet) {
		return attrMap.entrySet().stream()
				.filter(e -> !xsdSet.contains(e.getKey()) && !e.getKey().contains(":"))
				.map(e -> pair(e.getKey(), e.getValue()))
				.sorted(Comparator.comparing(a -> a[0]))
				.collect(Collectors.toList());
	}

	private static List<String[]> namespacedAttrs(Map<String, String> attrMap) {
		return attrMap.entrySet().stream()
				.filter(e -> e.getKey().contains(":"))
				.map(e -> pair(e.getKey(), e.getValue()))
				.sorted(Comparator.comparing(a -> a[0]))
				.collect(Collectors.toList());
	}

	private static String[] pair(String name, String value) {
		return new String[]{name, value};
	}

	private OrderInfo computeOrderInfo(String elementName) {
		Element typeNode = findComplexType(elementName + "Type");
		if (typeNode == null) return new OrderInfo(Collections.emptyList(), Collections.emptySet());
		Set<String> requiredSet = new HashSet<>();
		List<String> ordered = new ArrayList<>(new LinkedHashSet<>(collect(typeNode, new HashSet<>(), requiredSet)));
		return new OrderInfo(ordered, requiredSet);
	}

	private List<String> collect(Element node, Set<String> visited, Set<String> requiredSet) {
		List<String> baseAttrs = Collections.emptyList();
		List<String> ownAttrs = new ArrayList<>();

		NodeList children = node.getChildNodes();
		for (int i = 0; i < children.getLength(); i++) {
			Node child = children.item(i);
			if (child.getNodeType() != Node.ELEMENT_NODE) continue;
			Element elem = (Element) child;
			String local = elem.getLocalName();

			if (XSD_ATTRIBUTE.equals(local)) {
				collectAttribute(elem, ownAttrs, requiredSet);
			} else if (XSD_EXTENSION.equals(local)) {
				baseAttrs = resolveBaseAttributes(elem, visited, requiredSet);
				ownAttrs.addAll(collect(elem, visited, requiredSet));
			} else {
				ownAttrs.addAll(collectGeneric(elem, visited, requiredSet));
			}
		}

		List<String> result = new ArrayList<>(baseAttrs.size() + ownAttrs.size());
		result.addAll(baseAttrs);
		result.addAll(ownAttrs);
		return result;
	}

	private static void collectAttribute(Element attributeElem, List<String> target, Set<String> requiredSet) {
		String name = attributeElem.getAttribute("name");
		if (!name.isEmpty()) {
			target.add(name);
			if ("required".equals(attributeElem.getAttribute("use"))) {
				requiredSet.add(name);
			}
		}
	}

	private List<String> collectGeneric(Element elem, Set<String> visited, Set<String> requiredSet) {
		String ref = elem.getAttribute("ref");
		if (ref.isEmpty()) {
			return collect(elem, visited, requiredSet);
		}
		if (!visited.add(ref)) {
			return Collections.emptyList();
		}
		Element refDef = findDefinition(ref, elem.getLocalName());
		return refDef != null ? collect(refDef, visited, requiredSet) : Collections.emptyList();
	}

	private Element findDefinition(String ref, String localName) {
		Map<String, Element> defs = index.get(localName);
		return defs != null ? defs.get(ref) : null;
	}

	private List<String> resolveBaseAttributes(Element extensionElem, Set<String> visited, Set<String> requiredSet) {
		String base = extensionElem.getAttribute("base");
		if (base.isEmpty() || !visited.add(base)) return Collections.emptyList();
		Element baseType = findComplexType(base);
		return baseType != null ? collect(baseType, visited, requiredSet) : Collections.emptyList();
	}

	private Element findComplexType(String name) {
		Map<String, Element> types = index.get("complexType");
		return types != null ? types.get(name) : null;
	}
}
