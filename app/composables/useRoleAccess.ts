import { computed } from "vue";

/**
 * Role-based access composable.
 * Pass an array (or single string) of allowed roles/departments.
 * Returns `hasAccess` – a reactive boolean indicating if the current user matches.
 *
 * Matching is case-insensitive and supports partial matching:
 *   - Checks user role against each allowed value
 *   - Checks user department against each allowed value
 *
 * @example
 * const { hasAccess } = useRoleAccess(['chairman', 'director']);
 * if (!hasAccess.value) navigateTo('/dashboard');
 *
 * @example
 * const { hasAccess } = useRoleAccess('chairman');
 */
export function useRoleAccess(allowedRoles: string | string[]) {
  const user = useUser();

  const normalizedAllowed = computed(() => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.map((r) => r.toLowerCase().trim());
  });

  const userRole = computed(() => user.value?.role?.toLowerCase() || "");
  const userDepartment = computed(
    () => user.value?.department?.toLowerCase() || "",
  );

  const hasAccess = computed(() => {
    if (!user.value) return false;
    if (normalizedAllowed.value.length === 0) return true;

    return normalizedAllowed.value.some(
      (allowed) =>
        userRole.value === allowed ||
        userRole.value.includes(allowed) ||
        userDepartment.value.includes(allowed),
    );
  });

  return {
    hasAccess,
    userRole,
    userDepartment,
  };
}
