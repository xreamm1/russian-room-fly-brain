const clamp=x=>Math.max(0,Math.min(1,x));
// Coarse, experimental encoders into identified cells; not the Flyvis retina model.
export function sensoryRates({light=true,lightAngle=0,odor=0,odorAngle=0,threat=0,landingLoom=0,contactSugar=false}) {
  const luminosity=light?20:5;
  return {
    retinaLeft:luminosity*(.55+.45*Math.max(0,-Math.sin(lightAngle))),
    retinaRight:luminosity*(.55+.45*Math.max(0,Math.sin(lightAngle))),
    loomLeft:clamp(threat)*180,loomRight:clamp(threat)*180,
    landingVisualLeft:clamp(landingLoom)*120,landingVisualRight:clamp(landingLoom)*120,
    odorLeft:clamp(odor)*120*(.5+.5*Math.max(0,-Math.sin(odorAngle))),
    odorRight:clamp(odor)*120*(.5+.5*Math.max(0,Math.sin(odorAngle))),
    sugar:contactSugar?200:0,
  };
}
