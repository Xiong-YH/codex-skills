(function(root){
  'use strict';
  const dimensionLabels={pixelScale:'颗粒',form:'形状',detail:'细节',palette:'色阶与配色',contour:'轮廓',lighting:'光影',projection:'投影'};
  const shared='人物、其他物种、背景和场景道具遵循同一有效画风，按最终占画尺寸检查。组件按自己的规范独立制作；字幕和标签独立，不烘焙进图。样板提供画法，不固定场所、故事或构图。';
  const branchContext={
    character:'补齐所选人物的身份参考、整体比例、完整姿态、景别、相机、主光、重心、接触与连续性；超粗像素按该画风的符号化比例例外执行。身份特征取自本次参考，不由画风指定姓名、发色或服装。',
    species:'补齐所选物种结构参考、自然或拟人程度、肢体数量、连接、支撑和操作方式；不同姿态保持同一结构，遮挡不等于改变数量，不把物种绑定为固定性格。超粗像素按其概括例外核对可辨关系。',
    background:'补齐场所、景别、相机、前中后景、主光、主体落点、动作区与字幕避让；纯背景不包含人物，完整环境延伸到画幅边缘。',
    prop:'补齐用途、视角、相对尺度、材料、承托或抓握点、状态与遮挡。'
  };
  function resolve(pack,catalogSha256,main,fragment=null){
    const find=id=>{const p=pack.profiles.find(p=>p.id===id);if(!p)throw new Error('Unknown art profile: '+id);return p;};
    find(main);const p=find(fragment||main);
    const dimensions=Object.entries(dimensionLabels).map(([key,label])=>label+'：'+p.dimensions[key]).join('；');
    const branches=Object.fromEntries(Object.entries(p.branches).map(([branch,requirements])=>[branch,{
      style:p.id,requirements,
      prompt:[p.common,dimensions,requirements,branchContext[branch],shared].join(' '),
      reference:p.reference[branch],
      referenceStatus:branch==='background'?(p.backgroundReferenceStatus||'historical_scene_crop_observation_only'):branch==='character'?p.characterReferenceStatus:'scene_crop_observation_only'
    }]));
    return {version:pack.version,catalogSha256,mainStyle:main,fragmentStyle:fragment,effectiveStyle:p.id,effectiveName:p.name,common:p.common,dimensions:p.dimensions,scope:pack.scope,excluded:pack.excluded,reference:p.reference,branches,shared};
  }
  const api={resolve,dimensionLabels};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PixelArtDirection=api;
})(typeof globalThis==='object'?globalThis:this);
