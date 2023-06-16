
import type { Config, Msg, Store, StateItem, Folder, Language, Template } from '../index';
import * as vscode from 'vscode';
import * as utils from '../utils';
import * as constant from '../constant';





// const myValidateDecorator = (...params: any[]) => {
//   return (...ctx: any[]) => {
//     const [,,descriptor] = ctx;
//     const methods = descriptor.value;
//     descriptor.value = async function(...arg: any[]) {
//       if(!this.config){
//         return {
//           status:  false,
//           msg: ''
//         };
//       }
//       const a = methods();
//       // console.log(a, 1212);
//     };
//   };
// }

interface ConfigUri extends Omit<Config, 'savePath'>{
  savePathUri: vscode.Uri;
}

export class LocalConfig{
  private static instance: LocalConfig;
  private config: ConfigUri | undefined;
  private stores: Store[];
  private constructor(){
    this.config = undefined;
    this.stores = [];
  }
  static getInstance():LocalConfig{
    if(!LocalConfig.instance){
      LocalConfig.instance = new LocalConfig();
    }
    return LocalConfig.instance;
  }

  get _stores () {
    return this.stores;
  }
  
  validate2():Msg{
    if (!this.config) {
      vscode.commands.executeCommand('setContext', 'snippet.setSaveDirectory', true);
      return utils.generateMsg(false, constant.NOT_FOUND_CONFIG);
    }
    if (!this.config.stores) {
      vscode.commands.executeCommand('setContext', 'snippet.setSaveDirectory', true);
      return utils.generateMsg(false, constant.NOT_FOUND_CONFIG_STORE_MAP);
    }
    if (!this.config.savePathUri) {
      vscode.commands.executeCommand('setContext', 'snippet.setSaveDirectory', true);
      return utils.generateMsg(false, constant.NOT_FOUND_CONFIG_SAVE_PATH);
    }
    vscode.commands.executeCommand('setContext', 'snippet.setSaveDirectory', false);
    return utils.generateMsg(true, constant.VERIFICATION_PASSED);
  }

  
  async validate():Promise<Msg>{
    const config = await vscode.workspace.getConfiguration().get('snippet.config') as Record<string, string>;
    if (Object.keys(config).length === 0) {
      vscode.commands.executeCommand('setContext', 'snippet.setSaveDirectory', true);
      return utils.generateMsg(false, constant.NOT_FOUND_CONFIG);
    }
    if (!config.stores) {
      vscode.commands.executeCommand('setContext', 'snippet.setSaveDirectory', true);
      return utils.generateMsg(false, constant.NOT_FOUND_CONFIG_STORE_MAP);
    }
    if (!config.savePath) {
      vscode.commands.executeCommand('setContext', 'snippet.setSaveDirectory', true);
      return utils.generateMsg(false, constant.NOT_FOUND_CONFIG_SAVE_PATH);
    }
    vscode.commands.executeCommand('setContext', 'snippet.setSaveDirectory', false);
    return utils.generateMsg(true, constant.VERIFICATION_PASSED);
  }

  async load():Promise<Msg>{
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const config = await vscode.workspace.getConfiguration().get('snippet.config') as Config;
    vscode.commands.executeCommand('setContext', 'snippet.setSaveDirectory', false);
    vscode.commands.executeCommand('setContext', 'snippet.load', true);
    this.config = {
      stores: config.stores,
      savePathUri: vscode.Uri.file(config.savePath)
    };
    const savePath = vscode.Uri.file(config.savePath);
    for(const v of config.stores){
      const filePath = vscode.Uri.joinPath(savePath, v, `${v}.json`);
      const document = await vscode.workspace.openTextDocument(filePath);
      const store = await JSON.parse(document.getText()) as Store | undefined;
      if (store) {
        this.stores.push(store);
      }
    }
    this.stores.length === 0 && vscode.commands.executeCommand('setContext', 'snippet.isEmpty', true);
    this.stores.length > 0 && vscode.commands.executeCommand('setContext', 'snippet.isEmpty', false);
    return utils.generateMsg(true, constant.SUCCESSFULLY_LOAD);
  }

  async createSaveDirectory (path: vscode.Uri): Promise<Msg> {
    this.stores = [];
    const config: Config = {
      savePath: path.fsPath,
      stores: []
    };
    const configUri: ConfigUri = {
      savePathUri: vscode.Uri.file(path.fsPath),
      stores: []
    };
    this.config = configUri;
    await vscode.workspace.getConfiguration().update('snippet.config', config, true);
    return utils.generateMsg(true, constant.SUCCESSFULLY_CREATED_SAVE_DIRECTORY);
  }

