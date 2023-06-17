import * as vscode from 'vscode';
import type { TreeNodeItemType, Language } from '../index';




export class TreeItemNode extends vscode.TreeItem {
	public readonly iconPath: vscode.ThemeIcon | undefined;
	contextValue?: string | undefined;
	constructor(
		public readonly label: string,
		public readonly id: string,
		public readonly parentId: string,
		public readonly storeId: string,
		public type: TreeNodeItemType,
		private readonly snippet: string | null,
    public language: Language | null,
		public readonly collapsibleState?: vscode.TreeItemCollapsibleState,
	) {
		super(label);
		this.type = type;
		this.parentId = parentId;
		this.storeId = storeId;
		this.iconPath = undefined;
		this.language = language;
		this.snippet = snippet;
		// 提供给when使用
		this.contextValue = type;
		if(typeof this.snippet === 'string' && this.type === 'item' && typeof this.language === 'string'){
			const md = new vscode.MarkdownString();
			md.supportHtml = true;
			md.appendCodeblock(this.snippet, this.language);
			this.tooltip = md; 
		}

		if(typeof this.snippet === 'string' && this.type === 'template'){
			const md = new vscode.MarkdownString();
			md.supportHtml = true;
			md.appendText(this.snippet);
			this.tooltip = md; 
		}
	}

	private icon():vscode.ThemeIcon | undefined{
		switch(this.type){
			case 'item': {
				return void 0;
				// return new vscode.ThemeIcon('star-half', new vscode.ThemeColor('snippet.item'));
			}
			case 'folder': {
				return new vscode.ThemeIcon(this.collapsibleState === 1 ? 'folder': 'folder-opened', new vscode.ThemeColor('snippet.folder'));
			}
			case 'store': {
				return new vscode.ThemeIcon('inbox');
			}
		}
	}

	// command: vscode.Command | undefined = {
	// 	title: 'treeItemNodeClick',
	// 	command: 'snippet.itemClick',
	// 	arguments: [
	// 		this
	// 	]
	// };


}