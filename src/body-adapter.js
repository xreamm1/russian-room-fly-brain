const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
// Actual DNg02 spike rates. The force gain below is an explicit experimental proxy,
// not an identified VNC motor-neuron/muscle transformation or a takeoff reflex.
export function decodeBody(ratesHz) {
  const rate=key=>Math.max(0,Number.isFinite(ratesHz[key])?ratesHz[key]:0);
  const drive=hz=>hz/(hz+50);
  const leftWing=drive(rate('flightLeft')),rightWing=drive(rate('flightRight'));
  const thrust=(leftWing+rightWing)*.5;
  return {channels:{...ratesHz},leftWing,rightWing,thrust,legExtension:drive(rate('landing')),
    turn:clamp((rightWing-leftWing)*8,-5,5),
    targetSpeed:thrust*1.2};
}
