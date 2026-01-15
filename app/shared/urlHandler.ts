const MODAL_SIZE = {
  width: 1000,
  height: 700,
  minWidth: 450,
  minHeight: 500,
};

export const openUrl = async (url: string, title?: string) => {
  let iconOrigin: string | undefined;

  try {
    iconOrigin = new URL(url, window.location.origin).origin;
  } catch {
    iconOrigin = undefined;
  }

  if (window.electronAPI) {
    await window.electronAPI.openModal(url, {
      width: MODAL_SIZE.width,
      height: MODAL_SIZE.height,
      minWidth: MODAL_SIZE.minWidth,
      minHeight: MODAL_SIZE.minHeight,
      title: title ?? "",
      icon: iconOrigin ? `${iconOrigin}/favicon.ico` : undefined,
    });
    return;
  }

  const dualScreenLeft =
    window.screenLeft !== undefined ? window.screenLeft : window.screenX;
  const dualScreenTop =
    window.screenTop !== undefined ? window.screenTop : window.screenY;

  const screenWidth = window.innerWidth || document.documentElement.clientWidth;
  const screenHeight =
    window.innerHeight || document.documentElement.clientHeight;

  const left = dualScreenLeft + (screenWidth - MODAL_SIZE.width) / 2;
  const top = dualScreenTop + (screenHeight - MODAL_SIZE.height) / 2;

  const features = [
    `width=${MODAL_SIZE.width}`,
    `height=${MODAL_SIZE.height}`,
    `left=${left}`,
    `top=${top}`,
    "resizable=yes",
    "scrollbars=yes",
    "noopener=yes",
  ].join(",");

  const popup = window.open(url, title ?? "_blank", features);

  if (!popup) {
    window.open(url, "_blank");
  }
};

export const openBrowser = async (url: string) => {
  if (window.electronAPI) {
    await window.electronAPI.openBrowser(url);
    return;
  }

  window.open(url, "_blank", "noopener");
};
