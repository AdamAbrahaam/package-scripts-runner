import * as shared from "./shared";

const runWithFolders = async () => {
  const workspaceDetails = await shared.getWorkspaceDetails();
  if (!workspaceDetails) {
    return;
  }

  const { rootName, packageJsonScriptsMap } = workspaceDetails;

  const selectedFolder = await shared.promptFolderSelection(packageJsonScriptsMap, rootName);
  if (!selectedFolder) {
    return;
  }

  const { scripts, packageManager } = shared.getFolderData(packageJsonScriptsMap, selectedFolder.label);
  if (!scripts || scripts.length === 0 || !packageManager) {
    return;
  }

  const parsedScripts = scripts.map((script) => ({ name: script }));
  const script = await shared.promptScriptSelection(parsedScripts);
  if (!script) {
    return;
  }

  shared.runScript(rootName, selectedFolder.label, script.label, packageManager);
};

export { runWithFolders };

