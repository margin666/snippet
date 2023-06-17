
import { TreeItemNode } from './TreeItemNode';
import * as vscode from 'vscode';
import { Store } from '../index';

export class DepNodeProvide implements vscode.TreeDataProvider<vscode.TreeItem>{
  stores: Store[];
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItemNode | undefined | null | void>;
  readonly onDidChangeTreeData: vscode.Event<TreeItemNode | undefined | null | void>;
  constructor(store: Store[]) {
    this.stores = store;
    this._onDidChangeTreeData = new vscode.EventEmitter<TreeItemNode | undefined | null | void>();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }
  getTreeItem (element: TreeItemNode): TreeItemNode | Thenable<TreeItemNode> {
    return element;
  }

  getChildren (element?: TreeItemNode | undefined): vscode.ProviderResult<TreeItemNode[]> {
    if (element) {
      const { type, id, storeId } = element;
      if (type === 'folder') {

        const store = this.stores.find(v => v.id === storeId);
        if (!store) {
          return [];
        }
        const treeItemNodes: TreeItemNode[] = [];
        const folders = store.folders.filter(v => v.parentId === id);
        folders.forEach(v => {
          treeItemNodes.push(new TreeItemNode(`📁${v.label}`, v.id, v.parentId, storeId, 'folder', null, null, 1));
        });
        const items = store.state.filter(v => v.folderId === id);
        items.forEach(v => {
          treeItemNodes.push(new TreeItemNode(`📝${v.title}`, v.id, v.folderId, storeId, 'item', v.snippet, v.language, 0));
        });
        const templates = store.templates.filter(v => v.parentId === id);
        templates.forEach(v => {
          treeItemNodes.push(new TreeItemNode(`🎬${v.name}`, v.id, v.parentId, storeId, 'template', null, null, 0));
        });
        return treeItemNodes;
      } else if (type === 'store') {
        const store = this.stores.find(v => v.id === storeId);
        if (!store) {
          return [];
        }
        const treeItemNodes: TreeItemNode[] = [];
        const folders = store.folders.filter(v => v.parentId === id);
        folders.forEach(v => {
          treeItemNodes.push(new TreeItemNode(`📁${v.label}`, v.id, v.parentId, storeId, 'folder', null, null, 1));
        });
        const items = store.state.filter(v => v.folderId === id);
        items.forEach(v => {
          treeItemNodes.push(new TreeItemNode(`📝${v.title}`, v.id, v.folderId, storeId, 'item', v.snippet, v.language, 0));
        });

        const templates = store.templates.filter(v => v.parentId === id);
        templates.forEach(v => {
          treeItemNodes.push(new TreeItemNode(`🎬${v.name}`, v.id, v.parentId, storeId, 'template', v.description, null, 0));
        });
        return treeItemNodes;

      } else {
        return [];
      }
    } else {
      const list = this.stores.map(v => {
        return new TreeItemNode(`🍒${v.name}`, v.id, '-1', v.id, 'store', null, null, 1);
      });
      return list;
    }
  }

  refrech () {
    this._onDidChangeTreeData.fire();
  }

}