package org.frankframework.flow.security;

import java.io.Serializable;
import lombok.Getter;
import lombok.Setter;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

@Component
@RequestScope(proxyMode = ScopedProxyMode.TARGET_CLASS)
@Getter
@Setter
public class UserWorkspaceContext implements Serializable {

	private String workspaceId;
	private boolean initialized = false;

	public void initialize(String id) {
		this.workspaceId = id;
		this.initialized = true;
	}
}
