

/**
 * 树视图Type
 */
export type TreeNodeItemType = 'folder' | 'item' | 'store' | 'template';

/**
 * 保存的文本语言类型
 */
export type Language = 'javascript' | 'html' | 'sql' | 'text';

/**
 * 单个文件夹
 */
interface Folder{
  id: string;
  parentId: string;
  label: string;
  canRemove: boolean;
  virtually: boolean;
}

interface Template{
  id: string;
  name: string;
  description?: string;
  parentId: string;
  storeId: string;
  type: 'file' | 'folder';
}

/**
 * 单条数据
 */
interface StateItem{
  id: string;
  folderId: string;
  title: string;
  snippet: string;
  language: Language;
}

/**
 * 单个json文件内容
 */
export interface Store{
  name: string;
  id: string;
  state: StateItem[];
  folders: Folder[];
  templates: Template[];
}

/**
 * 本地配置文件
 */
export interface Config{
  savePath: string;
  stores: string[];
}

/**
 * 方法执行结果提示
 */
export interface Msg{
  status: boolean;
  msg: string;
  [key: string]: any;
}