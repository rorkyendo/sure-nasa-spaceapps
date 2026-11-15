/* data.js — static domain tables: spaceports, cargo, terminals, pickup presets, route waypoints, tiles. */
const SP=[
{id:'ksc',name:'Cape Canaveral',ctry:'USA',lat:28.52,lon:-80.68,preset:true,clim:1.1,gunw:true,seed:11},
{id:'biak',name:'Biak',ctry:'Indonesia',lat:-1.19,lon:136.1,preset:false,clim:1.7,gunw:true,seed:53}];
const CARGO=['First-stage booster','Second stage','Payload fairing','Satellite or payload','Rocket engines','Propellant (liquid oxygen, fuel)','Solid rocket motor','Ground support equipment'];
let DAYS=['Sat 14 Nov','Sun 15 Nov','Mon 16 Nov','Tue 17 Nov','Wed 18 Nov','Thu 19 Nov','Fri 20 Nov','Sat 21 Nov'];
let DSH=['Sat 14','Sun 15','Mon 16','Tue 17','Wed 18','Thu 19','Fri 20','Sat 21'];
const DATES=['3 Sep','15 Sep','27 Sep','9 Oct','21 Oct','2 Nov'];
const OPS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter'];
const OPQ='[out:json][timeout:20];way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential)$"](%B);out geom;';
const PICKS=[['Houston, USA',-95.37,29.76],['Los Angeles, USA',-118.24,34.05],['Montreal, Canada',-73.57,45.5],['Mexico City, Mexico',-99.13,19.43],['Sao Paulo, Brazil',-46.63,-23.55],['Rotterdam, Netherlands',4.48,51.92],['Toulouse, France',1.44,43.6],['Johannesburg, South Africa',28.05,-26.2],['Dubai, UAE',55.27,25.2],['Bengaluru, India',77.59,12.97],['Shenzhen, China',114.06,22.54],['Tokyo, Japan',139.69,35.69],['Jakarta, Indonesia',106.85,-6.21],['Makassar, Indonesia',119.41,-5.15],['Sydney, Australia',151.21,-33.87]];
const AIRPORTS=[{c:'TTS',n:'Kennedy Space Center SLF',lon:-80.69,lat:28.615},{c:'MCO',n:'Orlando Intl',lon:-81.31,lat:28.43},{c:'IAH',n:'Houston Intercontinental',lon:-95.34,lat:29.98},{c:'LAX',n:'Los Angeles Intl',lon:-118.41,lat:33.94},{c:'YUL',n:'Montreal-Trudeau',lon:-73.74,lat:45.47},{c:'MEX',n:'Mexico City Intl',lon:-99.07,lat:19.44},{c:'GRU',n:'Sao Paulo-Guarulhos',lon:-46.47,lat:-23.43},{c:'RTM',n:'Rotterdam The Hague',lon:4.44,lat:51.96},{c:'TLS',n:'Toulouse-Blagnac',lon:1.36,lat:43.63},{c:'JNB',n:'Johannesburg O.R. Tambo',lon:28.24,lat:-26.13},{c:'DXB',n:'Dubai Intl',lon:55.36,lat:25.25},{c:'BLR',n:'Bengaluru Intl',lon:77.71,lat:13.2},{c:'SZX',n:"Shenzhen Bao'an",lon:113.81,lat:22.64},{c:'HND',n:'Tokyo Haneda',lon:139.78,lat:35.55},{c:'CGK',n:'Jakarta Soekarno-Hatta',lon:106.66,lat:-6.13},{c:'UPG',n:'Makassar Hasanuddin',lon:119.55,lat:-5.06},{c:'SYD',n:'Sydney Kingsford Smith',lon:151.18,lat:-33.95},{c:'BIK',n:'Frans Kaisiepo, Biak',lon:136.11,lat:-1.19}];
const PORTS=[{c:'Port Canaveral',n:'Port Canaveral',lon:-80.62,lat:28.41},{c:'Houston',n:'Port of Houston',lon:-95.27,lat:29.73},{c:'Los Angeles',n:'Los Angeles / Long Beach',lon:-118.25,lat:33.73},{c:'Montreal',n:'Port of Montreal',lon:-73.54,lat:45.5},{c:'Veracruz',n:'Veracruz',lon:-96.13,lat:19.2},{c:'Santos',n:'Santos',lon:-46.3,lat:-23.98},{c:'Rotterdam',n:'Rotterdam',lon:4.14,lat:51.95},{c:'Bordeaux',n:'Bordeaux',lon:-.55,lat:44.87},{c:'Durban',n:'Durban',lon:31.03,lat:-29.87},{c:'Jebel Ali',n:'Jebel Ali',lon:55.03,lat:25.01},{c:'Chennai',n:'Chennai',lon:80.3,lat:13.1},{c:'Shenzhen',n:'Shenzhen Yantian',lon:114.28,lat:22.57},{c:'Yokohama',n:'Yokohama',lon:139.65,lat:35.45},{c:'Tanjung Priok',n:'Tanjung Priok, Jakarta',lon:106.88,lat:-6.1},{c:'Makassar',n:'Makassar',lon:119.41,lat:-5.13},{c:'Sydney',n:'Port Botany, Sydney',lon:151.22,lat:-33.97},{c:'Port of Biak',n:'Port of Biak',lon:136.07,lat:-1.18}];
AIRPORTS.push({c:'XMR',n:'Cape Canaveral Skid Strip',lon:-80.567,lat:28.467},{c:'AZA',n:'Phoenix-Mesa Gateway',lon:-111.655,lat:33.308},{c:'CGN',n:'Cologne Bonn',lon:7.143,lat:50.866});
PORTS.push({c:'Michoud',n:'Michoud (NASA), New Orleans',lon:-89.93,lat:29.97});
const ALLT=[...AIRPORTS.map(a=>({...a,k:'ap'})),...PORTS.map(a=>({...a,k:'pt'}))];
const TERM={ksc:['TTS','Port Canaveral'],biak:['BIK','Port of Biak']};
const DOC={air:{TTS:['Super Guppy','An-124'],XMR:['An-124'],TLS:['An-124'],CGN:['An-124'],AZA:['An-124']},sea:{'Port Canaveral':['RocketShip'],'Michoud':['Pegasus barge']}};
const VREF=[{n:'Super Guppy',o:'Air, NASA',u:'Orion crew module structure, SLS Orion Stage Adapter',t:'KSC Shuttle Landing Facility (TTS), Michoud (New Orleans)'},
{n:'Antonov An-124',o:'Air, Antonov Airlines / Volga-Dnepr',u:'Atlas V stage, Perseverance booster, satellites up to ~36 t total, Gateway HALO module',t:'TTS, Cape Canaveral Skid Strip (XMR), Toulouse (TLS), Cologne Bonn (CGN), Phoenix-Mesa (AZA)'},
{n:'Pegasus barge',o:'Sea, NASA, tug-pushed',u:'SLS core stage',t:'Michoud to KSC, about 900 mi, about 6 days'},
{n:'R/S RocketShip',o:'Sea, ULA, 312 ft ro-ro',u:'Atlas V and Vulcan stages',t:'Decatur AL to Port Canaveral (about 1 week); Vandenberg via Panama (about 3 weeks)'},
{n:'Heavy-haul trucks, crawler-transporter',o:'Land',u:'Last leg to the pad',t:'KSC and Cape Canaveral'}];
const MODEL={land:'Land',sea:'Sea',air:'Air'},MORD=['land','sea','air'];
const MODEV={land:'Heavy-haul transporter (multi-axle trailer)',sea:'Cargo barge or heavy-lift ship (NASA Pegasus class)',air:'Outsized cargo aircraft (Super Guppy / An-124 class)'};
const SEAVIA={'Michoud|Port Canaveral':[[-89.0,28.6],[-86.5,25.4],[-83.2,24.0],[-80.0,25.3],[-79.6,27.2]],'Houston|Port Canaveral':[[-92.5,27.6],[-86.5,25.4],[-83.2,24.0],[-80.0,25.3],[-79.6,27.2]],'Tanjung Priok|Port of Biak':[[112,-6.3],[116.5,-7.6],[121,-7.2],[127,-6.6],[125.8,-2.6],[127,0],[131.5,1.5],[134.5,.5]],'Rotterdam|Port Canaveral':[[-6,49.3]],'Bordeaux|Port Canaveral':[[-9.6,43.3]]};
/* harbor/river approach polylines (port -> open water) for terminals that sit inland in the coastline mask */
const SEACCESS={
 'Houston':[[-95.08,29.74],[-94.98,29.7],[-94.9,29.66],[-94.78,29.62],[-94.65,29.55],[-94.5,29.42],[-94.35,29.3]],
 'Michoud':[[-89.8,30.02],[-89.6,30.1],[-89.35,30.15],[-89.1,30.2],[-88.9,30.22],[-88.55,30.25]],
 'Veracruz':[[-96.08,19.18],[-96.0,19.17]],
 'Rotterdam':[[4.0,51.97],[3.9,51.98],[3.75,52.0],[3.6,52.02]],
 'Bordeaux':[[-0.7,45.0],[-0.8,45.2],[-0.95,45.4],[-1.1,45.55],[-1.3,45.5]],
 'Los Angeles':[[-118.2,33.715],[-118.1,33.68]],
 'Santos':[[-46.32,-24.0],[-46.33,-24.05],[-46.28,-24.12]],
 'Chennai':[[80.33,13.09]],
 'Yokohama':[[139.68,35.4],[139.72,35.3],[139.74,35.2],[139.75,35.1],[139.72,35.0],[139.75,34.9],[139.85,34.8]],
 'Tanjung Priok':[[106.88,-6.08],[106.86,-6.03]],
 'Makassar':[[119.4,-5.14],[119.37,-5.16]],
 'Sydney':[[151.24,-33.98],[151.29,-33.99]],
 'Port of Biak':[[136.07,-1.19],[136.05,-1.22]],
 'Montreal':[[-73.4,45.55],[-73.1,45.75],[-72.7,46.2],[-72.2,46.6],[-71.75,46.8],[-71.2,46.9],[-70.7,47.1],[-70.3,47.6],[-69.9,48.1],[-69.3,48.4],[-68.6,48.8],[-67.7,49.1],[-66.5,49.5],[-65.0,49.9],[-63.5,50.1],[-61.5,50.15],[-59.5,49.9]]};
/* NASA GIBS VIIRS daily true-colour imagery (keyless, epsg3857, native max z9 — upscaled beyond). */
const GD=new Date(Date.now()-2*864e5).toISOString().slice(0,10);
const GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/'+GD+'/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg';
const TILESETS={
 sat:[{u:GIBS,mz:9}],
 osm:['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
 hyb:[{u:GIBS,mz:9},'https://basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png']
};
const HK='sure_history_v1';
const PARTS={base:'a longer trip at normal speed',sat:'slower yellow and red segments',rain:'slower wet-prone road in the rain',red:'extra red segments'};
const DIRS=['E','NE','N','NW','W','SW','S','SE'];
const PEAK={ksc:7,vsfb:0,sb:8,kou:4,biak:0,bkn:4};
export function setDayLabels(d, s) { DAYS = d; DSH = s; }
export {SP,CARGO,DAYS,DSH,DATES,OPS,OPQ,PICKS,AIRPORTS,PORTS,ALLT,TERM,DOC,VREF,MODEL,MORD,MODEV,SEAVIA,SEACCESS,TILESETS,HK,PARTS,DIRS,PEAK};
