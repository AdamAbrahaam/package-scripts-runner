import * as shared from "./shared";

const CONFIG_SKIP_FOLDER_SELECTION = 'skipFolderSelection';

const runWithFolders = async () => {
  const workspaceDetails = await shared.getWorkspaceDetails();
  if (!workspaceDetails) { return; }

  const { rootName, packageJsonScriptsMap } = workspaceDetails;

  const scriptFolders = Array.from(packageJsonScriptsMap.keys());
  const skipFolderSelection = shared.getConfig().get<boolean>(CONFIG_SKIP_FOLDER_SELECTION) || false;

  const selectedFolder = await shared.promptFolderSelection(scriptFolders, rootName, skipFolderSelection);
  if (!selectedFolder || !selectedFolder.label) { return; }

  const { scripts, packageManager } = shared.getFolderData(packageJsonScriptsMap, selectedFolder.label);
  if (!scripts || scripts.length === 0 || !packageManager) { return; }

  const parsedScripts = scripts.map((script) => ({ name: script }));
  const script = await shared.promptScriptSelection(parsedScripts);
  if (!script) { return; }

  shared.runScript(rootName, selectedFolder.label, script.label, packageManager);
};

export { runWithFolders };