  async changeSaveDirectory (path: vscode.Uri): Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    await utils.copyToTarget(this.config!.savePathUri, path);
    this.config!.savePathUri = path;
    const config:Config = {
      savePath: this.config!.savePathUri.fsPath,
      stores: this.config!.stores
    };
    await vscode.workspace.getConfiguration().update('snippet.config', config, true);
    return utils.generateMsg(true, constant.SUCCESSFULLY_CHANGED_SAVE_DIRECTORY);
  }


  private async saveFile (ids?: string[]): Promise<boolean> {
    ids = ids ? ids : this.config!.stores;
    for(const v of ids){
      const store = this.stores.find(el => el.id === v);
      if(store){
        const temp = JSON.stringify(store);
        const storeBuffer = Buffer.from(temp);
        const pathUri = vscode.Uri.joinPath(this.config!.savePathUri, v, `${v}.json`);
        await vscode.workspace.fs.writeFile(pathUri, storeBuffer);
      }
    }
    return true;
  }

  private async updateConfig (): Promise<Msg>{
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const config:Config = {
      savePath: this.config!.savePathUri.fsPath,
      stores: this.config!.stores
    };
    await vscode.workspace.getConfiguration().update('snippet.config', config, true);
    return utils.generateMsg(true, constant.VERIFICATION_UPDATED_CONFIG);
  }
  
  removeConfig (){
    vscode.workspace.getConfiguration().update('snippet.config', void 0);
  }

  async removeItem (storeId: string, itemId: string, needSave?: boolean): Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const store = this.stores.find(v => v.id === storeId);
    if(!store){
      return utils.generateMsg(false, constant.NOT_FOUND_STORE);
    }
    const idx = store.state.findIndex(v => v.id === itemId);
    if(idx<0){
      return utils.generateMsg(false, constant.NOT_FOUND_ITEM);
    }
    store.state.splice(idx, 1);
    needSave && await this.saveFile([storeId]);
    return utils.generateMsg(true, constant.SUCCESSFULLY_REMOVED_ITEM);
  }

  async addItem (storeId: string, title: string, folderId: string, language: Language): Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const id = utils.getId();
    const activeTextEditor = vscode.window.activeTextEditor;
    const selections = activeTextEditor?.selections ?? [];
    const snippet: string = selections.reduce((t, c) => {
      const currentText = activeTextEditor?.document.getText(c) ?? '';
      t += `${currentText}\n`;
      return t;
    }, '');
    const item:StateItem = {
      title,
      snippet: snippet,
      id,
      language,
      folderId
    };
    const store = this.stores.find(v => v.id === storeId);
    if(!store){
      return utils.generateMsg(false, constant.NOT_FOUND_STORE);
    }
    store.state.push(item);
    await this.saveFile([storeId]);
    return utils.generateMsg(true, constant.SUCCESSFULLY_REMOVED_ITEM, item);

  }

 

  async insertSnippet (storeId: string, id: string): Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const store = this.stores.find(v => v.id === storeId);
    if(!store){
      return utils.generateMsg(false, constant.NOT_FOUND_STORE);
    }
    const snippet = store.state.find(v => v.id === id);
    const insertSnippet = utils.REG_MAP_STRING.reduce((t, c) => {
      const [reg , target] = c;
      return t.replaceAll(reg, target);
    }, snippet?.snippet ?? '');
    vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(insertSnippet));
    return utils.generateMsg(true, constant.SUCCESSFULLY_INSERT);
  }



  async importStore (source: vscode.Uri): Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const stat = await vscode.workspace.fs.stat(source);
    if(stat.type !== 2){
      return utils.generateMsg(false, '不是文件夹');
    }

    const sourceParent = vscode.Uri.joinPath(source, '../');
    const [[name]] = await vscode.workspace.fs.readDirectory(sourceParent);
    if(this.config!.stores.includes(name)){
      return utils.generateMsg(false, '存在同名仓库！');
    }
    const target = vscode.Uri.joinPath(this.config!.savePathUri, name);
    await utils.copyToTarget(source, target);

    const filePath = vscode.Uri.joinPath(target, `${name}.json`);
    const document = await vscode.workspace.openTextDocument(filePath);
    const store = await JSON.parse(document.getText()) as Store;
    this.stores.push(store);
    this.config!.stores.push(store.id);
    await this.updateConfig();
    await this.saveFile([store.id]);
    return utils.generateMsg(true, constant.SUCCESSFULLY_IMPORT);
  }

  async exportStore (path: vscode.Uri, id: string): Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    
    const newDirectory = vscode.Uri.joinPath(path, `export-${Date.now()}`, id);
    await vscode.workspace.fs.createDirectory(newDirectory);
    const store = this.stores.find(v => v.id === id);
    if(!store){
      return utils.generateMsg(false, constant.NOT_FOUND_STORE);
    }
    const _path = vscode.Uri.joinPath(this.config!.savePathUri, id);
    await utils.copyToTarget(_path, newDirectory);
    return utils.generateMsg(true, constant.SUCCESSFULLY_EXPORT);
  }

  async removeStore(id: string): Promise<Msg>{
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const idx = this.stores.findIndex(v => v.id === id);
    if(idx > -1){
      this.stores.splice(idx, 1);
      this.config!.stores = this.config!.stores.filter(v => v !== id);
      const storePath = vscode.Uri.joinPath(this.config!.savePathUri, id);
      await this.updateConfig();
      await vscode.workspace.fs.delete(storePath, { recursive: true, useTrash: true });
    }
    return utils.generateMsg(true, constant.SUCCESSFULLY_REMOVED_STORE);
  }

  async createStore (name: string): Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const id = utils.getId();
    this.config!.stores.push(id);
    this.stores.push({
      id,
      name,
      state: [],
      folders: [],
      templates: []
    });
    await this.updateConfig();
    await this.saveFile([id]);
    return utils.generateMsg(true, constant.SUCCESSFULLY_CREATED_STORE);
  }


  async addFolder (storeId: string, label: string, parentId: string, canRemove: boolean = true, virtually: boolean = false): Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const store = this.stores.find(v => v.id === storeId);
    if(!store){
      return utils.generateMsg(false, constant.NOT_FOUND_STORE);
    }
    const id = utils.getId();
    const folder: Folder = { id, parentId, label, canRemove, virtually };
    store.folders.push(folder);
    await this.saveFile([storeId]);
    return utils.generateMsg(true, constant.SUCCESSFULLY_ADD_FOLDER);
  }

  async removeFolder (storeId: string, id: string): Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const store = this.stores.find(v => v.id === storeId);
    if(!store){
      return utils.generateMsg(false, constant.NOT_FOUND_STORE);
    }
    const map:Record<string, any> = {};
    store.folders.forEach(v => {
      map[v.parentId] = v;
    });
    const delIds:Set<string> = new Set([id]);
    function getChilds(arr: Folder[], parentId: string){
      if(!map[parentId]){
        return;
      }
      arr.forEach(v => {
        if(v.parentId === parentId){
          delIds.add(v.id);
          getChilds(arr, v.id);
        }
      });
    }
    getChilds(store.folders, id);
    const folders = store.folders.filter(v => !delIds.has(v.id));
    const state = store.state.filter(v => !delIds.has(v.folderId));
    const templates = store.templates.filter(v => !delIds.has(v.parentId));
    const delTemplates = store.templates.filter(v => delIds.has(v.parentId));
    for(const temp of delTemplates){
      await this.removeTemplate(storeId, temp.id, false);
    }
    store.folders = folders;
    store.state = state;
    store.templates = templates;
    await this.saveFile([storeId]);
    return utils.generateMsg(true, constant.SUCCESSFULLY_REMOVED_FOLDER);
  }


  async saveTemplate (storeId: string, path: vscode.Uri, name: string, parentId: string, type: 'file' | 'folder', description: string): Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const store = this.stores.find(v => v.id === storeId);
    if(!store){
      return utils.generateMsg(false, constant.NOT_FOUND_STORE);
    }
    const id = utils.getId();
    const template:Template = {
      id,
      parentId,
      type,
      description,
      name,
      storeId
    };
    const res = await utils.copyToTarget(path, vscode.Uri.joinPath(this.config!.savePathUri, storeId, id));
    if(!res.status){
      return res;
    }
    store.templates.push(template);
    await this.saveFile([storeId]);
    return utils.generateMsg(true, constant.SUCCESSFULLY_ADD_FOLDER);
  }

  async removeTemplate (storeId: string, id: string, needSave?: boolean):Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const store = this.stores.find(v => v.id === storeId);
    if(!store){
      return utils.generateMsg(false, constant.NOT_FOUND_STORE);
    }
    const idx = store.templates.findIndex(v => v.id === id);
    if(idx<0){
      return utils.generateMsg(false, constant.NOT_FOUND_TEMPLATE);
    }
    const filePath = vscode.Uri.joinPath(this.config!.savePathUri, storeId, id);
    await vscode.workspace.fs.delete(filePath, { recursive: true, useTrash: true });
    store.templates.splice(idx, 1);
    needSave && await this.saveFile([storeId]);
    return utils.generateMsg(true, constant.SUCCESSFULLY_REMOVED_TEMPLATE);
  }

  async insertTemplate (storeId: string, id: string, target: vscode.Uri):Promise<Msg> {
    const msg = await this.validate();
    if(!msg.status){
      return msg;
    }
    const store = this.stores.find(v => v.id === storeId);
    if(!store){
      return utils.generateMsg(false, constant.NOT_FOUND_STORE);
    }
    const source = vscode.Uri.joinPath(this.config!.savePathUri, storeId, id);
    await utils.copyToTarget(source, target);
    return utils.generateMsg(true, constant.SUCCESSFULLY_COPY);
  }
}

// export class Store{
//   private static instance: Store | undefined;
//   constructor(){
//     Store.instance = void 0;
//   }
//   static getInstance(){
//     if(!Store.instance){
//       Store.instance = new Store();
//     }
//     return Store.instance;
//   }
// }


