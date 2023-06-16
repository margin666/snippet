
import * as vscode from 'vscode';
import { join } from 'path';
import { LocalConfig } from './store/Store';
import { DepNodeProvide } from './tree-view/DepNodeProvide';
import { TreeItemNode } from './tree-view/TreeItemNode';
import type { Language } from '.';

export async function activate(context: vscode.ExtensionContext) {
	const storeInstance = LocalConfig.getInstance();
	await storeInstance.load();
	let treeView:DepNodeProvide | null = null;
	if(storeInstance._stores){
		treeView = new DepNodeProvide(storeInstance._stores);
		vscode.window.registerTreeDataProvider('treeView', treeView);
	}

	vscode.commands.registerCommand('snippet.importStore', async () => {
		const msg = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: true,
			defaultUri: vscode.Uri.file("/D:/"),
			openLabel: '确认'
		});
		if(!msg){
			return;
		}
		const res = await storeInstance.importStore(msg[0]);
		res.status && treeView?.refrech();
		!res.status && vscode.window.showWarningMessage(res.msg);
		
	});
	vscode.commands.registerCommand('snippet.exportStore', async data => {
		const msg = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: true,
			defaultUri: vscode.Uri.file("/D:/"),
			openLabel: '确认'
		});
		if(!msg){
			return;
		}
		const res = await storeInstance.exportStore(msg[0], data.storeId);
		if(res.status){
			treeView?.refrech();
		}
	});
	vscode.commands.registerCommand('snippet.removeStore', async (data: TreeItemNode) => {
		const result = await vscode.window.showWarningMessage<string>(`确认删除仓库【${data.label}】？`, '确认');
		if(!result){
			return;
		}
		const res = await storeInstance.removeStore(data.storeId);
		res.status && treeView?.refrech();
		// const msg = await vscode.window.showInputBox({
		// 	prompt: '请输入store名称确认删除',
		// 	title: data.label,
		// 	validateInput: (val) => {
		// 		if(val === data.label){
		// 			return null;
		// 		}
		// 		return '名称不正确';
		// 	}
		});
	vscode.commands.registerCommand('snippet.createStore', async () => {
		const name = await vscode.window.showInputBox({
			placeHolder: '请输入仓库名称',
			ignoreFocusOut: true
		});
		if(!name){
			return;
		}
		const res = await storeInstance.createStore(name);
		if(res.status){
			treeView?.refrech();
		}
	});

	vscode.commands.registerCommand('snippet.createFolder', async (data:TreeItemNode) => {
		const name = await vscode.window.showInputBox({
			placeHolder: '请输入文件夹名称',
			ignoreFocusOut: true
		});
		if(!name){
			return;
		}
		const res = await storeInstance.addFolder(data.storeId, name, data.id);
		res.status && treeView?.refrech();
	});
	vscode.commands.registerCommand('snippet.removeFolder', async (data: TreeItemNode) => {
		const result = await vscode.window.showWarningMessage<string>(`确认删除文件夹【${data.label}】？`, '确认');
		if(!result){
			return;
		}
		const res = await storeInstance.removeFolder(data.storeId, data.id);
		res.status && treeView?.refrech();
	});

	vscode.commands.registerCommand('snippet.saveAsHTML', () => {
		vscode.commands.executeCommand('snippet.addSnippet', 'html');
	});
	vscode.commands.registerCommand('snippet.saveAsJavaScript', () => {
		vscode.commands.executeCommand('snippet.addSnippet', 'javascript');
	});
	vscode.commands.registerCommand('snippet.saveAsJSON', () => {
		vscode.commands.executeCommand('snippet.addSnippet', 'json');
	});
	vscode.commands.registerCommand('snippet.saveAsText', () => {
		vscode.commands.executeCommand('snippet.addSnippet', 'text');
	});
	vscode.commands.registerCommand('snippet.saveAsCSS', () => {
		vscode.commands.executeCommand('snippet.addSnippet', 'css');
	});
	vscode.commands.registerCommand('snippet.saveAsSQL', () => {
		vscode.commands.executeCommand('snippet.addSnippet', 'sql');
	});



	vscode.commands.registerCommand('snippet.addSnippet', async (language: Language) => {
		const stores = storeInstance._stores;
		if(!stores){
			return;
		}
		const storeList = stores.map(v => {
			return {
				label: v.name,
				description: v.id
			};
		});
		const selectStore = await vscode.window.showQuickPick(storeList, {
			title: `请选择仓库`,
			canPickMany: false,
			ignoreFocusOut: false,
			placeHolder: '搜索仓库...'
		});
		if(!selectStore){
			return ;
		}
		const storeId = selectStore.description;
		const store = stores.find(v => v.id === storeId);
		if(!store){
			return;
		}
		const folders = store.folders.filter(v => v.parentId === storeId).map(v => {
			return {
				label: v.label,
				description: v.id
			};
		});
		async function fn(currentFolderId: string, list:vscode.QuickPickItem[], cb:(currentFolderId: string, folder: vscode.QuickPickItem) => {status: boolean; list: vscode.QuickPickItem[]; currentFolder: string;}):Promise<any>{
			const temp = [{
				label: '当前文件夹',
				description: currentFolderId
			}, ...list];
			const selectFolder = await vscode.window.showQuickPick(temp, {
				title: `请选择文件夹`,
				canPickMany: false,
				ignoreFocusOut: false,
				placeHolder: '搜索文件夹...'
			});
			if(!selectFolder){
				return false;
			}
			const res = cb(currentFolderId, selectFolder);
			if(res.status){
				return fn(res.currentFolder, res.list, cb);
			}else{
				return selectFolder;
			}
		}
		const result = await fn(storeId, folders, (currentFolderId, selectFolder) => {
			if(!selectFolder){
				return {
					status: false,
					list: [],
					currentFolder: currentFolderId
				};
			}
			if(currentFolderId === selectFolder.description){
				return {
					status: false,
					list: [],
					currentFolder: selectFolder.description
				};
			}
			const list = store.folders.filter(v => v.parentId === selectFolder.description);
			const listLabel:vscode.QuickPickItem[] = list.map(v => {
				return {
					label: v.label,
					description: v.id
				};
			});
			return {
				status: list.length > 0,
				list: listLabel,
				currentFolder: selectFolder.description!
			};
		});
		if(!result){
			return;
		}
		const name = await vscode.window.showInputBox({
			placeHolder: '起个名字吧',
			ignoreFocusOut: true
		});
		if(!name){
			return;
		}
		const folderId = result.description;
		const res = await storeInstance.addItem(storeId, name, folderId, language);
		res.status && treeView?.refrech();
	});
	vscode.commands.registerCommand('snippet.removeItem', async (data: TreeItemNode) => {
		const res = await storeInstance.removeItem(data.storeId, data.id);
		res.status && treeView?.refrech();
	});

	vscode.commands.registerCommand('snippet.createSaveDirectory', async () => {
		const msg = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			defaultUri: vscode.Uri.file("/D:/"),
			openLabel: '确认'
		});
		if(!msg){
			return;
		}
		const filePath = join(msg[0].fsPath);
		const res = await storeInstance.createSaveDirectory(vscode.Uri.file(filePath));
		if(res.status){
			await storeInstance.load();
			treeView = new DepNodeProvide(storeInstance._stores);
			vscode.window.registerTreeDataProvider('treeView', treeView);
			treeView.refrech();
		}
	});
	vscode.commands.registerCommand('snippet.insert', async (data: TreeItemNode) => {
		const res = await storeInstance.insertSnippet(data.storeId, data.id);
		res.status && treeView?.refrech();
	});
	vscode.commands.registerCommand('snippet.refresh', data => {
		treeView?.refrech();
	});
	
	vscode.commands.registerCommand('snippet.changeSaveDirectory', async () => {
		const msg = await vscode.window.showOpenDialog({
			title: '更改保存位置',
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			defaultUri: vscode.Uri.file("/D:/"),
			openLabel: '确认'
		});
		if(!msg){
			return;
		}
		const res = await storeInstance.changeSaveDirectory(msg[0]);
		if(res.status){
			vscode.window.showInformationMessage(res.msg);
		}
	});

	vscode.commands.registerCommand('snippet.saveTemplate', async (data:vscode.Uri) => {
		
		const stat = await vscode.workspace.fs.stat(data);
		const type = stat.type === 1 ? 'file' : stat.type === 2 ? 'folder' : stat.type;
		if(typeof type === 'number'){
			vscode.window.showErrorMessage('选中项非文件/文件夹。');
			return;
		}
		const stores = storeInstance._stores;
		if(!stores){
			return;
		}
		const storeList = stores.map(v => {
			return {
				label: v.name,
				description: v.id
			};
		});
		const selectStore = await vscode.window.showQuickPick(storeList, {
			title: `请选择仓库`,
			canPickMany: false,
			ignoreFocusOut: false,
			placeHolder: '搜索仓库...'
		});
		if(!selectStore){
			return ;
		}
		const storeId = selectStore.description;
		const store = stores.find(v => v.id === storeId);
		if(!store){
			return;
		}
		const folders = store.folders.filter(v => v.parentId === storeId).map(v => {
			return {
				label: v.label,
				description: v.id
			};
		});
		async function fn(currentFolderId: string, list:vscode.QuickPickItem[], cb:(currentFolderId: string, folder:vscode.QuickPickItem) => {status: boolean; list:vscode.QuickPickItem[]; currentFolder: string;}):Promise<any>{
			const temp = [{
				label: '当前文件夹',
				description: currentFolderId
			}, ...list];
			const selectFolder = await vscode.window.showQuickPick(temp, {
				title: `请选择文件夹`,
				canPickMany: false,
				ignoreFocusOut: false,
				placeHolder: '搜索文件夹...'
			});
			if(!selectFolder){
				return false;
			}
			const res = cb(currentFolderId,selectFolder);
			if(res.status){
				return fn(res.currentFolder, res.list, cb);
			}else{
				return selectFolder;
			}
		}
		const result = await fn(storeId, folders, (currentFolderId, selectFolder) => {
			if(!selectFolder){
				return {
					status: false,
					list: [],
					currentFolder: currentFolderId
				};
			}
			if(currentFolderId === selectFolder.description){
				return {
					status: false,
					list: [],
					currentFolder: selectFolder.description
				};
			}
			const list = store.folders.filter(v => v.parentId === selectFolder.description);
			const listLabel:vscode.QuickPickItem[] = list.map(v => {
				return {
					label: v.label,
					description: v.id
				};
			});
			return {
				status: list.length > 0,
				list: listLabel,
				currentFolder: selectFolder.description!
			};
		});
		if(!result){
			return;
		}

		const name = await vscode.window.showInputBox({
			placeHolder: '起个名字吧',
			ignoreFocusOut: true
		});
		if(!name){
			return;
		}
		const folderId = result.description;
		const res = await storeInstance.saveTemplate(storeId, data, name, folderId, type, 'desc');
		res.status && treeView?.refrech();

	});
	vscode.commands.registerCommand('snippet.removeTemplate', async (data: TreeItemNode) => {
		const res = await storeInstance.removeTemplate(data.storeId, data.id, true);
		res.status && treeView?.refrech();
	});

	vscode.commands.registerCommand('snippet.generateTemplate', async (data: vscode.Uri) => {
		const stores = storeInstance._stores;
		if(!stores){
			return;
		}
		const storeList:vscode.QuickPickItem[] = stores.map(v => {
			return {
				label: v.name,
				description: v.id
			};
		});
		const selectStore = await vscode.window.showQuickPick(storeList, {
			title: `请选择仓库`,
			canPickMany: false,
			ignoreFocusOut: false,
			placeHolder: '搜索仓库...'
		});
		if(!selectStore){
			return ;
		}
		const store = stores.find(v => v.id === selectStore.description);
		if(!store){
			return;
		}
		const templates:vscode.QuickPickItem[] = store.templates.map(v => {
			return {
				label: v.name,
				description: v.id
			};
		});
		const template = await vscode.window.showQuickPick(templates, {
			title: `请选择模板`,
			canPickMany: false,
			ignoreFocusOut: false,
			placeHolder: '搜索模板...'
		});
		if(!template){
			return false;
		}
		await storeInstance.insertTemplate(selectStore.description!, template.description!, data);
	});

	

}

export function deactivate() {}
