package org.frankframework.flow.test;

import org.springframework.stereotype.Service;

@Service
public class TestService {

	public String GetTestString() {
		return "FF! Flow backend is working as intended!";
	}
}
