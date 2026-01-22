import { ref } from "vue";

const EXCLUDED_ROUTES = new Set(["/login", "/pin"]);

const backStack = ref<string[]>([]);
const forwardStack = ref<string[]>([]);
const currentPath = ref<string | null>(null);

function shouldTrack(path?: string) {
  return !!path && !EXCLUDED_ROUTES.has(path);
}

export function useNavigationHistory() {
  function recordNavigation(to?: string, from?: string) {
    if (!shouldTrack(to)) return;

    if (shouldTrack(from)) {
      backStack.value.push(from as string);
      forwardStack.value = [];
    }

    currentPath.value = to as string;
  }

  function popBack(current: string) {
    const previous = backStack.value.pop();
    if (!previous) return null;

    forwardStack.value.push(current);
    currentPath.value = previous;
    return previous;
  }

  function popForward(current: string) {
    const next = forwardStack.value.pop();
    if (!next) return null;

    backStack.value.push(current);
    currentPath.value = next;
    return next;
  }

  return {
    backStack,
    forwardStack,
    recordNavigation,
    popBack,
    popForward,
  };
}
