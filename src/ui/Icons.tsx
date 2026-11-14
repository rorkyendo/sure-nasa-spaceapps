import { ICONS_SVG } from './icons_markup';

/** Hidden SVG <defs>/<symbol> library used by the engine overlay (trucks, rocket, ship, plane, gradients). */
export default function Icons() {
  return <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS_SVG }} />;
}
