import * as shared from "./shared";

const runWithoutFolders = async () => {
  const workspaceDetails = await shared.getWorkspaceDetails();
  if (!workspaceDetails) {
    return;
  }

  const { rootName, packageJsonScriptsMap } = workspaceDetails;

  let parsedScripts: shared.ParsedScript[] = [];
  for (const [folder, { scripts, packageManager }] of packageJsonScriptsMap.entries()) {
    parsedScripts = parsedScripts.concat(scripts.map(script => (
      { 
        name: script, 
        folder: folder === rootName ? `${folder} (root)` : folder, 
        packageManager 
      }
    )));
  }

  const script = await shared.promptScriptSelection(parsedScripts);
  if (!script || !script.description || !script.label || !script.packageManager) {
    return;
  }

  shared.runScript(rootName, script.description, script.label, script.packageManager);
};

export { runWithoutFolders };

