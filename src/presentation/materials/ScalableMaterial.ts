import { NodeMaterial, InputBlock, TransformBlock, NodeMaterialSystemValues, VertexOutputBlock, MultiplyBlock, TextureBlock, AddBlock, Vector2, FragmentOutputBlock, ShaderMaterial, Scene, VertexBuffer } from '@babylonjs/core';

//@ts-ignore
import vertexSource from '../../shaders/UNLIT_INSTANCED.vertex.fx';
//@ts-ignore
import fragmentSource from '../../shaders/UNLIT_INSTANCED.fragment.fx';
import { PBRScalableMaterial } from './PBRScalableMaterial';


export class ScalableMaterial extends ShaderMaterial {
    constructor(name: string, scene: Scene) {
        super(name, scene, {
            vertexSource,
            fragmentSource
        }, {
            attributes: ['position', 'uv', PBRScalableMaterial.ScaleKind, PBRScalableMaterial.OffsetKind],
            uniforms: ['world', 'viewProjection', 'mainTex'],
            needAlphaBlending: true,
            samplers: ['mainTex']
        })
    }
}