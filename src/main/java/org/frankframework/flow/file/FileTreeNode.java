package org.frankframework.flow.file;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FileTreeNode {
	private String name;
	private String path;
	private NodeType type;
	private boolean projectRoot;
	private List<FileTreeNode> children;
	private List<String> adapterNames;
}
