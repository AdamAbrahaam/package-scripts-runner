import * as vscode from 'vscode';

enum PackageManager {
  NPM = 'npm',
  PNPM = 'pnpm',
  YARN = 'yarn'
}

enum LockFile {
  PNPM = 'pnpm-lock.yaml',
  YARN = 'yarn.lock'
}

type PackageJsonScriptsMap = Map<string, { scripts: readonly string[], packageManager: PackageManager }>;
type ParsedScript = { name: string, folder?: string, packageManager?: PackageManager };

const getWorkspaceDetails = async () => {
  const workspaceFolder = await getWorkspaceFolder();
  if (!workspaceFolder) {
    return null;
  }

  const rootName = workspaceFolder.name;
  const rootUri = workspaceFolder.uri;
  const packageJsonScriptsMap = await getPackageJsonScriptsMap(rootName, rootUri);

  return { rootName, packageJsonScriptsMap };
};

async function getWorkspaceFolder() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('Workspace folder not found');
    return;
  }

  if (workspaceFolders.length === 1) {
    return workspaceFolders[0];
  }

  const selectedFolder = await vscode.window.showQuickPick(workspaceFolders.map((f) => f.name));
  return workspaceFolders.find((f) => f.name === selectedFolder);
}

async function getPackageJsonScriptsMap(rootName: string, rootUri: vscode.Uri) {
  const packageJsonScriptsMap: PackageJsonScriptsMap = new Map();
  const folders = [rootName, ...await getSubFolders(rootUri)];

  for (const folder of folders) {
    const packageManager = await determinePackageManager(folder === rootName ? rootUri : vscode.Uri.joinPath(rootUri, folder));
    const packageJsonUri = vscode.Uri.joinPath(
      rootUri,
      folder === rootName ? 'package.json' : `${folder}/package.json`
    );

    const scripts = await getPackageJsonScripts(packageJsonUri);
    packageJsonScriptsMap.set(folder, { scripts, packageManager });
  }

  return packageJsonScriptsMap;
}

async function getPackageJsonScripts(packageJsonUri: vscode.Uri) {
  try {
    const packageJson = await vscode.workspace.fs.readFile(packageJsonUri);
    const packageJsonContent = new TextDecoder().decode(packageJson);
    const packageJsonObj = JSON.parse(packageJsonContent);
    return Object.keys(packageJsonObj.scripts || {}).sort();
  } catch {
    return [];
  }
}

async function getSubFolders(rootUri: vscode.Uri) {
  const ignoredFolders = vscode.workspace.getConfiguration('PackageScriptsRunner').get<string[]>('ignoredFolders') || [];
  const allFiles = await vscode.workspace.fs.readDirectory(rootUri);
  return allFiles
    .filter(([name, type]) => type === vscode.FileType.Directory && !ignoredFolders.includes(name))
    .map(([name]) => name)
    .sort();
}

async function promptFolderSelection(packageJsonScriptsMap: PackageJsonScriptsMap, rootName: string) {
  const scriptFolders = Array.from(packageJsonScriptsMap.keys());
  const scriptFoldersWithDescription = scriptFolders.map((folder) => ({
    label: folder,
    description: folder === rootName ? 'Root folder' : undefined,
  }));

  return await vscode.window.showQuickPick(scriptFoldersWithDescription, {
    placeHolder: 'Select a folder to view its scripts',
  });
}

async function promptScriptSelection(scripts: readonly ParsedScript[]) {
  const scriptsWithDescription = scripts.map((script) => ({
    label: script.name,
    description: script.folder,
    packageManager: script.packageManager,
  }));

  return await vscode.window.showQuickPick(scriptsWithDescription, {
    placeHolder: 'Select a script to run',
  });
}

function getFolderData(packageJsonScriptsMap: PackageJsonScriptsMap, selectedFolder: string) {
  return packageJsonScriptsMap.get(selectedFolder) || { scripts: [], packageManager: PackageManager.NPM };
}

function runScript(rootName: string, selectedFolder: string, selectedScript: string, packageManager: PackageManager) {
  const terminalName = `${selectedFolder} - ${selectedScript}`;

  // Dispose existing terminal if it exists
  vscode.window.terminals.find((t) => t.name === terminalName)?.dispose();

  const changeDir = selectedFolder === rootName ? '' : `cd ${selectedFolder} && `;
  const runScript = `${packageManager} run ${selectedScript}`;

  const newTerminal = vscode.window.createTerminal(terminalName);
  newTerminal.sendText(`${changeDir}${runScript}`);
  newTerminal.show();
}

async function determinePackageManager(folderUri: vscode.Uri): Promise<PackageManager> {
  const hasYarnLock = await fileExists(vscode.Uri.joinPath(folderUri, LockFile.YARN));
  if (hasYarnLock) { return PackageManager.YARN; }

  const hasPnpmLock = await fileExists(vscode.Uri.joinPath(folderUri, LockFile.PNPM));
  if (hasPnpmLock) { return PackageManager.PNPM; }

  return PackageManager.NPM;
}

async function fileExists(fileUri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(fileUri);
    return true;
  } catch (error) {
    return false;
  }
}

export type { ParsedScript };
export { 
  getWorkspaceDetails, 
  getWorkspaceFolder, 
  getPackageJsonScriptsMap, 
  getFolderData, 
  promptFolderSelection, 
  promptScriptSelection, 
  runScript
};

