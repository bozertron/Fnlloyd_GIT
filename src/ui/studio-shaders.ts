// !Fnlloyd STUDIO — GLSL Shaders
// FBO Curl-Noise vertex/fragment shaders for Three.js particle system
// Updated with morph support and proximity control

export const VERT_PARTICLES = /* glsl */`
  uniform float uTime;
  uniform float uFrequency;
  uniform float uAmplitude;
  uniform float uMaxDistance;
  uniform float uPointSize;
  uniform float uOpacity;
  uniform float uProximity;
  uniform float uMorphProgress;

  attribute vec3 positionA;
  attribute vec3 positionB;

  vec3 mod289v3(vec3 x){ return x - floor(x*(1./289.))*289.; }
  vec2 mod289v2(vec2 x){ return x - floor(x*(1./289.))*289.; }
  vec3 permute3(vec3 x){ return mod289v3(((x*34.)+1.)*x); }
  float snoise(vec2 v){
    const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
    vec2 i=floor(v+dot(v,C.yy)), x0=v-i+dot(i,C.xx);
    vec2 i1=(x0.x>x0.y)?vec2(1,0):vec2(0,1);
    vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
    i=mod289v2(i);
    vec3 p=permute3(permute3(i.y+vec3(0,i1.y,1))+i.x+vec3(0,i1.x,1));
    vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
    m=m*m; m=m*m;
    vec3 gx=2.*fract(p*C.www)-1., gh=abs(gx)-.5, gox=floor(gx+.5), ga=gx-gox;
    m*=1.79284291400159-.85373472095314*(ga*ga+gh*gh);
    vec3 g; g.x=ga.x*x0.x+gh.x*x0.y; g.yz=ga.yz*x12.xz+gh.yz*x12.yw;
    return 130.*dot(m,g);
  }
  vec3 curl(float x,float y,float z){
    float eps=1.,eps2=2.*eps, n1,n2,a,b;
    x+=uTime*.05; y+=uTime*.05; z+=uTime*.05;
    vec3 c=vec3(0.);
    n1=snoise(vec2(x,y+eps)); n2=snoise(vec2(x,y-eps)); a=(n1-n2)/eps2;
    n1=snoise(vec2(x,z+eps)); n2=snoise(vec2(x,z-eps)); b=(n1-n2)/eps2; c.x=a-b;
    n1=snoise(vec2(y,z+eps)); n2=snoise(vec2(y,z-eps)); a=(n1-n2)/eps2;
    n1=snoise(vec2(x+eps,z)); n2=snoise(vec2(x-eps,z)); b=(n1-n2)/eps2; c.y=a-b;
    n1=snoise(vec2(x+eps,y)); n2=snoise(vec2(x-eps,y)); a=(n1-n2)/eps2;
    n1=snoise(vec2(y+eps,z)); n2=snoise(vec2(y-eps,z)); b=(n1-n2)/eps2; c.z=a-b;
    return c;
  }
  void main(){
    // Morph between positionA and positionB
    vec3 p = mix(positionA, positionB, uMorphProgress);
    // Apply curl-noise displacement
    vec3 target = p + curl(p.x*uFrequency, p.y*uFrequency, p.z*uFrequency) * uAmplitude;
    // Proximity: lerp between mesh vertex (p) and curl-displaced (target)
    p = mix(target, p, uProximity);
    float d = length(p - target) / uMaxDistance;
    p = mix(target, p, pow(d, 5.));
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_PointSize = uPointSize * (1. / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

export const FRAG_PARTICLES = /* glsl */`
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  void main(){
    float d=length(gl_PointCoord-.5)*2.;
    if(d>1.) discard;
    float alpha=1.-smoothstep(.5,1.,d);
    gl_FragColor=vec4(uColor,alpha*uOpacity);
  }
`;
