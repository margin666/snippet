
import type { Msg } from '.';
import * as vscode from 'vscode';
import * as constant from './constant';

/**
 * 生成随机id
 */
export function getId():string{
  return (Number(Math.random().toString().slice(2))+Date.now()).toString(36);
}


type Tump = [RegExp, string];
/**
 * 插入时对特殊字符进行转义
 */
export const REG_MAP_STRING:Tump[]= [
  [new RegExp(/\\\\/, 'g'), '\\\\\\\\'], // 替换双反斜杠
  [new RegExp(/\$/, 'g'), '\\$'], // 替换${符号
];


/**
 * 生成统一的执行结果信息
 * @param status 状态
 * @param msg 提示信息
 * @param arg 其他可选信息
 */
export function generateMsg(status: boolean, msg: string, ...arg: any[]):Msg{
  return {
    msg,
    status,
    ...arg
  };
}


/**
 * 将源文件夹里面的内容复制到目标文件夹
 */
export async function copyToTarget(source: vscode.Uri, target: vscode.Uri):Promise<Msg>{
  const stat = await vscode.workspace.fs.stat(source);
  if(stat.type === 1){
    const fileName = source.path.match(/(?<=\/)[^\/]*?$/)![0];
    await vscode.workspace.fs.copy(vscode.Uri.joinPath(source), vscode.Uri.joinPath(target, fileName));
  }
  if(stat.type === 2){
    const sources = await vscode.workspace.fs.readDirectory(source);
    for(const sou of sources){
      const [name] = sou;
      await vscode.workspace.fs.copy(vscode.Uri.joinPath(source, name), vscode.Uri.joinPath(target, name));
    }
  }
  return generateMsg(true, constant.SUCCESSFULLY_COPY);
}


