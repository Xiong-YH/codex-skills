import React from 'react';
import * as Remotion from 'remotion';
import {createSoftHighlight} from '../../../modules/text/soft-highlight.mjs';
import type {CardDef} from './types';
export const SoftHighlight=createSoftHighlight(React,Remotion);
export const softHighlightCard: CardDef = {
  id:'soft-highlight-caption', name:'柔边重音字幕', category:'工作台', timing:'realtime',
  durationInFrames:120, component:SoftHighlight as React.ComponentType<Record<string, unknown>>,
  accent:'#f7cf82', summary:'半透明柔边底板、暖金关键词及下划线；支持语义双行与延迟重音。',
  schema:[
    {type:'textarea',key:'text',label:'文案',default:'先保存一个版本，再继续修改。'},
    {type:'text',key:'keywords',label:'重点词（多个用 | 分隔）',default:'保存一个版本'},
    {type:'select',key:'emphasis',label:'强调等级',default:'underline',options:[{value:'none',label:'普通说明'},{value:'color',label:'重要提醒：变色'},{value:'underline',label:'关键结论：变色与下划线'}]},
    {type:'number',key:'emphasisAt',label:'重音延迟（秒）',default:0,min:0,max:30,step:.05},
    {type:'slider',key:'fontSize',label:'字号',default:34,min:24,max:52,step:1},
    {type:'color',key:'color',label:'正文颜色',default:'#f5f3ec'},
    {type:'color',key:'accent',label:'重点颜色',default:'#f7cf82'},
    {type:'slider',key:'plateOpacity',label:'底板不透明度',default:.65,min:0,max:1,step:.01},
    {type:'slider',key:'x',label:'横向位置',default:.5,min:.1,max:.9,step:.01},
    {type:'slider',key:'y',label:'纵向位置',default:.87,min:.15,max:.9,step:.01},
  ],
};
