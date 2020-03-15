//Samplers
uniform sampler2D mainTex;

//Varyings
varying vec2 v_uv;

#ifdef VERTEXCOLOR
varying vec4 v_color;
#endif

//Entry point
void main(void) {
    //Texture
    vec4 rgba = texture2D(mainTex, v_uv).rgba;

#ifdef VERTEXCOLOR
    rgba = v_color * rgba;
#endif

    //FragmentOutput
    gl_FragColor = rgba;

}