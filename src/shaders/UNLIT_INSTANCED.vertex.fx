//Attributes
attribute vec3 position;
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
attribute vec2 uv;
attribute vec2 _uvOffset;
attribute vec2 _uvScale;

//Uniforms
#include<instancesDeclaration>
uniform mat4 viewProjection;

//Varyings
varying vec2 v_uv;

#ifdef VERTEXCOLOR
varying vec4 v_color;
#endif

//Entry point
void main(void) {
    #include<instancesVertex>
    //WorldPos
    vec4 output1 = finalWorld  * vec4(position, 1.0);

    //WorldPos * ViewProjectionTransform
    vec4 output0 = viewProjection * output1;

    //VertexOutput
    gl_Position = output0;

    //Multiply
    vec2 output3 = _uvScale * uv;

    //Add
    v_uv = _uvOffset + output3;

    #ifdef VERTEXCOLOR
    // Vertex color
    v_color = color;
    #endif
}