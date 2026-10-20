// Test fixture: schema intentionally omits fixed selectors, as real manifests do.
const Shot = (props: Record<string, unknown>) => props.shotIndex;
const Caption = (props: Record<string, unknown>) => props.cueIndex;
const schema = [{type: 'textarea', key: 'heading', label: '文案', default: 'schema fallback'}];
export const WORKBENCH = {
  name: 'Library fixture', fps: 60, width: 1920, height: 1080, total: 900,
  shots: [0,1,2].map(index => ({id:`s${index+1}`,cardId:`s${index+1}`,from:index*300,duration:300,component:Shot,schema,
    props:{shotIndex:index,sourceUnitId:`s${index+1}`,heading:`Shot ${index+1}`}})),
  captions: [0,1,2].map(index => ({id:`c${index+1}`,cardId:`c${index+1}`,from:index*300,duration:300,component:Caption,schema,
    props:{cueIndex:index,motionIndex:index+10,heading:`Caption ${index+1}`}})),
};
