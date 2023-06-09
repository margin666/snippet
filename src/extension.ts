
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
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: true,
			defaultUri: vscode.Uri.file("/D:/"),
			openLabel: '确认'
		});
		if(!msg){
			return;
		}
		const res = await storeInstance.importStore(msg[0]);
		res.status && treeView?.refrech();
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



	vscode.commands.registerCommand('snippet.addSnippet', async (language: Language) => {
		const stores = storeInstance._stores;
		if(!stores){
			return;
		}
		const storeList = stores.map(v => `${v.name}(${v.id})`);
		const selectStore = await vscode.window.showQuickPick(storeList, {
			title: `请选择仓库`,
			canPickMany: false,
			ignoreFocusOut: false,
			placeHolder: '搜索...'
		});
		if(!selectStore){
			return ;
		}
		const storeId = selectStore.match(/(?<=.*\()[^\(]*(?=\)$)/)![0];
		const store = stores.find(v => v.id === storeId);
		if(!store){
			return;
		}
		const folders = store.folders.filter(v => v.parentId === storeId).map(v => `${v.label}(${v.id})`);
		async function fn(currentFolderId: string, list: string[], cb:(currentFolderId: string, folder:string) => {status: boolean; list: string[]; currentFolder: string;}):Promise<any>{
			const temp = [`当前文件夹(${currentFolderId})`, ...list];
			const folder = await vscode.window.showQuickPick(temp, {
				title: `请选择文件夹`,
				canPickMany: false,
				ignoreFocusOut: false,
				placeHolder: '搜索...'
			});
			if(!folder){
				return false;
			}
			const res = cb(currentFolderId,folder);
			if(res.status){
				return fn(res.currentFolder, res.list, cb);
			}else{
				return folder;
			}
		}
		const result = await fn(storeId, folders, (currentFolderId, selectLabel) => {
			const arr = selectLabel.match(/(?<=.*\()[^\(]*(?=\)$)/);
			if(!arr){
				return {
					status: false,
					list: [],
					currentFolder: selectLabel
				};
			}
			const id = arr[0];
			if(currentFolderId === id){
				return {
					status: false,
					list: [],
					currentFolder: id
				};
			}
			const list = store.folders.filter(v => v.parentId === id);
			const listLabel = list.map(v => `${v.label}(${v.id})`);
			return {
				status: list.length > 0,
				list: listLabel,
				currentFolder: id
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
		const folderId = result.match(/(?<=.*\()[^\(]*(?=\)$)/)![0];
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
}

export function deactivate() {
	const storeInstance = LocalConfig.getInstance();
	storeInstance.removeConfig();
	vscode.window.showInformationMessage(`配置项已删除,存储数据的json文件请自行删除!`);
}
