import calibration from './readout-calibration.json' with {type:'json'};
const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
// Learned external readout; no environment state, target position or behavior timer is accepted.
export function decodeBody(readouts) {
  const features=calibration.keys.map(key=>readouts[key]||0),channels={};
  calibration.keys.forEach((key,i)=>{
    channels[key]=clamp(calibration.decoder[i].reduce((sum,w,j)=>sum+w*features[j],0));
  });
  const l=channels.lightLeft,r=channels.lightRight,ol=channels.odorLeft,or=channels.odorRight;
  const threatDrive=channels.danger,feeding=channels.sugar,odorDrive=(ol+or)*.5;
  const leftWing=clamp(.7*l+.22*ol+.4*threatDrive-.6*feeding);
  const rightWing=clamp(.7*r+.22*or+.4*threatDrive-.6*feeding);
  const thrust=(leftWing+rightWing)*.5;
  return {channels,leftWing,rightWing,thrust,threatDrive,odorDrive,
    turn:clamp((rightWing-leftWing)*8,-5,5),
    targetSpeed:Math.min(.85+threatDrive*.35,thrust*1.2)};
}
