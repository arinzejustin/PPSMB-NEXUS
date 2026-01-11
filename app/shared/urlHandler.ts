export const openUrl = async (url: string, title?: string) => {
  let iconOrigin: string | undefined = window.location.origin;

  if (/^http?:\/\//i.test(url)) {
    try {
      iconOrigin = new URL(url).origin;
    } catch {
      iconOrigin = undefined;
    }
  }

  if (window.electronAPI) {
    await window.electronAPI.openModal(url, {
      maxWidth: 1000,
      maxHeight: 700,
      minWidth: 450,
      minHeight: 500,
      title: title ?? "",
      icon: iconOrigin ? `${iconOrigin}/favicon.ico` : undefined,
    });
  } else {
    window.open(url, "_blank");
  }
};

export const openBrowser = async (url: string) => {
  if (window.electronAPI) {
    await window.electronAPI.openBrowser(url);
  }
};
