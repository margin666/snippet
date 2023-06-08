
import type { Msg } from '.';

export function getId(){
  return (Number(Math.random().toString().slice(2))+Date.now()).toString(36);
}


type Tump = [RegExp, string];
export const REG_MAP_STRING:Tump[]= [
  [new RegExp(/\\\\/, 'g'), '\\\\\\\\'], // 替换双反斜杠
  [new RegExp(/\$/, 'g'), '\\$'], // 替换${符号
];

export function generateMsg(status: boolean, msg: string, ...arg: any[]):Msg{
  return {
    msg,
    status,
    ...arg
  };
}


