package org.frankframework.flow.common;

import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import jakarta.annotation.security.RolesAllowed;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;
import org.frankframework.lifecycle.DynamicRegistration;

/**
 * To avoid repeating this list of user roles, use a default annotation
 *
 * @see DynamicRegistration#ALL_IBIS_USER_ROLES
 */
@Documented
@Retention(RUNTIME)
@Target(METHOD)
@RolesAllowed({ "IbisObserver", "IbisDataAdmin", "IbisAdmin", "IbisTester" })
public @interface AllowAllFrankUserRoles {
}
